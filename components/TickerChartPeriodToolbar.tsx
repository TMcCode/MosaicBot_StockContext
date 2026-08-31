"use client";

import {
  DETAIL_CHART_STANDARD_PERIODS,
  type ChartCustomPeriod,
  type OverlayChartPeriod,
  type OverlayStandardPeriod,
} from "@/lib/chart/periodControls";

import styles from "./TickerChartPanel.module.css";

type Props = {
  period: OverlayChartPeriod;
  onPeriodChange: (period: OverlayChartPeriod) => void;
  supportedPeriods: Set<OverlayStandardPeriod>;
  supportedCustomPeriodKeys: Set<string>;
  customPeriods: ChartCustomPeriod[];
};

export function TickerChartPeriodToolbar({
  period,
  onPeriodChange,
  supportedPeriods,
  supportedCustomPeriodKeys,
  customPeriods,
}: Props) {
  return (
    <div className={styles.periodControls} role="group" aria-label="Chart period">
      <div className={styles.periodRow}>
        {DETAIL_CHART_STANDARD_PERIODS.map((p) => {
          const disabled = !supportedPeriods.has(p);
          return (
            <button
              key={p}
              type="button"
              className={period === p ? styles.periodBtnActive : styles.periodBtn}
              disabled={disabled}
              title={
                disabled
                  ? "Loaded series do not have enough history for this window yet"
                  : undefined
              }
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </button>
          );
        })}
      </div>
      {customPeriods.length > 0 ? (
        <div className={styles.periodRowCustom} role="group" aria-label="Custom event dates">
          {customPeriods.map((c) => {
            const disabled = !supportedCustomPeriodKeys.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className={period === c.key ? styles.periodBtnActive : styles.periodBtn}
                disabled={disabled}
                title={
                  disabled
                    ? `${c.date}: loaded series do not include this date yet`
                    : c.date
                }
                onClick={() => onPeriodChange(c.key)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
