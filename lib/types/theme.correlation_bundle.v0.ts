import type { ThemeFactorAttributionV0 } from "@/lib/types/theme.factor_attribution.v0";
import type { ThemeStockCorrelationsV0 } from "@/lib/types/theme.stock_correlations.v0";
import type { ThemeThemeNeighborsV0 } from "@/lib/types/theme.theme_neighbors.v0";

/** One-request Correlation panel payload (cohesion + neighbors + matrix). */
export type ThemeCorrelationBundleV0 = {
  schema_version: "theme.correlation_bundle.v0";
  slug: string;
  as_of?: string;
  stock_correlations: ThemeStockCorrelationsV0 | null;
  attribution: ThemeFactorAttributionV0 | null;
  neighbors: ThemeThemeNeighborsV0 | null;
};
