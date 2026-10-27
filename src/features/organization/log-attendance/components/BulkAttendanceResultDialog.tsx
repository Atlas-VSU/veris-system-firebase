import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { attendanceModeLabel, bulkOutcomeLabels } from "../bulk-attendance.types";
import type { AttendanceMode, BulkResult } from "../bulk-attendance.types";
import { describeAttendanceResult, downloadAttendanceReport } from "../bulk-attendance.utils";

export function BulkAttendanceResults({ eventId, mode, results }: { eventId: string; mode: AttendanceMode; results: BulkResult[] }) {
  const [page, setPage] = useState(0);
  const details = results.filter((result) => result.outcome !== "recorded");
  const pages = Math.max(1, Math.ceil(details.length / 25));
  const recorded = results.filter((result) => result.outcome === "recorded").length;
  const already = results.filter((result) => result.outcome === "already_recorded").length;
  const unresolved = results.filter((result) => result.outcome === "not_processed").length;
  const failed = results.filter((result) => ["failed", "student_not_found", "ambiguous_student_id", "invalid_student_id", "confirmation_required"].includes(result.outcome)).length;
  const duplicates = results.filter((result) => result.outcome === "duplicate_in_file").length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" role="status">
        {unresolved ? "Import interrupted. Some entries were not processed or could not be confirmed." : "Processing complete. Review skipped and unsuccessful entries below."}
        {" "}{results.length.toLocaleString()} entries · {attendanceModeLabel(mode)}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[["Newly recorded", recorded], ["Already recorded", already], ["Duplicates", duplicates], ["Unsuccessful", failed], ["Unconfirmed / pending", unresolved]].map(([label, count]) => (
          <div key={label} className="rounded-xl border border-border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold text-foreground">{Number(count).toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {unresolved > 0 && <p className="rounded-xl border border-border bg-accent/40 p-3 text-sm text-accent-foreground">Keep this report. Reconnect and inspect attendance before re-uploading: a pending Firebase write may still complete. Avoid simultaneous imports or manual logging for the same students. Leaving this page stops further submissions, not writes already submitted.</p>}
      <Button variant="outline" onClick={() => downloadAttendanceReport(eventId, mode, results)}><Download className="size-4" />Download Report</Button>
      {details.length > 0 && <>
        <div className="space-y-2" aria-label="Skipped and unsuccessful entries">
          {details.slice(page * 25, (page + 1) * 25).map((result) => (
            <div key={result.row} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 font-medium">
                <span className="break-all">Row {result.row}: {result.studentId || "(empty ID)"}</span>
                <span className={result.outcome === "already_recorded" || result.outcome === "duplicate_in_file" ? "text-muted-foreground" : "text-destructive"}>{bulkOutcomeLabels[result.outcome]}</span>
              </div>
              <p className="mt-1 break-words text-muted-foreground">{describeAttendanceResult(result)}</p>
            </div>
          ))}
        </div>
        {pages > 1 && <div className="flex items-center justify-between gap-2 text-sm"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {pages}</span><Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
      </>}
    </div>
  );
}
