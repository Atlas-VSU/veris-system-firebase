
import { Timestamp } from "firebase/firestore";
import type {
  OnSeedProgress,
  SeedProgress,
} from "@/features/organization/shared/types";

export type FineType = {
    id?: string;
    orgId?: string;
    name: string;
    description: string;
    defaultAmount: number;
    requiresTimeIn: boolean;
    requiresTimeOut?: boolean;
    majorEventsOnly: boolean;
    isActive: boolean;
}

export type ProofOfPayment = {
    id?: string;
    orgId: string;
    userName: string;
    studentId: string;
    paymentType: string;
    paymentHistoryId?: string;
    paymentMethod: string;
    referenceId: string;
    senderNumber: string;
    referenceNumber: string;
    amount: number;
    imageUrl: string;
    status: string;
    submittedAt: Timestamp;
    verifiedBy?: string;
    verifiedByName?: string;
    verifiedAt?: Timestamp;
    rejectionReason?: string;
    receiptCode?: string;
    notes?: string;
    metadata: { items?: { amount: number, title: string, parentFineId: string, paymentType: string, refId: string, historyId?: string }[], semester?: string, academicYear?: string },
                refundables?: { amount: number, title: string }[];
    isArchived: boolean;
    academicYear?: string;
    semester?: string;
}

export type FinesPaymentLog = {
  id: string;
  paymentNumber: number;
  amount: number;
  paymentMethod: string;
  paymentProofId: string | null;
  gcashReference: string | null;
  status: string;
  paidAt: Timestamp;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  rejectionReason?: string;
  notes?: string;
  metadata: {
    createdAt: Timestamp;
  };
}

export type StudentFines = {
    id?: string;
    orgId: string;
    userId: string;
    userName: string;
    studentId: string;
    academicYear: string;
    semester: string;
    accumulatedAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
    fineItemsCount: number;
    reason: string | null;
    firstFineIssuedAt: Timestamp | null;
    lastFineIssuedAt: Timestamp | null;
    dueDate: Timestamp |null;
    waivedAmount: number | null;
    waivedBy: string | null,
    waivedReason:string | null,
    waivedAt: Timestamp | null,
    remarks: string | null,
    metadata?: {
        createdAt: Timestamp;
        updatedAt: Timestamp;
        isArchived: boolean;
    };
}

export type FineItem = {
  id: string;
  itemNumber: number;
  fineTypeName: string;
  eventId: string;
  eventName: string;
  eventDate: Timestamp;
  amount: number;
  reason: string | null;
  issuedBy: string;
  issuedAt: Timestamp;
  isWaived: boolean;
  waivedBy?: string;
  waivedAt?: Timestamp;
  waivedReason?: string;
  appealNotes?: string;
  appealedAt?: Timestamp;
  appealStatus?: "pending" | "approved" | "rejected";
  appealResolvedBy?: string;
  appealResolvedAt?: Timestamp;
  isPaid: boolean;
  isPending?: boolean;
  academicYear?: string;
  semester?: string;
}

// Add "clearance" to your phase type
export type FineGenerationPhase = "preflight" | "absent" | "partial" | "clearance" | "done" | "error"

export type FineGenerationProgress = {
  phase: FineGenerationPhase;

  // Per-phase batch counters (only present during "absent" / "partial")
  batchNum?: number;
  totalBatches?: number;

  // Running totals across both phases
  absentTotal: number;
  absentDone: number;
  partialTotal: number;
  partialDone: number;

  // Human-readable status line for the UI log
  message: string;
};

// Convenience alias so callers don't have to type the full signature
export type OnFineProgress = (update: FineGenerationProgress) => void;


/**
 * Aliases of the shared seeding vocabulary, kept so existing imports across the
 * fines feature keep working. The shape is declared once in
 * `@/features/organization/shared/types` — clearance seeds records the same way
 * and previously carried its own divergent copy of it.
 */
export type BulkFinesProgress = SeedProgress;
export type OnBulkFinesProgress = OnSeedProgress;

export type BulkFinesResult = {
  success: boolean;
  totalUsers: number;
  committed: number;
  failedAtBatch: number | null; // null = no failure
};

export type StudentFineStatus = "unpaid" | "partial" | "paid" | "pending" | "waived";



