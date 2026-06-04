export type Manifest = {
  schema_version: number;
  as_of: string;
  build_id: string;
  data_base_url: string;
  search_index_url: string;
  home_feeds_url: string;
  recent_updates_marquee_url?: string;
  themes_index_url: string;
  stats?: {
    total_tickers?: number;
    coverage_universe?: number;
    universe_without_data?: number;
    total_themes?: number;
    themes_with_data?: number;
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
  constituents_with_data?: number;
  has_table_data?: boolean;
  meta_url?: string | null;
};

export type TickerMeta = {
  symbol: string;
  company_name?: string;
  tier?: number;
  portfolio_weight?: number | null;
  primary_theme?: string | null;
  themes?: string[];
  tables_index_url: string;
  chart_url?: string;
  financials_url?: string;
};

export type ThemeContentSummary = {
  sections_ready?: number;
  sections_total?: number;
  has_thesis?: boolean;
  thesis_updated_at?: string | null;
  theme_upload_count?: number;
};

export type ThemeMeta = {
  slug: string;
  name: string;
  ticker_count: number;
  constituents_with_data?: number;
  has_table_data?: boolean;
  tables_index_url?: string;
  as_of?: string;
  build_id?: string;
  last_updated_at?: string;
  content?: ThemeContentSummary;
  constituents: ThemeConstituent[];
};

export type ThemeTablesIndex = {
  slug: string;
  name?: string;
  build_id?: string;
  as_of?: string;
  tables: TableIndexEntry[];
};

export type ThemeConstituent = {
  symbol: string;
  company_name?: string;
  tier?: number;
  portfolio_weight?: number | null;
  has_table_data?: boolean;
  meta_url?: string | null;
};

export type TablesIndex = {
  symbol: string;
  build_id?: string;
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

export type RecentUpdatesMarqueeItem = {
  symbol: string;
  label: string;
  sublabel?: string;
  updated_at: string;
  meta_url?: string;
};

export type RecentUpdatesMarquee = {
  schema_version: number;
  as_of: string;
  build_id?: string;
  lookback_days: number;
  ticker_rows: RecentUpdatesMarqueeItem[];
  theme_rows: RecentUpdatesMarqueeItem[];
};

export type HomeFeeds = {
  sections: {
    id: string;
    title: string;
    items: {
      symbol: string;
      label: string;
      sublabel?: string;
      badge?: string | null;
      metric?: number | null;
      event_at?: string | null;
      meta_url?: string;
    }[];
  }[];
};

export type SearchTickerRow = {
  symbol: string;
  name?: string;
  company_name?: string;
  /** @deprecated Legacy publish field; fuse text built client-side. */
  search_text?: string;
  tier?: number;
  theme_names?: string[];
  meta_url?: string;
};

export type SearchThemeRow = {
  slug: string;
  name: string;
  /** @deprecated Legacy publish field; fuse text built client-side. */
  search_text?: string;
  ticker_count?: number;
  constituents_with_data?: number;
  has_table_data?: boolean;
  meta_url?: string | null;
};

export type SearchIndex = {
  schema_version: number;
  as_of: string;
  build_id: string;
  tickers: SearchTickerRow[];
  themes?: SearchThemeRow[];
};
