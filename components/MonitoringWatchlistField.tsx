import {
  formatWatchlistText,
  parseWatchlistEntries,
  registryMatchLabel,
  type WatchlistEntry,
} from "@/lib/monitoringWatchlistFormat";

function RegistryBadge({ entry }: { entry: Pick<WatchlistEntry, "registry_match" | "dataset_id" | "access" | "registry_status"> }) {
  const match = (entry.registry_match || "").toLowerCase();
  const label = registryMatchLabel(entry.registry_match);
  if (!label && !entry.dataset_id) return null;

  const tone =
    match === "high" ? "match-high" : match === "medium" ? "match-medium" : match === "none" ? "match-none" : "match-unknown";

  const detail = [
    entry.dataset_id || null,
    entry.access ? `access=${entry.access}` : null,
    entry.registry_status && entry.registry_status !== "pull" ? entry.registry_status : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <p className={`monitoring-watchlist-registry ${tone}`}>
      <span className="monitoring-watchlist-registry-label">{label || "Registry"}</span>
      {detail ? <span className="monitoring-watchlist-registry-detail">{detail}</span> : null}
    </p>
  );
}

function WatchlistCard({ entry, index }: { entry: WatchlistEntry; index: number }) {
  const title =
    [entry.provider_or_source, entry.dataset_or_product].filter(Boolean).join(" — ") ||
    `Item ${index}`;

  return (
    <article className="monitoring-watchlist-item">
      <h4 className="monitoring-watchlist-name">
        {index}. {title}
      </h4>
      <RegistryBadge entry={entry} />
      {entry.metric_or_field ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Metric/field</span> {entry.metric_or_field}
        </p>
      ) : null}
      {entry.cadence ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Cadence</span> {entry.cadence}
        </p>
      ) : null}
      {entry.why_it_matters ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Why it matters</span> {entry.why_it_matters}
        </p>
      ) : null}
      {entry.signal_to_watch ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Signal to watch</span> {entry.signal_to_watch}
        </p>
      ) : null}
      {entry.confidence ? (
        <p className="monitoring-watchlist-line muted">Confidence: {entry.confidence}</p>
      ) : null}
    </article>
  );
}

export function MonitoringWatchlistField({ raw }: { raw: string }) {
  const entries = parseWatchlistEntries(raw);
  if (!entries.length) {
    const fallback = formatWatchlistText(raw);
    if (!fallback) return null;
    return <p className="monitoring-watchlist-fallback pre-line">{fallback}</p>;
  }

  return (
    <div className="monitoring-watchlist">
      {entries.map((entry, i) => (
        <WatchlistCard key={`${entry.provider_or_source}-${i}`} entry={entry} index={i + 1} />
      ))}
    </div>
  );
}
