import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(here, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const conditionSchema = readJson(join(contracts, "schema", "condition-contract.schema.json"));
const actionSchema = readJson(join(contracts, "schema", "action-contract.schema.json"));
const condition = readJson(join(contracts, "fixtures", "condition.valid.json"));
const action = readJson(join(contracts, "fixtures", "action.valid.json"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateCondition = ajv.compile(conditionSchema);
const validateAction = ajv.compile(actionSchema);

function clone(value) {
  return structuredClone(value);
}

function expectInvalid(validate, value, message) {
  assert.equal(validate(value), false, message);
  assert.ok(validate.errors?.length, `${message}: expected validation errors`);
}

function predicateRefs(expression) {
  if (expression.predicate_ref) return [expression.predicate_ref];
  if (expression.all) return expression.all.flatMap(predicateRefs);
  if (expression.any) return expression.any.flatMap(predicateRefs);
  if (expression.not) return predicateRefs(expression.not);
  if (expression.alternative_if) {
    return [
      ...predicateRefs(expression.alternative_if.condition),
      ...predicateRefs(expression.alternative_if.alternative),
    ];
  }
  if (expression.veto_if) {
    return [
      ...predicateRefs(expression.veto_if.condition),
      ...predicateRefs(expression.veto_if.blocker),
    ];
  }
  return [];
}

test("the immutable reference definition exercises the complete IF grammar", () => {
  assert.equal(validateCondition(condition), true, ajv.errorsText(validateCondition.errors));
  assert.deepEqual(Object.keys(condition.gates).sort(), [
    "act",
    "graduate",
    "pause",
    "prepare",
    "recover",
    "reverse",
    "watch",
  ]);

  const serialised = JSON.stringify(condition.gates);
  for (const operator of ['"all"', '"any"', '"not"', '"veto_if"']) {
    assert.match(serialised, new RegExp(operator), `fixture does not exercise ${operator}`);
  }
  assert.match(condition.schema_version, /^3\.0\./);
  assert.equal(Object.hasOwn(condition, "evaluation"), false);
  assert.equal(Object.hasOwn(condition, "evidence_catalog"), false);

  const withoutPrepare = clone(condition);
  delete withoutPrepare.gates.prepare;
  expectInvalid(validateCondition, withoutPrepare, "prepare is a required first-class gate");
});

test("the grammar separates equivalent alternatives from veto blockers", () => {
  const withAlternative = clone(condition);
  withAlternative.gates.watch = {
    alternative_if: {
      condition: { predicate_ref: "access-falling" },
      alternative: { predicate_ref: "output-rising" },
    },
  };
  assert.equal(validateCondition(withAlternative), true, ajv.errorsText(validateCondition.errors));

  const ambiguousUnless = clone(condition);
  ambiguousUnless.gates.watch = {
    unless: {
      condition: { predicate_ref: "access-falling" },
      exception: { predicate_ref: "authority-suspended" },
    },
  };
  expectInvalid(validateCondition, ambiguousUnless, "ambiguous unless must be rejected");
});

test("schemas name predicate truth and gate truth axes explicitly", () => {
  const observationSchema = readJson(join(contracts, "schema", "predicate-observation.schema.json"));
  const runSchema = readJson(join(contracts, "schema", "evaluation-run.schema.json"));
  const attemptSchema = readJson(join(contracts, "schema", "evaluation-attempt.schema.json"));
  const evaluatorRegistrySchema = readJson(join(contracts, "schema", "evaluator-registry.schema.json"));

  assert.ok(observationSchema.$defs.predicateTruthState);
  assert.ok(runSchema.$defs.predicateTruthState);
  assert.ok(runSchema.$defs.gateTruthState);
  assert.ok(attemptSchema.$defs.predicateTruthState);
  assert.ok(attemptSchema.$defs.gateTruthState);
  assert.equal(conditionSchema.$id, "https://mind-flow.org/contracts/condition-definition/3-0-0");
  assert.equal(actionSchema.$id, "https://mind-flow.org/contracts/action-contract/3-0-0");
  assert.equal(runSchema.$id, "https://mind-flow.org/contracts/evaluation-run/2-0-0");
  assert.equal(attemptSchema.$id, "https://mind-flow.org/contracts/evaluation-attempt/2-0-0");
  assert.equal(evaluatorRegistrySchema.$id, "https://mind-flow.org/contracts/evaluator-registry/1-0-0");
  assert.equal(action.required_gate_truth_state, "true");
  assert.equal(action.lifecycle_mapping_version, "1.0.0");
  assert.equal(Object.hasOwn(action, "required_condition_state"), false);
  assert.ok(runSchema.required.includes("condition_resolution"));
  assert.ok(runSchema.required.includes("transition_proposal"));
  assert.ok(runSchema.required.includes("lifecycle_context"));
  assert.equal(runSchema.required.includes("action_resolution"), false);
});

test("condition validation rejects unsafe or ambiguous contracts", () => {
  const noScope = clone(condition);
  delete noScope.scope;
  expectInvalid(validateCondition, noScope, "scope must be explicit");

  const weakPredicate = clone(condition);
  delete weakPredicate.predicates["access-falling"].evidence;
  expectInvalid(validateCondition, weakPredicate, "a predicate needs an evidence policy");

  const unreviewedApproval = clone(condition);
  unreviewedApproval.governance.lifecycle = "approved";
  unreviewedApproval.governance.approved_by = [];
  expectInvalid(validateCondition, unreviewedApproval, "approved conditions need an approver");
});

test("every evidence requirement resolves and can meet its source-count policy", () => {
  const evidenceIds = new Set(condition.evidence_requirements.map((record) => record.id));
  assert.equal(evidenceIds.size, condition.evidence_requirements.length, "evidence IDs must be unique");

  for (const expression of Object.values(condition.gates)) {
    for (const ref of predicateRefs(expression)) {
      const predicate = condition.predicates[ref];
      assert.ok(predicate, `missing predicate ${ref}`);
      for (const id of predicate.evidence.source_ids) {
        assert.ok(evidenceIds.has(id), `missing evidence record ${id}`);
      }
      assert.ok(
        predicate.evidence.source_ids.length >= predicate.evidence.minimum_sources,
        `${predicate.signal_id} cannot meet minimum_sources`,
      );
      assert.ok(
        predicate.window.persistence <= predicate.window.minimum_observations,
        `${predicate.signal_id} persistence exceeds available observations`,
      );
    }
  }

  assert.ok(
    Date.parse(condition.governance.valid_from) < Date.parse(condition.governance.expires_at),
    "condition expiry must follow its start",
  );
});

test("the reference action binds an IF gate to owned, reversible delivery", () => {
  assert.equal(validateAction(action), true, ajv.errorsText(validateAction.errors));
  assert.equal(action.condition_definition.id, condition.id);
  assert.equal(action.condition_definition.version, condition.definition_version);
  assert.ok(condition.gates[action.gate], "action references a missing condition gate");

  for (const gate of Object.values(action.reversibility)) {
    assert.ok(condition.gates[gate], `reversibility references missing gate ${gate}`);
  }

  const preparation = clone(action);
  preparation.gate = "prepare";
  preparation.verb = "rehearse";
  assert.equal(validateAction(preparation), true, ajv.errorsText(validateAction.errors));

  const withoutLifecycleMapping = clone(action);
  delete withoutLifecycleMapping.lifecycle_mapping_version;
  expectInvalid(
    validateAction,
    withoutLifecycleMapping,
    "action lifecycle imports require the versioned strict mapping",
  );
});

test("action validation rejects unowned or unfunded commitments", () => {
  const noAppeal = clone(action);
  delete noAppeal.appeal;
  expectInvalid(validateAction, noAppeal, "an affected person needs an appeal route");

  const noSla = clone(action);
  delete noSla.sla;
  expectInvalid(validateAction, noSla, "an action needs a response SLA");

  const unfundedApproval = clone(action);
  unfundedApproval.lifecycle = "approved";
  unfundedApproval.funding.status = "unfunded";
  unfundedApproval.approved_by = [{
    organisation: "Synthetic review body",
    role: "test approver",
    approved_at: "2026-09-08T00:00:00Z",
  }];
  expectInvalid(validateAction, unfundedApproval, "approved actions must be funded");

  const expiredBeforeValid = clone(action);
  expiredBeforeValid.expires_at = "not-a-date";
  expectInvalid(validateAction, expiredBeforeValid, "expiry must be machine-readable");
});
