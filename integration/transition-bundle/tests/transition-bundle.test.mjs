import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../assess.mjs";

const root = resolve(import.meta.dirname, "../../..");
const fixturePath = resolve(import.meta.dirname, "../fixtures/round-03.current.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

const clone = (value) => structuredClone(value);

test("individually valid Round 03 components cannot masquerade as one coherent transition", () => {
  const assessment = assessTransitionBundle(fixture, { rootDir: root });

  assert.equal(assessment.machine_valid, true);
  assert.equal(assessment.components_valid, true);
  assert.equal(assessment.bundle_coherent, false);
  assert.equal(assessment.action_authorised, false);
  assert.equal(assessment.publication_approved, false);
  assert.deepEqual(Object.values(assessment.gates), Object.values(assessment.gates).map(() => false));

  const codes = new Set(assessment.issues.map(({ code }) => code));
  assert.ok(codes.has("CONDITION_SET_MISMATCH"));
  assert.ok(codes.has("SCOPE_HASH_MISMATCH"));
  assert.ok(codes.has("PREPARATION_CONDITION_ID_MISSING"));
  assert.ok(codes.has("FORECAST_TARGET_UNBOUND"));
  assert.ok(codes.has("DASHBOARD_PATHS_UNRESOLVED"));
  assert.ok(codes.has("EVALUATION_TIME_UNTRUSTED"));
});

test("the bundle owns fixed validators and ignores caller claims of validity", () => {
  const claimed = clone(fixture);
  claimed.verified = true;
  claimed.ready = true;
  claimed.authority_verified = true;

  const assessment = assessTransitionBundle(claimed, { rootDir: root });
  assert.equal(assessment.machine_valid, false);
  assert.equal(assessment.action_authorised, false);
  assert.ok(assessment.issues.some(({ code }) => code === "BUNDLE_SCHEMA_INVALID"));
});

test("artifact bytes are content-addressed and drift fails before coherence is considered", () => {
  const changed = clone(fixture);
  changed.artifacts[0].sha256 = `sha256:${"0".repeat(64)}`;

  const assessment = assessTransitionBundle(changed, { rootDir: root });
  assert.equal(assessment.machine_valid, false);
  assert.equal(assessment.components_valid, false);
  assert.ok(assessment.issues.some(({ code }) => code === "ARTIFACT_HASH_MISMATCH"));
});

test("artifact paths cannot escape the repository through traversal or symlinks", () => {
  const traversing = clone(fixture);
  traversing.artifacts[0].path = "../outside.json";
  assert.ok(assessTransitionBundle(traversing, { rootDir: root }).issues
    .some(({ code }) => code === "ARTIFACT_PATH_INVALID"));

  const temporary = mkdtempSync(join(tmpdir(), "mind-flow-transition-bundle-"));
  const outside = join(temporary, "outside.json");
  const linked = resolve(root, "integration/transition-bundle/fixtures/escaped-for-test.json");
  writeFileSync(outside, "{}\n");
  symlinkSync(outside, linked);
  try {
    const symlinked = clone(fixture);
    symlinked.artifacts[0].path = "integration/transition-bundle/fixtures/escaped-for-test.json";
    assert.ok(assessTransitionBundle(symlinked, { rootDir: root }).issues
      .some(({ code }) => code === "ARTIFACT_PATH_INVALID"));
  } finally {
    unlinkSync(linked);
  }
});

test("condition identity must resolve through the evolution root before downstream use", () => {
  const assessment = assessTransitionBundle(fixture, { rootDir: root });
  const identities = assessment.condition_identity;

  assert.deepEqual(identities.canonical, fixture.canonical.condition_ids);
  assert.deepEqual(identities.shared_by_all, []);
  assert.equal(assessment.gates.history, false);
  assert.equal(assessment.gates.preparation, false);
});
