import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type { AllNewsDetailV0, AllNewsIndexV0, AllNewsWeekV0 } from "@/lib/types/news.all.v0";

export const ALL_NEWS_INDEX_REL = "news/all/index.v0.json";

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

/** Same-origin in prod (baked into /chart-data at build); CDN rewrite in dev. */
function browserUrl(rel: string, version?: string): string {
  const base = `${stockthemesBrowserChartFetchBase()}/stockcontext/${rel}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function fetchAllNewsIndex(version?: string, signal?: AbortSignal): Promise<AllNewsIndexV0 | null> {
  const res = await fetch(browserUrl(ALL_NEWS_INDEX_REL, version), { credentials: "omit", signal });
  return res.ok ? parseAllNewsIndex(await res.json()) : null;
}

export async function fetchAllNewsWeek(
  week: string,
  version?: string,
): Promise<Record<string, AllNewsDetailV0>> {
  const res = await fetch(browserUrl(allNewsWeekRel(week), version), { credentials: "omit" });
  return res.ok ? parseAllNewsWeek(await res.json()) : {};
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
