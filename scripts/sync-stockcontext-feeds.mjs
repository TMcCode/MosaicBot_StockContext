/**
 * Fast sync: manifest + home feeds only (~seconds). Full ticker bundles: sync:cache:cdn.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { STOCKCONTEXT_PUBLIC_BASE_URL } from "./lib/storageConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE = path.join(root, ".cache", "stockcontext-public");

const FEED_KEYS = [
  "manifest.v0.json",
  "search_index.v0.json",
  "feeds/home.v0.json",
  "feeds/recent_updates_marquee.v0.json",
  "feeds/workflow_tags.v0.json",
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function downloadRel(relative) {
  const url = `${STOCKCONTEXT_PUBLIC_BASE_URL}/${relative.replace(/^\//, "")}`;
  const dest = path.join(CACHE, relative);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CDN ${res.status} ${url}`);
  }
  ensureDir(dest);
  fs.writeFileSync(dest, await res.text(), "utf8");
  console.log(`sync-feeds: ${relative}`);
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });

  for (const key of FEED_KEYS) {
    await downloadRel(key);
  }

  const homePath = path.join(CACHE, "feeds/home.v0.json");
  if (fs.existsSync(homePath)) {
    const home = JSON.parse(fs.readFileSync(homePath, "utf8"));
    for (const section of home.sections || []) {
      if (section?.id) {
        await downloadRel(`feeds/sections/${section.id}.v0.json`);
      }
    }
  }

  console.log("sync-stockcontext-feeds: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
