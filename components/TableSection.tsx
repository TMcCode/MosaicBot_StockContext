import type { TableBody } from "@/lib/types";
import {
  bullBearGroups,
  formatCellValue,
  formatColumnLabel,
  isBullBearLayout,
  isFooterColumn,
  isMetaColumn,
  primaryMarkdownColumn,
  sentimentClass,
  visibleDataColumns,
} from "@/lib/tableDisplay";

import { Markdown } from "./Markdown";

export function TableSection({ title, body }: { title: string; body: TableBody }) {
  const row = body.rows[0];
  const footerBits: string[] = [];

  if (body.format === "single_row" && row) {
    for (const col of body.columns) {
      if (!isFooterColumn(col.id)) continue;
      const val = formatCellValue(col.id, row[col.id] ?? "");
      if (!val || val === "False") continue;
      if (col.id === "Source") footerBits.push(val);
      else if (col.id === "_update_date") footerBits.push(`Updated ${formatCellValue(col.id, val)}`);
    }
  }

  return (
    <section className="card table-section">
      <h2 className="section-title">{title}</h2>
      {body.format === "single_row" && row ? (
        isBullBearLayout(body) ? (
          <BullBearSingleRow body={body} row={row} />
        ) : (
          <OverviewSingleRow body={body} row={row} />
        )
      ) : (
        <MultiRowTable body={body} />
      )}
      {footerBits.length > 0 ? (
        <p className="table-footer muted">{footerBits.join(" · ")}</p>
      ) : null}
    </section>
  );
}

function OverviewSingleRow({ body, row }: { body: TableBody; row: Record<string, string> }) {
  const primary = primaryMarkdownColumn(body);
  const others = visibleDataColumns(body).filter(
    (c) => c.id !== primary?.id && !/^Bull|^Bear/i.test(c.id),
  );

  return (
    <div className="single-row-body">
      {primary ? (
        <Markdown>{row[primary.id] ?? ""}</Markdown>
      ) : null}
      {others.length > 0 ? (
        <dl className="field-grid">
          {others.map((col) => {
            const val = formatCellValue(col.id, row[col.id] ?? "");
            if (!val || val === "False") return null;
            return (
              <div key={col.id} className="field-item">
                <dt>{formatColumnLabel(col.id, col.label)}</dt>
                <dd>
                  {col.kind === "markdown" ? (
                    <Markdown>{val}</Markdown>
                  ) : (
                    val
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </div>
  );
}

function BullBearSingleRow({ body, row }: { body: TableBody; row: Record<string, string> }) {
  const groups = bullBearGroups(body)!;
  const thesis = body.columns.find((c) => c.id === "thesis");
  const thesisUpdate = body.columns.find((c) => c.id === "thesis_update");

  return (
    <div className="single-row-body">
      {thesis && row[thesis.id] ? (
        <div className="thesis-block">
          <h3 className="block-label">Thesis</h3>
          <Markdown>{row[thesis.id]}</Markdown>
        </div>
      ) : null}
      {thesisUpdate && row[thesisUpdate.id] ? (
        <div className="thesis-block">
          <h3 className="block-label">Thesis update</h3>
          <Markdown>{row[thesisUpdate.id]}</Markdown>
        </div>
      ) : null}
      <div className="bull-bear-grid">
        {groups.bulls.length > 0 ? (
          <div className="bull-bear-col bull-col">
            <h3 className="block-label">Bull case</h3>
            <ul className="case-list">
              {groups.bulls.map((col) => (
                <li key={col.id}>
                  <Markdown>{row[col.id] ?? ""}</Markdown>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {groups.bears.length > 0 ? (
          <div className="bull-bear-col bear-col">
            <h3 className="block-label">Bear case</h3>
            <ul className="case-list">
              {groups.bears.map((col) => (
                <li key={col.id}>
                  <Markdown>{row[col.id] ?? ""}</Markdown>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MultiRowTable({ body }: { body: TableBody }) {
  const cols = visibleDataColumns(body).filter((c) => !isMetaColumn(c.id));
  const markdownCols = new Set(cols.filter((c) => c.kind === "markdown").map((c) => c.id));

  if (cols.length === 0) return null;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col.id}>{formatColumnLabel(col.id, col.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.rows.map((r, i) => (
            <tr key={i}>
              {cols.map((col) => {
                const raw = formatCellValue(col.id, r[col.id] ?? "");
                if (col.id === "CommentSentiment" && raw) {
                  return (
                    <td key={col.id}>
                      <span className={sentimentClass(raw)}>{raw}</span>
                    </td>
                  );
                }
                if (col.id === "PriceReaction" && raw) {
                  return (
                    <td key={col.id}>
                      <span className={raw.includes("+") ? "pos" : raw.includes("-") ? "neg" : ""}>
                        {raw}
                      </span>
                    </td>
                  );
                }
                return (
                  <td key={col.id}>
                    {markdownCols.has(col.id) ? <Markdown>{raw}</Markdown> : raw}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
