import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeGovernancePayloadHash,
  computeGovernanceRecordHash,
  validateDecisionRecord,
} from "../validate.mjs";
import { buildSyntheticGovernanceFixtures } from "../../tools/build-synthetic-fixtures.mjs";

const negotiation = JSON.parse(readFileSync(
  new URL("../../negotiation-record/fixtures/worker-transition.negotiation.synthetic.json", import.meta.url),
  "utf8",
));
const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/worker-transition.decision.synthetic.json", import.meta.url),
  "utf8",
));

const expectedIfBinding = {
  condition_id: "condition.worker-option.nsw",
  definition_version: "1.0.0",
  definition_hash: "sha256:861b22794e529605e0b0349a083f001fdfd2fbc3d13e0a8486d23d9cc972d706",
  receipt_id: "receipt.condition.worker-option.nsw.20260909",
  receipt_version: "1.0.0",
  receipt_hash: "sha256:e22a8500d51cac729c081025bc4567f9d3bf00dd33c4625a32e0b7ee010227ed",
  evaluated_at: "2026-09-09T00:00:00Z",
  valid_until: "2026-10-09T00:00:00Z",
  mechanically_valid_for_evaluation: true,
  computed_rule_state: "true",
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
};

const expectedGovernanceContext = {
  participants: negotiation.payload.participants,
  affected_consumers: negotiation.payload.affected_consumers,
  representations: negotiation.payload.representations,
  deliberation_scope: {
    position_ids: negotiation.payload.positions.map(({ position_id: id }) => id),
    dissent_ids: negotiation.payload.dissent.map(({ dissent_id: id }) => id),
    unresolved_dissent_ids: negotiation.payload.outcome.unresolved_dissent_ids,
  },
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

function validate(record, asOf = "2026-09-16T00:00:00Z", source = negotiation) {
  return validateDecisionRecord(record, {
    expectedIfBinding,
    expectedGovernanceContext,
    sourceNegotiation: source,
    asOf,
  });
}

function expectError(record, code, asOf, source) {
  const result = validate(record, asOf, source);
  assert.equal(result.machine_valid, false, JSON.stringify(result, null, 2));
  assert.ok(result.errors.some(({ code: actual }) => actual === code), JSON.stringify(result.errors));
}

test("a synthetic decision preserves negotiation lineage and remains blocked", () => {
  const result = validate(fixture);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.activation_eligible, false);
  assert.deepEqual(result.boundaries, {
    empirical_truth_established: false,
    affected_party_consent_established: false,
    authority_verified: false,
    action_authorised: false,
  });
  assert.equal(fixture.payload.negotiation_ref.record_hash, negotiation.record_hash);
  assert.deepEqual(
    new Set(fixture.payload.deliberation.position_refs),
    new Set(negotiation.payload.positions.map(({ position_id: id }) => id)),
  );
  assert.deepEqual(
    new Set(fixture.payload.deliberation.dissent_refs),
    new Set(negotiation.payload.dissent.map(({ dissent_id: id }) => id)),
  );
  assert.equal(fixture.payload.action.reversibility.class, "reversible");
  assert.equal(fixture.payload.decision.activation_state, "blocked");
  assert.equal(fixture.record_hash, computeGovernanceRecordHash(fixture));
});

test("the decision fixture reproduces and documentation separates recording from authority", () => {
  assert.deepEqual(buildSyntheticGovernanceFixtures().decision, fixture);
  const guidance = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.match(guidance, /does not authorise/i);
  assert.match(guidance, /source negotiation/i);
  assert.match(guidance, /reconsider/i);
});

test("hostile: a decision cannot detach from or crop its source negotiation", () => {
  const detached = clone();
  detached.payload.negotiation_ref.record_hash = `sha256:${"0".repeat(64)}`;
  reseal(detached);
  expectError(detached, "NEGOTIATION_BINDING_MISMATCH");

  const cropped = clone();
  cropped.payload.deliberation.position_refs.pop();
  reseal(cropped);
  expectError(cropped, "DELIBERATION_PRESERVATION_INVALID");

  const substitutedAction = clone();
  substitutedAction.payload.action.object.label = "a different unnegotiated intervention";
  reseal(substitutedAction);
  expectError(substitutedAction, "ACTION_NEGOTIATION_MISMATCH");

  const substitutedAuthority = clone();
  substitutedAuthority.payload.authority.decision_scope = "A different unnegotiated power";
  reseal(substitutedAuthority);
  expectError(substitutedAuthority, "AUTHORITY_NEGOTIATION_MISMATCH");
});

test("hostile: false, unknown, stale and conflicted IF receipts fail closed", () => {
  for (const state of ["false", "unknown", "stale", "conflicted"]) {
    const record = clone();
    record.payload.if_binding.evaluation_receipt_ref.computed_rule_state = state;
    reseal(record);
    expectError(record, "IF_STATE_FAIL_CLOSED");
  }
});

test("hostile: a recorded decision requires every affected representative and owner signature", () => {
  for (const signer of [
    "actor.worker-representative.synthetic",
    "actor.household-representative.synthetic",
    "actor.public-authority-candidate.synthetic",
  ]) {
    const record = clone();
    record.signatures = record.signatures.filter(({ signer_actor_id: id }) => id !== signer);
    record.record_hash = computeGovernanceRecordHash(record);
    expectError(record, "SIGNATURE_COVERAGE_INVALID");
  }
});

