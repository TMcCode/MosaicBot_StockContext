import type { TableBody } from "./types";

/** Internal / audit columns — hidden from main table body. */
export function isMetaColumn(id: string): boolean {
  return id.startsWith("_") || id === "ticker";
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
  if (label && label.toLowerCase() !== id.toLowerCase()) {
    return label;
  }
  if (/^Bull\d$/i.test(id)) return `Bull case ${id.replace(/\D/g, "")}`;
  if (/^Bear\d$/i.test(id)) return `Bear case ${id.replace(/\D/g, "")}`;
  return humanizeColumnId(id);
}

export function visibleDataColumns(body: TableBody) {
  return body.columns.filter((c) => !isFooterColumn(c.id));
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

export function isOverviewMetaColumn(id: string): boolean {
  return isFooterColumn(id) || /^lastupdated$/i.test(id) || id === "last_updated";
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
