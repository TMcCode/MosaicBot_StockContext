import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

import { publicDataFetchUrls } from "@/lib/dataUrls";

/** Relative paths under `.cache/stockcontext-public/` mirror CDN keys. */
export const STOCKCONTEXT_BUILD_CACHE_DIR = ".cache/stockcontext-public";

const DEV_DISK_CACHE_DEFAULT_SEC = 120;

export function stockcontextBuildCacheEnabled(): boolean {
  if (process.env.STOCKCONTEXT_BUILD_CACHE === "0") {
    return false;
  }
  return (
    process.env.STOCKCONTEXT_BUILD_CACHE === "1" ||
    process.env.CI === "true" ||
    process.env.NODE_ENV === "production"
  );
}

function devDiskCacheDisabled(): boolean {
  return process.env.STOCKCONTEXT_DEV_NO_STORE === "1";
}

/** When set, use `.cache/stockcontext-public` files without TTL (avoids CDN overwriting local publish). */
function devPreferLocalDisk(): boolean {
  return process.env.STOCKCONTEXT_DEV_LOCAL_FIRST === "1";
}

function cacheRoot(): string {
  const custom = process.env.STOCKCONTEXT_BUILD_CACHE_DIR?.trim();
  const subdir = custom || STOCKCONTEXT_BUILD_CACHE_DIR;
  return path.join(/* turbopackIgnore: true */ process.cwd(), subdir);
}

function cachePathForRel(relPath: string): string {
  return path.join(/* turbopackIgnore: true */ cacheRoot(), relPath.replace(/^\/+/, ""));
}

function devDiskCacheMaxAgeMs(): number {
  const raw = process.env.STOCKCONTEXT_DEV_REVALIDATE_SEC?.trim();
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return DEV_DISK_CACHE_DEFAULT_SEC * 1000;
}

function hasJsonPayloadStart(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

async function readDevDiskCache(relPath: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return null;
  }
  const abs = cachePathForRel(relPath);
  try {
    const st = await stat(abs);
    if (Date.now() - st.mtimeMs > devDiskCacheMaxAgeMs()) {
      return null;
    }
    const text = await readFile(abs, "utf-8");
    return hasJsonPayloadStart(text) ? text : null;
  } catch {
    return null;
  }
}

async function readDevDiskCacheRaw(relPath: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return null;
  }
  try {
    const text = await readFile(cachePathForRel(relPath), "utf-8");
    return hasJsonPayloadStart(text) ? text : null;
  } catch {
    return null;
  }
}

async function writeDevDiskCache(relPath: string, text: string): Promise<void> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return;
  }
  if (!hasJsonPayloadStart(text)) {
    console.warn(`[stockcontext] Skipping dev disk cache for ${relPath}: response is not JSON.`);
    return;
  }
  const abs = cachePathForRel(relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf-8");
}

export async function invalidateDevDiskCache(relPath: string): Promise<void> {
  if (process.env.NODE_ENV !== "development" || devDiskCacheDisabled()) {
    return;
  }
  try {
    await unlink(cachePathForRel(relPath));
  } catch {
    /* missing */
  }
}

export type FetchPublicJsonOptions = {
  buildId?: string;
  bypassDevCache?: boolean;
};

/**
 * Load public JSON for server components.
 * - `next build` / CI: disk cache only (no CDN).
 * - `next dev`: fresh disk cache (TTL) → CDN → write disk; stale disk fallback on CDN error.
 */
export async function fetchPublicJsonText(
  relPath: string,
  options?: FetchPublicJsonOptions,
): Promise<string> {
  const rel = relPath.replace(/^\/+/, "");
  const abs = cachePathForRel(rel);

  if (stockcontextBuildCacheEnabled()) {
    return readFile(abs, "utf-8");
  }

  if (process.env.NODE_ENV === "development" && !devDiskCacheDisabled() && !options?.bypassDevCache) {
    if (devPreferLocalDisk()) {
      const localFirst = await readDevDiskCacheRaw(rel);
      if (localFirst !== null) {
        return localFirst;
      }
    }
    const devCached = await readDevDiskCache(rel);
    if (devCached !== null) {
      return devCached;
    }
  }

  const urls = publicDataFetchUrls(rel, options?.buildId);
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "omit" });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} ${url}`);
        continue;
      }
      const text = await res.text();
      if (!hasJsonPayloadStart(text)) {
        lastErr = new Error(`Non-JSON body: ${url}`);
        continue;
      }
      if (process.env.NODE_ENV === "development" && !devDiskCacheDisabled()) {
        await writeDevDiskCache(rel, text);
      }
      return text;
    } catch (err) {
      lastErr = err;
    }
  }

  const stale = await readDevDiskCacheRaw(rel);
  if (stale !== null && process.env.NODE_ENV === "development") {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.warn(`[stockcontext] CDN fetch failed for ${rel} (${msg}); using stale disk cache.`);
    return stale;
  }

  throw lastErr instanceof Error ? lastErr : new Error(`Failed to load ${rel}`);
}
