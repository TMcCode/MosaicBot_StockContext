const DEFAULT_OBJECT = "search_index.v0.json";
const DEFAULT_CDN = "https://storage.stockthemes.ai/stockcontext";

function clientBasePath(): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    return "";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Prefer CDN first so newly published tickers (e.g. portfolio adds) appear in search
 * before the next GitHub Pages rebuild. Same-origin bundle remains a fallback.
 * Dev also prefers CDN for freshness.
 */
export function searchIndexFetchUrls(): string[] {
  const override = process.env.NEXT_PUBLIC_STOCKCONTEXT_SEARCH_INDEX_URL?.trim();
  if (override) {
    return [override];
  }
  const prefix = clientBasePath();
  const sameOrigin = `${prefix}/${DEFAULT_OBJECT}`.replace(/\/{2,}/g, "/");
  const cdn = (process.env.NEXT_PUBLIC_STOCKCONTEXT_PUBLIC_BASE_URL ?? DEFAULT_CDN)
    .trim()
    .replace(/\/$/, "");
  const upstream = `${cdn}/${DEFAULT_OBJECT}`;
  return [upstream, sameOrigin];
}
