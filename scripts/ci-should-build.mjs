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

  const [manifestAsOf, homeFeedAsOf] = await Promise.all([fetchManifestAsOf(), fetchHomeFeedAsOf()]);
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
  writeOutputs({
    shouldBuild: false,
    reason: `publish unchanged (manifest=${manifestAsOf}, home=${homeFeedAsOf})`,
  });
}

main().catch((e) => {
  console.error(e);
  writeOutputs({ shouldBuild: true, reason: `check failed: ${e?.message || e}` });
});
