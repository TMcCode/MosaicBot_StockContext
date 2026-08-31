import type { ChartPerformanceV0, ManifestSelectedDateV0 } from "@/lib/chart/types";
import {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  sliceAndRebaseIndexedPerformance,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/chart/sliceIndexedChart";

export const DETAIL_CHART_STANDARD_PERIODS: OverlayStandardPeriod[] = [
  "1W",
  "1M",
  "YTD",
  "1Y",
  "2Y",
  "5Y",
];

export function normalizeChartEventKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export type ChartCustomPeriod = { key: string; label: string; date: string };

export function chartCustomPeriodsFromManifest(
  selectedDates: ManifestSelectedDateV0[] | undefined,
): ChartCustomPeriod[] {
  const rows = selectedDates ?? [];
  return rows
    .map((r) => {
      const key = normalizeChartEventKey(String(r.day_name || ""));
      const date = String(r.date || "").trim().slice(0, 10);
      if (!key || !date) return null;
      return { key, label: String(r.day_name || key), date };
    })
    .filter((x): x is ChartCustomPeriod => Boolean(x));
}

export function chartPeriodWindowLabel(
  period: OverlayChartPeriod,
  customPeriods: ChartCustomPeriod[],
): string {
  if (period === "1W") return "the Past Week";
  if (period === "1M") return "the Past Month";
  if (period === "YTD") return "Year to Date";
  if (period === "1Y") return "the Past Year";
  if (period === "2Y") return "the Past 2 Years";
  if (period === "5Y") return "the Past 5 Years";
  const custom = customPeriods.find((c) => c.key === period);
  if (custom) return `Since ${custom.label}`;
  return "the Selected Period";
}

export function sliceBenchmarkForPeriod(
  benchmark: ChartPerformanceV0 | undefined,
  period: OverlayChartPeriod,
  customAnchorIso: string | undefined,
  referenceLastIso: string | undefined,
): ChartPerformanceV0 | undefined {
  if (!benchmark?.dates?.length || !benchmark?.values?.length) return benchmark;
  return (
    sliceAndRebaseIndexedPerformance(benchmark, period, customAnchorIso, referenceLastIso) ??
    benchmark
  );
}

export {
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
};
