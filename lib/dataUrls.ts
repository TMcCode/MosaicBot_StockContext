const DEFAULT_CDN = "https://storage.stockthemes.ai/stockcontext";

/** Public CDN URLs for ticker JSON assets (tables, chart, financials). */
export function publicDataFetchUrls(relativePath: string, buildId?: string): string[] {
  const override = process.env.NEXT_PUBLIC_STOCKCONTEXT_PUBLIC_BASE_URL?.trim();
  const base = (override || DEFAULT_CDN).replace(/\/$/, "");
  const rel = relativePath.replace(/^\//, "");
  const url = `${base}/${rel}`;
  if (buildId && process.env.NODE_ENV === "development") {
    return [`${url}?b=${encodeURIComponent(buildId)}`];
  }
  return [url];
}
