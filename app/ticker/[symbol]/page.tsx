import Link from "next/link";
import { notFound } from "next/navigation";

import { LazyTableSection } from "@/components/LazyTableSection";
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

      {tableEntries.map((prepared, i) =>
        prepared.entry.lazy || prepared.entry.slug === "key-reported-metrics-history" ? (
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
            defaultOpen={i === 0}
          />
        ),
      )}
    </>
  );
}

type PreparedTableEntry = {
  entry: TableIndexEntry;
  body?: TableBody | null;
};

async function prepareTickerTableEntries(
  tables: TableIndexEntry[],
  buildId?: string,
): Promise<PreparedTableEntry[]> {
  const withData = tables.filter((t) => t.has_data && t.body_url);
  const detailed = withData.find((t) => t.slug === "detailed-overview");
  const rest = withData.filter((t) => t.slug !== "detailed-overview");

  const prepared: PreparedTableEntry[] = [];
  for (const entry of rest) {
    // History sidecar: never preload — LazyTableSection fetches on open.
    if (entry.lazy || entry.slug === "key-reported-metrics-history") {
      prepared.push({ entry });
      continue;
    }
    if (entry.slug !== "overview") {
      prepared.push({ entry });
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
