export function isValidBulkStudentId(value: string): boolean {
  return value.length === 10 && /^[0-9]{2}-1-[0-9]{5}$/.test(value);
}

export const INVALID_BULK_STUDENT_ID_REASON = "Student ID must use XX-1-XXXXX: two digits, -1-, then five digits (for example, 24-1-00001).";

export type AttendanceMode = "time-in" | "time-out";

export interface BulkEntry {
  row: number;
  studentId: string;
}

export type BulkOutcome =
  | "eligible" | "recorded" | "already_recorded" | "duplicate_in_file"
  | "invalid_student_id" | "student_not_found" | "ambiguous_student_id"
  | "confirmation_required" | "failed" | "not_processed";

export interface BulkResult extends BulkEntry {
  outcome: BulkOutcome;
  reason: string;
  outside?: boolean;
}

export interface BulkProgress {
  finished: number;
  total: number;
  batch: number;
  batches: number;
  retrying: boolean;
  results: BulkResult[];
}

export const attendanceModeLabel = (mode: AttendanceMode) => mode === "time-in" ? "Check-in" : "Check-out";

export const bulkOutcomeLabels: Record<BulkOutcome, string> = {
  eligible: "Ready", recorded: "Recorded", already_recorded: "Already recorded",
  duplicate_in_file: "Duplicate in file", invalid_student_id: "Invalid student ID",
  student_not_found: "Student not found", ambiguous_student_id: "Ambiguous student ID",
  confirmation_required: "Confirmation required", failed: "Failed", not_processed: "Not processed / unconfirmed",
};
