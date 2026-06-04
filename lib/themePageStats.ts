import type { ThemeContentSummary } from "./types";

export type ThemePageStatsInput = {
  content?: ThemeContentSummary | null;
  /** Fallback when meta.content missing (pre-republish). */
  hasThesisFromTables?: boolean;
  themeSectionsReady: number;
  themeSectionsTotal: number;
};

/** Theme row: thesis, supplemental uploads, GCS text sections. */
export function formatThemeContentStats(input: ThemePageStatsInput): string {
  const hasThesis = input.content?.has_thesis ?? input.hasThesisFromTables ?? false;
  const uploads = input.content?.theme_upload_count ?? 0;
  const ready = input.content?.sections_ready ?? input.themeSectionsReady;
  const total = input.content?.sections_total ?? input.themeSectionsTotal;

  const parts: string[] = [hasThesis ? "thesis" : "no thesis"];
  if (uploads > 0) {
    parts.push(uploads === 1 ? "1 upload" : `${uploads} uploads`);
  }
  if (total > 0) {
    parts.push(`${ready}/${total} sections`);
  }
  return parts.join(" · ");
}

export function formatTickerCoverageStats(withNotes: number, pending: number): string {
  const parts: string[] = [];
  parts.push(withNotes === 1 ? "1 with notes" : `${withNotes} with notes`);
  if (pending > 0) {
    parts.push(pending === 1 ? "1 pending" : `${pending} pending`);
  }
  return parts.join(" · ");
}
