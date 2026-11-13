import { FineStatus } from "@/constants/status";
import { PaymentType } from "@/constants/types";
import { Timestamp } from "firebase/firestore";
import { FineItem, StudentFines } from "../types";

export function computeTotalPaid(record: FineItem[]) {
  let paidAmount = 0;
  record.forEach(r => {
    if (r.isPaid) {
      paidAmount += r.amount;
    }
  });
  return paidAmount;
}

export function isActiveFineItem(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;
  const metadata = data.metadata as { isArchived?: unknown } | undefined;
  return data.isArchived !== true && metadata?.isArchived !== true;
}

export function timestampToMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && Number.isFinite(d.getTime()) ? d.getTime() : null;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const secs = (value as { seconds: number; nanoseconds?: number }).seconds;
    const nanos = Number((value as { nanoseconds?: number }).nanoseconds ?? 0);
    return secs * 1000 + Math.floor(nanos / 1_000_000);
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Safely converts any date-like value (Firestore Timestamp, serialized {seconds, nanoseconds}, Date, ISO string, or epoch ms)
 * into a Firestore Timestamp, falling back to `fallback` if invalid.
 */
export function toTimestamp(val: unknown, fallback: Timestamp): Timestamp {
  const millis = timestampToMillis(val);
  if (millis !== null && Number.isFinite(millis)) {
    return Timestamp.fromMillis(millis);
  }
  return fallback;
}

export function pickCanonicalFineDoc(
  current: StudentFines | undefined,
  candidate: StudentFines
): StudentFines {
  if (!current) return candidate;
  const currentCount = Number(current.fineItemsCount ?? 0);
  const candidateCount = Number(candidate.fineItemsCount ?? 0);
  if (candidateCount !== currentCount) {
    return candidateCount > currentCount ? candidate : current;
  }
  const currentCreated = timestampToMillis(current.metadata?.createdAt) ?? Number.MAX_SAFE_INTEGER;
  const candidateCreated = timestampToMillis(candidate.metadata?.createdAt) ?? Number.MAX_SAFE_INTEGER;
  if (candidateCreated !== currentCreated) {
    return candidateCreated < currentCreated ? candidate : current;
  }
  return (candidate.id || "") < (current.id || "") ? candidate : current;
}

export function determineFineStatus({
  activeItemCount,
  balance,
  paidAmount,
  waivedAmount,
  hasPending,
}: {
  activeItemCount: number;
  balance: number;
  paidAmount: number;
  waivedAmount: number;
  hasPending: boolean;
}): FineStatus {
  if (hasPending) return FineStatus.PENDING;
  if (balance > 0) {
    return paidAmount > 0 || waivedAmount > 0 ? FineStatus.PARTIAL : FineStatus.UNPAID;
  }
  if (activeItemCount === 0) return FineStatus.UNPAID;
  if (waivedAmount > 0 && paidAmount === 0) return FineStatus.WAIVED;
  return FineStatus.PAID;
}

export function deriveClearanceStatusFromBlockingItems(
  blockingItems: Record<string, {
    status?: string;
    balance?: number;
    isRequiredForClearance?: boolean;
    pendingReview?: boolean;
  }> | null | undefined
): "cleared" | "pending" | "not_cleared" {
  const items = Object.values(blockingItems ?? {});
  const unpaidRequired = items.filter(
    (item) =>
      item &&
      item.isRequiredForClearance &&
      (item.status === "unpaid" || Number(item.balance ?? 0) > 0)
  );
  if (unpaidRequired.length === 0) {
    return "cleared";
  }
  return unpaidRequired.some((item) => Boolean(item.pendingReview))
    ? "pending"
    : "not_cleared";
}

export function buildFineId(
  userId: string,
  orgId: string,
  term: { AY: string; semester: string }
): string {
  const raw = `${userId}_${orgId}_${term.AY}-${term.semester}`;
  return raw.replace(/[/\s]/g, "_");
}

export function buildInitialStudentFineDoc({
  id,
  orgId,
  userId,
  studentId,
  userName,
  academicYear,
  semester,
  now,
}: {
  id?: string;
  orgId: string;
  userId: string;
  studentId: string;
  userName: string;
  academicYear: string;
  semester: string;
  now: Timestamp;
}): Omit<StudentFines, "id"> & { id?: string } {
  return {
    ...(id ? { id } : {}),
    orgId,
    userId,
    studentId,
    userName,
    academicYear,
    semester,
    accumulatedAmount: 0,
    paidAmount: 0,
    balance: 0,
    status: FineStatus.UNPAID,
    fineItemsCount: 0,
    firstFineIssuedAt: null,
    lastFineIssuedAt: null,
    dueDate: null,
    waivedAmount: null,
    waivedBy: null,
    waivedReason: null,
    waivedAt: null,
    remarks: null,
    reason: "",
    metadata: {
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    },
  };
}

export function buildEventFineItemPayload({
  id,
  itemNumber,
  fineTypeId,
  fineTypeName,
  eventId,
  eventName,
  eventDate,
  amount,
  reason,
  issuedBy,
  now,
  academicYear,
  semester,
  parentFineId,
  userId,
  studentId,
  userName,
  orgId,
}: {
  id: string;
  itemNumber: number;
  fineTypeId: string | undefined;
  fineTypeName: string;
  eventId: string;
  eventName: string;
  eventDate: Timestamp;
  amount: number;
  reason: string;
  issuedBy: string;
  now: Timestamp;
  academicYear: string;
  semester: string;
  parentFineId: string;
  userId: string;
  studentId: string;
  userName: string;
  orgId: string;
}) {
  return {
    id,
    itemNumber,
    fineTypeId,
    fineTypeName,
    eventId,
    eventName,
    eventDate,
    amount,
    reason,
    issuedBy,
    issuedAt: now,
    isWaived: false,
    waivedBy: null,
    waivedReason: null,
    waivedAt: null,
    appealNotes: null,
    appealedAt: null,
    appealStatus: null,
    appealResolvedAt: null,
    appealResolvedBy: null,
    metadata: {
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    },
    isPaid: false,
    isArchived: false,
    isPending: false,
    academicYear,
    semester,
    parentFineId,
    userId,
    studentId,
    userName,
    orgId,
  };
}

export function buildFineBlockingItemEntry({
  referenceId,
  parentFineId,
  title,
  balance,
  academicYear,
  semester,
}: {
  referenceId: string;
  parentFineId: string;
  title: string;
  balance: number;
  academicYear: string;
  semester: string;
}) {
  return {
    type: PaymentType.FINES,
    referenceId,
    parentFineId,
    title,
    balance,
    status: "unpaid" as const,
    pendingReview: false,
    isRequiredForClearance: true,
    academicYear,
    semester,
  };
}
