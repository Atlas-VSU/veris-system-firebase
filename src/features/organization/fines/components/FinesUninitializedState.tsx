"use client";

import { ReceiptText, Upload } from "lucide-react";
import { RecordsUninitializedNotice } from "@/features/organization/shared/components/RecordsUninitializedNotice";

interface FinesUninitializedStateProps {
  onInitializeClick: () => void;
  disabled?: boolean;
}

/** Fines' copy for the shared uninitialized-records notice. */
export function FinesUninitializedState({
  onInitializeClick,
  disabled,
}: FinesUninitializedStateProps) {
  return (
    <RecordsUninitializedNotice
      icon={ReceiptText}
      title="Term Fine Records Not Initialized"
      description={
        <>
          Fine tracking records have not been set up for this term yet.
          Initializing them is a <strong>required first step</strong> before you
          can view the student fine roster, issue fines, or record payments.
        </>
      }
      hint="Students added later are given their own fine record automatically — this only seeds the students already in the system."
      actionLabel="Initialize Fine Records"
      actionIcon={Upload}
      onAction={onInitializeClick}
      disabled={disabled}
    />
  );
}
