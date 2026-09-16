import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";
import type {
  ThemePulseDayV0,
  ThemePulseIndexV0,
  ThemePulseThemeV0,
} from "@/lib/types/theme.pulse.v0";

/**
 * Pulse JSON is published under stockcontext/ on the CDN, but production Pages
 * cannot cross-origin fetch storage.stockthemes.ai (no CORS for stockcontext.info).
 * CI bakes the same keys into /chart-data/stockcontext/… (dev uses the CDN rewrite).
 */
function pulseFetchUrl(relativePath: string): string {
  const rel = relativePath.replace(/^\//, "");
  const base = stockthemesBrowserChartFetchBase();
  if (process.env.NODE_ENV === "development") {
    // /stockthemes-data → storage.stockthemes.ai/*
    return `${base}/stockcontext/${rel}`;
  }
  return `${base}/stockcontext/${rel}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean);
}

function parsePulseTheme(raw: unknown): ThemePulseThemeV0 | null {
  const row = record(raw);
  const slug = text(row.theme_slug);
  const asOf = text(row.as_of).slice(0, 10);
  const name = text(row.theme_name);
  if (!slug || !asOf) return null;
  return {
    theme_name: name || slug,
    theme_slug: slug,
    as_of: asOf,
    window_days: typeof row.window_days === "number" ? row.window_days : 14,
    price_14d_pct: typeof row.price_14d_pct === "number" ? row.price_14d_pct : null,
    spy_14d_pct: typeof row.spy_14d_pct === "number" ? row.spy_14d_pct : null,
    excess_vs_spy_pct:
      typeof row.excess_vs_spy_pct === "number" ? row.excess_vs_spy_pct : null,
    news_sentiment: (text(row.news_sentiment) || null) as ThemePulseThemeV0["news_sentiment"],
    news_sentiment_score:
      typeof row.news_sentiment_score === "number" ? row.news_sentiment_score : null,
    fit: (text(row.fit) || null) as ThemePulseThemeV0["fit"],
    confidence: (text(row.confidence) || null) as ThemePulseThemeV0["confidence"],
    news_coverage: text(row.news_coverage) || undefined,
    period_verdict: text(row.period_verdict),
    theme_summary: text(row.theme_summary),
    confirming: asStringList(row.confirming),
    disconfirming: asStringList(row.disconfirming),
    watch_next_14d: Array.isArray(row.watch_next_14d)
      ? (row.watch_next_14d as ThemePulseThemeV0["watch_next_14d"])
      : [],
    port_tickers: Array.isArray(row.port_tickers)
      ? (row.port_tickers as ThemePulseThemeV0["port_tickers"])
      : [],
    reading: Array.isArray(row.reading) ? (row.reading as ThemePulseThemeV0["reading"]) : [],
    reddit: Array.isArray(row.reddit) ? (row.reddit as ThemePulseThemeV0["reddit"]) : [],
    sources_note: text(row.sources_note),
    gate_reasons: asStringList(row.gate_reasons),
    updated_at: text(row.updated_at) || undefined,
  };
}

function parseIndex(raw: unknown): ThemePulseIndexV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.pulse.index.v0") return null;
  const slug = text(row.slug);
  const latest = parsePulseTheme(row.latest);
  if (!slug || !latest) return null;
  const dates = Array.isArray(row.available_dates)
    ? row.available_dates.map((d) => text(d).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];
  const available = Array.from(new Set([latest.as_of, ...dates])).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
  return {
    schema_version: "theme.pulse.index.v0",
    slug,
    theme_name: text(row.theme_name) || latest.theme_name,
    available_dates: available,
    latest_as_of: text(row.latest_as_of).slice(0, 10) || latest.as_of,
    latest,
    updated_at: text(row.updated_at) || undefined,
  };
}

function parseDay(raw: unknown): ThemePulseDayV0 | null {
  const row = record(raw);
  if (text(row.schema_version) !== "theme.pulse.day.v0") return null;
  const slug = text(row.slug);
  const asOf = text(row.as_of).slice(0, 10);
  const pulse = parsePulseTheme(row.pulse);
  if (!slug || !asOf || !pulse) return null;
  return {
    schema_version: "theme.pulse.day.v0",
    slug,
    as_of: asOf,
    pulse,
  };
}

async function fetchJson(relativePath: string, signal?: AbortSignal): Promise<unknown | null> {
  const url = pulseFetchUrl(relativePath);
  try {
    const res = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    return null;
  }
}

export async function fetchThemePulseIndex(
  slug: string,
  signal?: AbortSignal,
): Promise<ThemePulseIndexV0 | null> {
  const enc = encodeURIComponent(slug);
  const raw = await fetchJson(`themes/${enc}/pulse/index.v0.json`, signal);
  return parseIndex(raw);
}

export async function fetchThemePulseDay(
  slug: string,
  asOf: string,
  signal?: AbortSignal,
): Promise<ThemePulseThemeV0 | null> {
  const day = asOf.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const enc = encodeURIComponent(slug);
  const raw = await fetchJson(`themes/${enc}/pulse/${day}.v0.json`, signal);
  const parsed = parseDay(raw);
  return parsed?.pulse ?? null;
}
