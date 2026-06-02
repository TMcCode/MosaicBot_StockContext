import fs from "fs";
import path from "path";

import type {
  HomeFeeds,
  Manifest,
  SearchIndex,
  TableBody,
  TablesIndex,
  ThemeMeta,
  TickerMeta,
} from "./types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "stockcontext-public");

/** Build-time / CI: read from synced R2 cache (no runtime CDN fetches in production). */
function cachePath(relative: string): string {
  return path.join(CACHE_DIR, relative.replace(/^\//, ""));
}

function readJson<T>(relative: string): T | null {
  const p = cachePath(relative);
  if (!fs.existsSync(p)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

export function loadManifest(): Manifest | null {
  return readJson<Manifest>("manifest.v0.json");
}

export function loadHomeFeeds(): HomeFeeds | null {
  return readJson<HomeFeeds>("feeds/home.v0.json");
}

export function loadSearchIndex(): SearchIndex | null {
  return readJson<SearchIndex>("search_index.v0.json");
}

export function loadTickerMeta(symbol: string): TickerMeta | null {
  return readJson<TickerMeta>(`tickers/${symbol.toUpperCase()}/meta.v0.json`);
}

export function loadTickerTablesIndex(symbol: string): TablesIndex | null {
  return readJson<TablesIndex>(`tickers/${symbol.toUpperCase()}/tables/index.v0.json`);
}

export function loadTableBody(relativeUrl: string): TableBody | null {
  return readJson<TableBody>(relativeUrl);
}

export function loadThemeMeta(slug: string): ThemeMeta | null {
  return readJson<ThemeMeta>(`themes/${slug}/meta.v0.json`);
}

export function allTickerSymbols(): string[] {
  const m = loadManifest();
  if (!m?.tickers?.length) {
    return [];
  }
  return m.tickers.map((t) => t.symbol.toUpperCase());
}

export function allThemeSlugs(): string[] {
  const m = loadManifest();
  if (!m?.themes?.length) {
    return [];
  }
  return m.themes.map((t) => t.slug);
}

export function sitePaths() {
  return { cacheDir: CACHE_DIR, hasCache: fs.existsSync(cachePath("manifest.v0.json")) };
}
