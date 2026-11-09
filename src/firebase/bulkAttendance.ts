import {
  collection, doc, getDocFromServer, getDocsFromServer, increment,
  limit, query, Timestamp, where, writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase.config";
import { cacheService } from "@/services/cacheService";
import { isValidBulkStudentId, INVALID_BULK_STUDENT_ID_REASON } from "@/features/organization/log-attendance/bulk-attendance.types";
import type { AttendanceMode, BulkEntry, BulkProgress, BulkResult } from "@/features/organization/log-attendance/bulk-attendance.types";

const BATCH_SIZE = 50;
const isTransient = (error: unknown) => ["deadline-exceeded", "resource-exhausted", "aborted", "internal", "unavailable", "unknown"].includes((error as { code?: string })?.code ?? "");
const isAccessError = (error: unknown) => ["permission-denied", "unauthenticated"].includes((error as { code?: string })?.code ?? "");

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Attendance page was closed; further entries were not submitted.");
}

/** Retry reads only. A write with an uncertain result must be reconciled, not blindly repeated. */
async function readWithRetry<T>(read: () => Promise<T>, signal?: AbortSignal, onRetry?: () => void): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    checkCancelled(signal);
    try { return await read(); }
    catch (error) {
      if (signal?.aborted || !isTransient(error) || attempt >= 3) throw error;
      onRetry?.();
      const cap = Math.min(500 * 2 ** attempt, 4000);
      await new Promise((resolve) => setTimeout(resolve, Math.floor(cap / 2 + Math.random() * cap / 2)));
    }
  }
}

/** Bound the UI wait, not the SDK commit: queued writes may still complete later. */
async function waitForCommit(commit: Promise<void>, signal?: AbortSignal): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    const stop = () => reject(Object.assign(new Error("Write result is unconfirmed; the Firebase SDK may still commit it."), { code: "unknown" }));
    timer = setTimeout(stop, 30_000);
    cancel = stop;
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
  });
  try { await Promise.race([commit, interrupted]); }
  finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener("abort", cancel);
  }
}

export function invalidateAttendanceCaches(eventId: string): void {
  for (const prefix of [
    `event-attendees:${eventId}`, `recent-attendance:${eventId}`, `attendance-check:${eventId}:`,
    `event:${eventId}`, "events:", "ui:events:view:", "attendees-all-events",
  ]) cacheService.invalidateByPrefix(prefix);
}

async function loadContext(eventId: string, type: AttendanceMode) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in before importing attendance.");
  const eventRef = doc(db, "events", eventId);
  const [eventDoc, operatorDoc] = await Promise.all([
    getDocFromServer(eventRef), getDocFromServer(doc(db, "users", uid)),
  ]);
  const event = eventDoc.data();
  const operator = operatorDoc.data();
  if (!operator || operator.isDeleted === true || !["admin", "super-admin"].includes(operator.role) || !operator.orgId) {
    throw new Error("Organization administrator access is required.");
  }
  if (!event || event.isDeleted === true || event.status !== "completed" || event.finesGenerated === true) {
    throw new Error("Bulk attendance requires a completed event without generated fines.");
  }
  if (event.orgId !== operator.orgId) throw new Error("This event is not available to your organization.");
  const hasWindow = type === "time-in" ? event.timeInStart && event.timeInEnd : event.timeOutStart && event.timeOutEnd;
  if (!hasWindow) throw new Error("The selected attendance mode has no configured schedule window.");
  const organizationDoc = await getDocFromServer(doc(db, "organizations", operator.orgId));
  const organization = organizationDoc.data();
  if (!organization || organization.isDeleted === true || organization.isArchived === true ||
    ![1, 2, 3].includes(operator.accessLevel) ||
    (operator.accessLevel === 1 && !organization.programId) || (operator.accessLevel === 2 && !organization.facultyId)) {
    throw new Error("Organization access scope is not configured or available.");
  }
  return { eventRef, uid, operator, organization };
}

