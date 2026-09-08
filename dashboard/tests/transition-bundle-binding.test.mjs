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
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  computeOutcomeScopeHash,
  renderPublicClaimCeiling,
} from "../../paths/validate.mjs";
import { resolvePossiblePathProjection } from "../tools/transition-bundle-binding.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const repository = resolve(dashboard, "..");
const currentSnapshotPath = join(dashboard, "snapshots", "2026-09-08.r3.json");
const schemaPath = join(dashboard, "schema", "snapshot.schema.json");
const timingSchemaPath = join(dashboard, "schema", "source-timing.schema.json");
const basePath = JSON.parse(readFileSync(
  join(repository, "paths", "fixtures", "australian-clerical-transition.synthetic.json"),
  "utf8",
));
const baseBundle = JSON.parse(readFileSync(
  join(repository, "integration", "transition-bundle", "fixtures", "round-03.current.json"),
  "utf8",
));

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function seal(value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  return { bytes, sha256: digest(bytes) };
}

function fixedHash(seed) {
  return digest(Buffer.from(seed));
}

function alignPathToSnapshot(snapshot, { place = snapshot.if_path.claim.place } = {}) {
  const path = structuredClone(basePath);
  path.path_id = "path.synthetic.dashboard-world-transition";
  path.outcome_scope = {
    who: snapshot.if_path.claim.who,
    verb: snapshot.if_path.claim.verb,
    object: snapshot.if_path.claim.outcome,
    standard: snapshot.if_path.claim.standard,
    place,
    period: snapshot.if_path.claim.period,
    if_conditions: snapshot.if_path.conditions.map((condition) => ({
      condition_id: condition.id,
      public_condition: condition.question,
    })),
  };
  path.outcome_scope.scope_hash = computeOutcomeScopeHash(path.outcome_scope);

  path.condition_anchors = snapshot.if_path.conditions.map((condition, index) => ({
    condition_id: condition.id,
    ledger_ref: `https://example.invalid/mind-flow/dashboard/${condition.id}-ledger.json`,
    ledger_manifest_hash: fixedHash(`ledger-${index}`),
    condition_version: 1,
    as_of_sequence: 1,
    as_of_event_id: `event.${condition.id}.added`,
    as_of_event_hash: fixedHash(`event-${index}`),
    rendered_if: `IF ${condition.question}`,
    verification: "external-unverified-anchor",
  }));
  const bindings = path.condition_anchors.map((anchor) => ({
    condition_id: anchor.condition_id,
    ledger_ref: anchor.ledger_ref,
    ledger_manifest_hash: anchor.ledger_manifest_hash,
    condition_version: anchor.condition_version,
    as_of_sequence: anchor.as_of_sequence,
    as_of_event_id: anchor.as_of_event_id,
    as_of_event_hash: anchor.as_of_event_hash,
    outcome_scope_hash: path.outcome_scope.scope_hash,
  }));
  for (const edge of path.graph.edges) edge.condition_bindings = structuredClone(bindings);
  path.condition_evolution_policies = path.condition_anchors.map((anchor) => {
    const policy = structuredClone(basePath.condition_evolution_policies[0]);
    policy.condition_id = anchor.condition_id;
    policy.ledger_ref = anchor.ledger_ref;
    policy.ledger_manifest_hash = anchor.ledger_manifest_hash;
    policy.anchor_event_hash = anchor.as_of_event_hash;
    return policy;
  });
  path.signal_portfolio.condition_ids = snapshot.if_path.conditions.map(({ id }) => id);
  path.public_claim_ceiling = renderPublicClaimCeiling(path);
  return path;
}

