import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeGovernancePayloadHash,
  computeGovernanceReceiptHash,
  computeGovernanceRecordHash,
  validateNegotiationRecord,
} from "../validate.mjs";
import { buildSyntheticGovernanceFixtures } from "../../tools/build-synthetic-fixtures.mjs";

const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/worker-transition.negotiation.synthetic.json", import.meta.url),
  "utf8",
));

const expectedIfBinding = {
  condition_id: "condition.worker-option.nsw",
  definition_version: "1.0.0",
  definition_hash: "sha256:5ca7f32a0053e470dfb6e5eccb3f4d3d3a25718b1fbba34a0afee70ceee7272e",
  receipt_id: "receipt.condition.worker-option.nsw.20260909",
  receipt_version: "1.0.0",
  receipt_hash: "sha256:6f315cd2a8a4c1847aaa068294100aa134cb20c9842f5cb04db6b9b29639d410",
  evaluated_at: "2026-09-09T00:00:00Z",
  valid_until: "2026-12-31T23:59:59Z",
  mechanically_valid_for_evaluation: true,
  computed_rule_state: "true",
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
};

const expectedGovernanceContext = {
  participants: fixture.payload.participants,
  affected_consumers: fixture.payload.affected_consumers,
  representations: fixture.payload.representations,
};

function clone() {
  return structuredClone(fixture);
}

function reseal(record) {
  record.payload_hash = computeGovernancePayloadHash(record.payload, record.record_kind);
  for (const signature of record.signatures) signature.signed_payload_hash = record.payload_hash;
  record.record_hash = computeGovernanceRecordHash(record);
  return record;
}

function validate(record, asOf = "2026-09-15T00:00:00Z") {
  return validateNegotiationRecord(record, {
    expectedIfBinding,
    expectedGovernanceContext,
    asOf,
  });
}

function expectError(record, code, asOf) {
  const result = validate(record, asOf);
  assert.equal(result.machine_valid, false, JSON.stringify(result, null, 2));
  assert.ok(result.errors.some(({ code: actual }) => actual === code), JSON.stringify(result.errors));
}

test("a concluded synthetic negotiation preserves IF, consumers, positions and dissent", () => {
  const result = validate(fixture);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.activation_eligible, false);
  assert.deepEqual(result.boundaries, {
    empirical_truth_established: false,
    affected_party_consent_established: false,
    authority_verified: false,
    action_authorised: false,
  });
  assert.equal(fixture.payload.positions.length, fixture.payload.participants.length);
  assert.equal(fixture.payload.dissent.length, 1);
  assert.equal(fixture.payload.outcome.activation_state, "blocked");
  assert.equal(fixture.payload.action_candidate.reversibility.class, "reversible");
  assert.equal(fixture.payload_hash, computeGovernancePayloadHash(fixture.payload, fixture.record_kind));
  assert.equal(
    fixture.payload.if_binding.evaluation_receipt_ref.receipt_hash,
    computeGovernanceReceiptHash(fixture.payload.if_binding.evaluation_receipt_ref),
  );
  assert.equal(fixture.record_hash, computeGovernanceRecordHash(fixture));
});

test("synthetic fixtures reproduce and operator guidance states the trust boundary", () => {
  assert.deepEqual(buildSyntheticGovernanceFixtures().negotiation, fixture);
  const guidance = [
    readFileSync(new URL("../../README.md", import.meta.url), "utf8"),
    readFileSync(new URL("../README.md", import.meta.url), "utf8"),
  ].join("\n");
  assert.match(guidance, /machine_valid.*does not establish/i);
  assert.match(guidance, /signatures.*not agreement/i);
  assert.match(guidance, /synthetic.*not authenticated/i);
  assert.match(guidance, /unknown[\s\S]*stale[\s\S]*conflicted[\s\S]*block/i);
});

test("hostile: coordinated IF definition or receipt substitution fails against the pinned expectation", () => {
  for (const mutate of [
    (record) => { record.payload.if_binding.condition_definition_ref.definition_version = "2.0.0"; },
    (record) => { record.payload.if_binding.evaluation_receipt_ref.receipt_id = "receipt.substitute"; },
  ]) {
    const record = clone();
    mutate(record);
    reseal(record);
    expectError(record, "IF_BINDING_MISMATCH");
  }
});

