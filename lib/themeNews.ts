import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type { ThemeNewsItemV0, ThemeNewsIndexV0, ThemeNewsMonthV0 } from "@/lib/types/theme.news.v0";

export function themeNewsRelPath(slug: string, file: string): string {
  return `themes/${encodeURIComponent(slug)}/news/${file}`;
}

function parseItems(value: unknown): ThemeNewsItemV0[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is ThemeNewsItemV0 =>
      Boolean(i) && typeof i.url === "string" && typeof i.title === "string" && Boolean(i.id),
  );
}

export function parseThemeNewsIndex(raw: unknown): ThemeNewsIndexV0 | null {
  const row = (raw ?? {}) as Record<string, unknown>;
  if (row.schema_version !== "theme.news.index.v0" || typeof row.slug !== "string") return null;
  const months = Array.isArray(row.months)
    ? (row.months as { month?: unknown; count?: unknown }[])
        .filter((m) => typeof m?.month === "string" && /^\d{4}-\d{2}$/.test(m.month as string))
        .map((m) => ({ month: m.month as string, count: Number(m.count) || 0 }))
    : [];
  const latest = parseItems(row.latest);
  if (!latest.length) return null;
  return {
    schema_version: "theme.news.index.v0",
    slug: row.slug,
    theme_name: typeof row.theme_name === "string" ? row.theme_name : row.slug,
    total: Number(row.total) || latest.length,
    months,
    latest,
  };
}

/** Same-origin in prod (baked into /chart-data at build); CDN rewrite in dev. */
export async function fetchThemeNewsMonth(
  slug: string,
  month: string,
  signal?: AbortSignal,
): Promise<ThemeNewsItemV0[]> {
  const url = `${stockthemesBrowserChartFetchBase()}/stockcontext/${themeNewsRelPath(slug, `${month}.v0.json`)}`;
  const res = await fetch(url, { credentials: "omit", signal });
  if (!res.ok) return [];
  const raw = (await res.json()) as Partial<ThemeNewsMonthV0>;
  return raw?.schema_version === "theme.news.month.v0" ? parseItems(raw.items) : [];
}
