import Link from "next/link";

import { HomeFeedList } from "@/components/HomeFeedList";
import { homeFeedPanelSubtitle, homeSectionOverflowLink, type HomeFeedSection } from "@/lib/homeFeedDisplay";

type Props = {
  section: HomeFeedSection;
};

export function HomeFeedSection({ section }: Props) {
  const overflow = homeSectionOverflowLink(section.id);
  const subtitle = homeFeedPanelSubtitle(section.id);

  return (
    <section className="card home-feed-panel">
      <div className="section-header home-feed-panel-header">
        <div className="home-feed-panel-titles">
          <h2>{section.title}</h2>
          {subtitle ? <p className="home-feed-panel-subtitle muted">{subtitle}</p> : null}
        </div>
        {overflow ? (
          <Link href={overflow.href} className="section-link">
            {overflow.label} →
          </Link>
        ) : null}
      </div>
      {section.items.length === 0 ? (
        <p className="muted">No rows for this panel yet.</p>
      ) : (
        <HomeFeedList section={section} compact />
      )}
    </section>
  );
}
