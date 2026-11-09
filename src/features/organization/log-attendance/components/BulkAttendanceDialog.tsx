import { useId } from "react";
import { Upload, Download, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Event } from "../../events/types";
import { attendanceModeLabel } from "../bulk-attendance.types";
import type { AttendanceMode, BulkResult } from "../bulk-attendance.types";
import { describeAttendanceResult, downloadAttendanceReport, downloadAttendanceTemplate } from "../bulk-attendance.utils";
import { useBulkAttendance } from "../hooks/useBulkAttendance";
import { BulkAttendanceResults } from "./BulkAttendanceResultDialog";

export function BulkAttendanceDialog({ event, mode, onComplete }: { event: Event; mode: AttendanceMode; onComplete: () => void }) {
  const flow = useBulkAttendance(event.id, mode, onComplete);
  const inputId = useId();
  const checkboxId = useId();
  const label = attendanceModeLabel(mode);
  const candidates = flow.preview.filter((result) => result.outcome === "eligible" || result.outcome === "confirmation_required");
  const outside = candidates.filter((result) => result.outside);
  const progress = flow.progress;
  const percent = progress.total ? Math.floor(progress.finished / progress.total * 100) : 0;
  const recorded = progress.results.filter((result) => result.outcome === "recorded").length;
  const failed = progress.results.filter((result) => ["failed", "not_processed", "confirmation_required"].includes(result.outcome)).length;
  const skipped = progress.results.filter((result) => !["recorded", "eligible", "failed", "not_processed", "confirmation_required"].includes(result.outcome)).length;

  return <>
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-serif text-lg font-bold text-card-foreground">Import physical attendance</h2><p className="text-sm text-muted-foreground">Selected mode: <span className="font-semibold text-foreground">{label}</span>. Import check-in and check-out lists separately.</p></div>
      <Button variant="outline" onClick={() => flow.changeOpen(true)}><Upload className="size-4" />Bulk Attendance</Button>
    </div>
    <Dialog open={flow.open} onOpenChange={flow.changeOpen}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground sm:max-w-2xl" showCloseButton={!flow.busy}
        onEscapeKeyDown={(e) => { if (flow.busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (flow.busy) e.preventDefault(); }}>
        <DialogHeader className="border-b border-border p-5 pr-10">
          <DialogTitle className="font-serif text-xl">{flow.stage === "instructions" ? "Bulk attendance instructions" : flow.stage === "results" ? "Bulk attendance report" : flow.stage === "processing" ? "Recording attendance" : "Upload attendance CSV"}</DialogTitle>
          <DialogDescription className="break-words">{event.name} · <span className="font-semibold">{label}</span></DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          {flow.stage === "instructions" && <>
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4"><FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm">Transfer a physical attendance sheet into this completed event. This file records <strong>{label.toLowerCase()} only</strong>; use a separate import for the other mode.</p></div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Use exactly one column, headed <strong className="text-foreground">Student ID</strong>, with one ID per row.</li>
              <li>Use XX-1-XXXXX: two digits, -1-, then five digits (0–9 only), for example 24-1-00001. Keep IDs as text to preserve leading zeros.</li>
              <li>Students must already be registered in the platform. Missing IDs are skipped and listed in the report, not automatically registered.</li>
              <li>Students from another program/faculty require confirmation, consistent with manual attendance.</li>
              <li>Duplicate IDs and existing {label.toLowerCase()} timestamps are skipped. Avoid running another import or manual logging for these students at the same time.</li>
              <li>Keep this page open. Entries are batched and temporary read failures are retried. An unconfirmed write stops processing; inspect attendance before re-uploading.</li>
            </ol>
            <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 text-sm">{"Student ID\n24-1-00001\n24-1-00002"}</pre>
            <Button variant="outline" onClick={downloadAttendanceTemplate}><Download className="size-4" />Download Template</Button>
          </>}
          {(flow.stage === "upload" || flow.stage === "validating") && <>
            <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <Label htmlFor={inputId}>Attendance CSV</Label>
              <Input id={inputId} type="file" accept=".csv" disabled={flow.busy} aria-describedby={`${inputId}-help`} onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void flow.selectFile(file);
              }} />
              <p id={`${inputId}-help`} className="text-xs text-muted-foreground">One column: Student ID. Format: XX-1-XXXXX (digits 0–9; middle digit always 1). One ID per row. {label} only. No arbitrary student-count limit; large lists take longer to validate and process.</p>
              {flow.filename && <p className="break-all text-sm">Selected: {flow.filename}</p>}
              <Button variant="link" className="h-auto p-0" onClick={downloadAttendanceTemplate}>Download CSV template</Button>
            </div>
            {flow.stage === "validating" && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Validating entries in batches. No attendance is being written.</p>}
            {flow.preview.length > 0 && <>
              <p className="text-sm">{flow.preview.length.toLocaleString()} entries · <strong>{candidates.length.toLocaleString()} ready</strong> · {(flow.preview.length - candidates.length).toLocaleString()} skipped or unavailable</p>
              {outside.length > 0 && <div className="space-y-2 rounded-xl border border-border bg-accent/40 p-3 text-sm text-accent-foreground"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 shrink-0" />{outside.length} students outside your program/faculty</p><p>These students can be included after confirmation, with the same remarks as manual attendance.</p><p className="max-h-24 overflow-y-auto break-all text-xs">{outside.map((result) => result.studentId).join(", ")}</p></div>}
              <BulkPreview preview={flow.preview} eventId={event.id} mode={mode} />
              {candidates.length > 0 && <div className="flex items-start gap-3 rounded-xl border border-border p-3"><Checkbox id={checkboxId} className="mt-0.5" checked={flow.confirmed} disabled={flow.busy || Boolean(flow.error)} onCheckedChange={(value) => flow.setConfirmed(value === true)} /><Label htmlFor={checkboxId} className="text-sm leading-relaxed">I confirm this is the {label.toLowerCase()} list for {event.name}{outside.length ? ", including the listed students outside my program/faculty" : ""}. Existing timestamps will be preserved.</Label></div>}
              {!candidates.length && !flow.error && <p className="text-sm text-muted-foreground">No new attendance to record. Existing entries and other skipped rows are listed above. Select another file if needed.</p>}
            </>}
          </>}
          {flow.stage === "processing" && <div className="space-y-4" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin text-primary" />{progress.retrying ? "Checking connectivity / confirming attendance…" : "Recording attendance in batches…"}</p>
            <Progress value={percent} aria-label="Attendance import progress" />
            <p className="font-semibold">{progress.finished.toLocaleString()} / {progress.total.toLocaleString()} entries finished ({percent}%)</p>
            <p className="text-sm text-muted-foreground">Recorded: {recorded} · Skipped: {skipped} · Failed/unconfirmed: {failed}</p>
            <p className="text-sm text-muted-foreground">Batch {progress.batch} of {progress.batches}. Keep this page open. A finished entry may be recorded or skipped.</p>
          </div>}
          {flow.stage === "results" && <BulkAttendanceResults eventId={event.id} mode={mode} results={flow.results} />}
          {flow.error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{flow.error}</p>}
        </div>
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4">
          {!flow.busy && <Button variant="outline" onClick={() => flow.changeOpen(false)}>{flow.stage === "results" ? "Close" : "Cancel"}</Button>}
          {flow.stage === "instructions" && <Button onClick={() => flow.setStage("upload")}>Continue</Button>}
          {flow.stage === "upload" && <Button disabled={!flow.confirmed || !candidates.length || Boolean(flow.error)} onClick={() => { void flow.start(); }}>Start {label} Import</Button>}
          {flow.busy && <span className="text-sm text-muted-foreground">Please keep this page open</span>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function BulkPreview({ preview, eventId, mode }: { preview: BulkResult[]; eventId: string; mode: AttendanceMode }) {
  const exceptions = preview.filter((entry) => entry.outcome !== "eligible" && entry.outcome !== "confirmation_required");
  if (!exceptions.length) return null;
  return <details className="rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">Review {exceptions.length} skipped/unavailable entries</summary><div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{exceptions.slice(0, 100).map((entry) => <p key={entry.row} className="break-words text-muted-foreground">Row {entry.row} · {entry.studentId}: {describeAttendanceResult(entry)}</p>)}{exceptions.length > 100 && <p className="text-muted-foreground">Showing the first 100 entries. Download the full report after processing, or use the button below.</p>}</div><Button className="mt-3" variant="outline" size="sm" onClick={() => downloadAttendanceReport(eventId, mode, preview)}>Download validation report</Button></details>;
}

