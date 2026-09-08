import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  computeOutcomeScopeHash,
  computeCanonicalBindingHash,
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
const repositoryRoot = resolve(import.meta.dirname, "../..");

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function round4Sources() {
  return {
    sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
    sourceEvolution: fileSource("contracts/evolution/fixtures/round-04.worker-option.synthetic.json"),
    sourceSignalRegistry: fileSource("signals/fixtures/round-04.worker-option.synthetic.json"),
    sourceAgencyMap: fileSource("contracts/agency-map/fixtures/round-04.worker-option.synthetic.json"),
  };
}

function round4Fixture() {
  return fileSource("paths/fixtures/round-04.worker-option.synthetic.json").document;
}

function validateRound4(document) {
  return validatePossiblePath(document, round4Sources());
}

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

test("Round 4 path binds one exact five-state IF receipt and resolvable signals", () => {
  const document = round4Fixture();
  const result = validateRound4(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.source_bindings_verified, true);
  assert.deepEqual(Object.keys(document.graph.edges[0].branches), [
    "if_true", "if_false", "if_unknown", "if_stale", "if_conflicted",
  ]);
  assert.equal(
    document.condition_anchors[0].canonical_binding.evaluation_ref.computed_rule_state.state,
    "true",
  );
  assert.deepEqual(
    Object.values(document.graph.edges[0].branches).map(({ recovery }) => recovery),
    [
      "human-review",
      "repair-or-alternate",
      "acquire-missing-evidence",
      "refresh-and-re-evaluate",
      "adjudicate-conflict",
    ],
  );
  assert.match(document.public_claim_ceiling, /to the following standard:/i);
});

test("hostile: each non-true IF state must remain explicit and fail closed", () => {
  for (const branchName of ["if_false", "if_unknown", "if_stale", "if_conflicted"]) {
    const document = round4Fixture();
    delete document.graph.edges[0].branches[branchName];
    const result = validateRound4(document);
    assert.ok(
      result.errors.some(({ code }) =>
        ["PATH_FIVE_STATE_BRANCHES_INCOMPLETE", "SCHEMA_INVALID"].includes(code)),
      branchName,
    );
  }
});

test("hostile: path receipt, scope and metric substitutions fail closed", () => {
  for (const [code, mutate] of [
    ["PATH_EVALUATION_RECEIPT_MISMATCH", (document) => {
      document.condition_anchors[0].canonical_binding.evaluation_ref.computed_rule_state.state =
        "unknown";
      document.condition_anchors[0].canonical_binding_hash =
        computeCanonicalBindingHash(document.condition_anchors[0].canonical_binding);
    }],
    ["PATH_SIGNAL_REF_MISMATCH", (document) => {
      const assigned = document.signal_portfolio.roles.find(({ role }) => role === "confirming");
      assigned.registered_signal_refs[0].metric_checksum = `sha256:${"0".repeat(64)}`;
    }],
    ["PATH_SCOPE_MISMATCH", (document) => {
      document.outcome_scope.who = "A different population";
      document.outcome_scope.scope_hash = computeOutcomeScopeHash(document.outcome_scope);
      document.public_claim_ceiling = renderPublicClaimCeiling(document);
      for (const binding of document.graph.edges[0].condition_bindings) {
        binding.outcome_scope_hash = document.outcome_scope.scope_hash;
      }
    }],
  ]) {
    const document = round4Fixture();
    mutate(document);
    const result = validateRound4(document);
    assert.ok(result.errors.some(({ code: actual }) => actual === code), code);
  }
});

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

