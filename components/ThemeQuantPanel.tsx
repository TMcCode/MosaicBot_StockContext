"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchThemeFactorProfile } from "@/lib/themeQuantSidecars";
import type { ThemeFactorProfileV0 } from "@/lib/types/theme.factor_profile.v0";

import styles from "./ThemeQuantPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
}

export function ThemeQuantPanel({ slug, themeName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState<ThemeFactorProfileV0 | null>(null);
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
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    fetchThemeFactorProfile(slug, controller.signal)
      .then((nextProfile) => {
        if (!controller.signal.aborted) setProfile(nextProfile);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visible]);

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

  if (loading && !profile) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading theme drivers…</p>
        </section>
      </div>
    );
  }

  if (!profile || factorChips.length === 0) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section className={`card ${styles.panel}`} aria-label={`${themeName} factor drivers`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Theme drivers</h2>
        </div>
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
        <p className={styles.hint}>
          Factor chips are the theme&apos;s current profile (not stock-level loadings). Correlation
          metrics are in the Correlation section below.
        </p>
      </section>
    </div>
  );
}
