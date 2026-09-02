const DEFAULT_CDN = "https://storage.stockthemes.ai/stockcontext";

/**
 * Public CDN URLs for ticker/theme JSON assets.
 * In browser/dev prefer same-origin `/stockthemes-data` rewrite (next.config) so
 * CORS on storage.stockthemes.ai is not required for localhost:3002.
 */
export function publicDataFetchUrls(relativePath: string, buildId?: string): string[] {
  const override = process.env.NEXT_PUBLIC_STOCKCONTEXT_PUBLIC_BASE_URL?.trim();
  const rel = relativePath.replace(/^\//, "");
  const bust =
    buildId && process.env.NODE_ENV === "development"
      ? `?b=${encodeURIComponent(buildId)}`
      : "";

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    return [`/stockthemes-data/stockcontext/${rel}${bust}`];
  }

  const base = (override || DEFAULT_CDN).replace(/\/$/, "");
  return [`${base}/${rel}${bust}`];
}
