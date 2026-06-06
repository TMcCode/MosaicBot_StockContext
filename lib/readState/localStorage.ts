import { normalizePageKey, storageKey, type PageType } from "@/lib/readState/types";

export const READ_STATE_LOCAL_KEY = "stockcontext-reads-v1";

export type LocalReadMap = Record<string, string>;

export function readLocalReads(): LocalReadMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(READ_STATE_LOCAL_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const out: LocalReadMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string" && v) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLocalReads(map: LocalReadMap): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(READ_STATE_LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function setLocalRead(pageType: PageType, pageKey: string, seenBuildId: string): void {
  const map = readLocalReads();
  map[storageKey(pageType, pageKey)] = seenBuildId;
  writeLocalReads(map);
}

export function getLocalSeenBuildId(pageType: PageType, pageKey: string): string | undefined {
  return readLocalReads()[storageKey(pageType, pageKey)];
}

export function clearLocalReads(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(READ_STATE_LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

/** Entries from local storage for merge into Supabase on first sign-in. */
export function localReadsForMerge(): { page_type: PageType; page_key: string; seen_build_id: string }[] {
  const map = readLocalReads();
  const out: { page_type: PageType; page_key: string; seen_build_id: string }[] = [];
  for (const [key, seen_build_id] of Object.entries(map)) {
    const colon = key.indexOf(":");
    if (colon < 1) continue;
    const page_type = key.slice(0, colon) as PageType;
    if (page_type !== "theme" && page_type !== "ticker") continue;
    const rawKey = key.slice(colon + 1);
    out.push({
      page_type,
      page_key: normalizePageKey(page_type, rawKey),
      seen_build_id,
    });
  }
  return out;
}
