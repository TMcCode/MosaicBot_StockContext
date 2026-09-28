import fs from "fs";
import path from "path";

import { ALL_NEWS_INDEX_REL, allNewsWeekRel, parseAllNewsIndex, parseAllNewsWeek } from "@/lib/allNews";
import { STOCKTHEMES_PUBLIC_BASE_URL } from "@/lib/chart/stockthemesPublicBase";
import type { AllNewsDetailV0, AllNewsIndexV0, AllNewsStory } from "@/lib/types/news.all.v0";

/**
 * Build-time reads of the baked all-news feed (synced by scripts/sync-stockcontext-ci.mjs).
 * Dev falls back to the CDN when the local bake is missing.
 */
async function readBaked(rel: string): Promise<unknown | null> {
  const local = path.join(process.cwd(), "public", "chart-data", "stockcontext", rel);
  try {
    if (fs.existsSync(local)) return JSON.parse(fs.readFileSync(local, "utf8"));
    if (process.env.NODE_ENV === "development") {
      const res = await fetch(`${STOCKTHEMES_PUBLIC_BASE_URL}/stockcontext/${rel}`, { cache: "no-store" });
      return res.ok ? await res.json() : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadAllNewsIndex(): Promise<AllNewsIndexV0 | null> {
  return parseAllNewsIndex(await readBaked(ALL_NEWS_INDEX_REL));
}

/** Newest `limit` stories with display fields (reads only the week files they need). */
export async function loadLatestNewsStories(
  index: AllNewsIndexV0 | null,
  limit: number,
): Promise<AllNewsStory[]> {
  if (!index) return [];
  const head = index.items.slice(0, limit);
  const weeks: Record<string, Record<string, AllNewsDetailV0>> = {};
  for (const w of new Set(head.map((i) => i.w))) {
    weeks[w] = parseAllNewsWeek(await readBaked(allNewsWeekRel(w)));
  }
  return head.flatMap((item) => {
    const detail = weeks[item.w]?.[item.i];
    return detail ? [{ ...item, ...detail }] : [];
  });
}
