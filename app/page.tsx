import Link from "next/link";

import { HomeFeedSection } from "@/components/HomeFeedSection";
import { HomeHero } from "@/components/HomeHero";
import { HomeRecentUpdatesMarquee } from "@/components/HomeRecentUpdatesMarquee";
import { HomeUpdatesToReadRow } from "@/components/HomeUpdatesToReadRow";
import { loadHomeFeeds, loadManifest, loadRecentUpdatesMarquee } from "@/lib/data";
import { formatMarqueeAsOfLabel } from "@/lib/formatMarqueeAsOf";
import { href, themeHref } from "@/lib/links";
import { isLegacyUniverseFeed, orderedHomeSections } from "@/lib/homeFeedDisplay";
import { themeHasPublishedPage } from "@/lib/themePage";

export default async function HomePage() {
  const [manifest, home, recentMarquee] = await Promise.all([
    loadManifest(),
    loadHomeFeeds(),
    loadRecentUpdatesMarquee(),
  ]);
  const marqueeAsOfLabel = formatMarqueeAsOfLabel(recentMarquee?.as_of);

  if (!manifest) {
    return (
      <>
        <HomeHero />
        <div className="card">
          <p className="muted">
            Could not load manifest. In dev, JSON is fetched from CDN automatically after publish.
            Offline fallback: <code>npm run sync:cache:feeds</code> or{" "}
            <code>npm run sync:cache:cdn</code>.
          </p>
        </div>
      </>
    );
  }

  const sections = orderedHomeSections(home?.sections);
  const legacyFeed = isLegacyUniverseFeed(sections);
  const showThemesBrowse = legacyFeed || sections.length === 0;
  const updatesTicker = sections.find((s) => s.id === "ticker_updates_to_read");
  const updatesTheme = sections.find((s) => s.id === "theme_updates_to_read");
  const feedSections = sections.filter(
    (s) => s.id !== "ticker_updates_to_read" && s.id !== "theme_updates_to_read",
  );

  return (
    <>
      <HomeHero buildId={manifest.build_id} />

      {recentMarquee ? (
        <HomeRecentUpdatesMarquee data={recentMarquee} asOfLabel={marqueeAsOfLabel} />
      ) : null}

      {legacyFeed ? (
        <div className="card">
          <p className="muted">
            Home feed is still the old format (no 10D panels). Re-run publish with the latest{" "}
            <code>stockcontext_jobs/publish_stockcontext</code>.
          </p>
        </div>
      ) : null}

      {!home?.sections?.length ? (
        <div className="card">
          <p className="muted">
            Missing <code>feeds/home.v0.json</code>. Republish, then reload — dev pulls from CDN
            automatically. Or run <code>npm run sync:cache:feeds</code>.
          </p>
        </div>
      ) : (
        <div className="home-feed-grid">
          <HomeUpdatesToReadRow tickerSection={updatesTicker} themeSection={updatesTheme} />
          {feedSections.map((section) => (
            <HomeFeedSection key={section.id} section={section} />
          ))}
        </div>
      )}

      {showThemesBrowse ? (
        <section className="card">
          <div className="section-header">
            <h2>Themes</h2>
            <Link href={href("/themes")} className="section-link">
              View all {manifest.stats?.total_themes ?? manifest.themes.length} themes →
            </Link>
          </div>
          <p className="muted">
            {manifest.stats?.themes_with_data ??
              manifest.themes.filter(themeHasPublishedPage).length}{" "}
            with research notes
          </p>
          <ul className="grid grid-2">
            {[...manifest.themes]
              .sort((a, b) => {
                const aHas = themeHasPublishedPage(a) ? 0 : 1;
                const bHas = themeHasPublishedPage(b) ? 0 : 1;
                if (aHas !== bHas) return aHas - bHas;
                return a.name.localeCompare(b.name);
              })
              .slice(0, 24)
              .map((theme) => {
                const hasPage = themeHasPublishedPage(theme);
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
      ) : null}
    </>
  );
}
