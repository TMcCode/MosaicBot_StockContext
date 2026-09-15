"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { themeHref } from "@/lib/links";
import { fetchTickerThemeContext } from "@/lib/tickerThemeContext";
import { themeHasPublishedPage } from "@/lib/themePage";
import type { Manifest } from "@/lib/types";
import type {
  TickerThemeContextFitV0,
  TickerThemeContextThemeV0,
  TickerThemeContextV0,
} from "@/lib/types/ticker.theme_context.v0";

import styles from "./TickerThemeContextPanel.module.css";

const HORIZON_ORDER = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "10Y"] as const;

type Props = {
  symbol: string;
  manifest?: Manifest | null;
};

function formatDecimal(value: number | undefined | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatShare(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function fitForHorizon(
  theme: TickerThemeContextThemeV0,
  horizon: string,
): TickerThemeContextFitV0 | null {
  return theme.fit_by_horizon?.[horizon] ?? null;
}

function ThemeName({
  theme,
  slug,
  manifest,
}: {
  theme: string;
  slug: string;
  manifest?: Manifest | null;
}) {
  const entry = manifest?.themes?.find((t) => t.slug === slug || t.name === theme);
  if (entry && themeHasPublishedPage(entry)) {
    return (
      <Link href={themeHref(entry.slug)} className={styles.themeLink}>
        {theme}
      </Link>
    );
  }
  return <span title="Theme notes not published yet">{theme}</span>;
}

export function TickerThemeContextPanel({ symbol, manifest = null }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<TickerThemeContextV0 | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState("1Y");

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
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    fetchTickerThemeContext(symbol, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPayload(data);
        if (data?.default_horizon) setHorizon(data.default_horizon);
        else if (data?.available_horizons?.includes("1Y")) setHorizon("1Y");
      })
      .catch(() => {
        if (!controller.signal.aborted) setPayload(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [symbol, visible]);

  const horizons = useMemo(() => {
    const available = payload?.available_horizons?.length
      ? payload.available_horizons
      : HORIZON_ORDER.filter((h) =>
          (payload?.themes || []).some((theme) => theme.fit_by_horizon?.[h]),
        );
    return HORIZON_ORDER.filter((h) => available.includes(h));
  }, [payload]);

  const rows = useMemo(() => {
    if (!payload?.themes?.length) return [];
    return payload.themes
      .map((theme) => ({ theme, fit: fitForHorizon(theme, horizon) }))
      .filter((row) => row.fit != null);
  }, [payload, horizon]);

  if (!visible) {
    return <div ref={hostRef} aria-hidden="true" />;
  }

  if (loading && !payload) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading theme context…</p>
        </section>
      </div>
    );
  }

  if (!payload || rows.length === 0) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section className={`card ${styles.panel}`} aria-label={`${symbol} theme context`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Theme fit &amp; theme drivers</h2>
          {horizons.length > 1 ? (
            <div className={styles.periods} role="group" aria-label="Horizon">
              {horizons.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`${styles.periodBtn} ${h === horizon ? styles.periodBtnActive : ""}`}
                  aria-pressed={h === horizon}
                  onClick={() => setHorizon(h)}
                >
                  {h}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.grid}>
          <div>
            <h3 className={styles.colTitle}>Fit to its themes</h3>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Corr</th>
                    <th scope="col">Beta</th>
                    <th scope="col">R²</th>
                    <th scope="col">Stock-spec</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ theme, fit }) => (
                    <tr key={theme.slug}>
                      <td>
                        <ThemeName theme={theme.theme} slug={theme.slug} manifest={manifest} />
                      </td>
                      <td className={styles.num}>{formatDecimal(fit?.correlation_to_theme)}</td>
                      <td className={styles.num}>{formatDecimal(fit?.beta_to_theme)}</td>
                      <td className={styles.num}>{formatDecimal(fit?.theme_r2)}</td>
                      <td className={styles.num}>{formatShare(fit?.stock_specific_share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className={styles.colTitle}>Theme factor / sector tilt</h3>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Top factor</th>
                    <th scope="col">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ theme }) => (
                    <tr key={`${theme.slug}-drivers`}>
                      <td>
                        <ThemeName theme={theme.theme} slug={theme.slug} manifest={manifest} />
                      </td>
                      <td>{theme.top_factor?.label || <span className={styles.muted}>—</span>}</td>
                      <td>
                        {theme.dominant_sector?.label || <span className={styles.muted}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className={styles.hint}>
          Leave-one-out fit vs each theme basket ({horizon}). Factor/sector columns are the
          theme&apos;s current profile, not a stock-level regression.
        </p>
      </section>
    </div>
  );
}
