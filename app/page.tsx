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
      <p className="page-intro muted">
        Portfolio and watchlist earnings context · build {manifest.build_id}
      </p>

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
        <div className="section-header">
          <h2>Themes</h2>
          <Link href={href("/themes")} className="section-link">
            View all {manifest.stats?.total_themes ?? manifest.themes.length} themes →
          </Link>
        </div>
        <p className="muted">
          {manifest.stats?.themes_with_data ?? manifest.themes.filter((t) => t.meta_url).length}{" "}
          with research notes
        </p>
        <ul className="grid grid-2">
          {[...manifest.themes]
            .sort((a, b) => {
              const aHas = a.has_table_data !== false && a.meta_url ? 0 : 1;
              const bHas = b.has_table_data !== false && b.meta_url ? 0 : 1;
              if (aHas !== bHas) return aHas - bHas;
              return a.name.localeCompare(b.name);
            })
            .slice(0, 24)
            .map((theme) => {
              const hasPage = theme.has_table_data !== false && theme.meta_url;
              return (
                <li key={theme.slug} className={hasPage ? undefined : "constituent-muted"}>
                  {hasPage ? (
                    <Link href={themeHref(theme.slug)}>{theme.name}</Link>
                  ) : (
                    <span>{theme.name}</span>
                  )}
                  <span className="muted"> · {theme.ticker_count} tickers</span>
                  {!hasPage ? <span className="muted"> · pending</span> : null}
                </li>
              );
            })}
        </ul>
      </section>
    </>
  );
}
