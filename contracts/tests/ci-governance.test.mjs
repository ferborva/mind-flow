import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const workflow = readFileSync(resolve(root, ".github", "workflows", "integrity.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const snapshotIndex = JSON.parse(readFileSync(
  resolve(root, "dashboard", "snapshots", "index.json"),
  "utf8",
));

test("CI reproduces tests, generated artifacts and frozen-ref checks", () => {
  assert.match(workflow, /^name:\s*Integrity/m);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /node dashboard\/tools\/migrate-timing-contract\.mjs/);
  assert.match(workflow, /node dashboard\/tools\/build\.mjs/);
  assert.match(
    workflow,
    new RegExp(`dashboard/snapshots/${snapshotIndex.latest}\\.json`),
    "CI must rebuild the snapshot declared latest by the governed index",
  );
  assert.match(workflow, /node dashboard\/tools\/build-australia-pilot\.mjs/);
  assert.match(workflow, /git diff --exit-code/);
});

test("the complete test contract includes claim and assumption governance", () => {
  assert.match(packageJson.scripts.test, /npm run test:evidence/);
  assert.match(packageJson.scripts["test:evidence"], /evidence\/claims\/tests\/\*\.test\.mjs/);
  assert.match(packageJson.scripts["test:evidence"], /evidence\/assumptions\/tests\/\*\.test\.mjs/);
});

test("the complete test contract includes the public-instrument experiment", () => {
  assert.match(packageJson.scripts.test, /npm run test:experience/);
  assert.match(
    packageJson.scripts["test:experience"],
    /experiments\/observatory-comparison\/tests\/\*\.test\.mjs/,
  );
});

test("the complete test contract includes evolution, path, preparation and signal governance", () => {
  assert.match(packageJson.scripts.test, /npm run test:evolution/);
  assert.match(packageJson.scripts.test, /npm run test:paths/);
  assert.match(packageJson.scripts.test, /npm run test:preparation/);
  assert.match(packageJson.scripts.test, /npm run test:signals/);
  assert.match(
    packageJson.scripts["test:evolution"],
    /contracts\/evolution\/tests\/\*\.test\.mjs/,
  );
  assert.match(
    packageJson.scripts["test:paths"],
    /paths\/tests\/\*\.test\.mjs/,
  );
  assert.match(
    packageJson.scripts["test:preparation"],
    /preparation\/tests\/\*\.test\.mjs/,
  );
  assert.match(
    packageJson.scripts["test:signals"],
    /signals\/tests\/\*\.test\.mjs/,
  );
});

test("the complete test contract includes the condition agency map", () => {
  assert.match(packageJson.scripts.test, /npm run test:agency-map/);
  assert.match(
    packageJson.scripts["test:agency-map"],
    /contracts\/agency-map\/tests\/\*\.test\.mjs/,
  );
});

test("the complete test contract includes and reproduces the Round 4 Observatory", () => {
  assert.match(packageJson.scripts.test, /npm run test:dashboard/);
  assert.match(
    packageJson.scripts["test:dashboard"],
    /dashboard\/observatory\/tests\/\*\.test\.mjs/,
  );
  for (const command of [
    "node integration/transition-bundle/tools/build-round-04-core.mjs --check",
    "node dashboard/tools/build-round-04-executable-if-view.mjs --check",
    "node integration/transition-bundle/tools/build-round-04-complete-core.mjs --check",
    "node dashboard/observatory/build.mjs --check",
    "node experiments/observatory-comparison/fixtures/build-round-04-fixtures.mjs --check",
  ]) assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
