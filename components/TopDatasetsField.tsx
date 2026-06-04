import {
  parseTopDatasetEntries,
  type TopDatasetEntry,
} from "@/lib/themeOverviewFormat";

function DatasetCard({ entry }: { entry: TopDatasetEntry }) {
  if (entry.formattedText) {
    return <p className="top-dataset-formatted pre-line">{entry.formattedText}</p>;
  }

  const meta = [entry.dataset_type, entry.source_provider].filter(Boolean).join(" · ");

  return (
    <article className="top-dataset-item">
      <h4 className="top-dataset-name">
        {entry.index}. {entry.dataset_name}
      </h4>
      {meta ? <p className="top-dataset-meta muted">{meta}</p> : null}
      {entry.cadence ? (
        <p className="top-dataset-line">
          <span className="top-dataset-label">Cadence</span> {entry.cadence}
        </p>
      ) : null}
      {entry.why_it_matters ? (
        <p className="top-dataset-line">
          <span className="top-dataset-label">Why it matters</span> {entry.why_it_matters}
        </p>
      ) : null}
      {entry.suggested_query ? (
        <p className="top-dataset-line">
          <span className="top-dataset-label">Suggested query</span> {entry.suggested_query}
        </p>
      ) : null}
      {entry.confidence ? (
        <p className="top-dataset-line muted">Confidence: {entry.confidence}</p>
      ) : null}
    </article>
  );
}

/** Single section for TopDatasetsToTrack JSON or TopDataset1–5 split columns. */
export function TopDatasetsField({ row }: { row: Record<string, string> }) {
  const entries = parseTopDatasetEntries(row);
  if (!entries.length) return null;

  return (
    <div className="top-datasets">
      {entries.map((entry) => (
        <DatasetCard key={entry.index} entry={entry} />
      ))}
    </div>
  );
}
