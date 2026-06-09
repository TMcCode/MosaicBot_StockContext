"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReadState } from "@/components/ReadStateProvider";
import { href } from "@/lib/links";
import { isUnread, type PageType } from "@/lib/readState/types";

import styles from "./PageReadControl.module.css";

type Props = {
  pageType: PageType;
  pageKey: string;
  buildId?: string;
};

export function PageReadControl({ pageType, pageKey, buildId }: Props) {
  const pathname = usePathname();
  const { configured, loading: authLoading, user } = useOptionalSupabaseAuth();
  const readState = useReadState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seenBuildId = readState?.getSeenBuildId(pageType, pageKey);
  const unread = useMemo(
    () => isUnread(seenBuildId, buildId),
    [seenBuildId, buildId],
  );
  const wasReadBefore = Boolean(seenBuildId);
  const showUpdated = wasReadBefore && unread && Boolean(buildId);

  const onMarkRead = useCallback(async () => {
    if (!readState || !buildId) return;
    setError(null);
    setBusy(true);
    try {
      const result = await readState.markRead(pageType, pageKey, buildId);
      if (!result.ok) {
        setError(result.message ?? "Could not save.");
      }
    } finally {
      setBusy(false);
    }
  }, [readState, pageType, pageKey, buildId]);

  const onMarkUnread = useCallback(async () => {
    if (!readState) return;
    setError(null);
    setBusy(true);
    try {
      const result = await readState.markUnread(pageType, pageKey);
      if (!result.ok) {
        setError(result.message ?? "Could not save.");
      }
    } finally {
      setBusy(false);
    }
  }, [readState, pageType, pageKey]);

  if (!buildId) {
    return null;
  }

  const ready = readState?.ready ?? !authLoading;

  let statusClass = styles.status;
  let statusLabel = "Loading…";
  if (ready) {
    if (!configured) {
      statusLabel = "Read tracking saves in this browser only.";
    } else if (!user) {
      statusLabel = "Sign in to sync read state across devices.";
    } else if (showUpdated) {
      statusClass = `${styles.status} ${styles.statusUpdated}`;
      statusLabel = "Updated since you last read";
    } else if (unread) {
      statusClass = `${styles.status} ${styles.statusUnread}`;
      statusLabel = "Unread";
    } else {
      statusClass = `${styles.status} ${styles.statusRead}`;
      statusLabel = "Read";
    }
  }

  const canMarkRead = ready && !busy && (unread || showUpdated) && Boolean(readState);
  const canMarkUnread = ready && !busy && !unread && wasReadBefore && Boolean(readState);
  const signInHref = href(`/sign-in?next=${encodeURIComponent(pathname || "/")}`);

  return (
    <div className={styles.bar} role="status" aria-live="polite">
      <span className={statusClass}>{statusLabel}</span>
      {error ? <span className="muted">{error}</span> : null}
      {configured && !user && ready ? (
        <Link href={signInHref} className={styles.signInLink}>
          Sign in
        </Link>
      ) : null}
      {canMarkRead ? (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={busy}
          onClick={() => void onMarkRead()}
        >
          {busy ? "Saving…" : "Mark as read"}
        </button>
      ) : null}
      {canMarkUnread ? (
        <button
          type="button"
          className={styles.btn}
          disabled={busy}
          onClick={() => void onMarkUnread()}
        >
          {busy ? "Saving…" : "Mark unread"}
        </button>
      ) : null}
    </div>
  );
}
