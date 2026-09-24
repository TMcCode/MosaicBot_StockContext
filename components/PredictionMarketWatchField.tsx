import {
  formatPredictionMarketText,
  parsePredictionMarketEntries,
  predictionMarketVenueLabel,
  registryMatchLabel,
  type PredictionMarketEntry,
} from "@/lib/monitoringWatchlistFormat";

function RegistryBadge({
  entry,
}: {
  entry: Pick<PredictionMarketEntry, "registry_match" | "dataset_id" | "access" | "registry_status">;
}) {
  const match = (entry.registry_match || "").toLowerCase();
  const label = registryMatchLabel(entry.registry_match);
  if (!label && !entry.dataset_id) return null;

  const tone =
    match === "high"
      ? "match-high"
      : match === "medium"
        ? "match-medium"
        : match === "none"
          ? "match-none"
          : "match-unknown";

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

function MarketLink({ slugOrUrl }: { slugOrUrl: string }) {
  const isHttp = /^https?:\/\//i.test(slugOrUrl);
  if (isHttp) {
    return (
      <a href={slugOrUrl} target="_blank" rel="noopener noreferrer">
        {slugOrUrl}
      </a>
    );
  }
  return <span className="prediction-market-slug">{slugOrUrl}</span>;
}

function PredictionMarketCard({ entry, index }: { entry: PredictionMarketEntry; index: number }) {
  const venue = predictionMarketVenueLabel(entry.venue);
  const title = entry.question || entry.market_url_or_slug || `Market ${index}`;

  return (
    <article className="monitoring-watchlist-item">
      <h4 className="monitoring-watchlist-name">
        {index}. {title}
      </h4>
      {venue ? (
        <p className="monitoring-watchlist-meta muted">
          <span className="prediction-market-venue">{venue}</span>
          {entry.confidence ? ` · Confidence: ${entry.confidence}` : null}
        </p>
      ) : entry.confidence ? (
        <p className="monitoring-watchlist-meta muted">Confidence: {entry.confidence}</p>
      ) : null}
      <RegistryBadge entry={entry} />
      {entry.market_url_or_slug && entry.market_url_or_slug !== entry.question ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Market</span>{" "}
          <MarketLink slugOrUrl={entry.market_url_or_slug} />
        </p>
      ) : null}
      {entry.why_stock_matters ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Why it matters</span> {entry.why_stock_matters}
        </p>
      ) : null}
      {entry.suggested_series_key ? (
        <p className="monitoring-watchlist-line">
          <span className="monitoring-watchlist-label">Series key</span>{" "}
          <span className="prediction-market-slug">{entry.suggested_series_key}</span>
        </p>
      ) : null}
    </article>
  );
}

export function PredictionMarketWatchField({ raw }: { raw: string }) {
  const entries = parsePredictionMarketEntries(raw);
  if (!entries.length) {
    const fallback = formatPredictionMarketText(raw);
    if (!fallback || fallback.startsWith("(none")) return null;
    return <p className="monitoring-watchlist-fallback pre-line">{fallback}</p>;
  }

  return (
    <div className="monitoring-watchlist">
      {entries.map((entry, i) => (
        <PredictionMarketCard
          key={`${entry.venue}-${entry.market_url_or_slug || entry.question}-${i}`}
          entry={entry}
          index={i + 1}
        />
      ))}
    </div>
  );
}
