import { FineType } from "../types";

/**
 * The two attendance "signatures" a student can be asked to provide for an event.
 * A fine type declares which of them it charges for via `requiresTimeIn` /
 * `requiresTimeOut`; the UI calls `defaultAmount` the "Amount per Sign", i.e.
 * the price of ONE missing signature.
 */
export type AttendanceSlot = "timeIn" | "timeOut";

export const SLOT_LABEL: Record<AttendanceSlot, string> = {
  timeIn: "time-in",
  timeOut: "time-out",
};

/** Whether a student actually provided each signature for an event. */
export type AttendanceSignatures = {
  hasTimeIn: boolean;
  hasTimeOut: boolean;
};

/** A student who never signed at all — used for absentees. */
export const NO_SIGNATURES: AttendanceSignatures = {
  hasTimeIn: false,
  hasTimeOut: false,
};

/**
 * The slots a fine type charges for.
 *
 * Legacy fine types were written before the requirement toggles existed and may
 * have `requiresTimeIn` missing (=> undefined => falsy). Charging nothing for
 * those would silently stop fine generation, so we fall back to the historical
 * behaviour of a single time-in signature.
 */
export const getRequiredSlots = (
  type: Pick<FineType, "requiresTimeIn" | "requiresTimeOut" | "name">
): AttendanceSlot[] => {
  const slots: AttendanceSlot[] = [];
  if (type.requiresTimeIn) slots.push("timeIn");
  if (type.requiresTimeOut) slots.push("timeOut");

  if (slots.length === 0) {
    console.warn(
      `Fine type "${type.name}" declares no required signatures — defaulting to time-in only.`
    );
    return ["timeIn"];
  }
  return slots;
};

/** How many signatures a fully-compliant student must provide. */
export const getRequiredSlotCount = (
  type: Pick<FineType, "requiresTimeIn" | "requiresTimeOut" | "name">
): number => getRequiredSlots(type).length;

/**
 * The required signatures a student failed to provide.
 * Signatures that are not required by the fine type are never charged, and
 * signatures the student provided but that were not required are ignored.
 */
export const getMissedRequiredSlots = (
  type: Pick<FineType, "requiresTimeIn" | "requiresTimeOut" | "name">,
  signatures: AttendanceSignatures
): AttendanceSlot[] =>
  getRequiredSlots(type).filter((slot) =>
    slot === "timeIn" ? !signatures.hasTimeIn : !signatures.hasTimeOut
  );

/**
 * Pro-rated fine: one `defaultAmount` per missed REQUIRED signature.
 * A student who missed everything pays the full amount, a student who missed
 * one of two required signatures pays half of it, and a student who only missed
 * a signature the fine type does not require pays nothing.
 */
export const computeFineAmount = (
  type: Pick<FineType, "requiresTimeIn" | "requiresTimeOut" | "name" | "defaultAmount">,
  missedSlots: AttendanceSlot[]
): number => Math.max(0, (type.defaultAmount ?? 0) * missedSlots.length);

/** "time-in", "time-out", or "time-in and time-out". */
export const describeMissedSlots = (missedSlots: AttendanceSlot[]): string => {
  const labels = missedSlots.map((slot) => SLOT_LABEL[slot]);
  if (labels.length === 0) return "no required signature";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
};

/**
 * Human-readable reason stored on the fine item, e.g.
 *   "Absent from General Assembly — missed time-in and time-out (2 of 2 required signatures)"
 *   "Partially present at General Assembly — missed time-out (1 of 2 required signatures)"
 */
export const buildFineReason = (
  type: Pick<FineType, "requiresTimeIn" | "requiresTimeOut" | "name">,
  eventName: string,
  missedSlots: AttendanceSlot[],
  wasAbsent: boolean
): string => {
  const required = getRequiredSlotCount(type);

  let prefix: string;
  if (wasAbsent) {
    prefix = `Absent from ${eventName}`;
  } else if (missedSlots.length >= required) {
    // Has an attendance record but no usable signature on it.
    prefix = `No valid attendance signature for ${eventName}`;
  } else {
    prefix = `Partially present at ${eventName}`;
  }

  return `${prefix} — missed ${describeMissedSlots(missedSlots)} (${missedSlots.length} of ${required} required signature${required === 1 ? "" : "s"})`;
};
