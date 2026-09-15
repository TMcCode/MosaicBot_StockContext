import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type { TickerThemeContextV0 } from "@/lib/types/ticker.theme_context.v0";

export const THEME_CONTEXT_SIDECAR_SUFFIX = ".theme_context.v0.json";

const resultCache = new Map<string, TickerThemeContextV0 | null>();
const inflight = new Map<string, Promise<TickerThemeContextV0 | null>>();

function parseThemeContext(raw: string): TickerThemeContextV0 | null {
  try {
    const data = JSON.parse(raw) as TickerThemeContextV0;
    if (data.schema_version !== "ticker.theme_context.v0") return null;
    if (!data.ticker || !Array.isArray(data.themes)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchTickerThemeContext(
  symbol: string,
  signal?: AbortSignal,
): Promise<TickerThemeContextV0 | null> {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return null;

  const cacheEnabled = process.env.NODE_ENV !== "development";
  if (cacheEnabled && resultCache.has(ticker)) return resultCache.get(ticker)!;

  const pending = inflight.get(ticker);
  if (pending) return pending;

  const promise = (async () => {
    const base = stockthemesBrowserChartFetchBase();
    const url = `${base}/tickers/${encodeURIComponent(ticker)}${THEME_CONTEXT_SIDECAR_SUFFIX}`;
    try {
      const res = await fetch(url, { credentials: "omit", cache: "default", signal });
      if (!res.ok) return null;
      return parseThemeContext(await res.text());
    } catch (e) {
      if (signal?.aborted) throw e;
      return null;
    }
  })();

  inflight.set(ticker, promise);
  try {
    const result = await promise;
    if (result && cacheEnabled) resultCache.set(ticker, result);
    return result;
  } finally {
    inflight.delete(ticker);
  }
}