test("a caller-controlled schema fork cannot manufacture action authority", () => {
  const forkedSchema = clone(schema);
  forkedSchema.properties.governance.properties.auto_action = { type: "boolean" };
  forkedSchema.properties.governance.properties.authority_status = { type: "string" };
  forkedSchema.properties.governance.properties.action_authorised = { type: "boolean" };
  forkedSchema.properties.governance.properties.human_decision_required = { type: "boolean" };
  forkedSchema.properties.governance.properties.owner_ref = { type: ["string", "null"] };
  const changed = clone();
  Object.assign(changed.governance, {
    auto_action: true,
    authority_status: "verified",
    action_authorised: true,
    human_decision_required: false,
    owner_ref: "actor.attacker",
  });

  const result = validatePossiblePath(changed, { schema: forkedSchema });
  assert.equal(result.machine_valid, false, JSON.stringify(result, null, 2));
  assert.ok(result.errors.some(({ code }) => code === "AUTHORITY_BOUNDARY_INVALID"));
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

test("ratio, chance and qualitative-frequency claims cannot bypass the unscored boundary", () => {
  for (const phrase of [
    "Seven in ten cases follow this path",
    "This path has a 0.7 chance of occurring",
    "Most cases will follow this path",
  ]) {
    const changed = clone();
    changed.hypothesis_summary = phrase;
    expectError(changed, "FORBIDDEN_VERDICT_LANGUAGE");
  }
});

test("the deterministic ceiling still requires human review because it renders bounded free text", () => {
  const result = validate(fixture);
  assert.equal(result.public_narrative.deterministic_text, fixture.public_claim_ceiling);
  assert.equal(result.public_narrative.publication_status, "human-review-required");
});

test("quantification cannot move into another field rendered by the public ceiling", () => {
  const changed = clone();
  changed.population_accounting.affected_populations[0].label = "Seven in ten cases follow this path";
  changed.public_claim_ceiling = renderPublicClaimCeiling(changed);
  expectError(changed, "FORBIDDEN_VERDICT_LANGUAGE");
});

test("at least two distinct named competitors and a strongest selection cannot disappear", () => {
  const noCompetitor = clone();
  noCompetitor.competing_paths.pop();
  expectError(noCompetitor, "SCHEMA_INVALID");

  const noObservation = clone();
  noObservation.competing_paths[0].discriminating_observations = [];
  expectError(noObservation, "SCHEMA_INVALID");

  const duplicate = clone();
  duplicate.competing_paths[1].path_id = duplicate.competing_paths[0].path_id;
  expectError(duplicate, "DUPLICATE_COMPETING_PATH");

  const unresolvedStrongest = clone();
  unresolvedStrongest.strongest_competing_path_id = "path.synthetic.missing";
  expectError(unresolvedStrongest, "UNRESOLVED_STRONGEST_COMPETING_PATH");
});

test("the public ceiling names affected populations, omissions and competing paths", () => {
  for (const population of fixture.population_accounting.affected_populations) {
    assert.match(fixture.public_claim_ceiling, new RegExp(population.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const omission of fixture.population_accounting.omissions.entries) {
    assert.match(fixture.public_claim_ceiling, new RegExp(omission.public_notice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const competitor of fixture.competing_paths) {
    assert.match(fixture.public_claim_ceiling, new RegExp(competitor.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
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

test("false and unknown branches cannot indirectly re-enter a consequential route", () => {
  for (const branch of ["if_false", "if_unknown"]) {
    const changed = clone();
    changed.graph.edges[0].branches[branch].target_node_id = "node.negotiated-option";
    expectError(changed, "BLOCKED_BRANCH_NOT_TERMINAL");
  }
});

test("every entry-to-outcome route must accumulate every registered IF condition", () => {
  const changed = clone();
  const direct = clone(changed.graph.edges[0]);
  direct.edge_id = "edge.direct-incomplete";
  direct.to_node_id = "node.scoped-outcome";
  direct.kind = "transition";
  direct.branches.if_true.target_node_id = direct.to_node_id;
  changed.graph.edges.push(direct);

  expectError(changed, "OUTCOME_ROUTE_CONDITION_COVERAGE_INVALID");
});

test("abandonment and outcome nodes are sinks and graph cycles fail closed", () => {
  const abandonmentEscape = clone();
  const escape = clone(abandonmentEscape.graph.edges[0]);
  escape.edge_id = "edge.abandonment-escape";
  escape.from_node_id = "node.abandon";
  abandonmentEscape.graph.edges.push(escape);
  expectError(abandonmentEscape, "ABANDONMENT_NOT_SINK");

  const cycle = clone();
  const backEdge = clone(cycle.graph.edges[0]);
  backEdge.edge_id = "edge.back-to-baseline";
  backEdge.from_node_id = "node.negotiated-option";
  backEdge.to_node_id = "node.baseline";
  backEdge.branches.if_true.target_node_id = "node.baseline";
  cycle.graph.edges.push(backEdge);
  expectError(cycle, "GRAPH_CYCLE");
});
