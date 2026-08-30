import type { ReactNode } from "react";

import type { TableBody } from "@/lib/types";
import {
  bullBearGroups,
  formatCellValue,
  formatColumnLabel,
  isBullBearLayout,
  isFooterColumn,
  isMetaColumn,
  isOverviewMetaColumn,
  isCollapsibleTranscriptRowsTable,
  primaryMarkdownColumn,
  sentimentClass,
  tableColumnLayoutClass,
  tableFooterBits,
  visibleDataColumns,
} from "@/lib/tableDisplay";
import {
  formatThemeOverviewField,
  hasSplitGoogleTrendColumns,
  hasSplitSearchKeywordColumns,
  isFullWidthOverviewColumn,
  isSearchKeywordColumn,
  isTopDatasetColumn,
  parseTopDatasetEntries,
  sortThemeOverviewColumns,
} from "@/lib/themeOverviewFormat";
import {
  isTickerBullBearColumn,
  isTickerDetailedJsonColumn,
  isTickerOverviewBody,
  sortTickerOverviewColumns,
  splitTickerOverviewBottomPair,
  TICKER_OVERVIEW_BULL_ID,
  TICKER_OVERVIEW_BEAR_ID,
  TICKER_OVERVIEW_COMPETITORS_ID,
} from "@/lib/tickerOverviewFormat";
import { isMetricsCombinedTable } from "@/lib/keyMetricsCombined";

import { CombinedMetricsSection } from "./CombinedMetricsSection";
import { ForumWatchlistField } from "./ForumWatchlistField";
import { Markdown } from "./Markdown";
import { KeywordListField, SearchKeywordsField } from "./SearchKeywordsField";
import { TickerStructuredJsonField } from "./TickerStructuredJsonField";
import { TopDatasetsField } from "./TopDatasetsField";
import { CollapsibleTranscriptRowsTable } from "./CollapsibleTranscriptRowsTable";
import { IndustryPublicationsField } from "./IndustryPublicationsField";
import { KeyInputsField } from "./KeyInputsField";
import { MonitoringWatchlistField } from "./MonitoringWatchlistField";
import {
  isMonitoringWatchlistColumn,
} from "@/lib/monitoringWatchlistFormat";

export function TableSectionContent({ body }: { body: TableBody }) {
  const row = body.rows[0];
  const footerBits = isMetricsCombinedTable(body) ? [] : tableFooterBits(body);

  return (
    <>
      {isMetricsCombinedTable(body) ? (
        <CombinedMetricsSection body={body} />
      ) : body.format === "single_row" && row ? (
        isBullBearLayout(body) ? (
          <BullBearSingleRow body={body} row={row} />
        ) : (
          <OverviewSingleRow body={body} row={row} />
        )
      ) : isCollapsibleTranscriptRowsTable(body) ? (
        <CollapsibleTranscriptRowsTable body={body} />
      ) : (
        <MultiRowTable body={body} />
      )}
      {footerBits.length > 0 ? (
        <p className="table-footer muted">{footerBits.join(" · ")}</p>
      ) : null}
    </>
  );
}

function overviewFieldDisplay(
  col: { id: string; kind?: string },
  raw: string,
): ReactNode {
  const val = formatThemeOverviewField(col.id, raw);
  if (col.id === "ForumWatchlist") return <ForumWatchlistField raw={raw} />;
  if (col.id === "KeyInputsAndSourcing") return <KeyInputsField raw={raw} />;
  if (col.id === "IndustryPublications") return <IndustryPublicationsField raw={raw} />;
  if (isMonitoringWatchlistColumn(col.id)) return <MonitoringWatchlistField raw={raw} />;
  if (col.id === "SearchKeywordsNow") return <SearchKeywordsField raw={raw} />;
  if (isSearchKeywordColumn(col.id) && col.id !== "SearchKeywordsNow") {
    return <KeywordListField raw={raw} />;
  }
  if (isTickerDetailedJsonColumn(col.id)) {
    return <TickerStructuredJsonField columnId={col.id} raw={raw} />;
  }
  if (col.kind === "markdown") return <Markdown>{val || raw}</Markdown>;
  if (val.includes("\n")) return <span className="pre-line">{val}</span>;
  return val || raw;
}

function overviewShowsTopDatasets(row: Record<string, string>): boolean {
  return parseTopDatasetEntries(row).length > 0;
}

