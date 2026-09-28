"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { fetchLatestHeadlines } from "@/lib/allNews";
import { formatEventDateShort } from "@/lib/homeFeedDisplay";
import { href, themeHref, tickerHref } from "@/lib/links";
import type { RecentUpdatesMarquee, RecentUpdatesMarqueeItem } from "@/lib/types";

import { WorkflowTagBadges } from "./WorkflowTagBadges";
import styles from "./HomeRecentUpdatesMarquee.module.css";

/** Constant crawl speed so long rows don't race; drag / wheel still scrub freely. */
const CRAWL_PX_PER_SECOND = 22;
const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESS_MS = 400;

function normalizeLoopScroll(el: HTMLDivElement) {
  const half = el.scrollWidth / 2;
  if (half <= 0) return;
  if (el.scrollLeft >= half) {
    el.scrollLeft -= half;
  } else if (el.scrollLeft < 0) {
    el.scrollLeft += half;
  }
}

/** Headline chip for the News row (external link). */
export type MarqueeNewsItem = { i: string; t: string; u: string };

type RowProps = {
  rowLabel: string;
  action?: ReactNode;
  itemCount: number;
  renderChips: (prefix: string) => ReactNode[];
  autoPaused: boolean;
  reducedMotion: boolean;
  suppressClickUntil: RefObject<number>;
};

function MarqueeRow({
  rowLabel,
  action,
  itemCount,
  renderChips,
  autoPaused,
  reducedMotion,
  suppressClickUntil,
}: RowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, startScroll: 0, moved: false });
  const [scrubbing, setScrubbing] = useState(false);
  const paused = autoPaused || scrubbing;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || reducedMotion || itemCount === 0) return;

    let raf = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      if (!el.isConnected) return;
      if (!paused) {
        const dt = Math.min(now - last, 48);
        carry += (CRAWL_PX_PER_SECOND / 1000) * dt;
        const step = Math.floor(carry);
        if (step > 0) {
          carry -= step;
          el.scrollLeft += step;
          normalizeLoopScroll(el);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reducedMotion, itemCount]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollLeft += delta;
      normalizeLoopScroll(el);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [itemCount]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setScrubbing(true);
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScroll - dx;
      normalizeLoopScroll(el);
    }
  }, []);

  const endPointerDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (!el || drag.pointerId !== e.pointerId) return;
    if (drag.moved) {
      suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
    }
    dragRef.current = { pointerId: -1, startX: 0, startScroll: 0, moved: false };
    setScrubbing(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, [suppressClickUntil]);

  if (itemCount === 0) return null;

  const renderSequence = (prefix: string) => <div className={styles.sequence}>{renderChips(prefix)}</div>;

  const viewportClass = [
    styles.viewport,
    scrubbing ? styles.viewportDragging : "",
    reducedMotion ? styles.viewportReducedMotion : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.rowBlock}>
      <div className={styles.rowLabel}>
        {rowLabel}
        {action}
      </div>
      <div
        ref={viewportRef}
        className={viewportClass}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        role="region"
        aria-roledescription="carousel"
        tabIndex={0}
        aria-label={`${rowLabel}; scroll horizontally`}
      >
        <div className={styles.track}>
          {renderSequence("a")}
          {renderSequence("b")}
        </div>
      </div>
    </div>
  );
}

function suppressDragClick(suppressClickUntil: RefObject<number>) {
  return (e: React.MouseEvent) => {
    if (Date.now() < suppressClickUntil.current) {
      e.preventDefault();
    }
  };
}

function updateChips(
  items: RecentUpdatesMarqueeItem[],
  kind: "ticker" | "theme",
  prefix: string,
  suppressClickUntil: RefObject<number>,
): ReactNode[] {
  return items.map((item) => {
    const key = `${prefix}-${item.symbol}-${item.updated_at}`;
    const target =
      item.meta_url != null ? (kind === "ticker" ? tickerHref(item.symbol) : themeHref(item.symbol)) : null;
    const dateLabel = formatEventDateShort(item.updated_at);
    const inner = (
      <>
        <span className={styles.chipName}>{item.label}</span>
        {kind === "ticker" ? <WorkflowTagBadges tags={item.workflow_tags} className={styles.chipTags} /> : null}
        {dateLabel ? <span className={styles.chipDate}>{dateLabel}</span> : null}
      </>
    );
    if (!target) {
      return (
        <span key={key} className={`${styles.chip} ${styles.chipMuted}`}>
          {inner}
        </span>
      );
    }
    return (
      <Link
        key={key}
        href={target}
        className={styles.chip}
        draggable={false}
        onClick={suppressDragClick(suppressClickUntil)}
      >
        {inner}
      </Link>
    );
  });
}

