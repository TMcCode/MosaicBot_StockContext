import Link from "next/link";
import { notFound } from "next/navigation";

import { LazyTableSection } from "@/components/LazyTableSection";
import { PageReadControl } from "@/components/PageReadControl";
import { TableSection } from "@/components/TableSection";
import { TierBadge } from "@/components/TierBadge";
import {
  allThemeSlugs,
  loadTableBody,
  loadThemeMeta,
  loadThemeTablesIndex,
} from "@/lib/data";
import { href, stockthemesThemeUrl, tickerHref } from "@/lib/links";
import { formatDateOnly } from "@/lib/tableDisplay";
import {
  formatThemeContentStats,
  formatTickerCoverageStats,
} from "@/lib/themePageStats";
import { orderThemeTableEntries } from "@/lib/themeTableOrder";
import type { TableBody, TableIndexEntry } from "@/lib/types";

/** Only section inlined at build; rest lazy-load from CDN on accordion open. */
const THEME_EAGER_TABLE_SLUG = "bull-bear-details";

export function generateStaticParams() {
  return allThemeSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export default async function ThemePage({ params }: Props) {
  const { slug } = await params;
  const [meta, tablesIndex] = await Promise.all([
    loadThemeMeta(slug),
    loadThemeTablesIndex(slug),
  ]);
  if (!meta) {
    notFound();
  }

  const buildId = tablesIndex?.build_id;
  const { tableEntries, bullBearBody } = await prepareThemeTableEntries(
    orderThemeTableEntries((tablesIndex?.tables ?? []).filter((t) => t.has_data && t.body_url)),
    buildId,
  );
  const lastUpdated = formatDateOnly(meta.last_updated_at);
  let hasThesisFromTables = meta.content?.has_thesis;
  if (hasThesisFromTables == null && bullBearBody) {
    const thesis = bullBearBody.rows[0]?.thesis?.trim();
    hasThesisFromTables = Boolean(thesis && thesis !== "False");
  }
  const withData = meta.constituents.filter((c) => c.has_table_data !== false);
  const withoutData = meta.constituents.filter((c) => c.has_table_data === false);
  const themeTables = tablesIndex?.tables ?? [];
  const themeSectionsReady =
    themeTables.length > 0
      ? themeTables.filter((t) => t.has_data).length
      : tableEntries.length;
  const themeSectionsTotal = themeTables.length > 0 ? themeTables.length : 5;
  const themeContentLine = formatThemeContentStats({
    content: meta.content,
    hasThesisFromTables,
    themeSectionsReady,
    themeSectionsTotal,
  });
  const tickerCoverageLine = formatTickerCoverageStats(withData.length, withoutData.length);

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / "}
        <Link href={href("/themes")}>Themes</Link>
        {" / "}
        {meta.name}
      </p>
      <div className="theme-page-header">
        <h1>
          {meta.name}
          {meta.coverage === "portfolio" ? (
            <>
              {" "}
              <span className="badge badge-coverage-portfolio">Portfolio</span>
            </>
          ) : meta.coverage === "watchlist" ? (
            <>
              {" "}
              <span className="badge badge-coverage-watchlist">Watchlist</span>
            </>
          ) : null}{" "}
          <span className="theme-stockthemes-paren">
            (
            <a
              href={stockthemesThemeUrl(slug)}
              target="_blank"
              rel="noopener noreferrer"
            >
              view performance
            </a>
            )
          </span>
        </h1>
        {lastUpdated ? (
          <p className="theme-last-updated muted">
            <span className="theme-last-updated-label">Last updated</span>
            <time dateTime={lastUpdated}>{lastUpdated}</time>
          </p>
        ) : null}
      </div>
      <p className="muted theme-page-stats">
        <span className="theme-page-stats-theme">
          <span className="theme-page-stats-label">Theme</span> {themeContentLine}
        </span>
        <span className="theme-page-stats-sep"> · </span>
        <span className="theme-page-stats-tickers">
          <span className="theme-page-stats-label">Tickers</span> {tickerCoverageLine}
        </span>
      </p>

      <PageReadControl pageType="theme" pageKey={slug} buildId={buildId} />

      {tableEntries.length === 0 ? (
        <section className="card">
          <p className="muted">
            Theme research sections are not available on this build yet. Data may still be
            publishing to the CDN — try again after the next site deploy. If this persists,
            republish from MosaicBot:{" "}
            <code>
              python -m stockcontext_jobs.publish_stockcontext --themes-only --theme-slug {slug}
            </code>
          </p>
        </section>
      ) : (
        <>
          <p className="page-intro muted">
            <strong>Bull / Bear Details</strong> has the investment thesis and bull/bear
            points. <strong>Overview</strong> is monitoring guidance (hiring, forums,
            second-order trends, search keywords, Google Trends, datasets).
          </p>
          {tableEntries.map((prepared) =>
            prepared.lazy ? (
              <LazyTableSection
                key={prepared.entry.slug}
                entry={prepared.entry}
                buildId={buildId}
                defaultOpen={false}
              />
            ) : (
              <TableSection
                key={prepared.entry.slug}
                entry={prepared.entry}
                buildId={buildId}
                body={prepared.body}
                defaultOpen={prepared.entry.slug === THEME_EAGER_TABLE_SLUG}
              />
            ),
          )}
        </>
      )}

      <section className="card">
        <h2>Constituents</h2>
        <ul className="grid constituent-list">
          {meta.constituents.map((c) => {
            const hasPage = c.has_table_data !== false;
            return (
              <li key={c.symbol} className={hasPage ? "browse-row" : "browse-row constituent-muted"}>
                <div className="browse-row-primary">
                  {hasPage ? (
                    <Link href={tickerHref(c.symbol)}>
                      <strong>{c.symbol}</strong>
                    </Link>
                  ) : (
                    <strong>{c.symbol}</strong>
                  )}
                  <TierBadge tier={c.tier} />
                  {c.portfolio_weight != null && c.portfolio_weight > 0 ? (
                    <span className="badge badge-weight">
                      {(c.portfolio_weight * 100).toFixed(1)}%
                    </span>
                  ) : null}
                </div>
                {c.company_name && c.company_name !== c.symbol ? (
                  <span className="muted"> — {c.company_name}</span>
                ) : null}
                {!hasPage ? <span className="muted"> · no notes yet</span> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

type PreparedThemeTableEntry = {
  entry: TableIndexEntry;
  body?: TableBody | null;
  lazy?: boolean;
};

async function prepareThemeTableEntries(
  entries: TableIndexEntry[],
  buildId?: string,
): Promise<{ tableEntries: PreparedThemeTableEntry[]; bullBearBody: TableBody | null }> {
  let bullBearBody: TableBody | null = null;
  const tableEntries: PreparedThemeTableEntry[] = [];

  for (const entry of entries) {
    if (entry.slug === THEME_EAGER_TABLE_SLUG) {
      const body = entry.body_url
        ? await loadTableBody(entry.body_url, buildId).catch(() => null)
        : null;
      bullBearBody = body;
      tableEntries.push({ entry, body });
      continue;
    }
    tableEntries.push({ entry, lazy: true });
  }

  return { tableEntries, bullBearBody };
}