test("hostile: false, unknown, stale and conflicted IF receipts fail closed", () => {
  for (const state of ["false", "unknown", "stale", "conflicted"]) {
    const record = clone();
    record.payload.if_binding.evaluation_receipt_ref.computed_rule_state = state;
    reseal(record);
    expectError(record, "IF_STATE_FAIL_CLOSED");
  }
});

test("hostile: receipt freshness cannot be extended behind a stable receipt hash", () => {
  const record = clone();
  record.payload.if_binding.evaluation_receipt_ref.valid_until = "2027-12-31T23:59:59Z";
  reseal(record);
  expectError(record, "IF_BINDING_MISMATCH");
});

test("hostile: the receipt hash is a content address, not an opaque label", () => {
  const record = clone();
  record.payload.if_binding.evaluation_receipt_ref.valid_until = "2027-12-31T23:59:59Z";
  const substitutedExpectation = {
    ...expectedIfBinding,
    valid_until: record.payload.if_binding.evaluation_receipt_ref.valid_until,
  };
  reseal(record);
  const result = validateNegotiationRecord(record, {
    expectedIfBinding: substitutedExpectation,
    expectedGovernanceContext,
    asOf: "2026-09-15T00:00:00Z",
  });
  assert.ok(result.errors.some(({ code }) => code === "IF_RECEIPT_HASH_MISMATCH"));
});

test("hostile: every affected consumer needs a representative and signed attestation", () => {
  const unrepresented = clone();
  unrepresented.payload.representations.pop();
  reseal(unrepresented);
  expectError(unrepresented, "REPRESENTATION_COVERAGE_INVALID");

  const unsigned = clone();
  unsigned.signatures = unsigned.signatures.filter(
    ({ signer_actor_id: signer }) => signer !== "actor.household-representative.synthetic",
  );
  unsigned.record_hash = computeGovernanceRecordHash(unsigned);
  expectError(unsigned, "SIGNATURE_COVERAGE_INVALID");

  const coordinatedOmission = clone();
  const removedActor = coordinatedOmission.payload.representations.at(-1)
    .representative_actor_id;
  const removedConsumer = coordinatedOmission.payload.affected_consumers.at(-1).consumer_id;
  coordinatedOmission.payload.affected_consumers.pop();
  coordinatedOmission.payload.representations.pop();
  coordinatedOmission.payload.participants = coordinatedOmission.payload.participants
    .filter(({ actor_id: id }) => id !== removedActor);
  coordinatedOmission.payload.positions = coordinatedOmission.payload.positions
    .filter(({ actor_id: id }) => id !== removedActor)
    .map((position) => ({
      ...position,
      affected_consumer_ids: position.affected_consumer_ids
        .filter((id) => id !== removedConsumer),
    }));
  coordinatedOmission.payload.dissent[0] = {
    ...coordinatedOmission.payload.dissent[0],
    actor_id: "actor.worker-representative.synthetic",
    position_id: "position.affected-workers.synthetic",
    affected_consumer_ids: ["consumer.affected-workers.synthetic"],
  };
  coordinatedOmission.payload.signature_policy.required_signer_actor_ids =
    coordinatedOmission.payload.participants.map(({ actor_id: id }) => id);
  coordinatedOmission.signatures = coordinatedOmission.signatures
    .filter(({ signer_actor_id: id }) => id !== removedActor);
  reseal(coordinatedOmission);
  expectError(coordinatedOmission, "GOVERNANCE_CONTEXT_MISMATCH");
});

test("hostile: signatures bind the exact payload but never imply agreement", () => {
  const record = clone();
  record.signatures[0].signed_payload_hash = `sha256:${"0".repeat(64)}`;
  record.record_hash = computeGovernanceRecordHash(record);
  expectError(record, "SIGNATURE_PAYLOAD_MISMATCH");
  assert.ok(fixture.signatures.every(({ attestation }) =>
    attestation === "record-accuracy-not-agreement"));
});

