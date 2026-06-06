import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserCookiePath, getSupabasePublicConfig } from "@/lib/supabase/config";

import type { SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

/**
 * Singleton browser client — PKCE state in cookies (see stockthemes.ai).
 * Returns null when env is not configured.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return null;
  }
  if (!singleton) {
    singleton = createBrowserClient(cfg.url, cfg.anonKey, {
      cookieOptions: { path: getSupabaseBrowserCookiePath() },
    });
  }
  return singleton;
}
