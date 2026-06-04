"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TierBadge } from "@/components/TierBadge";
import { tickerHref } from "@/lib/links";
import { collectSiteSearchHits, loadSiteSearchEngine, type SiteSearchEngine } from "@/lib/siteSearchHits";
import type { SearchTickerRow } from "@/lib/types";

export function TickerBrowse() {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState<SiteSearchEngine | null>(null);
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void loadSiteSearchEngine()
      .then(setEngine)
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
            <TickerBrowseItem key={t.symbol} ticker={t} />
          ))}
        </ul>
      ) : null}
      {!loadBusy && !loadError && query.trim() && shown.length === 0 ? (
        <p className="muted">No matches.</p>
      ) : null}
    </>
  );
}

function TickerBrowseItem({ ticker: t }: { ticker: SearchTickerRow }) {
  return (
    <li className="browse-row">
      <div className="browse-row-primary">
        <Link href={tickerHref(t.symbol)}>
          <strong>{t.symbol}</strong>
        </Link>
        <TierBadge tier={t.tier} />
      </div>
      {t.company_name && t.company_name !== t.symbol ? (
        <div className="muted">{t.company_name}</div>
      ) : null}
    </li>
  );
}
