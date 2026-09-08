import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../assess.mjs";

const root = resolve(import.meta.dirname, "../../..");
const fixturePath = resolve(import.meta.dirname, "../fixtures/round-03.current.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const bundleSchema = JSON.parse(readFileSync(
  resolve(import.meta.dirname, "../schema/transition-bundle.schema.json"),
  "utf8",
));

const clone = (value) => structuredClone(value);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

test("canonical references preserve immutable definitions and native scope domains", () => {
  assert.ok(bundleSchema.required.includes("bundle_stage"));
  assert.deepEqual(
    bundleSchema.properties.bundle_stage.enum,
    ["pre-projection-core", "complete-core"],
  );
  assert.ok(bundleSchema.properties.canonical.required.includes("outcome_logic_ref"));
  assert.ok(bundleSchema.properties.canonical.required.includes("scope_manifest_ref"));
  assert.ok(bundleSchema.required.includes("scope_bindings"));
  assert.deepEqual(
    bundleSchema.$defs.scopeBinding.required,
    [
      "role",
      "canonical_scope_manifest_ref",
      "native_scope_hash",
      "mapping_ref",
    ],
  );
});

test("README documents the core bundle and experiment-envelope boundary", () => {
  const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
  assert.match(readme, /seven.*core/is);
  assert.match(readme, /outcome_logic_ref/);
  assert.match(readme, /scope_manifest_ref/);
  assert.match(readme, /native scope hash/i);
  assert.match(readme, /experiment envelope/i);
  assert.match(readme, /does not.*truth/is);
});

test("hostile: canonical outcome-logic reference drift fails closed", () => {
  const drifted = clone(fixture);
  drifted.canonical.outcome_logic_ref.sha256 = `sha256:${"0".repeat(64)}`;

  const assessment = assessTransitionBundle(drifted, { rootDir: root });
  assert.equal(assessment.machine_valid, false);
  assert.equal(assessment.outcome_logic.valid, false);
  assert.ok(assessment.issues.some(
    ({ code }) => code === "OUTCOME_LOGIC_REF_MISMATCH",
  ));
  assert.equal(assessment.gates.truth, false);
  assert.equal(assessment.gates.authority, false);
  assert.equal(assessment.action_authorised, false);
  assert.equal(assessment.publication_approved, false);
});

test("native scope hashes stay distinct while mapping-reference drift fails closed", () => {
  const [agencyBinding, pathBinding] = fixture.scope_bindings;
  assert.notEqual(agencyBinding.native_scope_hash, pathBinding.native_scope_hash);

  const intact = assessTransitionBundle(fixture, { rootDir: root });
  assert.equal(intact.scope_binding.valid, true);
  assert.deepEqual(
    Object.keys(intact.scope_binding.by_role).sort(),
    ["agency-map", "possible-path"],
  );
  assert.equal(intact.issues.some(({ code }) => code === "SCOPE_HASH_MISMATCH"), false);

  for (const mutate of [
    (bundle) => {
      bundle.scope_bindings[0].native_scope_hash = `sha256:${"0".repeat(64)}`;
    },
    (bundle) => {
      bundle.scope_bindings[1].mapping_ref.sha256 = `sha256:${"0".repeat(64)}`;
    },
  ]) {
    const drifted = clone(fixture);
    mutate(drifted);
    const assessment = assessTransitionBundle(drifted, { rootDir: root });
    assert.equal(assessment.machine_valid, false);
    assert.equal(assessment.scope_binding.valid, false);
    assert.ok(assessment.issues.some(({ code }) => code.startsWith("SCOPE_")));
    assert.equal(assessment.gates.truth, false);
    assert.equal(assessment.gates.authority, false);
    assert.equal(assessment.action_authorised, false);
    assert.equal(assessment.publication_approved, false);
  }
});

