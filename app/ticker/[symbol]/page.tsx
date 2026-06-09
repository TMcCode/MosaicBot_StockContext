import Link from "next/link";
import { notFound } from "next/navigation";

import { PageReadControl } from "@/components/PageReadControl";
import { TableSection } from "@/components/TableSection";
import { TickerHeader } from "@/components/TickerHeader";
import {
  allTickerSymbols,
  loadManifest,
  loadTableBody,
  loadTickerMeta,
  loadTickerTablesIndex,
} from "@/lib/data";
import { href } from "@/lib/links";
import {
  COMBINED_METRICS_DISPLAY_NAME,
  METRICS_COMBINE_HIDE_SLUGS,
  type MetricsBundle,
} from "@/lib/keyMetricsCombined";
import { mergeOverviewTableBodies } from "@/lib/mergeOverviewTableBodies";
import type { TableBody, TableIndexEntry } from "@/lib/types";

export function generateStaticParams() {
  return allTickerSymbols().map((symbol) => ({ symbol }));
}

type Props = { params: Promise<{ symbol: string }> };

export default async function TickerPage({ params }: Props) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const [meta, manifest, index] = await Promise.all([
    loadTickerMeta(symbol),
    loadManifest(),
    loadTickerTablesIndex(symbol),
  ]);
  if (!meta) {
    notFound();
  }

  const buildId = index?.build_id;
  const tableEntries = await prepareTickerTableEntries(index?.tables ?? [], buildId);

  return (
    <>
      <nav className="breadcrumb muted">
        <Link href={href("/")}>Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href={href("/tickers")}>Tickers</Link>
        <span aria-hidden="true"> / </span>
        <span>{symbol}</span>
      </nav>
      <TickerHeader symbol={symbol} meta={meta} manifest={manifest} />
      <PageReadControl pageType="ticker" pageKey={symbol} buildId={buildId} />

      {/* chart_1y + financials: lazy-load from meta.chart_url / meta.financials_url when UI lands */}

      {tableEntries.length === 0 ? (
        <section className="card">
          <p className="muted">No table data published for this ticker yet.</p>
        </section>
      ) : null}

      {tableEntries.map((prepared, i) => (
        <TableSection
          key={prepared.entry.slug}
          entry={prepared.entry}
          buildId={buildId}
          body={prepared.body}
          metricsBundle={prepared.metricsBundle}
          defaultOpen={i === 0}
        />
      ))}
    </>
  );
}

type PreparedTableEntry = {
  entry: TableIndexEntry;
  body?: TableBody | null;
  metricsBundle?: MetricsBundle;
};

function shouldHideCombinedMetricsSection(slug: string, combineMetrics: boolean): boolean {
  return combineMetrics && (METRICS_COMBINE_HIDE_SLUGS as readonly string[]).includes(slug);
}

async function prepareTickerTableEntries(
  tables: TableIndexEntry[],
  buildId?: string,
): Promise<PreparedTableEntry[]> {
  const withData = tables.filter((t) => t.has_data && t.body_url);
  const detailed = withData.find((t) => t.slug === "detailed-overview");
  const rest = withData.filter((t) => t.slug !== "detailed-overview");
  const combineMetrics = rest.some((t) => t.slug === "key-reported-metrics");
  const metricsEntries = combineMetrics
    ? {
        key: rest.find((t) => t.slug === "key-reported-metrics"),
        rerating: rest.find((t) => t.slug === "rerating-thresholds"),
        earnings: rest.find((t) => t.slug === "earnings-results"),
      }
    : null;

  let reratingBody: TableBody | null = null;
  let earningsBody: TableBody | null = null;
  if (metricsEntries) {
    [reratingBody, earningsBody] = await Promise.all([
      metricsEntries.rerating?.body_url
        ? loadTableBody(metricsEntries.rerating.body_url, buildId).catch(() => null)
        : null,
      metricsEntries.earnings?.body_url
        ? loadTableBody(metricsEntries.earnings.body_url, buildId).catch(() => null)
        : null,
    ]);
  }

  const prepared: PreparedTableEntry[] = [];
  for (const entry of rest) {
    if (shouldHideCombinedMetricsSection(entry.slug, combineMetrics)) {
      continue;
    }

    if (entry.slug !== "overview") {
      if (entry.slug === "key-reported-metrics" && metricsEntries) {
        const keyBody = entry.body_url
          ? await loadTableBody(entry.body_url, buildId).catch(() => null)
          : null;
        prepared.push({
          entry: {
            ...entry,
            display_name: COMBINED_METRICS_DISPLAY_NAME,
          },
          body: keyBody,
          metricsBundle: keyBody
            ? {
                keyReported: keyBody,
                rerating: reratingBody,
                earningsResults: earningsBody,
              }
            : undefined,
        });
      } else {
        prepared.push({ entry });
      }
      continue;
    }
    const overviewBody = entry.body_url
      ? await loadTableBody(entry.body_url, buildId).catch(() => null)
      : null;
    const detailedBody =
      detailed?.body_url && detailed.body_url !== entry.body_url
        ? await loadTableBody(detailed.body_url, buildId).catch(() => null)
        : null;
    prepared.push({
      entry,
      body: mergeOverviewTableBodies(overviewBody, detailedBody),
    });
  }
  return prepared;
}
