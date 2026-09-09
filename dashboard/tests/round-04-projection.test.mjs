import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { validateExecutableIfView } from "../tools/validate-executable-if-view.mjs";

const root = resolve(import.meta.dirname, "../..");
const fixturePath = "dashboard/fixtures/round-04.worker-option.executable-if-view.synthetic.json";

function source(path) {
  const bytes = readFileSync(resolve(root, path));
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function fixture() {
  return JSON.parse(readFileSync(resolve(root, fixturePath), "utf8"));
}

function sources() {
  return {
    sourceKernel: source("contracts/executable-if/fixtures/kernel.synthetic.json"),
    projectionSources: {
      "transition-bundle": source("integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json"),
      "possible-path": source("paths/fixtures/round-04.worker-option.synthetic.json"),
      "preparation-register": source("preparation/fixtures/valid/round-04.worker-option.synthetic.json"),
      forecast: source("forecasts/fixtures/round-04.worker-option.synthetic.json"),
    },
  };
}

test("the Round 4 view is an exact projection of the frozen pre-projection core", () => {
  const result = validateExecutableIfView(fixture(), sources());

  assert.equal(result.schema_conformant, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.source_verified, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.projection_sources_verified, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.semantic_valid, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.displayed_if_states, { "condition.worker-option.nsw": "true" });
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.action_authorised, false);
  assert.equal(result.publication_approved, false);
});

test("no projection source can be resealed or substituted", () => {
  for (const role of ["transition-bundle", "possible-path", "preparation-register", "forecast"]) {
    const view = fixture();
    view.projection_sources[role].sha256 = `sha256:${"0".repeat(64)}`;
    const result = validateExecutableIfView(view, sources());
    assert.equal(result.semantic_valid, false, `${role} substitution must fail`);
    assert.equal(
      result.errors.some(({ code }) => code === "PROJECTION_SOURCE_MISMATCH"),
      true,
      JSON.stringify(result.errors, null, 2),
    );
  }
});

test("the displayed forecast stays distinct from present IF state and matches its exact source", () => {
  const view = fixture();
  assert.equal(view.condition_views[0].display.state, "true");
  assert.equal(view.condition_views[0].forecast_context[0].probability, 0.62);

  view.condition_views[0].forecast_context[0].probability = 0.63;
  const result = validateExecutableIfView(view, sources());
  assert.equal(result.semantic_valid, false);
  assert.equal(
    result.errors.some(({ code }) => code === "FORECAST_PROJECTION_MISMATCH"),
    true,
  );
});

test("the deterministic projection builder leaves retained bytes unchanged", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["dashboard/tools/build-round-04-executable-if-view.mjs", "--check"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
