"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { seedClearanceDocuments } from "@/firebase/clearance";
import { useAuth } from "@/hooks/useAuth";
import { Term } from "@/constants/types";
import { useRecordInitialization } from "@/features/organization/shared/hooks/useRecordInitialization";
import type { SeedOutcome } from "@/features/organization/shared/types";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";

/**
 * Seeds the clearance roster for the selected term.
 *
 * Phase handling, progress state and close semantics live in
 * `useRecordInitialization`, shared with the fines flow. What is specific to
 * clearance is only the preconditions and the seeder itself.
 *
 * `seedClearanceDocuments` writes in one pass and reports no batch counts, so
 * the dialog shows an indeterminate bar rather than a percentage — see the
 * `hasCounts` branch in `InitializeRecordsDialog`.
 */
export function useBulkClearance(
  onSuccess?: () => void,
  onOpenChange?: (open: boolean) => void
) {
  const { selected } = useTermPeriod();
  const { user: currentUser } = useAuth();

  const seed = useCallback(async (): Promise<SeedOutcome> => {
    // Guarded here rather than in the shared hook: what counts as a valid
    // precondition is the feature's business, not the state machine's.
    if (!currentUser) {
      toast.error("No authenticated user found.");
      return { success: false, message: "No authenticated user found." };
    }
    if (!selected) {
      toast.error("No term selected.");
      return { success: false, message: "No term selected." };
    }

    await seedClearanceDocuments(currentUser, selected as Term);
    return { success: true };
  }, [currentUser, selected]);

  const state = useRecordInitialization({
    seed,
    successMessage: "Clearance records initialized successfully.",
    errorMessage: "Failed to initialize clearance records.",
    onSuccess,
    onOpenChange,
  });

  return { selectedTerm: selected, ...state };
}
