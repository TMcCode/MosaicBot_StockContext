/** Parse + display helpers for Theme_Overview JSON columns (mirrors utils/theme_overview_schema.py). */

import {
  formatPublicationsText,
  formatWatchlistText,
  isMonitoringOverviewColumn,
  isMonitoringWatchlistColumn,
} from "./monitoringWatchlistFormat";

export type ForumWatchlistEntry = {
  source_type?: string;
  source?: string;
  priority?: string;
  signal_focus?: string;
};

function fieldStr(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  return s === "undefined" || s === "null" ? "" : s;
}

function stripTrailingCommasJson(s: string): string {
  let prev: string | null = null;
  let out = s;
  while (prev !== out) {
    prev = out;
    out = out.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  }
  return out;
}

function tryJsonDecodeString(s: string): unknown | null {
  const t = s.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    /* continue */
  }
  const t2 = stripTrailingCommasJson(t);
  if (t2 !== t) {
    try {
      return JSON.parse(t2);
    } catch {
      /* continue */
    }
  }
  const start = Math.min(
    t2.indexOf("[") >= 0 ? t2.indexOf("[") : Infinity,
    t2.indexOf("{") >= 0 ? t2.indexOf("{") : Infinity,
  );
  if (start !== Infinity) {
    const chunk = extractBalancedJson(t2, start);
    if (chunk) {
      try {
        return JSON.parse(stripTrailingCommasJson(chunk));
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

function extractBalancedJson(s: string, start: number): string | null {
  const open = s[start];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) return null;
  let depth = 0;
  for (let j = start; j < s.length; j++) {
    if (s[j] === open) depth++;
    else if (s[j] === close) {
      depth--;
      if (depth === 0) return s.slice(start, j + 1);
    }
  }
  return null;
}

export function parseJsonCell(raw: string): unknown | null {
  let s = fieldStr(raw);
  if (!s) return null;
  if (s.startsWith("```")) {
    s = s.replace(/^```\w*\s*/, "").replace(/\s*```$/, "").trim();
  }
  const parsed = tryJsonDecodeString(s);
  if (parsed != null) {
    if (typeof parsed === "string") {
      const inner = parsed.trim();
      if (inner.startsWith("[") || inner.startsWith("{")) {
        const deeper = parseJsonCell(inner);
        if (deeper != null) return deeper;
      }
    }
    return parsed;
  }
  for (const [open, close] of [
    ["[", "]"],
    ["{", "}"],
  ] as const) {
    const idx = s.indexOf(open);
    if (idx === -1) continue;
    const chunk = extractBalancedJson(s, idx);
    if (chunk) {
      const p = tryJsonDecodeString(chunk);
      if (p != null) return p;
    }
  }
  return null;
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

export function parseForumWatchlistEntries(raw: string): ForumWatchlistEntry[] | null {
  const parsed = parseJsonCell(raw);
  if (parsed == null) return null;
  const list = unwrapList(parsed, [
    "items",
    "forums",
    "sources",
    "watchlist",
    "ForumWatchlist",
    "forum_watchlist",
  ]);
  if (!list) return null;
  return list.map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      return {
        source_type: fieldStr(o.source_type),
        source: fieldStr(o.source),
        priority: fieldStr(o.priority),
        signal_focus: fieldStr(o.signal_focus),
      };
    }
    return { source: fieldStr(item) };
  });
}

