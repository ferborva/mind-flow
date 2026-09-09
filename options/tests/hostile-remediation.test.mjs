import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateGates } from "../../contracts/evaluator.mjs";
import {
  checksumJson,
  validateConditionalOption,
} from "../validation.mjs";
import { renderConditionalOption } from "../renderer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const options = resolve(here, "..");
const contracts = resolve(options, "..", "contracts");

function fixture(directory, name) {
  return JSON.parse(readFileSync(join(directory, "fixtures", name), "utf8"));
}

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

const baseOption = fixture(options, "option.valid.json");
const baseCondition = fixture(contracts, "condition.valid.json");
const baseObservations = fixture(contracts, "observations.valid.json");
const completedRun = fixture(contracts, "evaluation-run.valid.json");
const failedAttempt = fixture(contracts, "evaluation-attempt.failed.valid.json");
const partialAttempt = fixture(contracts, "evaluation-attempt.partial.valid.json");
const asOf = "2026-09-08T00:00:00Z";

function definitionRef(condition) {
  return {
    id: condition.id,
    version: condition.definition_version,
    checksum: checksumJson(condition),
  };
}

function bindOption(option, condition) {
  option.condition_definition_ref = definitionRef(condition);
  option.scope = structuredClone(condition.scope);
}

function safeEvaluationBundle(condition = structuredClone(baseCondition), stateOverrides = {}) {
  const observations = structuredClone(baseObservations);
  const reference = definitionRef(condition);
  for (const observation of observations) {
    observation.condition_definition = structuredClone(reference);
  }
  const harm = observations.find(({ predicate_ref: ref }) => ref === "harm-material");
  harm.state = "false";
  harm.state_probability = 0.99;
  harm.reason = "Both synthetic reviews are below the declared material-harm threshold.";
  for (const [predicateRef, state] of Object.entries(stateOverrides)) {
    const observation = observations.find(({ predicate_ref: ref }) => ref === predicateRef);
    observation.state = state;
    observation.reason = `Hostile regression sets ${predicateRef} to ${state}.`;
    if (state === "true" || state === "false") observation.state_probability = 0.99;
  }

  const states = Object.fromEntries(observations.map(({ predicate_ref: ref, state }) => [ref, state]));
  const evaluated = evaluateGates(condition, states);
  const evaluationRun = structuredClone(completedRun);
  evaluationRun.id = "evaluation.au-clerical-access-margin.safe.20260908t0000z";
  evaluationRun.condition_definition = structuredClone(reference);
  evaluationRun.predicate_results = Object.fromEntries(observations.map((observation) => [
    observation.predicate_ref,
    {
      observation_id: observation.id,
      state: observation.state,
      reason: observation.reason,
    },
  ]));
  evaluationRun.gate_results = evaluated.gates;
  evaluationRun.condition_resolution = evaluated.condition_resolution;
  return { observations, evaluation_run: evaluationRun };
}

function settingsFor(condition = structuredClone(baseCondition)) {
  return {
    condition,
    evaluation_bundle: safeEvaluationBundle(condition),
    as_of: asOf,
  };
}

test("display-bearing scope values cannot inject headings or imperatives", () => {
  for (const injected of [
    "local basket.\n\n# AUTHORISED: ACT NOW",
    "transfer funds immediately",
    "safe-looking\u202Egnidaeh",
    "<h1>APPROVED</h1>",
  ]) {
    const condition = structuredClone(baseCondition);
    const option = structuredClone(baseOption);
    condition.scope.services = [injected];
    bindOption(option, condition);
    option.object.service_ref = injected;

    const result = validateConditionalOption(option, settingsFor(condition));
    assert.equal(result.valid, false, JSON.stringify(injected));
    assert.ok(hasCode(result, "UNSAFE_DISPLAY_STRING"), JSON.stringify(injected));
  }
});

