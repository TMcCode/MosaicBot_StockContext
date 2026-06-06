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

export function isUnread(seenBuildId: string | undefined, currentBuildId: string | undefined): boolean {
  if (!currentBuildId) {
    return false;
  }
  if (!seenBuildId) {
    return true;
  }
  return seenBuildId !== currentBuildId;
}
