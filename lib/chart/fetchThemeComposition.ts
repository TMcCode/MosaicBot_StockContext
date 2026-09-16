import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type {
  ChartCompositionIndexedV0,
  ChartCompositionSeriesV0,
  ThemeCompositionSidecarV0,
} from "@/lib/chart/types";

export const THEME_COMPOSITION_SIDECAR_SUFFIX = ".composition.v0.json";

const resultCache = new Map<string, ChartCompositionIndexedV0 | null>();
const inflight = new Map<string, Promise<ChartCompositionIndexedV0 | null>>();

function parseSeries(raw: unknown): ChartCompositionSeriesV0 | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const ticker = String(row.ticker || "")
    .trim()
    .toUpperCase();
  const dates = Array.isArray(row.dates) ? row.dates.map(String) : [];
  const values = Array.isArray(row.values) ? row.values.map(Number) : [];
  if (!ticker || dates.length < 2 || values.length < 2) return null;
  const name = typeof row.name === "string" ? row.name.trim() : undefined;
  return { ticker, dates, values, ...(name ? { name } : {}) };
}

function parseCompositionIndexed(raw: unknown): ChartCompositionIndexedV0 | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const series = (Array.isArray(row.series) ? row.series : [])
    .map(parseSeries)
    .filter((s): s is ChartCompositionSeriesV0 => s != null);
  if (!series.length) return null;
  return {
    basis: typeof row.basis === "string" ? row.basis : undefined,
    display: typeof row.display === "string" ? row.display : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    series,
  };
}

function parseSlimCompositionSidecar(raw: string): ChartCompositionIndexedV0 | null {
  try {
    const data = JSON.parse(raw) as ThemeCompositionSidecarV0;
    if (data.schema_version !== "theme.composition.v0") return null;
    return parseCompositionIndexed(data.composition_indexed);
  } catch {
    return null;
  }
}

/** Dev-only fallback parser for full themes/{slug}.json. */
function parseFullThemeJsonComposition(raw: string): ChartCompositionIndexedV0 | null {
  try {
    const data = JSON.parse(raw) as {
      composition_indexed?: unknown;
      chart_1y?: { composition_indexed?: unknown };
    };
    return (
      parseCompositionIndexed(data.composition_indexed) ||
      parseCompositionIndexed(data.chart_1y?.composition_indexed)
    );
  } catch {
    return null;
  }
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "omit", cache: "default", signal });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

/**
 * Slim composition sidecar only in production.
 * Dev may fall back to full theme JSON via the CDN rewrite.
 */
export async function fetchThemeCompositionIndexed(
  slug: string,
  signal?: AbortSignal,
): Promise<ChartCompositionIndexedV0 | null> {
  const key = slug.trim();
  if (!key) return null;

  if (resultCache.has(key)) return resultCache.get(key)!;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const base = stockthemesBrowserChartFetchBase();
    const slimUrl = `${base}/themes/${encodeURIComponent(key)}${THEME_COMPOSITION_SIDECAR_SUFFIX}`;
    const slimRaw = await fetchText(slimUrl, signal);
    if (slimRaw) {
      const parsed = parseSlimCompositionSidecar(slimRaw);
      if (parsed) return parsed;
    }

    // Avoid fat themes/{slug}.json downloads in production / static export.
    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    const fullUrl = `${base}/themes/${encodeURIComponent(key)}.json`;
    const fullRaw = await fetchText(fullUrl, signal);
    if (!fullRaw) return null;
    return parseFullThemeJsonComposition(fullRaw);
  })();

  inflight.set(key, promise);
  try {
    const result = await promise;
    resultCache.set(key, result);
    return result;
  } finally {
    inflight.delete(key);
  }
}
