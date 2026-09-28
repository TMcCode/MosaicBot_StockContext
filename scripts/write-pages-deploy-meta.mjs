import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CACHE = path.join(root, ".cache", "stockcontext-public");
const DEPLOY_META = path.join(CACHE, "_pages_deploy_meta.json");

const manifestPath = path.join(CACHE, "manifest.v0.json");
if (!fs.existsSync(manifestPath)) {
  console.warn("write-pages-deploy-meta: no manifest in cache");
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const homePath = path.join(CACHE, "feeds", "home.v0.json");
let homeFeedAsOf = "";
if (fs.existsSync(homePath)) {
  try {
    const home = JSON.parse(fs.readFileSync(homePath, "utf8"));
    homeFeedAsOf = home.as_of || "";
  } catch {
    homeFeedAsOf = "";
  }
}
const newsCatalogPath = path.join(
  root,
  "public",
  "chart-data",
  "stockcontext",
  "news",
  "themes_catalog.v0.json",
);
let themeNewsAsOf = "";
if (fs.existsSync(newsCatalogPath)) {
  try {
    themeNewsAsOf = JSON.parse(fs.readFileSync(newsCatalogPath, "utf8")).as_of || "";
  } catch {
    themeNewsAsOf = "";
  }
}
fs.mkdirSync(CACHE, { recursive: true });
fs.writeFileSync(
  DEPLOY_META,
  JSON.stringify(
    {
      manifestAsOf: manifest.as_of || "",
      homeFeedAsOf,
      themeNewsAsOf,
      buildId: manifest.build_id || "",
      writtenAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("write-pages-deploy-meta: saved", DEPLOY_META);
