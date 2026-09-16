export type ChartPerformanceV0 = {
  aggregation?: string;
  value_basis?: string;
  source?: string;
  dates: string[];
  values: number[];
};

export type ChartPerformanceSidecarV0 = {
  schema_version: "chart_performance.v0";
  slug: string;
  name: string;
  entity_type: "theme" | "group" | "ticker";
  as_of: string;
  build_id?: string;
  max_window?: string;
  performance: ChartPerformanceV0;
};

export type ChartCompositionSeriesV0 = {
  ticker: string;
  name?: string;
  dates: string[];
  values: number[];
};

export type ChartCompositionIndexedV0 = {
  basis?: string;
  display?: string;
  source?: string;
  series: ChartCompositionSeriesV0[];
};

/** Slim build/CDN payload for theme composition lines (extracted from themes/{slug}.json). */
export type ThemeCompositionSidecarV0 = {
  schema_version: "theme.composition.v0";
  slug: string;
  name?: string;
  composition_indexed: ChartCompositionIndexedV0;
};

export type ManifestSelectedDateV0 = {
  day_name: string;
  date: string;
};
