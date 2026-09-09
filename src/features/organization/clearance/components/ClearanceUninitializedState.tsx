"use client";

import { ShieldAlert, Users } from "lucide-react";
import { RecordsUninitializedNotice } from "@/features/organization/shared/components/RecordsUninitializedNotice";

interface ClearanceUninitializedStateProps {
  onInitializeClick: () => void;
  disabled?: boolean;
}

/** Clearance's copy for the shared uninitialized-records notice. */
export function ClearanceUninitializedState({
  onInitializeClick,
  disabled,
}: ClearanceUninitializedStateProps) {
  return (
    <RecordsUninitializedNotice
      icon={ShieldAlert}
      title="Term Clearance Roster Not Initialized"
      description={
        <>
          Clearance records have not been set up for this term yet. Initializing
          the student clearance roster is a <strong>required first step</strong>{" "}
          before you can track clearance statuses, resolve blocking items, or
          approve payments.
        </>
      }
      hint="Fees and fines generated later will automatically link to these clearance documents."
      actionLabel="Initialize Clearance Roster"
      actionIcon={Users}
      onAction={onInitializeClick}
      disabled={disabled}
    />
  );
}
