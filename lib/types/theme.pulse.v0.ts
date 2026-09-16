/** Public stockcontext theme-pulse sidecars (from TimBot overnight packs). */

export type ThemePulseNewsSentiment =
  | "improving"
  | "stable"
  | "deteriorating"
  | "mixed";

export type ThemePulseFit =
  | "aligned"
  | "diverge_price_leads"
  | "diverge_news_leads"
  | "unclear";

export type ThemePulseConfidence = "high" | "medium" | "low";
export type ThemePulseNewsCoverage = "rich" | "thin" | "none";

export type ThemePulsePortTicker = {
  ticker: string;
  weight_pct?: number | null;
  paragraph?: string;
  earnings_in_window?: boolean;
};

export type ThemePulseReadingItem = {
  title: string;
  publisher?: string;
  url: string;
  published_approx?: string;
  why_relevant?: string;
  link_source?: string;
};

export type ThemePulseWatchNextItem = {
  id: string;
  kind?: string;
  title: string;
  date_start: string;
  date_end: string;
  hardness?: string;
  session?: string | null;
  stance?: string;
  why?: string;
  fork_up?: string | null;
  fork_down?: string | null;
  exposure_tickers?: string[];
  source_url?: string | null;
  stockcontext_path?: string | null;
  refresh_status?: string;
};

/** Full writeup for one theme on one pulse day. */
export type ThemePulseThemeV0 = {
  theme_name: string;
  theme_slug: string;
  as_of: string;
  window_days?: number;
  price_14d_pct?: number | null;
  spy_14d_pct?: number | null;
  excess_vs_spy_pct?: number | null;
  news_sentiment?: ThemePulseNewsSentiment | null;
  news_sentiment_score?: number | null;
  fit?: ThemePulseFit | null;
  confidence?: ThemePulseConfidence | null;
  news_coverage?: ThemePulseNewsCoverage | string;
  period_verdict?: string;
  theme_summary?: string;
  confirming?: string[];
  disconfirming?: string[];
  watch_next_14d?: ThemePulseWatchNextItem[];
  port_tickers?: ThemePulsePortTicker[];
  reading?: ThemePulseReadingItem[];
  reddit?: ThemePulseReadingItem[];
  sources_note?: string;
  gate_reasons?: string[];
  updated_at?: string;
};

export type ThemePulseIndexV0 = {
  schema_version: "theme.pulse.index.v0";
  slug: string;
  theme_name?: string;
  available_dates: string[];
  latest_as_of?: string;
  latest: ThemePulseThemeV0;
  updated_at?: string;
};

export type ThemePulseDayV0 = {
  schema_version: "theme.pulse.day.v0";
  slug: string;
  as_of: string;
  pulse: ThemePulseThemeV0;
};
