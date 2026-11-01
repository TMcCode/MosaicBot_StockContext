import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import {
  stockthemesBrowserCacheBusterQuery,
  stockthemesBrowserFetchCache,
} from "@/lib/stockthemesBrowserCache";
import type { ThemeCorrelationBundleV0 } from "@/lib/types/theme.correlation_bundle.v0";
import type { ThemeFactorProfileV0 } from "@/lib/types/theme.factor_profile.v0";
import type {
  ThemeCohesionHorizonV0,
  ThemeConstituentFitV0,
  ThemeFactorAttributionHorizon,
  ThemeFactorAttributionV0,
} from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";
import type {
  ThemeNeighborRowV0,
  ThemeThemeNeighborsV0,
} from "@/lib/types/theme.theme_neighbors.v0";

export const FACTOR_PROFILE_SIDECAR_SUFFIX = ".factor_profile.v0.json";
export const FACTOR_ATTRIBUTION_SIDECAR_SUFFIX = ".factor_attribution.v0.json";
export const STOCK_CORRELATIONS_SIDECAR_SUFFIX = ".stock_correlations.v0.json";
export const THEME_NEIGHBORS_SIDECAR_SUFFIX = ".theme_neighbors.v0.json";
export const CORRELATION_BUNDLE_SIDECAR_SUFFIX = ".correlation_bundle.v0.json";

export const FACTOR_ATTRIBUTION_HORIZON_ORDER: ThemeFactorAttributionHorizon[] = [
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "3Y",
  "5Y",
  "10Y",
];

function finite(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function fetchJson(
  path: string,
  signal?: AbortSignal,
): Promise<unknown | null> {
  const base = stockthemesBrowserChartFetchBase();
  const buster = stockthemesBrowserCacheBusterQuery();
  const url = `${base}/${path.replace(/^\//, "")}?${buster}`;
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: stockthemesBrowserFetchCache(),
      signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

const bundleResultCache = new Map<string, ThemeCorrelationBundleV0 | null>();
const bundleInflight = new Map<string, Promise<ThemeCorrelationBundleV0 | null>>();

function parseFactorProfile(raw: unknown): ThemeFactorProfileV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.factor_profile.v0") return null;
  return raw as ThemeFactorProfileV0;
}

function constituentFit(value: unknown): ThemeConstituentFitV0 | null {
  const row = record(value);
  const ticker = text(row.ticker).toUpperCase();
  const sampleSize = finite(row.sample_size);
  const coveragePct = finite(row.coverage_pct);
  if (!ticker || sampleSize == null || coveragePct == null) return null;
  return {
    ticker,
    sample_size: Math.max(0, Math.round(sampleSize)),
    coverage_pct: coveragePct,
    correlation_to_theme: finite(row.correlation_to_theme),
    market_adjusted_correlation: finite(row.market_adjusted_correlation),
    beta_to_theme: finite(row.beta_to_theme),
    theme_r2: finite(row.theme_r2),
    stock_specific_share: finite(row.stock_specific_share),
  };
}

function cohesionHorizon(value: unknown): ThemeCohesionHorizonV0 | null {
  const row = record(value);
  const validConstituents = finite(row.valid_constituents);
  const coveragePct = finite(row.coverage_pct);
  if (validConstituents == null || coveragePct == null) return null;
  const constituents = (Array.isArray(row.constituents) ? row.constituents : [])
    .map(constituentFit)
    .filter((item): item is ThemeConstituentFitV0 => item != null);
  return {
    valid_constituents: Math.max(0, Math.round(validConstituents)),
    coverage_pct: coveragePct,
    median_correlation: finite(row.median_correlation),
    weighted_average_correlation: finite(row.weighted_average_correlation),
    market_adjusted_median_correlation: finite(row.market_adjusted_median_correlation),
    dispersion: finite(row.dispersion),
    pct_above_0_50: finite(row.pct_above_0_50),
    pct_negative: finite(row.pct_negative),
    global_rank: finite(row.global_rank),
    global_theme_count: finite(row.global_theme_count),
    global_percentile: finite(row.global_percentile),
    market_adjusted_global_rank: finite(row.market_adjusted_global_rank),
    market_adjusted_global_theme_count: finite(row.market_adjusted_global_theme_count),
    market_adjusted_global_percentile: finite(row.market_adjusted_global_percentile),
    group_rank: finite(row.group_rank),
    group_theme_count: finite(row.group_theme_count),
    group_percentile: finite(row.group_percentile),
    market_adjusted_group_rank: finite(row.market_adjusted_group_rank),
    market_adjusted_group_theme_count: finite(row.market_adjusted_group_theme_count),
    market_adjusted_group_percentile: finite(row.market_adjusted_group_percentile),
    constituents,
  };
}

function parseAttribution(raw: unknown): ThemeFactorAttributionV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.factor_attribution.v0") return null;
  const slug = text(row.slug);
  if (!slug) return null;
  const cohesionRaw = record(row.cohesion);
  const cohesion: ThemeFactorAttributionV0["cohesion"] = {};
  for (const horizon of FACTOR_ATTRIBUTION_HORIZON_ORDER) {
    const block = cohesionHorizon(cohesionRaw[horizon]);
    if (block) cohesion[horizon] = block;
  }
  const horizon1y = record(record(row.horizons)["1Y"]);
  const sampleSize1y = finite(horizon1y.sample_size);
  return {
    schema_version: "theme.factor_attribution.v0",
    slug,
    as_of: text(row.as_of) || undefined,
    methodology_version: text(row.methodology_version) || undefined,
    history_method: text(row.history_method) || undefined,
    ...(sampleSize1y == null
      ? {}
      : { sample_size_1y: Math.max(0, Math.round(sampleSize1y)) }),
    cohesion,
  };
}

