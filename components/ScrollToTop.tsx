"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ScrollToTop.module.css";

const SHOW_AFTER_PX = 420;
/** Cap how long the animated scroll can take (ms). */
const SCROLL_MAX_MS = 320;
const SCROLL_MIN_MS = 160;

function ArrowUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease-out cubic — snappy finish without a hard stop. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function animateScrollToTop(cancelRef: { current: number }) {
  if (cancelRef.current) {
    window.cancelAnimationFrame(cancelRef.current);
    cancelRef.current = 0;
  }

  const startY = window.scrollY || document.documentElement.scrollTop;
  if (startY <= 0) return;

  if (prefersReducedMotion()) {
    window.scrollTo(0, 0);
    return;
  }

  const duration = Math.min(SCROLL_MAX_MS, Math.max(SCROLL_MIN_MS, startY * 0.12));
  const startTime = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / duration);
    const y = startY * (1 - easeOutCubic(t));
    window.scrollTo(0, y);
    if (t < 1) {
      cancelRef.current = window.requestAnimationFrame(step);
    } else {
      cancelRef.current = 0;
      window.scrollTo(0, 0);
    }
  };

  cancelRef.current = window.requestAnimationFrame(step);
}

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const scrollRafRef = useRef(0);
  const animRafRef = useRef(0);

  useEffect(() => {
    const update = () => {
      scrollRafRef.current = 0;
      const next = window.scrollY > SHOW_AFTER_PX;
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };
    const onScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
      if (animRafRef.current) window.cancelAnimationFrame(animRafRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={`${styles.btn}${visible ? ` ${styles.visible}` : ""}`}
      onClick={() => animateScrollToTop(animRafRef)}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <ArrowUpIcon />
    </button>
  );
}