test("only a completed reproducible eligible true-gate bundle can support an option", () => {
  const condition = structuredClone(baseCondition);
  const option = structuredClone(baseOption);
  bindOption(option, condition);

  const missing = validateConditionalOption(option, { condition, as_of: asOf });
  assert.ok(hasCode(missing, "MISSING_EVALUATION_BUNDLE"));

  for (const [name, evaluationRun] of [
    ["failed", failedAttempt],
    ["partial", partialAttempt],
  ]) {
    const result = validateConditionalOption(option, {
      condition,
      evaluation_bundle: {
        observations: structuredClone(baseObservations),
        evaluation_run: structuredClone(evaluationRun),
      },
      as_of: evaluationRun.recorded_at,
    });
    assert.equal(result.valid, false, name);
    assert.ok(hasCode(result, "EVALUATION_RUN_SCHEMA_INVALID"), name);
  }

  const conflicted = validateConditionalOption(option, {
    condition,
    evaluation_bundle: {
      observations: structuredClone(baseObservations),
      evaluation_run: structuredClone(completedRun),
    },
    as_of: asOf,
  });
  assert.ok(hasCode(conflicted, "GATE_NOT_TRUE"));
  assert.ok(hasCode(conflicted, "GATE_NOT_ELIGIBLE"));

  assert.deepEqual(validateConditionalOption(option, settingsFor(condition)), {
    valid: true,
    errors: [],
  });
});

