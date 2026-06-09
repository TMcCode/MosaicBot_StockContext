import { clearLocalReads, localReadsForMerge } from "@/lib/readState/localStorage";
import { normalizePageKey, type PageReadRow, type PageType } from "@/lib/readState/types";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

/** Max rows shown on /account recent-reads list. */
export const ACCOUNT_RECENT_READS_LIMIT = 30;

export async function fetchPageReads(userId: string): Promise<PageReadRow[]> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("page_reads")
    .select("page_type, page_key, seen_build_id, read_at")
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
  return (data ?? []) as PageReadRow[];
}

export async function fetchRecentPageReads(
  userId: string,
  limit = ACCOUNT_RECENT_READS_LIMIT,
): Promise<PageReadRow[]> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("page_reads")
    .select("page_type, page_key, seen_build_id, read_at")
    .eq("user_id", userId)
    .order("read_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []) as PageReadRow[];
}

export async function upsertPageRead(
  userId: string,
  pageType: PageType,
  pageKey: string,
  seenBuildId: string,
): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await supabase.from("page_reads").upsert(
    {
      user_id: userId,
      page_type: pageType,
      page_key: normalizePageKey(pageType, pageKey),
      seen_build_id: seenBuildId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,page_type,page_key" },
  );
  if (error) {
    throw error;
  }
}

export async function deletePageRead(
  userId: string,
  pageType: PageType,
  pageKey: string,
): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { error } = await supabase
    .from("page_reads")
    .delete()
    .eq("user_id", userId)
    .eq("page_type", pageType)
    .eq("page_key", normalizePageKey(pageType, pageKey));
  if (error) {
    throw error;
  }
}

export async function mergeLocalReadsIntoServer(userId: string): Promise<void> {
  const entries = localReadsForMerge();
  if (!entries.length) {
    return;
  }
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return;
  }
  const rows = entries.map((e) => ({
    user_id: userId,
    page_type: e.page_type,
    page_key: e.page_key,
    seen_build_id: e.seen_build_id,
    read_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("page_reads").upsert(rows, {
    onConflict: "user_id,page_type,page_key",
  });
  if (error) {
    throw error;
  }
  clearLocalReads();
}
