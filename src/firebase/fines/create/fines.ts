import { db } from "@/firebase/firebase.config";
import { getAllUsers, getCurrentUserData, getUserById } from "@/firebase/users";
import {
  collection,
  addDoc,
  writeBatch,
  doc,
  CollectionReference,
  DocumentData,
  Timestamp,
  query,
  where,
  getDocs,
  getDocsFromServer,
  runTransaction,
  and,
  or,
  limit,
  collectionGroup,
  documentId,
} from "firebase/firestore";
import { getFineTypeById } from "../read/fineType";
import { Member, MemberData } from "@/features/organization/members/types";
import { getNonAttendeesForEvent, getPartialAttendeesForEvent } from "@/firebase/attendance";
import { getFinesByStudentsFromServer } from "../read/fines";
import { FineStatus } from "@/constants/status";
import {
  BulkFinesProgress,
  BulkFinesResult,
  FineGenerationPhase,
  FineGenerationProgress,
  FineGenerationResult,
  FineType,
  OnFineProgress,
  StudentFines,
} from "@/features/organization/fines/types";
import { Event } from "@/features/organization/events/types";
import { recalculateClearanceStatus, buildClearanceId } from "@/firebase/clearance";
import { getActiveTerm } from "@/firebase/term";
import { cacheService } from "@/services/cacheService";
import {
  applyFineStatsDeltaInTx,
  ensureFineStatsDoc,
  updateFineStats,
} from "@/firebase/stats/update/updateStats";
import {
  buildEventFineItemPayload,
  buildFineBlockingItemEntry,
  buildInitialStudentFineDoc,
  deriveClearanceStatusFromBlockingItems,
  determineFineStatus,
  isActiveFineItem,
  pickCanonicalFineDoc,
  timestampToMillis,
  toTimestamp,
} from "@/features/organization/fines/utils/fineComputations";

const finesCollection: CollectionReference<DocumentData> = collection(
  db,
  "fines"
);

const LOCK_LEASE_MS = 120_000;
const TX_CHUNK_SIZE = 15;

// Centralized error handler
const handleFirestoreError = (error: any, context: string) => {
  console.error(`Error ${context}:`, error);
  // Re-throwing allows the calling UI to handle the failed state.
  throw new Error(`Failed to ${context}.`);
};

const createLockId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const invalidateFinesGenerationCaches = (eventId: string) => {
  cacheService.invalidate(`event:${eventId}`);
  cacheService.invalidateByPrefix("events:");
  cacheService.invalidateByPrefix("ui:events:view:");
  cacheService.invalidateByPrefix("fines:");
  cacheService.invalidateByPrefix("clearance:");
  cacheService.invalidateByPrefix(`event-attendees:${eventId}`);
  cacheService.invalidateByPrefix("attendees-all-events");
};

export const createFinePerStudent = async (userId: string, user: Member) => {
  try {
    const currentUser = await getCurrentUserData();
    if (!currentUser) {
      console.error("No authenticated user found.");
      return null;
    }
    const term = await getActiveTerm();
    const now = Timestamp.now();
    const fineData = buildInitialStudentFineDoc({
      orgId: currentUser.orgId,
      userId,
      studentId: user.studentId,
      userName: `${user ? user.firstName : "Unknown"} ${user ? user.lastName : ""}`,
      academicYear: term!.AY,
      semester: term!.semester,
      now,
    });
    await addDoc(finesCollection, fineData);
    await recalculateClearanceStatus(userId);
  } catch (error) {
    handleFirestoreError(error, `creating fine document on ID ${userId}`);
    return null;
  }
};