test("hostile: resealing a changed scope manifest cannot hide mapping drift", () => {
  const drifted = clone(fixture);
  const originalManifest = JSON.parse(readFileSync(
    resolve(root, fixture.canonical.scope_manifest_ref.path),
    "utf8",
  ));
  originalManifest.mappings[1].rationale =
    "A changed assertion that has not been rebound at the mapping boundary.";

  const hostilePath = resolve(
    root,
    "integration/transition-bundle/fixtures/scope-manifest-drift.test.json",
  );
  const hostileBytes = Buffer.from(`${JSON.stringify(originalManifest, null, 2)}\n`);
  writeFileSync(hostilePath, hostileBytes);
  try {
    const manifestRef = {
      ...drifted.canonical.scope_manifest_ref,
      path: "integration/transition-bundle/fixtures/scope-manifest-drift.test.json",
      sha256: sha256(hostileBytes),
    };
    drifted.canonical.scope_manifest_ref = manifestRef;
    for (const binding of drifted.scope_bindings) {
      binding.canonical_scope_manifest_ref = clone(manifestRef);
    }

    const assessment = assessTransitionBundle(drifted, { rootDir: root });
    assert.equal(assessment.machine_valid, false);
    assert.equal(assessment.scope_binding.valid, false);
    assert.ok(assessment.issues.some(
      ({ code, artifact_role: role }) =>
        code === "SCOPE_MAPPING_REF_MISMATCH" && role === "possible-path",
    ));
    assert.equal(assessment.gates.truth, false);
    assert.equal(assessment.gates.authority, false);
    assert.equal(assessment.action_authorised, false);
    assert.equal(assessment.publication_approved, false);
  } finally {
    unlinkSync(hostilePath);
  }
});

test("hostile: a final dashboard cannot derive from its containing core identity", () => {
  const attempted = clone(fixture);
  const sourceBytes = readFileSync(fixturePath);
  const dashboard = JSON.parse(readFileSync(
    resolve(root, "dashboard/snapshots/2026-09-08.r3.json"),
    "utf8",
  ));
  const pathArtifact = attempted.artifacts.find(({ role }) => role === "possible-path");
  const possiblePath = JSON.parse(readFileSync(resolve(root, pathArtifact.path), "utf8"));
  dashboard.source_transition_bundle = {
    binding_state: "bound",
    bundle_id: attempted.bundle_id,
    schema_version: attempted.schema_version,
    path: "integration/transition-bundle/fixtures/round-03.current.json",
    sha256: sha256(sourceBytes),
  };
  dashboard.possible_path_refs = [{
    id: possiblePath.path_id,
    version: possiblePath.schema_version,
    checksum: pathArtifact.sha256,
  }];

  const dashboardPath = resolve(
    root,
    "integration/transition-bundle/fixtures/self-referencing-dashboard.test.json",
  );
  const dashboardBytes = Buffer.from(`${JSON.stringify(dashboard, null, 2)}\n`);
  writeFileSync(dashboardPath, dashboardBytes);
  try {
    const dashboardArtifact = attempted.artifacts.find(
      ({ role }) => role === "dashboard-snapshot",
    );
    dashboardArtifact.path =
      "integration/transition-bundle/fixtures/self-referencing-dashboard.test.json";
    dashboardArtifact.sha256 = sha256(dashboardBytes);

    const assessment = assessTransitionBundle(attempted, { rootDir: root });
    assert.equal(assessment.machine_valid, false);
    assert.ok(assessment.issues.some(
      ({ code }) => code === "DASHBOARD_DERIVATION_CYCLE",
    ));
    assert.equal(assessment.action_authorised, false);
    assert.equal(assessment.publication_approved, false);
  } finally {
    unlinkSync(dashboardPath);
  }
});

