import { isFooterColumn, isRedundantDateColumn } from "@/lib/tableDisplay";
import type { TableBody } from "@/lib/types";

/** Combine Ticker_Overview + Ticker_DetailedOverview into one Overview section. */
export function mergeOverviewTableBodies(
  overview: TableBody | null,
  detailed: TableBody | null,
): TableBody | null {
  if (!overview && !detailed) {
    return null;
  }
  if (!detailed) {
    return overview;
  }
  if (!overview) {
    return {
      ...detailed,
      slug: "overview",
      display_name: "Overview",
    };
  }

  const detailRow = detailed.rows[0] ?? {};
  const overviewRow = overview.rows[0] ?? {};
  const mergedRow: Record<string, string> = { ...detailRow, ...overviewRow };

  const seen = new Set<string>();
  const columns = [...overview.columns];
  for (const col of overview.columns) {
    seen.add(col.id);
  }
  for (const col of detailed.columns) {
    if (seen.has(col.id) || isFooterColumn(col.id) || isRedundantDateColumn(col.id)) {
      continue;
    }
    columns.push(col);
    seen.add(col.id);
  }

  return {
    ...overview,
    slug: "overview",
    display_name: "Overview",
    columns,
    rows: [mergedRow],
  };
}
