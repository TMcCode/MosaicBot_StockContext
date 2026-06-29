import type { TableBody } from "./types";

/** Internal / audit columns — hidden from main table body. */
export function isMetaColumn(id: string): boolean {
  const norm = id.trim().toLowerCase().replace(/\s+/g, "");
  return id.startsWith("_") || id === "ticker" || norm === "is_change";
}

/** Shown in a small footer line under the section. */
export function isFooterColumn(id: string): boolean {
  return id === "Source" || isMetaColumn(id);
}

/** Turn HiringTrendWatchpoints / forum_watchlist into spaced title case. */
export function humanizeColumnId(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatColumnLabel(id: string, label: string): string {
  if (id === "DateAdded") return "Date";
  if (id === "TranscriptName") return "Transcript";
  if (label && label.toLowerCase() !== id.toLowerCase()) {
    return label;
  }
  if (/^Bull\d$/i.test(id)) return `Bull case ${id.replace(/\D/g, "")}`;
  if (/^Bear\d$/i.test(id)) return `Bear case ${id.replace(/\D/g, "")}`;
  return humanizeColumnId(id);
}

function isNotesTable(body: TableBody): boolean {
  return body.slug === "notes";
}

export function isTranscriptTidbitsTable(body: TableBody): boolean {
  return body.slug === "transcript-tidbits";
}

export function isEarningsTranscriptSummaryTable(body: TableBody): boolean {
  return body.slug === "earnings-transcript-summary";
}

export function isCollapsibleTranscriptRowsTable(body: TableBody): boolean {
  return isTranscriptTidbitsTable(body) || isEarningsTranscriptSummaryTable(body);
}

function isPerRowDateTable(body: TableBody): boolean {
  return (
    body.format === "multi_row" &&
    (isNotesTable(body) || isTranscriptTidbitsTable(body) || isEarningsTranscriptSummaryTable(body))
  );
}

/** Hide date columns that duplicate the section footer — except per-row dates on Notes / Tidbits. */
function isHiddenDateColumn(id: string, body: TableBody): boolean {
  if (!isRedundantDateColumn(id)) return false;
  if (isPerRowDateTable(body)) {
    const norm = id.trim().toLowerCase().replace(/\s+/g, "");
    if (norm === "dateadded" || norm === "date") return false;
  }
  return true;
}

/** Shown in the collapsible row summary — not in the inner table. */
export function isCollapsibleTranscriptMetaColumn(id: string): boolean {
  const norm = id.trim().toLowerCase().replace(/\s+/g, "");
  return norm === "date" || norm === "transcriptname";
}

/** Topic/content columns only (summary holds date + transcript name). */
export function sortCollapsibleTranscriptColumns<T extends { id: string }>(cols: T[]): T[] {
  return cols.filter((c) => !isCollapsibleTranscriptMetaColumn(c.id));
}

/** @deprecated Use sortCollapsibleTranscriptColumns */
export const sortTranscriptTidbitsColumns = sortCollapsibleTranscriptColumns;

export function transcriptRowDate(row: Record<string, string>): string {
  return formatCellValue("Date", row.Date ?? row.date ?? "");
}

/** @deprecated Use transcriptRowDate */
export const transcriptTidbitsRowDate = transcriptRowDate;

export function sortTranscriptRowsByDate(rows: Record<string, string>[]): Record<string, string>[] {
  return [...rows].sort((a, b) => transcriptRowDate(b).localeCompare(transcriptRowDate(a)));
}

/** @deprecated Use sortTranscriptRowsByDate */
export const sortTranscriptTidbitsRows = sortTranscriptRowsByDate;

export function visibleDataColumns(body: TableBody) {
  return body.columns.filter((c) => !isFooterColumn(c.id) && !isHiddenDateColumn(c.id, body));
}

export function bullBearGroups(body: TableBody) {
  const row = body.rows[0];
  if (!row) return null;
  const bulls = body.columns.filter((c) => /^Bull\d$/i.test(c.id) && row[c.id]?.trim());
  const bears = body.columns.filter((c) => /^Bear\d$/i.test(c.id) && row[c.id]?.trim());
  if (bulls.length === 0 && bears.length === 0) return null;
  return { bulls, bears, row };
}

export function isBullBearLayout(body: TableBody): boolean {
  return body.format === "single_row" && bullBearGroups(body) !== null;
}

export function primaryMarkdownColumn(body: TableBody) {
  return body.columns.find((c) => c.kind === "markdown" && !isFooterColumn(c.id));
}

/** ISO or "YYYY-MM-DD HH:MM:SS…" → date-only for display. */
export function formatDateOnly(value: string | undefined | null): string {
  const v = value?.trim() ?? "";
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return v.split(/\s/)[0] ?? v;
}

/** Date/metadata columns redundant with the section footer ``Updated …``. */
export function isRedundantDateColumn(id: string): boolean {
  const norm = id.trim().toLowerCase().replace(/\s+/g, "");
  return (
    norm === "date" ||
    norm === "dateadded" ||
    norm === "lastupdated" ||
    norm === "last_updated" ||
    norm === "thesisupdate" ||
    norm === "thesis_update" ||
    norm === "analysisdate"
  );
}

export function isOverviewMetaColumn(id: string): boolean {
  return isFooterColumn(id) || isRedundantDateColumn(id);
}

function footerDateFromRow(row: Record<string, string>): string {
  for (const id of [
    "_update_date",
    "Analysis Date",
    "DateAdded",
    "Date",
    "date",
    "last_updated",
    "LastUpdated",
  ]) {
    const val = formatCellValue(id, row[id] ?? "");
    if (val && val !== "False") return val;
  }
  return "";
}

/** ``Source · Updated YYYY-MM-DD`` line shown under single- and multi-row sections. */
export function tableFooterBits(body: TableBody): string[] {
  if (body.rows.length === 0) return [];

  if (body.format === "single_row") {
    const row = body.rows[0];
    const bits: string[] = [];
    for (const col of body.columns) {
      if (!isFooterColumn(col.id)) continue;
      const val = formatCellValue(col.id, row[col.id] ?? "");
      if (!val || val === "False") continue;
      if (col.id === "Source") bits.push(val);
      else if (col.id === "_update_date") bits.push(`Updated ${val}`);
    }
    return bits;
  }

  let source = "";
  let latestUpdate = "";
  for (const row of body.rows) {
    if (!source) {
      const src = formatCellValue("Source", row.Source ?? "");
      if (src && src !== "False") source = src;
    }
    const upd = footerDateFromRow(row);
    if (upd && (!latestUpdate || upd > latestUpdate)) latestUpdate = upd;
  }

  const bits: string[] = [];
  if (source) bits.push(source);
  if (latestUpdate) bits.push(`Updated ${latestUpdate}`);
  return bits;
}

export function formatCellValue(id: string, val: string): string {
  const v = val?.trim() ?? "";
  if (
    id.toLowerCase().includes("date") ||
    /^lastupdated$/i.test(id) ||
    id === "last_updated"
  ) {
    const dateOnly = formatDateOnly(v);
    if (dateOnly) return dateOnly;
  }
  if (v.includes("00:00:00")) {
    return v.replace(/\s00:00:00$/, "");
  }
  return v;
}

export function sentimentClass(sentiment: string | undefined): string {
  const s = (sentiment ?? "").toLowerCase();
  if (s.includes("bull")) return "badge badge-bull";
  if (s.includes("bear")) return "badge badge-bear";
  return "badge";
}

const TRANSCRIPT_TIDBITS_WIDE_COLUMNS = new Set([
  "about expanding eligible market",
  "where things are headed",
  "bullish-leaning quotes (short)",
  "bearish-leaning quotes (short)",
]);

function isTranscriptTidbitsWideColumn(columnId: string): boolean {
  return TRANSCRIPT_TIDBITS_WIDE_COLUMNS.has(columnId.trim().toLowerCase());
}

/** Width hints for multi-row research tables (catalysts, notes, metrics). */
export function tableColumnLayoutClass(columnId: string, body?: TableBody): string {
  const lower = columnId.toLowerCase();
  if (body && isCollapsibleTranscriptRowsTable(body)) {
    if (body && isTranscriptTidbitsTable(body) && isTranscriptTidbitsWideColumn(columnId)) {
      return "col-tidbit-wide";
    }
    return "col-tidbit";
  }
  if (
    lower === "whyitmatters" ||
    lower.includes("why_it") ||
    lower.includes("whyit") ||
    lower.includes("summary") ||
    lower.includes("description") ||
    lower === "note" ||
    lower.endsWith("notes")
  ) {
    return "col-wide";
  }
  if (lower === "catalyst" || lower.includes("catalyst")) {
    return "col-catalyst";
  }
  if (lower.includes("timing")) {
    return "col-timing";
  }
  if (
    /datestart|dateend|dateadded|^date$/i.test(lower) ||
    /mentions|sentiment|reaction|tier|source|catalystsource/i.test(lower) ||
    lower === "tickersorthemespecific"
  ) {
    return "col-narrow";
  }
  return "col-medium";
}
