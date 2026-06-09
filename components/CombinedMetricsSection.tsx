import { type MetricsCombinedTableBody } from "@/lib/keyMetricsCombined";

import { KeyMetricsCombinedTable } from "./KeyMetricsCombinedTable";

type Props = {
  body: MetricsCombinedTableBody;
};

export function CombinedMetricsSection({ body }: Props) {
  const footerBits = body.meta?.footer_bits ?? [];

  return (
    <>
      <KeyMetricsCombinedTable body={body} />
      {footerBits.length > 0 ? (
        <p className="table-footer muted">{footerBits.join(" · ")}</p>
      ) : null}
    </>
  );
}
