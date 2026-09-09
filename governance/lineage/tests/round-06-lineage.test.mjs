import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  computeGovernancePayloadHash,
  computeGovernanceReceiptHash,
  computeGovernanceRecordHash,
} from "../../lib/record-contract.mjs";
import {
  FIXED_SOURCE_REFS,
  computeExternalGovernanceContextHash,
  computeGovernanceLineageHash,
  validateGovernanceLineage,
} from "../validate.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const lineagePath = "governance/lineage/fixtures/round-06.worker-transition.lineage.synthetic.json";
const liveAsOf = "2026-09-16T00:00:00Z";

function readJson(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function writeJson(root, path, value) {
  const destination = resolve(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
}

function rawSha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sourceClosure() {
  const paths = new Set(Object.values(FIXED_SOURCE_REFS).map(({ path }) => path));
  paths.add(lineagePath);
  const bundle = readJson(repositoryRoot, FIXED_SOURCE_REFS.round_04_bundle.path);
  paths.add(bundle.canonical.scope_manifest_ref.path);
  for (const artifact of bundle.artifacts) paths.add(artifact.path);
  const dashboardRef = bundle.artifacts.find(({ role }) => role === "dashboard-snapshot");
  const dashboard = readJson(repositoryRoot, dashboardRef.path);
  for (const reference of Object.values(dashboard.projection_sources || {})) {
    paths.add(reference.path);
  }
  return [...paths];
}

function withSourceSandbox(run) {
  const root = mkdtempSync(join(tmpdir(), "mind-flow-round-06-lineage-"));
  try {
    for (const path of sourceClosure()) {
      const destination = resolve(root, path);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(resolve(repositoryRoot, path), destination);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fixture(root = repositoryRoot) {
  return readJson(root, lineagePath);
}

function resealGovernance(record) {
  record.payload_hash = computeGovernancePayloadHash(record.payload, record.record_kind);
  for (const signature of record.signatures) signature.signed_payload_hash = record.payload_hash;
  record.record_hash = computeGovernanceRecordHash(record);
  return record;
}

function resealLineage(lineage) {
  lineage.lineage_hash = computeGovernanceLineageHash(lineage);
  return lineage;
}

function updateRawSourceReference(lineage, key, root) {
  const path = lineage.sources[key].path;
  lineage.sources[key].sha256 = rawSha256(readFileSync(resolve(root, path)));
}

function expectError(result, code) {
  assert.equal(result.lineage_valid, false, JSON.stringify(result, null, 2));
  assert.ok(result.errors.some(({ code: actual }) => actual === code),
    `${code} not found in ${JSON.stringify(result.errors, null, 2)}`);
}

test("Round 06 binds exact retained sources and remains synthetic, blocked and non-authorising", () => {
  const record = fixture();
  const result = validateGovernanceLineage(record, {
    rootDir: repositoryRoot,
    asOf: liveAsOf,
  });

  assert.equal(result.lineage_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.source_bundle_coherent, true);
  assert.equal(result.context_valid, true);
  assert.equal(result.negotiation_valid, true);
  assert.equal(result.decision_valid, true);
  assert.equal(result.action_blocked, true);
  assert.equal(result.action_authorised, false);
  assert.equal(result.authority_effect, "none");
  assert.deepEqual(Object.values(result.boundaries), [false, false, false, false, false]);
  assert.deepEqual(result.verification_boundaries, {
    as_of_clock_authenticated: false,
    external_context_authenticated: false,
    latest_lineage_anchor_verified: false,
    participant_identities_authenticated: false,
    representative_mandates_verified: false,
  });
  assert.equal(result.derived_if.condition_definition_ref.condition_id,
    "condition.worker-option.nsw");
  assert.equal(result.derived_if.computed_rule_state, "true");
  assert.equal(record.lineage_hash, computeGovernanceLineageHash(record));
});

test("the deterministic builder reproduces context and lineage bytes", () => {
  const result = spawnSync(
    process.execPath,
    ["governance/lineage/tools/build-round-06-lineage.mjs", "--check"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("hostile: coordinated omission of affected people cannot redefine external context", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const context = readJson(root, record.sources.governance_context.path);
    context.affected_consumers.pop();
    context.representations.pop();
    context.context_hash = computeExternalGovernanceContextHash(context);
    writeJson(root, record.sources.governance_context.path, context);
    updateRawSourceReference(record, "governance_context", root);
    record.sources.governance_context.context_hash = context.context_hash;
    resealLineage(record);

    const result = validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf });
    expectError(result, "SOURCE_REFERENCE_MISMATCH");
    assert.equal(result.context_valid, false);
  });
});

test("hostile: a coherent-looking bundle cannot hide drift in retained component bytes", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const bundle = readJson(root, record.sources.round_04_bundle.path);
    const signal = bundle.artifacts.find(({ role }) => role === "signal-registry");
    const bytes = readFileSync(resolve(root, signal.path));
    writeFileSync(resolve(root, signal.path), Buffer.concat([bytes, Buffer.from("\n")]));

    expectError(validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf }),
      "SOURCE_BUNDLE_INVALID");
  });
});

test("hostile: governance record drift cannot be hidden by coordinated resealing", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const negotiation = readJson(root, record.sources.negotiation.path);
    negotiation.payload.public_summary = "A coordinated but unregistered substitute.";
    resealGovernance(negotiation);
    writeJson(root, record.sources.negotiation.path, negotiation);

    const decision = readJson(root, record.sources.decision.path);
    decision.payload.negotiation_ref.record_hash = negotiation.record_hash;
    resealGovernance(decision);
    writeJson(root, record.sources.decision.path, decision);

    updateRawSourceReference(record, "negotiation", root);
    updateRawSourceReference(record, "decision", root);
    record.sources.negotiation.record_hash = negotiation.record_hash;
    record.sources.decision.record_hash = decision.record_hash;
    resealLineage(record);

    const result = validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf });
    expectError(result, "SOURCE_REFERENCE_MISMATCH");
    assert.equal(result.negotiation_valid, false);
    assert.equal(result.decision_valid, false);
  });
});

