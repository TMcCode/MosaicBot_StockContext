import Link from "next/link";
import { notFound } from "next/navigation";

import { TableSection } from "@/components/TableSection";
import { TierBadge } from "@/components/TierBadge";
import {
  allThemeSlugs,
  loadTableBody,
  loadThemeMeta,
  loadThemeTablesIndex,
} from "@/lib/data";
import { href, tickerHref } from "@/lib/links";
import { formatDateOnly } from "@/lib/tableDisplay";
import {
  formatThemeContentStats,
  formatTickerCoverageStats,
} from "@/lib/themePageStats";

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

  const tableEntries = (tablesIndex?.tables ?? []).filter((t) => t.has_data && t.body_url);
  const buildId = tablesIndex?.build_id;
  const overviewEntry = tableEntries.find((t) => t.slug === "overview");
  const bullBearEntry = tableEntries.find((t) => t.slug === "bull-bear-details");
  let lastUpdated = formatDateOnly(meta.last_updated_at);
  if (overviewEntry?.body_url) {
    const overviewBody = await loadTableBody(overviewEntry.body_url, buildId);
    const row = overviewBody?.rows[0];
    const fromOverview = formatDateOnly(row?.LastUpdated ?? row?.last_updated);
    if (fromOverview) lastUpdated = fromOverview;
  }
  let hasThesisFromTables = meta.content?.has_thesis;
  if (hasThesisFromTables == null && bullBearEntry?.body_url) {
    const bullBearBody = await loadTableBody(bullBearEntry.body_url, buildId);
    const thesis = bullBearBody?.rows[0]?.thesis?.trim();
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
        <h1>{meta.name}</h1>
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

      {tableEntries.length === 0 ? (
        <section className="card">
          <p className="muted">
            Theme text tables are not in your local/CDN bundle yet (marquee only means rows
            exist in R2 — each theme still needs a publish). Run:{" "}
            <code>
              python -m stockcontext_jobs.publish_stockcontext --themes-only --theme-slug {slug}
            </code>{" "}
            or <code>--themes-only</code> without <code>--theme-slug</code> for all themes.
          </p>
        </section>
      ) : (
        tableEntries.map((entry, i) => (
          <TableSection
            key={entry.slug}
            entry={entry}
            buildId={buildId}
            defaultOpen={i === 0}
          />
        ))
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
