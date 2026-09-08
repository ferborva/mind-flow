import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeOutcomeScopeHash,
  renderPublicClaimCeiling,
  validatePossiblePath,
} from "../validate.mjs";

const schema = JSON.parse(readFileSync(
  new URL("../schema/possible-path.schema.json", import.meta.url),
  "utf8",
));
const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/australian-clerical-transition.synthetic.json", import.meta.url),
  "utf8",
));

function clone(value = fixture) {
  return structuredClone(value);
}

function validate(value) {
  return validatePossiblePath(value, { schema });
}

function expectError(value, code) {
  const result = validate(value);
  assert.equal(result.machine_valid, false, JSON.stringify(result, null, 2));
  assert.ok(result.errors.some((error) => error.code === code), JSON.stringify(result.errors, null, 2));
}

test("the Australian clerical fixture is an unscored synthetic path, not a finding", () => {
  const result = validate(fixture);
  assert.equal(result.machine_valid, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.boundaries, {
    path_truth_assessed: false,
    forecast_produced: false,
    probability_produced: false,
    crisis_verdict_produced: false,
    authority_verified: false,
    action_authorised: false,
  });
  assert.equal(fixture.classification, "synthetic-example-not-a-finding");
  assert.equal(fixture.epistemic_contract.world_model, "open-world");
  assert.equal(fixture.epistemic_contract.quantification, "unscored");
});

test("the complete WHO VERB OBJECT STANDARD PLACE PERIOD IF scope is hash-bound", () => {
  assert.equal(fixture.outcome_scope.scope_hash, computeOutcomeScopeHash(fixture.outcome_scope));
  for (const field of ["who", "verb", "object", "standard", "place", "period", "if_conditions"]) {
    assert.ok(fixture.outcome_scope[field]);
  }
  const changed = clone();
  changed.outcome_scope.who = "All Australian workers";
  expectError(changed, "OUTCOME_SCOPE_HASH_MISMATCH");
});

test("plain-language IF clauses cannot drift from their ledger anchors", () => {
  const changed = clone();
  changed.outcome_scope.if_conditions[0].public_condition = "workers receive an unspecified option";
  changed.outcome_scope.scope_hash = computeOutcomeScopeHash(changed.outcome_scope);
  changed.public_claim_ceiling = renderPublicClaimCeiling(changed);
  for (const edge of changed.graph.edges) {
    for (const binding of edge.condition_bindings) {
      binding.outcome_scope_hash = changed.outcome_scope.scope_hash;
    }
  }
  expectError(changed, "PUBLIC_IF_ANCHOR_MISMATCH");
});

test("scope mutation cannot be hidden by resealing only the outcome scope", () => {
  const changed = clone();
  changed.outcome_scope.period = "2027-01-01 through 2035-12-31";
  changed.outcome_scope.scope_hash = computeOutcomeScopeHash(changed.outcome_scope);
  changed.public_claim_ceiling = renderPublicClaimCeiling(changed);
  expectError(changed, "EDGE_SCOPE_BINDING_MISMATCH");
});

test("a consequential edge cannot omit condition anchors or false and unknown branches", () => {
  const noAnchor = clone();
  noAnchor.graph.edges[0].condition_bindings = [];
  expectError(noAnchor, "SCHEMA_INVALID");

  const noFalse = clone();
  delete noFalse.graph.edges[0].branches.if_false;
  expectError(noFalse, "SCHEMA_INVALID");

  const noUnknown = clone();
  delete noUnknown.graph.edges[0].branches.if_unknown;
  expectError(noUnknown, "SCHEMA_INVALID");
});

test("every bound condition has exactly the closed eleven-operation evolution matrix", () => {
  const incomplete = clone();
  incomplete.condition_evolution_policies[0].on_event.pop();
  expectError(incomplete, "SCHEMA_INVALID");

  const duplicate = clone();
  duplicate.condition_evolution_policies[0].on_event[10].operation = "disputed";
  expectError(duplicate, "EVOLUTION_MATRIX_INCOMPLETE");
});

