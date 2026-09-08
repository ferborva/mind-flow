import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../../assess.mjs";

const root = resolve(import.meta.dirname, "../../../..");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

test("one coherent synthetic transition crosses all seven core subsystem boundaries", () => {
  const fixturePath = resolve(
    root,
    "integration/transition-bundle/fixtures/coherent.synthetic.json",
  );
  assert.equal(
    existsSync(fixturePath),
    true,
    "migration must create one coherent synthetic bundle instead of weakening cross-checks",
  );

  const result = assessTransitionBundle(readJson(fixturePath), { rootDir: root });
  assert.equal(result.bundle_coherent, true);
  assert.equal(result.gates.integrity, true);
  assert.equal(result.gates.scope, true);
  assert.equal(result.gates.history, true);
  assert.equal(result.gates.forecast, true);
  assert.equal(result.gates.preparation, true);
  assert.equal(result.gates.truth, false);
  assert.equal(result.gates.authority, false);
  assert.equal(result.gates.publication, false);
  assert.equal(result.action_authorised, false);
  assert.equal(result.publication_approved, false);
});

test("bundle binds outcome logic while preserving native scope domains", () => {
  const schema = readJson(
    "integration/transition-bundle/schema/transition-bundle.schema.json",
  );
  const canonical = schema.properties.canonical;
  assert.ok(canonical.required.includes("outcome_logic_ref"));
  assert.ok(canonical.required.includes("scope_manifest_ref"));
  assert.ok(schema.required.includes("scope_bindings"));

  const binding = schema.$defs.scopeBinding;
  assert.ok(binding, "scope binding schema is missing");
  for (const field of [
    "role",
    "canonical_scope_manifest_ref",
    "native_scope_hash",
    "mapping_ref",
  ]) {
    assert.ok(binding.required.includes(field), `scope binding is missing ${field}`);
  }
});

test("the Round 4 bundle binds the executable IF kernel and active definitions", () => {
  const schema = readJson(
    "integration/transition-bundle/schema/transition-bundle.schema.json",
  );
  const reference = schema.$defs.executableIfRef;
  for (const field of [
    "artifact_role",
    "kernel_id",
    "manifest_hash",
    "evaluator_ref",
    "active_condition_definition_refs",
    "evidence_state_ref",
  ]) {
    assert.ok(reference.required.includes(field), `executable IF reference is missing ${field}`);
  }
});

test("preparation names the exact canonical condition and evolution state", () => {
  const schema = readJson("preparation/schema/preparation-register.schema.json");
  const binding = schema.$defs.conditionBinding;
  for (const field of [
    "condition_id",
    "condition_version",
    "ledger_manifest_hash",
    "producer_event_id",
    "producer_event_hash",
  ]) {
    assert.ok(binding.required.includes(field), `preparation binding is missing ${field}`);
  }
});

test("forecast target resolves a registered signal metric condition and scope", () => {
  const schema = readJson("forecasts/schema/binary-forecast.schema.json");
  const target = schema.$defs.target;
  for (const field of [
    "signal_id",
    "metric_id",
    "metric_checksum",
    "condition_id",
    "scope_hash",
  ]) {
    assert.ok(target.required.includes(field), `forecast target is missing ${field}`);
  }
});

test("dashboard resolves bundle-bound possible paths instead of rejecting them", () => {
  const build = readFileSync(resolve(root, "dashboard/tools/build.mjs"), "utf8");
  const unconditionallyRejectsPaths =
    /if \(\(snapshot\.possible_path_refs \|\| \[\]\)\.length\) \{\s*errors\.push\("possible-path references are not resolved by this snapshot build"\)/
      .test(build);
  assert.equal(
    unconditionallyRejectsPaths,
    false,
    "dashboard build still unconditionally rejects possible-path references",
  );

  const schema = readJson("dashboard/schema/snapshot.schema.json");
  assert.ok(schema.required.includes("source_transition_bundle"));
  assert.ok(schema.properties.source_transition_bundle);
});

test("experiment arms are governed by one executable fact-pack manifest", () => {
  const schemaPath = resolve(
    root,
    "experiments/observatory-comparison/schema/experiment-manifest.schema.json",
  );
  assert.equal(existsSync(schemaPath), true, "experiment manifest schema is missing");
  const schema = readJson(
    "experiments/observatory-comparison/schema/experiment-manifest.schema.json",
  );
  for (const field of ["source_transition_bundle", "fact_pack", "arms", "safety"]) {
    assert.ok(schema.required.includes(field), `experiment manifest is missing ${field}`);
  }
});
