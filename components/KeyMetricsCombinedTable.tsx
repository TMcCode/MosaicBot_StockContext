import {
  buildCombinedMetricRows,
  hitTargetClass,
  type MetricsBundle,
} from "@/lib/keyMetricsCombined";

import { Markdown } from "./Markdown";

type Props = {
  bundle: MetricsBundle;
};

export function KeyMetricsCombinedTable({ bundle }: Props) {
  const rows = buildCombinedMetricRows(bundle);
  const showRerating = (bundle.rerating?.rows.length ?? 0) > 0;
  const showResults = (bundle.earningsResults?.rows.length ?? 0) > 0;

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
            <tr key={`${row.metric}-${i}`}>
              <td className="col-medium">
                <strong>{row.metric}</strong>
              </td>
              <td className="col-narrow">{row.lastPeriod}</td>
              <td className="col-wide metrics-col-krm">
                {row.whyItMatters ? <Markdown>{row.whyItMatters}</Markdown> : null}
              </td>
              {showRerating ? (
                <>
                  <td className="col-wide metrics-col-rerating">
                    {row.rerating?.whatsNeeded ? <Markdown>{row.rerating.whatsNeeded}</Markdown> : null}
                  </td>
                  <td className="col-wide metrics-col-rerating">
                    {row.rerating?.whyItMatters ? (
                      <Markdown>{row.rerating.whyItMatters}</Markdown>
                    ) : null}
                  </td>
                  <td className="col-narrow metrics-col-rerating">
                    {row.rerating?.earningsDate ? (
                      <time dateTime={row.rerating.earningsDate}>{row.rerating.earningsDate}</time>
                    ) : null}
                  </td>
                </>
              ) : null}
              {showResults ? (
                <>
                  <td className="col-medium metrics-col-results">
                    {row.earningsResult?.actualReported ? (
                      <Markdown>{row.earningsResult.actualReported}</Markdown>
                    ) : null}
                  </td>
                  <td className="col-narrow metrics-col-results">
                    {row.earningsResult?.hitTarget ? (
                      <span className={hitTargetClass(row.earningsResult.hitTarget)}>
                        {row.earningsResult.hitTarget}
                      </span>
                    ) : null}
                  </td>
                  <td className="col-wide metrics-col-results">
                    {row.earningsResult?.notes ? <Markdown>{row.earningsResult.notes}</Markdown> : null}
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
