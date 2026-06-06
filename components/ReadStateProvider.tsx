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

import { useOptionalSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { fetchPageReads, mergeLocalReadsIntoServer, upsertPageRead } from "@/lib/readState/api";
import { getLocalSeenBuildId, setLocalRead } from "@/lib/readState/localStorage";
import { isUnread, normalizePageKey, storageKey, type PageType } from "@/lib/readState/types";

type ReadStateContextValue = {
  ready: boolean;
  getSeenBuildId: (pageType: PageType, pageKey: string) => string | undefined;
  isPageUnread: (pageType: PageType, pageKey: string, currentBuildId?: string) => boolean;
  markRead: (
    pageType: PageType,
    pageKey: string,
    buildId: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
};

const ReadStateContext = createContext<ReadStateContextValue | null>(null);

export function useReadState(): ReadStateContextValue | null {
  return useContext(ReadStateContext);
}

function rowsToMap(rows: { page_type: PageType; page_key: string; seen_build_id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(storageKey(row.page_type, row.page_key), row.seen_build_id);
  }
  return map;
}

export function ReadStateProvider({ children }: { children: ReactNode }) {
  const { configured, user, loading: authLoading } = useOptionalSupabaseAuth();
  const [ready, setReady] = useState(false);
  const [serverMap, setServerMap] = useState<Map<string, string>>(() => new Map());
  const [localVersion, setLocalVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!configured || !user) {
      setServerMap(new Map());
      setReady(!authLoading);
      return;
    }
    try {
      await mergeLocalReadsIntoServer(user.id);
      const rows = await fetchPageReads(user.id);
      setServerMap(rowsToMap(rows));
      setLocalVersion((v) => v + 1);
    } catch {
      setServerMap(new Map());
    } finally {
      setReady(true);
    }
  }, [configured, user, authLoading]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  const getSeenBuildId = useCallback(
    (pageType: PageType, pageKey: string) => {
      const key = storageKey(pageType, pageKey);
      if (user && configured) {
        return serverMap.get(key);
      }
      void localVersion;
      return getLocalSeenBuildId(pageType, pageKey);
    },
    [user, configured, serverMap, localVersion],
  );

  const isPageUnread = useCallback(
    (pageType: PageType, pageKey: string, currentBuildId?: string) => {
      return isUnread(getSeenBuildId(pageType, pageKey), currentBuildId);
    },
    [getSeenBuildId],
  );

  const markRead = useCallback(
    async (pageType: PageType, pageKey: string, buildId: string) => {
      const normalized = normalizePageKey(pageType, pageKey);
      if (!buildId) {
        return { ok: false, message: "No build id for this page." };
      }
      if (user && configured) {
        const key = storageKey(pageType, normalized);
        setServerMap((prev) => {
          const next = new Map(prev);
          next.set(key, buildId);
          return next;
        });
        try {
          await upsertPageRead(user.id, pageType, normalized, buildId);
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
    [user, configured, refresh],
  );

  const value = useMemo<ReadStateContextValue>(
    () => ({
      ready,
      getSeenBuildId,
      isPageUnread,
      markRead,
      refresh,
    }),
    [ready, getSeenBuildId, isPageUnread, markRead, refresh],
  );

  return <ReadStateContext.Provider value={value}>{children}</ReadStateContext.Provider>;
}
