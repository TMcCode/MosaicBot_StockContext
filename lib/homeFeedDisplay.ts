import { href, themeHref, tickerHref } from "./links";
import type { HomeFeeds } from "./types";

export type HomeFeedItem = HomeFeeds["sections"][number]["items"][number];
export type HomeFeedSection = HomeFeeds["sections"][number];

export type HomeSectionKind = "theme" | "ticker";

const THEME_SECTION_IDS = new Set([
  "watchlist_themes",
  "portfolio_themes",
  "theme_10d_outperformers",
  "theme_10d_underperformers",
]);

export function homeSectionKind(sectionId: string): HomeSectionKind {
  if (THEME_SECTION_IDS.has(sectionId) || sectionId.includes("theme")) {
    return "theme";
  }
  return "ticker";
}

export function homeItemHref(item: HomeFeedItem, kind: HomeSectionKind): string | null {
  if (!item.meta_url) {
    return null;
  }
  if (kind === "theme" || item.meta_url.startsWith("themes/")) {
    return themeHref(item.symbol);
  }
  return tickerHref(item.symbol);
}

/** Sections where `metric` is a 10D return % (not a 0–1 portfolio weight). */
const HOME_FEED_RETURN_SECTION_IDS = new Set([
  "watchlist_themes",
  "recently_reported",
  "theme_10d_outperformers",
  "theme_10d_underperformers",
  "ticker_10d_outperformers",
  "ticker_10d_underperformers",
]);

function isHomeFeedReturnMetric(sectionId: string, item: HomeFeedItem): boolean {
  if (sectionId.includes("10d") || item.sublabel?.startsWith("10D ")) {
    return true;
  }
  if (HOME_FEED_RETURN_SECTION_IDS.has(sectionId)) {
    return true;
  }
  // Portfolio row with no weight chip uses 10D theme return as `metric`.
  if (sectionId === "portfolio_themes" && !item.sublabel?.startsWith("Portfolio weight")) {
    return true;
  }
  return false;
}

export function formatHomeMetric(sectionId: string, item: HomeFeedItem): string | null {
  const m = item.metric;
  if (m == null || !Number.isFinite(m)) {
    return null;
  }

  if (isHomeFeedReturnMetric(sectionId, item)) {
    return formatReturnPct(m);
  }

  if (sectionId === "portfolio_themes" && item.sublabel?.startsWith("Portfolio weight")) {
    return `${(m * 100).toFixed(1)}% wt`;
  }

  if (sectionId === "upcoming_earnings" && m > 0 && m <= 1) {
    return `${(m * 100).toFixed(1)}% wt`;
  }

  return null;
}

export function formatReturnPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function returnPctClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "return-pct";
  }
  if (value > 0) {
    return "return-pct return-pct-up";
  }
  if (value < 0) {
    return "return-pct return-pct-down";
  }
  return "return-pct";
}

export function formatEventDate(iso?: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Compact date for dense home-feed rows (e.g. "Apr 14"). */
export function formatEventDateShort(iso?: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Second-line detail; omit when redundant with metric chip or section type. */
export function homeFeedSecondaryLine(
  sectionId: string,
  item: HomeFeedItem,
  metricLabel: string | null,
): string | null {
  const sub = (item.sublabel || "").trim();
  if (!sub || sub === item.label) {
    return null;
  }
  if (sub === "Theme notes") {
    return null;
  }
  if (sectionId.includes("10d") || sub.startsWith("10D ")) {
    return metricLabel ? null : sub;
  }
  if (sectionId === "portfolio_themes" && sub.startsWith("Portfolio weight")) {
    return metricLabel ? null : sub;
  }
  return sub;
}

export function showHomeFeedDate(sectionId: string): boolean {
  return !sectionId.includes("10d");
}

/** One-line legend under the panel title (home cards). */
export function homeFeedPanelSubtitle(sectionId: string): string | null {
  switch (sectionId) {
    case "watchlist_themes":
      return "10D theme return · last table update";
    case "portfolio_themes":
      return "10D return or portfolio weight · last update";
    case "recently_reported":
      return "10D price return · report date";
    case "upcoming_earnings":
      return "Next 14 days · portfolio weight when held";
    case "theme_10d_outperformers":
    case "theme_10d_underperformers":
      return "10D theme return";
    case "ticker_10d_outperformers":
    case "ticker_10d_underperformers":
      return "10D price return";
    default:
      return null;
  }
}

/** Home panels with dedicated overflow pages under /feeds/[section]/ */
export const HOME_FEED_OVERFLOW_IDS = [
  "watchlist_themes",
  "portfolio_themes",
  "recently_reported",
  "upcoming_earnings",
  "theme_10d_outperformers",
  "theme_10d_underperformers",
  "ticker_10d_outperformers",
  "ticker_10d_underperformers",
] as const;

export type HomeFeedOverflowId = (typeof HOME_FEED_OVERFLOW_IDS)[number];

export function feedSectionHref(sectionId: string): string {
  return href(`/feeds/${sectionId}`);
}

export function homeFeedSectionDescription(sectionId: string): string {
  switch (sectionId) {
    case "watchlist_themes":
      return "Watchlist coverage themes sorted by last theme text-table update (20-day window on the home card). Percent is 10D theme return.";
    case "portfolio_themes":
      return "Portfolio tab themes sorted by total portfolio weight, then last theme text-table update.";
    case "recently_reported":
      return "Automation-universe tickers that reported within the last 20 days (tier → weight → report date). Percent is 10D price return.";
    case "upcoming_earnings":
      return "Universe tickers reporting in the next 14 days (BMO before AMC on the same day). Portfolio weight chip when the ticker is on the Portfolio tab.";
    case "theme_10d_outperformers":
      return "All themes with 10D compare data, highest return first.";
    case "theme_10d_underperformers":
      return "All themes with 10D compare data, lowest return first.";
    case "ticker_10d_outperformers":
      return "Automation-universe tickers with 10D performance, highest first.";
    case "ticker_10d_underperformers":
      return "Automation-universe tickers with 10D performance, lowest first.";
    default:
      return "";
  }
}

export function homeSectionOverflowLink(sectionId: string): { href: string; label: string } | null {
  if (!(HOME_FEED_OVERFLOW_IDS as readonly string[]).includes(sectionId)) {
    if (sectionId === "universe") {
      return { href: href("/tickers"), label: "View all tickers" };
    }
    return null;
  }
  return { href: feedSectionHref(sectionId), label: "View all" };
}

export function isLegacyUniverseFeed(sections: HomeFeedSection[] | undefined): boolean {
  if (!sections?.length) {
    return false;
  }
  return sections.length === 1 && sections[0].id === "universe";
}

export function orderedHomeSections(sections: HomeFeedSection[] | undefined): HomeFeedSection[] {
  if (!sections?.length) {
    return [];
  }
  const order = [
    "watchlist_themes",
    "portfolio_themes",
    "recently_reported",
    "upcoming_earnings",
    "theme_10d_outperformers",
    "theme_10d_underperformers",
    "ticker_10d_outperformers",
    "ticker_10d_underperformers",
    "universe",
  ];
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...sections].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}
