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
fs.mkdirSync(CACHE, { recursive: true });
fs.writeFileSync(
  DEPLOY_META,
  JSON.stringify(
    {
      manifestAsOf: manifest.as_of || "",
      buildId: manifest.build_id || "",
      writtenAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("write-pages-deploy-meta: saved", DEPLOY_META);
