"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { themeHref } from "@/lib/links";
import { themeHasPublishedPage } from "@/lib/themePage";
import type { ThemeIndexEntry } from "@/lib/types";

type Props = {
  themes: ThemeIndexEntry[];
};

export function ThemeBrowse({ themes }: Props) {
  const [query, setQuery] = useState("");
  const [filterBusy, setFilterBusy] = useState(false);
  const [filtered, setFiltered] = useState<ThemeIndexEntry[] | null>(null);

  const q = query.trim();
  const withData = themes.filter(themeHasPublishedPage).length;

  useEffect(() => {
    if (!q) {
      setFiltered(null);
      setFilterBusy(false);
      return;
    }

    let cancelled = false;
    setFilterBusy(true);

    void import("fuse.js").then(({ default: FuseCtor }) => {
      if (cancelled) return;
      const fuse = new FuseCtor(themes, {
        keys: ["name", "slug"],
        threshold: 0.35,
        ignoreLocation: true,
      });
      setFiltered(fuse.search(q).map((r) => r.item));
      setFilterBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [q, themes]);

  const shown = useMemo(() => {
    if (!q) return themes;
    return filtered ?? themes;
  }, [q, themes, filtered]);

  return (
    <>
      <input
        type="search"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter themes…"
        aria-label="Filter themes"
      />
      <p className="muted browse-count">
        {shown.length} of {themes.length} themes · {withData} with research notes
        {filterBusy ? " · filtering…" : null}
      </p>
      <ul className="grid grid-2 ticker-browse-list">
        {shown.map((theme) => {
          const hasPage = themeHasPublishedPage(theme);
          return (
            <li key={theme.slug} className={hasPage ? undefined : "constituent-muted"}>
              {hasPage ? (
                <Link href={themeHref(theme.slug)}>
                  <strong>{theme.name}</strong>
                </Link>
              ) : (
                <strong>{theme.name}</strong>
              )}
              <span className="muted">
                {" "}
                · {theme.ticker_count} tickers
                {theme.constituents_with_data != null
                  ? ` (${theme.constituents_with_data} with notes)`
                  : ""}
              </span>
              {!hasPage ? <span className="muted"> · no theme notes yet</span> : null}
            </li>
          );
        })}
      </ul>
      {q && !filterBusy && filtered && filtered.length === 0 ? (
        <p className="muted">No matches.</p>
      ) : null}
    </>
  );
}
