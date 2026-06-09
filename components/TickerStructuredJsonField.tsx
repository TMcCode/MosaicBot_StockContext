import {
  formatTickerDetailedJsonField,
  parseProductBrandEntries,
  parseRevenueSegmentEntries,
  parseSubsidiariesEntries,
} from "@/lib/tickerOverviewFormat";

type Props = {
  columnId: string;
  raw: string;
};

function FallbackText({ columnId, raw }: Props) {
  const text = formatTickerDetailedJsonField(columnId, raw);
  if (!text) return null;
  return <span className="pre-line">{text}</span>;
}

export function TickerStructuredJsonField({ columnId, raw }: Props) {
  if (columnId === "Subsidiaries on LinkedIn*") {
    const items = parseSubsidiariesEntries(raw);
    if (!items.length) return <FallbackText columnId={columnId} raw={raw} />;
    return (
      <ul className="overview-bullet-list">
        {items.map((item, i) => {
          const tail = [item.notes, item.linkedin_hint ? `LinkedIn: ${item.linkedin_hint}` : ""]
            .filter(Boolean)
            .join("; ");
          return (
            <li key={`${item.name}-${i}`}>
              <strong>{item.name}</strong>
              {tail ? ` — ${tail}` : null}
            </li>
          );
        })}
      </ul>
    );
  }

  if (columnId === "Revenue segments and estimated mix") {
    const items = parseRevenueSegmentEntries(raw);
    if (!items.length) return <FallbackText columnId={columnId} raw={raw} />;
    return (
      <ul className="overview-bullet-list">
        {items.map((item, i) => {
          const bits = [
            item.estimated_mix ? `Mix: ${item.estimated_mix}` : "",
            item.source_or_comment ? `Source: ${item.source_or_comment}` : "",
            item.yoy_or_trend_comment ? `Trend: ${item.yoy_or_trend_comment}` : "",
          ].filter(Boolean);
          return (
            <li key={`${item.segment_name}-${i}`}>
              <strong>{item.segment_name}</strong>
              {bits.length ? ` — ${bits.join("; ")}` : null}
            </li>
          );
        })}
      </ul>
    );
  }

  if (columnId === "Product brands") {
    const brands = parseProductBrandEntries(raw);
    if (!brands.length) return <FallbackText columnId={columnId} raw={raw} />;
    return (
      <ul className="overview-bullet-list">
        {brands.map((brand, i) => (
          <li key={`${brand}-${i}`}>{brand}</li>
        ))}
      </ul>
    );
  }

  return <FallbackText columnId={columnId} raw={raw} />;
}
