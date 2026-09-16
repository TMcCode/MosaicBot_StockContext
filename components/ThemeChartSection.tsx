"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { ThemeConstituent } from "@/lib/types";
import type { ManifestSelectedDateV0 } from "@/lib/chart/types";

import styles from "./TickerChartPanel.module.css";

const ThemePerformanceChart = dynamic(
  () =>
    import("@/components/ThemePerformanceChart").then((mod) => mod.ThemePerformanceChart),
  {
    ssr: false,
    loading: () => <div className={styles.loading}>Loading chart…</div>,
  },
);

type Props = {
  slug: string;
  themeName: string;
  constituents: ThemeConstituent[];
  selectedDates: ManifestSelectedDateV0[];
};

export function ThemeChartSection({
  slug,
  themeName,
  constituents,
  selectedDates,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
      { rootMargin: "160px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef}>
      {visible ? (
        <ThemePerformanceChart
          slug={slug}
          themeName={themeName}
          constituents={constituents}
          selectedDates={selectedDates}
        />
      ) : (
        <section
          className="card ticker-chart-section"
          aria-busy="true"
          aria-label={`${themeName} performance chart`}
        >
          <div className={styles.loading}>Loading chart…</div>
        </section>
      )}
    </div>
  );
}
