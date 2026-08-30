import {
  formatPublicationsText,
  parsePublicationEntries,
} from "@/lib/monitoringWatchlistFormat";

export function IndustryPublicationsField({ raw }: { raw: string }) {
  const entries = parsePublicationEntries(raw);
  if (!entries.length) {
    const fallback = formatPublicationsText(raw);
    if (!fallback) return null;
    return <p className="monitoring-watchlist-fallback pre-line">{fallback}</p>;
  }

  return (
    <ul className="overview-bullet-list">
      {entries.map((entry, i) => {
        const head = entry.domain ? `${entry.name} (${entry.domain})` : entry.name;
        return (
          <li key={`${entry.name}-${i}`}>
            <strong>{head}</strong>
            {entry.why ? ` — ${entry.why}` : null}
          </li>
        );
      })}
    </ul>
  );
}
