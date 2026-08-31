"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import type { TickerThemeOption } from "@/components/TickerPerformanceChart";
import type { ManifestSelectedDateV0 } from "@/lib/chart/types";

import styles from "./TickerChartPanel.module.css";

const TickerPerformanceChart = dynamic(
  () =>
    import("@/components/TickerPerformanceChart").then((mod) => mod.TickerPerformanceChart),
  {
    ssr: false,
    loading: () => <div className={styles.loading}>Loading chart…</div>,
  },
);

type Props = {
  symbol: string;
  companyName?: string;
  themes: TickerThemeOption[];
  selectedDates: ManifestSelectedDateV0[];
};

export function TickerChartSection({ symbol, companyName, themes, selectedDates }: Props) {
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
        <TickerPerformanceChart
          symbol={symbol}
          companyName={companyName}
          themes={themes}
          selectedDates={selectedDates}
        />
      ) : (
        <section
          className="card ticker-chart-section"
          aria-busy="true"
          aria-label={`${symbol} performance chart`}
        >
          <div className={styles.loading}>Loading chart…</div>
        </section>
      )}
    </div>
  );
}
