import type Fuse from "fuse.js";

import { searchIndexFetchUrls } from "@/lib/searchIndexUrl";
import type { SearchIndex, SearchThemeRow, SearchTickerRow } from "@/lib/types";

export type SiteSearchFuseRow =
  | { kind: "ticker"; text: string; ref: SearchTickerRow }
  | { kind: "theme"; text: string; ref: SearchThemeRow };

export type SiteSearchHit =
  | { kind: "ticker"; ref: SearchTickerRow; key: string }
  | { kind: "theme"; ref: SearchThemeRow; key: string };

export type SiteSearchEngine = { index: SearchIndex; fuse: Fuse<SiteSearchFuseRow> };

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
    out.set(t.name, t.slug);
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

export function collectSiteSearchHits(
  _index: SearchIndex,
  fuse: Fuse<SiteSearchFuseRow>,
  query: string,
  limit = 12,
): SiteSearchHit[] {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const results = fuse.search(q, { limit });
  const out: SiteSearchHit[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    const row = r.item;
    const key = row.kind === "ticker" ? `t:${row.ref.symbol}` : `th:${row.ref.slug}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (row.kind === "ticker") {
      out.push({ kind: "ticker", ref: row.ref, key });
    } else {
      out.push({ kind: "theme", ref: row.ref, key });
    }
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
