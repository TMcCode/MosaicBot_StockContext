import type { TableBody } from "./types";

export type MetricsCombinedColumn = {
  id: string;
  label: string;
  kind?: string;
  group?: "krm" | "rerating" | "results";
};

export type MetricsCombinedBlock = {
  role?: string;
  label?: string;
  event_date?: string;
  show_rerating?: boolean;
  show_results?: boolean;
  columns?: MetricsCombinedColumn[];
  rows: Array<Record<string, string>>;
};

export type MetricsCombinedTableBody = TableBody & {
  format: "metrics_combined";
  meta?: {
    show_rerating?: boolean;
    show_results?: boolean;
    footer_bits?: string[];
    blocks?: MetricsCombinedBlock[];
    history_event_dates?: string[];
    is_history?: boolean;
  };
};

export function isMetricsCombinedTable(body: TableBody): body is MetricsCombinedTableBody {
  return body.format === "metrics_combined";
}

export function hitTargetClass(value: string | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "yes" || v.startsWith("yes")) return "badge badge-bull";
  if (v === "no" || v.startsWith("no")) return "badge badge-bear";
  return "badge";
}

/** Prefer dual blocks when present; else synthesize one block from top-level rows. */
export function metricsCombinedBlocks(body: MetricsCombinedTableBody): MetricsCombinedBlock[] {
  const blocks = body.meta?.blocks;
  if (blocks && blocks.length > 0) return blocks;
  return [
    {
      role: "legacy",
      label: body.display_name || "Key reported metrics",
      show_rerating: body.meta?.show_rerating,
      show_results: body.meta?.show_results,
      columns: body.columns as MetricsCombinedColumn[] | undefined,
      rows: (body.rows || []) as Array<Record<string, string>>,
    },
  ];
}
