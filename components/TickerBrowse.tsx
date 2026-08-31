"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TierBadge } from "@/components/TierBadge";
import { WorkflowTagBadges } from "@/components/WorkflowTagBadges";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { tickerHref } from "@/lib/links";
import { collectSiteSearchHits, loadSiteSearchEngine, type SiteSearchEngine } from "@/lib/siteSearchHits";
import { formatDateOnly } from "@/lib/tableDisplay";
import type { BrowseTickerRow } from "@/lib/tickerBrowse";
import type { WorkflowTagsFeed } from "@/lib/types";

type Props = {
  tickers: BrowseTickerRow[];
  manifestAsOf?: string;
};

export function TickerBrowse({ tickers, manifestAsOf }: Props) {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [workflowTagsBySymbol, setWorkflowTagsBySymbol] = useState<Record<string, string[]>>({});
  const [filterBusy, setFilterBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const q = query.trim();

  useEffect(() => {
    if (!q) {
      return;
    }
    if (engine) {
      return;
    }

    let cancelled = false;
    setFilterBusy(true);
    setLoadError(null);

    void Promise.all([
      loadSiteSearchEngine(),
      fetchPublicJson<WorkflowTagsFeed>("feeds/workflow_tags.v0.json").catch(() => null),
    ])
      .then(([searchEngine, feed]) => {
        if (cancelled) return;
        setEngine(searchEngine);
        if (feed) {
          const bySymbol: Record<string, string[]> = {};
          for (const [symbol, tags] of Object.entries(feed.tickers ?? {})) {
            bySymbol[symbol.toUpperCase()] = tags;
          }
          setWorkflowTagsBySymbol(bySymbol);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load search index");
      })
      .finally(() => {
        if (!cancelled) setFilterBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, engine]);

  const shown = useMemo(() => {
    if (!q) return tickers;
    if (!engine) return tickers;
    return collectSiteSearchHits(engine.index, engine.fuse, q, 500)
      .filter((h) => h.kind === "ticker")
      .map((h) => ({
        symbol: h.ref.symbol.toUpperCase(),
        company_name: h.ref.company_name ?? h.ref.name,
        tier: h.ref.tier,
        workflow_tags: h.ref.workflow_tags,
        last_updated_at: h.ref.last_updated_at,
      }));
  }, [q, tickers, engine]);

  const asOfLabel = manifestAsOf
    ? new Date(manifestAsOf).toLocaleDateString()
    : engine?.index.as_of
      ? new Date(engine.index.as_of).toLocaleDateString()
      : null;

  return (
    <>
      <input
        type="search"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tickers…"
        aria-label="Filter tickers"
      />
      {loadError ? (
        <p className="muted browse-count" role="status">
          Could not load search index ({loadError}). Try again or use header search.
        </p>
      ) : (
        <p className="muted browse-count">
          {shown.length} of {tickers.length} tickers
          {asOfLabel ? <span> · data as of {asOfLabel}</span> : null}
          {filterBusy ? <span> · loading search…</span> : null}
        </p>
      )}
      {tickers.length > 0 ? (
        <ul className="grid grid-2 ticker-browse-list">
          {shown.map((t) => (
            <TickerBrowseItem
              key={t.symbol}
              ticker={t}
              lastUpdated={t.last_updated_at}
              workflowTags={
                workflowTagsBySymbol[t.symbol] ?? t.workflow_tags
              }
            />
          ))}
        </ul>
      ) : null}
      {!loadError && q && !filterBusy && engine && shown.length === 0 ? (
        <p className="muted">No matches.</p>
      ) : null}
    </>
  );
}

function TickerBrowseItem({
  ticker: t,
  lastUpdated,
  workflowTags,
}: {
  ticker: BrowseTickerRow;
  lastUpdated?: string;
  workflowTags?: string[];
}) {
  const updatedLabel = formatDateOnly(lastUpdated);

  return (
    <li className="browse-row">
      <div className="browse-row-primary">
        <Link href={tickerHref(t.symbol)}>
          <strong>{t.symbol}</strong>
        </Link>
        <TierBadge tier={t.tier} />
        <WorkflowTagBadges tags={workflowTags} />
      </div>
      {t.company_name && t.company_name !== t.symbol ? (
        <div className="muted">{t.company_name}</div>
      ) : null}
      {updatedLabel ? (
        <div className="muted browse-row-updated">
          Updated <time dateTime={updatedLabel}>{updatedLabel}</time>
        </div>
      ) : null}
    </li>
  );
}
