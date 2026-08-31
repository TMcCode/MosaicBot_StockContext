export const STOCKTHEMES_PUBLIC_BASE_URL = "https://storage.stockthemes.ai";

/** Root CDN for stockthemes public JSON (chart sidecars, SPY). */
export function stockthemesPublicDataBase(): string {
  const override = process.env.NEXT_PUBLIC_STOCKTHEMES_PUBLIC_BASE?.trim();
  return (override || STOCKTHEMES_PUBLIC_BASE_URL).replace(/\/$/, "");
}

/**
 * Browser chart fetches — dev uses same-origin `/stockthemes-data` rewrite (CDN CORS
 * whitelists localhost:3000 only; stockcontext runs on :3001).
 */
export function stockthemesBrowserChartFetchBase(): string {
  if (process.env.NODE_ENV === "development") {
    return "/stockthemes-data";
  }
  return stockthemesPublicDataBase();
}
