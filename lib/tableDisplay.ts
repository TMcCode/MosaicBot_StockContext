import type { TableBody } from "./types";

/** Internal / audit columns — hidden from main table body. */
export function isMetaColumn(id: string): boolean {
  return id.startsWith("_") || id === "ticker";
}

/** Shown in a small footer line under the section. */
export function isFooterColumn(id: string): boolean {
  return id === "Source" || isMetaColumn(id);
}

export function formatColumnLabel(id: string, label: string): string {
  if (label && label.toLowerCase() !== id.toLowerCase()) {
    return label;
  }
  if (/^Bull\d$/i.test(id)) return `Bull case ${id.replace(/\D/g, "")}`;
  if (/^Bear\d$/i.test(id)) return `Bear case ${id.replace(/\D/g, "")}`;
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

export function formatCellValue(id: string, val: string): string {
  const v = val?.trim() ?? "";
  if (id.toLowerCase().includes("date") && v.includes("00:00:00")) {
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