/** Bullet-list fallback (matches Dash theme_overview_schema). */
export function formatForumWatchlistText(raw: string): string {
  const entries = parseForumWatchlistEntries(raw);
  if (entries?.length) {
    return entries
      .map((item) => {
        const head = [item.source_type, item.source].filter(Boolean).join(" — ");
        const extras: string[] = [];
        if (item.priority) extras.push(`priority: ${item.priority}`);
        if (item.signal_focus) extras.push(item.signal_focus);
        const tail = extras.length ? ` (${extras.join("; ")})` : "";
        return head ? `• ${head}${tail}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  const t = fieldStr(raw);
  if (!t || t.length < 80) return t;
  return t
    .replace(/\}\s*,\s*\{/g, "},\n{")
    .replace(/\]\s*,\s*\[/g, "],\n[")
    .replace(/,\s*"/g, ',\n"');
}

export type KeywordGroup = { label: string; items: string[] };

const SEARCH_KEYWORDS_GROUP_ORDER: { keys: string[]; label: string }[] = [
  { keys: ["company_aliases"], label: "Company aliases" },
  { keys: ["product_terms", "brand_terms"], label: "Product terms" },
  { keys: ["policy_terms", "macro_policy_terms"], label: "Policy / regulatory terms" },
  { keys: ["event_phrases"], label: "Event phrases" },
];

export const SEARCH_KEYWORD_SPLIT_COLUMN_IDS = [
  "SearchKeywordsBrandProduct",
  "SearchKeywordsPolicyRegulatory",
  "SearchKeywordsEventPhrases",
] as const;

export function hasSplitSearchKeywordColumns(row: Record<string, string>): boolean {
  return SEARCH_KEYWORD_SPLIT_COLUMN_IDS.some((id) => fieldStr(row[id]));
}

/** Parse a cell that may be JSON array, bullet text, or plain string. */
export function parseKeywordListValue(raw: string): string[] {
  const parsed = parseJsonCell(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((v) => fieldStr(v)).filter(Boolean);
  }
  const t = fieldStr(raw);
  if (!t) return [];
  if (t.includes("•")) {
    return t
      .split(/\n/)
      .map((line) => line.replace(/^\s*•\s*/, "").trim())
      .filter(Boolean);
  }
  if (t.startsWith("[") || t.startsWith("{")) return [];
  return [t];
}

export function parseSearchKeywordsGroups(raw: string): KeywordGroup[] | null {
  const parsed = parseJsonCell(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const groups: KeywordGroup[] = [];
  const seen = new Set<string>();

  for (const { keys, label } of SEARCH_KEYWORDS_GROUP_ORDER) {
    for (const key of keys) seen.add(key);
    let items: string[] = [];
    for (const key of keys) {
      const vals = obj[key];
      if (vals == null || vals === "") continue;
      if (Array.isArray(vals)) {
        items = vals.map((v) => fieldStr(v)).filter(Boolean);
        break;
      }
      const one = fieldStr(vals);
      if (one) items = [one];
      break;
    }
    if (items.length) groups.push({ label, items });
  }

  for (const [key, val] of Object.entries(obj)) {
    if (seen.has(key) || val == null || val === "") continue;
    const label = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (Array.isArray(val)) {
      const items = val.map((v) => fieldStr(v)).filter(Boolean);
      if (items.length) groups.push({ label, items });
    } else {
      const one = fieldStr(val);
      if (one) groups.push({ label, items: [one] });
    }
  }

  return groups.length ? groups : null;
}

export function formatSearchKeywordsText(raw: string): string {
  const groups = parseSearchKeywordsGroups(raw);
  if (groups?.length) {
    return groups
      .map((g) => `${g.label}:\n${g.items.map((i) => `  • ${i}`).join("\n")}`)
      .join("\n\n");
  }
  const t = fieldStr(raw);
  if (!t || t.length < 80) return t;
  return t
    .replace(/\}\s*,\s*\{/g, "},\n{")
    .replace(/\]\s*,\s*\[/g, "],\n[")
    .replace(/,\s*"/g, ',\n"');
}

const THEME_OVERVIEW_JSON_COLUMNS = new Set([
  "ForumWatchlist",
  "IndustryPublications",
  "SearchKeywordsNow",
  "GoogleTrendKeywordsNow",
  "EconomicDataWatch",
  "FreeAltDataWatch",
  "PaidAltDataWatch",
  "TopDatasetsToTrack",
]);

export function isThemeOverviewJsonColumn(columnId: string): boolean {
  return THEME_OVERVIEW_JSON_COLUMNS.has(columnId);
}

export function isSearchKeywordColumn(columnId: string): boolean {
  return (
    columnId === "SearchKeywordsNow" ||
    columnId.startsWith("SearchKeywords")
  );
}

export type TopDatasetEntry = {
  index: number;
  dataset_name: string;
  dataset_type?: string;
  source_provider?: string;
  cadence?: string;
  why_it_matters?: string;
  suggested_query?: string;
  confidence?: string;
  /** Pre-formatted block from upstream (TopDataset1–5 text columns). */
  formattedText?: string;
};

export const TOP_DATASET_SPLIT_COLUMN_IDS = [
  "TopDataset1",
  "TopDataset2",
  "TopDataset3",
  "TopDataset4",
  "TopDataset5",
] as const;

export const GOOGLE_TREND_SPLIT_COLUMN_IDS = [
  "GoogleTrendProductCategoryIntent",
  "GoogleTrendConsumerIntent",
  "GoogleTrendMacroPolicyTerms",
] as const;

export function isTopDatasetColumn(columnId: string): boolean {
  return columnId === "TopDatasetsToTrack" || /^TopDataset\d$/i.test(columnId);
}

export function hasSplitTopDatasetColumns(row: Record<string, string>): boolean {
  return TOP_DATASET_SPLIT_COLUMN_IDS.some((id) => fieldStr(row[id]));
}

export function hasSplitGoogleTrendColumns(row: Record<string, string>): boolean {
  return GOOGLE_TREND_SPLIT_COLUMN_IDS.some((id) => fieldStr(row[id]));
}

function entryFromDatasetObject(item: Record<string, unknown>, index: number): TopDatasetEntry {
  return {
    index,
    dataset_name: fieldStr(item.dataset_name ?? item.dataset_id) || `Dataset ${index}`,
    dataset_type: fieldStr(item.dataset_type),
    source_provider: fieldStr(item.source_provider),
    cadence: fieldStr(item.cadence),
    why_it_matters: fieldStr(item.why_it_matters),
    suggested_query: fieldStr(item.suggested_query),
    confidence: fieldStr(item.confidence),
  };
}

function parseTopDatasetCell(cell: string, index: number): TopDatasetEntry | null {
  const parsed = parseJsonCell(cell);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return entryFromDatasetObject(parsed as Record<string, unknown>, index);
  }
  const t = fieldStr(cell);
  if (!t) return null;
  if (t.startsWith("{") || t.startsWith("[")) return null;
  return { index, dataset_name: t.split("\n")[0]?.replace(/^\d+\.\s*/, "") || `Dataset ${index}`, formattedText: t };
}

/** One list from TopDataset1–5 or TopDatasetsToTrack JSON (never both in UI). */
export function parseTopDatasetEntries(row: Record<string, string>): TopDatasetEntry[] {
  const fromSplit: TopDatasetEntry[] = [];
  for (let i = 0; i < TOP_DATASET_SPLIT_COLUMN_IDS.length; i++) {
    const id = TOP_DATASET_SPLIT_COLUMN_IDS[i];
    const entry = parseTopDatasetCell(fieldStr(row[id]), i + 1);
    if (entry) fromSplit.push(entry);
  }
  if (fromSplit.length) return fromSplit;

  const raw = fieldStr(row.TopDatasetsToTrack);
  if (!raw) return [];
  const parsed = parseJsonCell(raw);
  let list: unknown[] | null = null;
  if (Array.isArray(parsed)) list = parsed;
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const k of ["datasets", "items", "TopDatasetsToTrack", "top_datasets_to_track", "data"]) {
      if (Array.isArray(obj[k])) {
        list = obj[k];
        break;
      }
    }
    if (!list) list = [parsed];
  }
  if (!list) return [];
  return list
    .map((item, i) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return entryFromDatasetObject(item as Record<string, unknown>, i + 1);
      }
      const one = fieldStr(item);
      return one ? { index: i + 1, dataset_name: one } : null;
    })
    .filter((e): e is TopDatasetEntry => e != null);
}

/** Long narrative / combined blocks that should span the overview grid. */
export function isFullWidthOverviewColumn(columnId: string): boolean {
  return (
    columnId === "HiringTrendWatchpoints" ||
    columnId === "SecondOrderTrends" ||
    columnId === "ForumWatchlist" ||
    isMonitoringOverviewColumn(columnId) ||
    columnId === "SearchKeywordsNow" ||
    isSearchKeywordColumn(columnId) ||
    columnId === "GoogleTrendKeywordsNow" ||
    (GOOGLE_TREND_SPLIT_COLUMN_IDS as readonly string[]).includes(columnId)
  );
}

/** Canonical Theme_Overview sections (matches utils/theme_overview_schema.py). */
export const THEME_OVERVIEW_SECTION_LABELS: { id: string; label: string }[] = [
  { id: "thesis", label: "Theme thesis (Bull / Bear Details)" },
  { id: "HiringTrendWatchpoints", label: "Hiring trend watchpoints" },
  { id: "ForumWatchlist", label: "Forum watchlist" },
  { id: "IndustryPublications", label: "Industry publications" },
  { id: "SecondOrderTrends", label: "Second-order trends" },
  { id: "SearchKeywordsNow", label: "Search keywords" },
  { id: "GoogleTrendKeywordsNow", label: "Google Trends keywords" },
  { id: "EconomicDataWatch", label: "Economic data watch" },
  { id: "FreeAltDataWatch", label: "Free alt data watch" },
  { id: "PaidAltDataWatch", label: "Paid alt data watch" },
  { id: "TopDatasetsToTrack", label: "Top datasets to track" },
];

/** Display order for Theme_Overview single-row grid (Top Datasets before Google Trends). */
export const THEME_OVERVIEW_COLUMN_ORDER: string[] = [
  "HiringTrendWatchpoints",
  "ForumWatchlist",
  "IndustryPublications",
  "SecondOrderTrends",
  "SearchKeywordsNow",
  "SearchKeywordsBrandProduct",
  "SearchKeywordsPolicyRegulatory",
  "SearchKeywordsEventPhrases",
  "GoogleTrendKeywordsNow",
  "GoogleTrendProductCategoryIntent",
  "GoogleTrendConsumerIntent",
  "GoogleTrendMacroPolicyTerms",
  "EconomicDataWatch",
  "FreeAltDataWatch",
  "PaidAltDataWatch",
];

export function sortThemeOverviewColumns<T extends { id: string }>(cols: T[]): T[] {
  const rank = new Map(THEME_OVERVIEW_COLUMN_ORDER.map((id, i) => [id, i]));
  return [...cols].sort((a, b) => {
    const ra = rank.get(a.id) ?? 1000;
    const rb = rank.get(b.id) ?? 1000;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

/** Format JSON-heavy overview fields as readable text when not using a custom component. */
export function formatThemeOverviewField(columnId: string, raw: string): string {
  const v = fieldStr(raw);
  if (!v) return "";
  if (columnId === "ForumWatchlist") return formatForumWatchlistText(v);
  if (columnId === "IndustryPublications") return formatPublicationsText(v);
  if (isMonitoringWatchlistColumn(columnId)) return formatWatchlistText(v);
  if (columnId === "SearchKeywordsNow") return formatSearchKeywordsText(v);
  if (isSearchKeywordColumn(columnId)) {
    return parseKeywordListValue(v).map((i) => `• ${i}`).join("\n");
  }
  if (!isThemeOverviewJsonColumn(columnId)) return v;
  const parsed = parseJsonCell(v);
  if (parsed == null) return v;
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (item && typeof item === "object") return `• ${JSON.stringify(item)}`;
        return `• ${String(item)}`;
      })
      .join("\n");
  }
  if (typeof parsed === "object") {
    return JSON.stringify(parsed, null, 2);
  }
  return v;
}