function writeFixture({ mutatePath, mutateBundle, symlinkBundle = false, symlinkPath = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "mind-flow-dashboard-path-binding-"));
  mkdirSync(join(root, "bundles"), { recursive: true });
  mkdirSync(join(root, "paths"), { recursive: true });
  const snapshot = JSON.parse(readFileSync(currentSnapshotPath, "utf8"));
  const path = alignPathToSnapshot(snapshot);
  mutatePath?.(path, snapshot);
  const pathSealed = seal(path);
  const realPathFile = join(root, "outside-path.json");
  writeFileSync(realPathFile, pathSealed.bytes);
  const artifactPath = "paths/possible-path.json";
  if (symlinkPath) symlinkSync(realPathFile, join(root, artifactPath));
  else writeFileSync(join(root, artifactPath), pathSealed.bytes);

  const bundle = structuredClone(baseBundle);
  bundle.bundle_id = "bundle.synthetic.dashboard-path-projection";
  bundle.bundle_stage = "pre-projection-core";
  bundle.artifacts = bundle.artifacts.filter(
    ({ role }) => role !== "dashboard-snapshot",
  );
  const possiblePathArtifact = bundle.artifacts.find(({ role }) => role === "possible-path");
  possiblePathArtifact.path = artifactPath;
  possiblePathArtifact.sha256 = pathSealed.sha256;
  bundle.canonical.condition_ids = snapshot.if_path.conditions.map(({ id }) => id);
  bundle.scope_bindings.find(({ role }) => role === "possible-path").native_scope_hash =
    path.outcome_scope?.scope_hash || basePath.outcome_scope.scope_hash;
  mutateBundle?.(bundle, path);
  const bundleSealed = seal(bundle);
  const realBundleFile = join(root, "outside-bundle.json");
  writeFileSync(realBundleFile, bundleSealed.bytes);
  const bundlePath = "bundles/transition-bundle.json";
  if (symlinkBundle) symlinkSync(realBundleFile, join(root, bundlePath));
  else writeFileSync(join(root, bundlePath), bundleSealed.bytes);

  snapshot.source_transition_bundle = {
    binding_state: "bound",
    bundle_id: bundle.bundle_id,
    schema_version: bundle.schema_version,
    path: bundlePath,
    sha256: bundleSealed.sha256,
  };
  snapshot.possible_path_refs = [{
    id: path.path_id,
    version: path.schema_version,
    checksum: pathSealed.sha256,
  }];
  return { root, snapshot, path, bundle, artifactPath, bundlePath };
}

