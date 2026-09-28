"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchAllNewsIndex, fetchAllNewsWeek, newsDayLabel } from "@/lib/allNews";
import { useAuthUser } from "@/lib/auth/AuthUserContext";
import { href } from "@/lib/links";
import type { AllNewsDetailV0, AllNewsIndexV0, AllNewsItemV0, AllNewsStory } from "@/lib/types/news.all.v0";

import styles from "./NewsBrowser.module.css";

const DAY_OPTIONS = [1, 7, 30, 90];
const MAX_THEME_CHIPS = 3;
const MAX_TICKER_CHIPS = 4;
const PREFETCH_MARGIN = "900px 0px";

type Filters = { sector: string; group: string; theme: string; ticker: string; days: number };

type Row = { item: AllNewsItemV0; groups: string[]; sectors: string[] };

type ThemeOption = { slug: string; name: string; group: string | null; sector: string | null };

type Props = {
  /** Baked at build for instant paint; replaced by the live index once it loads. */
  initialStories: AllNewsStory[];
  windowDays: number;
  pageSize: number;
};

function dayLabel(days: number): string {
  return days === 1 ? "Today" : `Last ${days} days`;
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function readUrlFilters(windowDays: number): Filters {
  const p = new URLSearchParams(window.location.search);
  const days = Number(p.get("days"));
  return {
    sector: p.get("sector") ?? "",
    group: p.get("group") ?? "",
    theme: p.get("theme") ?? "",
    ticker: (p.get("ticker") ?? "").trim().toUpperCase(),
    days: DAY_OPTIONS.includes(days) && days <= windowDays ? days : windowDays,
  };
}

function writeUrlFilters(f: Filters, windowDays: number) {
  const p = new URLSearchParams();
  if (f.sector) p.set("sector", f.sector);
  if (f.group) p.set("group", f.group);
  if (f.theme) p.set("theme", f.theme);
  if (f.ticker) p.set("ticker", f.ticker);
  if (f.days !== windowDays) p.set("days", String(f.days));
  const qs = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

function detailOf(story: AllNewsStory): AllNewsDetailV0 {
  return { t: story.t, s: story.s, u: story.u, n: story.n };
}

export function NewsBrowser({ initialStories, windowDays, pageSize }: Props) {
  const defaultFilters = useMemo<Filters>(
    () => ({ sector: "", group: "", theme: "", ticker: "", days: windowDays }),
    [windowDays],
  );
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tickerDraft, setTickerDraft] = useState("");
  const [index, setIndex] = useState<AllNewsIndexV0 | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [visible, setVisible] = useState(pageSize);
  const [details, setDetails] = useState<Record<string, AllNewsDetailV0>>(() =>
    Object.fromEntries(initialStories.map((s) => [s.i, detailOf(s)])),
  );
  const [weeksDone, setWeeksDone] = useState<ReadonlySet<string>>(() => new Set());
  const inflight = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll anchoring pins the footer while rows append, keeping the sentinel in view and loading every page at once.
    const root = document.documentElement;
    const prev = root.style.overflowAnchor;
    root.style.overflowAnchor = "none";
    return () => {
      root.style.overflowAnchor = prev;
    };
  }, []);

  useEffect(() => {
    const fromUrl = readUrlFilters(windowDays);
    setFilters(fromUrl);
    setTickerDraft(fromUrl.ticker);
  }, [windowDays]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAllNewsIndex(ctrl.signal)
      .then((idx) => (idx ? setIndex(idx) : setIndexFailed(true)))
      .catch(() => {
        if (!ctrl.signal.aborted) setIndexFailed(true);
      });
    return () => ctrl.abort();
  }, []);

  const applyFilters = useCallback(
    (next: Filters) => {
      setFilters(next);
      setTickerDraft(next.ticker);
      setVisible(pageSize);
      writeUrlFilters(next, windowDays);
    },
    [pageSize, windowDays],
  );

  const taxonomy = useMemo(() => {
    if (!index) return null;
    const sectorOfGroup = (g: string | null) => (g ? index.groups[g]?.s ?? null : null);
    const rows: Row[] = index.items.map((item) => {
      const groups = new Set<string>();
      const sectors = new Set<string>();
      for (const th of item.th ?? []) {
        const g = index.themes[th]?.g;
        if (!g) continue;
        groups.add(g);
        const s = sectorOfGroup(g);
        if (s) sectors.add(s);
      }
      return { item, groups: [...groups], sectors: [...sectors] };
    });

    const themeSlugs = new Set<string>();
    const tickers = new Set<string>();
    for (const { item } of rows) {
      for (const th of item.th ?? []) if (index.themes[th]) themeSlugs.add(th);
      for (const tk of item.tk ?? []) tickers.add(tk);
    }
    const themes: ThemeOption[] = [...themeSlugs]
      .map((slug) => {
        const t = index.themes[slug];
        return { slug, name: t.n, group: t.g, sector: sectorOfGroup(t.g) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const groupSlugs = new Set(themes.map((t) => t.group).filter((g): g is string => Boolean(g && index.groups[g])));
    const groups = [...groupSlugs]
      .map((slug) => ({ slug, name: index.groups[slug].n, sector: index.groups[slug].s }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const sectors = [...new Set(groups.map((g) => g.sector).filter((s): s is string => Boolean(s)))].sort();
    const weekHash = new Map(index.weeks.map((w) => [w.w, w.h]));

    return { rows, themes, groups, sectors, tickers: [...tickers].sort(), weekHash };
  }, [index]);

  const matches = useMemo(() => {
    if (!taxonomy) return null;
    const { sector, group, theme, ticker, days } = filters;
    const cutoff = cutoffDate(days);
    return taxonomy.rows
      .filter(
        (r) =>
          r.item.d >= cutoff &&
          (!theme || (r.item.th ?? []).includes(theme)) &&
          (!group || r.groups.includes(group)) &&
          (!sector || r.sectors.includes(sector)) &&
          (!ticker || (r.item.tk ?? []).includes(ticker)),
      )
      .map((r) => r.item);
  }, [taxonomy, filters]);

  const source: AllNewsItemV0[] = matches ?? initialStories;
  const shown = source.slice(0, visible);

  useEffect(() => {
    if (!matches || !taxonomy) return;
    const needed = new Set<string>();
    for (const item of matches.slice(0, visible + pageSize)) {
      if (!details[item.i] && !weeksDone.has(item.w) && !inflight.current.has(item.w)) needed.add(item.w);
    }
    for (const week of needed) {
      inflight.current.add(week);
      fetchAllNewsWeek(week, taxonomy.weekHash.get(week))
        .catch(() => ({}) as Record<string, AllNewsDetailV0>)
        .then((items) => {
          inflight.current.delete(week);
          setDetails((prev) => ({ ...prev, ...items }));
          setWeeksDone((prev) => new Set(prev).add(week));
        });
    }
  }, [matches, taxonomy, visible, pageSize, details, weeksDone]);

  const hasMore = matches != null && visible < matches.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + pageSize);
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible, pageSize]);

  const jumpToTop = useCallback(() => {
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, []);

  const onTheme = useCallback(
    (slug: string) => {
      const t = index?.themes[slug];
      const group = t?.g ?? "";
      const sector = (group && index?.groups[group]?.s) || "";
      applyFilters({ ...filters, sector, group, theme: slug, ticker: "" });
      jumpToTop();
    },
    [index, filters, applyFilters, jumpToTop],
  );

  const onTicker = useCallback(
    (ticker: string) => {
      applyFilters({ ...filters, sector: "", group: "", theme: "", ticker });
      jumpToTop();
    },
    [filters, applyFilters, jumpToTop],
  );

  const tickerSet = useMemo(() => new Set(taxonomy?.tickers ?? []), [taxonomy]);
  const commitTicker = (raw: string) => {
    const ticker = raw.trim().toUpperCase();
    if (ticker !== filters.ticker) applyFilters({ ...filters, ticker });
  };

  const groupOptions = (taxonomy?.groups ?? []).filter((g) => !filters.sector || g.sector === filters.sector);
  const themeOptions = (taxonomy?.themes ?? []).filter((t) =>
    filters.group ? t.group === filters.group : !filters.sector || t.sector === filters.sector,
  );
  const dayOptions = DAY_OPTIONS.filter((d) => d <= windowDays);
  const filtered =
    filters.sector || filters.group || filters.theme || filters.ticker || filters.days !== windowDays;

  return (
    <div ref={topRef} className={styles.wrap}>
      <div className={styles.filters} role="search" aria-label="Filter news">
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Sector</span>
          <select
            className={styles.control}
            value={filters.sector}
            disabled={!taxonomy}
            onChange={(e) => applyFilters({ ...filters, sector: e.target.value, group: "", theme: "" })}
          >
            <option value="">All sectors</option>
            {taxonomy?.sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Group</span>
          <select
            className={styles.control}
            value={filters.group}
            disabled={!taxonomy}
            onChange={(e) => {
              const group = e.target.value;
              const sector = group ? taxonomy?.groups.find((g) => g.slug === group)?.sector ?? "" : filters.sector;
              applyFilters({ ...filters, sector, group, theme: "" });
            }}
          >
            <option value="">All groups</option>
            {groupOptions.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Theme</span>
          <select
            className={styles.control}
            value={filters.theme}
            disabled={!taxonomy}
            onChange={(e) => {
              const theme = e.target.value;
              if (!theme) return applyFilters({ ...filters, theme: "" });
              const t = taxonomy?.themes.find((x) => x.slug === theme);
              applyFilters({ ...filters, theme, group: t?.group ?? "", sector: t?.sector ?? "" });
            }}
          >
            <option value="">All themes</option>
            {themeOptions.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Ticker</span>
          <input
            className={styles.control}
            type="search"
            list="news-tickers"
            placeholder="Any"
            value={tickerDraft}
            disabled={!taxonomy}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setTickerDraft(v);
              if (!v.trim() || tickerSet.has(v.trim())) commitTicker(v);
            }}
            onBlur={(e) => commitTicker(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTicker(e.currentTarget.value);
            }}
          />
          <datalist id="news-tickers">
            {taxonomy?.tickers.map((tk) => <option key={tk} value={tk} />)}
          </datalist>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <select
            className={styles.control}
            value={filters.days}
            onChange={(e) => applyFilters({ ...filters, days: Number(e.target.value) })}
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={`muted ${styles.status}`} aria-live="polite">
        {matches
          ? `${matches.length.toLocaleString()} ${matches.length === 1 ? "story" : "stories"} · ${dayLabel(filters.days).toLowerCase()}`
          : indexFailed
            ? "Couldn't load filters — showing the latest stories."
            : "Latest stories"}
        {filtered ? (
          <>
            {" · "}
            <button type="button" className={styles.linkBtn} onClick={() => applyFilters(defaultFilters)}>
              Clear filters
            </button>
          </>
        ) : null}
      </p>

      <ol className={styles.list}>
        {shown.map((item) => {
          const detail = details[item.i];
          if (!detail) {
            return weeksDone.has(item.w) ? null : <SkeletonRow key={item.i} />;
          }
          return (
            <NewsRow
              key={item.i}
              item={item}
              detail={detail}
              themes={index?.themes ?? null}
              onTheme={onTheme}
              onTicker={onTicker}
            />
          );
        })}
      </ol>

      {hasMore ? <div ref={sentinelRef} className={styles.sentinel} aria-hidden /> : null}

      {matches && !hasMore ? (
        matches.length === 0 ? (
          <p className={`muted ${styles.end}`}>No stories match these filters.</p>
        ) : (
          <p className={`muted ${styles.end}`}>
            That&apos;s everything from the {filters.days === 1 ? "past day" : `last ${filters.days} days`}.
          </p>
        )
      ) : null}
    </div>
  );
}

function SkeletonRow() {
  return (
    <li className={`${styles.row} ${styles.skeleton}`} aria-hidden>
      <span className={styles.skelLine} style={{ width: "72%" }} />
      <span className={styles.skelLine} style={{ width: "28%" }} />
      <span className={styles.skelLine} style={{ width: "94%" }} />
    </li>
  );
}

type RowProps = {
  item: AllNewsItemV0;
  detail: AllNewsDetailV0;
  themes: AllNewsIndexV0["themes"] | null;
  onTheme: (slug: string) => void;
  onTicker: (ticker: string) => void;
};

const NewsRow = memo(function NewsRow({ item, detail, themes, onTheme, onTicker }: RowProps) {
  const themeChips = themes ? (item.th ?? []).filter((t) => themes[t]).slice(0, MAX_THEME_CHIPS) : [];
  const tickerChips = (item.tk ?? []).slice(0, MAX_TICKER_CHIPS);

  return (
    <li className={styles.row}>
      <a className={styles.headline} href={detail.u} target="_blank" rel="noopener noreferrer">
        {detail.t}
      </a>
      <div className={styles.meta}>
        {detail.s ? <span className={styles.source}>{detail.s}</span> : null}
        <time dateTime={item.d}>{newsDayLabel(item.d)}</time>
        {themeChips.map((t) => (
          <button key={t} type="button" className={styles.chip} onClick={() => onTheme(t)}>
            {themes?.[t]?.n}
          </button>
        ))}
        {tickerChips.map((tk) => (
          <button key={tk} type="button" className={`${styles.chip} ${styles.tickerChip}`} onClick={() => onTicker(tk)}>
            {tk}
          </button>
        ))}
      </div>
      {detail.n ? <p className={styles.snippet}>{detail.n}</p> : null}
      {item.x ? <FullArticle id={item.i} /> : null}
    </li>
  );
});

function FullArticle({ id }: { id: string }) {
  const pathname = usePathname();
  const { configured, loading, userId } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const toggle = useCallback(async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (body != null) return;
    setState("loading");
    try {
      const { getBrowserSupabase } = await import("@/lib/supabase/browserClient");
      const sb = getBrowserSupabase();
      if (!sb) throw new Error("not configured");
      const { data, error } = await sb.from("news_article_text").select("body").eq("id", id).maybeSingle();
      if (error || !data?.body) throw new Error("missing");
      setBody(data.body as string);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [open, body, id]);

  if (!configured || loading) return null;

  if (!userId) {
    const signIn = href(`/sign-in?next=${encodeURIComponent(pathname || "/news")}`);
    return (
      <Link href={signIn} className={styles.fullToggle}>
        Sign in to read full article
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={styles.fullToggle} aria-expanded={open} onClick={() => void toggle()}>
        {open ? "Hide full article" : "Read full article"}
      </button>
      {open ? (
        state === "loading" ? (
          <p className={`muted ${styles.fullBody}`}>Loading…</p>
        ) : state === "error" ? (
          <p className={`muted ${styles.fullBody}`}>Full text isn&apos;t available for this story anymore.</p>
        ) : body ? (
          <div className={styles.fullBody}>{body}</div>
        ) : null
      ) : null}
    </>
  );
}
