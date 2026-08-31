import type { ManifestSelectedDateV0 } from "@/lib/chart/types";

export type ChartSelectedDatesV0 = {
  schema_version: number;
  as_of?: string;
  source?: string;
  selected_dates: ManifestSelectedDateV0[];
};

/** Relative path under stockcontext CDN / build cache. */
export const CHART_SELECTED_DATES_REL = "chart/selected_dates.v0.json";

export function normalizeChartSelectedDates(
  raw: ChartSelectedDatesV0 | null | undefined,
): ManifestSelectedDateV0[] {
  if (!Array.isArray(raw?.selected_dates)) return [];
  return raw.selected_dates.filter(
    (row) => String(row.day_name || "").trim() && String(row.date || "").trim(),
  );
}
