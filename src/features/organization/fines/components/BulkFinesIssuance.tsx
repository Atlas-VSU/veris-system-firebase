"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, RotateCcw, Upload, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FineGenerationProgress } from "../types";
import { generateFinesOnEvent } from "@/firebase/fines/create/fines";
import { Event } from "../../events/types";
import { toast } from "sonner";
import { useSubscriptionTier } from "../../events/hooks/useSubscriptionTier";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";
import { isFineGenerationInterrupted } from "@/utils/eventStatusUtils";

interface BulkFinesIssuanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  event: Event;
}

export function BulkFinesIssuance({
  open,
  onOpenChange,
  onClose,
  event
}: BulkFinesIssuanceProps) {
  const { selected } = useTermPeriod();
  const [progress, setProgress] = useState<FineGenerationProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const isRunning =
    isStarting ||
    progress?.phase === "preflight" ||
    progress?.phase === "absent" ||
    progress?.phase === "partial" ||
    progress?.phase === "clearance";
  const isDone = !isStarting && progress?.phase === "done";
  const isError = !isStarting && progress?.phase === "error";
  const canResume = isError || isFineGenerationInterrupted(event);

  const { subscriptionTier } = useSubscriptionTier();

  const handleClose = () => {
    if (isRunning) return;
    setProgress(null);       // reset for next open
    onClose();
  };

  const handleIssuance = async () => {
    if (isRunning) return;
    if (!selected?.isActive) {
      toast.error("Cannot generate fines for an inactive academic term.");
      return;
    }

    setIsStarting(true);
    setProgress({
      phase: "preflight",
      absentTotal: 0,
      absentDone: 0,
      partialTotal: 0,
      partialDone: 0,
      skippedAlreadyFined: 0,
      message: "Starting fine generation…",
    });

    try {
      const result = await generateFinesOnEvent(
        event,
        (update) => setProgress(update)  // each report() call triggers a re-render
      );

      if (result.status === "done") {
        toast.success(result.message || "Fines generated successfully!");
      } else {
        toast.error(result.message || "Fine generation stopped before completion.");
      }
    } catch (error) {
      console.error("Error during fine generation:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "An error occurred during fine generation. Please check your connection and try again.";
      setProgress((prev) => ({
        phase: "error",
        absentTotal: prev?.absentTotal ?? 0,
        absentDone: prev?.absentDone ?? 0,
        partialTotal: prev?.partialTotal ?? 0,
        partialDone: prev?.partialDone ?? 0,
        skippedAlreadyFined: prev?.skippedAlreadyFined ?? 0,
        message: msg,
      }));
      toast.error(msg);
    } finally {
      setIsStarting(false);
    }
  };

  // ── Derived percentages ──────────────────────────────────────────────────
  const absentPct = progress?.absentTotal
    ? Math.round((progress.absentDone / progress.absentTotal) * 100)
    : 0;

  const partialPct = progress?.partialTotal
    ? Math.round((progress.partialDone / progress.partialTotal) * 100)
    : 0;

  // Overall = combined done / combined total
  const totalDone  = (progress?.absentDone  ?? 0) + (progress?.partialDone  ?? 0);
  const totalUsers = (progress?.absentTotal ?? 0) + (progress?.partialTotal ?? 0);
  const overallPct = totalUsers > 0 ? Math.round((totalDone / totalUsers) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        if (isRunning) {
          onOpenChange(false);
          return;
        }
        handleClose();
      }
    }}>
      <DialogContent className="max-w-2xl w-[90vw] overflow-y-auto max-h-[90vh] py-8">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl">Event Fines Issuance</DialogTitle>
          
          <div className="space-y-2">
            <DialogDescription>
              This will issue fines for all absent and possibly partially absent student members. 
              This may take some time, please do not close this dialog once started until the process is complete.
            </DialogDescription>

            <p className="pt-2 text-sm font-medium text-destructive animate-pulse">
              <span className="font-bold underline">Notice:</span> Each member can only be fined once per event. If interrupted, resuming safely skips members already fined.
            </p>
          </div>
        </DialogHeader>

        {!selected?.isActive && !isRunning && !isDone && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">Inactive Academic Term</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              Fine generation is disabled because the selected term is inactive. Please switch to an active academic term.
            </AlertDescription>
          </Alert>
        )}

        {isFineGenerationInterrupted(event) && !isRunning && !isDone && !isError && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">Previous Issuance Interrupted</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              A prior fine generation attempt for this event did not complete. Resuming will verify already-committed students and only issue fines for remaining non-attending members.
            </AlertDescription>
          </Alert>
        )}

         {/* ── RUNNING ─────────────────────────────────────────────────── */}
        {isRunning && progress && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Generating Fines
                </CardTitle>
                <CardDescription>
                  {progress.message}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">

                {/* ── PREFLIGHT: indeterminate pulse bar ─────────────────── */}
                {progress.phase === "preflight" && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Preparing…</span>
                      <span className="text-muted-foreground">Please wait</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Checking lock state, attendance records, and existing fine documents…
                    </p>
                  </div>
                )}

                {/* ── ABSENT / PARTIAL: real determinate bars ─────────────── */}
                {progress.phase !== "preflight" && (
                  <>
                    {/* Overall bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Overall</span>
                        <span className="text-muted-foreground">
                          {overallPct}% — {totalDone.toLocaleString()} / {totalUsers.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${overallPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Absent bar */}
                    {progress.absentTotal > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Absent users</span>
                          <span className="text-muted-foreground">
                            {absentPct}% — {progress.absentDone.toLocaleString()} / {progress.absentTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${absentPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Partial bar */}
                    {progress.partialTotal > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Partial attendees</span>
                          <span className="text-muted-foreground">
                            {partialPct}% — {progress.partialDone.toLocaleString()} / {progress.partialTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${partialPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Batch counter */}
                    {progress.batchNum && progress.totalBatches && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {progress.phase === "absent" ? "Absent" : "Partial"} batch {progress.batchNum} of {progress.totalBatches}
                        </span>
                        <span>{totalDone.toLocaleString()} records processed</span>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                      <div>
                        <span className="text-muted-foreground">Absent users</span>
                        <p className="font-medium">{progress.absentTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Partial attendees</span>
                        <p className="font-medium">{progress.partialTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Committed</span>
                        <p className="font-medium">{totalDone.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining</span>
                        <p className="font-medium">{Math.max(0, totalUsers - totalDone).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                )}

              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────────────────── */}
        {isDone && progress && !isRunning && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Generation Complete
                </CardTitle>
                <CardDescription>
                  {progress.message || "All fine items have been written successfully."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Absent fines</span>
                    <p className="font-medium">{progress.absentDone.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Partial fines</span>
                    <p className="font-medium">{progress.partialDone.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total covered</span>
                    <p className="font-medium">{(progress.absentDone + progress.partialDone).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped (already fined)</span>
                    <p className="font-medium">{(progress.skippedAlreadyFined ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {isError && progress && (
          <div className="space-y-6 py-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Generation Interrupted
                </CardTitle>
                <CardDescription>{progress.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {totalUsers === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    The process stopped before writing new fine items. No duplicate charges were created.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Absent committed</span>
                      <p className="font-medium">{progress.absentDone.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Partial committed</span>
                      <p className="font-medium">{progress.partialDone.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total committed</span>
                      <p className="font-medium">{totalDone.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining</span>
                      <p className="font-medium text-red-600">
                        {Math.max(0, totalUsers - totalDone).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  You can safely click <strong>Resume Issuance</strong> once your connection stabilizes. Members who already received a fine for this event will be skipped automatically.
                </p>

              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            {!isDone ? "Cancel" : "Close"}
          </Button>
          {!isDone && (
            <div>
              {!isRunning ? (
                <Button onClick={handleIssuance} disabled={subscriptionTier === "basic" || !selected?.isActive}>
                  {canResume ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resume Issuance
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Issue Fines
                    </>
                  )}
                </Button>
              ) : (
                <Button disabled>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
