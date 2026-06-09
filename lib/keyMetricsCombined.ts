import type { TableBody } from "./types";

export type MetricsCombinedColumn = {
  id: string;
  label: string;
  kind?: string;
  group?: "krm" | "rerating" | "results";
};

export type MetricsCombinedTableBody = TableBody & {
  format: "metrics_combined";
  meta?: {
    show_rerating?: boolean;
    show_results?: boolean;
    footer_bits?: string[];
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
