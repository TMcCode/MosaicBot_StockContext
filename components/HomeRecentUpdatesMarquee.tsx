"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { formatEventDateShort } from "@/lib/homeFeedDisplay";
import { themeHref, tickerHref } from "@/lib/links";
import type { RecentUpdatesMarquee, RecentUpdatesMarqueeItem } from "@/lib/types";

import styles from "./HomeRecentUpdatesMarquee.module.css";

const LOOP_SECONDS = 280;
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

type RowProps = {
  rowLabel: string;
  items: RecentUpdatesMarqueeItem[];
  kind: "ticker" | "theme";
  autoPaused: boolean;
  reducedMotion: boolean;
  suppressClickUntil: React.RefObject<number>;
};

function MarqueeRow({
  rowLabel,
  items,
  kind,
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
    if (!el || reducedMotion || items.length === 0) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!el.isConnected) return;
      if (!paused) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          const dt = Math.min(now - last, 48);
          el.scrollLeft += (half / (LOOP_SECONDS * 1000)) * dt;
          normalizeLoopScroll(el);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reducedMotion, items.length]);

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
  }, [items.length]);

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

  if (items.length === 0) return null;

  const renderChip = (item: RecentUpdatesMarqueeItem, key: string) => {
    const href =
      item.meta_url != null
        ? kind === "ticker"
          ? tickerHref(item.symbol)
          : themeHref(item.symbol)
        : null;
    const dateLabel = formatEventDateShort(item.updated_at);
    const inner = (
      <>
        <span className={styles.chipName}>{item.label}</span>
        {dateLabel ? <span className={styles.chipDate}>{dateLabel}</span> : null}
      </>
    );
    const className = href ? styles.chip : `${styles.chip} ${styles.chipMuted}`;
    if (!href) {
      return (
        <span key={key} className={className}>
          {inner}
        </span>
      );
    }
    return (
      <Link
        key={key}
        href={href}
        className={className}
        draggable={false}
        onClick={(e) => {
          if (Date.now() < suppressClickUntil.current) {
            e.preventDefault();
          }
        }}
      >
        {inner}
      </Link>
    );
  };

  const renderSequence = (prefix: string) => (
    <div className={styles.sequence}>
      {items.map((item) => renderChip(item, `${prefix}-${item.symbol}-${item.updated_at}`))}
    </div>
  );

  const viewportClass = [
    styles.viewport,
    scrubbing ? styles.viewportDragging : "",
    reducedMotion ? styles.viewportReducedMotion : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.rowBlock}>
      <div className={styles.rowLabel}>{rowLabel}</div>
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
        aria-label={`${rowLabel} updated in the last week; scroll horizontally`}
      >
        <div className={styles.track}>
          {renderSequence("a")}
          {renderSequence("b")}
        </div>
      </div>
    </div>
  );
}

type Props = {
  data: RecentUpdatesMarquee;
  asOfLabel?: string;
};

/** Two-row marquee: tickers and themes with text-table updates in the last N days. */
export function HomeRecentUpdatesMarquee({ data, asOfLabel }: Props) {
  const suppressClickUntil = useRef(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const tickerRows = data.ticker_rows ?? [];
  const themeRows = data.theme_rows ?? [];
  if (tickerRows.length === 0 && themeRows.length === 0) {
    return null;
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const autoPaused = hoverPaused || userPaused;
  const lookback = data.lookback_days ?? 7;

  return (
    <section
      className={styles.wrap}
      aria-label="Recently updated ticker and theme research tables"
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
          Last {lookback} days · {tickerRows.length} tickers · {themeRows.length} themes
          {asOfLabel ? ` · ${asOfLabel}` : ""}
        </span>
      </div>
      <MarqueeRow
        rowLabel="Tickers"
        items={tickerRows}
        kind="ticker"
        autoPaused={autoPaused}
        reducedMotion={reducedMotion}
        suppressClickUntil={suppressClickUntil}
      />
      <MarqueeRow
        rowLabel="Theme tables"
        items={themeRows}
        kind="theme"
        autoPaused={autoPaused}
        reducedMotion={reducedMotion}
        suppressClickUntil={suppressClickUntil}
      />
    </section>
  );
}
