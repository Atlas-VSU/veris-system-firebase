"use client";

import { FineType } from "../types";
import {
  SLOT_LABEL,
  computeFineAmount,
  getRequiredSlots,
} from "../utils/attendanceRequirements";
import { formatCurrency } from "../utils/formatCurrency";

type FineTypeShape = Pick<
  FineType,
  "defaultAmount" | "requiresTimeIn" | "requiresTimeOut" | "name"
>;

interface FineAmountBreakdownProps {
  fineType: FineTypeShape;
}

/**
 * Spells out what a student is actually charged under the current settings.
 */
export function FineAmountBreakdown({ fineType }: FineAmountBreakdownProps) {
  const requiredSlots = getRequiredSlots(fineType);
  const amount = fineType.defaultAmount ?? 0;

  if (!amount || amount <= 0) return null;

  const maximum = computeFineAmount(fineType, requiredSlots);
  const missesEverything =
    requiredSlots.length === 1
      ? `Absent — missed ${SLOT_LABEL[requiredSlots[0]]}`
      : "Absent — missed every required signature";

  return (
    <div className="rounded-lg border border-[#2E7D32]/30 bg-[#8BC34A]/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-[#1B5E20]">
        What a student will be charged
      </p>

      <ul className="space-y-1">
        {requiredSlots.length > 1 &&
          requiredSlots.map((slot) => (
            <li
              key={slot}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground">
                Missed {SLOT_LABEL[slot]} only
              </span>
              <span className="font-medium text-foreground whitespace-nowrap">
                {formatCurrency(computeFineAmount(fineType, [slot]))}
              </span>
            </li>
          ))}

        <li className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{missesEverything}</span>
          <span className="font-semibold text-foreground whitespace-nowrap">
            {formatCurrency(maximum)}
          </span>
        </li>
      </ul>

      {requiredSlots.length > 1 && (
        <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-[#2E7D32]/20 pt-2">
          Time-out is required, so this fine is charged{" "}
          <strong>per missing signature</strong> — a student who misses both
          pays {formatCurrency(maximum)}, which is{" "}
          {requiredSlots.length}× the amount above.
        </p>
      )}
    </div>
  );
}
