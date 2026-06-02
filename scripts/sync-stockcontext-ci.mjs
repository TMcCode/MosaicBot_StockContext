/**
 * CI / prebuild: sync stockcontext/*.json from R2 into .cache/stockcontext-public.
 * ETag-aware per file; manifest walk discovers tickers + themes + table bodies.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { STOCKCONTEXT_PREFIX } from "./lib/storageConfig.mjs";
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

async function downloadRelative(relative, meta) {
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

function collectUrls(obj, out = new Set()) {
  if (obj == null) return out;
  if (typeof obj === "string" && (obj.endsWith(".json") || obj.includes("/"))) {
    if (!obj.startsWith("http") && obj.includes(".")) {
      out.add(obj.replace(/^\//, ""));
    }
  }
  if (Array.isArray(obj)) {
    for (const x of obj) collectUrls(x, out);
  } else if (typeof obj === "object") {
    for (const v of Object.values(obj)) collectUrls(v, out);
  }
  return out;
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const meta = loadMeta();
  let downloaded = 0;

  if (r2SyncEnabled()) {
    if (await downloadRelative("manifest.v0.json", meta)) downloaded += 1;
    const manifestPath = path.join(CACHE, "manifest.v0.json");
    if (!fs.existsSync(manifestPath)) {
      console.error("::error::manifest.v0.json missing after R2 sync");
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const urls = collectUrls(manifest);
    for (const key of ["search_index.v0.json", "feeds/home.v0.json", "themes/index.v0.json"]) {
      urls.add(key);
    }
    for (const key of ["search_index.v0.json", "feeds/home.v0.json", "themes/index.v0.json"]) {
      await downloadRelative(key, meta);
    }
    if (fs.existsSync(path.join(CACHE, "search_index.v0.json"))) {
      collectUrls(JSON.parse(fs.readFileSync(path.join(CACHE, "search_index.v0.json"), "utf8")), urls);
    }
    for (const rel of urls) {
      if (rel.startsWith("http")) continue;
      try {
        if (await downloadRelative(rel, meta)) downloaded += 1;
      } catch (e) {
        console.warn(`skip ${rel}: ${e?.message || e}`);
      }
    }
    console.log(`sync-stockcontext-ci: R2 sync done (${downloaded} files updated)`);
  } else {
    seedFromExamples(meta);
  }

  saveMeta(meta);
  if (!fs.existsSync(path.join(CACHE, "manifest.v0.json"))) {
    console.error("::error::No manifest in cache — set R2 secrets or add examples");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
