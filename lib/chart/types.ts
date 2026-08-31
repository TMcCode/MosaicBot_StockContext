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

export type ManifestSelectedDateV0 = {
  day_name: string;
  date: string;
};