test("a six-artifact pre-projection core is an acyclic dashboard source", () => {
  const source = clone(fixture);
  source.bundle_id = "bundle.round-03.pre-projection";
  source.bundle_stage = "pre-projection-core";
  source.artifacts = source.artifacts.filter(
    ({ role }) => role !== "dashboard-snapshot",
  );

  const assessment = assessTransitionBundle(source, { rootDir: root });
  assert.equal(assessment.machine_valid, true);
  assert.equal(assessment.components_valid, true);
  assert.equal(assessment.bundle_coherent, false);
  assert.equal(assessment.issues.some(
    ({ code, artifact_role: role }) =>
      code === "ARTIFACT_ROLE_CARDINALITY" && role === "dashboard-snapshot",
  ), false);
  assert.equal(assessment.gates.truth, false);
  assert.equal(assessment.gates.authority, false);
  assert.equal(assessment.action_authorised, false);
  assert.equal(assessment.publication_approved, false);
});

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
  assert.equal(codes.has("PREPARATION_CONDITION_ID_MISSING"), false);
  assert.equal(codes.has("FORECAST_TARGET_UNBOUND"), false);
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

test("artifact paths reject in-repository intermediate symlinks", () => {
  const realDirectory = resolve(
    root,
    "integration/transition-bundle/fixtures/real-directory-for-test",
  );
  const linkedDirectory = resolve(
    root,
    "integration/transition-bundle/fixtures/linked-directory-for-test",
  );
  mkdirSync(realDirectory);
  writeFileSync(resolve(realDirectory, "artifact.json"), "{}\n");
  symlinkSync(realDirectory, linkedDirectory);
  try {
    const symlinked = clone(fixture);
    symlinked.artifacts[0].path =
      "integration/transition-bundle/fixtures/linked-directory-for-test/artifact.json";
    symlinked.artifacts[0].sha256 = sha256(Buffer.from("{}\n"));
    const assessment = assessTransitionBundle(symlinked, { rootDir: root });
    assert.ok(assessment.issues.some(
      ({ code, message }) =>
        code === "ARTIFACT_PATH_INVALID" && /symbolic link/i.test(message),
    ));
  } finally {
    unlinkSync(linkedDirectory);
    rmSync(realDirectory, { recursive: true, force: true });
  }
});

test("artifact reads are capped before parsing or component validation", () => {
  const oversizedPath = resolve(
    root,
    "integration/transition-bundle/fixtures/oversized-for-test.json",
  );
  const oversizedBytes = Buffer.from(`{"padding":"${"x".repeat(5 * 1024 * 1024)}"}\n`);
  writeFileSync(oversizedPath, oversizedBytes);
  try {
    const oversized = clone(fixture);
    oversized.artifacts[0].path =
      "integration/transition-bundle/fixtures/oversized-for-test.json";
    oversized.artifacts[0].sha256 = sha256(oversizedBytes);
    const assessment = assessTransitionBundle(oversized, { rootDir: root });
    assert.ok(assessment.issues.some(
      ({ code, message }) =>
        code === "ARTIFACT_PATH_INVALID" && /size limit/i.test(message),
    ));
  } finally {
    unlinkSync(oversizedPath);
  }
});

test("condition identity must resolve through the evolution root before downstream use", () => {
  const assessment = assessTransitionBundle(fixture, { rootDir: root });
  const identities = assessment.condition_identity;

  assert.deepEqual(identities.canonical, fixture.canonical.condition_ids);
  assert.deepEqual(identities.shared_by_all, []);
  assert.ok(identities.by_role.forecast.length > 0);
  assert.ok(assessment.issues.some(
    ({ code, artifact_role: role }) => code === "CONDITION_SET_MISMATCH" && role === "forecast",
  ));
  assert.equal(assessment.gates.history, false);
  assert.equal(assessment.gates.preparation, false);
});

test("a caller cannot self-certify the evaluation clock", () => {
  const claimed = clone(fixture);
  claimed.evaluation_clock = {
    evaluated_at: claimed.evaluation_clock.evaluated_at,
    source: "verified-time-authority",
    trusted: true,
  };

  const assessment = assessTransitionBundle(claimed, { rootDir: root });
  assert.equal(assessment.machine_valid, false);
  assert.equal(assessment.gates.freshness, false);
  assert.ok(assessment.issues.some(({ code }) => code === "BUNDLE_SCHEMA_INVALID"));
  assert.equal(
    assessment.coherence_blockers.some(
      ({ code }) => code === "EVALUATION_TIME_UNTRUSTED",
    ),
    false,
  );
});
