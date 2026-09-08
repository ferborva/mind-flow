import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { evaluateGates } from "../evaluator.mjs";
import {
  checksumJson,
  validateActionBinding,
  validateEvaluationBundle,
} from "../semantic-validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(here, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readContract = (name) => readJson(join(contracts, "schema", name));
const readFixture = (name) => readJson(join(contracts, "fixtures", name));

const conditionSchema = readContract("condition-contract.schema.json");
const observationSchema = readContract("predicate-observation.schema.json");
const runSchema = readContract("evaluation-run.schema.json");
const actionSchema = readContract("action-contract.schema.json");
const condition = readFixture("condition.valid.json");
const observations = readFixture("observations.valid.json");
const run = readFixture("evaluation-run.valid.json");
const action = readFixture("action.valid.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateCondition = ajv.compile(conditionSchema);
const validateObservation = ajv.compile(observationSchema);
const validateRun = ajv.compile(runSchema);
const validateAction = ajv.compile(actionSchema);
const clone = (value) => structuredClone(value);

test("v2 separates immutable definition, observations and evaluation run", () => {
  assert.match(condition.schema_version, /^2\.0\./);
  assert.equal(conditionSchema.$id, "https://mind-flow.org/contracts/condition-definition/2-0-0");
  assert.equal(Object.hasOwn(condition, "evaluation"), false);
  assert.equal(Object.hasOwn(condition, "evidence_catalog"), false);
  assert.equal(validateCondition(condition), true, ajv.errorsText(validateCondition.errors));

  assert.ok(observations.length > 0);
  for (const observation of observations) {
    assert.equal(validateObservation(observation), true, ajv.errorsText(validateObservation.errors));
    assert.ok(observation.reason);
    assert.ok(observation.coverage);
    assert.ok(observation.uncertainty);
    assert.ok(observation.provenance);
  }
  assert.equal(validateRun(run), true, ajv.errorsText(validateRun.errors));
});

test("a completed run pins the definition and reproduces every gate output", () => {
  assert.equal(run.condition_definition.checksum, checksumJson(condition));
  const result = validateEvaluationBundle(condition, observations, run);
  assert.deepEqual(result, { valid: true, errors: [] });

  assert.deepEqual(
    Object.fromEntries(Object.entries(run.gate_results).map(([gate, output]) => [gate, output.state])),
    {
      watch: "true",
      act: "conflicted",
      pause: "false",
      reverse: "conflicted",
      recover: "unknown",
      graduate: "stale",
    },
  );
});

test("semantic validation rejects invalid dates, coverage and references", () => {
  const badDates = clone(observations);
  badDates[0].period.end = "2026-09-09T00:00:00Z";
  assert.ok(validateEvaluationBundle(condition, badDates, run).errors.some(
    (error) => error.code === "OBSERVATION_RECORDED_BEFORE_PERIOD_END",
  ));

  const badCoverage = clone(observations);
  badCoverage[0].coverage.observed = badCoverage[0].coverage.expected + 1;
  assert.ok(validateEvaluationBundle(condition, badCoverage, run).errors.some(
    (error) => error.code === "OBSERVATION_COVERAGE_EXCEEDS_EXPECTED",
  ));

  const incompleteCoverage = clone(observations);
  incompleteCoverage[0].coverage.observed = 1;
  assert.ok(validateEvaluationBundle(condition, incompleteCoverage, run).errors.some(
    (error) => error.code === "OBSERVATION_COVERAGE_BELOW_POLICY",
  ));

  const earlyEvidence = clone(observations);
  earlyEvidence[0].evidence[0].retrieved_at = "2026-06-01T00:00:00Z";
  assert.ok(validateEvaluationBundle(condition, earlyEvidence, run).errors.some(
    (error) => error.code === "EVIDENCE_RETRIEVED_BEFORE_PERIOD_END",
  ));

  const reversedUncertainty = clone(observations);
  reversedUncertainty[0].uncertainty.lower = 1;
  reversedUncertainty[0].uncertainty.upper = -1;
  assert.ok(validateEvaluationBundle(condition, reversedUncertainty, run).errors.some(
    (error) => error.code === "UNCERTAINTY_BOUNDS_REVERSED",
  ));

  const wrongDefinition = clone(run);
  wrongDefinition.condition_definition.checksum = `sha256:${"0".repeat(64)}`;
  assert.ok(validateEvaluationBundle(condition, observations, wrongDefinition).errors.some(
    (error) => error.code === "DEFINITION_CHECKSUM_MISMATCH",
  ));

  const wrongObservation = clone(run);
  wrongObservation.predicate_results["access-falling"].observation_id = "observation.missing";
  assert.ok(validateEvaluationBundle(condition, observations, wrongObservation).errors.some(
    (error) => error.code === "OBSERVATION_REFERENCE_MISMATCH",
  ));
});

test("recorded gate traces cannot disagree with deterministic re-evaluation", () => {
  const tampered = clone(run);
  tampered.gate_results.act.state = "true";
  const result = validateEvaluationBundle(condition, observations, tampered);
  assert.ok(result.errors.some((error) => error.code === "GATE_RESULT_MISMATCH"));

  const tamperedResolution = clone(run);
  tamperedResolution.action_resolution.decision = "act";
  tamperedResolution.action_resolution.activation_allowed = true;
  assert.ok(validateEvaluationBundle(condition, observations, tamperedResolution).errors.some(
    (error) => error.code === "ACTION_RESOLUTION_MISMATCH",
  ));
});

test("semantic validation rejects undeclared gate and reversibility references", () => {
  const unknownPredicate = clone(condition);
  unknownPredicate.gates.watch.all[0].predicate_ref = "predicate.missing";
  assert.ok(validateEvaluationBundle(unknownPredicate, observations, run).errors.some(
    (error) => error.code === "UNKNOWN_GATE_PREDICATE",
  ));

  const unknownGate = clone(action);
  unknownGate.reversibility.pause = "advance";
  assert.ok(validateActionBinding(condition, unknownGate).errors.some(
    (error) => error.code === "ACTION_REVERSIBILITY_GATE_MISSING",
  ));

  const ambiguousUnless = clone(condition);
  ambiguousUnless.gates.act = {
    unless: {
      condition: { predicate_ref: "access-falling" },
      exception: { predicate_ref: "authority-suspended" },
    },
  };
  assert.ok(validateActionBinding(ambiguousUnless, action).errors.some(
    (error) => error.code === "DEPRECATED_UNLESS_OPERATOR",
  ));
});

test("the fictional action is shadow-only and pins the same definition", () => {
  assert.equal(validateAction(action), true, ajv.errorsText(validateAction.errors));
  assert.equal(action.lifecycle, "shadow");
  assert.equal(action.funding.status, "conditional");
  assert.deepEqual(action.approved_by, []);
  assert.deepEqual(validateActionBinding(condition, action), { valid: true, errors: [] });

  const expiredFunding = clone(action);
  expiredFunding.funding.valid_through = "2026-09-07T00:00:00Z";
  assert.ok(validateActionBinding(condition, expiredFunding).errors.some(
    (error) => error.code === "FUNDING_EXPIRES_BEFORE_ACTION",
  ));
});

test("active actions require a safe completed gate resolution", () => {
  const active = clone(action);
  active.lifecycle = "active";
  active.funding.status = "secured";
  active.approved_by = [{
    organisation: "Synthetic review body",
    role: "test approver",
    approved_at: "2026-09-08T00:00:00Z",
  }];

  assert.ok(validateActionBinding(condition, active).errors.some(
    (error) => error.code === "ACTION_ACTIVATION_EVALUATION_REQUIRED",
  ));

  const safeStates = Object.fromEntries(
    Object.keys(condition.predicates).map((predicateRef) => [predicateRef, "false"]),
  );
  safeStates["access-falling"] = "true";
  safeStates["output-rising"] = "true";
  const safeEvaluation = evaluateGates(condition, safeStates);
  assert.equal(safeEvaluation.action_resolution.activation_allowed, true);
  assert.deepEqual(validateActionBinding(condition, active, safeEvaluation), {
    valid: true,
    errors: [],
  });

  const unresolvedReverse = evaluateGates(condition, {
    ...safeStates,
    "harm-material": "conflicted",
  });
  assert.equal(unresolvedReverse.gates.act.state, "conflicted");
  assert.equal(unresolvedReverse.gates.reverse.state, "conflicted");
  assert.ok(validateActionBinding(condition, active, unresolvedReverse).errors.some(
    (error) => error.code === "ACTION_ACTIVATION_BLOCKED",
  ));

  const incomplete = clone(safeEvaluation);
  delete incomplete.gates.recover;
  assert.ok(validateActionBinding(condition, active, incomplete).errors.some(
    (error) => error.code === "ACTION_ACTIVATION_EVALUATION_INVALID",
  ));
});
