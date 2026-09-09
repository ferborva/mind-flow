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
import { computeEvidenceStateHash } from "../../../contracts/executable-if/validate.mjs";
import { computeExecutableIfEvolutionManifestHash } from
  "../../../contracts/evolution/project-executable-if.mjs";

const root = resolve(import.meta.dirname, "../../..");
const fixturePath = resolve(import.meta.dirname, "../fixtures/round-03.current.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const bundleSchema = JSON.parse(readFileSync(
  resolve(import.meta.dirname, "../schema/transition-bundle.schema.json"),
  "utf8",
));

const clone = (value) => structuredClone(value);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function executableIfRef(kernel) {
  const evidenceTip = kernel.evidence_events.at(-1);
  return {
    artifact_role: "executable-if-kernel",
    kernel_id: kernel.kernel_id,
    manifest_hash: kernel.manifest_hash,
    evaluator_ref: kernel.evaluator,
    active_condition_definition_refs: kernel.current_state
      .filter(({ lifecycle }) => lifecycle === "active")
      .map(({ condition_definition_ref: ref }) => ref),
    evidence_state_ref: {
      kernel_id: kernel.kernel_id,
      kernel_manifest_hash: kernel.manifest_hash,
      evidence_event_count: kernel.evidence_events.length,
      evidence_tip_event_id: evidenceTip.evidence_event_id,
      evidence_tip_event_hash: evidenceTip.evidence_event_hash,
      evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
    },
  };
}

function round4Attempt() {
  const attempted = clone(fixture);
  const kernelPath = "contracts/executable-if/fixtures/kernel.synthetic.json";
  const kernelBytes = readFileSync(resolve(root, kernelPath));
  const kernel = JSON.parse(kernelBytes.toString("utf8"));
  const evolutionPath = "contracts/evolution/fixtures/round-04.worker-option.synthetic.json";
  const evolutionBytes = readFileSync(resolve(root, evolutionPath));
  const signalsPath = "signals/fixtures/round-04.worker-option.synthetic.json";
  const signalsBytes = readFileSync(resolve(root, signalsPath));
  attempted.schema_version = "1.2.0";
  attempted.bundle_id = "bundle.round-04.kernel-bound-incoherent";
  attempted.bundle_stage = "pre-projection-core";
  attempted.canonical.condition_ids = ["condition.worker-option.nsw"];
  attempted.canonical.executable_if_ref = executableIfRef(kernel);
  attempted.artifacts = attempted.artifacts
    .filter(({ role }) => ![
      "dashboard-snapshot",
      "evolution-ledger",
      "signal-registry",
    ].includes(role));
  attempted.artifacts.push({
    role: "evolution-ledger",
    path: evolutionPath,
    sha256: sha256(evolutionBytes),
  }, {
    role: "executable-if-kernel",
    path: kernelPath,
    sha256: sha256(kernelBytes),
  }, {
    role: "signal-registry",
    path: signalsPath,
    sha256: sha256(signalsBytes),
  });
  return { attempted, kernel };
}

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

test("schema 1.2 adds the executable IF boundary without rewriting Round 3", () => {
  assert.ok(bundleSchema.properties.canonical.properties.executable_if_ref);
  assert.ok(bundleSchema.$defs.executableIfRef);
  assert.ok(bundleSchema.$defs.executableIfRef.required.includes("evidence_state_ref"));
  assert.ok(bundleSchema.$defs.evaluatorRef.required.includes("schema_digest"));
  assert.ok(bundleSchema.properties.artifacts.items.properties.role.enum.includes(
    "executable-if-kernel",
  ));

  const legacy = assessTransitionBundle(fixture, { rootDir: root });
  assert.equal(legacy.machine_valid, true);

  const missingKernel = clone(fixture);
  missingKernel.schema_version = "1.2.0";
  const result = assessTransitionBundle(missingKernel, { rootDir: root });
  assert.equal(result.machine_valid, false);
  assert.ok(result.issues.some(({ code }) => code === "BUNDLE_SCHEMA_INVALID"));
});

test("hostile: the canonical evaluator reference cannot omit its schema digest", () => {
  const { attempted } = round4Attempt();
  delete attempted.canonical.executable_if_ref.evaluator_ref.schema_digest;
  const result = assessTransitionBundle(attempted, { rootDir: root });
  assert.ok(result.issues.some(({ code }) => code === "BUNDLE_SCHEMA_INVALID"));
});

test("a Round 4 pre-projection core validates the kernel but rejects unrelated identities", () => {
  const { attempted } = round4Attempt();

  const result = assessTransitionBundle(attempted, { rootDir: root });
  assert.equal(result.machine_valid, true);
  assert.equal(result.components_valid, true);
  assert.equal(result.bundle_coherent, false);
  assert.equal(result.executable_if.valid, true);
  assert.equal(result.component_results["evolution-ledger"].source_binding_verified, true);
  assert.deepEqual(result.condition_identity.by_role["evolution-ledger"], [
    "condition.worker-option.nsw",
  ]);
  assert.equal(result.issues.some(({ code }) => code === "ACTIVE_DEFINITION_REF_MISMATCH"), false);
  assert.equal(result.issues.some(({ code }) => code === "DEFINITION_HISTORY_MISMATCH"), false);
  assert.equal(result.issues.some(({ code }) => code === "EXECUTABLE_SIGNAL_REF_MISMATCH"), false);
  assert.ok(result.issues.some(
    ({ code, artifact_role: role }) =>
      code === "CONDITION_SET_MISMATCH" && role === "agency-map",
  ));
  assert.equal(result.gates.truth, false);
  assert.equal(result.gates.authority, false);
});

