import { publicDataFetchUrls } from "@/lib/dataUrls";

/** Browser CDN fetch for lazy loads (legacy). Prefer server `TableSection` in App Router pages. */
export async function fetchPublicJson<T>(relativePath: string, buildId?: string): Promise<T> {
  const rel = relativePath.replace(/^\//, "");
  const urls = publicDataFetchUrls(rel, buildId);
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        credentials: "omit",
        cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(`Failed to load ${relativePath}`);
}
