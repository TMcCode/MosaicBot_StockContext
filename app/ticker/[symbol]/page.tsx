import Link from "next/link";
import { notFound } from "next/navigation";

import {
  allTickerSymbols,
  loadManifest,
  loadTableBody,
  loadTickerMeta,
  loadTickerTablesIndex,
} from "@/lib/data";
import { href } from "@/lib/links";
import { TableSection } from "@/components/TableSection";
import { TickerHeader } from "@/components/TickerHeader";

export function generateStaticParams() {
  return allTickerSymbols().map((symbol) => ({ symbol }));
}

type Props = { params: Promise<{ symbol: string }> };

export default async function TickerPage({ params }: Props) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const meta = loadTickerMeta(symbol);
  if (!meta) {
    notFound();
  }
  const manifest = loadManifest();
  const index = loadTickerTablesIndex(symbol);

  const tables = (index?.tables ?? [])
    .filter((t) => t.has_data && t.body_url)
    .map((t) => ({
      entry: t,
      body: loadTableBody(t.body_url!),
    }))
    .filter((x) => x.body);

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

      {tables.length === 0 ? (
        <section className="card">
          <p className="muted">No table data published for this ticker yet.</p>
        </section>
      ) : null}

      {tables.map(({ entry, body }) =>
        body ? (
          <TableSection key={entry.slug} title={entry.display_name} body={body} />
        ) : null,
      )}
    </>
  );
}
