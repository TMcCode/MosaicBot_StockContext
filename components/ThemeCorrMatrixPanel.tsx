"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { themeHref } from "@/lib/links";
import {
  fetchThemeFactorAttribution,
  fetchThemeNeighbors,
  fetchThemeStockCorrelations,
} from "@/lib/themeQuantSidecars";
import type { ThemeFactorAttributionV0 } from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";
import type {
  ThemeNeighborRowV0,
  ThemeThemeNeighborsV0,
} from "@/lib/types/theme.theme_neighbors.v0";

import styles from "./ThemeQuantPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

type CorrPair = { a: string; b: string; value: number };

const COHESION_HORIZON = "1Y" as const;

function matrixDensity(tickerCount: number): "comfortable" | "compact" | "dense" {
  if (tickerCount >= 24) return "dense";
  if (tickerCount >= 16) return "compact";
  return "comfortable";
}

function cellColor(value: number | null): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const intensity = Math.min(Math.abs(value), 1);
  if (value >= 0) return `rgba(38, 252, 214, ${0.08 + intensity * 0.35})`;
  return `rgba(240, 113, 120, ${0.08 + intensity * 0.35})`;
}

function formatCorr(value: number): string {
  return value.toFixed(2);
}

function formatDecimal(value: number | undefined | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function percent(value: number | undefined | null, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function percentileLabel(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const mod100 = rounded % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : rounded % 10 === 1
        ? "st"
        : rounded % 10 === 2
          ? "nd"
          : rounded % 10 === 3
            ? "rd"
            : "th";
  return `${rounded}${suffix} percentile`;
}

function buildPairs(
  tickers: string[],
  matrix: Array<Array<number | null>>,
): CorrPair[] {
  const pairs: CorrPair[] = [];
  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const raw = matrix[i]?.[j] ?? matrix[j]?.[i];
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      pairs.push({ a: tickers[i], b: tickers[j], value: raw });
    }
  }
  return pairs;
}

function compactThemeParts(theme: string): { group?: string; primary: string } {
  const idx = theme.indexOf(": ");
  if (idx > 0 && idx < theme.length - 2) {
    return {
      group: theme.slice(0, idx).trim(),
      primary: theme.slice(idx + 2).trim() || theme,
    };
  }
  return { primary: theme };
}

