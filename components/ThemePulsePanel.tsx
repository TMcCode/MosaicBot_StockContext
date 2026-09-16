"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchThemePulseDay, fetchThemePulseIndex } from "@/lib/themePulse";
import type { ThemePulseThemeV0 } from "@/lib/types/theme.pulse.v0";

import styles from "./ThemePulsePanel.module.css";

type Props = {
  slug: string;
  themeName: string;
};

const SENTIMENT_LABELS: Record<string, string> = {
  improving: "Improving",
  stable: "Stable",
  deteriorating: "Deteriorating",
  mixed: "Mixed",
};

const FIT_LABELS: Record<string, string> = {
  aligned: "Price & news aligned",
  diverge_price_leads: "Price leads (news quieter / disagrees)",
  diverge_news_leads: "News leads (price hasn't caught up)",
  unclear: "Unclear",
};

const COVERAGE_LABELS: Record<string, string> = {
  rich: "Rich news coverage",
  thin: "Thin news coverage",
  none: "No material news hits",
};

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n)}`;
}

function LinkList({
  title,
  items,
}: {
  title: string;
  items: NonNullable<ThemePulseThemeV0["reading"]>;
}) {
  if (!items.length) return null;
  return (
    <div className={styles.block}>
      <h3 className={styles.colTitle}>{title}</h3>
      <ul className={styles.linkList}>
        {items.map((item) => (
          <li key={item.url || item.title}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.title || item.url}
              </a>
            ) : (
              <span>{item.title}</span>
            )}
            {item.publisher || item.published_approx ? (
              <span className={styles.muted}>
                {" "}
                · {[item.publisher, item.published_approx].filter(Boolean).join(" · ")}
              </span>
            ) : null}
            {item.why_relevant ? <p className={styles.why}>{item.why_relevant}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PulseBody({ pulse }: { pulse: ThemePulseThemeV0 }) {
  const sentiment =
    pulse.news_sentiment != null
      ? SENTIMENT_LABELS[pulse.news_sentiment] || pulse.news_sentiment
      : "—";
  const fit = pulse.fit != null ? FIT_LABELS[pulse.fit] || pulse.fit : "—";
  const coverage = pulse.news_coverage
    ? COVERAGE_LABELS[pulse.news_coverage] || pulse.news_coverage
    : "—";
  const confirming = pulse.confirming || [];
  const disconfirming = pulse.disconfirming || [];
  const watch = pulse.watch_next_14d || [];
  const ports = pulse.port_tickers || [];
  const reading = pulse.reading || [];
  const reddit = pulse.reddit || [];

  return (
    <div className={styles.body}>
      <p className={styles.meta}>
        Theme {fmtPct(pulse.price_14d_pct)} · SPY {fmtPct(pulse.spy_14d_pct)} · excess{" "}
        {fmtPct(pulse.excess_vs_spy_pct)}
      </p>
      <p className={styles.meta}>
        News: {fmtScore(pulse.news_sentiment_score)} · {sentiment} · {fit} · {coverage}
        {pulse.confidence ? ` · ${pulse.confidence} conf.` : ""}
      </p>

      {pulse.period_verdict ? (
        <p className={styles.verdict}>
          <strong>{pulse.period_verdict}</strong>
        </p>
      ) : null}
      {pulse.theme_summary ? <p className={styles.summary}>{pulse.theme_summary}</p> : null}

      {confirming.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.colTitle}>Confirming</h3>
          <ul className={styles.bullets}>
            {confirming.map((b) => (
              <li key={b.slice(0, 48)}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {disconfirming.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.colTitle}>Disconfirming</h3>
          <ul className={styles.bullets}>
            {disconfirming.map((b) => (
              <li key={b.slice(0, 48)}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {watch.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.colTitle}>Next 14 days</h3>
          <ul className={styles.bullets}>
            {watch.map((item) => (
              <li key={item.id || `${item.title}-${item.date_start}`}>
                <span className={styles.muted}>
                  {item.date_start === item.date_end
                    ? item.date_start
                    : `${item.date_start} → ${item.date_end}`}
                  {item.session ? ` · ${item.session}` : ""}
                </span>
                {" · "}
                {item.source_url ? (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
                {item.why ? <p className={styles.why}>{item.why}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <LinkList title="Reading" items={reading} />
      <LinkList title="Reddit" items={reddit} />

      {ports.length > 0 ? (
        <div className={styles.block}>
          <h3 className={styles.colTitle}>Owned in theme</h3>
          <ul className={styles.bullets}>
            {ports.map((p) => (
              <li key={p.ticker}>
                <strong>{p.ticker}</strong>
                {p.weight_pct != null ? (
                  <span className={styles.muted}> · {p.weight_pct.toFixed(2)}%</span>
                ) : null}
                {p.earnings_in_window ? (
                  <span className={styles.muted}> · earnings in window</span>
                ) : null}
                {p.paragraph ? <p className={styles.why}>{p.paragraph}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pulse.sources_note ? <p className={styles.muted}>{pulse.sources_note}</p> : null}
    </div>
  );
}

export function ThemePulsePanel({ slug, themeName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pulse, setPulse] = useState<ThemePulseThemeV0 | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);
  const cacheRef = useRef<Map<string, ThemePulseThemeV0>>(new Map());

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
      { rootMargin: "100px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setLoading(true);
    setMissing(false);
    fetchThemePulseIndex(slug, controller.signal)
      .then((index) => {
        if (controller.signal.aborted) return;
        if (!index?.latest || !index.available_dates.length) {
          setMissing(true);
          setPulse(null);
          setDates([]);
          return;
        }
        cacheRef.current.set(index.latest.as_of, index.latest);
        setDates(index.available_dates);
        setSelected(index.latest.as_of);
        setPulse(index.latest);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMissing(true);
          setPulse(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visible]);

  useEffect(() => {
    if (!visible || !selected || missing) return;
    const cached = cacheRef.current.get(selected);
    if (cached) {
      setPulse(cached);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchThemePulseDay(slug, selected, controller.signal)
      .then((day) => {
        if (controller.signal.aborted) return;
        if (!day) return;
        cacheRef.current.set(selected, day);
        setPulse(day);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, selected, visible, missing]);

  const dateOptions = useMemo(() => dates, [dates]);

  if (!visible) {
    return <div ref={hostRef} aria-hidden="true" />;
  }

  if (missing) {
    return <div ref={hostRef} />;
  }

  if (loading && !pulse) {
    return (
      <div ref={hostRef}>
        <section className={`card ${styles.panel}`} aria-busy="true">
          <p className={styles.status}>Loading theme pulse…</p>
        </section>
      </div>
    );
  }

  if (!pulse) {
    return <div ref={hostRef} />;
  }

  return (
    <div ref={hostRef}>
      <section className={`card ${styles.panel}`} aria-label={`${themeName} theme pulse`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Theme pulse</h2>
            <p className={styles.hint}>
              14-day dual-lens writeup (price vs news/catalysts). Latest by default — pick an
              earlier date when available.
            </p>
          </div>
          {dateOptions.length > 1 ? (
            <label className={styles.dateLabel}>
              <span className={styles.dateLabelText}>As of</span>
              <select
                className={styles.dateSelect}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Theme pulse date"
              >
                {dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={styles.singleDate}>as of {pulse.as_of}</p>
          )}
        </div>
        {loading ? <p className={styles.status}>Loading {selected}…</p> : null}
        <PulseBody pulse={pulse} />
      </section>
    </div>
  );
}
