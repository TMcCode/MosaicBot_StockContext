"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { themeHref, tickerHref } from "@/lib/links";
import {
  buildThemeNameToSlug,
  collectSiteSearchHits,
  loadSiteSearchEngine,
  type SiteSearchEngine,
  type SiteSearchHit,
} from "@/lib/siteSearchHits";
import { themeHasPublishedPage } from "@/lib/themePage";
import type { SearchTickerRow } from "@/lib/types";

import styles from "./SiteSearch.module.css";

function tickerDisplayName(ref: SearchTickerRow): string | null {
  const name = (ref.name ?? ref.company_name ?? "").trim();
  if (!name || name.toUpperCase() === ref.symbol.toUpperCase()) {
    return null;
  }
  return name;
}

export function SiteSearch() {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadInflight = useRef(false);
  const prefetchedHrefsRef = useRef<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setActive(0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const beginLoad = useCallback(() => {
    if (loadInflight.current || engine) {
      return;
    }
    loadInflight.current = true;
    setLoadBusy(true);
    setLoadError(null);
    void loadSiteSearchEngine()
      .then(setEngine)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load search index");
        setEngine(null);
      })
      .finally(() => {
        loadInflight.current = false;
        setLoadBusy(false);
      });
  }, [engine]);

  const themeNameToSlug = useMemo(
    () => (engine ? buildThemeNameToSlug(engine.index) : new Map<string, string>()),
    [engine],
  );

  const hits = useMemo(() => {
    if (!engine || !debounced.trim()) {
      return [];
    }
    return collectSiteSearchHits(engine.index, engine.fuse, debounced);
  }, [engine, debounced]);

  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      const el = wrapRef.current;
      if (!el || !open) {
        return;
      }
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const cursor = hits.length > 0 ? Math.min(active, hits.length - 1) : 0;

  const goToHit = useCallback(
    (h: SiteSearchHit) => {
      if (h.kind === "theme") {
        if (!themeHasPublishedPage(h.ref)) {
          return;
        }
        router.push(themeHref(h.ref.slug));
      } else {
        router.push(tickerHref(h.ref.symbol));
      }
      setOpen(false);
      setQuery("");
    },
    [router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && open && hits[cursor]) {
        e.preventDefault();
        goToHit(hits[cursor]);
        return;
      }
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && hits.length > 0) {
        setOpen(true);
        return;
      }
      if (!open) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
    },
    [cursor, goToHit, hits, open],
  );

  const prefetchHref = useCallback(
    (target: string) => {
      if (prefetchedHrefsRef.current.has(target)) return;
      prefetchedHrefsRef.current.add(target);
      void router.prefetch(target);
    },
    [router],
  );

  const showPanel = Boolean(
    open &&
      (loadBusy ||
        loadError ||
        hits.length > 0 ||
        (debounced.trim() && engine && hits.length === 0)),
  );

  const index = engine?.index;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        type="search"
        className={styles.input}
        placeholder="Search ticker, company, or theme…"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        value={query}
        onChange={(e) => {
          beginLoad();
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          beginLoad();
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        enterKeyHint="search"
      />
      {showPanel ? (
        <div id={listId} className={styles.panel} role="listbox" aria-label="Search results">
          {loadError ? (
            <div className={styles.err} role="status">
              Search unavailable ({loadError}). Try again later or browse tickers / themes.
            </div>
          ) : loadBusy && !index ? (
            <div className={styles.meta} role="status">
              Loading search…
            </div>
          ) : index && debounced.trim() && hits.length === 0 ? (
            <div className={styles.meta} role="status">
              No matches.
            </div>
          ) : index && hits.length > 0 ? (
            <>
              <div className={styles.meta}>
                Data as of {new Date(index.as_of).toLocaleString(undefined, { dateStyle: "medium" })}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {hits.map((h, i) => {
                  const rowBg = i === cursor ? "rgba(38, 252, 214, 0.08)" : undefined;
                  if (h.kind === "ticker") {
                    const companyLabel = tickerDisplayName(h.ref);
                    return (
                      <li key={h.key} role="presentation">
                        <div
                          className={styles.rowWithAction}
                          style={{ background: rowBg, cursor: "pointer" }}
                          role="option"
                          aria-selected={i === cursor}
                          onClick={() => goToHit(h)}
                        >
                          <div className={styles.rowBody}>
                            <div className={styles.rowTitle}>
                              <span className={styles.badge}>Ticker</span>
                              {h.ref.symbol}
                              {companyLabel ? ` · ${companyLabel}` : ""}
                            </div>
                            <div className={styles.rowSub}>
                              {(h.ref.theme_names ?? []).length === 0 ? (
                                "No theme links"
                              ) : (
                                <>
                                  Themes:{" "}
                                  {(h.ref.theme_names ?? []).map((name, j) => {
                                    const slug = themeNameToSlug.get(name);
                                    return (
                                      <span key={`${h.ref.symbol}-${name}`}>
                                        {j > 0 ? " · " : ""}
                                        {slug ? (
                                          <Link
                                            href={themeHref(slug)}
                                            className={styles.themeLink}
                                            prefetch={false}
                                            onMouseEnter={() => prefetchHref(themeHref(slug))}
                                            onFocus={() => prefetchHref(themeHref(slug))}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpen(false);
                                              setQuery("");
                                            }}
                                          >
                                            {name}
                                          </Link>
                                        ) : (
                                          name
                                        )}
                                      </span>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={h.key} role="presentation">
                      <Link
                        href={themeHasPublishedPage(h.ref) ? themeHref(h.ref.slug) : "#"}
                        className={`${styles.row} ${!themeHasPublishedPage(h.ref) ? styles.mutedHit : ""}`}
                        prefetch={false}
                        onMouseEnter={() => {
                          if (themeHasPublishedPage(h.ref)) {
                            prefetchHref(themeHref(h.ref.slug));
                          }
                        }}
                        onFocus={() => {
                          if (themeHasPublishedPage(h.ref)) {
                            prefetchHref(themeHref(h.ref.slug));
                          }
                        }}
                        style={{ background: rowBg }}
                        role="option"
                        aria-selected={i === cursor}
                        onClick={(e) => {
                          if (!themeHasPublishedPage(h.ref)) {
                            e.preventDefault();
                            return;
                          }
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <div className={styles.rowTitle}>
                          <span className={styles.badge}>Theme</span>
                          {h.ref.name}
                        </div>
                        <div className={styles.rowSub}>
                          {h.ref.ticker_count != null ? `${h.ref.ticker_count} tickers` : null}
                          {!themeHasPublishedPage(h.ref) ? (
                            <span> · no theme notes yet</span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