test("hostile: positions and unresolved blocking dissent cannot be erased or bypassed", () => {
  const missingPosition = clone();
  missingPosition.payload.positions.pop();
  reseal(missingPosition);
  expectError(missingPosition, "POSITION_COVERAGE_INVALID");

  const bypassedDissent = clone();
  bypassedDissent.payload.outcome.activation_state = "eligible-for-authority-review";
  bypassedDissent.payload.outcome.blocking_reasons = ["authority-unverified"];
  reseal(bypassedDissent);
  expectError(bypassedDissent, "DISSENT_GATE_INVALID");
});

test("hostile: expiry and boundary escalation fail closed", () => {
  expectError(clone(), "RECORD_EXPIRED", "2026-10-02T00:00:00Z");
  expectError(clone(), "RECONSIDERATION_DUE", "2026-09-24T00:00:00Z");

  const escalated = clone();
  escalated.payload.boundaries.action_authorised = true;
  reseal(escalated);
  expectError(escalated, "AUTHORITY_BOUNDARY_INVALID");

  const selfVerified = clone();
  selfVerified.payload.participants[0].identity_verification = "externally-verified";
  selfVerified.payload.representations[0].mandate_verification = "externally-verified";
  reseal(selfVerified);
  expectError(selfVerified, "AUTHORITY_BOUNDARY_INVALID");

  const futurePosition = clone();
  futurePosition.payload.positions[0].recorded_at = "2026-09-20T00:00:00Z";
  reseal(futurePosition);
  expectError(futurePosition, "DELIBERATION_TIME_INVALID");
});

test("hostile: content drift and a harmful verb fail even if labels claim reversibility", () => {
  const drift = clone();
  drift.payload.public_summary = "Substituted summary";
  expectError(drift, "PAYLOAD_HASH_MISMATCH");

  const harmful = clone();
  harmful.payload.action_candidate.verb = "terminate-employment";
  reseal(harmful);
  expectError(harmful, "ACTION_NOT_REVERSIBLE");
});

test("hostile: expected IF binding and evaluation clock are mandatory verifier inputs", () => {
  assert.ok(validateNegotiationRecord(fixture, {
    expectedGovernanceContext,
    asOf: "2026-09-15T00:00:00Z",
  }).errors
    .some(({ code }) => code === "EXPECTED_IF_BINDING_REQUIRED"));
  assert.ok(validateNegotiationRecord(fixture, {
    expectedIfBinding,
    expectedGovernanceContext,
  }).errors
    .some(({ code }) => code === "AS_OF_REQUIRED"));
  assert.ok(validateNegotiationRecord(fixture, {
    expectedIfBinding,
    asOf: "2026-09-15T00:00:00Z",
  }).errors.some(({ code }) => code === "EXPECTED_GOVERNANCE_CONTEXT_REQUIRED"));
});

test("hostile: malformed members and impossible signature chronology fail without throwing", () => {
  const malformed = clone();
  malformed.payload.participants[0] = null;
  assert.doesNotThrow(() => validate(malformed));
  assert.ok(validate(malformed).errors.some(({ code }) => code === "SCHEMA_INVALID"));

  const premature = clone();
  premature.signatures[0].signed_at = "2026-09-09T00:00:00Z";
  premature.record_hash = computeGovernanceRecordHash(premature);
  expectError(premature, "SIGNATURE_TIME_INVALID");

  const inventedRoles = clone();
  inventedRoles.signatures[0].signer_roles = ["sole-decision-authority"];
  inventedRoles.record_hash = computeGovernanceRecordHash(inventedRoles);
  expectError(inventedRoles, "SIGNATURE_ROLE_MISMATCH");

  assert.ok(validateNegotiationRecord(fixture, {
    expectedIfBinding,
    expectedGovernanceContext,
    asOf: "2026-09-15T10:00:00+10:00",
  }).errors.some(({ code }) => code === "AS_OF_NOT_UTC"));
});
