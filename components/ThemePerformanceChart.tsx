"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { fetchThemeCompositionIndexed } from "@/lib/chart/fetchThemeComposition";
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
import type {
  ChartCompositionIndexedV0,
  ChartPerformanceV0,
  ManifestSelectedDateV0,
} from "@/lib/chart/types";
import type { ThemeConstituent } from "@/lib/types";

import styles from "./TickerChartPanel.module.css";

const BENCHMARK_ID = "__benchmark__";
const BENCHMARK_NAME = "S&P 500";
const INTEGER_PRICE_FORMAT = { type: "price" as const, precision: 0, minMove: 1 };
const MAX_COMPOSITION_SERIES = 12;

type ChartMode = "performance" | "composition";

type Props = {
  slug: string;
  themeName: string;
  constituents: ThemeConstituent[];
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

function pickCompositionSeries(
  composition: ChartCompositionIndexedV0 | null,
  constituents: ThemeConstituent[],
): ChartCompositionIndexedV0["series"] {
  if (!composition?.series?.length) return [];
  const weightByTicker = new Map<string, number>();
  for (const c of constituents) {
    const sym = String(c.symbol || "")
      .trim()
      .toUpperCase();
    if (!sym) continue;
    weightByTicker.set(sym, Number(c.portfolio_weight) || 0);
  }
  return [...composition.series]
    .sort((a, b) => {
      const wa = weightByTicker.get(a.ticker) ?? 0;
      const wb = weightByTicker.get(b.ticker) ?? 0;
      if (wb !== wa) return wb - wa;
      return a.ticker.localeCompare(b.ticker);
    })
    .slice(0, MAX_COMPOSITION_SERIES);
}

export function ThemePerformanceChart({
  slug,
  themeName,
  constituents,
  selectedDates,
}: Props) {
  const { theme } = useSiteTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [mode, setMode] = useState<ChartMode>("performance");
  const [period, setPeriod] = useState<OverlayChartPeriod>("1Y");
  const [themePerf, setThemePerf] = useState<ChartPerformanceV0 | null>(null);
  const [spyPerf, setSpyPerf] = useState<ChartPerformanceV0 | null>(null);
  const [composition, setComposition] = useState<ChartCompositionIndexedV0 | null>(null);
  const [compositionState, setCompositionState] = useState<
    "idle" | "loading" | "ready" | "missing"
  >("idle");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const compositionFetchSlugRef = useRef<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const indexedBaselineRef = useRef<IPriceLine | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

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
    setComposition(null);
    setCompositionState("idle");
    setMode("performance");
    compositionFetchSlugRef.current = null;
    Promise.all([fetchChartSidecar("theme", slug), fetchSpyBenchmarkPerformance()])
      .then(([themeSidecar, spy]) => {
        if (stale) return;
        setThemePerf(themeSidecar?.performance ?? null);
        setSpyPerf(spy);
        setLoadState(themeSidecar?.performance ? "ready" : "error");
      })
      .catch((e) => {
        if (stale) return;
        console.warn("[stockcontext] theme chart load failed", e);
        setLoadState("error");
      });
    return () => {
      stale = true;
    };
  }, [slug]);

  useEffect(() => {
    if (mode !== "composition") return;
    if (compositionFetchSlugRef.current === slug) return;

    let stale = false;
    setCompositionState("loading");
    fetchThemeCompositionIndexed(slug)
      .then((comp) => {
        if (stale) return;
        compositionFetchSlugRef.current = slug;
        if (comp?.series?.length) {
          setComposition(comp);
          setCompositionState("ready");
        } else {
          setComposition(null);
          setCompositionState("missing");
        }
      })
      .catch(() => {
        if (stale) return;
        compositionFetchSlugRef.current = slug;
        setComposition(null);
        setCompositionState("missing");
      });
    return () => {
      stale = true;
    };
  }, [mode, slug]);

  const compositionSeries = useMemo(
    () => pickCompositionSeries(composition, constituents),
    [composition, constituents],
  );

  const rawPerformances = useMemo(() => {
    if (mode === "composition") {
      return compositionSeries.map((s) => ({
        dates: s.dates,
        values: s.values,
      }));
    }
    return themePerf ? [themePerf] : [];
  }, [mode, themePerf, compositionSeries]);

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
    if (mode === "composition") {
      return compositionSeries.map((s, i) => {
        const raw: ChartPerformanceV0 = { dates: s.dates, values: s.values };
        const sliced =
          sliceAndRebaseIndexedPerformance(raw, period, customAnchorIso, referenceLastIso) ?? raw;
        return {
          id: s.ticker,
          name: s.ticker,
          color: CHART_PALETTE[i % CHART_PALETTE.length] ?? TICKER_LINE_COLOR,
          performance: sliced,
        };
      });
    }
    if (!themePerf) return [];
    const slicedTheme =
      sliceAndRebaseIndexedPerformance(themePerf, period, customAnchorIso, referenceLastIso) ??
      themePerf;
    const lines: ChartLine[] = [
      {
        id: slug,
        name: themeName,
        color: TICKER_LINE_COLOR,
        performance: slicedTheme,
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
    return lines;
  }, [
    mode,
    compositionSeries,
    themePerf,
    spyPerf,
    slug,
    themeName,
    period,
    customAnchorIso,
    referenceLastIso,
  ]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || loadState !== "ready" || chartLines.length === 0) return;

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
  const titlePrimary = mode === "composition" ? "Composition" : themeName;
  const titleRest =
    mode === "composition"
      ? ` · top holdings indexed · ${periodLabel}`
      : ` vs. S&P 500 Index Over ${periodLabel}`;

  const showCompositionLoading = mode === "composition" && compositionState === "loading";
  const showCompositionMissing =
    mode === "composition" && compositionState === "missing" && compositionSeries.length === 0;
  const showChart =
    loadState === "ready" &&
    chartLines.length > 0 &&
    !showCompositionLoading &&
    !showCompositionMissing;

  return (
    <section className={`card ${styles.section}`} aria-label={`${themeName} performance chart`}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleAccent}>{titlePrimary}</span>
          <span className={styles.titleMuted}>{titleRest}</span>
        </h2>
      </div>

      <div className={styles.themeOverlayRow} role="group" aria-label="Chart mode">
        <button
          type="button"
          className={`${styles.periodBtn} ${mode === "performance" ? styles.periodBtnActive : ""}`}
          aria-pressed={mode === "performance"}
          onClick={() => setMode("performance")}
        >
          Performance
        </button>
        <button
          type="button"
          className={`${styles.periodBtn} ${mode === "composition" ? styles.periodBtnActive : ""}`}
          aria-pressed={mode === "composition"}
          disabled={loadState !== "ready"}
          onClick={() => setMode("composition")}
        >
          Composition
        </button>
      </div>

      <div className={styles.chartBox}>
        {loadState === "loading" ? (
          <div className={styles.loading} aria-busy="true">
            Loading chart…
          </div>
        ) : loadState === "error" ? (
          <div className={styles.empty}>Performance chart unavailable for this theme.</div>
        ) : showCompositionLoading ? (
          <div className={styles.loading} aria-busy="true">
            Loading composition…
          </div>
        ) : showCompositionMissing ? (
          <div className={styles.empty}>Composition series not available for this theme.</div>
        ) : showChart ? (
          <div className={styles.chartStage}>
            <div ref={wrapRef} className={styles.chartCanvas} />
            <div ref={tooltipRef} className={styles.chartTooltip} aria-hidden />
          </div>
        ) : (
          <div className={styles.empty}>Performance chart unavailable for this theme.</div>
        )}
      </div>

      {showChart ? (
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