export const createBulkFines = async (
  onProgress?: (update: BulkFinesProgress) => void
): Promise<BulkFinesResult> => {
  const result: BulkFinesResult = {
    success: false,
    totalUsers: 0,
    committed: 0,
    failedAtBatch: null,
  };

  const report = (
    phase: BulkFinesProgress["phase"],
    message: string,
    extra?: Partial<BulkFinesProgress>
  ) =>
    onProgress?.({
      phase,
      message,
      committed: result.committed,
      totalUsers: result.totalUsers,
      ...extra,
    });

  try {
    const currentUser = (await getCurrentUserData()) as unknown as Member;
    const term = await getActiveTerm();
    if (!currentUser) {
      report("error", "No authenticated user found.");
      return result;
    }
    if (!term || !term.isActive) {
      report("error", "Fine generation is disabled for inactive academic terms.");
      return result;
    }

    const doneSeeding = await getDocs(
      query(
        collection(db, "fines"),
        where("orgId", "==", currentUser.orgId),
        where("metadata.isArchived", "==", false),
        where("academicYear", "==", term!.AY),
        where("semester", "==", term!.semester),
        limit(1)
      )
    );
    if (doneSeeding.size > 0) {
      report("done", "Student fine records already initialized for this term. No action taken.");
      result.success = true;
      return result;
    }

    report("preflight", "Fetching all users…");
    const users = await getAllUsers();
    if (!users || users.length === 0) {
      report("done", "No users found to create fines for.");
      result.success = true;
      return result;
    }

    result.totalUsers = users.length;
    const batchSize = 20;
    const totalBatches = Math.ceil(users.length / batchSize);
    report("writing", `Starting — ${users.length} users, ${totalBatches} batches`);

    for (let i = 0; i < users.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batchSlice = users.slice(i, i + batchSize);
      const batch = writeBatch(db);
      const now = Timestamp.now();

      for (const user of batchSlice) {
        if (!user.member) {
          console.warn(`User ${user.id} has no member data — skipping.`);
          continue;
        }

        const fineDocRef = doc(finesCollection);
        const fineData = buildInitialStudentFineDoc({
          orgId: currentUser.orgId!,
          userId: user.id,
          userName: `${user.member.firstName} ${user.member.lastName}`,
          studentId: user.member.studentId,
          academicYear: term!.AY,
          semester: term!.semester,
          now,
        });

        batch.set(fineDocRef, fineData);
      }

      try {
        await batch.commit();
      } catch (batchError) {
        result.failedAtBatch = batchNum;
        handleFirestoreError(batchError, `batch ${batchNum}/${totalBatches}`);
        report(
          "error",
          `Failed at batch ${batchNum}/${totalBatches} — ${result.committed} users committed before failure.`
        );
        return result;
      }

      result.committed += batchSlice.length;
      report("writing", `Batch ${batchNum}/${totalBatches} committed`, {
        batchNum,
        totalBatches,
      });

      await Promise.all(batchSlice.map((user) => recalculateClearanceStatus(user.id!)));
    }

    result.success = true;
    report("done", `All ${result.committed} fine documents created successfully.`);
    return result;
  } catch (error) {
    handleFirestoreError(error, "creating fines documents in bulk");
    report("error", "Unexpected error during bulk fine creation.");
    return result;
  }
};

