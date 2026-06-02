import Link from "next/link";

import { SearchBox } from "@/components/SearchBox";
import { loadHomeFeeds, loadManifest, loadSearchIndex } from "@/lib/data";
import { href, themeHref, tickerHref } from "@/lib/links";

export default function HomePage() {
  const manifest = loadManifest();
  const home = loadHomeFeeds();
  const search = loadSearchIndex();

  if (!manifest) {
    return (
      <div className="card">
        <h1>Stock Context</h1>
        <p className="muted">
          No build cache found. Run <code>npm run sync:cache</code> or wait for CI to sync R2
          JSON into <code>.cache/stockcontext-public</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1>Stock Context</h1>
      <p className="muted">Build {manifest.build_id} · {manifest.as_of}</p>

      {search ? (
        <section className="card">
          <SearchBox tickers={search.tickers} themes={search.themes} />
        </section>
      ) : null}

      {home?.sections.map((section) => (
        <section key={section.id} className="card">
          <div className="section-header">
            <h2>{section.title}</h2>
            {section.id === "universe" ? (
              <Link href={href("/tickers")} className="section-link">
                View all {manifest.stats?.total_tickers ?? manifest.tickers.length} tickers →
              </Link>
            ) : null}
          </div>
          <ul className="grid grid-2">
            {section.items.map((item) => (
              <li key={item.symbol}>
                <Link href={tickerHref(item.symbol)}>
                  <strong>{item.label}</strong>
                </Link>
                {item.sublabel && item.sublabel !== item.label ? (
                  <div className="muted">{item.sublabel}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card">
        <h2>Themes</h2>
        <ul className="grid grid-2">
          {manifest.themes.map((theme) => (
            <li key={theme.slug}>
              <Link href={themeHref(theme.slug)}>{theme.name}</Link>
              <span className="muted"> · {theme.ticker_count} tickers</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
