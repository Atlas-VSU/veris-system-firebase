import { useEffect, useRef, useState } from "react";
import { applyBulkAttendance, validateBulkAttendance } from "@/firebase/bulkAttendance";
import type { AttendanceMode, BulkProgress, BulkResult } from "../bulk-attendance.types";
import { parseAttendanceCSV, prepareAttendanceEntries } from "../bulk-attendance.utils";

type Stage = "instructions" | "upload" | "validating" | "processing" | "results";
const emptyProgress: BulkProgress = { finished: 0, total: 0, batch: 0, batches: 0, retrying: false, results: [] };
const sortRows = (results: BulkResult[]) => [...results].sort((a, b) => a.row - b.row);

export function useBulkAttendance(eventId: string, mode: AttendanceMode, onComplete: () => void) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("instructions");
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<BulkResult[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>(emptyProgress);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
  }, []);
  const busy = stage === "processing" || stage === "validating";

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const changeOpen = (next: boolean) => {
    if (busyRef.current) return;
    generation.current++;
    setOpen(next);
    if (next) {
      setStage("instructions"); setFilename(""); setError(""); setPreview([]);
      setResults([]); setConfirmed(false); setProgress(emptyProgress);
    }
  };

  const selectFile = async (file?: File) => {
    if (busyRef.current) return;
    const current = ++generation.current;
    setFilename(file?.name ?? ""); setError(""); setPreview([]); setConfirmed(false);
    if (!file) return;
    busyRef.current = true;
    controller.current = new AbortController();
    setStage("validating");
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Please select a .csv file.");
      const prepared = prepareAttendanceEntries(parseAttendanceCSV(await file.text()));
      const validated = prepared.entries.length ? await validateBulkAttendance(eventId, mode, prepared.entries, controller.current.signal) : [];
      if (current !== generation.current) return;
      const combined = sortRows([...prepared.skipped, ...validated]);
      setPreview(combined);
      if (combined.some((result) => result.outcome === "not_processed")) {
        setError("Validation was interrupted. Select the file again after checking your connection and event eligibility. No attendance was written during validation.");
      }
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught.message : "Unable to validate this file.");
    } finally {
      busyRef.current = false;
      if (current === generation.current) setStage("upload");
    }
  };

  const start = async () => {
    const candidates = preview.filter((result) => result.outcome === "eligible" || result.outcome === "confirmation_required");
    if (busyRef.current || error || !confirmed || !candidates.length) return;
    busyRef.current = true;
    const current = generation.current;
    controller.current = new AbortController();
    setStage("processing");
    setError("");
    const skipped = preview.filter((result) => result.outcome !== "eligible" && result.outcome !== "confirmation_required");
    setProgress({ ...emptyProgress, total: preview.length, finished: skipped.length, results: skipped });
    try {
      const applied = await applyBulkAttendance(eventId, mode, candidates.map(({ row, studentId }) => ({ row, studentId })), candidates.some((result) => result.outside), (next) => {
        if (current === generation.current) setProgress({ ...next, total: preview.length, finished: skipped.length + next.finished, results: sortRows([...skipped, ...next.results]) });
      }, controller.current.signal);
      if (current !== generation.current) return;
      setResults(sortRows([...skipped, ...applied]));
    } catch (caught) {
      if (current !== generation.current) return;
      setError(caught instanceof Error ? caught.message : "Import interrupted.");
      setResults(sortRows([...skipped, ...candidates.map((entry): BulkResult => ({ ...entry, outcome: "not_processed", reason: "Import interrupted; this entry is unconfirmed. Reconnect and inspect attendance before re-uploading; pending writes may still complete." }))]));
    } finally {
      busyRef.current = false;
      if (current === generation.current) {
        setStage("results");
        onComplete();
      }
    }
  };

  return { open, changeOpen, stage, setStage, filename, error, preview, results, confirmed, setConfirmed, progress, busy, selectFile, start };
}
