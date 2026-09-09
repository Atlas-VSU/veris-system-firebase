"use client";

import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { useRecordInitialization } from "@/features/organization/shared/hooks/useRecordInitialization";

type InitializationState = ReturnType<typeof useRecordInitialization>;

interface InitializeRecordsDialogProps {
  open: boolean;
  /** The hook driving this dialog. It owns phase, progress and close. */
  state: InitializationState;

  title: string;
  description: React.ReactNode;
  actionLabel: string;
  actionIcon?: LucideIcon;
  /** Blocks the action — e.g. an inactive term the feature refuses to seed. */
  actionDisabled?: boolean;

  runningTitle: string;
  runningDescription: React.ReactNode;
  doneTitle: string;
  doneDescription: React.ReactNode;
  errorTitle: string;
  /** Shown under the error message. Say what state the data is left in. */
  errorHint?: React.ReactNode;

  /** Rendered above the phases while idle — typically an inactive-term alert. */
  warning?: { title: string; body: React.ReactNode } | null;
}

/**
 * The dialog shared by every "initialize this term's records" flow.
 *
 * Fines and clearance had separate dialogs that said the same things in
 * slightly different ways — different progress markup, different footer
 * wording, one showing batch counts and one not. Everything here is layout;
 * every word is a prop, so the two features stay visually identical while
 * still describing their own records.
 *
 * The progress detail grid appears only when the seeder actually reports
 * totals, so a seeder with no batch-level visibility renders a clean
 * indeterminate bar rather than a grid of zeroes.
 */
export function InitializeRecordsDialog({
  open,
  state,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  actionDisabled = false,
  runningTitle,
  runningDescription,
  doneTitle,
  doneDescription,
  errorTitle,
  errorHint,
  warning,
}: InitializeRecordsDialogProps) {
  const { progress, isRunning, isDone, isError, percent, start, close } = state;

  const hasCounts = Boolean(progress?.totalUsers);
  const isIdle = !isRunning && !isDone && !isError;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] w-[90vw] max-w-xl overflow-y-auto py-8">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {warning && isIdle && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">
              {warning.title}
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
              {warning.body}
            </AlertDescription>
          </Alert>
        )}

        {isRunning && (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
                  {runningTitle}
                </CardTitle>
                <CardDescription>{runningDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{progress?.message}</span>
                  {hasCounts && (
                    <span className="text-muted-foreground">{percent}% complete</span>
                  )}
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  {hasCounts ? (
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  ) : (
                    <div className="h-2 w-full animate-pulse rounded-full bg-primary" />
                  )}
                </div>

                {hasCounts && progress && (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                    <Stat label="Total students" value={progress.totalUsers} />
                    <Stat label="Committed" value={progress.committed} />
                    <Stat
                      label="Remaining"
                      value={progress.totalUsers - progress.committed}
                    />
                    {progress.batchNum && progress.totalBatches && (
                      <div>
                        <span className="text-muted-foreground">Batch</span>
                        <p className="mt-0.5 font-medium">
                          {progress.batchNum} of {progress.totalBatches}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isDone && (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  {doneTitle}
                </CardTitle>
                <CardDescription>{doneDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {hasCounts && progress && (
                    <Stat label="Total written" value={progress.committed} />
                  )}
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="mt-0.5 font-medium text-green-600">Success</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isError && (
          <div className="space-y-4 py-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  {errorTitle}
                </CardTitle>
                <CardDescription>{progress?.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasCounts && progress && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Stat label="Committed before failure" value={progress.committed} />
                    <div>
                      <span className="text-muted-foreground">Not written</span>
                      <p className="mt-0.5 font-medium text-red-600">
                        {(progress.totalUsers - progress.committed).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {errorHint && (
                  <p className="text-sm text-muted-foreground">{errorHint}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isRunning}>
            {isDone ? "Close" : "Cancel"}
          </Button>
          {!isDone && (
            <LoadingButton
              variant="success"
              onClick={start}
              isLoading={isRunning}
              disabled={actionDisabled}
              loadingText="Initializing..."
            >
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {actionLabel}
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="mt-0.5 font-medium">{value.toLocaleString()}</p>
    </div>
  );
}