test("safety gates derive eligibility from the recomputed safety-control axis", () => {
  const condition = structuredClone(baseCondition);
  const option = structuredClone(baseOption);
  bindOption(option, condition);
  option.bound_gate = "reverse";
  option.verb = "reverse";
  option.cross_actor_dependencies[0].gate_ref = "reverse";
  option.protected_outcome = {
    outcome_ref: "candidate.outcome.material-net-harm",
    condition_predicate_ref: "harm-material",
    measure_ref: "protective-action-net-harm",
    operator: "gt",
    direction: "at-or-above",
    threshold: { value: 10, unit: "index-points" },
  };
  const result = validateConditionalOption(option, {
    condition,
    evaluation_bundle: safeEvaluationBundle(condition, { "harm-material": "true" }),
    as_of: asOf,
  });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("protected outcomes must be positive required enabling predicates", () => {
  const condition = structuredClone(baseCondition);
  const blocker = structuredClone(baseOption);
  bindOption(blocker, condition);
  blocker.protected_outcome = {
    outcome_ref: "candidate.outcome.material-net-harm",
    condition_predicate_ref: "harm-material",
    measure_ref: "protective-action-net-harm",
    operator: "gt",
    direction: "at-or-above",
    threshold: { value: 10, unit: "index-points" },
  };
  assert.ok(hasCode(
    validateConditionalOption(blocker, settingsFor(condition)),
    "OUTCOME_NOT_POSITIVE_REQUIRED_ENABLER",
  ));

  const negated = structuredClone(baseOption);
  bindOption(negated, condition);
  negated.bound_gate = "watch";
  negated.verb = "assess";
  negated.object = {
    class: "study",
    vocabulary_ref: "option-object.scoped-evidence-review",
    service_ref: negated.object.service_ref,
  };
  negated.cross_actor_dependencies[0].gate_ref = "watch";
  negated.protected_outcome = {
    outcome_ref: "candidate.outcome.authority-suspended",
    condition_predicate_ref: "authority-suspended",
    measure_ref: "legal-authority-suspended",
    operator: "eq",
    direction: "maintain",
    threshold: { value: 1, unit: "boolean" },
  };
  assert.ok(hasCode(
    validateConditionalOption(negated, settingsFor(condition)),
    "OUTCOME_NOT_POSITIVE_REQUIRED_ENABLER",
  ));

  const optionalCondition = structuredClone(baseCondition);
  optionalCondition.gates.act = {
    any: [
      { predicate_ref: "access-falling" },
      { predicate_ref: "output-rising" },
    ],
  };
  const optional = structuredClone(baseOption);
  bindOption(optional, optionalCondition);
  assert.ok(hasCode(
    validateConditionalOption(optional, settingsFor(optionalCondition)),
    "OUTCOME_NOT_POSITIVE_REQUIRED_ENABLER",
  ));

  const neqCondition = structuredClone(baseCondition);
  neqCondition.predicates["access-falling"].operator = "neq";
  const neqOption = structuredClone(baseOption);
  bindOption(neqOption, neqCondition);
  neqOption.protected_outcome.operator = "neq";
  neqOption.protected_outcome.direction = "increase";
  assert.ok(hasCode(
    validateConditionalOption(neqOption, settingsFor(neqCondition)),
    "OUTCOME_OPERATOR_UNSUPPORTED",
  ));
});

test("the public envelope binds every decision semantic", () => {
  const condition = structuredClone(baseCondition);
  const settings = settingsFor(condition);
  const option = structuredClone(baseOption);
  bindOption(option, condition);
  const baseline = renderConditionalOption(option, settings);

  assert.equal(baseline.record_version, "2.0.0");
  assert.equal(baseline.option_ref.version, option.option_version);
  assert.equal(baseline.option_ref.checksum, checksumJson(option));
  for (const field of [
    "action",
    "protected_outcome",
    "readiness_dependencies",
    "cross_actor_dependencies",
    "review",
    "provenance",
    "expiry_effect",
  ]) assert.ok(Object.hasOwn(baseline, field), field);

  const mutations = [
    (value) => { value.protected_outcome.outcome_ref = "candidate.outcome.changed"; },
    (value) => { value.readiness_dependencies.authority = { kind: "authority", state: "candidate", candidate_ref: { id: "candidate.dependency.changed", trust_state: "unverified-candidate", checksum: `sha256:${"9".repeat(64)}` } }; },
    (value) => { value.cross_actor_dependencies[0].actor_ref = "candidate.actor.changed"; },
    (value) => { value.review.criteria_refs = ["criterion.changed"]; },
    (value) => { value.provenance.source_claims[0].checksum = `sha256:${"8".repeat(64)}`; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(option);
    mutate(changed);
    const record = renderConditionalOption(changed, settings);
    assert.notEqual(record.output_digest, baseline.output_digest);
    assert.notEqual(record.option_ref.checksum, baseline.option_ref.checksum);
  }
});

test("condition, approval, option, evaluation and as_of chronology is causal", () => {
  const condition = structuredClone(baseCondition);
  const option = structuredClone(baseOption);
  bindOption(option, condition);
  option.provenance.generated_at = "2026-04-05T00:00:00Z";
  option.review.review_due_at = "2026-09-09T00:00:00Z";
  option.expires_at = "2026-09-30T00:00:00Z";
  assert.ok(hasCode(
    validateConditionalOption(option, settingsFor(condition)),
    "OPTION_GENERATED_BEFORE_CONDITION_VALID",
  ));

  const futureApprovalCondition = structuredClone(baseCondition);
  futureApprovalCondition.governance.lifecycle = "paused";
  futureApprovalCondition.governance.approved_by = [{
    organisation: "attacker",
    role: "self-approver",
    approved_at: "2099-01-01T00:00:00Z",
  }];
  const futureApprovalOption = structuredClone(baseOption);
  bindOption(futureApprovalOption, futureApprovalCondition);
  assert.ok(hasCode(
    validateConditionalOption(futureApprovalOption, settingsFor(futureApprovalCondition)),
    "CONDITION_APPROVAL_AFTER_AS_OF",
  ));
});

test("actor and dissent text explicitly labels caller-supplied unverified assertions", () => {
  const condition = structuredClone(baseCondition);
  const option = structuredClone(baseOption);
  bindOption(option, condition);
  option.actor_ref = "candidate.actor.indigenous-community";
  option.actor_class = "government";
  option.dissent = {
    status: "recorded",
    records: [{
      id: "dissent.fabricated",
      actor_ref: "candidate.actor.indigenous-community",
      actor_class: "indigenous-authority",
      concern: "evidence",
      source_claim: {
        id: "candidate.source.fabricated",
        trust_state: "unverified",
        checksum: `sha256:${"a".repeat(64)}`,
      },
    }],
  };
  const record = renderConditionalOption(option, settingsFor(condition));
  assert.equal(record.assertion_trust, "caller-supplied-unverified");
  assert.equal(record.actor_ref.trust_state, "caller-supplied-unverified");
  assert.match(record.text, /caller-supplied unverified actor assertion/i);
  assert.match(record.text, /caller-supplied unverified dissent assertion/i);
  assert.doesNotMatch(record.text, /\bDissent recorded:/i);
});
