export type PageType = "theme" | "ticker";

export type PageReadRow = {
  page_type: PageType;
  page_key: string;
  seen_build_id: string;
  read_at: string;
};

export function normalizePageKey(pageType: PageType, pageKey: string): string {
  const trimmed = pageKey.trim();
  return pageType === "ticker" ? trimmed.toUpperCase() : trimmed.toLowerCase();
}

export function storageKey(pageType: PageType, pageKey: string): string {
  return `${pageType}:${normalizePageKey(pageType, pageKey)}`;
}

/** True when the page has a build id and the user has not marked that build read. */
export function isUnread(seenBuildId: string | undefined, currentBuildId: string | undefined): boolean {
  if (!currentBuildId) {
    return false;
  }
  if (!seenBuildId) {
    return true;
  }
  return seenBuildId !== currentBuildId;
}

export type FeedUnreadOptions = {
  readAt?: string | null;
  currentEventAt?: string | null;
};

/**
 * Home-feed unread: build-id mismatch unless the user read at/after last content touch.
 */
export function isFeedItemUnread(
  seenBuildId: string | undefined,
  currentBuildId: string | undefined,
  options?: FeedUnreadOptions,
): boolean {
  const eventAt = options?.currentEventAt?.trim();
  const readAt = options?.readAt?.trim();
  if (eventAt && readAt && readAt >= eventAt) {
    return false;
  }
  return isUnread(seenBuildId, currentBuildId);
}
