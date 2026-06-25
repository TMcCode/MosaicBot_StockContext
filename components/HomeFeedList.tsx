import { HomeFeedItemTitle } from "@/components/HomeFeedItemTitle";
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

type Props = {
  section: HomeFeedSection;
  /** When true, list scrolls inside a fixed height (home cards). */
  compact?: boolean;
};

export function HomeFeedList({ section, compact = false }: Props) {
  const kind = homeSectionKind(section.id);
  const showDate = showHomeFeedDate(section.id);

  return (
    <ul className={compact ? "home-feed-list" : "home-feed-list home-feed-list-full"}>
      {section.items.map((item) => {
        const itemHref = homeItemHref(item, kind);
        const metricLabel = formatHomeMetric(section.id, item);
        const secondary = homeFeedSecondaryLine(section.id, item, metricLabel);
        const dateLabel = showDate ? formatEventDateShort(item.event_at) : null;
        const muted = !item.meta_url;

        return (
          <li
            key={`${section.id}-${item.symbol}`}
            className={`home-feed-row${muted ? " constituent-muted" : ""}`}
          >
            <div className="home-feed-row-main">
              <HomeFeedItemTitle label={item.label} href={itemHref} kind={kind} />
              {secondary ? (
                <span className="home-feed-secondary muted">{secondary}</span>
              ) : null}
            </div>
            <div className="home-feed-row-meta">
              {metricLabel ? (
                <span className={returnPctClass(item.metric)}>{metricLabel}</span>
              ) : null}
              {muted ? <span className="badge badge-pending">pending</span> : null}
              {dateLabel ? <span className="home-feed-date">{dateLabel}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
