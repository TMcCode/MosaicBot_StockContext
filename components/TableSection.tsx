import ReactMarkdown from "react-markdown";

import type { TableBody } from "@/lib/types";

export function TableSection({ title, body }: { title: string; body: TableBody }) {
  const markdownCols = new Set(
    body.columns.filter((c) => c.kind === "markdown").map((c) => c.id),
  );

  return (
    <section className="card">
      <h2>{title}</h2>
      {body.format === "single_row" && body.rows[0] ? (
        <div className="grid">
          {body.columns.map((col) => {
            const val = body.rows[0][col.id] ?? "";
            return (
              <div key={col.id}>
                <div className="muted">{col.label}</div>
                {markdownCols.has(col.id) ? (
                  <ReactMarkdown>{val}</ReactMarkdown>
                ) : (
                  <div>{val}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {body.columns.map((col) => (
                  <th key={col.id}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.rows.map((row, i) => (
                <tr key={i}>
                  {body.columns.map((col) => (
                    <td key={col.id}>
                      {markdownCols.has(col.id) ? (
                        <ReactMarkdown>{row[col.id] ?? ""}</ReactMarkdown>
                      ) : (
                        row[col.id] ?? ""
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
