"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchThemeStockCorrelations } from "@/lib/themeQuantSidecars";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";

import styles from "./ThemeQuantPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

type CorrPair = { a: string; b: string; value: number };
type PeerAvg = { ticker: string; avg: number; n: number };

function cellColor(value: number | null): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const intensity = Math.min(Math.abs(value), 1);
  if (value >= 0) return `rgba(38, 252, 214, ${0.08 + intensity * 0.35})`;
  return `rgba(240, 113, 120, ${0.08 + intensity * 0.35})`;
}

function formatCorr(value: number): string {
  return value.toFixed(2);
}

function buildPairsAndPeerAvgs(
  tickers: string[],
  matrix: Array<Array<number | null>>,
): { pairs: CorrPair[]; peerAvgs: PeerAvg[] } {
  const pairs: CorrPair[] = [];
  const sums = tickers.map(() => 0);
  const counts = tickers.map(() => 0);

  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const raw = matrix[i]?.[j] ?? matrix[j]?.[i];
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      pairs.push({ a: tickers[i], b: tickers[j], value: raw });
      sums[i] += raw;
      counts[i] += 1;
      sums[j] += raw;
      counts[j] += 1;
    }
  }

  const peerAvgs: PeerAvg[] = tickers
    .map((ticker, i) => ({
      ticker,
      avg: counts[i] > 0 ? sums[i] / counts[i] : Number.NaN,
      n: counts[i],
    }))
    .filter((row) => Number.isFinite(row.avg))
    .sort((a, b) => b.avg - a.avg);

  return { pairs, peerAvgs };
}

export function ThemeCorrMatrixPanel({ slug, themeName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<ThemeStockCorrelationsV0 | null>(null);
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
    fetchThemeStockCorrelations(slug, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPayload(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPayload(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visible]);

  const tickers = useMemo(() => payload?.tickers.map((t) => t.ticker) ?? [], [payload]);

  const { topPairs, bottomPairs, peerAvgs } = useMemo(() => {
    if (!payload || tickers.length < 2) {
      return { topPairs: [] as CorrPair[], bottomPairs: [] as CorrPair[], peerAvgs: [] as PeerAvg[] };
    }
    const { pairs, peerAvgs: avgs } = buildPairsAndPeerAvgs(tickers, payload.matrix);
    const sorted = [...pairs].sort((a, b) => b.value - a.value);
    return {
      topPairs: sorted.slice(0, 5),
      bottomPairs: [...sorted].reverse().slice(0, 5),
      peerAvgs: avgs,
    };
  }, [payload, tickers]);

  if (!visible) {
    return <div ref={hostRef} aria-hidden="true" />;
  }

  if (loading && !payload) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading correlation matrix…</p>
        </section>
      </div>
    );
  }

  if (!payload || tickers.length < 2) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section
        className={`card ${styles.panel}`}
        aria-label={`${themeName} constituent correlation matrix`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Constituent correlations ({payload.window})</h2>
        </div>
        <p className={styles.hint} style={{ marginTop: 0, marginBottom: "0.55rem" }}>
          Top {payload.tickers.length} holdings by theme weight. Pairwise daily-return
          correlations · teal = positive, red = negative.
        </p>

        <div className={styles.corrLayout}>
          <div className={styles.matrixScroll}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th scope="col" />
                  {tickers.map((ticker) => (
                    <th key={ticker} scope="col">
                      {ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickers.map((rowTicker, i) => (
                  <tr key={rowTicker}>
                    <th scope="row">{rowTicker}</th>
                    {tickers.map((colTicker, j) => {
                      const raw = payload.matrix[i]?.[j];
                      const value =
                        typeof raw === "number" && Number.isFinite(raw) ? raw : null;
                      return (
                        <td
                          key={`${rowTicker}-${colTicker}`}
                          style={{ background: cellColor(value) }}
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

          <aside className={styles.corrSide} aria-label="Correlation highlights">
            <div>
              <h3 className={styles.colTitle}>Highest pairs</h3>
              <ul className={styles.pairList}>
                {topPairs.map((pair) => (
                  <li key={`hi-${pair.a}-${pair.b}`}>
                    <span>
                      {pair.a} · {pair.b}
                    </span>
                    <span className={styles.num}>{formatCorr(pair.value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={styles.colTitle}>Lowest pairs</h3>
              <ul className={styles.pairList}>
                {bottomPairs.map((pair) => (
                  <li key={`lo-${pair.a}-${pair.b}`}>
                    <span>
                      {pair.a} · {pair.b}
                    </span>
                    <span className={styles.num}>{formatCorr(pair.value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={styles.colTitle}>Avg corr to peers</h3>
              <div className={styles.scroll} style={{ maxHeight: "9.5rem" }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Ticker</th>
                      <th scope="col">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peerAvgs.map((row) => (
                      <tr key={row.ticker}>
                        <td>{row.ticker}</td>
                        <td className={styles.num}>{formatCorr(row.avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
