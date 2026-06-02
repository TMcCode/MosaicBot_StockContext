import Link from "next/link";

import type { Manifest, TickerMeta } from "@/lib/types";
import { themeHref } from "@/lib/links";

type Props = {
  symbol: string;
  meta: TickerMeta;
  manifest: Manifest | null;
};

function tierLabel(tier: number | undefined): string | null {
  if (tier == null) return null;
  return `T${tier}`;
}

function themeLink(manifest: Manifest | null, themeName: string) {
  const slug = manifest?.themes.find((t) => t.name === themeName)?.slug;
  if (slug) {
    return (
      <Link key={themeName} href={themeHref(slug)} className="theme-chip">
        {themeName}
      </Link>
    );
  }
  return (
    <span key={themeName} className="theme-chip theme-chip-static">
      {themeName}
    </span>
  );
}

export function TickerHeader({ symbol, meta, manifest }: Props) {
  const tier = tierLabel(meta.tier);
  const weight =
    meta.portfolio_weight != null && meta.portfolio_weight > 0
      ? `${(meta.portfolio_weight * 100).toFixed(1)}% portfolio`
      : null;

  return (
    <header className="ticker-header">
      <div className="ticker-title-row">
        <h1>{symbol}</h1>
        {tier ? <span className={`badge badge-tier badge-tier-${meta.tier}`}>{tier}</span> : null}
        {weight ? <span className="badge badge-weight">{weight}</span> : null}
      </div>
      {meta.company_name && meta.company_name !== symbol ? (
        <p className="ticker-subtitle">{meta.company_name}</p>
      ) : null}
      {meta.themes?.length ? (
        <div className="theme-chips">
          {meta.themes.map((name) => themeLink(manifest, name))}
        </div>
      ) : null}
    </header>
  );
}
