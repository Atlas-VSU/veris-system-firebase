"use client";

import { Upload } from "lucide-react";
import { InitializeRecordsDialog } from "@/features/organization/shared/components/InitializeRecordsDialog";
import { useBulkFines } from "../hooks/useBulkFines";

interface BulkGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Fines' copy for the shared initialization dialog.
 *
 * All layout and phase rendering come from `InitializeRecordsDialog`, so this
 * stays identical to the clearance flow by construction — only the wording and
 * the inactive-term policy differ.
 */
export function BulkGenerationDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkGenerationDialogProps) {
  const { selectedTerm, canInitialize, ...state } = useBulkFines(
    onSuccess,
    onOpenChange
  );

  return (
    <InitializeRecordsDialog
      open={open}
      state={state}
      title="Initialize Student Fine Records"
      description={
        <>
          This is a required step to create fine tracking records for every
          registered student in the current term. It enables the student fine
          roster, fine issuance, and payment recording.
        </>
      }
      actionLabel="Initialize Fine Records"
      actionIcon={Upload}
      actionDisabled={!canInitialize}
      warning={
        selectedTerm?.isActive
          ? null
          : {
              title: "Inactive Academic Term",
              body: "Fine generation is disabled because the selected term is inactive. Switch to an active academic term to continue.",
            }
      }
      runningTitle="Initializing Fine Records"
      runningDescription="Writing fine documents in batches. This may take a few minutes — please do not close this dialog."
      doneTitle="Initialization Complete"
      doneDescription="All fine documents have been created. You can now issue fines and record payments against them."
      errorTitle="Initialization Failed"
      errorHint="Records committed before the failure were saved. Running this again will pick up the students that were missed."
    />
  );
}