test("challenged, disputed and satisfied conditions cannot be laundered into continuation", () => {
  for (const operation of ["challenged", "disputed", "satisfied"]) {
    const changed = clone();
    const policy = changed.condition_evolution_policies[0].on_event
      .find((candidate) => candidate.operation === operation);
    policy.disposition = "no-effect";
    policy.next_action = "none-after-proof";
    policy.out_of_scope_proof = {
      proof_type: "condition-id-and-scope-nonintersection",
      event_condition_id_rule: "must-not-equal-bound-condition-id",
      scope_intersection_rule: "must-be-empty",
      evidence_required: "complete-hash-bound-event-state",
      reason: "Caller says the change is unrelated.",
    };
    expectError(changed, "CONDITION_CHANGE_LAUNDERING");
  }
});

test("no-effect requires machine-checkable out-of-scope proof", () => {
  const changed = clone();
  const added = changed.condition_evolution_policies[0].on_event
    .find((candidate) => candidate.operation === "added");
  delete added.out_of_scope_proof;
  expectError(changed, "SCHEMA_INVALID");
});

test("forecast, probability and crisis-verdict language is rejected", () => {
  for (const phrase of [
    "Forecast of widespread displacement",
    "There is a 70% probability of this path",
    "An inevitable clerical crisis",
  ]) {
    const changed = clone();
    changed.hypothesis_summary = phrase;
    expectError(changed, "FORBIDDEN_VERDICT_LANGUAGE");
  }
});

test("the strongest competitor and discriminating observations cannot disappear", () => {
  const noCompetitor = clone();
  delete noCompetitor.strongest_competing_path;
  expectError(noCompetitor, "SCHEMA_INVALID");

  const noObservation = clone();
  noObservation.strongest_competing_path.discriminating_observations = [];
  expectError(noObservation, "SCHEMA_INVALID");
});

test("authority cannot be inflated and the public ceiling is deterministic", () => {
  const authority = clone();
  authority.governance.authority_status = "verified";
  expectError(authority, "SCHEMA_INVALID");

  const prose = clone();
  prose.public_claim_ceiling = "This is safe to act on.";
  expectError(prose, "PUBLIC_CLAIM_CEILING_MISMATCH");
});

test("affected and omitted populations cannot be silently removed", () => {
  const noAccounting = clone();
  delete noAccounting.population_accounting.omissions;
  expectError(noAccounting, "SCHEMA_INVALID");

  const silentNone = clone();
  silentNone.population_accounting.omissions.status = "none-identified";
  silentNone.population_accounting.omissions.entries = [];
  delete silentNone.population_accounting.omissions.search_limitations;
  expectError(silentNone, "SCHEMA_INVALID");
});

test("one signal cannot be laundered across multiple roles", () => {
  const changed = clone();
  const leading = changed.signal_portfolio.roles.find((entry) => entry.role === "leading");
  const confirming = changed.signal_portfolio.roles.find((entry) => entry.role === "confirming");
  confirming.status = "assigned";
  confirming.signal_ids = [...leading.signal_ids];
  delete confirming.unresolved_reason;
  expectError(changed, "SIGNAL_ROLE_REUSE");
});

test("false and unknown branches always block edge traversal", () => {
  for (const branch of ["if_false", "if_unknown"]) {
    const changed = clone();
    changed.graph.edges[0].branches[branch].action = "human-decision-required";
    expectError(changed, "FAIL_CLOSED_BRANCH_INVALID");
  }
});

test("a blocked branch cannot quietly target the proposed destination", () => {
  for (const branch of ["if_false", "if_unknown"]) {
    const changed = clone();
    changed.graph.edges[0].branches[branch].target_node_id = changed.graph.edges[0].to_node_id;
    expectError(changed, "BLOCKED_BRANCH_TARGET_MISMATCH");
  }
});
