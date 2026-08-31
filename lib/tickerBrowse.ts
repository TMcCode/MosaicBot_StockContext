import type { TickerManifestEntry } from "./types";

export type BrowseTickerRow = {
  symbol: string;
  company_name?: string;
  tier?: number;
  workflow_tags?: string[];
  last_updated_at?: string;
};

function manifestEntryToBrowseRow(entry: TickerManifestEntry): BrowseTickerRow {
  return {
    symbol: entry.symbol.toUpperCase(),
    company_name: entry.company_name ?? entry.name,
    tier: entry.tier,
    last_updated_at: entry.last_updated_at,
  };
}

export function manifestTickersToBrowseRows(entries: TickerManifestEntry[]): BrowseTickerRow[] {
  return [...entries]
    .map(manifestEntryToBrowseRow)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
