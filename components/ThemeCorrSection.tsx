"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import styles from "./ThemeQuantPanel.module.css";

const ThemeCorrMatrixPanel = dynamic(
  () =>
    import("@/components/ThemeCorrMatrixPanel").then((mod) => mod.ThemeCorrMatrixPanel),
  {
    ssr: false,
    loading: () => (
      <section className={`card ${styles.panel}`} aria-busy="true" aria-label="Correlation">
        <p className={styles.status}>Loading correlation…</p>
      </section>
    ),
  },
);

type Props = {
  slug: string;
  themeName: string;
};

/**
 * Viewport-gated + code-split Correlation panel (same pattern as ThemeChartSection).
 * Heavy matrix JS and sidecar fetches stay off the theme-page critical path.
 */
export function ThemeCorrSection({ slug, themeName }: Props) {
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
      { rootMargin: "80px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef}>
      {visible ? (
        <ThemeCorrMatrixPanel slug={slug} themeName={themeName} />
      ) : (
        <section
          className={`card ${styles.panel}`}
          aria-busy="true"
          aria-label={`${themeName} correlation`}
        >
          <p className={styles.status}>Loading correlation…</p>
        </section>
      )}
    </div>
  );
}
