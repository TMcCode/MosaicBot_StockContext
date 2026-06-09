import type { TableBody } from "./types";
import { formatCellValue, formatDateOnly, tableFooterBits } from "./tableDisplay";

export type MetricsBundle = {
  keyReported: TableBody;
  rerating: TableBody | null;
  earningsResults: TableBody | null;
};

export type CombinedMetricRow = {
  metric: string;
  lastPeriod: string;
  whyItMatters: string;
  rerating?: {
    whatsNeeded: string;
    whyItMatters: string;
    earningsDate: string;
  };
  earningsResult?: {
    actualReported: string;
    hitTarget: string;
    notes: string;
    resultDate: string;
  };
};

const METRIC_STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "for",
  "of",
  "a",
  "an",
  "y",
  "y/y",
  "growth",
  "ending",
  "arr",
  "collectively",
  "momentum",
  "next",
  "gen",
  "nextgen",
]);

export function normalizeMetric(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function metricTokens(value: string): Set<string> {
  const norm = normalizeMetric(value).replace(/[^a-z0-9%]+/g, " ");
  return new Set(
    norm
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t && !METRIC_STOPWORDS.has(t)),
  );
}

/** Same metric if normalized equal or high token overlap (naming variants). */
export function metricsMatch(a: string, b: string): boolean {
  if (normalizeMetric(a) === normalizeMetric(b)) return true;
  const ta = metricTokens(a);
  const tb = metricTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.min(ta.size, tb.size) >= 0.55;
}

function rowDate(row: Record<string, string>): string {
  return formatDateOnly(row.Date ?? row["Earnings Date"] ?? row.date ?? "");
}

function pickEarningsResultRow(
  candidates: Record<string, string>[],
  reratingEarningsDate: string,
): Record<string, string> | undefined {
  if (candidates.length === 0 || !reratingEarningsDate) return undefined;
  return candidates.find((row) => rowDate(row) === reratingEarningsDate);
}

function findEarningsCandidates(
  earningsByMetric: Map<string, Record<string, string>[]>,
  metric: string,
): Record<string, string>[] {
  const norm = normalizeMetric(metric);
  const exact = earningsByMetric.get(norm);
  if (exact?.length) return exact;

  for (const [key, rows] of earningsByMetric) {
    if (metricsMatch(key, metric)) return rows;
  }
  return [];
}

export function buildCombinedMetricRows(bundle: MetricsBundle): CombinedMetricRow[] {
  const reratingByMetric = new Map<string, Record<string, string>>();
  for (const row of bundle.rerating?.rows ?? []) {
    const key = normalizeMetric(row.Metric ?? "");
    if (key) reratingByMetric.set(key, row);
  }

  const earningsByMetric = new Map<string, Record<string, string>[]>();
  for (const row of bundle.earningsResults?.rows ?? []) {
    const key = normalizeMetric(row.Metric ?? "");
    if (!key) continue;
    const list = earningsByMetric.get(key) ?? [];
    list.push(row);
    earningsByMetric.set(key, list);
  }

  return bundle.keyReported.rows
    .map((krmRow) => {
      const metric = formatCellValue("Metric", krmRow.Metric ?? "");
      const norm = normalizeMetric(metric);
      if (!norm) return null;

      let reratingRow = reratingByMetric.get(norm);
      if (!reratingRow) {
        for (const [key, row] of reratingByMetric) {
          if (metricsMatch(key, metric)) {
            reratingRow = row;
            break;
          }
        }
      }

      const reratingEarningsDate = reratingRow
        ? formatDateOnly(reratingRow["Earnings Date"] ?? "")
        : "";

      const earningsCandidates = findEarningsCandidates(earningsByMetric, metric);
      const earningsRow = pickEarningsResultRow(earningsCandidates, reratingEarningsDate);

      const combined: CombinedMetricRow = {
        metric,
        lastPeriod: formatCellValue("Last Period", krmRow["Last Period"] ?? ""),
        whyItMatters: formatCellValue("Why It Matters", krmRow["Why It Matters"] ?? ""),
      };

      if (reratingRow) {
        combined.rerating = {
          whatsNeeded: formatCellValue(
            "What's Needed for Rerating",
            reratingRow["What's Needed for Rerating"] ?? "",
          ),
          whyItMatters: formatCellValue("Why It Matters", reratingRow["Why It Matters"] ?? ""),
          earningsDate: reratingEarningsDate,
        };
      }

      if (earningsRow) {
        combined.earningsResult = {
          actualReported: formatCellValue("Actual Reported", earningsRow["Actual Reported"] ?? ""),
          hitTarget: formatCellValue("Hit Target?", earningsRow["Hit Target?"] ?? ""),
          notes: formatCellValue("Notes", earningsRow.Notes ?? ""),
          resultDate: rowDate(earningsRow),
        };
      }

      return combined;
    })
    .filter((row): row is CombinedMetricRow => row != null);
}

export function combinedMetricsFooterBits(bundle: MetricsBundle): string[] {
  const bits = new Set<string>();
  for (const body of [bundle.keyReported, bundle.rerating, bundle.earningsResults]) {
    if (!body) continue;
    for (const bit of tableFooterBits(body)) bits.add(bit);
  }
  return [...bits];
}

export function hitTargetClass(value: string | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "yes" || v.startsWith("yes")) return "badge badge-bull";
  if (v === "no" || v.startsWith("no")) return "badge badge-bear";
  return "badge";
}

export const METRICS_COMBINE_HIDE_SLUGS = ["rerating-thresholds", "earnings-results"] as const;

export const COMBINED_METRICS_DISPLAY_NAME =
  "Key Reported Metrics, Reratings Triggers & Results";
