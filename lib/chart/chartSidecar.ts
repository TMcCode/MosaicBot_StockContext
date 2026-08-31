import type { ChartPerformanceSidecarV0 } from "@/lib/chart/types";
import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";

export const CHART_SIDECAR_SUFFIX = ".chart.v0.json";

export type OverlayEntityKind = "theme" | "ticker";

function parseChartPerformanceSidecar(raw: string): ChartPerformanceSidecarV0 | null {
  try {
    const data = JSON.parse(raw) as ChartPerformanceSidecarV0;
    if (data.schema_version !== "chart_performance.v0") return null;
    if (!data.slug || !data.name || !data.performance?.dates?.length || !data.performance?.values?.length) {
      return null;
    }
    if (data.entity_type !== "theme" && data.entity_type !== "ticker") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function sidecarRelPath(kind: OverlayEntityKind, slug: string): string {
  const enc = encodeURIComponent(slug);
  if (kind === "ticker") {
    return `tickers/${enc}${CHART_SIDECAR_SUFFIX}`;
  }
  return `themes/${enc}${CHART_SIDECAR_SUFFIX}`;
}

const sidecarResultCache = new Map<string, ChartPerformanceSidecarV0 | null>();
const sidecarInflight = new Map<string, Promise<ChartPerformanceSidecarV0 | null>>();

async function fetchSidecarText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "omit", cache: "default", signal });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

export async function fetchChartSidecar(
  kind: OverlayEntityKind,
  slug: string,
  signal?: AbortSignal,
): Promise<ChartPerformanceSidecarV0 | null> {
  const normalizedSlug = kind === "ticker" ? slug.trim().toUpperCase() : slug.trim();
  const key = `${kind}:${normalizedSlug}`;
  const cacheEnabled = process.env.NODE_ENV !== "development";

  if (cacheEnabled && sidecarResultCache.has(key)) return sidecarResultCache.get(key)!;

  const inflight = sidecarInflight.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const base = stockthemesBrowserChartFetchBase();
    const sidecarPath = sidecarRelPath(kind, normalizedSlug);
    const url = `${base}/${sidecarPath}`;
    const raw = await fetchSidecarText(url, signal);
    if (!raw) return null;
    return parseChartPerformanceSidecar(raw);
  })();

  sidecarInflight.set(key, promise);
  try {
    const result = await promise;
    if (result && cacheEnabled) sidecarResultCache.set(key, result);
    return result;
  } finally {
    sidecarInflight.delete(key);
  }
}
