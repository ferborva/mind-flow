import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assessPreparationRegister, checksumJson } from "../lib/validate.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function sources() {
  return {
    sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
    sourceEvolution: fileSource("contracts/evolution/fixtures/round-04.worker-option.synthetic.json"),
  };
}

function fixture() {
  return fileSource("preparation/fixtures/valid/round-04.worker-option.synthetic.json").document;
}

function assess(document) {
  return assessPreparationRegister(document, sources());
}

function assessWith(document, sourceOverrides) {
  return assessPreparationRegister(document, { ...sources(), ...sourceOverrides });
}

function hasCode(result, code) {
  return result.problems.some(({ code: actual }) => actual === code);
}

function reseal(envelope) {
  envelope.checksum = checksumJson(envelope.content);
}

test("Round 4 prepares reversibly from an exact five-state executable receipt", () => {
  const document = fixture();
  const result = assess(document);
  assert.equal(result.schema_conformant, true, JSON.stringify(result.problems, null, 2));
  assert.equal(result.register_consistent, true, JSON.stringify(result.problems, null, 2));
  assert.equal(result.external_bindings_verified, true);
  assert.deepEqual(result.actions, [{
    action_id: "action.prepare-worker-option-support",
    computed_rule_state: "true",
    trigger_matches: false,
    eligible_for_consideration: false,
    action_authorised: false,
  }]);
  assert.equal(result.action_authorised, false);
});

test("hostile: action triggers must partition all five IF states exactly", () => {
  for (const mutate of [
    (trigger) => { trigger.eligible_states.pop(); },
    (trigger) => { trigger.blocked_states.push("unknown"); },
    (trigger) => { trigger.eligible_states.push("false"); },
    (trigger) => { trigger.eligible_states = ["true", "false", "unknown", "stale", "conflicted"]; },
  ]) {
    const document = fixture();
    mutate(document.actions[0].if_binding.state_trigger);
    assert.ok(hasCode(assess(document), "STATE_PARTITION_INVALID"));
  }
});

test("hostile: resealing cannot hide definition or evaluation receipt substitution", () => {
  const definitionAttack = fixture();
  definitionAttack.condition_bindings[0].content.kernel.condition_definition_ref.definition_hash =
    `sha256:${"0".repeat(64)}`;
  reseal(definitionAttack.condition_bindings[0]);
  assert.ok(hasCode(assess(definitionAttack), "CONDITION_BINDING_MISMATCH"));

  const receiptAttack = fixture();
  receiptAttack.evaluation_receipts[0].content.computed_rule_state.state = "unknown";
  reseal(receiptAttack.evaluation_receipts[0]);
  assert.ok(hasCode(assess(receiptAttack), "EVALUATION_RECEIPT_MISMATCH"));
});

test("hostile: nondecisive states permit only reversible low-regret preparation", () => {
  for (const mutate of [
    (action) => { action.verb = "fund"; },
    (action) => { action.reversibility.class = "irreversible"; },
    (action) => { action.if_binding.state_trigger.re_evaluate_before_start = false; },
  ]) {
    const document = fixture();
    mutate(document.actions[0]);
    assert.ok(hasCode(assess(document), "NONDECISIVE_ACTION_UNSAFE"));
    assert.equal(assess(document).action_authorised, false);
  }
});

test("hostile: current receipt state is derived and cannot manufacture authority", () => {
  const document = fixture();
  document.actions[0].authorisation_effect = "execute";
  const result = assess(document);
  assert.equal(result.schema_conformant, false);
  assert.equal(result.action_authorised, false);
});

test("hostile: exact source artifacts, history tip and condition producer cannot drift", () => {
  const mutations = [
    (document) => { document.condition_bindings[0].content.kernel.artifact_ref.artifact_sha256 = `sha256:${"1".repeat(64)}`; },
    (document) => { document.condition_bindings[0].content.evolution.history_tip_ref.event_hash = `sha256:${"2".repeat(64)}`; },
    (document) => { document.condition_bindings[0].content.evolution.condition_source_event_ref.event_hash = `sha256:${"3".repeat(64)}`; },
    (document) => { document.condition_bindings[0].content.condition_scope.period.ends_at = "2026-11-30T23:59:59Z"; },
  ];
  for (const mutate of mutations) {
    const document = fixture();
    mutate(document);
    reseal(document.condition_bindings[0]);
    assert.ok(hasCode(assess(document), "CONDITION_BINDING_MISMATCH"));
  }

  const sourceDrift = sources();
  sourceDrift.sourceKernel.sha256 = `sha256:${"4".repeat(64)}`;
  assert.equal(assessWith(fixture(), sourceDrift).external_bindings_verified, false);
});

test("hostile: receipts cannot be replayed, partially projected or treated as fresh unknown", () => {
  for (const mutate of [
    (receipt) => { receipt.evaluated_at = "2026-09-08T00:00:00Z"; },
    (receipt) => { receipt.evaluation_hash = `sha256:${"5".repeat(64)}`; },
    (receipt) => { receipt.evidence_state_hash = `sha256:${"6".repeat(64)}`; },
    (receipt) => { receipt.observation_hashes.reverse(); },
    (receipt) => {
      receipt.mechanically_valid_for_evaluation = false;
      receipt.computed_rule_state.state = "unknown";
    },
  ]) {
    const document = fixture();
    mutate(document.evaluation_receipts[0].content);
    reseal(document.evaluation_receipts[0]);
    const result = assess(document);
    assert.ok(hasCode(result, "EVALUATION_RECEIPT_MISMATCH"));
    assert.equal(result.actions[0].trigger_matches, false);
    assert.equal(result.actions[0].eligible_for_consideration, false);
  }
});

test("hostile: action meaning, controls and public explanation stay bound", () => {
  for (const [mutate, code] of [
    [(action) => { action.scope.geographies = ["Queensland"]; }, "ACTION_SCOPE_MISMATCH"],
    [(action) => { action.controls.start_conditions = action.controls.start_conditions.filter(({ gate }) => gate !== "human-approval"); }, "CONTROL_GATE_MISSING"],
    [(action) => { action.controls.stop_conditions = action.controls.stop_conditions.filter(({ gate }) => gate !== "receipt-invalidated"); }, "CONTROL_GATE_MISSING"],
    [(action) => { action.public_sentence = "Proposal: prepare something if useful."; }, "PUBLIC_SENTENCE_MISMATCH"],
  ]) {
    const document = fixture();
    mutate(document.actions[0]);
    const result = assess(document);
    assert.ok(hasCode(result, code));
    assert.equal(result.actions[0].eligible_for_consideration, false);
    assert.equal(result.action_authorised, false);
  }
});

test("preparation-only evidence cannot silently become condition truth evidence", () => {
  const document = fixture();
  document.evidence_bundles[0].content.truth_effect = "establishes-condition";
  reseal(document.evidence_bundles[0]);
  const result = assess(document);
  assert.equal(result.schema_conformant, false);
  assert.equal(result.evidence_truth_assessed, false);
  assert.equal(result.action_authorised, false);
});
