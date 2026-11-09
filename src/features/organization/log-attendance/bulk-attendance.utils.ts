import { attendanceModeLabel, bulkOutcomeLabels, isValidBulkStudentId, INVALID_BULK_STUDENT_ID_REASON } from "./bulk-attendance.types";
import type { AttendanceMode, BulkEntry, BulkResult } from "./bulk-attendance.types";

/** Parse CSV records before checking the single-column contract, including quoted newlines. */
export function parseAttendanceCSV(content: string): BulkEntry[] {
  const input = content.replace(/^\uFEFF/, "");
  const records: { row: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let value = "";
  let quoted = false;
  let closedQuote = false;
  let line = 1;
  let recordLine = 1;
  const finishCell = () => { cells.push(value); value = ""; closedQuote = false; };
  const finishRecord = () => {
    finishCell();
    if (cells.some((cell) => cell.trim() !== "") || cells.length > 1) records.push({ row: recordLine, cells });
    cells = [];
  };
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closedQuote = true; }
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && input[index + 1] === "\n") index++;
        value += "\n";
        line++;
      } else value += char;
      continue;
    }
    if (char === ",") { finishCell(); continue; }
    if (char === "\r" || char === "\n") {
      finishRecord();
      if (char === "\r" && input[index + 1] === "\n") index++;
      line++;
      recordLine = line;
      continue;
    }
    if (closedQuote) {
      if (char === " " || char === "\t") continue;
      throw new Error(`Malformed CSV near row ${line}: unexpected text after a closing quote.`);
    }
    if (char === '"') {
      if (value.length) throw new Error(`Malformed CSV near row ${line}: unexpected quote.`);
      quoted = true;
    } else value += char;
  }
  if (quoted) throw new Error("Malformed CSV: a quoted value was not closed.");
  finishRecord();
  if (!records.length) throw new Error("The CSV is empty. Download the template to get started.");
  const [header, ...rows] = records;
  if (header.cells.length !== 1 || header.cells[0].trim() !== "Student ID") {
    throw new Error('Use exactly one column with the header "Student ID".');
  }
  if (!rows.length) throw new Error("The CSV contains no student entries.");
  return rows.map(({ row, cells }) => {
    if (cells.length !== 1) throw new Error(`Row ${row} has extra columns. Use one Student ID column only.`);
    return { row, studentId: cells[0].trim() };
  });
}

export function prepareAttendanceEntries(entries: BulkEntry[]): { entries: BulkEntry[]; skipped: BulkResult[] } {
  const seen = new Set<string>();
  const valid: BulkEntry[] = [];
  const skipped: BulkResult[] = [];
  for (const entry of entries) {
    if (!isValidBulkStudentId(entry.studentId)) {
      skipped.push({ ...entry, outcome: "invalid_student_id", reason: INVALID_BULK_STUDENT_ID_REASON });
    } else if (seen.has(entry.studentId)) {
      skipped.push({ ...entry, outcome: "duplicate_in_file", reason: "Student ID already appears earlier in this file." });
    } else {
      seen.add(entry.studentId);
      valid.push(entry);
    }
  }
  return { entries: valid, skipped };
}

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function downloadCSV(filename: string, rows: (string | number)[][]): void {
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadAttendanceTemplate(): void {
  downloadCSV("special-attendance-template.csv", [["Student ID"]]);
}

export function describeAttendanceResult(result: BulkResult): string {
  if (result.outcome === "student_not_found") {
    return "Student ID could not be found. Check for typing errors or confirm registration in the platform. A recent transfer or program shift may explain an outdated or missing record.";
  }
  return result.reason;
}

export function downloadAttendanceReport(eventId: string, mode: AttendanceMode, results: BulkResult[]): void {
  downloadCSV(`special-attendance-${eventId.replace(/[^a-zA-Z0-9_-]/g, "_")}-${mode}.csv`, [
    ["CSV Row", "Student ID", "Attendance Type", "Outcome", "Reason"],
    ...results.map((result) => [result.row, result.studentId, attendanceModeLabel(mode), bulkOutcomeLabels[result.outcome], describeAttendanceResult(result)]),
  ]);
}
