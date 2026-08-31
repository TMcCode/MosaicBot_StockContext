import { publicAssetPath } from "@/lib/links";

export const STOCKTHEMES_PUBLIC_BASE_URL = "https://storage.stockthemes.ai";

/** Root CDN for stockthemes public JSON (chart sidecars, SPY). */
export function stockthemesPublicDataBase(): string {
  const override = process.env.NEXT_PUBLIC_STOCKTHEMES_PUBLIC_BASE?.trim();
  return (override || STOCKTHEMES_PUBLIC_BASE_URL).replace(/\/$/, "");
}

/**
 * Browser chart fetches:
 * - dev: same-origin `/stockthemes-data` rewrite (CDN CORS only whitelists :3000)
 * - prod: same-origin `/chart-data` baked at build (static export; no CDN CORS)
 */
export function stockthemesBrowserChartFetchBase(): string {
  if (process.env.NODE_ENV === "development") {
    return "/stockthemes-data";
  }
  return publicAssetPath("/chart-data").replace(/\/$/, "");
}
