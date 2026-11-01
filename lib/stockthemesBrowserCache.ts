/** Default browser cache bucket for public stockthemes JSON (seconds). */
const DEFAULT_REVALIDATE_SEC = 120 * 60;

/**
 * Seconds before client cache-buster buckets roll.
 * Override with NEXT_PUBLIC_STOCKTHEMES_REVALIDATE_SEC.
 */
export function stockthemesRevalidateSeconds(): number {
  const raw =
    process.env.NEXT_PUBLIC_STOCKTHEMES_REVALIDATE_SEC?.trim() ||
    String(DEFAULT_REVALIDATE_SEC);
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.floor(seconds);
  }
  return DEFAULT_REVALIDATE_SEC;
}

/**
 * Query param for optional cache busting on client fetches.
 * Production: one bucket per revalidate window (HTTP cache can reuse).
 * Development: unique per request.
 */
export function stockthemesBrowserCacheBusterQuery(): string {
  if (process.env.NODE_ENV === "development") {
    return `ts=${Date.now()}`;
  }
  const windowMs = stockthemesRevalidateSeconds() * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  return `ts=${bucket}`;
}

/** Browser fetch cache mode for live / baked JSON hydration. */
export function stockthemesBrowserFetchCache(): RequestCache {
  return process.env.NODE_ENV === "development" ? "no-store" : "default";
}
