/** Parse + display helpers for monitoring watchlist JSON columns (mirrors utils/monitoring_watchlist_schema.py). */

import { parseJsonCell } from "./themeOverviewFormat";

export const MONITORING_WATCHLIST_COLUMN_IDS = [
  "EconomicDataWatch",
  "FreeAltDataWatch",
  "PaidAltDataWatch",
] as const;

export const TICKER_MONITORING_COLUMN_IDS = [
  "KeyInputsAndSourcing",
  "IndustryPublications",
  ...MONITORING_WATCHLIST_COLUMN_IDS,
] as const;

export type WatchlistEntry = {
  provider_or_source?: string;
  dataset_or_product?: string;
  metric_or_field?: string;
  cadence?: string;
  why_it_matters?: string;
  signal_to_watch?: string;
  confidence?: string;
};

export type KeyInputEntry = {
  input_name: string;
  input_type?: string;
  commodity_code?: string;
  commodity_code_system?: string;
  sourcing_geography?: string;
  est_cogs_share?: string;
  confidence?: string;
  source_or_comment?: string;
};

export type PublicationEntry = {
  name: string;
  domain?: string;
  why?: string;
};

function fieldStr(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

function unwrapList(parsed: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const k of keys) {
      const v = obj[k];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

function normalizeWatchlistItem(item: unknown): WatchlistEntry | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    const s = fieldStr(item);
    if (!s) return null;
    return { provider_or_source: s };
  }
  const o = item as Record<string, unknown>;
  const entry: WatchlistEntry = {
    provider_or_source: fieldStr(o.provider_or_source),
    dataset_or_product: fieldStr(o.dataset_or_product),
    metric_or_field: fieldStr(o.metric_or_field),
    cadence: fieldStr(o.cadence),
    why_it_matters: fieldStr(o.why_it_matters),
    signal_to_watch: fieldStr(o.signal_to_watch),
    confidence: fieldStr(o.confidence),
  };
  if (!Object.values(entry).some(Boolean)) return null;
  return entry;
}

export function parseWatchlistEntries(raw: string): WatchlistEntry[] {
  const parsed = parseJsonCell(raw);
  if (parsed == null) return [];
  const list = unwrapList(parsed, ["items", "watchlist", "datasets"]);
  if (!list) return [];
  return list.map(normalizeWatchlistItem).filter((e): e is WatchlistEntry => e != null);
}

function normalizeKeyInputItem(item: unknown): KeyInputEntry | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const input_name = fieldStr(o.input_name);
  if (!input_name) return null;
  return {
    input_name,
    input_type: fieldStr(o.input_type),
    commodity_code: fieldStr(o.commodity_code),
    commodity_code_system: fieldStr(o.commodity_code_system),
    sourcing_geography: fieldStr(o.sourcing_geography),
    est_cogs_share: fieldStr(o.est_cogs_share),
    confidence: fieldStr(o.confidence),
    source_or_comment: fieldStr(o.source_or_comment),
  };
}

export function parseKeyInputEntries(raw: string): KeyInputEntry[] {
  const parsed = parseJsonCell(raw);
  if (parsed == null) return [];
  let list: unknown[] | null = null;
  if (Array.isArray(parsed)) list = parsed;
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    list = (obj.key_inputs ?? obj.inputs) as unknown[] | null;
    if (!Array.isArray(list)) list = null;
  }
  if (!list) return [];
  return list.map(normalizeKeyInputItem).filter((e): e is KeyInputEntry => e != null);
}

function normalizePublicationItem(item: unknown): PublicationEntry | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const name = fieldStr(o.name);
  if (!name) return null;
  return {
    name,
    domain: fieldStr(o.domain),
    why: fieldStr(o.why),
  };
}

export function parsePublicationEntries(raw: string): PublicationEntry[] {
  const parsed = parseJsonCell(raw);
  if (parsed == null) return [];
  const list = unwrapList(parsed, ["items", "publications", "sources", "IndustryPublications"]);
  if (!list) return [];
  return list.map(normalizePublicationItem).filter((e): e is PublicationEntry => e != null);
}

export function isMonitoringWatchlistColumn(columnId: string): boolean {
  return (MONITORING_WATCHLIST_COLUMN_IDS as readonly string[]).includes(columnId);
}

export function isMonitoringOverviewColumn(columnId: string): boolean {
  return (
    columnId === "KeyInputsAndSourcing" ||
    columnId === "IndustryPublications" ||
    isMonitoringWatchlistColumn(columnId)
  );
}

/** Bullet-list fallback (matches Python format_watchlist_array). */
export function formatWatchlistText(raw: string): string {
  const entries = parseWatchlistEntries(raw);
  if (!entries.length) return fieldStr(raw);
  return entries
    .map((item, i) => {
      const head =
        [item.provider_or_source, item.dataset_or_product].filter(Boolean).join(" — ") ||
        `Item ${i + 1}`;
      const lines = [`${i + 1}. ${head}`];
      if (item.metric_or_field) lines.push(`   Metric/field: ${item.metric_or_field}`);
      if (item.cadence) lines.push(`   Cadence: ${item.cadence}`);
      if (item.why_it_matters) lines.push(`   Why: ${item.why_it_matters}`);
      if (item.signal_to_watch) lines.push(`   Signal: ${item.signal_to_watch}`);
      if (item.confidence) lines.push(`   Confidence: ${item.confidence}`);
      return lines.join("\n");
    })
    .join("\n");
}

export function formatKeyInputsText(raw: string): string {
  const entries = parseKeyInputEntries(raw);
  if (!entries.length) return fieldStr(raw);
  return entries
    .map((item, i) => {
      const meta = [
        item.input_type ? `Type: ${item.input_type}` : "",
        item.commodity_code
          ? `Code: ${item.commodity_code_system ? `${item.commodity_code_system}:` : ""}${item.commodity_code}`
          : "",
        item.sourcing_geography ? `Geo: ${item.sourcing_geography}` : "",
        item.est_cogs_share ? `COGS: ${item.est_cogs_share}` : "",
      ].filter(Boolean);
      const lines = [
        `${i + 1}. ${item.input_name}${meta.length ? ` (${meta.join("; ")})` : ""}`,
      ];
      if (item.source_or_comment) lines.push(`   Source: ${item.source_or_comment}`);
      if (item.confidence) lines.push(`   Confidence: ${item.confidence}`);
      return lines.join("\n");
    })
    .join("\n");
}

export function formatPublicationsText(raw: string): string {
  const entries = parsePublicationEntries(raw);
  if (!entries.length) return fieldStr(raw);
  return entries
    .map((item) => {
      const head = `• ${item.name}${item.domain ? ` (${item.domain})` : ""}`;
      return item.why ? `${head} — ${item.why}` : head;
    })
    .join("\n");
}
