import {
  combinedMetricsFooterBits,
  type MetricsBundle,
} from "@/lib/keyMetricsCombined";

import { KeyMetricsCombinedTable } from "./KeyMetricsCombinedTable";

type Props = {
  bundle: MetricsBundle;
};

export function CombinedMetricsSection({ bundle }: Props) {
  const footerBits = combinedMetricsFooterBits(bundle);

  return (
    <>
      <KeyMetricsCombinedTable bundle={bundle} />
      {footerBits.length > 0 ? (
        <p className="table-footer muted">{footerBits.join(" · ")}</p>
      ) : null}
    </>
  );
}
