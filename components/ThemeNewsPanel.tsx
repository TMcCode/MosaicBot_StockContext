"use client";

import { useRef, useState } from "react";

import { fetchThemeNewsMonth } from "@/lib/themeNews";
import type { ThemeNewsIndexV0, ThemeNewsItemV0 } from "@/lib/types/theme.news.v0";

import styles from "./ThemeNewsPanel.module.css";

type Props = {
  slug: string;
  themeName: string;
  index: ThemeNewsIndexV0;
};

const PAGE = 20;

function mergeItems(a: ThemeNewsItemV0[], b: ThemeNewsItemV0[]): ThemeNewsItemV0[] {
  const seen = new Set(a.map((i) => i.id));
  const out = [...a];
  for (const item of b) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function groupByMonth(items: ThemeNewsItemV0[]): { month: string; items: ThemeNewsItemV0[] }[] {
  const groups: { month: string; items: ThemeNewsItemV0[] }[] = [];
  for (const item of items) {
    const month = item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

function NewsRow({ item }: { item: ThemeNewsItemV0 }) {
  return (
    <li className={styles.row}>
      <div className={styles.line}>
        <span className={styles.date}>{item.date ? dayLabel(item.date) : "—"}</span>
        <a className={styles.title} href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
        </a>
        {item.picked ? (
          <span
            className={styles.pick}
            title={item.on_site ? "TimBot pick · shown on stockthemes Radar" : "TimBot pick"}
          >
            Pick
          </span>
        ) : null}
      </div>
      {item.source || item.tickers?.length ? (
        <p className={styles.meta}>
          {[item.source, item.tickers?.length ? item.tickers.join(" · ") : null]
            .filter(Boolean)
            .join(" — ")}
        </p>
      ) : null}
      {item.note ? <p className={styles.note}>{item.note}</p> : null}
    </li>
  );
}

export function ThemeNewsPanel({ slug, themeName, index }: Props) {
  const [items, setItems] = useState<ThemeNewsItemV0[]>(index.latest);
  const [shown, setShown] = useState(index.latest.length);
  const [nextMonth, setNextMonth] = useState(0);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const hasMore =
    shown < index.total && (shown < items.length || nextMonth < index.months.length);

  async function showMore() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const target = shown + PAGE;
    let merged = items;
    let m = nextMonth;
    try {
      while (merged.length < target && m < index.months.length) {
        const got = await fetchThemeNewsMonth(slug, index.months[m].month).catch(() => []);
        merged = mergeItems(merged, got);
        m += 1;
      }
    } finally {
      setItems(merged);
      setNextMonth(m);
      setShown(Math.min(target, merged.length));
      setLoading(false);
      busy.current = false;
    }
  }

  const groups = groupByMonth(items.slice(0, shown));

  return (
    <section className={`card ${styles.panel}`} aria-label={`${themeName} news`}>
      <div className={styles.header}>
        <h2 className={styles.heading}>News</h2>
        <p className={styles.hint}>
          {index.total} {index.total === 1 ? "story" : "stories"} tagged to this theme — Narrative
          Radar (NewsAPI.ai) and TimBot picks.
        </p>
      </div>
      {groups.map((g) => (
        <div key={g.month} className={styles.group}>
          <h3 className={styles.month}>{monthLabel(g.month)}</h3>
          <ul className={styles.list}>
            {g.items.map((item) => (
              <NewsRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ))}
      {hasMore ? (
        <button type="button" className={styles.more} onClick={showMore} disabled={loading}>
          {loading ? "Loading…" : `Show more (${index.total - shown} older)`}
        </button>
      ) : null}
    </section>
  );
}
