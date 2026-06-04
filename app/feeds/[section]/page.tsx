import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeFeedList } from "@/components/HomeFeedList";
import { resolveHomeFeedSection } from "@/lib/data";
import {
  HOME_FEED_OVERFLOW_IDS,
  homeFeedPanelSubtitle,
  homeFeedSectionDescription,
  type HomeFeedOverflowId,
} from "@/lib/homeFeedDisplay";
import { href } from "@/lib/links";

type PageProps = {
  params: Promise<{ section: string }>;
};

export function generateStaticParams() {
  return HOME_FEED_OVERFLOW_IDS.map((section) => ({ section }));
}

export default async function HomeFeedSectionPage({ params }: PageProps) {
  const { section: sectionId } = await params;
  if (!(HOME_FEED_OVERFLOW_IDS as readonly string[]).includes(sectionId)) {
    notFound();
  }

  const resolved = await resolveHomeFeedSection(sectionId);
  if (!resolved?.section.items?.length) {
    notFound();
  }

  const { section, previewOnly } = resolved;
  const description = homeFeedSectionDescription(sectionId as HomeFeedOverflowId);
  const subtitle = homeFeedPanelSubtitle(sectionId);

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {` / ${section.title}`}
      </p>
      <h1>{section.title}</h1>
      {subtitle ? <p className="home-feed-panel-subtitle muted">{subtitle}</p> : null}
      {description ? <p className="muted feed-section-lede">{description}</p> : null}
      {previewOnly ? (
        <p className="muted">
          Showing the home preview only (20 rows). Full list loads from{" "}
          <code>feeds/sections/{sectionId}.v0.json</code> in dev after publish, or run{" "}
          <code>npm run sync:cache:feeds</code>.
        </p>
      ) : null}
      <p className="muted">
        {section.items.length} {section.items.length === 1 ? "row" : "rows"}
      </p>
      <section className="card home-feed-panel home-feed-panel-full">
        <HomeFeedList section={section} />
      </section>
    </>
  );
}