test("Round 4 agency source bindings resolve through retained core artifacts", () => {
  const { attempted } = round4Attempt();
  const agencyPath = "contracts/agency-map/fixtures/round-04.worker-option.synthetic.json";
  const agencyBytes = readFileSync(resolve(root, agencyPath));
  const agencyRef = attempted.artifacts.find(({ role }) => role === "agency-map");
  agencyRef.path = agencyPath;
  agencyRef.sha256 = sha256(agencyBytes);

  const result = assessTransitionBundle(attempted, { rootDir: root });
  assert.equal(result.components_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.component_results["agency-map"].source_bindings_verified, true);
  assert.equal(result.condition_identity.by_role["agency-map"][0], "condition.worker-option.nsw");
});

test("Round 4 path resolves five-state receipts, scope and metrics through the core", () => {
  const { attempted } = round4Attempt();
  for (const [role, path] of [
    ["agency-map", "contracts/agency-map/fixtures/round-04.worker-option.synthetic.json"],
    ["possible-path", "paths/fixtures/round-04.worker-option.synthetic.json"],
  ]) {
    const bytes = readFileSync(resolve(root, path));
    const reference = attempted.artifacts.find(({ role: candidate }) => candidate === role);
    reference.path = path;
    reference.sha256 = sha256(bytes);
  }

  const result = assessTransitionBundle(attempted, { rootDir: root });
  assert.equal(result.components_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.component_results["possible-path"].source_bindings_verified, true);
});

test("hostile: a registered signal cannot borrow an executable definition hash", () => {
  const { attempted } = round4Attempt();
  const signalRef = attempted.artifacts.find(({ role }) => role === "signal-registry");
  const registry = JSON.parse(readFileSync(resolve(root, signalRef.path), "utf8"));
  registry.signals[0].executable_binding.signal_definition_ref.signal_definition_hash =
    `sha256:${"0".repeat(64)}`;
  const hostilePath = resolve(root,
    "integration/transition-bundle/fixtures/signal-definition-drift.test.json");
  const bytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(hostilePath, bytes);
  try {
    signalRef.path = "integration/transition-bundle/fixtures/signal-definition-drift.test.json";
    signalRef.sha256 = sha256(bytes);
    const result = assessTransitionBundle(attempted, { rootDir: root });
    assert.equal(result.components_valid, true);
    assert.equal(result.machine_valid, false);
    assert.ok(result.issues.some(({ code }) => code === "EXECUTABLE_SIGNAL_REF_MISMATCH"));
    assert.equal(result.gates.evidence, false);
  } finally {
    unlinkSync(hostilePath);
  }
});

test("hostile: the canonical executable IF reference cannot drift from kernel bytes", () => {
  const attempted = clone(fixture);
  const kernelPath = "contracts/executable-if/fixtures/kernel.synthetic.json";
  const kernelBytes = readFileSync(resolve(root, kernelPath));
  const kernel = JSON.parse(kernelBytes.toString("utf8"));
  attempted.schema_version = "1.2.0";
  attempted.bundle_id = "bundle.round-04.kernel-ref-drift";
  attempted.bundle_stage = "pre-projection-core";
  attempted.artifacts = attempted.artifacts.filter(({ role }) => role !== "dashboard-snapshot");
  attempted.artifacts.push({ role: "executable-if-kernel", path: kernelPath, sha256: sha256(kernelBytes) });
  attempted.canonical.executable_if_ref = {
    ...executableIfRef(kernel),
    manifest_hash: `sha256:${"0".repeat(64)}`,
  };
  const result = assessTransitionBundle(attempted, { rootDir: root });
  assert.equal(result.machine_valid, false);
  assert.equal(result.executable_if.valid, false);
  assert.ok(result.issues.some(({ code }) => code === "EXECUTABLE_IF_REF_MISMATCH"));
});

test("hostile: a resealed evolution overlay cannot omit or rewrite kernel history", () => {
  const { attempted } = round4Attempt();
  const evolutionRef = attempted.artifacts.find(({ role }) => role === "evolution-ledger");
  const evolution = JSON.parse(readFileSync(resolve(root, evolutionRef.path), "utf8"));
  evolution.source_history_ref.operations[2] = "narrowed";

  const hostilePath = resolve(root,
    "integration/transition-bundle/fixtures/evolution-history-drift.test.json");
  evolution.manifest_hash = computeExecutableIfEvolutionManifestHash(evolution);
  const bytes = Buffer.from(`${JSON.stringify(evolution, null, 2)}\n`);
  writeFileSync(hostilePath, bytes);
  try {
    evolutionRef.path = "integration/transition-bundle/fixtures/evolution-history-drift.test.json";
    evolutionRef.sha256 = sha256(bytes);
    const result = assessTransitionBundle(attempted, { rootDir: root });
    assert.equal(result.machine_valid, false);
    assert.equal(result.components_valid, false);
    assert.ok(result.issues.some(({ code }) => code === "DEFINITION_HISTORY_MISMATCH"));
    assert.equal(result.gates.history, false);
    assert.equal(result.action_authorised, false);
  } finally {
    unlinkSync(hostilePath);
  }
});

test("README documents the core bundle and experiment-envelope boundary", () => {
  const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
  assert.match(readme, /seven.*core/is);
  assert.match(readme, /eight-artifact\s+complete\s+core/i);
  assert.match(readme, /round-04\.worker-option\.complete\.json/);
  assert.match(readme, /outcome_logic_ref/);
  assert.match(readme, /scope_manifest_ref/);
  assert.match(readme, /native scope hash/i);
  assert.match(readme, /experiment envelope/i);
  assert.match(readme, /does not.*truth/is);
  assert.doesNotMatch(readme, /next migration gate is a dashboard/i);
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