// ── Timeout wrapper ───────────────────────────────────────────────────────
const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms — ${label}`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

function makeSnapshot(
  phase: FineGenerationPhase,
  counts: {
    absentTotal: number;
    absentDone: number;
    partialTotal: number;
    partialDone: number;
    skippedAlreadyFined: number;
  },
  message: string,
  batch?: { batchNum: number; totalBatches: number }
): FineGenerationProgress {
  return {
    phase,
    message,
    ...counts,
    ...(batch ?? {}),
  };
}

/**
 * Gets or creates a parent `fines` document for each student using server-fresh lookups.
 * Always skips localStorage cache to avoid creating duplicate parent docs or overwriting counts.
 */
const getOrCreateFinesForStudents = async (
  students: MemberData[],
  term: { AY: string; semester: string },
  orgId: string
): Promise<StudentFines[]> => {
  if (students.length === 0) return [];

  // 1. Always fetch server-fresh existing parent docs for this org + term
  const existing = await getFinesByStudentsFromServer(students, orgId, term);
  const existingMap = new Map<string, StudentFines>();
  for (const fine of existing) {
    if (fine.studentId) {
      existingMap.set(
        fine.studentId,
        pickCanonicalFineDoc(existingMap.get(fine.studentId), fine)
      );
    }
  }

  // 2. Deduplicate students missing an existing parent doc by studentId
  const missingByStudentId = new Map<string, MemberData>();
  for (const s of students) {
    const sid = s.member?.studentId;
    if (!sid || existingMap.has(sid) || missingByStudentId.has(sid)) continue;
    missingByStudentId.set(sid, s);
  }
  const missing = Array.from(missingByStudentId.values());

  // 3. Create missing parent docs in bounded batches (< 500 write limit)
  if (missing.length > 0) {
    const CREATE_BATCH_SIZE = 200;
    const now = Timestamp.now();

    for (let i = 0; i < missing.length; i += CREATE_BATCH_SIZE) {
      const slice = missing.slice(i, i + CREATE_BATCH_SIZE);
      const batch = writeBatch(db);
      const newDocs: StudentFines[] = [];

      for (const student of slice) {
        const fineDocRef = doc(finesCollection);
        const fineData = buildInitialStudentFineDoc({
          id: fineDocRef.id,
          orgId,
          userId: student.id!,
          studentId: student.member.studentId,
          userName: `${student.member.firstName} ${student.member.lastName}`,
          academicYear: term.AY,
          semester: term.semester,
          now,
        }) as StudentFines;
        batch.set(fineDocRef, fineData);
        newDocs.push(fineData);
      }

      await withTimeout(batch.commit(), 25_000, "creating missing parent fine records");
      for (const d of newDocs) existingMap.set(d.studentId, d);
    }

    cacheService.invalidateByPrefix("fines:");
  }

  const seenStudentIds = new Set<string>();
  const resolved: StudentFines[] = [];
  for (const s of students) {
    const sid = s.member?.studentId;
    if (!sid || seenStudentIds.has(sid)) continue;
    const fine = existingMap.get(sid);
    if (fine) {
      seenStudentIds.add(sid);
      resolved.push(fine);
    }
  }
  return resolved;
};

const fetchParentDocsByIds = async (parentIds: string[]) => {
  const uniqueIds = Array.from(new Set(parentIds.filter(Boolean)));
  const parentMap = new Map<string, { userId?: string; studentId?: string }>();
  if (uniqueIds.length === 0) return parentMap;

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 30) {
    chunks.push(uniqueIds.slice(i, i + 30));
  }

  for (let i = 0; i < chunks.length; i += 10) {
    const group = chunks.slice(i, i + 10);
    const snaps = await Promise.all(
      group.map((chunk) =>
        getDocsFromServer(query(finesCollection, where(documentId(), "in", chunk)))
      )
    );
    for (const snap of snaps) {
      for (const d of snap.docs) {
        const data = d.data();
        parentMap.set(d.id, {
          userId: data.userId,
          studentId: data.studentId,
        });
      }
    }
  }
  return parentMap;
};

const releaseEventGenerationLock = async (
  eventId: string,
  lockId: string,
  targetStatus: "idle" | "failed" | "completed",
  extra: Record<string, unknown> = {}
) => {
  try {
    const eventRef = doc(db, "events", eventId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(eventRef);
      if (!snap.exists()) return;
      if (snap.data().fineGenerationLockId !== lockId) return;
      transaction.update(eventRef, {
        fineGenerationStatus: targetStatus,
        fineGenerationLockId: null,
        fineGenerationHeartbeatAt: Timestamp.now(),
        ...extra,
      });
    });
  } catch (err) {
    console.warn(`Could not release generation lock for event ${eventId}:`, err);
  }
};

export const generateFinesOnEvent = async (
  event: Event,
  onProgress?: OnFineProgress
): Promise<FineGenerationResult> => {
  const counts = {
    absentTotal: 0,
    absentDone: 0,
    partialTotal: 0,
    partialDone: 0,
    skippedAlreadyFined: 0,
  };

  let lockClaimed = false;
  let wroteAnyData = false;
  const lockId = createLockId();

  const report = (
    phase: FineGenerationPhase,
    message: string,
    batch?: { batchNum: number; totalBatches: number }
  ) => onProgress?.(makeSnapshot(phase, counts, message, batch));

  const failAndReturn = async (message: string): Promise<FineGenerationResult> => {
    if (lockClaimed) {
      await releaseEventGenerationLock(event.id, lockId, "failed");
    }
    if (wroteAnyData) {
      invalidateFinesGenerationCaches(event.id);
    }
    report("error", message);
    return {
      status: "error",
      absentCommitted: counts.absentDone,
      partialCommitted: counts.partialDone,
      skippedAlreadyFined: counts.skippedAlreadyFined,
      message,
    };
  };

  // Report immediately before any await so the UI locks synchronously on first microtask/render
  report("preflight", "Verifying academic term and claiming fine generation lock…");

  try {
    const term = await withTimeout(getActiveTerm(), 15_000, "fetching active term");
    if (!term || !term.isActive) {
      return failAndReturn("Fine generation is disabled for inactive academic terms.");
    }

    const issuer = (await withTimeout(
      getCurrentUserData(),
      15_000,
      "loading issuer profile"
    )) as unknown as Member | null;
    if (!issuer) {
      return failAndReturn("Authenticated issuer session not found.");
    }

    // ── CLAIM SERVER-FRESH LOCK ON events/{event.id} ──────────────────────────
    const eventRef = doc(db, "events", event.id);
    let serverEventData: {
      orgId: string;
      fineTypeId: string;
      name: string;
      date: unknown;
    };

    try {
      serverEventData = await withTimeout(
        runTransaction(db, async (transaction) => {
          const eventSnap = await transaction.get(eventRef);
          if (!eventSnap.exists()) {
            throw new Error("Event not found.");
          }
          const data = eventSnap.data();
          if (data.isDeleted === true) {
            throw new Error("Cannot issue fines for a deleted event.");
          }
          if (data.finesGenerated === true) {
            throw new Error("Fines have already been generated for this event.");
          }

          const heartbeatMs = timestampToMillis(data.fineGenerationHeartbeatAt);
          if (
            data.fineGenerationStatus === "generating" &&
            heartbeatMs !== null &&
            Date.now() - heartbeatMs < LOCK_LEASE_MS
          ) {
            throw new Error(
              "Fine generation is already running for this event. Please wait for the active session to finish or try again in 2 minutes if it disconnected."
            );
          }

          const now = Timestamp.now();
          transaction.update(eventRef, {
            fineGenerationStatus: "generating",
            fineGenerationLockId: lockId,
            fineGenerationStartedAt: data.fineGenerationStartedAt || now,
            fineGenerationHeartbeatAt: now,
          });

          return {
            orgId: (data.orgId as string) || event.orgId || issuer.orgId!,
            fineTypeId: (data.fineTypeId as string) || event.fineTypeId,
            name: (data.name as string) || event.name || "Unknown Event",
            date: data.date ?? event.date,
          };
        }),
        20_000,
        "claiming event fine generation lock"
      );
      lockClaimed = true;
    } catch (lockError) {
      const msg =
        lockError instanceof Error
          ? lockError.message
          : "Unable to start fine generation due to a lock or connection error.";
      invalidateFinesGenerationCaches(event.id);
      return failAndReturn(msg);
    }

    // ── PREFLIGHT: TYPE, EXISTING ACTIVE ITEMS & ATTENDANCE ──────────────────
    report("preflight", "Fetching fine type, attendance, and existing event items…");

    const [type, absentUsersRaw, existingItemsSnap] = await withTimeout(
      Promise.all([
        getFineTypeById(serverEventData.fineTypeId),
        getNonAttendeesForEvent(event.id),
        getDocsFromServer(
          query(collectionGroup(db, "fineItems"), where("eventId", "==", event.id))
        ),
      ]),
      30_000,
      "loading preflight attendance and fine items"
    );

    if (!type) {
      return failAndReturn(`Fine type ${serverEventData.fineTypeId} not found.`);
    }

    const partialUsersRaw = type.requiresTimeOut
      ? await withTimeout(
          getPartialAttendeesForEvent(event.id),
          30_000,
          "loading partial attendees"
        )
      : [];

    // Resolve all students who already have an active fine item for this event (handles both legacy random IDs & new deterministic IDs)
    const activeExistingDocs = existingItemsSnap.docs.filter((d) =>
      isActiveFineItem(d.data() as Record<string, unknown>)
    );
    const alreadyFinedUserIds = new Set<string>();
    const alreadyFinedStudentIds = new Set<string>();
    const unresolvedParentIds: string[] = [];

    for (const itemSnap of activeExistingDocs) {
      const data = itemSnap.data();
      if (data.userId) alreadyFinedUserIds.add(String(data.userId));
      if (data.studentId) alreadyFinedStudentIds.add(String(data.studentId));
      if (!data.userId && !data.studentId) {
        const parentId = itemSnap.ref.parent.parent?.id;
        if (parentId) unresolvedParentIds.push(parentId);
      }
    }

    if (unresolvedParentIds.length > 0) {
      const parentOwners = await withTimeout(
        fetchParentDocsByIds(unresolvedParentIds),
        25_000,
        "resolving existing fined student owners"
      );
      for (const owner of parentOwners.values()) {
        if (owner.userId) alreadyFinedUserIds.add(owner.userId);
        if (owner.studentId) alreadyFinedStudentIds.add(owner.studentId);
      }
    }

    const isAlreadyFined = (student: MemberData) =>
      alreadyFinedUserIds.has(student.id) ||
      (student.member?.studentId ? alreadyFinedStudentIds.has(student.member.studentId) : false);

    // Deduplicate lists cleanly: partial overrides absent if overlap ever exists
    const uniquePartialMap = new Map<string, MemberData>();
    for (const s of partialUsersRaw || []) {
      const key = s.member?.studentId || s.id;
      if (key && !uniquePartialMap.has(key)) {
        uniquePartialMap.set(key, s);
      }
    }
    const dedupedPartialAll = Array.from(uniquePartialMap.values());
    const partialKeySet = new Set(dedupedPartialAll.map((s) => s.member?.studentId || s.id));

    const uniqueAbsentMap = new Map<string, MemberData>();
    for (const s of absentUsersRaw || []) {
      const key = s.member?.studentId || s.id;
      if (key && !partialKeySet.has(key) && !uniqueAbsentMap.has(key)) {
        uniqueAbsentMap.set(key, s);
      }
    }
    const dedupedAbsentAll = Array.from(uniqueAbsentMap.values());

    const pendingPartialUsers = dedupedPartialAll.filter((s) => !isAlreadyFined(s));
    const pendingAbsentUsers = dedupedAbsentAll.filter((s) => !isAlreadyFined(s));

    const skippedPartialCount = dedupedPartialAll.length - pendingPartialUsers.length;
    const skippedAbsentCount = dedupedAbsentAll.length - pendingAbsentUsers.length;
    counts.skippedAlreadyFined = skippedAbsentCount + skippedPartialCount;

    counts.absentTotal = dedupedAbsentAll.length;
    counts.absentDone = skippedAbsentCount;
    counts.partialTotal = dedupedPartialAll.length;
    counts.partialDone = skippedPartialCount;

    if (pendingAbsentUsers.length === 0 && pendingPartialUsers.length === 0) {
      if (counts.skippedAlreadyFined > 0) {
        await releaseEventGenerationLock(event.id, lockId, "completed", {
          finesGenerated: true,
          fineGenerationCompletedAt: Timestamp.now(),
        });
        lockClaimed = false;
        invalidateFinesGenerationCaches(event.id);
        const msg = `All ${counts.skippedAlreadyFined.toLocaleString()} non-attending members already had active fines for this event; generation marked complete.`;
        report("done", msg);
        return {
          status: "done",
          absentCommitted: counts.absentDone,
          partialCommitted: counts.partialDone,
          skippedAlreadyFined: counts.skippedAlreadyFined,
          message: msg,
        };
      }

      await releaseEventGenerationLock(event.id, lockId, "idle");
      lockClaimed = false;
      const msg = "No users found to generate fines for.";
      report("done", msg);
      return {
        status: "done",
        absentCommitted: 0,
        partialCommitted: 0,
        skippedAlreadyFined: 0,
        message: msg,
      };
    }

    report(
      "preflight",
      counts.skippedAlreadyFined > 0
        ? `Resuming — ${counts.skippedAlreadyFined} already fined, loading ${pendingAbsentUsers.length} absent and ${pendingPartialUsers.length} partial records…`
        : "Fetching or initializing student fine records…"
    );

    const [absentUsersFines, partialUsersFines] = await Promise.all([
      pendingAbsentUsers.length
        ? getOrCreateFinesForStudents(pendingAbsentUsers, term, serverEventData.orgId)
        : Promise.resolve([]),
      pendingPartialUsers.length
        ? getOrCreateFinesForStudents(pendingPartialUsers, term, serverEventData.orgId)
        : Promise.resolve([]),
    ]);

    const statsId = `${term.AY}-${term.semester}-${serverEventData.orgId}`;
    await withTimeout(
      ensureFineStatsDoc(statsId, serverEventData.orgId),
      15_000,
      "ensuring stats document exists"
    );
    const statsRef = doc(db, "stats", statsId);

    report(
      "preflight",
      `Ready — ${absentUsersFines.length} absent and ${partialUsersFines.length} partial users remaining to process.`
    );

    const issuerName = `${issuer.firstName} ${issuer.lastName}`;
    const eventDate = toTimestamp(serverEventData.date, Timestamp.now());
    const eventName = serverEventData.name;
    const accessLevel = Number(issuer.accessLevel ?? 0);

    const processChunkTransaction = async (
      chunk: StudentFines[],
      amount: number,
      reason: string
    ) => {
      return withTimeout(
        runTransaction(db, async (transaction) => {
          const eventSnap = await transaction.get(eventRef);
          if (!eventSnap.exists()) {
            throw new Error("Event was removed during fine generation.");
          }
          const eventDocData = eventSnap.data();
          if (eventDocData.fineGenerationLockId !== lockId) {
            throw new Error(
              "Another fine generation session claimed this event. Stopping to avoid duplicates."
            );
          }

          const statsSnap = await transaction.get(statsRef);
          const targets = await Promise.all(
            chunk.map(async (fine) => {
              const fineRef = doc(db, "fines", fine.id!);
              const fineItemRef = doc(db, "fines", fine.id!, "fineItems", event.id);
              const clearanceId = buildClearanceId(
                fine.userId,
                serverEventData.orgId,
                accessLevel,
                term
              );
              const clearanceRef = doc(db, "clearanceStatus", clearanceId);

              const [fineSnap, fineItemSnap, clearanceSnap] = await Promise.all([
                transaction.get(fineRef),
                transaction.get(fineItemRef),
                transaction.get(clearanceRef),
              ]);

              return {
                fine,
                fineRef,
                fineItemRef,
                clearanceRef,
                fineSnap,
                fineItemSnap,
                clearanceSnap,
              };
            })
          );

          const now = Timestamp.now();
          let statsDelta = 0;
          let newlyWritten = 0;
          let skippedInTx = 0;

          for (const target of targets) {
            if (!target.fineSnap.exists()) continue;

            if (
              target.fineItemSnap.exists() &&
              isActiveFineItem(target.fineItemSnap.data() as Record<string, unknown>)
            ) {
              skippedInTx++;
              continue;
            }

            // Preserve audit trail if fineItems/{event.id} already exists as an archived document
            const targetFineItemRef = target.fineItemSnap.exists()
              ? doc(collection(db, "fines", target.fine.id!, "fineItems"))
              : target.fineItemRef;

            const fineData = target.fineSnap.data();
            const currentCount = Number(fineData.fineItemsCount ?? 0);
            const nextCount = currentCount + 1;
            const nextAccumulated = Number(fineData.accumulatedAmount ?? 0) + amount;
            const paidAmt = Number(fineData.paidAmount ?? 0);
            const waivedAmt = Number(fineData.waivedAmount ?? 0);
            const nextBalance = Math.max(0, nextAccumulated - paidAmt - waivedAmt);
            const nextStatus = determineFineStatus({
              activeItemCount: nextCount,
              balance: nextBalance,
              paidAmount: paidAmt,
              waivedAmount: waivedAmt,
              hasPending: fineData.status === FineStatus.PENDING,
            });

            const academicYear = fineData.academicYear ?? term.AY;
            const semester = fineData.semester ?? term.semester;

            transaction.set(
              targetFineItemRef,
              buildEventFineItemPayload({
                id: targetFineItemRef.id,
                itemNumber: nextCount,
                fineTypeId: type.id,
                fineTypeName: type.name,
                eventId: event.id,
                eventName,
                eventDate,
                amount,
                reason,
                issuedBy: issuerName,
                now,
                academicYear,
                semester,
                parentFineId: target.fine.id!,
                userId: target.fine.userId,
                studentId: target.fine.studentId,
                userName: target.fine.userName,
                orgId: serverEventData.orgId,
              })
            );

            transaction.update(target.fineRef, {
              accumulatedAmount: nextAccumulated,
              balance: nextBalance,
              status: nextStatus,
              fineItemsCount: nextCount,
              firstFineIssuedAt: fineData.firstFineIssuedAt || now,
              lastFineIssuedAt: now,
              "metadata.updatedAt": now,
            });

            const existingClearance = target.clearanceSnap.exists()
              ? target.clearanceSnap.data()
              : null;
            const blockingEntry = buildFineBlockingItemEntry({
              referenceId: targetFineItemRef.id,
              parentFineId: target.fine.id!,
              title: eventName,
              balance: amount,
              academicYear,
              semester,
            });
            const mergedBlocking = {
              ...(existingClearance?.blockingItems ?? {}),
              [targetFineItemRef.id]: blockingEntry,
            };
            const nextClearanceStatus = deriveClearanceStatusFromBlockingItems(mergedBlocking);

            if (target.clearanceSnap.exists()) {
              transaction.update(target.clearanceRef, {
                [`blockingItems.${targetFineItemRef.id}`]: blockingEntry,
                status: nextClearanceStatus,
                clearanceDate: nextClearanceStatus === "cleared" ? now : null,
                updatedAt: now,
              });
            } else {
              transaction.set(target.clearanceRef, {
                id: target.clearanceRef.id,
                userId: target.fine.userId,
                orgId: serverEventData.orgId,
                studentId: target.fine.studentId,
                userName: target.fine.userName,
                status: nextClearanceStatus,
                clearanceDate: nextClearanceStatus === "cleared" ? now : null,
                academicYear,
                semester,
                isArchived: false,
                createdAt: now,
                blockingItems: mergedBlocking,
                updatedAt: now,
              });
            }

            statsDelta += amount;
            newlyWritten++;
          }

          if (statsDelta > 0) {
            applyFineStatsDeltaInTx(
              transaction,
              statsRef,
              statsSnap,
              { customId: statsId, orgId: serverEventData.orgId, totalStudents: 0 },
              { totalFinesDelta: statsDelta, totalUnpaidDelta: statsDelta }
            );
          }

          // Renew the lease atomically with every committed chunk
          transaction.update(eventRef, {
            fineGenerationHeartbeatAt: now,
          });

          return { newlyWritten, skippedInTx };
        }),
        30_000,
        "committing fine generation transaction chunk"
      );
    };

    const runPhaseBatches = async (
      phase: "absent" | "partial",
      finesList: StudentFines[],
      amount: number,
      reason: string
    ): Promise<FineGenerationResult | null> => {
      if (finesList.length === 0) return null;
      const totalBatches = Math.ceil(finesList.length / TX_CHUNK_SIZE);
      const phaseLabel = phase === "absent" ? "Absent" : "Partial";

      for (let i = 0; i < finesList.length; i += TX_CHUNK_SIZE) {
        const batchNum = Math.floor(i / TX_CHUNK_SIZE) + 1;
        const chunk = finesList.slice(i, i + TX_CHUNK_SIZE);

        try {
          const { newlyWritten, skippedInTx } = await processChunkTransaction(
            chunk,
            amount,
            reason
          );
          if (newlyWritten > 0) wroteAnyData = true;
          if (phase === "absent") {
            counts.absentDone += newlyWritten + skippedInTx;
          } else {
            counts.partialDone += newlyWritten + skippedInTx;
          }
          counts.skippedAlreadyFined += skippedInTx;

          const doneCount = phase === "absent" ? counts.absentDone : counts.partialDone;
          const totalCount = phase === "absent" ? counts.absentTotal : counts.partialTotal;

          report(
            phase,
            `${phaseLabel} batch ${batchNum}/${totalBatches} committed (${doneCount}/${totalCount})`,
            { batchNum, totalBatches }
          );
        } catch (err) {
          console.error(`${phaseLabel} batch transaction failed:`, err);
          const errReason = err instanceof Error ? err.message : "Network or Firestore error.";
          const doneCount = phase === "absent" ? counts.absentDone : counts.partialDone;
          const totalCount = phase === "absent" ? counts.absentTotal : counts.partialTotal;
          return failAndReturn(
            `Stopped at ${phase} batch ${batchNum}/${totalBatches} (${doneCount}/${totalCount} committed): ${errReason}`
          );
        }
      }

      return null;
    };

    // ── ABSENT USERS ──────────────────────────────────────────────────────────
    const absentFailure = await runPhaseBatches(
      "absent",
      absentUsersFines,
      type.requiresTimeOut ? type.defaultAmount * 2 : type.defaultAmount,
      `Fine for being absent in event ${eventName}`
    );
    if (absentFailure) return absentFailure;

    // ── PARTIAL USERS ─────────────────────────────────────────────────────────
    const partialFailure = await runPhaseBatches(
      "partial",
      partialUsersFines,
      type.defaultAmount,
      `Fine for being partially absent in event ${eventName}`
    );
    if (partialFailure) return partialFailure;

    // ── FINALIZE LOCK ON EVENT ────────────────────────────────────────────────
    await releaseEventGenerationLock(event.id, lockId, "completed", {
      finesGenerated: true,
      fineGenerationCompletedAt: Timestamp.now(),
    });
    lockClaimed = false;
    invalidateFinesGenerationCaches(event.id);

    const grandTotal = counts.absentDone + counts.partialDone;
    const message = `All ${grandTotal.toLocaleString()} fine items processed successfully.`;
    report("done", message);
    return {
      status: "done",
      absentCommitted: counts.absentDone,
      partialCommitted: counts.partialDone,
      skippedAlreadyFined: counts.skippedAlreadyFined,
      message,
    };
  } catch (error) {
    console.error(`Unexpected error in generateFinesOnEvent(${event.id}):`, error);
    const reason =
      error instanceof Error ? error.message : "Unexpected error during fine generation.";
    return failAndReturn(reason);
  }
};

/**
 * For a newly added student, iterate over all events where fine generation
 * has already been run (finesGenerated == true). Mark them as absent
 * and create fineItem documents under their fine record — using deterministic IDs
 * and checking existing items so duplicates are never created.
 */
export const assignExistingFinesToStudent = async (
  userId: string,
  studentData: {
    firstName: string;
    lastName: string;
    studentId: string;
  },
  orgContext: { uid: string; accessLevel: number },
  currentUser: Member
): Promise<void> => {
  const orgId = orgContext.uid;
  const userName = `${studentData.firstName} ${studentData.lastName}`;
  const termData = await getActiveTerm();
  if (!termData) return;

  const issuerName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : "Unknown Issuer";

  const eventsRef = collection(db, "events");
  const eventsQuery = query(
    eventsRef,
    where("finesGenerated", "==", true),
    where("isDeleted", "==", false),
    where("orgId", "==", orgId),
    where("academicYear", "==", termData.AY),
    where("semester", "==", termData.semester)
  );
  const eventsSnap = await getDocsFromServer(eventsQuery);

  const eligibleEvents = eventsSnap.docs;
  if (eligibleEvents.length === 0) return;

  const finesRef = collection(db, "fines");
  const fineQuery = query(
    finesRef,
    and(
      where("userId", "==", userId),
      where("orgId", "==", orgId),
      where("metadata.isArchived", "==", false),
      where("academicYear", "==", termData.AY),
      or(
        where("semester", "==", termData.semester),
        where("semester", "==", `${termData.semester} Semester`)
      )
    )
  );
  let fineSnap = await getDocsFromServer(fineQuery);

  if (fineSnap.empty) {
    const student = await getUserById(userId);
    if (student) {
      await getOrCreateFinesForStudents(
        [{ id: student.id!, member: student } as MemberData],
        { AY: termData.AY, semester: termData.semester },
        orgId
      );
    }
    fineSnap = await getDocsFromServer(fineQuery);
  }

  if (fineSnap.empty) return;

  let canonicalFine: StudentFines | undefined;
  for (const d of fineSnap.docs) {
    canonicalFine = pickCanonicalFineDoc(canonicalFine, {
      id: d.id,
      ...d.data(),
    } as StudentFines);
  }
  if (!canonicalFine || !canonicalFine.id) return;

  const parentFineId = canonicalFine.id;
  const fineDocRef = doc(db, "fines", parentFineId);
  const clearanceId = buildClearanceId(userId, orgId, orgContext.accessLevel, termData);
  const clearanceRef = doc(db, "clearanceStatus", clearanceId);
  const fineItemsCollection = collection(db, "fines", parentFineId, "fineItems");

  // Fetch existing items to guard against active duplicates and preserve archived deterministic IDs
  const existingItemsSnap = await getDocsFromServer(fineItemsCollection);
  const existingEventIds = new Set<string>();
  const archivedDocIds = new Set<string>();
  for (const itemSnap of existingItemsSnap.docs) {
    const data = itemSnap.data();
    if (isActiveFineItem(data as Record<string, unknown>)) {
      if (data.eventId) existingEventIds.add(String(data.eventId));
    } else {
      archivedDocIds.add(itemSnap.id);
    }
  }

  // Pre-fetch unique fineTypes in parallel instead of sequential awaits inside the loop
  const uniqueFineTypeIds = Array.from(
    new Set(
      eligibleEvents
        .map((e) => e.data().fineTypeId as string | undefined)
        .filter((id): id is string => Boolean(id))
    )
  );
  const fineTypeEntries = await Promise.all(
    uniqueFineTypeIds.map(async (id) => [id, await getFineTypeById(id)] as const)
  );
  const fineTypeMap = new Map<string, FineType | null>(fineTypeEntries);

  const now = Timestamp.now();
  const CHUNK_SIZE = 20;
  let totalFineAmount = 0;

  let runningAccumulated = Number(canonicalFine.accumulatedAmount ?? 0);
  const paidAmt = Number(canonicalFine.paidAmount ?? 0);
  const waivedAmt = Number(canonicalFine.waivedAmount ?? 0);
  let runningCount = Number(canonicalFine.fineItemsCount ?? 0);

  for (let i = 0; i < eligibleEvents.length; i += CHUNK_SIZE) {
    const chunk = eligibleEvents.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    const blockingItems: Record<string, object> = {};
    let chunkTotalAmount = 0;
    let chunkItemCount = 0;

    for (const eventDoc of chunk) {
      if (existingEventIds.has(eventDoc.id)) continue;

      const event = eventDoc.data();
      const fineType = fineTypeMap.get(event.fineTypeId);
      if (!fineType) {
        console.warn(
          `Fine type ${event.fineTypeId} not found for event ${eventDoc.id}, skipping.`
        );
        continue;
      }

      const amount = fineType.requiresTimeOut
        ? fineType.defaultAmount * 2
        : fineType.defaultAmount;

      const eventDate = toTimestamp(event.date, now);
      const eventName: string = event.name ?? "Unknown Event";
      const fineItemRef = archivedDocIds.has(eventDoc.id)
        ? doc(fineItemsCollection)
        : doc(fineItemsCollection, eventDoc.id);

      runningCount += 1;

      batch.set(
        fineItemRef,
        buildEventFineItemPayload({
          id: fineItemRef.id,
          itemNumber: runningCount,
          fineTypeId: fineType.id,
          fineTypeName: fineType.name,
          eventId: eventDoc.id,
          eventName,
          eventDate,
          amount,
          reason: `Fine for being absent in event ${eventName}`,
          issuedBy: issuerName,
          now,
          academicYear: termData.AY,
          semester: termData.semester,
          parentFineId,
          userId,
          studentId: studentData.studentId,
          userName,
          orgId,
        })
      );

      blockingItems[fineItemRef.id] = buildFineBlockingItemEntry({
        referenceId: fineItemRef.id,
        parentFineId,
        title: eventName,
        balance: amount,
        academicYear: termData.AY,
        semester: termData.semester,
      });

      existingEventIds.add(eventDoc.id);
      chunkTotalAmount += amount;
      chunkItemCount++;
    }

    if (chunkItemCount === 0) continue;

    runningAccumulated += chunkTotalAmount;
    const nextBalance = Math.max(0, runningAccumulated - paidAmt - waivedAmt);
    const nextStatus = determineFineStatus({
      activeItemCount: runningCount,
      balance: nextBalance,
      paidAmount: paidAmt,
      waivedAmount: waivedAmt,
      hasPending: canonicalFine.status === FineStatus.PENDING,
    });

    batch.update(fineDocRef, {
      accumulatedAmount: runningAccumulated,
      balance: nextBalance,
      status: nextStatus,
      fineItemsCount: runningCount,
      firstFineIssuedAt: canonicalFine.firstFineIssuedAt || now,
      lastFineIssuedAt: now,
      "metadata.updatedAt": now,
    });

    batch.set(
      clearanceRef,
      {
        blockingItems,
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();
    totalFineAmount += chunkTotalAmount;
  }

  if (totalFineAmount > 0) {
    await updateFineStats(`${termData.AY}-${termData.semester}-${orgId}`, totalFineAmount, 0);
    await recalculateClearanceStatus(userId, termData, orgContext);
    cacheService.invalidateByPrefix("fines:");
    cacheService.invalidateByPrefix("clearance:");
  }
};
