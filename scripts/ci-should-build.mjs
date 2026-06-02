/**
 * GitHub Actions: skip Pages deploy when stockcontext manifest as_of unchanged.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { STOCKCONTEXT_MANIFEST_URL, STOCKCONTEXT_PREFIX } from "./lib/storageConfig.mjs";
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

async function fetchManifestAsOf() {
  if (r2SyncEnabled()) {
    const data = JSON.parse(await downloadR2Object(`${STOCKCONTEXT_PREFIX}/manifest.v0.json`));
    return String(data.as_of || "");
  }
  const res = await fetch(STOCKCONTEXT_MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`manifest HTTP ${res.status}`);
  }
  const data = JSON.parse(await res.text());
  return String(data.as_of || "");
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

  const live = await fetchManifestAsOf();
  const deployed = readDeployedMeta();
  if (!deployed.manifestAsOf) {
    writeOutputs({ shouldBuild: true, reason: "no prior deploy meta" });
    return;
  }
  if (live && live !== deployed.manifestAsOf) {
    writeOutputs({ shouldBuild: true, reason: `as_of changed ${deployed.manifestAsOf} → ${live}` });
    return;
  }
  writeOutputs({ shouldBuild: false, reason: `manifest as_of unchanged (${live})` });
}

main().catch((e) => {
  console.error(e);
  writeOutputs({ shouldBuild: true, reason: `check failed: ${e?.message || e}` });
});
