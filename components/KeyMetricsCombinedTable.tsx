import { hitTargetClass, type MetricsCombinedTableBody } from "@/lib/keyMetricsCombined";

import { Markdown } from "./Markdown";

type Props = {
  body: MetricsCombinedTableBody;
};

export function KeyMetricsCombinedTable({ body }: Props) {
  const showRerating = body.meta?.show_rerating ?? false;
  const showResults = body.meta?.show_results ?? false;
  const rows = body.rows;

  if (rows.length === 0) return null;

  return (
    <div className="table-wrap table-metrics-combined">
      <table className="data-table metrics-combined-table">
        <thead>
          <tr className="metrics-combined-group-row">
            <th colSpan={3} className="metrics-group-label metrics-group-krm">
              Key reported metrics
            </th>
            {showRerating ? (
              <th colSpan={3} className="metrics-group-label metrics-group-rerating">
                Rerating thresholds
              </th>
            ) : null}
            {showResults ? (
              <th colSpan={3} className="metrics-group-label metrics-group-results">
                Earnings results
              </th>
            ) : null}
          </tr>
          <tr>
            <th className="col-medium">Metric</th>
            <th className="col-narrow">Last period</th>
            <th className="col-wide metrics-col-krm">Why it matters</th>
            {showRerating ? (
              <>
                <th className="col-wide metrics-col-rerating">What&apos;s needed for rerating</th>
                <th className="col-wide metrics-col-rerating">Rerating context</th>
                <th className="col-narrow metrics-col-rerating">Earnings date</th>
              </>
            ) : null}
            {showResults ? (
              <>
                <th className="col-medium metrics-col-results">Actual reported</th>
                <th className="col-narrow metrics-col-results">Hit target?</th>
                <th className="col-wide metrics-col-results">Notes</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.Metric}-${i}`}>
              <td className="col-medium">
                <span className="metrics-metric-name">{row.Metric}</span>
              </td>
              <td className="col-narrow">{row["Last Period"]}</td>
              <td className="col-wide metrics-col-krm">
                {row.KRM_WhyItMatters ? <Markdown>{row.KRM_WhyItMatters}</Markdown> : null}
              </td>
              {showRerating ? (
                <>
                  <td className="col-wide metrics-col-rerating">
                    {row.Rerating_WhatsNeeded ? <Markdown>{row.Rerating_WhatsNeeded}</Markdown> : null}
                  </td>
                  <td className="col-wide metrics-col-rerating">
                    {row.Rerating_WhyItMatters ? (
                      <Markdown>{row.Rerating_WhyItMatters}</Markdown>
                    ) : null}
                  </td>
                  <td className="col-narrow metrics-col-rerating">
                    {row.Rerating_EarningsDate ? (
                      <time dateTime={row.Rerating_EarningsDate}>{row.Rerating_EarningsDate}</time>
                    ) : null}
                  </td>
                </>
              ) : null}
              {showResults ? (
                <>
                  <td className="col-medium metrics-col-results">
                    {row.Results_ActualReported ? (
                      <Markdown>{row.Results_ActualReported}</Markdown>
                    ) : null}
                  </td>
                  <td className="col-narrow metrics-col-results">
                    {row.Results_HitTarget ? (
                      <span className={hitTargetClass(row.Results_HitTarget)}>
                        {row.Results_HitTarget}
                      </span>
                    ) : null}
                  </td>
                  <td className="col-wide metrics-col-results">
                    {row.Results_Notes ? <Markdown>{row.Results_Notes}</Markdown> : null}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
