"use client";

import { useCallback, useMemo, useState } from "react";

import { HomeFeedItemTitle } from "@/components/HomeFeedItemTitle";
import { useReadState } from "@/components/ReadStateProvider";
import { UPDATES_TO_READ_HOME_PREVIEW } from "@/components/HomeUpdatesToReadPanel";
import {
  formatEventDateShort,
  formatHomeMetric,
  homeFeedSecondaryLine,
  homeItemHref,
  homeSectionKind,
  returnPctClass,
  showHomeFeedDate,
  type HomeFeedSection,
} from "@/lib/homeFeedDisplay";
import type { PageType } from "@/lib/readState/types";

type Props = {
  section: HomeFeedSection;
  pageType: PageType;
  /** Max unread rows visible at once on home; 0 = show all in section. */
  homeLimit?: number;
};

export function HomeUpdatesToReadList({ section, pageType, homeLimit = UPDATES_TO_READ_HOME_PREVIEW }: Props) {
  const readState = useReadState();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const kind = homeSectionKind(section.id);
  const showDate = showHomeFeedDate(section.id);

  const readStateReady = readState?.ready ?? false;

  const displayItems = useMemo(() => {
    const filtered = readStateReady
      ? section.items.filter((item) =>
          readState!.isPageUnread(pageType, item.symbol, item.content_build_id, {
            currentEventAt: item.event_at,
          }),
        )
      : section.items;
    return homeLimit > 0 ? filtered.slice(0, homeLimit) : filtered;
  }, [section.items, pageType, readState, readStateReady, homeLimit]);

  const handleMarkRead = useCallback(
    async (symbol: string, buildId: string | undefined) => {
      if (!readState || !buildId) return;
      setBusyKey(symbol);
      try {
        await readState.markRead(pageType, symbol, buildId);
      } finally {
        setBusyKey(null);
      }
    },
    [readState, pageType],
  );

  if (section.items.length === 0) {
    return <p className="muted home-feed-all-read">No updates match the criteria right now.</p>;
  }

  if (readStateReady && displayItems.length === 0) {
    return <p className="muted home-feed-all-read">All read for now — nothing new until tables update.</p>;
  }

  return (
    <ul className="home-feed-list">
      {displayItems.map((item) => {
        const itemHref = homeItemHref(item, kind);
        const metricLabel = formatHomeMetric(section.id, item);
        const secondary = homeFeedSecondaryLine(section.id, item, metricLabel);
        const dateLabel = showDate ? formatEventDateShort(item.event_at) : null;
        const muted = !item.meta_url;
        const canMark = Boolean(item.content_build_id && readStateReady && readState);
        const marking = busyKey === item.symbol;

        return (
          <li
            key={`${section.id}-${item.symbol}-${item.content_build_id ?? ""}`}
            className={`home-feed-row home-feed-row-updates${muted ? " constituent-muted" : ""}`}
          >
            <div className="home-feed-row-main">
              <HomeFeedItemTitle label={item.label} href={itemHref} kind={kind} />
              {secondary ? (
                <span className="home-feed-secondary muted">{secondary}</span>
              ) : null}
              {canMark ? (
                <button
                  type="button"
                  className="home-feed-mark-read-btn"
                  aria-label={`Mark ${item.label} as read`}
                  disabled={marking}
                  onClick={() => void handleMarkRead(item.symbol, item.content_build_id)}
                >
                  {marking ? "Saving…" : "Mark read"}
                </button>
              ) : null}
            </div>
            <div className="home-feed-row-meta">
              {metricLabel ? (
                <span className={returnPctClass(item.metric)}>{metricLabel}</span>
              ) : null}
              {dateLabel ? <span className="home-feed-date">{dateLabel}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
