import {
  formatForumWatchlistText,
  parseForumWatchlistEntries,
} from "@/lib/themeOverviewFormat";

export function ForumWatchlistField({ raw }: { raw: string }) {
  const entries = parseForumWatchlistEntries(raw);
  if (!entries?.length) {
    const fallback = formatForumWatchlistText(raw);
    if (!fallback) return null;
    return <p className="forum-watchlist-fallback">{fallback}</p>;
  }

  return (
    <ul className="forum-watchlist">
      {entries.map((entry, i) => {
        const title = [entry.source_type, entry.source].filter(Boolean).join(" — ");
        const priority = entry.priority?.trim();
        return (
          <li key={i} className="forum-watchlist-item">
            <div className="forum-watchlist-head">
              {title ? <span className="forum-watchlist-title">{title}</span> : null}
              {priority ? (
                <span
                  className={`forum-watchlist-priority priority-${priority.toLowerCase()}`}
                >
                  {priority}
                </span>
              ) : null}
            </div>
            {entry.signal_focus ? (
              <p className="forum-watchlist-focus">{entry.signal_focus}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
