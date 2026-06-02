import Link from "next/link";
import { notFound } from "next/navigation";

import { allThemeSlugs, loadThemeMeta } from "@/lib/data";
import { href, tickerHref } from "@/lib/links";

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

  const withData = meta.constituents.filter((c) => c.has_table_data !== false && c.meta_url);
  const withoutData = meta.constituents.filter((c) => c.has_table_data === false || !c.meta_url);

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / "}
        {meta.name}
      </p>
      <h1>{meta.name}</h1>
      <p className="muted">
        {withData.length} with research notes
        {withoutData.length > 0 ? ` · ${withoutData.length} pending` : ""}
      </p>

      <section className="card">
        <h2>Constituents</h2>
        <ul className="grid constituent-list">
          {meta.constituents.map((c) => {
            const hasPage = c.has_table_data !== false && c.meta_url;
            return (
              <li key={c.symbol} className={hasPage ? undefined : "constituent-muted"}>
                {hasPage ? (
                  <Link href={tickerHref(c.symbol)}>
                    <strong>{c.symbol}</strong>
                  </Link>
                ) : (
                  <strong>{c.symbol}</strong>
                )}
                {c.company_name && c.company_name !== c.symbol ? (
                  <span className="muted"> — {c.company_name}</span>
                ) : null}
                {c.portfolio_weight != null && c.portfolio_weight > 0 ? (
                  <span className="muted"> · {(c.portfolio_weight * 100).toFixed(1)}%</span>
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
