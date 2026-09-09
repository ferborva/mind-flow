#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { traceConditionChangeImpact } from "../condition-change-impact.mjs";

const defaultBundlePath =
  "integration/transition-bundle/fixtures/round-04.worker-option.complete.json";
const defaultConditionId = "condition.worker-option.nsw";
const [bundlePath = defaultBundlePath, conditionId = defaultConditionId] = process.argv.slice(2);
const rootDir = process.cwd();

function closedJsonPath(path) {
  return typeof path === "string" && !isAbsolute(path) &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/.test(path) &&
    !path.split("/").some((part) => part === "." || part === ".." || part === "");
}

try {
  if (!closedJsonPath(bundlePath)) {
    throw new TypeError("bundle path must be a closed repository-relative JSON path");
  }
  const bundleBytes = readFileSync(resolve(rootDir, bundlePath));
  const bundle = JSON.parse(bundleBytes.toString("utf8"));
  const impact = traceConditionChangeImpact(bundle, {
    rootDir,
    bundlePath,
    bundleBytes,
    conditionId,
  });
  process.stdout.write(`${JSON.stringify(impact, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Condition change impact trace failed: ${error.message}\n`);
  process.exitCode = 1;
}
