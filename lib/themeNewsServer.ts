import fs from "fs";
import path from "path";

import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/chart/stockthemesPublicBase";
import { parseThemeNewsIndex, themeNewsRelPath } from "@/lib/themeNews";
import type { ThemeNewsIndexV0 } from "@/lib/types/theme.news.v0";

/**
 * Build-time read of the baked theme news index (synced by scripts/sync-stockcontext-ci.mjs).
 * Dev falls back to the CDN when the local bake is missing.
 */
export async function loadThemeNewsIndex(slug: string): Promise<ThemeNewsIndexV0 | null> {
  const rel = themeNewsRelPath(slug, "index.v0.json");
  const local = path.join(process.cwd(), "public", "chart-data", "stockcontext", rel);
  try {
    if (fs.existsSync(local)) {
      return parseThemeNewsIndex(JSON.parse(fs.readFileSync(local, "utf8")));
    }
    if (process.env.NODE_ENV === "development") {
      const res = await fetch(`${STOCKTHEMES_PUBLIC_BASE_URL}/stockcontext/${rel}`, { cache: "no-store" });
      return res.ok ? parseThemeNewsIndex(await res.json()) : null;
    }
  } catch {
    return null;
  }
  return null;
}
