"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuthUser } from "@/lib/auth/AuthUserContext";
import { clearLocalRead, getLocalSeenBuildId, setLocalRead } from "@/lib/readState/localStorage";
import { isFeedItemUnread, isUnread, normalizePageKey, storageKey, type PageType } from "@/lib/readState/types";

type ReadStateContextValue = {
  ready: boolean;
  getSeenBuildId: (pageType: PageType, pageKey: string) => string | undefined;
  getReadAt: (pageType: PageType, pageKey: string) => string | undefined;
  isPageUnread: (
    pageType: PageType,
    pageKey: string,
    currentBuildId?: string,
    options?: { currentEventAt?: string | null },
  ) => boolean;
  markRead: (
    pageType: PageType,
    pageKey: string,
    buildId: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  markUnread: (
    pageType: PageType,
    pageKey: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
};

const ReadStateContext = createContext<ReadStateContextValue | null>(null);

export function useReadState(): ReadStateContextValue | null {
  return useContext(ReadStateContext);
}

function rowsToMaps(rows: { page_type: PageType; page_key: string; seen_build_id: string; read_at?: string }[]): {
  seenBuildIds: Map<string, string>;
  readAt: Map<string, string>;
} {
  const seenBuildIds = new Map<string, string>();
  const readAt = new Map<string, string>();
  for (const row of rows) {
    const key = storageKey(row.page_type, row.page_key);
    seenBuildIds.set(key, row.seen_build_id);
    if (row.read_at) {
      readAt.set(key, row.read_at);
    }
  }
  return { seenBuildIds, readAt };
}

export function ReadStateProvider({ children }: { children: ReactNode }) {
  const { configured, userId, loading: authLoading } = useAuthUser();
  const [ready, setReady] = useState(false);
  const [serverSeenMap, setServerSeenMap] = useState<Map<string, string>>(() => new Map());
  const [serverReadAtMap, setServerReadAtMap] = useState<Map<string, string>>(() => new Map());
  const [localVersion, setLocalVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setServerSeenMap(new Map());
      setServerReadAtMap(new Map());
      setReady(!authLoading);
      return;
    }
    try {
      const api = await import("@/lib/readState/api");
      await api.mergeLocalReadsIntoServer(userId);
      const rows = await api.fetchPageReads(userId);
      const { seenBuildIds, readAt } = rowsToMaps(rows);
      setServerSeenMap(seenBuildIds);
      setServerReadAtMap(readAt);
      setLocalVersion((v) => v + 1);
    } catch {
      setServerSeenMap(new Map());
      setServerReadAtMap(new Map());
    } finally {
      setReady(true);
    }
  }, [userId, authLoading]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const getSeenBuildId = useCallback(
    (pageType: PageType, pageKey: string) => {
      const key = storageKey(pageType, pageKey);
      if (userId && configured) {
        return serverSeenMap.get(key);
      }
      void localVersion;
      return getLocalSeenBuildId(pageType, pageKey);
    },
    [userId, configured, serverSeenMap, localVersion],
  );

  const getReadAt = useCallback(
    (pageType: PageType, pageKey: string) => {
      const key = storageKey(pageType, pageKey);
      if (userId && configured) {
        return serverReadAtMap.get(key);
      }
      return undefined;
    },
    [userId, configured, serverReadAtMap],
  );

  const isPageUnread = useCallback(
    (pageType: PageType, pageKey: string, currentBuildId?: string, options?: { currentEventAt?: string | null }) => {
      const key = storageKey(pageType, pageKey);
      const seenBuildId = getSeenBuildId(pageType, pageKey);
      const readAt = userId && configured ? serverReadAtMap.get(key) : undefined;
      if (options?.currentEventAt) {
        return isFeedItemUnread(seenBuildId, currentBuildId, {
          readAt,
          currentEventAt: options.currentEventAt,
        });
      }
      return isUnread(seenBuildId, currentBuildId);
    },
    [getSeenBuildId, userId, configured, serverReadAtMap],
  );

  const markRead = useCallback(
    async (pageType: PageType, pageKey: string, buildId: string) => {
      const normalized = normalizePageKey(pageType, pageKey);
      if (!buildId) {
        return { ok: false, message: "No build id for this page." };
      }
      if (userId && configured) {
        const key = storageKey(pageType, normalized);
        const readAtIso = new Date().toISOString();
        setServerSeenMap((prev) => {
          const next = new Map(prev);
          next.set(key, buildId);
          return next;
        });
        setServerReadAtMap((prev) => {
          const next = new Map(prev);
          next.set(key, readAtIso);
          return next;
        });
        try {
          const api = await import("@/lib/readState/api");
          await api.upsertPageRead(userId, pageType, normalized, buildId);
          return { ok: true };
        } catch (e: unknown) {
          await refresh();
          return {
            ok: false,
            message: e instanceof Error ? e.message : "Could not save read state.",
          };
        }
      }
      setLocalRead(pageType, normalized, buildId);
      setLocalVersion((v) => v + 1);
      return { ok: true };
    },
    [userId, configured, refresh],
  );

  const markUnread = useCallback(
    async (pageType: PageType, pageKey: string) => {
      const normalized = normalizePageKey(pageType, pageKey);
      if (userId && configured) {
        const key = storageKey(pageType, normalized);
        setServerSeenMap((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        setServerReadAtMap((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        try {
          const api = await import("@/lib/readState/api");
          await api.deletePageRead(userId, pageType, normalized);
          return { ok: true };
        } catch (e: unknown) {
          await refresh();
          return {
            ok: false,
            message: e instanceof Error ? e.message : "Could not clear read state.",
          };
        }
      }
      clearLocalRead(pageType, normalized);
      setLocalVersion((v) => v + 1);
      return { ok: true };
    },
    [userId, configured, refresh],
  );

  const value = useMemo<ReadStateContextValue>(
    () => ({
      ready,
      getSeenBuildId,
      getReadAt,
      isPageUnread,
      markRead,
      markUnread,
      refresh,
    }),
    [ready, getSeenBuildId, getReadAt, isPageUnread, markRead, markUnread, refresh],
  );

  return <ReadStateContext.Provider value={value}>{children}</ReadStateContext.Provider>;
}