function OverviewFieldGrid({
  cols,
  row,
}: {
  cols: TableBody["columns"];
  row: Record<string, string>;
}) {
  if (cols.length === 0) return null;
  return (
    <dl className="field-grid">
      {cols.map((col) => {
        const raw = formatCellValue(col.id, row[col.id] ?? "");
        if (!raw || raw === "False") return null;
        return (
          <div key={col.id} className="field-item">
            <dt>{formatColumnLabel(col.id, col.label)}</dt>
            <dd>{overviewFieldDisplay(col, raw)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function TickerBullBearPair({
  row,
  bullCol,
  bearCol,
}: {
  row: Record<string, string>;
  bullCol?: TableBody["columns"][number];
  bearCol?: TableBody["columns"][number];
}) {
  const bullRaw = bullCol ? formatCellValue(bullCol.id, row[bullCol.id] ?? "") : "";
  const bearRaw = bearCol ? formatCellValue(bearCol.id, row[bearCol.id] ?? "") : "";
  if ((!bullRaw || bullRaw === "False") && (!bearRaw || bearRaw === "False")) {
    return null;
  }

  return (
    <div className="bull-bear-grid">
      {bullCol && bullRaw && bullRaw !== "False" ? (
        <div className="bull-bear-col bull-col">
          <h3 className="block-label">{formatColumnLabel(bullCol.id, bullCol.label)}</h3>
          <div className="overview-block-body">{overviewFieldDisplay(bullCol, bullRaw)}</div>
        </div>
      ) : null}
      {bearCol && bearRaw && bearRaw !== "False" ? (
        <div className="bull-bear-col bear-col">
          <h3 className="block-label">{formatColumnLabel(bearCol.id, bearCol.label)}</h3>
          <div className="overview-block-body">{overviewFieldDisplay(bearCol, bearRaw)}</div>
        </div>
      ) : null}
    </div>
  );
}

function OverviewSingleRow({ body, row }: { body: TableBody; row: Record<string, string> }) {
  const primary = primaryMarkdownColumn(body);
  const hideSearchKeywordsNow = hasSplitSearchKeywordColumns(row);
  const hideGoogleTrendNow = hasSplitGoogleTrendColumns(row);
  const showTopDatasets = overviewShowsTopDatasets(row);
  const tickerOverview = isTickerOverviewBody(body);

  const filtered = visibleDataColumns(body).filter(
    (c) =>
      c.id !== primary?.id &&
      !/^Bull\d|^Bear\d/i.test(c.id) &&
      !isTickerBullBearColumn(c.id) &&
      !isOverviewMetaColumn(c.id) &&
      !isTopDatasetColumn(c.id) &&
      !(c.id === "SearchKeywordsNow" && hideSearchKeywordsNow) &&
      !(c.id === "GoogleTrendKeywordsNow" && hideGoogleTrendNow) &&
      !(c.id === "TopDatasetsToTrack" && showTopDatasets),
  );

  const sorted = tickerOverview
    ? sortTickerOverviewColumns(filtered)
    : sortThemeOverviewColumns(filtered);
  const { main: overviewMain, bottomPair } = tickerOverview
    ? splitTickerOverviewBottomPair(sorted)
    : { main: sorted, bottomPair: [] };

  const fullWidth = overviewMain.filter((c) => isFullWidthOverviewColumn(c.id));
  const gridCols = overviewMain.filter((c) => !isFullWidthOverviewColumn(c.id));

  const bullCol = tickerOverview
    ? body.columns.find((c) => c.id === TICKER_OVERVIEW_BULL_ID)
    : undefined;
  const bearCol = tickerOverview
    ? body.columns.find((c) => c.id === TICKER_OVERVIEW_BEAR_ID)
    : undefined;

  const competitorsIdx = tickerOverview
    ? gridCols.findIndex((c) => c.id === TICKER_OVERVIEW_COMPETITORS_ID)
    : -1;
  const gridBeforeBullBear =
    tickerOverview && competitorsIdx >= 0 ? gridCols.slice(0, competitorsIdx) : gridCols;
  const gridAfterBullBear =
    tickerOverview && competitorsIdx >= 0 ? gridCols.slice(competitorsIdx) : [];

  return (
    <div className="single-row-body overview-layout">
      {primary ? <Markdown>{row[primary.id] ?? ""}</Markdown> : null}
      {fullWidth.map((col) => {
        const raw = formatCellValue(col.id, row[col.id] ?? "");
        if (!raw || raw === "False") return null;
        return (
          <section key={col.id} className="overview-block field-item-wide">
            <h3 className="overview-block-label">{formatColumnLabel(col.id, col.label)}</h3>
            <div className="overview-block-body">{overviewFieldDisplay(col, raw)}</div>
          </section>
        );
      })}
      {showTopDatasets ? (
        <section className="overview-block field-item-wide">
          <h3 className="overview-block-label">Top datasets to track</h3>
          <div className="overview-block-body">
            <TopDatasetsField row={row} />
          </div>
        </section>
      ) : null}
      <OverviewFieldGrid cols={gridBeforeBullBear} row={row} />
      {tickerOverview ? (
        <TickerBullBearPair row={row} bullCol={bullCol} bearCol={bearCol} />
      ) : null}
      <OverviewFieldGrid cols={gridAfterBullBear} row={row} />
      {bottomPair.length > 0 ? <OverviewFieldGrid cols={bottomPair} row={row} /> : null}
    </div>
  );
}

function BullBearSingleRow({ body, row }: { body: TableBody; row: Record<string, string> }) {
  const groups = bullBearGroups(body)!;
  const thesis = body.columns.find((c) => c.id === "thesis");

  return (
    <div className="single-row-body">
      {thesis && row[thesis.id] ? (
        <div className="thesis-block">
          <h3 className="block-label">Thesis</h3>
          <Markdown>{row[thesis.id]}</Markdown>
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
          {body.rows.map((r, i) => (
            <tr key={i}>
              {cols.map((col) => {
                const raw = formatCellValue(col.id, r[col.id] ?? "");
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
                      <span className={raw.includes("+") ? "pos" : raw.includes("-") ? "neg" : ""}>
                        {raw}
                      </span>
                    </td>
                  );
                }
                return (
                  <td key={col.id} className={cellClass}>
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
