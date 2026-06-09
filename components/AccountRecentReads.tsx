"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ACCOUNT_RECENT_READS_LIMIT, fetchRecentPageReads } from "@/lib/readState/api";
import type { PageReadRow } from "@/lib/readState/types";
import { formatEventDate } from "@/lib/homeFeedDisplay";
import { themeHref, tickerHref } from "@/lib/links";
import { buildThemeSlugToName, loadSearchIndex } from "@/lib/siteSearchHits";

import styles from "@/app/auth/auth.module.css";

type Props = {
  userId: string;
};

function pageHref(row: PageReadRow): string {
  return row.page_type === "ticker" ? tickerHref(row.page_key) : themeHref(row.page_key);
}

function pageLabel(row: PageReadRow, themeNames: Map<string, string>): string {
  if (row.page_type === "ticker") {
    return row.page_key.toUpperCase();
  }
  return themeNames.get(row.page_key) ?? row.page_key;
}

export function AccountRecentReads({ userId }: Props) {
  const [rows, setRows] = useState<PageReadRow[] | null>(null);
  const [themeNames, setThemeNames] = useState<Map<string, string>>(() => new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchRecentPageReads(userId, ACCOUNT_RECENT_READS_LIMIT), loadSearchIndex()])
      .then(([reads, index]) => {
        if (!cancelled) {
          setRows(reads);
          setThemeNames(buildThemeSlugToName(index));
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Could not load read history.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (rows === null) {
    return <p className={`${styles.copy} muted`}>Loading recent reads…</p>;
  }

  if (error) {
    return <p className={styles.messageErr}>{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className={`${styles.copy} muted`}>
        No pages marked read yet. Use <strong>Mark read</strong> on the home feed or ticker/theme
        pages.
      </p>
    );
  }

  return (
    <div className={styles.readHistory}>
      <p className={styles.readHistoryMeta}>
        Last {rows.length} marked read
        {rows.length >= ACCOUNT_RECENT_READS_LIMIT ? ` (max ${ACCOUNT_RECENT_READS_LIMIT})` : ""}
      </p>
      <ul className={styles.readHistoryList}>
        {rows.map((row) => {
          const dateLabel = formatEventDate(row.read_at);
          return (
            <li key={`${row.page_type}:${row.page_key}`} className={styles.readHistoryRow}>
              <span
                className={
                  row.page_type === "ticker" ? styles.readHistoryBadgeTicker : styles.readHistoryBadgeTheme
                }
              >
                {row.page_type === "ticker" ? "Ticker" : "Theme"}
              </span>
              <Link href={pageHref(row)} className={styles.readHistoryLink}>
                {pageLabel(row, themeNames)}
              </Link>
              {dateLabel ? (
                <time className={styles.readHistoryDate} dateTime={row.read_at}>
                  {dateLabel}
                </time>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
