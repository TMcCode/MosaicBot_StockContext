/**
 * GitHub Actions: skip Pages deploy when stockcontext publish data unchanged.
 * Compare manifest + home feed as_of (feeds-only publish can refresh home without manifest bump).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  STOCKCONTEXT_MANIFEST_URL,
  STOCKCONTEXT_PREFIX,
  STOCKCONTEXT_PUBLIC_BASE_URL,
} from "./lib/storageConfig.mjs";
import { downloadR2Object, r2SyncEnabled } from "./lib/r2Download.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DEPLOY_META = path.join(root, ".cache", "stockcontext-public", "_pages_deploy_meta.json");

function writeOutputs({ shouldBuild, reason }) {
  const out = process.env.GITHUB_OUTPUT;
  const line = (k, v) => `${k}=${v}\n`;
  if (out) {
    fs.appendFileSync(out, line("should_build", shouldBuild ? "true" : "false"));
    fs.appendFileSync(out, line("reason", reason.replace(/\n/g, " ")));
  }
  console.log(`ci-should-build: should_build=${shouldBuild} (${reason})`);
}

function readDeployedMeta() {
  try {
    return JSON.parse(fs.readFileSync(DEPLOY_META, "utf8"));
  } catch {
    return {};
  }
}

async function fetchJsonAsOf(objectPath, cdnUrl) {
  if (r2SyncEnabled()) {
    const data = JSON.parse(await downloadR2Object(`${STOCKCONTEXT_PREFIX}/${objectPath}`));
    return String(data.as_of || "");
  }
  const res = await fetch(cdnUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${objectPath} HTTP ${res.status}`);
  }
  const data = JSON.parse(await res.text());
  return String(data.as_of || "");
}

async function fetchManifestAsOf() {
  return fetchJsonAsOf("manifest.v0.json", STOCKCONTEXT_MANIFEST_URL);
}

async function fetchHomeFeedAsOf() {
  return fetchJsonAsOf(
    "feeds/home.v0.json",
    `${STOCKCONTEXT_PUBLIC_BASE_URL}/feeds/home.v0.json`,
  );
}

/** Theme news catalog as_of only moves when a theme feed changed; optional (never blocks). */
async function fetchThemeNewsAsOf() {
  try {
    return await fetchJsonAsOf(
      "news/themes_catalog.v0.json",
      `${STOCKCONTEXT_PUBLIC_BASE_URL}/news/themes_catalog.v0.json`,
    );
  } catch {
    return "";
  }
}

/** All-news index as_of only moves when the /news feed changed; optional (never blocks). */
async function fetchAllNewsAsOf() {
  try {
    return await fetchJsonAsOf(
      "news/all/index.v0.json",
      `${STOCKCONTEXT_PUBLIC_BASE_URL}/news/all/index.v0.json`,
    );
  } catch {
    return "";
  }
}

async function main() {
  const event = process.env.GITHUB_EVENT_NAME || "";
  const force = process.env.FORCE_BUILD === "true" || process.env.FORCE_BUILD === "1";

  if (event === "push" || force) {
    writeOutputs({
      shouldBuild: true,
      reason: force ? "workflow_dispatch force_build" : "push to main",
    });
    return;
  }

  const [manifestAsOf, homeFeedAsOf, themeNewsAsOf, allNewsAsOf] = await Promise.all([
    fetchManifestAsOf(),
    fetchHomeFeedAsOf(),
    fetchThemeNewsAsOf(),
    fetchAllNewsAsOf(),
  ]);
  const deployed = readDeployedMeta();
  if (!deployed.manifestAsOf && !deployed.homeFeedAsOf) {
    writeOutputs({ shouldBuild: true, reason: "no prior deploy meta" });
    return;
  }
  if (manifestAsOf && manifestAsOf !== deployed.manifestAsOf) {
    writeOutputs({
      shouldBuild: true,
      reason: `manifest as_of changed ${deployed.manifestAsOf || "(none)"} → ${manifestAsOf}`,
    });
    return;
  }
  if (homeFeedAsOf && homeFeedAsOf !== deployed.homeFeedAsOf) {
    writeOutputs({
      shouldBuild: true,
      reason: `home feed as_of changed ${deployed.homeFeedAsOf || "(none)"} → ${homeFeedAsOf}`,
    });
    return;
  }
  if (themeNewsAsOf && themeNewsAsOf !== deployed.themeNewsAsOf) {
    writeOutputs({
      shouldBuild: true,
      reason: `theme news as_of changed ${deployed.themeNewsAsOf || "(none)"} → ${themeNewsAsOf}`,
    });
    return;
  }
  if (allNewsAsOf && allNewsAsOf !== deployed.allNewsAsOf) {
    writeOutputs({
      shouldBuild: true,
      reason: `all news as_of changed ${deployed.allNewsAsOf || "(none)"} → ${allNewsAsOf}`,
    });
    return;
  }
  writeOutputs({
    shouldBuild: false,
    reason: `publish unchanged (manifest=${manifestAsOf}, home=${homeFeedAsOf}, news=${themeNewsAsOf}, all_news=${allNewsAsOf})`,
  });
}

main().catch((e) => {
  console.error(e);
  writeOutputs({ shouldBuild: true, reason: `check failed: ${e?.message || e}` });
});
