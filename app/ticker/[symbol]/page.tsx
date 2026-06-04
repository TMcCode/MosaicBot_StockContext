import Link from "next/link";
import { notFound } from "next/navigation";

import { TableSection } from "@/components/TableSection";
import { TickerHeader } from "@/components/TickerHeader";
import {
  allTickerSymbols,
  loadManifest,
  loadTickerMeta,
  loadTickerTablesIndex,
} from "@/lib/data";
import { href } from "@/lib/links";

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

  const tableEntries = (index?.tables ?? []).filter((t) => t.has_data && t.body_url);
  const buildId = index?.build_id;

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

      {/* chart_1y + financials: lazy-load from meta.chart_url / meta.financials_url when UI lands */}

      {tableEntries.length === 0 ? (
        <section className="card">
          <p className="muted">No table data published for this ticker yet.</p>
        </section>
      ) : null}

      {tableEntries.map((entry, i) => (
        <TableSection
          key={entry.slug}
          entry={entry}
          buildId={buildId}
          defaultOpen={i === 0}
        />
      ))}
    </>
  );
}