test("hostile: authority claims and irreversible action cannot be manufactured by resealing", () => {
  const authority = clone();
  authority.payload.authority.verification_status = "externally-verified";
  authority.payload.authority.authority_effect = "authorises-action";
  authority.payload.boundaries.authority_verified = true;
  authority.payload.boundaries.action_authorised = true;
  reseal(authority);
  expectError(authority, "AUTHORITY_BOUNDARY_INVALID");

  const irreversible = clone();
  irreversible.payload.action.reversibility.class = "irreversible";
  reseal(irreversible);
  expectError(irreversible, "ACTION_NOT_REVERSIBLE");

  const selfVerified = clone();
  selfVerified.payload.representations[0].mandate_verification = "externally-verified";
  reseal(selfVerified);
  expectError(selfVerified, "AUTHORITY_BOUNDARY_INVALID");
});

test("hostile: unresolved blocking dissent and affected consumers survive the decision", () => {
  const bypassed = clone();
  bypassed.payload.decision.activation_state = "eligible-for-implementation";
  bypassed.payload.decision.blocking_reasons = [];
  reseal(bypassed);
  expectError(bypassed, "DISSENT_GATE_INVALID");

  const omitted = clone();
  omitted.payload.affected_consumers.pop();
  omitted.payload.representations.pop();
  reseal(omitted);
  expectError(omitted, "AFFECTED_CONSUMER_MISMATCH");
});

test("hostile: stale decisions and missing verifier sources fail closed", () => {
  expectError(clone(), "RECORD_EXPIRED", "2026-10-02T00:00:00Z");
  assert.ok(validateDecisionRecord(fixture, {
    expectedIfBinding,
    expectedGovernanceContext,
    asOf: "2026-09-16T00:00:00Z",
  })
    .errors.some(({ code }) => code === "NEGOTIATION_SOURCE_REQUIRED"));
});

test("hostile: authority expiry and duplicate alternatives cannot hide inside a live record", () => {
  const expiredAuthority = clone();
  expiredAuthority.payload.authority.expires_at = "2026-09-15T00:00:00Z";
  reseal(expiredAuthority);
  expectError(expiredAuthority, "AUTHORITY_EXPIRED", "2026-09-16T00:00:00Z");

  const duplicateAlternative = clone();
  duplicateAlternative.payload.alternatives[1].option_id =
    duplicateAlternative.payload.alternatives[0].option_id;
  reseal(duplicateAlternative);
  expectError(duplicateAlternative, "ALTERNATIVE_ID_DUPLICATE");
});

test("hostile: malformed source records fail as findings instead of crashing", () => {
  assert.doesNotThrow(() => validate(fixture, "2026-09-16T00:00:00Z", {}));
  assert.ok(validate(fixture, "2026-09-16T00:00:00Z", {}).errors
    .some(({ code }) => code === "SOURCE_NEGOTIATION_INVALID"));
});

test("hostile: a decision cannot predate the negotiation or its attestations", () => {
  const lateNegotiation = structuredClone(negotiation);
  lateNegotiation.payload.created_at = "2026-09-12T03:00:00Z";
  for (const signature of lateNegotiation.signatures) {
    signature.signed_at = "2026-09-12T03:15:00Z";
  }
  reseal(lateNegotiation);
  const record = clone();
  record.payload.negotiation_ref.record_hash = lateNegotiation.record_hash;
  reseal(record);
  expectError(record, "NEGOTIATION_CHRONOLOGY_INVALID", undefined, lateNegotiation);
});

test("hostile: a decision cannot share its creation instant with the final negotiation attestation", () => {
  const record = clone();
  record.payload.created_at = "2026-09-10T03:15:00Z";
  record.payload.reconsideration.valid_from = record.payload.created_at;
  for (const signature of record.signatures) signature.signed_at = record.payload.created_at;
  reseal(record);
  expectError(record, "NEGOTIATION_CHRONOLOGY_INVALID");
});

test("validator output exposes that record context is not authenticated", () => {
  assert.equal(validate(fixture).context_authenticated, false);
});

test("a decision can preserve a source negotiation with no unresolved dissent", () => {
  const resolvedSource = structuredClone(negotiation);
  resolvedSource.payload.dissent[0].status = "accommodated";
  resolvedSource.payload.dissent[0].blocks_activation = false;
  resolvedSource.payload.outcome.agreement_status = "provisional";
  resolvedSource.payload.outcome.unresolved_dissent_ids = [];
  resolvedSource.payload.outcome.blocking_reasons = ["authority-unverified"];
  resolvedSource.payload.outcome.public_explanation =
    "The recorded dissent was accommodated. Authority remains unverified.";
  reseal(resolvedSource);

  const record = clone();
  record.payload.negotiation_ref.record_hash = resolvedSource.record_hash;
  record.payload.deliberation.unresolved_dissent_refs = [];
  record.payload.decision.blocking_reasons = ["authority-unverified"];
  reseal(record);
  const resolvedContext = {
    participants: resolvedSource.payload.participants,
    affected_consumers: resolvedSource.payload.affected_consumers,
    representations: resolvedSource.payload.representations,
    deliberation_scope: {
      position_ids: resolvedSource.payload.positions.map(({ position_id: id }) => id),
      dissent_ids: resolvedSource.payload.dissent.map(({ dissent_id: id }) => id),
      unresolved_dissent_ids: [],
    },
  };
  const result = validateDecisionRecord(record, {
    expectedIfBinding,
    expectedGovernanceContext: resolvedContext,
    sourceNegotiation: resolvedSource,
    asOf: "2026-09-16T00:00:00Z",
  });
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.activation_eligible, false);
});
