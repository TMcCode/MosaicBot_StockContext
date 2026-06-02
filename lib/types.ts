export type Manifest = {
  schema_version: number;
  as_of: string;
  build_id: string;
  data_base_url: string;
  search_index_url: string;
  home_feeds_url: string;
  themes_index_url: string;
  stats?: {
    total_tickers?: number;
    total_themes?: number;
  };
  tickers: TickerManifestEntry[];
  themes: ThemeIndexEntry[];
};

export type TickerManifestEntry = {
  symbol: string;
  name: string;
  company_name?: string;
  tier?: number;
  portfolio_weight?: number | null;
  meta_url: string;
  last_updated_at?: string;
};

export type ThemeIndexEntry = {
  slug: string;
  name: string;
  ticker_count: number;
  meta_url: string;
};

export type TickerMeta = {
  symbol: string;
  company_name?: string;
  tier?: number;
  portfolio_weight?: number | null;
  primary_theme?: string | null;
  themes?: string[];
  tables_index_url: string;
};

export type ThemeMeta = {
  slug: string;
  name: string;
  ticker_count: number;
  constituents: ThemeConstituent[];
};

export type ThemeConstituent = {
  symbol: string;
  company_name?: string;
  tier?: number;
  portfolio_weight?: number | null;
  meta_url: string;
};

export type TablesIndex = {
  symbol: string;
  tables: TableIndexEntry[];
};

export type TableIndexEntry = {
  slug: string;
  display_name: string;
  has_data: boolean;
  preview?: string;
  body_url?: string | null;
  format: string;
};

export type TableBody = {
  slug: string;
  display_name?: string;
  format: string;
  columns: { id: string; label: string; kind?: string }[];
  rows: Record<string, string>[];
};

export type HomeFeeds = {
  sections: {
    id: string;
    title: string;
    items: {
      symbol: string;
      label: string;
      sublabel?: string;
      meta_url: string;
    }[];
  }[];
};
