"use client";

import { Users } from "lucide-react";
import { InitializeRecordsDialog } from "@/features/organization/shared/components/InitializeRecordsDialog";
import { useBulkClearance } from "../hooks/useBulkClearance";

interface BulkClearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Clearance's copy for the shared initialization dialog.
 *
 * All layout and phase rendering come from `InitializeRecordsDialog`, so this
 * stays identical to the fines flow by construction — only the wording differs.
 */
export function BulkClearanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkClearanceDialogProps) {
  const { selectedTerm, ...state } = useBulkClearance(onSuccess, onOpenChange);

  return (
    <InitializeRecordsDialog
      open={open}
      state={state}
      title="Initialize Student Clearance Roster"
      description={
        <>
          This is a required step to create clearance tracking records for every
          registered student in the current term. It enables clearance status
          tracking, blocking item management, and payment approvals. Fees and
          fines generated afterwards link to these documents automatically.
        </>
      }
      actionLabel="Initialize Clearance Roster"
      actionIcon={Users}
      // Unlike fines, an inactive term is warned about but still allowed: a
      // past term's clearance may legitimately need reconstructing.
      warning={
        selectedTerm?.isActive
          ? null
          : {
              title: "Inactive Academic Term",
              body: "The selected term is not active. You may still initialize clearance records for an inactive term, but check the term is correct before proceeding.",
            }
      }
      runningTitle="Initializing Clearance Records"
      runningDescription="Creating clearance documents for all approved students. Please do not close this dialog."
      doneTitle="Initialization Complete"
      doneDescription="All clearance documents have been created. You can now track clearance statuses, manage blocking items, and approve payments."
      errorTitle="Initialization Failed"
      errorHint="Some records may not have been created. Try again, or contact support if the problem persists."
    />
  );
}
