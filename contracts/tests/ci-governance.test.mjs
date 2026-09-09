import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertReproductionCannotBeWeakened } from "./support/workflow-assertions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const workflow = readFileSync(resolve(root, ".github", "workflows", "integrity.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const rootReadme = readFileSync(resolve(root, "README.md"), "utf8");
const reviewsReadme = readFileSync(resolve(root, "reviews", "README.md"), "utf8");
const nodeVersion = readFileSync(resolve(root, ".nvmrc"), "utf8").trim();
const operatingManual = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
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
  assert.match(
    workflow,
    /node meta\/review-freeze\/review-freeze\.mjs verify[\s\S]*--policy=round-06[\s\S]*round-06\.review-freeze\.json/,
    "CI must verify the retained Round 06 receipt",
  );
  assert.match(
    workflow,
    /node meta\/review-freeze\/review-freeze\.mjs verify[\s\S]*--policy=round-07[\s\S]*round-07\.review-freeze\.json/,
    "CI must verify the retained Round 07 receipt",
  );
  assertReproductionCannotBeWeakened(workflow);
  assert.doesNotMatch(workflow, /git diff --exit-code/);
  assert.doesNotMatch(workflow, /uses:\s*[^\s]+@v\d+\b/, "CI actions must not use moving major tags");
  for (const action of ["actions/checkout", "actions/setup-node"]) {
    assert.match(
      workflow,
      new RegExp(`uses:\\s*${action.replace("/", "\\/")}@[a-f0-9]{40}\\b`),
      `${action} must be pinned to an immutable commit SHA`,
    );
  }
});

test("workflow validation rejects omitted untracked files and failed-reproduction overrides", () => {
  assert.doesNotThrow(() => assertReproductionCannotBeWeakened(workflow));
  assert.throws(() => assertReproductionCannotBeWeakened(
    workflow.replace(" --untracked-files=all", "")));
  assert.throws(() => assertReproductionCannotBeWeakened(
    workflow.replace("--policy=round-07", "--policy=round-07 --allow-failed-reproduction")));
});

test("generated HTML and Observatory data are build artifacts rather than tracked source", () => {
  const tracked = execFileSync("git", ["ls-files", "--", "dashboard/web/index.html",
    "pilots/australia/web/index.html", "dashboard/observatory/data.js",
    "experiments/observatory-comparison/rendered/*.html"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(tracked, "");
  assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /lfs:\s*true/);
});

test("local and CI runtime contracts pin the same Node major", () => {
  assert.equal(nodeVersion, "22");
  assert.equal(packageJson.engines.node, "22.x");
  assert.match(workflow, new RegExp(`node-version:\\s*${nodeVersion}`));
});

test("agent-authored commits must disclose a distinct authorship identity", () => {
  assert.match(operatingManual, /agent-authored commits/i);
  assert.match(operatingManual, /distinct author identity/i);
  assert.match(operatingManual, /agent:\s*ren/i);
});

test("the one-change cadence is scoped to scheduled editorial runs", () => {
  assert.match(operatingManual, /scheduled editorial runs/i);
  assert.match(operatingManual, /programme engineering and\s+review work/i);
  assert.match(operatingManual, /small,\s+reviewable commits/i);
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

test("repository and review maps expose the complete review surface", () => {
  for (const directory of [
    "research/",
    "integration/",
    "options/",
    "paths/",
    "preparation/",
    "experiments/",
    "signals/",
    "reviews/",
  ]) assert.equal(rootReadme.includes(`\`${directory}\``), true, `${directory} is absent`);

  for (const round of ["02", "03", "04", "05", "06", "07"]) {
    assert.match(reviewsReadme, new RegExp(`\\| ${round} \\|`));
  }
  assert.match(reviewsReadme, /Round 05 was an internal integration checkpoint/i);
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
