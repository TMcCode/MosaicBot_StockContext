import {
  ColorType,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
} from "lightweight-charts";

import type { SiteTheme } from "@/lib/themeStorage";

export type ChartThemeColors = {
  background: string;
  text: string;
  grid: string;
  border: string;
  crosshairLabelBg: string;
  indexedBaseline: string;
};

const DARK: ChartThemeColors = {
  background: "#0f1115",
  text: "#a6abb9",
  grid: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  crosshairLabelBg: "#0f1115",
  indexedBaseline: "rgba(166, 171, 185, 0.55)",
};

const LIGHT: ChartThemeColors = {
  background: "#f7f6fc",
  text: "#5c5978",
  grid: "rgba(30, 28, 54, 0.08)",
  border: "rgba(59, 77, 161, 0.14)",
  crosshairLabelBg: "#f7f6fc",
  indexedBaseline: "rgba(92, 89, 120, 0.45)",
};

export function chartThemeColors(theme: SiteTheme): ChartThemeColors {
  return theme === "light" ? LIGHT : DARK;
}

export function chartThemeOptions(theme: SiteTheme): Parameters<IChartApi["applyOptions"]>[0] {
  const c = chartThemeColors(theme);
  return {
    layout: {
      background: { type: ColorType.Solid, color: c.background },
      textColor: c.text,
    },
    grid: {
      vertLines: { color: c.grid },
      horzLines: { color: c.grid },
    },
    rightPriceScale: {
      borderColor: c.border,
    },
    timeScale: {
      borderColor: c.border,
    },
    crosshair: {
      vertLine: { labelBackgroundColor: c.crosshairLabelBg },
      horzLine: { labelBackgroundColor: c.crosshairLabelBg },
    },
  };
}

export function applyChartTheme(chart: IChartApi, theme: SiteTheme): void {
  chart.applyOptions(chartThemeOptions(theme));
}

export function indexedBaselinePriceLineOptions(theme: SiteTheme) {
  const c = chartThemeColors(theme);
  return {
    price: 100,
    color: c.indexedBaseline,
    lineWidth: 1 as const,
    lineStyle: LineStyle.Solid,
    axisLabelVisible: false,
    title: "",
  };
}

export function attachIndexedBaseline(
  series: ISeriesApi<"Line">,
  theme: SiteTheme,
): IPriceLine {
  return series.createPriceLine(indexedBaselinePriceLineOptions(theme));
}

export function applyIndexedBaselineTheme(line: IPriceLine, theme: SiteTheme): void {
  line.applyOptions(indexedBaselinePriceLineOptions(theme));
}