function NeighborList({
  title,
  titleHint,
  rows,
  empty,
  showGroup,
}: {
  title: string;
  titleHint?: string;
  rows: ThemeNeighborRowV0[];
  empty: string;
  showGroup?: boolean;
}) {
  return (
    <div className={styles.neighborCard}>
      <h3 className={styles.colTitle} title={titleHint ? `${title}. ${titleHint}` : title}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className={styles.hint} style={{ marginTop: 0 }}>
          {empty}
        </p>
      ) : (
        <ul className={styles.neighborList}>
          {rows.map((row) => {
            const parts = compactThemeParts(row.theme);
            const tip = `${row.theme} · corr ${formatCorr(row.correlation)}${
              row.overlapping_ticker_count != null
                ? ` · ${row.overlapping_ticker_count} overlapping tickers`
                : ""
            }`;
            return (
              <li key={row.slug} title={tip}>
                <div className={styles.neighborMeta}>
                  {showGroup && parts.group ? (
                    <span className={styles.neighborGroup}>{parts.group}</span>
                  ) : null}
                  <Link href={themeHref(row.slug)} className={styles.tickerLink} title={tip}>
                    {parts.primary}
                  </Link>
                </div>
                <span className={styles.num}>{formatCorr(row.correlation)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ThemeCorrMatrixPanel({ slug, themeName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<ThemeStockCorrelationsV0 | null>(null);
  const [attribution, setAttribution] = useState<ThemeFactorAttributionV0 | null>(null);
  const [neighbors, setNeighbors] = useState<ThemeThemeNeighborsV0 | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchThemeStockCorrelations(slug, controller.signal),
      fetchThemeFactorAttribution(slug, controller.signal),
      fetchThemeNeighbors(slug, controller.signal),
    ])
      .then(([corr, attr, neigh]) => {
        if (controller.signal.aborted) return;
        setPayload(corr);
        setAttribution(attr);
        setNeighbors(neigh);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPayload(null);
          setAttribution(null);
          setNeighbors(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visible]);

  const cohesion = attribution?.cohesion?.[COHESION_HORIZON] ?? null;
  const asOf = attribution?.as_of || payload?.as_of || neighbors?.as_of;
  const sampleSize = attribution?.sample_size_1y;
  const tickers = useMemo(() => payload?.tickers.map((t) => t.ticker) ?? [], [payload]);

  const { topPairs, bottomPairs } = useMemo(() => {
    if (!payload || tickers.length < 2) {
      return { topPairs: [] as CorrPair[], bottomPairs: [] as CorrPair[] };
    }
    const sorted = buildPairs(tickers, payload.matrix).sort((a, b) => b.value - a.value);
    return {
      topPairs: sorted.slice(0, 5),
      bottomPairs: [...sorted].reverse().slice(0, 5),
    };
  }, [payload, tickers]);

  if (!visible) {
    return <div ref={hostRef} aria-hidden="true" />;
  }

  if (loading && !payload && !cohesion && !neighbors) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading correlation…</p>
        </section>
      </div>
    );
  }

  if (!payload && !cohesion && !neighbors) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section className={`card ${styles.panel}`} aria-label={`${themeName} correlation`}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Correlation & cohesion</div>
            {asOf ? (
              <div className={styles.asOf}>
                Through {asOf}
                {sampleSize != null && Number.isFinite(sampleSize)
                  ? ` · ${sampleSize} trading sessions`
                  : " · 1Y"}
              </div>
            ) : (
              <div className={styles.asOf}>1Y</div>
            )}
          </div>
        </div>

        {cohesion ? (
          <>
            <div className={styles.cohesionGrid}>
              <div
                className={styles.metricCard}
                title="Median correlation between each ticker and the weighted theme return after excluding that ticker from its comparator."
              >
                <span className={styles.metricLabel}>Median correlation</span>
                <span className={styles.metricValue}>
                  {formatDecimal(cohesion.median_correlation)}
                </span>
                {cohesion.global_percentile != null ? (
                  <span className={styles.metricContext}>
                    {percentileLabel(cohesion.global_percentile)} across all themes
                    {cohesion.group_rank != null && cohesion.group_theme_count != null ? (
                      <>
                        <br />#{cohesion.group_rank} of {cohesion.group_theme_count} within its
                        group
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div
                className={styles.metricCard}
                title="Median leave-one-out correlation after residualizing against the broad market."
              >
                <span className={styles.metricLabel}>Market-adjusted</span>
                <span className={styles.metricValue}>
                  {formatDecimal(cohesion.market_adjusted_median_correlation)}
                </span>
                {cohesion.market_adjusted_global_percentile != null ? (
                  <span className={styles.metricContext}>
                    {percentileLabel(cohesion.market_adjusted_global_percentile)} across all
                    themes
                    {cohesion.market_adjusted_group_rank != null &&
                    cohesion.market_adjusted_group_theme_count != null ? (
                      <>
                        <br />#{cohesion.market_adjusted_group_rank} of{" "}
                        {cohesion.market_adjusted_group_theme_count} within its group
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <div
                className={styles.metricCard}
                title="Share of valid constituents with leave-one-out theme correlation at or above 0.50."
              >
                <span className={styles.metricLabel}>Above 0.50</span>
                <span className={styles.metricValue}>{percent(cohesion.pct_above_0_50)}</span>
              </div>
              <div
                className={styles.metricCard}
                title="Share of valid constituents moving negatively vs their leave-one-out theme comparator."
              >
                <span className={styles.metricLabel}>Negative</span>
                <span className={styles.metricValue}>{percent(cohesion.pct_negative)}</span>
              </div>
              <div
                className={styles.metricCard}
                title="Average share of the 1Y window with overlapping valid returns. Data-confidence measure, not a quality score."
              >
                <span className={styles.metricLabel}>Fit coverage</span>
                <span className={styles.metricValue}>{percent(cohesion.coverage_pct)}</span>
              </div>
            </div>
          </>
        ) : null}

        {neighbors ? (
          <div style={{ marginTop: cohesion ? "0.35rem" : 0 }}>
            <h3 className={styles.colTitle}>Theme neighbors</h3>
            <div className={styles.neighborGrid}>
              <NeighborList
                title={
                  neighbors.group ? `Closest in ${neighbors.group}` : "Closest in group"
                }
                titleHint="Highest 1Y theme-return correlations with other themes in the same group."
                rows={neighbors.closest_in_group}
                empty="None"
              />
              <NeighborList
                title={
                  neighbors.group ? `Furthest in ${neighbors.group}` : "Furthest in group"
                }
                titleHint="Lowest 1Y theme-return correlations with other themes in the same group."
                rows={neighbors.furthest_in_group}
                empty="None"
              />
              <NeighborList
                title="Closest across all themes"
                titleHint="Highest 1Y theme-return correlations across all other themes (in-group and outside)."
                rows={neighbors.closest_across}
                empty="None"
                showGroup
              />
              <NeighborList
                title="Furthest outside"
                titleHint="Lowest 1Y correlations (closest to −1) with themes outside this group."
                rows={neighbors.furthest_outside}
                empty="None"
                showGroup
              />
            </div>
          </div>
        ) : null}

        {payload && tickers.length >= 2 ? (
          <div className={styles.matrixSection}>
            <details className={styles.matrixDetails} open>
              <summary
                className={styles.colTitle}
                title="Pairwise daily-return correlations among top holdings by theme weight."
              >
                Constituent correlation matrix
              </summary>
              <div
                className={styles.corrLayout}
                data-density={matrixDensity(tickers.length)}
              >
              <div className={styles.matrixScroll}>
                <table
                  className={styles.matrix}
                  data-density={matrixDensity(tickers.length)}
                >
                  <thead>
                    <tr>
                      <th scope="col" />
                      {tickers.map((ticker) => (
                        <th key={ticker} scope="col" title={ticker}>
                          {ticker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickers.map((rowTicker, i) => (
                      <tr key={rowTicker}>
                        <th scope="row" title={rowTicker}>
                          {rowTicker}
                        </th>
                        {tickers.map((colTicker, j) => {
                          const raw = payload.matrix[i]?.[j];
                          const value =
                            typeof raw === "number" && Number.isFinite(raw) ? raw : null;
                          const tip =
                            value == null
                              ? `${rowTicker} · ${colTicker}: n/a`
                              : `${rowTicker} · ${colTicker}: ${formatCorr(value)}`;
                          return (
                            <td
                              key={`${rowTicker}-${colTicker}`}
                              style={{ background: cellColor(value) }}
                              title={tip}
                            >
                              {value == null ? "—" : formatCorr(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <aside className={styles.corrSide}>
                <div className={styles.pairGrid}>
                  <div className={styles.pairBlock}>
                    <h3
                      className={styles.colTitle}
                      title="Most positively correlated ticker pairs among shown holdings (1Y)."
                    >
                      Closest pairs
                    </h3>
                    <ul className={styles.pairList}>
                      {topPairs.map((pair) => (
                        <li
                          key={`hi-${pair.a}-${pair.b}`}
                          title={`${pair.a} · ${pair.b}: ${formatCorr(pair.value)}`}
                        >
                          <span>
                            {pair.a} · {pair.b}
                          </span>
                          <span className={styles.num}>{formatCorr(pair.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.pairBlock}>
                    <h3
                      className={styles.colTitle}
                      title="Least correlated ticker pairs among shown holdings (1Y; closest to −1)."
                    >
                      Furthest pairs
                    </h3>
                    <ul className={styles.pairList}>
                      {bottomPairs.map((pair) => (
                        <li
                          key={`lo-${pair.a}-${pair.b}`}
                          title={`${pair.a} · ${pair.b}: ${formatCorr(pair.value)}`}
                        >
                          <span>
                            {pair.a} · {pair.b}
                          </span>
                          <span className={styles.num}>{formatCorr(pair.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
            </details>
          </div>
        ) : null}
      </section>
    </div>
  );
}
