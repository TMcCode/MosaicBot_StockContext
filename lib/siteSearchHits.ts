import type Fuse from "fuse.js";

import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import { themeHasPublishedPage } from "@/lib/themePage";
import type { SearchIndex, SearchThemeRow, SearchTickerRow } from "@/lib/types";

export type SiteSearchFuseRow =
  | { kind: "ticker"; text: string; ref: SearchTickerRow }
  | { kind: "theme"; text: string; ref: SearchThemeRow };

export type SiteSearchHit =
  | { kind: "ticker"; ref: SearchTickerRow; key: string }
  | { kind: "theme"; ref: SearchThemeRow; key: string };

export type SiteSearchEngine = { index: SearchIndex; fuse: Fuse<SiteSearchFuseRow> };

/** Fuse score; lower is better. Drop weak fuzzy noise (esp. ticker-like queries). */
const FUZZY_MAX_SCORE = 0.42;
const FUZZY_MAX_SCORE_TICKERISH = 0.35;

export function parseSiteSearchIndex(raw: string): SearchIndex {
  const data = JSON.parse(raw) as SearchIndex;
  if (data.schema_version !== 0) {
    throw new Error(`Unsupported search index schema_version: ${data.schema_version}`);
  }
  if (!Array.isArray(data.tickers)) {
    throw new Error("Invalid search index JSON");
  }
  return data;
}

export function buildThemeNameToSlug(index: SearchIndex): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of index.themes ?? []) {
    if (themeHasPublishedPage(t)) {
      out.set(t.name, t.slug);
    }
  }
  return out;
}

export function buildThemeSlugToName(index: SearchIndex): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of index.themes ?? []) {
    out.set(t.slug, t.name);
  }
  return out;
}

export function buildSiteSearchFuseRows(index: SearchIndex): SiteSearchFuseRow[] {
  const rows: SiteSearchFuseRow[] = [];
  for (const t of index.tickers) {
    const parts = [t.symbol, t.name ?? "", t.company_name ?? "", ...(t.theme_names ?? [])];
    if (t.search_text) {
      parts.push(t.search_text);
    }
    rows.push({ kind: "ticker", text: parts.join(" ").trim(), ref: t });
  }
  for (const t of index.themes ?? []) {
    const parts = [t.name, t.slug];
    if (t.search_text) {
      parts.push(t.search_text);
    }
    rows.push({ kind: "theme", text: parts.join(" ").trim(), ref: t });
  }
  return rows;
}

/** True for bare ticker-ish queries (e.g. LINC, BRK.B, 2330.TW) — not free text. */
export function isTickerishQuery(query: string): boolean {
  const q = query.trim();
  if (!q || /\s/.test(q)) return false;
  // Letters/digits/dot/hyphen, 1–12 chars (covers LINC, BRK.B, 2330.TW).
  return /^[A-Za-z0-9][A-Za-z0-9.\-]{0,11}$/.test(q);
}

export function collectSiteSearchHits(
  index: SearchIndex,
  fuse: Fuse<SiteSearchFuseRow>,
  query: string,
  limit = 12,
): SiteSearchHit[] {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const seen = new Set<string>();
  const out: SiteSearchHit[] = [];
  const tickerish = isTickerishQuery(q);
  const upper = q.toUpperCase();

  if (tickerish) {
    const matches = index.tickers.filter((t) => t.symbol.toUpperCase().startsWith(upper));
    matches.sort((a, b) => {
      const au = a.symbol.toUpperCase();
      const bu = b.symbol.toUpperCase();
      const ex = au === upper ? 0 : 1;
      const ey = bu === upper ? 0 : 1;
      if (ex !== ey) return ex - ey;
      return au.localeCompare(bu);
    });
    for (const t of matches.slice(0, 8)) {
      const key = `t:${t.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: "ticker", ref: t, key });
      if (out.length >= limit) return out;
    }
  }

  const maxScore = tickerish ? FUZZY_MAX_SCORE_TICKERISH : FUZZY_MAX_SCORE;
  const results = fuse.search(q, { limit: Math.max(limit * 2, 20) });

  for (const r of results) {
    if (typeof r.score === "number" && r.score > maxScore) {
      continue;
    }
    const row = r.item;
    const key = row.kind === "ticker" ? `t:${row.ref.symbol}` : `th:${row.ref.slug}`;
    if (seen.has(key)) {
      continue;
    }
    // For ticker-like queries, don't pad with weak theme noise once we have a ticker hit.
    if (tickerish && row.kind === "theme" && out.some((h) => h.kind === "ticker")) {
      if (typeof r.score === "number" && r.score > 0.28) {
        continue;
      }
    }
    seen.add(key);
    if (row.kind === "ticker") {
      out.push({ kind: "ticker", ref: row.ref, key });
    } else {
      out.push({ kind: "theme", ref: row.ref, key });
    }
    if (out.length >= limit) break;
  }

  return out;
}

export function newSiteSearchFuse(index: SearchIndex, FuseCtor: typeof import("fuse.js").default) {
  return new FuseCtor(buildSiteSearchFuseRows(index), {
    keys: ["text"],
    threshold: 0.38,
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: true,
  }) as Fuse<SiteSearchFuseRow>;
}

async function fetchSearchIndexRaw(): Promise<string> {
  const urls = searchIndexFetchUrls();
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return await res.text();
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Failed to load search index");
}

let searchIndexCache: Promise<SearchIndex> | null = null;
let searchEngineCache: Promise<SiteSearchEngine> | null = null;

/** Fetch + parse search index only (no fuse.js). Cached for the browser session. */
export function loadSearchIndex(): Promise<SearchIndex> {
  if (!searchIndexCache) {
    searchIndexCache = fetchSearchIndexRaw()
      .then(parseSiteSearchIndex)
      .catch((err: unknown) => {
        searchIndexCache = null;
        throw err;
      });
  }
  return searchIndexCache;
}

export function loadSiteSearchEngine(): Promise<SiteSearchEngine> {
  if (!searchEngineCache) {
    searchEngineCache = loadSearchIndex()
      .then(async (index) => {
        const { default: FuseCtor } = await import("fuse.js");
        return { index, fuse: newSiteSearchFuse(index, FuseCtor) };
      })
      .catch((err: unknown) => {
        searchEngineCache = null;
        throw err;
      });
  }
  return searchEngineCache;
}
