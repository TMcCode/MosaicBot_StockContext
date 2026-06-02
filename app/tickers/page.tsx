import Link from "next/link";

import { TickerBrowse } from "@/components/TickerBrowse";
import { loadSearchIndex } from "@/lib/data";
import { href } from "@/lib/links";

export default function TickersPage() {
  const search = loadSearchIndex();

  if (!search?.tickers?.length) {
    return (
      <div className="card">
        <h1>Tickers</h1>
        <p className="muted">No ticker index in cache. Run npm run sync:cache:cdn.</p>
      </div>
    );
  }

  const tickers = [...search.tickers].sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  );

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / Tickers"}
      </p>
      <h1>Coverage universe</h1>
      <p className="muted">{tickers.length} tickers</p>
      <section className="card">
        <TickerBrowse tickers={tickers} />
      </section>
    </>
  );
}
