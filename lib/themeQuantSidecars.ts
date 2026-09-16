import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type { ThemeFactorProfileV0 } from "@/lib/types/theme.factor_profile.v0";
import type {
  ThemeCohesionHorizonV0,
  ThemeConstituentFitV0,
  ThemeFactorAttributionHorizon,
  ThemeFactorAttributionV0,
} from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";

export const FACTOR_PROFILE_SIDECAR_SUFFIX = ".factor_profile.v0.json";
export const FACTOR_ATTRIBUTION_SIDECAR_SUFFIX = ".factor_attribution.v0.json";
export const STOCK_CORRELATIONS_SIDECAR_SUFFIX = ".stock_correlations.v0.json";

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
  const url = `${base}/${path.replace(/^\//, "")}`;
  try {
    // Avoid stale top-12 matrices after CDN/bake bumps (Pages JSON can be cached ~10m).
  const res = await fetch(url, { credentials: "omit", cache: "no-store", signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

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
  return {
    schema_version: "theme.factor_attribution.v0",
    slug,
    as_of: text(row.as_of) || undefined,
    methodology_version: text(row.methodology_version) || undefined,
    history_method: text(row.history_method) || undefined,
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
  const matrix = Array.isArray(row.matrix) ? row.matrix : [];
  if (!slug || tickers.length < 2 || matrix.length !== tickers.length) return null;
  return {
    schema_version: "theme.stock_correlations.v0",
    slug,
    theme: text(row.theme) || undefined,
    as_of: text(row.as_of) || undefined,
    window,
    max_tickers: Math.max(tickers.length, Math.round(finite(row.max_tickers) || tickers.length)),
    tickers,
    matrix: matrix as Array<Array<number | null>>,
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

export function availableCohesionHorizons(
  payload: ThemeFactorAttributionV0 | null,
): ThemeFactorAttributionHorizon[] {
  if (!payload) return [];
  return FACTOR_ATTRIBUTION_HORIZON_ORDER.filter((h) => Boolean(payload.cohesion[h]));
}
