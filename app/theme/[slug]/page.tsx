import Link from "next/link";
import { notFound } from "next/navigation";

import { allThemeSlugs, loadThemeMeta } from "@/lib/data";
import { href } from "@/lib/links";

export function generateStaticParams() {
  return allThemeSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export default async function ThemePage({ params }: Props) {
  const { slug } = await params;
  const meta = loadThemeMeta(slug);
  if (!meta) {
    notFound();
  }

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / "}
        {meta.name}
      </p>
      <h1>{meta.name}</h1>
      <p className="muted">{meta.ticker_count} tickers in theme</p>

      <section className="card">
        <h2>Constituents</h2>
        <ul className="grid">
          {meta.constituents.map((c) => (
            <li key={c.symbol}>
              <Link href={href(`/ticker/${c.symbol}`)}>
                <strong>{c.symbol}</strong>
              </Link>
              {c.company_name ? (
                <span className="muted"> — {c.company_name}</span>
              ) : null}
              {c.portfolio_weight != null && c.portfolio_weight > 0 ? (
                <span className="muted"> · {(c.portfolio_weight * 100).toFixed(1)}%</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
