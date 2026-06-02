import Link from "next/link";
import { notFound } from "next/navigation";

import {
  allTickerSymbols,
  loadTableBody,
  loadTickerMeta,
  loadTickerTablesIndex,
} from "@/lib/data";
import { href } from "@/lib/links";
import { TableSection } from "@/components/TableSection";

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
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / "}
        {symbol}
      </p>
      <h1>
        {symbol}
        {meta.company_name && meta.company_name !== symbol ? (
          <span className="muted" style={{ fontWeight: 400, fontSize: "1rem" }}>
            {" "}
            — {meta.company_name}
          </span>
        ) : null}
      </h1>
      {meta.primary_theme ? (
        <p className="muted">Primary theme: {meta.primary_theme}</p>
      ) : null}
      {meta.themes?.length ? (
        <p className="muted">Themes: {meta.themes.join(" · ")}</p>
      ) : null}

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