function parseStockCorrelations(raw: unknown): ThemeStockCorrelationsV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.stock_correlations.v0") return null;
  const slug = text(row.slug);
  const window = text(row.window) || "1Y";
  const tickersRaw = Array.isArray(row.tickers) ? row.tickers : [];
  const tickers = tickersRaw
    .map((item) => {
      if (typeof item === "string") {
        const ticker = item.trim().toUpperCase();
        return ticker ? { ticker } : null;
      }
      const rec = record(item);
      const ticker = text(rec.ticker).toUpperCase();
      if (!ticker) return null;
      const weight = finite(rec.weight);
      return { ticker, ...(weight == null ? {} : { weight }) };
    })
    .filter((item): item is { ticker: string; weight?: number } => item != null);
  const matrixRaw = Array.isArray(row.matrix) ? row.matrix : [];
  if (!slug || tickers.length < 2 || matrixRaw.length !== tickers.length) return null;
  // Reject ragged rows (legacy publish bug stripped null cells and left-shifted values).
  const matrix: Array<Array<number | null>> = [];
  for (const rawRow of matrixRaw) {
    if (!Array.isArray(rawRow) || rawRow.length !== tickers.length) return null;
    matrix.push(
      rawRow.map((cell) => {
        if (cell == null) return null;
        const n = typeof cell === "number" ? cell : Number(cell);
        return Number.isFinite(n) ? n : null;
      }),
    );
  }
  return {
    schema_version: "theme.stock_correlations.v0",
    slug,
    theme: text(row.theme) || undefined,
    as_of: text(row.as_of) || undefined,
    window,
    max_tickers: Math.max(tickers.length, Math.round(finite(row.max_tickers) || tickers.length)),
    tickers,
    matrix,
  };
}