test("hostile: condition and receipt substitutions cannot escape the Round 04 derivation", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const context = readJson(root, record.sources.governance_context.path);
    const substituted = `sha256:${"0".repeat(64)}`;
    context.if_binding.condition_definition_ref.definition_hash = substituted;
    context.if_binding.evaluation_receipt_ref.definition_hash = substituted;
    context.if_binding.evaluation_receipt_ref.receipt_id = "receipt.condition.substitute";
    context.if_binding.evaluation_receipt_ref.receipt_hash =
      computeGovernanceReceiptHash(context.if_binding.evaluation_receipt_ref);
    context.context_hash = computeExternalGovernanceContextHash(context);
    writeJson(root, record.sources.governance_context.path, context);
    updateRawSourceReference(record, "governance_context", root);
    record.sources.governance_context.context_hash = context.context_hash;
    record.derived_if.condition_definition_ref.definition_hash = substituted;
    record.derived_if.governance_receipt_hash =
      context.if_binding.evaluation_receipt_ref.receipt_hash;
    resealLineage(record);

    const result = validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf });
    expectError(result, "DERIVED_IF_MISMATCH");
    assert.ok(result.errors.some(({ code }) => code === "CONTEXT_IF_BINDING_MISMATCH"));
  });
});

test("hostile: action drift remains blocked even when the decision is resealed", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const decision = readJson(root, record.sources.decision.path);
    decision.payload.action.object.label = "an action that was never negotiated";
    resealGovernance(decision);
    writeJson(root, record.sources.decision.path, decision);
    updateRawSourceReference(record, "decision", root);
    record.sources.decision.record_hash = decision.record_hash;
    resealLineage(record);

    const result = validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf });
    expectError(result, "SOURCE_REFERENCE_MISMATCH");
    assert.ok(result.errors.some(({ code }) =>
      code === "DECISION_ACTION_NEGOTIATION_MISMATCH"));
  });
});

test("hostile: the decision must follow the negotiation and all negotiation signatures", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const decision = readJson(root, record.sources.decision.path);
    decision.payload.created_at = "2026-09-10T03:10:00Z";
    decision.payload.reconsideration.valid_from = decision.payload.created_at;
    for (const signature of decision.signatures) signature.signed_at = "2026-09-10T03:20:00Z";
    resealGovernance(decision);
    writeJson(root, record.sources.decision.path, decision);
    updateRawSourceReference(record, "decision", root);
    record.sources.decision.record_hash = decision.record_hash;
    resealLineage(record);

    expectError(validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf }),
      "NEGOTIATION_CHRONOLOGY_INVALID");
  });
});

test("hostile: deliberation cannot be recorded before the context it claims to use", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const negotiation = readJson(root, record.sources.negotiation.path);
    negotiation.payload.positions[0].recorded_at = "2026-09-08T23:00:00Z";
    resealGovernance(negotiation);
    writeJson(root, record.sources.negotiation.path, negotiation);
    updateRawSourceReference(record, "negotiation", root);
    record.sources.negotiation.record_hash = negotiation.record_hash;
    resealLineage(record);

    expectError(validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf }),
      "NEGOTIATION_CHRONOLOGY_INVALID");
  });
});

test("hostile: an invalid eligible source cannot make a failed lineage appear unblocked", () => {
  withSourceSandbox((root) => {
    const record = fixture(root);
    const decision = readJson(root, record.sources.decision.path);
    decision.payload.decision.activation_state = "eligible-for-implementation";
    resealGovernance(decision);
    writeJson(root, record.sources.decision.path, decision);
    updateRawSourceReference(record, "decision", root);
    record.sources.decision.record_hash = decision.record_hash;
    resealLineage(record);

    const result = validateGovernanceLineage(record, { rootDir: root, asOf: liveAsOf });
    expectError(result, "LINEAGE_BOUNDARY_INVALID");
    assert.equal(result.action_blocked, true);
    assert.equal(result.action_authorised, false);
  });
});

test("hostile: review-due and expired lineage fail closed under an external clock", () => {
  const record = fixture();
  expectError(validateGovernanceLineage(record, {
    rootDir: repositoryRoot,
    asOf: "2026-09-24T00:00:00Z",
  }), "NEGOTIATION_RECONSIDERATION_DUE");
  expectError(validateGovernanceLineage(record, {
    rootDir: repositoryRoot,
    asOf: "2026-10-02T00:00:00Z",
  }), "NEGOTIATION_RECORD_EXPIRED");
});

test("hostile: normalized but non-existent UTC clock instants are rejected", () => {
  const result = validateGovernanceLineage(fixture(), {
    rootDir: repositoryRoot,
    asOf: "2026-09-15T24:00:00Z",
  });
  expectError(result, "AS_OF_INVALID");
  assert.equal(result.action_blocked, true);
});

test("hostile: source paths are fixed and traversal is rejected before loading", () => {
  const record = fixture();
  record.sources.decision.path = "../decision.json";
  resealLineage(record);
  expectError(validateGovernanceLineage(record, {
    rootDir: repositoryRoot,
    asOf: liveAsOf,
  }), "LINEAGE_SCHEMA_INVALID");
});
