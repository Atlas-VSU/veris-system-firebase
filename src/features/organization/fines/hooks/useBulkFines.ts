"use client";

import { useCallback } from "react";
import { createBulkFines } from "@/firebase/fines/create/fines";
import { useRecordInitialization } from "@/features/organization/shared/hooks/useRecordInitialization";
import type { OnSeedProgress, SeedOutcome } from "@/features/organization/shared/types";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";

/**
 * Seeds the fine roster for the selected term.
 *
 * Mirrors `useBulkClearance`; both delegate their phase handling to
 * `useRecordInitialization`. The difference between the two is real and worth
 * keeping: `createBulkFines` writes in batches and reports counts as it goes,
 * so the dialog can show a true percentage, and it signals partial failure by
 * RETURNING `success: false` rather than throwing — the shared hook treats
 * that the same as a throw.
 */
export function useBulkFines(
  onSuccess?: () => void,
  onOpenChange?: (open: boolean) => void
) {
  const { selected } = useTermPeriod();

  const seed = useCallback(
    async (report: OnSeedProgress): Promise<SeedOutcome> => {
      const result = await createBulkFines(report);

      if (!result.success) {
        return {
          success: false,
          message:
            `Failed at batch ${result.failedAtBatch}. ` +
            `${result.committed.toLocaleString()} records were saved.`,
        };
      }
      return { success: true };
    },
    []
  );

  const state = useRecordInitialization({
    seed,
    successMessage: "Fine records initialized successfully.",
    errorMessage: "Failed to initialize fine records.",
    onSuccess,
    onOpenChange,
  });

  return {
    selectedTerm: selected,
    /** Fines refuse an inactive term outright — unlike clearance, which warns
     *  but allows it. Issuing new charges against a closed term is not a
     *  reconstruction, it is a mistake. */
    canInitialize: Boolean(selected?.isActive),
    ...state,
  };
}
