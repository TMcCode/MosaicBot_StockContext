"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { useMemo, useState } from "react";

import { themeHref } from "@/lib/links";
import type { ThemeIndexEntry } from "@/lib/types";

type Props = {
  themes: ThemeIndexEntry[];
};

export function ThemeBrowse({ themes }: Props) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(themes, {
        keys: ["name", "slug"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [themes],
  );

  const shown = useMemo(() => {
    const q = query.trim();
    if (!q) return themes;
    return fuse.search(q).map((r) => r.item);
  }, [query, themes, fuse]);

  const withData = themes.filter((t) => t.has_table_data !== false && t.meta_url).length;

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
      </p>
      <ul className="grid grid-2 ticker-browse-list">
        {shown.map((theme) => {
          const hasPage = theme.has_table_data !== false && theme.meta_url;
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
    </>
  );
}