export async function fetchThemeFactorProfile(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeFactorProfileV0 | null> {
  const raw = await fetchJson(
    `themes/${encodeURIComponent(slug)}${FACTOR_PROFILE_SIDECAR_SUFFIX}`,
    signal,
  );
  return parseFactorProfile(raw);
}

export async function fetchThemeFactorAttribution(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeFactorAttributionV0 | null> {
  const raw = await fetchJson(
    `themes/${encodeURIComponent(slug)}${FACTOR_ATTRIBUTION_SIDECAR_SUFFIX}`,
    signal,
  );
  return parseAttribution(raw);
}

export async function fetchThemeStockCorrelations(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeStockCorrelationsV0 | null> {
  const raw = await fetchJson(
    `themes/${encodeURIComponent(slug)}${STOCK_CORRELATIONS_SIDECAR_SUFFIX}`,
    signal,
  );
  return parseStockCorrelations(raw);
}

function neighborRow(value: unknown): ThemeNeighborRowV0 | null {
  const row = record(value);
  const slug = text(row.slug);
  const theme = text(row.theme);
  const correlation = finite(row.correlation);
  if (!slug || !theme || correlation == null) return null;
  const overlap = finite(row.overlapping_ticker_count);
  return {
    slug,
    theme,
    correlation,
    ...(overlap == null ? {} : { overlapping_ticker_count: Math.max(0, Math.round(overlap)) }),
  };
}

function neighborList(value: unknown): ThemeNeighborRowV0[] {
  return (Array.isArray(value) ? value : [])
    .map(neighborRow)
    .filter((item): item is ThemeNeighborRowV0 => item != null);
}

const OUTSIDE_TILE_LIMIT = 3;
const IN_GROUP_TILE_LIMIT = 5;

function takeNeighborExtreme(
  rows: ThemeNeighborRowV0[],
  direction: "highest" | "lowest",
  limit: number,
): ThemeNeighborRowV0[] {
  if (rows.length === 0) return [];
  const sorted =
    direction === "highest"
      ? [...rows].sort((a, b) => b.correlation - a.correlation || a.theme.localeCompare(b.theme))
      : [...rows].sort((a, b) => a.correlation - b.correlation || a.theme.localeCompare(b.theme));
  return sorted.slice(0, limit);
}

function parseThemeNeighbors(raw: unknown): ThemeThemeNeighborsV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.theme_neighbors.v0") return null;
  const slug = text(row.slug);
  const window = text(row.window) || "1Y";
  const aggType = text(row.agg_type) || "manual_theme_weights";
  if (!slug) return null;
  let closestInGroup = neighborList(row.closest_in_group);
  let furthestInGroup = neighborList(row.furthest_in_group);
  let closestAcross = neighborList(row.closest_across);
  let furthestOutside = neighborList(row.furthest_outside);
  // Legacy sidecars: full in_group + closest_outside / least_related_outside.
  if (!closestInGroup.length && !furthestInGroup.length) {
    const legacyInGroup = neighborList(row.in_group);
    closestInGroup = takeNeighborExtreme(legacyInGroup, "highest", IN_GROUP_TILE_LIMIT);
    furthestInGroup = takeNeighborExtreme(legacyInGroup, "lowest", IN_GROUP_TILE_LIMIT);
  }
  if (!closestAcross.length) {
    closestAcross = neighborList(row.closest_outside).slice(0, OUTSIDE_TILE_LIMIT);
  }
  if (!furthestOutside.length) {
    furthestOutside = neighborList(row.least_related_outside).slice(0, OUTSIDE_TILE_LIMIT);
  }
  const total = finite(row.in_group_total);
  return {
    schema_version: "theme.theme_neighbors.v0",
    slug,
    theme: text(row.theme) || undefined,
    as_of: text(row.as_of) || undefined,
    window,
    agg_type: aggType,
    group: text(row.group) || undefined,
    in_group_total: Math.max(0, Math.round(total ?? 0)),
    closest_in_group: closestInGroup,
    furthest_in_group: furthestInGroup,
    closest_across: closestAcross,
    furthest_outside: furthestOutside,
  };
}

export async function fetchThemeNeighbors(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeThemeNeighborsV0 | null> {
  const raw = await fetchJson(
    `themes/${encodeURIComponent(slug)}${THEME_NEIGHBORS_SIDECAR_SUFFIX}`,
    signal,
  );
  return parseThemeNeighbors(raw);
}

function parseCorrelationBundle(raw: unknown): ThemeCorrelationBundleV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.correlation_bundle.v0") return null;
  const slug = text(row.slug);
  if (!slug) return null;
  const stockCorrelations =
    row.stock_correlations == null ? null : parseStockCorrelations(row.stock_correlations);
  const attribution = row.attribution == null ? null : parseAttribution(row.attribution);
  const neighbors = row.neighbors == null ? null : parseThemeNeighbors(row.neighbors);
  if (!stockCorrelations && !attribution && !neighbors) return null;
  return {
    schema_version: "theme.correlation_bundle.v0",
    slug,
    as_of: text(row.as_of) || undefined,
    stock_correlations: stockCorrelations,
    attribution,
    neighbors,
  };
}

function emptyBundle(slug: string): ThemeCorrelationBundleV0 {
  return {
    schema_version: "theme.correlation_bundle.v0",
    slug,
    stock_correlations: null,
    attribution: null,
    neighbors: null,
  };
}

async function fetchCorrelationBundleParts(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeCorrelationBundleV0> {
  const [stockCorrelations, attribution, neighbors] = await Promise.all([
    fetchThemeStockCorrelations(slug, signal),
    fetchThemeFactorAttribution(slug, signal),
    fetchThemeNeighbors(slug, signal),
  ]);
  if (!stockCorrelations && !attribution && !neighbors) {
    return emptyBundle(slug);
  }
  return {
    schema_version: "theme.correlation_bundle.v0",
    slug,
    as_of:
      attribution?.as_of || stockCorrelations?.as_of || neighbors?.as_of || undefined,
    stock_correlations: stockCorrelations,
    attribution,
    neighbors,
  };
}

/**
 * Prefer one-request `.correlation_bundle.v0.json`; fall back to the three legacy sidecars.
 * Process-lifetime cache mirrors chart sidecars (prod only).
 */
export async function fetchThemeCorrelationBundle(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemeCorrelationBundleV0 | null> {
  const key = slug.trim();
  if (!key) return null;
  const cacheEnabled = process.env.NODE_ENV !== "development";
  if (cacheEnabled && bundleResultCache.has(key)) return bundleResultCache.get(key)!;

  const inflight = bundleInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const raw = await fetchJson(
      `themes/${encodeURIComponent(key)}${CORRELATION_BUNDLE_SIDECAR_SUFFIX}`,
      signal,
    );
    const bundled = raw != null ? parseCorrelationBundle(raw) : null;
    if (bundled) return bundled;
    const parts = await fetchCorrelationBundleParts(key, signal);
    const hasAnything =
      Boolean(parts.stock_correlations) ||
      Boolean(parts.attribution) ||
      Boolean(parts.neighbors);
    return hasAnything ? parts : null;
  })();

  bundleInflight.set(key, promise);
  try {
    const result = await promise;
    if (cacheEnabled) bundleResultCache.set(key, result);
    return result;
  } finally {
    bundleInflight.delete(key);
  }
}

export function availableCohesionHorizons(
  payload: ThemeFactorAttributionV0 | null,
): ThemeFactorAttributionHorizon[] {
  if (!payload) return [];
  return FACTOR_ATTRIBUTION_HORIZON_ORDER.filter((h) => Boolean(payload.cohesion[h]));
}
