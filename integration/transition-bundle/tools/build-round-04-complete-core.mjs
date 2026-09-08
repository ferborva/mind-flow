#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assessTransitionBundle } from "../assess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const prePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";
const viewPath = "dashboard/fixtures/round-04.worker-option.executable-if-view.synthetic.json";
const outputPath = resolve(
  root,
  "integration/transition-bundle/fixtures/round-04.worker-option.complete.json",
);
const check = process.argv.includes("--check");

const projectionBuild = spawnSync(
  process.execPath,
  ["dashboard/tools/build-round-04-executable-if-view.mjs", ...(check ? ["--check"] : [])],
  { cwd: root, encoding: "utf8" },
);
if (projectionBuild.status !== 0) {
  throw new TypeError(projectionBuild.stderr || projectionBuild.stdout);
}

const pre = JSON.parse(readFileSync(resolve(root, prePath), "utf8"));
const viewBytes = readFileSync(resolve(root, viewPath));
const complete = {
  ...pre,
  bundle_id: "bundle.round-04.worker-option.complete",
  bundle_stage: "complete-core",
  artifacts: [
    ...pre.artifacts,
    {
      role: "dashboard-snapshot",
      path: viewPath,
      sha256: `sha256:${createHash("sha256").update(viewBytes).digest("hex")}`,
    },
  ],
};
const bytes = Buffer.from(`${JSON.stringify(complete, null, 2)}\n`);

const assessment = assessTransitionBundle(complete, { rootDir: root });
if (!assessment.bundle_coherent) {
  throw new TypeError(JSON.stringify(assessment.issues, null, 2));
}

if (check) {
  if (readFileSync(outputPath).compare(bytes) !== 0) {
    throw new TypeError("Round 4 complete core is stale; run its builder");
  }
} else {
  writeFileSync(outputPath, bytes);
}
