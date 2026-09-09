"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  OnSeedProgress,
  SeedProgress,
  SeedRunner,
} from "@/features/organization/shared/types";

interface UseRecordInitializationOptions {
  seed: SeedRunner;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function useRecordInitialization({
  seed,
  successMessage,
  errorMessage,
  onSuccess,
  onOpenChange,
}: UseRecordInitializationOptions) {
  const [progress, setProgress] = useState<SeedProgress | null>(null);

  const isRunning = progress?.phase === "preflight" || progress?.phase === "writing";
  const isDone = progress?.phase === "done";
  const isError = progress?.phase === "error";

  const percent = useMemo(() => {
    if (!progress?.totalUsers) return 0;
    return Math.round((progress.committed / progress.totalUsers) * 100);
  }, [progress]);

  const start = useCallback(async () => {
    if (isRunning) return;

    setProgress({
      phase: "preflight",
      message: "Preparing…",
      committed: 0,
      totalUsers: 0,
    });

    // Tracked alongside state because `setProgress` is async: the settle step
    // below needs the seeder's LAST report, not the render-time snapshot.
    const tracker: { last: SeedProgress | null } = { last: null };
    const report: OnSeedProgress = (update) => {
      tracker.last = update;
      setProgress(update);
    };

    /** Counts from the seeder's last report, or zeroes if it never reported. */
    const counts = () => ({
      committed: tracker.last?.committed ?? 0,
      totalUsers: tracker.last?.totalUsers ?? 0,
    });

    try {
      const outcome = await seed(report);

      if (outcome && outcome.success === false) {
        setProgress({
          phase: "error",
          message: outcome.message ?? errorMessage ?? "Initialization failed.",
          ...counts(),
        });
        if (errorMessage) toast.error(errorMessage);
        return;
      }

      // A seeder that already reported a terminal phase keeps its own wording
      // and counts; one that reported nothing gets a generic completion.
      const reported = tracker.last;
      const settled: SeedProgress =
        reported && (reported.phase === "done" || reported.phase === "error")
          ? reported
          : {
              phase: "done",
              message: successMessage ?? "Initialization complete.",
              ...counts(),
            };

      setProgress(settled);
      if (settled.phase === "done" && successMessage) toast.success(successMessage);
      if (settled.phase === "error" && errorMessage) toast.error(errorMessage);
    } catch (error) {
      console.error("[useRecordInitialization] seeding failed", error);
      setProgress({
        phase: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        ...counts(),
      });
      if (errorMessage) toast.error(errorMessage);
    }
  }, [seed, isRunning, successMessage, errorMessage]);

  /**
   * Closes the dialog and resets, so the next open starts from idle rather
   * than showing the previous run's result. 
   */
  const close = useCallback(() => {
    if (isRunning) return;
    if (isDone) onSuccess?.();
    setProgress(null);
    onOpenChange?.(false);
  }, [isRunning, isDone, onSuccess, onOpenChange]);

  return { progress, isRunning, isDone, isError, percent, start, close };
}