test("the active snapshot makes its empty path boundary explicitly unbound", () => {
  const snapshot = JSON.parse(readFileSync(currentSnapshotPath, "utf8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const timingSchema = JSON.parse(readFileSync(timingSchemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(timingSchema);
  const validate = ajv.compile(schema);

  assert.equal(validate(snapshot), true, ajv.errorsText(validate.errors));
  assert.equal(snapshot.source_transition_bundle.binding_state, "unbound_prototype");
  assert.deepEqual(snapshot.possible_path_refs, []);

  const missingBoundary = structuredClone(snapshot);
  delete missingBoundary.source_transition_bundle;
  assert.equal(validate(missingBoundary), false, "the transition-bundle boundary is required");

  const falsePath = structuredClone(snapshot);
  falsePath.possible_path_refs.push({
    id: "path.unresolved",
    version: "1.1",
    checksum: `sha256:${"0".repeat(64)}`,
  });
  assert.throws(
    () => resolvePossiblePathProjection(falsePath, { rootDir: repository }),
    /unbound.*cannot expose possible-path references/i,
  );
});

test("a typed and scope-matched path cannot launder an incoherent source core", () => {
  const fixture = writeFixture();
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /source transition bundle.*not coherent/i,
  );
});

test("a complete core cannot be used as its dashboard's source", () => {
  const fixture = writeFixture({
    mutateBundle(bundle) {
      bundle.bundle_stage = "complete-core";
      bundle.artifacts.push(
        structuredClone(baseBundle.artifacts.find(({ role }) => role === "dashboard-snapshot")),
      );
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /source transition bundle.*pre-projection-core/i,
  );
});

test("path byte drift is rejected before a narrative can be projected", () => {
  const fixture = writeFixture();
  writeFileSync(join(fixture.root, fixture.artifactPath), `${JSON.stringify(fixture.path)}\n `);
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /possible-path.*digest|hash mismatch/i,
  );
});

test("bundle byte drift and caller-side path identity drift are independently rejected", () => {
  const bundleDrift = writeFixture();
  writeFileSync(join(bundleDrift.root, bundleDrift.bundlePath), `${JSON.stringify(bundleDrift.bundle)}\n `);
  assert.throws(
    () => resolvePossiblePathProjection(bundleDrift.snapshot, { rootDir: bundleDrift.root }),
    /source transition bundle.*digest/i,
  );

  const identityDrift = writeFixture();
  identityDrift.snapshot.possible_path_refs[0].id = "path.synthetic.caller-substitute";
  assert.throws(
    () => resolvePossiblePathProjection(identityDrift.snapshot, { rootDir: identityDrift.root }),
    /possible-path reference mismatch.*id/i,
  );
});

test("a still-valid possible path cannot drift from the dashboard WHO VERB OBJECT STANDARD PLACE PERIOD IF scope", () => {
  const fixture = writeFixture({
    mutatePath(path, snapshot) {
      const drifted = alignPathToSnapshot(snapshot, { place: "A different decision geography" });
      Object.assign(path, drifted);
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /scope mismatch.*place/i,
  );
});

test("bundle-native scope and condition bindings cannot drift from the typed path", () => {
  const scopeDrift = writeFixture({
    mutateBundle(bundle) {
      bundle.scope_bindings.find(({ role }) => role === "possible-path").native_scope_hash =
        `sha256:${"0".repeat(64)}`;
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(scopeDrift.snapshot, { rootDir: scopeDrift.root }),
    /bundle possible-path scope binding.*native scope hash/i,
  );

  const conditionDrift = writeFixture({
    mutateBundle(bundle) {
      bundle.canonical.condition_ids = ["different.condition"];
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(conditionDrift.snapshot, { rootDir: conditionDrift.root }),
    /bundle possible-path condition binding/i,
  );
});

test("bundle and possible-path symlinks are rejected even when their target bytes match", () => {
  const bundleLink = writeFixture({ symlinkBundle: true });
  assert.throws(
    () => resolvePossiblePathProjection(bundleLink.snapshot, { rootDir: bundleLink.root }),
    /bundle.*symbolic link/i,
  );

  const pathLink = writeFixture({ symlinkPath: true });
  assert.throws(
    () => resolvePossiblePathProjection(pathLink.snapshot, { rootDir: pathLink.root }),
    /possible-path.*symbolic link/i,
  );
});

test("intermediate symlinks and oversized path artifacts are rejected", () => {
  const linked = writeFixture();
  const originalPath = join(linked.root, linked.artifactPath);
  const realDirectory = join(linked.root, "real-paths");
  const linkedDirectory = join(linked.root, "linked-paths");
  mkdirSync(realDirectory);
  const realPath = join(realDirectory, "possible-path.json");
  writeFileSync(realPath, readFileSync(originalPath));
  symlinkSync(realDirectory, linkedDirectory);
  linked.bundle.artifacts.find(({ role }) => role === "possible-path").path =
    "linked-paths/possible-path.json";
  const resealedBundle = seal(linked.bundle);
  writeFileSync(join(linked.root, linked.bundlePath), resealedBundle.bytes);
  linked.snapshot.source_transition_bundle.sha256 = resealedBundle.sha256;
  assert.throws(
    () => resolvePossiblePathProjection(linked.snapshot, { rootDir: linked.root }),
    /possible-path.*symbolic link/i,
  );
  unlinkSync(linkedDirectory);
  rmSync(realDirectory, { recursive: true, force: true });

  const oversized = writeFixture();
  const oversizedBytes = Buffer.from(`{"padding":"${"x".repeat(5 * 1024 * 1024)}"}\n`);
  writeFileSync(join(oversized.root, oversized.artifactPath), oversizedBytes);
  const artifact = oversized.bundle.artifacts.find(({ role }) => role === "possible-path");
  artifact.sha256 = digest(oversizedBytes);
  oversized.snapshot.possible_path_refs[0].checksum = artifact.sha256;
  const oversizedBundle = seal(oversized.bundle);
  writeFileSync(join(oversized.root, oversized.bundlePath), oversizedBundle.bytes);
  oversized.snapshot.source_transition_bundle.sha256 = oversizedBundle.sha256;
  assert.throws(
    () => resolvePossiblePathProjection(oversized.snapshot, { rootDir: oversized.root }),
    /possible-path.*size limit/i,
  );
});

test("repository traversal and future-dated bundle assessments cannot enter the projection", () => {
  const traversal = writeFixture();
  traversal.snapshot.source_transition_bundle.path = "../outside-bundle.json";
  assert.throws(
    () => resolvePossiblePathProjection(traversal.snapshot, { rootDir: traversal.root }),
    /closed repository-relative JSON path/i,
  );

  const futureBundle = writeFixture({
    mutateBundle(bundle) {
      bundle.as_of = "2026-09-10T00:00:00Z";
      bundle.evaluation_clock.evaluated_at = bundle.as_of;
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(futureBundle.snapshot, { rootDir: futureBundle.root }),
    /bundle chronology.*after the dashboard record/i,
  );
});

test("a source bundle without exactly one possible-path role is rejected", () => {
  const fixture = writeFixture({
    mutateBundle(bundle) {
      bundle.artifacts.find(({ role }) => role === "possible-path").role = "forecast";
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /exactly one possible-path role/i,
  );
});

test("a path missing one required signal role stays blocked", () => {
  const fixture = writeFixture({
    mutatePath(path) {
      path.signal_portfolio.roles = path.signal_portfolio.roles.filter(
        ({ role }) => role !== "information-harm",
      );
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /fixed possible-path validator rejected.*(?:SIGNAL_ROLE_COVERAGE_INVALID|SCHEMA_INVALID)|schema validation/i,
  );
});

test("an untyped narrative cannot enter through a content-addressed possible-path role", () => {
  const fixture = writeFixture({
    mutatePath(path) {
      for (const key of Object.keys(path)) delete path[key];
      Object.assign(path, {
        title: "Everything will work out",
        narrative: "Treat this story as a path without a typed graph or falsifier.",
      });
    },
  });
  assert.throws(
    () => resolvePossiblePathProjection(fixture.snapshot, { rootDir: fixture.root }),
    /fixed possible-path validator rejected|schema validation/i,
  );
});
