/** Display order + layout helpers for merged Ticker_Overview / Ticker_DetailedOverview. */

import { parseJsonCell } from "./themeOverviewFormat";

export const TICKER_OVERVIEW_BULL_ID = "3 main long-term bull details";
export const TICKER_OVERVIEW_BEAR_ID = "3 main long-term bear details";
export const TICKER_OVERVIEW_COMPETITORS_ID = "Competitors and differentiation";
export const TICKER_OVERVIEW_REVENUE_SEGMENTS_ID = "Revenue segments and estimated mix";
export const TICKER_OVERVIEW_PRODUCT_BRANDS_ID = "Product brands";

/** Paired row at the bottom of ticker overview (left → right). */
export const TICKER_OVERVIEW_BOTTOM_PAIR_IDS = [
  TICKER_OVERVIEW_REVENUE_SEGMENTS_ID,
  TICKER_OVERVIEW_PRODUCT_BRANDS_ID,
] as const;

/**
 * Canonical field order (matches gsheets_utils Ticker_DetailedOverview) with
 * Competitors and bear swapped so bull/bear pair on one row in the 2-col grid.
 * Revenue segments + Product brands render separately at the bottom.
 */
export const TICKER_OVERVIEW_COLUMN_ORDER: string[] = [
  "What they do (plain English & analogies)",
  "Very brief history",
  '"Street stereotype"',
  "Subsidiaries on LinkedIn*",
  "Customer sectors & example clients",
  "New customers / segments they're targeting",
  "Supply chain and sourcing geographies",
  "Sales geographies and expansion plans",
  TICKER_OVERVIEW_BEAR_ID,
  "How key themes may help/hurt",
  TICKER_OVERVIEW_BULL_ID,
  TICKER_OVERVIEW_COMPETITORS_ID,
  "Recent performance & what the market's focused on",
  "Brands and revenue segments",
  ...TICKER_OVERVIEW_BOTTOM_PAIR_IDS,
  "KeyInputsAndSourcing",
  "IndustryPublications",
  "EconomicDataWatch",
  "FreeAltDataWatch",
  "PaidAltDataWatch",
];

export function isTickerOverviewBottomPairColumn(columnId: string): boolean {
  return (TICKER_OVERVIEW_BOTTOM_PAIR_IDS as readonly string[]).includes(columnId);
}

export function splitTickerOverviewBottomPair<T extends { id: string }>(
  cols: T[],
): { main: T[]; bottomPair: T[] } {
  const bottomIds = new Set<string>(TICKER_OVERVIEW_BOTTOM_PAIR_IDS);
  const bottomById = new Map<string, T>();
  const main: T[] = [];
  for (const col of cols) {
    if (bottomIds.has(col.id)) bottomById.set(col.id, col);
    else main.push(col);
  }
  const bottomPair = TICKER_OVERVIEW_BOTTOM_PAIR_IDS.flatMap((id) => {
    const col = bottomById.get(id);
    return col ? [col] : [];
  });
  return { main, bottomPair };
}

export function isTickerOverviewBody(body: { gcs_table?: string }): boolean {
  return body.gcs_table === "Ticker_Overview";
}

export function isTickerBullBearColumn(columnId: string): boolean {
  return columnId === TICKER_OVERVIEW_BULL_ID || columnId === TICKER_OVERVIEW_BEAR_ID;
}

export function sortTickerOverviewColumns<T extends { id: string }>(cols: T[]): T[] {
  const rank = new Map(TICKER_OVERVIEW_COLUMN_ORDER.map((id, i) => [id, i]));
  return [...cols].sort((a, b) => {
    const ra = rank.get(a.id) ?? 1000;
    const rb = rank.get(b.id) ?? 1000;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

export const TICKER_DETAILED_JSON_COLUMN_IDS = [
  "Subsidiaries on LinkedIn*",
  "Revenue segments and estimated mix",
  "Product brands",
] as const;

export function isTickerDetailedJsonColumn(columnId: string): boolean {
  return (TICKER_DETAILED_JSON_COLUMN_IDS as readonly string[]).includes(columnId);
}

function cellStr(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

export type SubsidiaryEntry = {
  name: string;
  linkedin_hint?: string;
  notes?: string;
};

export type RevenueSegmentEntry = {
  segment_name: string;
  estimated_mix?: string;
  source_or_comment?: string;
  yoy_or_trend_comment?: string;
};

export function parseSubsidiariesEntries(raw: string): SubsidiaryEntry[] {
  const parsed = parseJsonCell(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const subs = (parsed as Record<string, unknown>).subsidiaries;
  if (!Array.isArray(subs)) return [];
  const out: SubsidiaryEntry[] = [];
  for (const item of subs) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const name = cellStr(o.name);
    if (!name) continue;
    const entry: SubsidiaryEntry = { name };
    const hint = cellStr(o.linkedin_hint);
    const notes = cellStr(o.notes);
    if (hint) entry.linkedin_hint = hint;
    if (notes) entry.notes = notes;
    out.push(entry);
  }
  return out;
}

export function parseRevenueSegmentEntries(raw: string): RevenueSegmentEntry[] {
  const parsed = parseJsonCell(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const segs = (parsed as Record<string, unknown>).segments;
  if (!Array.isArray(segs)) return [];
  const out: RevenueSegmentEntry[] = [];
  for (const item of segs) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const entry: RevenueSegmentEntry = {
      segment_name: cellStr(o.segment_name) || "(unnamed segment)",
    };
    const mix = cellStr(o.estimated_mix);
    const source = cellStr(o.source_or_comment);
    const trend = cellStr(o.yoy_or_trend_comment);
    if (mix) entry.estimated_mix = mix;
    if (source) entry.source_or_comment = source;
    if (trend) entry.yoy_or_trend_comment = trend;
    out.push(entry);
  }
  return out;
}

export function parseProductBrandEntries(raw: string): string[] {
  const parsed = parseJsonCell(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const brands = (parsed as Record<string, unknown>).brands;
  if (!Array.isArray(brands)) return [];
  return brands.map((b) => cellStr(b)).filter(Boolean);
}

/** Readable fallback when JSON parses but structured UI is unavailable. */
export function formatTickerDetailedJsonField(columnId: string, raw: string): string {
  if (columnId === "Subsidiaries on LinkedIn*") {
    const items = parseSubsidiariesEntries(raw);
    if (!items.length) return raw.trim();
    return items
      .map((item) => {
        const tail = [item.notes, item.linkedin_hint ? `LinkedIn: ${item.linkedin_hint}` : ""]
          .filter(Boolean)
          .join("; ");
        return tail ? `• ${item.name} — ${tail}` : `• ${item.name}`;
      })
      .join("\n");
  }
  if (columnId === "Revenue segments and estimated mix") {
    const items = parseRevenueSegmentEntries(raw);
    if (!items.length) return raw.trim();
    return items
      .map((item) => {
        const bits = [
          item.estimated_mix ? `Mix: ${item.estimated_mix}` : "",
          item.source_or_comment ? `Source: ${item.source_or_comment}` : "",
          item.yoy_or_trend_comment ? `Trend: ${item.yoy_or_trend_comment}` : "",
        ].filter(Boolean);
        return bits.length ? `• ${item.segment_name} — ${bits.join("; ")}` : `• ${item.segment_name}`;
      })
      .join("\n");
  }
  if (columnId === "Product brands") {
    const brands = parseProductBrandEntries(raw);
    if (!brands.length) return raw.trim();
    return brands.map((b) => `• ${b}`).join("\n");
  }
  return raw.trim();
}
