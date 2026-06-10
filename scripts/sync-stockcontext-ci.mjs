/**
 * CI / prebuild: sync stockcontext/*.json from R2 into .cache/stockcontext-public.
 * ETag-aware per file; manifest walk discovers tickers + themes + table bodies.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { STOCKCONTEXT_PREFIX, STOCKCONTEXT_PUBLIC_BASE_URL } from "./lib/storageConfig.mjs";
import { downloadR2Object, r2ObjectMetadata, r2SyncEnabled } from "./lib/r2Download.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE = path.join(root, ".cache", "stockcontext-public");
const META_FILE = path.join(CACHE, "_sync_meta.json");

function scPath(relative) {
  return `${STOCKCONTEXT_PREFIX}/${relative.replace(/^\//, "")}`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf8"));
  } catch {
    return { files: {} };
  }
}

function saveMeta(meta) {
  ensureDir(META_FILE);
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

function cdnSyncEnabled() {
  return process.env.STOCKCONTEXT_SYNC_VIA_CDN === "1";
}

function cdnUrl(relative) {
  return `${STOCKCONTEXT_PUBLIC_BASE_URL}/${relative.replace(/^\//, "")}`;
}

function syncConcurrency() {
  const n = Number(process.env.STOCKCONTEXT_SYNC_CONCURRENCY || 48);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 128) : 48;
}

/** Run async work over items with a fixed worker pool (CI sync is I/O-bound). */
async function runConcurrent(items, fn) {
  const list = [...items];
  const total = list.length;
  if (total === 0) return [];

  const concurrency = Math.min(syncConcurrency(), total);
  let index = 0;
  let done = 0;
  const results = new Array(total);

  async function worker() {
    while (true) {
      const i = index;
      index += 1;
      if (i >= total) break;
      results[i] = await fn(list[i], i);
      done += 1;
      if (done % 500 === 0 || done === total) {
        console.log(`sync-stockcontext-ci: progress ${done}/${total}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function formatEtag(etag) {
  const bare = String(etag || "").replace(/^"|"$/g, "");
  return bare ? `"${bare}"` : "";
}

async function downloadFromCdn(relative, meta) {
  const url = cdnUrl(relative);
  const prev = meta.files[relative];
  const dest = path.join(CACHE, relative);
  const headers = { cache: "no-store" };
  if (prev?.etag && fs.existsSync(dest)) {
    const ifNoneMatch = formatEtag(prev.etag);
    if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;
  }

  const res = await fetch(url, { headers });
  if (res.status === 404) {
    return false;
  }
  if (res.status === 304) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`CDN ${res.status} ${url}`);
  }
  const text = await res.text();
  const etag = (res.headers.get("etag") || "").replace(/^"|"$/g, "");
  ensureDir(dest);
  fs.writeFileSync(dest, text);
  meta.files[relative] = {
    etag: etag || undefined,
    at: new Date().toISOString(),
    source: "cdn",
  };
  return true;
}

async function downloadRelative(relative, meta) {
  if (cdnSyncEnabled()) {
    return downloadFromCdn(relative, meta);
  }
  const objectPath = scPath(relative);
  const dest = path.join(CACHE, relative);
  const prev = meta.files[relative];
  if (r2SyncEnabled()) {
    const remote = await r2ObjectMetadata(objectPath);
    if (remote?.etag && prev?.etag === remote.etag && fs.existsSync(dest)) {
      return false;
    }
    const text = await downloadR2Object(objectPath);
    ensureDir(dest);
    fs.writeFileSync(dest, text);
    meta.files[relative] = { etag: remote?.etag, at: new Date().toISOString() };
    return true;
  }
  return false;
}

function seedFromExamples(meta) {
  const examples = path.join(root, "docs", "examples");
  const manifestSrc = path.join(examples, "manifest.v0.example.json");
  if (!fs.existsSync(manifestSrc)) {
    console.warn("sync-stockcontext-ci: no examples to seed");
    return;
  }
  const copy = (src, destRel) => {
    const dest = path.join(CACHE, destRel);
    ensureDir(dest);
    fs.copyFileSync(src, dest);
    meta.files[destRel] = { seeded: true, at: new Date().toISOString() };
  };
  copy(manifestSrc, "manifest.v0.json");
  copy(path.join(examples, "search_index.v0.example.json"), "search_index.v0.json");
  copy(path.join(examples, "home_feeds.v0.example.json"), "feeds/home.v0.json");
  const themeIndex = path.join(examples, "themes", "index.v0.example.json");
  if (fs.existsSync(themeIndex)) {
    copy(themeIndex, "themes/index.v0.json");
  }
  const themeMeta = path.join(examples, "themes", "ai-26-midstream-ai-materials", "meta.v0.example.json");
  if (fs.existsSync(themeMeta)) {
    copy(themeMeta, "themes/ai-26-midstream-ai-materials/meta.v0.json");
  }
  const nvda = path.join(examples, "tickers", "NVDA");
  if (fs.existsSync(nvda)) {
    for (const f of fs.readdirSync(nvda)) {
      if (f.endsWith(".example.json")) {
        const rel = f.replace(".example.json", ".json");
        copy(path.join(nvda, f), `tickers/NVDA/${rel}`);
      }
    }
    const tablesDir = path.join(nvda, "tables");
    if (fs.existsSync(tablesDir)) {
      for (const f of fs.readdirSync(tablesDir)) {
        if (f.endsWith(".example.json")) {
          const rel = f.replace(".example.json", ".json");
          copy(path.join(tablesDir, f), `tickers/NVDA/tables/${rel}`);
        }
      }
    }
  }
  console.log("sync-stockcontext-ci: seeded .cache from docs/examples (dev fallback)");
}

/** Only sync known stockcontext JSON paths — ignore prose in previews/notes (e.g. "y/y", "$3.425B"). */
function isSyncAssetPath(value) {
  if (typeof value !== "string" || value.startsWith("http")) return false;
  const rel = value.replace(/^\//, "");
  if (!rel.endsWith(".json")) return false;
  return (
    rel === "manifest.v0.json" ||
    rel === "search_index.v0.json" ||
    rel.startsWith("feeds/") ||
    rel.startsWith("themes/") ||
    rel.startsWith("tickers/")
  );
}

function collectUrls(obj, out = new Set()) {
  if (obj == null) return out;
  if (typeof obj === "string" && isSyncAssetPath(obj)) {
    out.add(obj.replace(/^\//, ""));
  }
  if (Array.isArray(obj)) {
    for (const x of obj) collectUrls(x, out);
  } else if (typeof obj === "object") {
    for (const v of Object.values(obj)) collectUrls(v, out);
  }
  return out;
}

async function downloadMany(relativePaths, meta, { label = "batch" } = {}) {
  const list = [...relativePaths].filter((rel) => typeof rel === "string" && !rel.startsWith("http"));
  if (list.length === 0) return 0;

  let downloaded = 0;
  let unchanged = 0;
  let errors = 0;
  await runConcurrent(list, async (rel) => {
    try {
      if (await downloadRelative(rel, meta)) downloaded += 1;
      else unchanged += 1;
    } catch (e) {
      errors += 1;
      console.warn(`skip ${rel}: ${e?.message || e}`);
    }
  });
  console.log(
    `sync-stockcontext-ci: ${label} ${list.length} files (${downloaded} updated, ${unchanged} unchanged, ${errors} skipped)`,
  );
  return downloaded;
}

function copySearchIndexToPublic() {
  const dest = path.join(root, "public", "search_index.v0.json");
  const src = path.join(CACHE, "search_index.v0.json");
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.warn("sync-stockcontext-ci: removed stale public/search_index.v0.json (missing in cache)");
    }
    return;
  }
  const destDir = path.join(root, "public");
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("sync-stockcontext-ci: copied search_index.v0.json → public/ (static export for client search)");
}

/** After meta files exist, pull tables/index, chart, financials, and table bodies. */
async function syncTickerBundles(meta) {
  const tickersDir = path.join(CACHE, "tickers");
  if (!fs.existsSync(tickersDir)) return 0;

  let downloaded = 0;
  const bundleUrls = new Set();
  for (const sym of fs.readdirSync(tickersDir)) {
    const metaPath = path.join(tickersDir, sym, "meta.v0.json");
    if (fs.existsSync(metaPath)) {
      collectUrls(JSON.parse(fs.readFileSync(metaPath, "utf8")), bundleUrls);
    }
  }
  downloaded += await downloadMany(bundleUrls, meta, { label: "ticker bundles" });

  const bodyUrls = new Set();
  for (const sym of fs.readdirSync(tickersDir)) {
    const indexPath = path.join(tickersDir, sym, "tables", "index.v0.json");
    if (fs.existsSync(indexPath)) {
      collectUrls(JSON.parse(fs.readFileSync(indexPath, "utf8")), bodyUrls);
    }
  }
  downloaded += await downloadMany(bodyUrls, meta, { label: "ticker table bodies" });
  return downloaded;
}

/** Theme meta is synced from manifest; pull tables/index + section bodies (same as tickers). */
async function syncThemeBundles(meta) {
  const themesDir = path.join(CACHE, "themes");
  if (!fs.existsSync(themesDir)) return 0;

  let downloaded = 0;
  const bundleUrls = new Set();
  for (const slug of fs.readdirSync(themesDir)) {
    const metaPath = path.join(themesDir, slug, "meta.v0.json");
    if (fs.existsSync(metaPath)) {
      collectUrls(JSON.parse(fs.readFileSync(metaPath, "utf8")), bundleUrls);
    }
  }
  downloaded += await downloadMany(bundleUrls, meta, { label: "theme bundles" });

  const bodyUrls = new Set();
  for (const slug of fs.readdirSync(themesDir)) {
    const indexPath = path.join(themesDir, slug, "tables", "index.v0.json");
    if (fs.existsSync(indexPath)) {
      collectUrls(JSON.parse(fs.readFileSync(indexPath, "utf8")), bodyUrls);
    }
  }
  downloaded += await downloadMany(bodyUrls, meta, { label: "theme table bodies" });
  return downloaded;
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const meta = loadMeta();
  let downloaded = 0;

  const remoteSync = cdnSyncEnabled() || r2SyncEnabled();
  if (cdnSyncEnabled()) {
    console.log(
      `sync-stockcontext-ci: using public CDN (STOCKCONTEXT_SYNC_VIA_CDN=1, concurrency=${syncConcurrency()})`,
    );
  } else if (r2SyncEnabled()) {
    console.log(
      `sync-stockcontext-ci: using R2 API (STOCKTHEMES_SYNC_VIA_R2=1, concurrency=${syncConcurrency()})`,
    );
  }

  if (remoteSync) {
    if (await downloadRelative("manifest.v0.json", meta)) downloaded += 1;
    const manifestPath = path.join(CACHE, "manifest.v0.json");
    if (!fs.existsSync(manifestPath)) {
      console.error("::error::manifest.v0.json missing after remote sync");
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const urls = collectUrls(manifest);
    const bootstrapKeys = [
      "search_index.v0.json",
      "feeds/home.v0.json",
      "feeds/recent_updates_marquee.v0.json",
      "feeds/workflow_tags.v0.json",
      "themes/index.v0.json",
    ];
    for (const key of bootstrapKeys) {
      urls.add(key);
    }
    downloaded += await downloadMany(bootstrapKeys, meta, { label: "bootstrap" });
    const homePath = path.join(CACHE, "feeds/home.v0.json");
    if (fs.existsSync(homePath)) {
      const home = JSON.parse(fs.readFileSync(homePath, "utf8"));
      for (const section of home.sections || []) {
        if (section?.id) {
          urls.add(`feeds/sections/${section.id}.v0.json`);
        }
      }
    }
    const searchIndexPath = path.join(CACHE, "search_index.v0.json");
    if (fs.existsSync(searchIndexPath)) {
      collectUrls(JSON.parse(fs.readFileSync(searchIndexPath, "utf8")), urls);
    }
    downloaded += await downloadMany(urls, meta, { label: "manifest walk" });
    downloaded += await syncTickerBundles(meta);
    downloaded += await syncThemeBundles(meta);
    const label = cdnSyncEnabled() ? "CDN" : "R2";
    console.log(`sync-stockcontext-ci: ${label} sync done (${downloaded} files updated)`);
  } else {
    const manifestPath = path.join(CACHE, "manifest.v0.json");
    if (fs.existsSync(manifestPath)) {
      console.log("sync-stockcontext-ci: using existing cache (no remote sync env)");
    } else {
      seedFromExamples(meta);
    }
  }

  saveMeta(meta);
  copySearchIndexToPublic();
  const manifestPath = path.join(CACHE, "manifest.v0.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("::error::No manifest in cache — set R2 secrets, STOCKCONTEXT_SYNC_VIA_CDN=1, or add examples");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.build_id === "example-local-001") {
    if (process.env.CI === "true" || remoteSync) {
      console.error(
        "::error::manifest still example-local-001 — stale cache or remote sync failed; bump cache key or force_build",
      );
      process.exit(1);
    }
  } else if (remoteSync) {
    const total = manifest.stats?.total_tickers ?? manifest.tickers?.length ?? 0;
    console.log(
      `sync-stockcontext-ci: manifest build_id=${manifest.build_id} tickers=${total} themes=${manifest.stats?.total_themes ?? manifest.themes?.length ?? 0}`,
    );
  }

  const homePath = path.join(CACHE, "feeds/home.v0.json");
  if (fs.existsSync(homePath)) {
    const home = JSON.parse(fs.readFileSync(homePath, "utf8"));
    const sectionIds = (home.sections || []).map((s) => s?.id).filter(Boolean);
    const legacyUniverseOnly =
      sectionIds.length === 1 && sectionIds[0] === "universe";
    if (legacyUniverseOnly) {
      console.error(
        "::error::feeds/home.v0.json is legacy (single universe panel). Publish feeds from MosaicBot first, then re-run Pages deploy (or bump stockcontext-public cache key).",
      );
      process.exit(1);
    }
    if (!sectionIds.includes("watchlist_themes")) {
      console.error(
        `::error::feeds/home.v0.json missing 8-panel home feed (got: ${sectionIds.join(", ") || "none"})`,
      );
      process.exit(1);
    }
    console.log(`sync-stockcontext-ci: home feed ok (${sectionIds.length} sections)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
