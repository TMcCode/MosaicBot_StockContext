import type { TableIndexEntry } from "@/lib/types";

const THEME_TABLE_ORDER = [
  "bull-bear-details",
  "overview",
  "key-metrics",
  "upcoming-catalysts",
  "notes",
] as const;

export function orderThemeTableEntries(entries: TableIndexEntry[]): TableIndexEntry[] {
  const rank = new Map(THEME_TABLE_ORDER.map((slug, i) => [slug, i]));
  return [...entries].sort((a, b) => {
    const ra = rank.get(a.slug as (typeof THEME_TABLE_ORDER)[number]) ?? 100;
    const rb = rank.get(b.slug as (typeof THEME_TABLE_ORDER)[number]) ?? 100;
    if (ra !== rb) return ra - rb;
    return a.slug.localeCompare(b.slug);
  });
}
