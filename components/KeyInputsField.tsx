import {
  formatKeyInputsText,
  parseKeyInputEntries,
  type KeyInputEntry,
} from "@/lib/monitoringWatchlistFormat";

function KeyInputCard({ entry, index }: { entry: KeyInputEntry; index: number }) {
  const meta = [entry.input_type, entry.commodity_code, entry.sourcing_geography, entry.est_cogs_share]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="monitoring-watchlist-item">
      <h4 className="monitoring-watchlist-name">
        {index}. {entry.input_name}
      </h4>
      {meta ? <p className="monitoring-watchlist-meta muted">{meta}</p> : null}
      {entry.source_or_comment ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Source</span> {entry.source_or_comment}
        </p>
      ) : null}
      {entry.confidence ? (
        <p className="monitoring-watchlist-line muted">Confidence: {entry.confidence}</p>
      ) : null}
    </article>
  );
}

export function KeyInputsField({ raw }: { raw: string }) {
  const entries = parseKeyInputEntries(raw);
  if (!entries.length) {
    const fallback = formatKeyInputsText(raw);
    if (!fallback) return null;
    return <p className="monitoring-watchlist-fallback pre-line">{fallback}</p>;
  }

  return (
    <div className="monitoring-watchlist">
      {entries.map((entry, i) => (
        <KeyInputCard key={`${entry.input_name}-${i}`} entry={entry} index={i + 1} />
      ))}
    </div>
  );
}
