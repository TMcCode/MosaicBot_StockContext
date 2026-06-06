import type { Manifest } from "@/lib/types";

type Props = {
  manifest: Manifest | null;
};

export function TextTableActivityStats({ manifest }: Props) {
  const stats = manifest?.stats;
  const days = stats?.text_table_activity_days ?? 180;
  const tickers = stats?.tickers_text_table_updated_180d;
  const themes = stats?.themes_text_table_updated_180d;

  if (tickers == null && themes == null) {
    return null;
  }

  return (
    <p className="browse-activity-stats muted" role="status">
      {tickers != null ? (
        <>
          <strong>{tickers.toLocaleString()}</strong> tickers with a text table updated in the
          last {days} days
        </>
      ) : null}
      {tickers != null && themes != null ? <span className="browse-activity-sep"> · </span> : null}
      {themes != null ? (
        <>
          <strong>{themes.toLocaleString()}</strong> themes with a text table updated in the last{" "}
          {days} days
        </>
      ) : null}
    </p>
  );
}
