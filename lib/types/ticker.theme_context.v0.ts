/** Mirrors ETL `tickers/<SYMBOL>.theme_context.v0.json` */

export type TickerThemeContextFactorRefV0 = {
  id: string;
  label: string;
  score?: number;
};

export type TickerThemeContextFitV0 = {
  correlation_to_theme?: number;
  market_adjusted_correlation?: number;
  beta_to_theme?: number;
  theme_r2?: number;
  stock_specific_share?: number;
  sample_size?: number;
  coverage_pct?: number;
};

export type TickerThemeContextThemeV0 = {
  theme: string;
  slug: string;
  top_factor?: TickerThemeContextFactorRefV0 | null;
  dominant_sector?: TickerThemeContextFactorRefV0 | null;
  fit_by_horizon: Partial<Record<string, TickerThemeContextFitV0>>;
};

export type TickerThemeContextV0 = {
  schema_version: "ticker.theme_context.v0";
  ticker: string;
  as_of?: string;
  default_horizon: string;
  available_horizons?: string[];
  methodology_version?: string;
  history_method?: string;
  themes: TickerThemeContextThemeV0[];
};
