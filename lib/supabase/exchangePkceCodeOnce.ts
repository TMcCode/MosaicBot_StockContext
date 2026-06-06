import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

const inflightByCode = new Map<string, Promise<{ error: AuthError | null }>>();

/** Deduplicate PKCE callback handling (React Strict Mode double-mount). */
export function exchangePkceCodeOnce(client: SupabaseClient, code: string): Promise<{ error: AuthError | null }> {
  let task = inflightByCode.get(code);
  if (!task) {
    task = client.auth.exchangeCodeForSession(code).then(({ error }) => ({ error }));
    inflightByCode.set(code, task);
    task.finally(() => {
      inflightByCode.delete(code);
    });
  }
  return task;
}
