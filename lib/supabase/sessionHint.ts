/** Detect persisted Supabase session without importing `@supabase/supabase-js`. */
export function hasSupabaseSessionHint(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/^sb-.+-auth-token$/i.test(key)) {
        const raw = localStorage.getItem(key);
        if (raw && raw !== "null" && raw !== "{}") {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}
