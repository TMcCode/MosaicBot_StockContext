import Link from "next/link";

import { resolveTickerLogoUrl } from "@/lib/logoUrl";
import type { Manifest, TickerMeta } from "@/lib/types";
import { themeHref } from "@/lib/links";

import { TierBadge } from "./TierBadge";
import { WorkflowTagBadges } from "./WorkflowTagBadges";

type Props = {
  symbol: string;
  meta: TickerMeta;
  manifest: Manifest | null;
};

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
  const weight =
    meta.portfolio_weight != null && meta.portfolio_weight > 0
      ? `${(meta.portfolio_weight * 100).toFixed(1)}% portfolio`
      : null;
  const logoUrl = resolveTickerLogoUrl(meta.logo_url);

  return (
    <header className="ticker-header">
      <div className="ticker-header-main">
        <div className="ticker-title-row">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external CDN URL from publish JSON
            <img
              src={logoUrl}
              alt=""
              className="ticker-logo"
              width={36}
              height={36}
              loading="eager"
              decoding="async"
            />
          ) : null}
          <h1>{symbol}</h1>
          <TierBadge tier={meta.tier} />
          <WorkflowTagBadges tags={meta.workflow_tags} />
          {weight ? <span className="badge badge-weight">{weight}</span> : null}
        </div>
        {meta.company_name && meta.company_name !== symbol ? (
          <p className="ticker-subtitle">{meta.company_name}</p>
        ) : null}
      </div>
      {meta.themes?.length ? (
        <div className="theme-chips">
          {meta.themes.map((name) => themeLink(manifest, name))}
        </div>
      ) : null}
    </header>
  );
}
