"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TierBadge } from "@/components/TierBadge";
import { WorkflowTagBadges } from "@/components/WorkflowTagBadges";
import { tickerHref } from "@/lib/links";
import { collectSiteSearchHits, loadSiteSearchEngine, type SiteSearchEngine } from "@/lib/siteSearchHits";
import { formatDateOnly } from "@/lib/tableDisplay";
import type { SearchTickerRow, WorkflowTagsFeed } from "@/lib/types";
import { fetchPublicJsonText } from "@/lib/fetchPublicJson";

type Props = {
  updatedAtBySymbol?: Record<string, string>;
};

export function TickerBrowse({ updatedAtBySymbol = {} }: Props) {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [workflowTagsBySymbol, setWorkflowTagsBySymbol] = useState<Record<string, string[]>>({});
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      loadSiteSearchEngine(),
      fetchPublicJsonText("feeds/workflow_tags.v0.json").catch(() => null),
    ])
      .then(([searchEngine, tagsText]) => {
        setEngine(searchEngine);
        if (tagsText) {
          const feed = JSON.parse(tagsText) as WorkflowTagsFeed;
          const bySymbol: Record<string, string[]> = {};
          for (const [symbol, tags] of Object.entries(feed.tickers ?? {})) {
            bySymbol[symbol.toUpperCase()] = tags;
          }
          setWorkflowTagsBySymbol(bySymbol);
        }
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load ticker index");
        setEngine(null);
      })
      .finally(() => setLoadBusy(false));
  }, []);

  const tickers = useMemo(() => {
    if (!engine) return [];
    return [...engine.index.tickers].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [engine]);

  const shown = useMemo(() => {
    if (!engine) return [];
    const q = query.trim();
    if (!q) return tickers;
    return collectSiteSearchHits(engine.index, engine.fuse, q)
      .filter((h) => h.kind === "ticker")
      .map((h) => h.ref);
  }, [query, tickers, engine]);

  return (
    <>
      <input
        type="search"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tickers…"
        aria-label="Filter tickers"
        disabled={loadBusy && !engine}
      />
      {loadError ? (
        <p className="muted browse-count" role="status">
          Could not load ticker list ({loadError}). Try again later or use header search.
        </p>
      ) : loadBusy && !engine ? (
        <p className="muted browse-count" role="status">
          Loading tickers…
        </p>
      ) : (
        <p className="muted browse-count">
          {shown.length} of {tickers.length} tickers
          {engine?.index.as_of ? (
            <span> · data as of {new Date(engine.index.as_of).toLocaleDateString()}</span>
          ) : null}
        </p>
      )}
      {!loadError && tickers.length > 0 ? (
        <ul className="grid grid-2 ticker-browse-list">
          {shown.map((t) => (
            <TickerBrowseItem
              key={t.symbol}
              ticker={t}
              lastUpdated={updatedAtBySymbol[t.symbol.toUpperCase()] ?? t.last_updated_at}
              workflowTags={
                workflowTagsBySymbol[t.symbol.toUpperCase()] ?? t.workflow_tags
              }
            />
          ))}
        </ul>
      ) : null}
      {!loadBusy && !loadError && query.trim() && shown.length === 0 ? (
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
  ticker: SearchTickerRow;
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
