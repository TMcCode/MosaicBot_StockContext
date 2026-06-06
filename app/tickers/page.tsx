import Link from "next/link";

import { TextTableActivityStats } from "@/components/TextTableActivityStats";
import { TickerBrowse } from "@/components/TickerBrowse";
import { loadManifest } from "@/lib/data";
import { href } from "@/lib/links";

export default async function TickersPage() {
  const manifest = await loadManifest();
  const count = manifest?.stats?.total_tickers ?? manifest?.tickers.length;

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / Tickers"}
      </p>
      <h1>Tickers with research</h1>
      <p className="muted">
        {count != null
          ? `${count} tickers with notes or earnings context`
          : "Portfolio and watchlist tickers with research notes"}
      </p>
      <TextTableActivityStats manifest={manifest} />
      <section className="card">
        <TickerBrowse />
      </section>
    </>
  );
}