function newsChips(items: MarqueeNewsItem[], prefix: string, suppressClickUntil: RefObject<number>): ReactNode[] {
  return items.map((item) => (
    <a
      key={`${prefix}-${item.i}`}
      href={item.u}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.chip}
      title={item.t}
      draggable={false}
      onClick={suppressDragClick(suppressClickUntil)}
    >
      <span className={`${styles.chipName} ${styles.newsName}`}>{item.t}</span>
    </a>
  ));
}

type Props = {
  data: RecentUpdatesMarquee | null;
  /** Full row counts when `data` rows are trimmed for the crawl. */
  totals?: { tickers: number; themes: number };
  asOfLabel?: string;
  news?: MarqueeNewsItem[];
};

/** Marquee rows: tickers and themes with text-table updates in the last N days, then news headlines. */
export function HomeRecentUpdatesMarquee({ data, totals, asOfLabel, news: bakedNews = [] }: Props) {
  const suppressClickUntil = useRef(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [news, setNews] = useState(bakedNews);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () =>
      void fetchLatestHeadlines(ctrl.signal)
        .then((items) => {
          if (items.length) setNews(items);
        })
        .catch(() => {});
    const idle = window.requestIdleCallback?.(load, { timeout: 3000 });
    const timer = idle == null ? window.setTimeout(load, 1500) : undefined;
    return () => {
      ctrl.abort();
      if (idle != null) window.cancelIdleCallback(idle);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  const tickerRows = data?.ticker_rows ?? [];
  const themeRows = data?.theme_rows ?? [];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (tickerRows.length === 0 && themeRows.length === 0 && news.length === 0) {
    return null;
  }

  const autoPaused = hoverPaused || userPaused;
  const lookback = data?.lookback_days ?? 7;

  return (
    <section
      className={styles.wrap}
      aria-label="Recently updated research tables and news"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.label}>Recent updates</span>
          {!reducedMotion ? (
            <button
              type="button"
              className={styles.pauseBtn}
              onClick={() => setUserPaused((p) => !p)}
              aria-pressed={userPaused}
              aria-label={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
              title={userPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
            >
              <span aria-hidden>{userPaused ? "▶" : "⏸"}</span>
            </button>
          ) : null}
        </div>
        <span className={styles.meta}>
          Last {lookback} days · {totals?.tickers ?? tickerRows.length} tickers ·{" "}
          {totals?.themes ?? themeRows.length} themes
          {asOfLabel ? ` · ${asOfLabel}` : ""}
        </span>
      </div>
      <MarqueeRow
        rowLabel="Tickers"
        itemCount={tickerRows.length}
        renderChips={(prefix) => updateChips(tickerRows, "ticker", prefix, suppressClickUntil)}
        autoPaused={autoPaused}
        reducedMotion={reducedMotion}
        suppressClickUntil={suppressClickUntil}
      />
      <MarqueeRow
        rowLabel="Theme tables"
        itemCount={themeRows.length}
        renderChips={(prefix) => updateChips(themeRows, "theme", prefix, suppressClickUntil)}
        autoPaused={autoPaused}
        reducedMotion={reducedMotion}
        suppressClickUntil={suppressClickUntil}
      />
      <MarqueeRow
        rowLabel="News"
        action={
          <Link href={href("/news")} className={styles.rowAction}>
            View all →
          </Link>
        }
        itemCount={news.length}
        renderChips={(prefix) => newsChips(news, prefix, suppressClickUntil)}
        autoPaused={autoPaused}
        reducedMotion={reducedMotion}
        suppressClickUntil={suppressClickUntil}
      />
    </section>
  );
}
