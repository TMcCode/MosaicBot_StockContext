"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import { TickerChartPeriodToolbar } from "@/components/TickerChartPeriodToolbar";
import { useSiteTheme } from "@/components/ThemeRoot";
import { fetchChartSidecar } from "@/lib/chart/chartSidecar";
import {
  applyChartTheme,
  applyIndexedBaselineTheme,
  attachIndexedBaseline,
  chartThemeOptions,
} from "@/lib/chart/chartTheme";
import {
  BENCHMARK_COLOR,
  CHART_PALETTE,
  TICKER_LINE_COLOR,
} from "@/lib/chart/palette";
import {
  chartCustomPeriodsFromManifest,
  chartPeriodWindowLabel,
  computeOverlaySupportedCustomPeriodKeys,
  computeOverlaySupportedPeriods,
  sliceBenchmarkForPeriod,
  type OverlayChartPeriod,
} from "@/lib/chart/periodControls";
import {
  referenceLastIsoFromPerformances,
  sliceAndRebaseIndexedPerformance,
} from "@/lib/chart/sliceIndexedChart";
import { fetchSpyBenchmarkPerformance } from "@/lib/chart/spyBenchmark";
import type { ChartPerformanceV0, ManifestSelectedDateV0 } from "@/lib/chart/types";

import styles from "./TickerChartPanel.module.css";

const BENCHMARK_ID = "__benchmark__";
const BENCHMARK_NAME = "S&P 500";
const INTEGER_PRICE_FORMAT = { type: "price" as const, precision: 0, minMove: 1 };

export type TickerThemeOption = {
  slug: string;
  name: string;
};

type Props = {
  symbol: string;
  companyName?: string;
  themes: TickerThemeOption[];
  selectedDates: ManifestSelectedDateV0[];
};

type ChartLine = {
  id: string;
  name: string;
  color: string;
  performance: ChartPerformanceV0;
  dotted?: boolean;
};

function toDay(d: string): string {
  const s = String(d || "").trim();
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return s;
  return new Date(t).toISOString().slice(0, 10);
}

