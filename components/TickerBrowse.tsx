"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { useMemo, useState } from "react";

import { tickerHref } from "@/lib/links";

export type TickerBrowseRow = {
  symbol: string;
  company_name?: string;
  tier?: number;
  search_text: string;
};

type Props = {
  tickers: TickerBrowseRow[];
};

export function TickerBrowse({ tickers }: Props) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(tickers, {
        keys: ["symbol", "company_name", "search_text"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [tickers],
  );

  const shown = useMemo(() => {
    const q = query.trim();
    if (!q) return tickers;
    return fuse.search(q).map((r) => r.item);
  }, [query, tickers, fuse]);

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
      <p className="muted browse-count">
        {shown.length} of {tickers.length} tickers
      </p>
      <ul className="grid grid-2 ticker-browse-list">
        {shown.map((t) => (
          <li key={t.symbol}>
            <Link href={tickerHref(t.symbol)}>
              <strong>{t.symbol}</strong>
            </Link>
            {t.company_name && t.company_name !== t.symbol ? (
              <div className="muted">{t.company_name}</div>
            ) : null}
            {t.tier != null ? <div className="muted">Tier {t.tier}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
