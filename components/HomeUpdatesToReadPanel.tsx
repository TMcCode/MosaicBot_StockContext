"use client";

import { HomeUpdatesToReadList } from "@/components/HomeUpdatesToReadList";
import { homeFeedPanelSubtitle, type HomeFeedSection } from "@/lib/homeFeedDisplay";
import type { PageType } from "@/lib/readState/types";

/** Max ranked rows published per updates panel (home + feed JSON). */
export const UPDATES_TO_READ_DAILY_LIMIT = 20;
/** Unread rows visible on the home card at once. */
export const UPDATES_TO_READ_HOME_PREVIEW = 10;

type Props = {
  section: HomeFeedSection;
  pageType: PageType;
  /** Max unread rows on the home grid. */
  homeLimit?: number;
};

export function HomeUpdatesToReadPanel({
  section,
  pageType,
  homeLimit = UPDATES_TO_READ_HOME_PREVIEW,
}: Props) {
  const subtitle = homeFeedPanelSubtitle(section.id);

  return (
    <section className="card home-feed-panel">
      <div className="section-header home-feed-panel-header">
        <div className="home-feed-panel-titles">
          <h2>{section.title}</h2>
          {subtitle ? <p className="home-feed-panel-subtitle muted">{subtitle}</p> : null}
        </div>
      </div>
      <HomeUpdatesToReadList section={section} pageType={pageType} homeLimit={homeLimit} />
    </section>
  );
}