function toPoints(dates: string[], values: number[]) {
  const n = Math.min(dates.length, values.length);
  const out: { time: string; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values[i]);
    if (!Number.isFinite(v)) continue;
    const time = toDay(dates[i]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) continue;
    out.push({ time, value: v });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

function lineDataValue(data: unknown): number | null {
  if (data && typeof data === "object" && "value" in data) {
    const v = Number((data as { value: unknown }).value);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

function formatTooltipDate(time: MouseEventParams["time"] | undefined): string {
  if (!time) return "";
  if (typeof time === "string") return time;
  if (typeof time === "number") {
    const d = new Date(time * 1000);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    const y = Number((time as { year: number }).year);
    const m = Number((time as { month: number }).month);
    const d = Number((time as { day: number }).day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function TickerPerformanceChart({
  symbol,
  companyName,
  themes,
  selectedDates,
}: Props) {
  const { theme } = useSiteTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [tickerPerf, setTickerPerf] = useState<ChartPerformanceV0 | null>(null);
  const [spyPerf, setSpyPerf] = useState<ChartPerformanceV0 | null>(null);
  const [themePerfBySlug, setThemePerfBySlug] = useState<Record<string, ChartPerformanceV0>>({});
  const [checkedSlugs, setCheckedSlugs] = useState<Set<string>>(() => new Set());
  const [loadingThemes, setLoadingThemes] = useState<Set<string>>(() => new Set());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indexedBaselineRef = useRef<IPriceLine | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const seriesApisRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const customPeriods = useMemo(
    () => chartCustomPeriodsFromManifest(selectedDates),
    [selectedDates],
  );

  const customAnchorIso = useMemo(() => {
    const hit = customPeriods.find((c) => c.key === period);
    return hit?.date;
  }, [customPeriods, period]);

  useEffect(() => {
    let stale = false;
    setLoadState("loading");
    Promise.all([fetchChartSidecar("ticker", symbol), fetchSpyBenchmarkPerformance()])
      .then(([tickerSidecar, spy]) => {
        if (stale) return;
        setTickerPerf(tickerSidecar?.performance ?? null);
        setSpyPerf(spy);
        setLoadState(tickerSidecar?.performance ? "ready" : "error");
      })
      .catch((e) => {
        if (stale) return;
        console.warn("[stockcontext] ticker chart load failed", e);
        setLoadState("error");
      });
    return () => {
      stale = true;
    };
  }, [symbol]);

  const themeColors = useMemo(() => {
    const map = new Map<string, string>();
    themes.forEach((t, i) => {
      map.set(t.slug, CHART_PALETTE[(i + 1) % CHART_PALETTE.length] ?? CHART_PALETTE[1]);
    });
    return map;
  }, [themes]);

  const toggleTheme = useCallback(
    async (slug: string, checked: boolean) => {
      setCheckedSlugs((prev) => {
        const next = new Set(prev);
        if (checked) next.add(slug);
        else next.delete(slug);
        return next;
      });
      if (!checked || themePerfBySlug[slug]) return;

      setLoadingThemes((prev) => new Set(prev).add(slug));
      try {
        const sidecar = await fetchChartSidecar("theme", slug);
        if (sidecar?.performance) {
          setThemePerfBySlug((prev) => ({ ...prev, [slug]: sidecar.performance }));
        }
      } finally {
        setLoadingThemes((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [themePerfBySlug],
  );

  const rawPerformances = useMemo(() => {
    const out: ChartPerformanceV0[] = [];
    if (tickerPerf) out.push(tickerPerf);
    for (const slug of checkedSlugs) {
      const perf = themePerfBySlug[slug];
      if (perf) out.push(perf);
    }
    return out;
  }, [tickerPerf, checkedSlugs, themePerfBySlug]);

  const referenceLastIso = useMemo(
    () => referenceLastIsoFromPerformances(rawPerformances),
    [rawPerformances],
  );

  const supportedPeriods = useMemo(
    () => computeOverlaySupportedPeriods(referenceLastIso, rawPerformances),
    [referenceLastIso, rawPerformances],
  );

  const supportedCustomPeriodKeys = useMemo(
    () => computeOverlaySupportedCustomPeriodKeys(rawPerformances, customPeriods),
    [rawPerformances, customPeriods],
  );

  useEffect(() => {
    if (!supportedPeriods.has(period as never) && !supportedCustomPeriodKeys.has(String(period))) {
      setPeriod("1Y");
    }
  }, [period, supportedPeriods, supportedCustomPeriodKeys]);

  const chartLines = useMemo((): ChartLine[] => {
    if (!tickerPerf) return [];
    const slicedTicker =
      sliceAndRebaseIndexedPerformance(tickerPerf, period, customAnchorIso, referenceLastIso) ??
      tickerPerf;
    const lines: ChartLine[] = [
      {
        id: symbol,
        name: symbol,
        color: TICKER_LINE_COLOR,
        performance: slicedTicker,
      },
    ];
    if (spyPerf) {
      const slicedSpy =
        sliceBenchmarkForPeriod(spyPerf, period, customAnchorIso, referenceLastIso) ?? spyPerf;
      lines.push({
        id: BENCHMARK_ID,
        name: BENCHMARK_NAME,
        color: BENCHMARK_COLOR,
        performance: slicedSpy,
        dotted: true,
      });
    }
    for (const slug of checkedSlugs) {
      const raw = themePerfBySlug[slug];
      const themeMeta = themes.find((t) => t.slug === slug);
      if (!raw || !themeMeta) continue;
      const sliced =
        sliceAndRebaseIndexedPerformance(raw, period, customAnchorIso, referenceLastIso) ?? raw;
      lines.push({
        id: slug,
        name: themeMeta.name,
        color: themeColors.get(slug) ?? CHART_PALETTE[1],
        performance: sliced,
      });
    }
    return lines;
  }, [
    tickerPerf,
    spyPerf,
    checkedSlugs,
    themePerfBySlug,
    themes,
    themeColors,
    period,
    customAnchorIso,
    referenceLastIso,
    symbol,
  ]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || loadState !== "ready" || chartLines.length === 0) return;

    seriesApisRef.current.clear();
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const width = Math.max(el.clientWidth, 320);
    const themeOpts = chartThemeOptions(themeRef.current);
    const chart = createChart(el, {
      autoSize: false,
      width,
      height: 340,
      ...themeOpts,
      layout: {
        ...themeOpts.layout,
        fontSize: 12,
        attributionLogo: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false },
      handleScroll: false,
      rightPriceScale: {
        ...themeOpts.rightPriceScale,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        ...themeOpts.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    type LineMeta = { id: string; name: string; color: string };
    const orderedLines: { api: ISeriesApi<"Line">; meta: LineMeta }[] = [];
    let baselineHost: ISeriesApi<"Line"> | undefined;
    indexedBaselineRef.current = null;

    chartLines.forEach((line) => {
      const pts = toPoints(line.performance.dates, line.performance.values.map(Number));
      if (pts.length < 2) return;
      const api = chart.addLineSeries({
        color: line.color,
        lineWidth: 2,
        lineStyle: line.dotted ? LineStyle.Dotted : LineStyle.Solid,
        title: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        priceFormat: INTEGER_PRICE_FORMAT,
      });
      api.setData(pts);
      seriesApisRef.current.set(line.id, api);
      orderedLines.push({ api, meta: { id: line.id, name: line.name, color: line.color } });
      if (!baselineHost) baselineHost = api;
    });

    if (baselineHost) {
      indexedBaselineRef.current = attachIndexedBaseline(baselineHost, themeRef.current);
    }

    const tooltip = tooltipRef.current;
    const onCrosshair = (param: MouseEventParams) => {
      if (!tooltip) return;
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltip.style.display = "none";
        return;
      }
      const date = formatTooltipDate(param.time);
      const rows: string[] = [];
      for (const { api, meta } of orderedLines) {
        const data = param.seriesData.get(api);
        const val = lineDataValue(data);
        if (val == null) continue;
        rows.push(
          `<span style="color:${meta.color}">${escapeHtml(meta.name)}</span>: ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        );
      }
      if (!rows.length) {
        tooltip.style.display = "none";
        return;
      }
      tooltip.innerHTML = `<div>${escapeHtml(date)}</div>${rows.join("<br/>")}`;
      tooltip.style.display = "block";
      const box = el.getBoundingClientRect();
      const left = Math.min(Math.max(param.point.x + 12, 8), box.width - 160);
      const top = Math.min(Math.max(param.point.y - 24, 8), 300);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    chart.subscribeCrosshairMove(onCrosshair);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      const next = Math.max(el.clientWidth, 320);
      chart.applyOptions({ width: next });
      chart.timeScale().fitContent();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.remove();
      chartRef.current = null;
      seriesApisRef.current.clear();
      indexedBaselineRef.current = null;
    };
  }, [chartLines, loadState]);

  useEffect(() => {
    const chart = chartRef.current;
    const baseline = indexedBaselineRef.current;
    if (!chart) return;
    applyChartTheme(chart, theme);
    if (baseline) applyIndexedBaselineTheme(baseline, theme);
  }, [theme]);

  const periodLabel = chartPeriodWindowLabel(period, customPeriods);
  const displayName = companyName && companyName !== symbol ? `${symbol}` : symbol;

  return (
    <section className={`card ${styles.section}`} aria-label={`${symbol} performance chart`}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleAccent}>{displayName}</span>
          <span className={styles.titleMuted}> vs. S&amp;P 500 Index Over {periodLabel}</span>
        </h2>
      </div>

      {themes.length > 0 ? (
        <div className={styles.themeOverlayRow} role="group" aria-label="Theme overlays">
          {themes.map((t) => {
            const checked = checkedSlugs.has(t.slug);
            const loading = loadingThemes.has(t.slug);
            const color = themeColors.get(t.slug) ?? CHART_PALETTE[1];
            return (
              <label
                key={t.slug}
                className={`${styles.themeOverlayLabel}${loading ? ` ${styles.themeOverlayLabelLoading}` : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading}
                  onChange={(e) => void toggleTheme(t.slug, e.target.checked)}
                />
                <span className={styles.themeSwatch} style={{ backgroundColor: color }} aria-hidden />
                <span>{t.name}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      <div className={styles.chartBox}>
        {loadState === "loading" ? (
          <div className={styles.loading} aria-busy="true">
            Loading chart…
          </div>
        ) : loadState === "error" || !tickerPerf ? (
          <div className={styles.empty}>Performance chart unavailable for this ticker.</div>
        ) : (
          <div className={styles.chartStage}>
            <div ref={wrapRef} className={styles.chartCanvas} />
            <div ref={tooltipRef} className={styles.chartTooltip} aria-hidden />
          </div>
        )}
      </div>

      {loadState === "ready" && tickerPerf ? (
        <div className={styles.periodBar}>
          <TickerChartPeriodToolbar
            period={period}
            onPeriodChange={setPeriod}
            supportedPeriods={supportedPeriods}
            supportedCustomPeriodKeys={supportedCustomPeriodKeys}
            customPeriods={customPeriods}
          />
        </div>
      ) : null}
    </section>
  );
}
