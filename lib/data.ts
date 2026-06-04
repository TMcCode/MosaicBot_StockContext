import fs from "fs";
import path from "path";

import { fetchPublicJsonText, STOCKCONTEXT_BUILD_CACHE_DIR } from "./stockcontextBuildCache";
import type {
  HomeFeeds,
  Manifest,
  RecentUpdatesMarquee,
  SearchIndex,
  TableBody,
  TablesIndex,
  ThemeMeta,
  ThemeTablesIndex,
  TickerMeta,
} from "./types";

const CACHE_DIR = path.join(process.cwd(), STOCKCONTEXT_BUILD_CACHE_DIR);

/** Build-time / CI: read from synced R2 cache (no runtime CDN fetches in production). */
function cachePath(relative: string): string {
  return path.join(CACHE_DIR, relative.replace(/^\//, ""));
}

function readJsonSync<T>(relative: string): T | null {
  const p = cachePath(relative);
  if (!fs.existsSync(p)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

async function readJsonOrFetch<T>(relative: string, buildId?: string): Promise<T | null> {
  try {
    const text = await fetchPublicJsonText(relative, { buildId });
    return JSON.parse(text) as T;
  } catch {
    return readJsonSync<T>(relative);
  }
}

/** Tier-1 bundle loaders — CDN on demand in dev, disk-only at build. */
export async function loadManifest(): Promise<Manifest | null> {
  return readJsonOrFetch<Manifest>("manifest.v0.json");
}

export async function loadHomeFeeds(): Promise<HomeFeeds | null> {
  return readJsonOrFetch<HomeFeeds>("feeds/home.v0.json");
}

export async function loadRecentUpdatesMarquee(): Promise<RecentUpdatesMarquee | null> {
  return readJsonOrFetch<RecentUpdatesMarquee>("feeds/recent_updates_marquee.v0.json");
}

export async function loadHomeFeedSection(
  sectionId: string,
): Promise<HomeFeeds["sections"][number] | null> {
  const safe = sectionId.replace(/[^a-z0-9_]/gi, "");
  if (!safe) {
    return null;
  }
  return readJsonOrFetch<HomeFeeds["sections"][number]>(`feeds/sections/${safe}.v0.json`);
}

/** Sync disk read for generateStaticParams and ticker/theme pages (Tier 2 CDN later). */
export function loadManifestSync(): Manifest | null {
  return readJsonSync<Manifest>("manifest.v0.json");
}

export type ResolvedHomeFeedSection = {
  section: HomeFeeds["sections"][number];
  /** True when only the 20-row home preview is available (full section file not synced). */
  previewOnly?: boolean;
};

/** Load overflow section: CDN/cache → home preview fallback. */
export async function resolveHomeFeedSection(
  sectionId: string,
): Promise<ResolvedHomeFeedSection | null> {
  const safe = sectionId.replace(/[^a-z0-9_]/gi, "");
  if (!safe) {
    return null;
  }

  const section = await loadHomeFeedSection(safe);
  if (section?.items?.length) {
    return { section };
  }

  const home = await loadHomeFeeds();
  const fromHome = home?.sections?.find((s) => s.id === safe);
  if (fromHome?.items?.length) {
    return { section: fromHome, previewOnly: true };
  }

  return null;
}

export function loadSearchIndex(): Promise<SearchIndex | null> {
  return readJsonOrFetch<SearchIndex>("search_index.v0.json");
}

export function loadTickerMeta(symbol: string): Promise<TickerMeta | null> {
  const sym = symbol.toUpperCase();
  return readJsonOrFetch<TickerMeta>(`tickers/${sym}/meta.v0.json`);
}

export function loadTickerTablesIndex(symbol: string): Promise<TablesIndex | null> {
  const sym = symbol.toUpperCase();
  return readJsonOrFetch<TablesIndex>(`tickers/${sym}/tables/index.v0.json`);
}

export function loadTableBody(relativeUrl: string, buildId?: string): Promise<TableBody | null> {
  const rel = relativeUrl.replace(/^\//, "");
  if (!rel) {
    return Promise.resolve(null);
  }
  return readJsonOrFetch<TableBody>(rel, buildId);
}

export function loadThemeMeta(slug: string): Promise<ThemeMeta | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) {
    return Promise.resolve(null);
  }
  return readJsonOrFetch<ThemeMeta>(`themes/${safe}/meta.v0.json`);
}

export function loadThemeTablesIndex(slug: string): Promise<ThemeTablesIndex | null> {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  if (!safe) {
    return Promise.resolve(null);
  }
  return readJsonOrFetch<ThemeTablesIndex>(`themes/${safe}/tables/index.v0.json`);
}

export function allTickerSymbols(): string[] {
  const m = loadManifestSync();
  if (!m?.tickers?.length) {
    return [];
  }
  return m.tickers.map((t) => t.symbol.toUpperCase());
}

export function allThemeSlugs(): string[] {
  const m = loadManifestSync();
  if (!m?.themes?.length) {
    return [];
  }
  return m.themes
    .filter((t) => t.has_table_data !== false && t.meta_url)
    .map((t) => t.slug);
}

export function sitePaths() {
  return { cacheDir: CACHE_DIR, hasCache: fs.existsSync(cachePath("manifest.v0.json")) };
}
