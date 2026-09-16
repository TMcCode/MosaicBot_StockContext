"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { tickerHref } from "@/lib/links";
import {
  availableCohesionHorizons,
  fetchThemeFactorAttribution,
  fetchThemeFactorProfile,
} from "@/lib/themeQuantSidecars";
import type { ThemeConstituent } from "@/lib/types";
import type { ThemeFactorAttributionHorizon } from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeFactorAttributionV0 } from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeFactorProfileV0 } from "@/lib/types/theme.factor_profile.v0";

import styles from "./ThemeQuantPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
  constituents: ThemeConstituent[];
};

function formatDecimal(value: number | undefined | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function formatShare(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function formatRank(rank?: number, total?: number, percentile?: number): string {
  if (rank == null || total == null) return "—";
  if (percentile == null) return `${rank}/${total}`;
  return `${rank}/${total} · p${percentile.toFixed(0)}`;
}

export function ThemeQuantPanel({ slug, themeName, constituents }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState<ThemeFactorProfileV0 | null>(null);
  const [attribution, setAttribution] = useState<ThemeFactorAttributionV0 | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState<ThemeFactorAttributionHorizon>("1Y");

  const nameByTicker = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of constituents) {
      const sym = String(c.symbol || "")
        .trim()
        .toUpperCase();
      if (!sym) continue;
      map.set(sym, c.company_name || sym);
    }
    return map;
  }, [constituents]);

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
    Promise.all([
      fetchThemeFactorProfile(slug, controller.signal),
      fetchThemeFactorAttribution(slug, controller.signal),
    ])
      .then(([nextProfile, nextAttribution]) => {
        if (controller.signal.aborted) return;
        setProfile(nextProfile);
        setAttribution(nextAttribution);
        const horizons = availableCohesionHorizons(nextAttribution);
        if (horizons.includes("1Y")) setHorizon("1Y");
        else if (horizons[0]) setHorizon(horizons[0]);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProfile(null);
          setAttribution(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visible]);

  const horizons = useMemo(() => availableCohesionHorizons(attribution), [attribution]);
  const cohesion = attribution?.cohesion?.[horizon] ?? null;
  const fitRows = useMemo(() => {
    const rows = cohesion?.constituents ?? [];
    return [...rows].sort(
      (a, b) => (b.correlation_to_theme ?? -2) - (a.correlation_to_theme ?? -2),
    );
  }, [cohesion]);

  const factorChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; kind: "pos" | "neg" | "sector" }> = [];
    for (const f of (profile?.factors_positive || []).slice(0, 3)) {
      chips.push({ key: `p-${f.id}`, label: f.label, kind: "pos" });
    }
    for (const f of (profile?.factors_negative || []).slice(0, 2)) {
      chips.push({ key: `n-${f.id}`, label: f.label, kind: "neg" });
    }
    if (profile?.dominant_sector?.label) {
      chips.push({
        key: `s-${profile.dominant_sector.id}`,
        label: profile.dominant_sector.label,
        kind: "sector",
      });
    }
    return chips;
  }, [profile]);

  if (!visible) {
    return <div ref={hostRef} aria-hidden="true" />;
  }

  if (loading && !profile && !attribution) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading theme quant…</p>
        </section>
      </div>
    );
  }

  if (!profile && !cohesion) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section className={`card ${styles.panel}`} aria-label={`${themeName} factor and cohesion`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Theme drivers &amp; cohesion</h2>
          {horizons.length > 1 ? (
            <div className={styles.periods} role="group" aria-label="Cohesion horizon">
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

        {factorChips.length > 0 ? (
          <div className={styles.factorStrip} aria-label="Theme factor profile">
            {factorChips.map((chip) => (
              <span
                key={chip.key}
                className={`${styles.chip} ${
                  chip.kind === "sector"
                    ? styles.chipStrong
                    : chip.kind === "pos"
                      ? styles.chipPos
                      : styles.chipNeg
                }`}
              >
                {chip.kind === "sector" ? "Sector" : chip.kind === "pos" ? "+" : "−"} {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {cohesion ? (
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Median corr</span>
              <span className={styles.metricValue}>
                {formatDecimal(cohesion.median_correlation)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Mkt-adj</span>
              <span className={styles.metricValue}>
                {formatDecimal(cohesion.market_adjusted_median_correlation)}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Global rank</span>
              <span className={styles.metricValue}>
                {formatRank(
                  cohesion.global_rank,
                  cohesion.global_theme_count,
                  cohesion.global_percentile,
                )}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Coverage</span>
              <span className={styles.metricValue}>{formatDecimal(cohesion.coverage_pct, 0)}%</span>
            </div>
          </div>
        ) : null}

        {fitRows.length > 0 ? (
          <>
            <h3 className={styles.colTitle}>Constituent fit to theme ({horizon})</h3>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col">Corr</th>
                    <th scope="col">Beta</th>
                    <th scope="col">R²</th>
                    <th scope="col">Stock-spec</th>
                  </tr>
                </thead>
                <tbody>
                  {fitRows.map((row) => (
                    <tr key={row.ticker}>
                      <td>
                        <Link href={tickerHref(row.ticker)} className={styles.tickerLink}>
                          {row.ticker}
                        </Link>
                        {nameByTicker.get(row.ticker) &&
                        nameByTicker.get(row.ticker) !== row.ticker ? (
                          <span className={styles.muted}>
                            {" "}
                            · {nameByTicker.get(row.ticker)}
                          </span>
                        ) : null}
                      </td>
                      <td className={styles.num}>{formatDecimal(row.correlation_to_theme)}</td>
                      <td className={styles.num}>{formatDecimal(row.beta_to_theme)}</td>
                      <td className={styles.num}>{formatDecimal(row.theme_r2)}</td>
                      <td className={styles.num}>{formatShare(row.stock_specific_share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <p className={styles.hint}>
          Leave-one-out fit vs the theme basket. Factor chips are the theme&apos;s current
          profile (not stock-level loadings).
        </p>
      </section>
    </div>
  );
}
