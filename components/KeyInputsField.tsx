import {
  formatKeyInputsText,
  parseKeyInputEntries,
  registryMatchLabel,
  type KeyInputEntry,
} from "@/lib/monitoringWatchlistFormat";

function RegistryBadge({ entry }: { entry: Pick<KeyInputEntry, "registry_match" | "dataset_id" | "access" | "registry_status"> }) {
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

function KeyInputCard({ entry, index }: { entry: KeyInputEntry; index: number }) {
  const meta = [entry.input_type, entry.commodity_code, entry.sourcing_geography, entry.est_cogs_share]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="monitoring-watchlist-item">
      <h4 className="monitoring-watchlist-name">
        {index}. {entry.input_name}
      </h4>
      <RegistryBadge entry={entry} />
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
