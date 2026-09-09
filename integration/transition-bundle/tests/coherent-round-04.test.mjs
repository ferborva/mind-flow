import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../assess.mjs";

const root = resolve(import.meta.dirname, "../../..");
const fixturePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";

function fixture() {
  return JSON.parse(readFileSync(resolve(root, fixturePath), "utf8"));
}

test("one Round 4 core is coherent across all seven non-dashboard artifacts", () => {
  const result = assessTransitionBundle(fixture(), { rootDir: root });

  assert.equal(result.machine_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.components_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.bundle_coherent, true, JSON.stringify(result.issues, null, 2));
  assert.deepEqual(result.condition_identity.shared_by_all, ["condition.worker-option.nsw"]);
  assert.equal(result.executable_if.valid, true);
  assert.equal(result.executable_signals.valid, true);
  assert.equal(result.scope_binding.valid, true);
  assert.equal(result.scope_binding.mapping_truth_assessed, false);
  assert.equal(result.component_results["agency-map"].source_bindings_verified, true);
  assert.equal(result.component_results["possible-path"].source_bindings_verified, true);
  assert.equal(result.component_results["preparation-register"].external_bindings_verified, true);
  assert.equal(result.component_results.forecast.external_bindings_verified, true);
  for (const gate of ["integrity", "scope", "history", "evidence", "forecast", "preparation"]) {
    assert.equal(result.gates[gate], true, `${gate} gate did not open`);
  }
  for (const gate of ["truth", "freshness", "authority", "publication"]) {
    assert.equal(result.gates[gate], false, `${gate} gate must remain closed`);
  }
  assert.equal(result.action_authorised, false);
  assert.equal(result.publication_approved, false);
});

test("the coherent fixture is a pre-projection core and cannot contain a dashboard", () => {
  const document = fixture();
  assert.equal(document.bundle_stage, "pre-projection-core");
  assert.equal(document.artifacts.length, 7);
  assert.equal(document.artifacts.some(({ role }) => role === "dashboard-snapshot"), false);
});
