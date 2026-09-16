"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchThemeStockCorrelations } from "@/lib/themeQuantSidecars";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";

import styles from "./ThemeQuantPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

function cellColor(value: number | null): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  const intensity = Math.min(Math.abs(value), 1);
  if (value >= 0) return `rgba(38, 252, 214, ${0.08 + intensity * 0.35})`;
  return `rgba(240, 113, 120, ${0.08 + intensity * 0.35})`;
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
          <h2 className={styles.title}>
            Constituent correlations ({payload.window})
          </h2>
        </div>
        <p className={styles.hint} style={{ marginTop: 0, marginBottom: "0.55rem" }}>
          Top {payload.tickers.length} holdings by theme weight. Lazy-loaded; values are pairwise
          daily-return correlations.
        </p>
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
                      <td key={`${rowTicker}-${colTicker}`} style={{ background: cellColor(value) }}>
                        {value == null ? "—" : value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