async function runBulk(
  apply: boolean,
  eventId: string,
  type: AttendanceMode,
  entries: BulkEntry[],
  confirmOutside: boolean,
  onProgress?: (progress: BulkProgress) => void,
  signal?: AbortSignal,
): Promise<BulkResult[]> {
  const results: BulkResult[] = [];
  const seen = new Set<string>();
  const field = type === "time-in" ? "timeIn" : "timeOut";
  const opposite = type === "time-in" ? "timeOut" : "timeIn";
  const attendance = collection(db, "eventAttendees");
  const batches = Math.ceil(entries.length / BATCH_SIZE);
  let batchNumber = 0;
  const report = (retrying = false) => {
    try {
      onProgress?.({ finished: results.filter((result) => result.outcome !== "not_processed").length,
        total: entries.length, batch: batchNumber, batches, retrying, results: [...results] });
    } catch (error) { console.error("Attendance progress callback failed", error); }
  };
  const stop = (reason: string) => {
    results.push(...entries.slice(results.length).map((entry): BulkResult => ({ ...entry, outcome: "not_processed", reason })));
    report();
    return results;
  };
  report();
  try {
    for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
      batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
      // Fresh eligibility before starting and between batches; never use the event cache here.
      const context = await readWithRetry(() => loadContext(eventId, type), signal, () => report(true));
      report();
      for (const entry of entries.slice(offset, offset + BATCH_SIZE)) {
        checkCancelled(signal);
        if (auth.currentUser?.uid !== context.uid) return stop("Sign-in changed. Revalidate before continuing.");
        const studentId = entry.studentId.trim();
        const outcome = (status: BulkResult["outcome"], reason: string, outside?: boolean): BulkResult => ({ ...entry, outcome: status, reason, ...(outside === undefined ? {} : { outside }) });
        if (!isValidBulkStudentId(studentId)) {
          results.push(outcome("invalid_student_id", INVALID_BULK_STUDENT_ID_REASON));
          report();
          continue;
        }
        if (seen.has(studentId)) {
          results.push(outcome("duplicate_in_file", "Student ID already appears earlier in this file."));
          report();
          continue;
        }
        seen.add(studentId);
        try {
          const [students, existing] = await readWithRetry(() => Promise.all([
            getDocsFromServer(query(collection(db, "users"), where("studentId", "==", studentId), where("isDeleted", "==", false), limit(2))),
            getDocsFromServer(query(attendance, where("eventId", "==", eventId), where("userId", "==", studentId))),
          ]), signal, () => report(true));
          if (students.empty) results.push(outcome("student_not_found", "No registered student matches this ID."));
          else if (students.size > 1) results.push(outcome("ambiguous_student_id", "Multiple student records match this ID; ask an organizer to correct the records."));
          else if (existing.docs.some((record) => record.data()[field] != null)) {
            results.push(outcome("already_recorded", "This attendance timestamp is already recorded."));
          } else {
            const studentDoc = students.docs[0];
            const studentData = studentDoc.data();
            const remark = context.operator.accessLevel === 1 && context.organization.programId !== studentData.programId
              ? "registered in different program"
              : context.operator.accessLevel === 2 && context.organization.facultyId !== studentData.facultyId ? "registered in different faculty" : undefined;
            const outside = Boolean(remark);
            if (outside && !confirmOutside) {
              results.push(outcome("confirmation_required", `Student is ${remark}; confirmation is required.`, true));
            } else if (!apply) {
              results.push(outcome("eligible", "Student is ready for attendance.", outside));
            } else {
              checkCancelled(signal);
              if (auth.currentUser?.uid !== context.uid) return stop("Sign-in changed. Revalidate before continuing.");
              const target = existing.docs.find((record) => record.data()[opposite] != null) ?? existing.docs[0];
              const targetRef = target?.ref ?? doc(attendance);
              const now = Timestamp.now();
              const write = writeBatch(db);
              if (target) {
                write.update(targetRef, { [field]: now, status: target.data()[opposite] != null ? "present" : "partially present" });
              } else {
                write.set(targetRef, { eventId, userId: studentId, student: { ...studentData, id: studentDoc.id },
                  timeIn: type === "time-in" ? now : null, timeOut: type === "time-out" ? now : null,
                  status: "partially present", ...(remark ? { remark } : {}) });
                // Keep the existing auto-ID schema; batch the counter with creation so they cannot partially succeed.
                write.update(context.eventRef, { attendees: increment(1) });
              }
              try {
                await waitForCommit(write.commit(), signal);
                results.push(outcome("recorded", "Attendance recorded.", outside));
              } catch (error) {
                if (isAccessError(error)) return stop("Attendance access was denied. Check sign-in and deployed Firestore permissions.");
                if (!isTransient(error)) {
                  results.push(outcome("failed", "Attendance could not be recorded. Check permissions/data and retry this entry."));
                } else {
                  // Never resend the mutation. Check the exact auto-ID target to reconcile an uncertain commit.
                  report(true);
                  try {
                    const checked = await readWithRetry(() => getDocFromServer(targetRef), signal, () => report(true));
                    if (checked.data()?.[field] != null) {
                      results.push(outcome("already_recorded", "Attendance is confirmed present after an interrupted write; existing timestamps were preserved.", outside));
                    } else return stop("Write result is unconfirmed. Do not run simultaneous imports. Check attendance before re-uploading this list.");
                  } catch {
                    return stop("Write result is unconfirmed because connectivity was interrupted. Check attendance before re-uploading this list.");
                  }
                }
              }
            }
          }
        } catch (error) {
          if (signal?.aborted || isTransient(error) || isAccessError(error)) throw error;
          console.error("Bulk attendance entry failed", { row: entry.row, error });
          results.push(outcome("failed", "Could not validate this entry. Check student records and database permissions/indexes."));
        }
        report();
      }
    }
    return results;
  } catch (error) {
    return stop(error instanceof Error ? error.message : "Attendance processing was interrupted. Revalidate before continuing.");
  } finally {
    if (apply) invalidateAttendanceCaches(eventId);
  }
}

export function validateBulkAttendance(eventId: string, type: AttendanceMode, entries: BulkEntry[], signal?: AbortSignal): Promise<BulkResult[]> {
  return runBulk(false, eventId, type, entries, false, undefined, signal);
}

export function applyBulkAttendance(eventId: string, type: AttendanceMode, entries: BulkEntry[], confirmOutside: boolean,
  onProgress?: (progress: BulkProgress) => void, signal?: AbortSignal): Promise<BulkResult[]> {
  return runBulk(true, eventId, type, entries, confirmOutside, onProgress, signal);
}
