import { loadTableBody } from "@/lib/data";
import { TableSectionContent } from "@/components/TableSectionContent";
import type { TableIndexEntry } from "@/lib/types";

type Props = {
  entry: TableIndexEntry;
  buildId?: string;
  defaultOpen?: boolean;
};

/** Server-rendered table accordion (reads `.cache` / CDN via `loadTableBody`). */
export async function TableSection({ entry, buildId, defaultOpen = false }: Props) {
  let error: string | null = null;
  const body = entry.body_url
    ? await loadTableBody(entry.body_url, buildId).catch((e: unknown) => {
        error = e instanceof Error ? e.message : "Failed to load section";
        return null;
      })
    : null;

  return (
    <details className="card table-section table-accordion" open={defaultOpen}>
      <summary className="table-accordion-summary">
        <div className="table-accordion-heading">
          <span className="section-title">{entry.display_name}</span>
          {body && body.rows.length > 1 ? (
            <span className="table-meta-chip muted">{body.rows.length} rows</span>
          ) : entry.format === "multi_row" ? (
            <span className="table-meta-chip muted">Table</span>
          ) : null}
        </div>
        {entry.preview ? <p className="table-preview muted">{entry.preview}</p> : null}
      </summary>
      <div className="table-accordion-body">
        {error ? <p className="muted">Could not load section ({error}).</p> : null}
        {!error && !body ? <p className="muted">No data for this section.</p> : null}
        {body ? <TableSectionContent body={body} /> : null}
      </div>
    </details>
  );
}
