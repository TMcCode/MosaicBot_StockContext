"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { useMemo, useState } from "react";

import { themeHref, tickerHref } from "@/lib/links";
import type { SearchThemeRow, SearchTickerRow } from "@/lib/types";

type Props = {
  tickers: SearchTickerRow[];
  themes?: SearchThemeRow[];
  maxResults?: number;
  placeholder?: string;
};

export function SearchBox({
  tickers,
  themes = [],
  maxResults = 12,
  placeholder = "Search tickers or themes…",
}: Props) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(
        [
          ...tickers.map((t) => ({ kind: "ticker" as const, ...t })),
          ...themes.map((t) => ({ kind: "theme" as const, ...t })),
        ],
        {
          keys: ["symbol", "name", "company_name", "search_text", "slug"],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [tickers, themes],
  );

  const trimmed = query.trim();
  const results = trimmed
    ? fuse.search(trimmed).slice(0, maxResults).map((r) => r.item)
    : [];

  return (
    <div className="search-box">
      <input
        type="search"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tickers and themes"
      />
      {trimmed ? (
        <ul className="search-results">
          {results.length === 0 ? (
            <li className="muted">No matches</li>
          ) : (
            results.map((row) =>
              row.kind === "ticker" ? (
                <li key={`t-${row.symbol}`}>
                  <Link href={tickerHref(row.symbol)}>
                    <strong>{row.symbol}</strong>
                  </Link>
                  {row.company_name && row.company_name !== row.symbol ? (
                    <span className="muted"> — {row.company_name}</span>
                  ) : null}
                  {row.tier != null ? (
                    <span className="muted"> · T{row.tier}</span>
                  ) : null}
                </li>
              ) : (
                <li key={`th-${row.slug}`}>
                  <Link href={themeHref(row.slug)}>
                    <strong>{row.name}</strong>
                  </Link>
                  {row.ticker_count != null ? (
                    <span className="muted"> · {row.ticker_count} tickers</span>
                  ) : null}
                </li>
              ),
            )
          )}
        </ul>
      ) : null}
    </div>
  );
}
