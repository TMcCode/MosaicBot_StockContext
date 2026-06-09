import type { TableBody } from "@/lib/types";
import {
  formatCellValue,
  formatColumnLabel,
  isCollapsibleTranscriptRowsTable,
  isCollapsibleTranscriptMetaColumn,
  isMetaColumn,
  isTranscriptTidbitsTable,
  sentimentClass,
  sortCollapsibleTranscriptColumns,
  sortTranscriptRowsByDate,
  tableColumnLayoutClass,
  transcriptRowDate,
  visibleDataColumns,
} from "@/lib/tableDisplay";

import { Markdown } from "./Markdown";

type Props = {
  body: TableBody;
};

function renderCell(
  body: TableBody,
  col: TableBody["columns"][number],
  row: Record<string, string>,
  markdownCols: Set<string>,
) {
  const raw = formatCellValue(col.id, row[col.id] ?? "");
  const cellClass = tableColumnLayoutClass(col.id, body);

  if (col.id === "CommentSentiment" && raw) {
    return (
      <td key={col.id} className={cellClass}>
        <span className={sentimentClass(raw)}>{raw}</span>
      </td>
    );
  }
  if (col.id === "PriceReaction" && raw) {
    return (
      <td key={col.id} className={cellClass}>
        <span className={raw.includes("+") ? "pos" : raw.includes("-") ? "neg" : ""}>{raw}</span>
      </td>
    );
  }
  return (
    <td key={col.id} className={cellClass}>
      {markdownCols.has(col.id) ? <Markdown>{raw}</Markdown> : raw}
    </td>
  );
}

export function CollapsibleTranscriptRowsTable({ body }: Props) {
  if (!isCollapsibleTranscriptRowsTable(body)) return null;

  const cols = sortCollapsibleTranscriptColumns(
    visibleDataColumns(body).filter(
      (c) => !isMetaColumn(c.id) && !isCollapsibleTranscriptMetaColumn(c.id),
    ),
  );
  const rows = sortTranscriptRowsByDate(body.rows);
  const markdownCols = new Set(cols.filter((c) => c.kind === "markdown").map((c) => c.id));
  const tidbits = isTranscriptTidbitsTable(body);
  const wrapClass = tidbits
    ? "table-wrap table-collapsible-transcript table-tidbits"
    : "table-wrap table-collapsible-transcript";

  if (cols.length === 0 || rows.length === 0) return null;

  return (
    <div className="tidbits-transcripts">
      {rows.map((row, i) => {
        const date = transcriptRowDate(row);
        const transcript = formatCellValue("TranscriptName", row.TranscriptName ?? "");
        const summaryParts = tidbits ? [date].filter(Boolean) : [date, transcript].filter(Boolean);

        return (
          <details key={`${date}-${transcript}-${i}`} className="tidbits-transcript" open={i === 0}>
            <summary className="tidbits-transcript-summary">
              {summaryParts.length > 0 ? (
                summaryParts.map((part, j) => (
                  <span key={j} className={j === 0 ? "tidbits-summary-date" : "tidbits-summary-name"}>
                    {j > 0 ? <span className="tidbits-summary-sep"> · </span> : null}
                    {j === 0 ? <time dateTime={part}>{part}</time> : part}
                  </span>
                ))
              ) : (
                <span className="muted">Transcript</span>
              )}
            </summary>
            <div className={wrapClass}>
              <table className="data-table">
                <thead>
                  <tr>
                    {cols.map((col) => (
                      <th key={col.id} className={tableColumnLayoutClass(col.id, body)}>
                        {formatColumnLabel(col.id, col.label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>{cols.map((col) => renderCell(body, col, row, markdownCols))}</tr>
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
