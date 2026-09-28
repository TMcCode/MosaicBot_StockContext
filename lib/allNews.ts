import { stockthemesBrowserChartFetchBase, stockthemesPublicDataBase } from "@/lib/chart/stockthemesPublicBase";
import type {
  AllNewsDetailV0,
  AllNewsIndexV0,
  AllNewsLatestV0,
  AllNewsWeekV0,
} from "@/lib/types/news.all.v0";

export const ALL_NEWS_INDEX_REL = "news/all/index.v0.json";
export const ALL_NEWS_LATEST_REL = "news/all/latest.v0.json";

export function allNewsWeekRel(week: string): string {
  return `news/all/weeks/${week}.v0.json`;
}

export function parseAllNewsIndex(raw: unknown): AllNewsIndexV0 | null {
  const row = (raw ?? {}) as Partial<AllNewsIndexV0>;
  if (row.schema_version !== "news.all.index.v0" || !Array.isArray(row.items)) return null;
  return {
    schema_version: "news.all.index.v0",
    as_of: typeof row.as_of === "string" ? row.as_of : undefined,
    window_days: Number(row.window_days) || 90,
    total: Number(row.total) || row.items.length,
    themes: row.themes ?? {},
    groups: row.groups ?? {},
    weeks: Array.isArray(row.weeks) ? row.weeks : [],
    items: row.items.filter((i) => Boolean(i?.i && i?.d && i?.w)),
  };
}

export function parseAllNewsWeek(raw: unknown): Record<string, AllNewsDetailV0> {
  const row = (raw ?? {}) as Partial<AllNewsWeekV0>;
  return row.schema_version === "news.all.week.v0" && row.items ? row.items : {};
}

export function parseAllNewsLatest(raw: unknown): AllNewsLatestV0["items"] {
  const row = (raw ?? {}) as Partial<AllNewsLatestV0>;
  if (row.schema_version !== "news.all.latest.v0" || !Array.isArray(row.items)) return [];
  return row.items.filter((i) => Boolean(i?.i && i?.t && i?.u));
}

/** Set once the CDN refuses this origin (CORS) so later reads go straight to the baked copy. */
let liveBlocked = false;

/**
 * News is read live from the CDN (updates without a site rebuild); falls back to the copy
 * baked into /chart-data at build when the CDN is unreachable or not yet CORS-enabled.
 */
async function fetchNewsJson(rel: string, version?: string, signal?: AbortSignal): Promise<unknown | null> {
  const qs = version ? `?v=${encodeURIComponent(version)}` : "";
  if (!liveBlocked) {
    try {
      const res = await fetch(`${stockthemesPublicDataBase()}/stockcontext/${rel}${qs}`, {
        credentials: "omit",
        signal,
      });
      if (res.ok) return await res.json();
    } catch (err) {
      if (signal?.aborted) throw err;
      liveBlocked = true;
    }
  }
  const res = await fetch(`${stockthemesBrowserChartFetchBase()}/stockcontext/${rel}${qs}`, {
    credentials: "omit",
    signal,
  });
  return res.ok ? await res.json() : null;
}

export async function fetchAllNewsIndex(signal?: AbortSignal): Promise<AllNewsIndexV0 | null> {
  return parseAllNewsIndex(await fetchNewsJson(ALL_NEWS_INDEX_REL, undefined, signal));
}

export async function fetchAllNewsWeek(week: string, version?: string): Promise<Record<string, AllNewsDetailV0>> {
  return parseAllNewsWeek(await fetchNewsJson(allNewsWeekRel(week), version));
}

export async function fetchLatestHeadlines(signal?: AbortSignal): Promise<AllNewsLatestV0["items"]> {
  return parseAllNewsLatest(await fetchNewsJson(ALL_NEWS_LATEST_REL, undefined, signal));
}

export function newsDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const sameYear = y === new Date().getUTCFullYear();
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
