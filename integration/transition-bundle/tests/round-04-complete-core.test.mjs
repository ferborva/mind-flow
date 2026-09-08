import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../assess.mjs";

const root = resolve(import.meta.dirname, "../../..");
const prePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";
const finalPath = "integration/transition-bundle/fixtures/round-04.worker-option.complete.json";

function read(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

test("the complete Round 4 core adds exactly one dashboard projection", () => {
  const before = read(prePath);
  const after = read(finalPath);
  const dashboard = after.artifacts.find(({ role }) => role === "dashboard-snapshot");

  assert.equal(after.bundle_stage, "complete-core");
  assert.equal(after.artifacts.length, before.artifacts.length + 1);
  assert.ok(dashboard);
  assert.deepEqual(
    after.artifacts.filter(({ role }) => role !== "dashboard-snapshot"),
    before.artifacts,
  );
  for (const field of [
    "schema_version",
    "classification",
    "as_of",
    "evaluation_clock",
    "authority_effect",
    "publication_approved",
    "action_authorised",
    "canonical",
    "scope_bindings",
  ]) {
    assert.deepEqual(after[field], before[field], `${field} drifted during projection`);
  }
});

test("the complete Round 4 core is coherent but cannot confer truth or authority", () => {
  const result = assessTransitionBundle(read(finalPath), { rootDir: root });

  assert.equal(result.machine_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.components_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.bundle_coherent, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.component_results["dashboard-snapshot"].projection_sources_verified, true);
  assert.deepEqual(result.condition_identity.shared_by_all, ["condition.worker-option.nsw"]);
  for (const gate of ["integrity", "scope", "history", "evidence", "forecast", "preparation"]) {
    assert.equal(result.gates[gate], true, `${gate} gate did not open`);
  }
  for (const gate of ["truth", "freshness", "authority", "publication"]) {
    assert.equal(result.gates[gate], false, `${gate} gate must remain closed`);
  }
  assert.equal(result.action_authorised, false);
  assert.equal(result.publication_approved, false);
});

test("the complete-core builder reproduces both projection and manifest", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["integration/transition-bundle/tools/build-round-04-complete-core.mjs", "--check"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
