import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { evaluateGates, proposeTransition } from "../evaluator.mjs";
import {
  checksumJson,
  validateEvaluationBundle,
  validateOperationalActionState,
  validateTransitionBundle,
} from "../semantic-validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(here, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = (name) => readJson(join(contracts, "fixtures", name));
const schema = (name) => readJson(join(contracts, "schema", name));
const clone = (value) => structuredClone(value);

const condition = fixture("condition.valid.json");
const observations = fixture("observations.valid.json");
const run = fixture("evaluation-run.valid.json");
const action = fixture("action.valid.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateRunSchema = ajv.compile(schema("evaluation-run.schema.json"));
const validateActionSchema = ajv.compile(schema("action-contract.schema.json"));
const validateStateSchema = ajv.compile(schema("action-lifecycle-state.schema.json"));
const validateProposalSchema = ajv.compile(schema("transition-proposal.schema.json"));
const validateEventSchema = ajv.compile(schema("owner-transition-event.schema.json"));

function actionReference(value) {
  return { id: value.id, version: value.action_version, checksum: checksumJson(value) };
}

function runReference(value) {
  return { id: value.id, version: value.schema_version, checksum: checksumJson(value) };
}

function stateReference(value) {
  return {
    id: value.id,
    version: value.schema_version,
    checksum: checksumJson(value),
    lifecycle: value.lifecycle,
    trust_state: value.trust_state,
  };
}

function activeConditionAndRun() {
  const activeCondition = clone(condition);
  activeCondition.governance.lifecycle = "active";
  activeCondition.governance.approved_by = [{
    organisation: "Synthetic external review body",
    role: "test approver",
    approved_at: "2026-09-07T00:00:00Z",
  }];
  const reference = {
    id: activeCondition.id,
    version: activeCondition.definition_version,
    checksum: checksumJson(activeCondition),
  };
  const activeObservations = clone(observations);
  for (const observation of activeObservations) observation.condition_definition = clone(reference);
  const harm = activeObservations.find(({ predicate_ref }) => predicate_ref === "harm-material");
  harm.state = "false";
  harm.state_probability = 0.99;
  harm.reason = "Both synthetic reviews are below the declared material-harm threshold.";
  const evaluated = evaluateGates(activeCondition, Object.fromEntries(
    activeObservations.map(({ predicate_ref, state }) => [predicate_ref, state]),
  ));
  const activeRun = clone(run);
  activeRun.id = "evaluation.au-clerical-access-margin.active.20260908t0000z";
  activeRun.condition_definition = clone(reference);
  activeRun.predicate_results = Object.fromEntries(activeObservations.map((observation) => [
    observation.predicate_ref,
    { observation_id: observation.id, state: observation.state, reason: observation.reason },
  ]));
  activeRun.gate_results = evaluated.gates;
  activeRun.condition_resolution = evaluated.condition_resolution;
  return { activeCondition, activeObservations, activeRun, evaluated };
}

function approvedAction(activeCondition) {
  const approved = clone(action);
  approved.condition_definition = {
    id: activeCondition.id,
    version: activeCondition.definition_version,
    checksum: checksumJson(activeCondition),
  };
  approved.record_lifecycle = "approved";
  approved.funding.status = "secured";
  approved.approved_by = [{
    organisation: "Synthetic external review body",
    role: "test approver",
    approved_at: "2026-09-08T00:00:00Z",
  }];
  return approved;
}

function priorState(approved, lifecycle = "inactive", recordedAt = "2026-09-07T12:00:00Z") {
  return {
    schema_version: "1.0.0",
    id: `action-state.${approved.id}.${lifecycle}.20260907`,
    action_ref: actionReference(approved),
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle,
    recorded_at: recordedAt,
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Synthetic action owner", role: "state recorder" },
      method: "Unverified external state assertion for contract testing",
    },
  };
}

function ownerEvent(approved, activeRun, state, proposal, overrides = {}) {
  return {
    schema_version: "1.0.0",
    id: `owner-event.${approved.id}.activate.20260908`,
    action_ref: actionReference(approved),
    transition_proposal_ref: {
      id: proposal.id,
      version: proposal.schema_version,
      checksum: checksumJson(proposal),
    },
    evaluation_run_ref: runReference(activeRun),
    prior_state_ref: stateReference(state),
    event_type: "activate",
    from_lifecycle: state.lifecycle,
    to_lifecycle: proposal.proposed_lifecycle,
    recorded_at: "2026-09-08T00:01:00Z",
    trust_state: "unverified-external",
    owner: clone(approved.owner),
    provenance: {
      producer: clone(approved.owner),
      method: "Unverified external owner transition assertion for contract testing",
    },
    ...overrides,
  };
}

test("evaluation is pure and action record governance is separate from operational state", () => {
  assert.equal(validateRunSchema(run), true, ajv.errorsText(validateRunSchema.errors));
  assert.equal(run.schema_version, "3.0.0");
  assert.equal(Object.hasOwn(run, "lifecycle_context"), false);
  assert.equal(Object.hasOwn(run, "transition_proposal"), false);

  assert.equal(validateActionSchema(action), true, ajv.errorsText(validateActionSchema.errors));
  assert.equal(action.schema_version, "4.0.0");
  assert.equal(action.record_lifecycle, "shadow");
  assert.equal(Object.hasOwn(action, "lifecycle"), false);
  assert.equal(Object.hasOwn(action, "operational_lifecycle"), false);
});

test("a transition proposal binds one action, completed run and prior state without an owner event", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");

  assert.equal(validateStateSchema(state), true, ajv.errorsText(validateStateSchema.errors));
  assert.equal(validateProposalSchema(proposal), true, ajv.errorsText(validateProposalSchema.errors));
  assert.equal(proposal.action_ref.checksum, checksumJson(approved));
  assert.equal(proposal.evaluation_run_ref.checksum, checksumJson(activeRun));
  assert.equal(proposal.prior_state_ref.checksum, checksumJson(state));
  assert.equal(proposal.proposed_lifecycle, "active");
  assert.equal(Object.hasOwn(proposal, "owner_event_ref"), false);
  assert.deepEqual(validateTransitionBundle(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
  ), { valid: true, errors: [] });
});

test("the owner event follows and exactly enacts the computed proposal", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");
  const event = ownerEvent(approved, activeRun, state, proposal);
  assert.equal(validateEventSchema(event), true, ajv.errorsText(validateEventSchema.errors));
  assert.deepEqual(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    event,
  ), { valid: true, errors: [] });

  const contradiction = clone(event);
  contradiction.event_type = "begin-recovery";
  contradiction.to_lifecycle = "recovering";
  assert.ok(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    contradiction,
  ).errors.some(({ code }) => code === "OWNER_EVENT_PROPOSAL_MISMATCH"));
});

test("an unchanged proposal preserves the prior state without inventing an owner event", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved, "active");
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");

  assert.equal(proposal.proposal, "continue_active");
  assert.equal(proposal.proposed_lifecycle, state.lifecycle);
  assert.deepEqual(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    null,
  ), { valid: true, errors: [] });

  const inventedEvent = ownerEvent(approved, activeRun, state, proposal);
  assert.ok(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    inventedEvent,
  ).errors.some(({ code }) => code === "OWNER_EVENT_NOT_APPLICABLE"));
});

test("a proposal cannot predate action validity, approval or secured funding", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);

  approved.valid_from = "2026-09-08T00:00:45Z";
  approved.approved_by[0].approved_at = "2026-09-08T00:00:40Z";
  approved.funding.valid_through = "2026-09-08T00:00:20Z";
  state.action_ref = actionReference(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");
  const result = validateTransitionBundle(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
  );

  assert.ok(result.errors.some(({ code }) => code === "PROPOSAL_BEFORE_ACTION_VALID"));
  assert.ok(result.errors.some(({ code }) => code === "PROPOSAL_BEFORE_ACTION_APPROVAL"));
  assert.ok(result.errors.some(({ code }) => code === "PROPOSAL_AFTER_FUNDING_VALIDITY"));
});

test("watching and preparing proposals have enactable event tuples", () => {
  const { activeCondition, activeObservations, activeRun } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);

  for (const [gate, lifecycle, eventType] of [
    ["watch", "watching", "watch"],
    ["prepare", "preparing", "prepare"],
  ]) {
    const gateAction = clone(approved);
    gateAction.gate = gate;
    const gateState = priorState(gateAction);
    const proposal = proposeTransition(
      { gates: activeRun.gate_results, condition_resolution: activeRun.condition_resolution, errors: [] },
      gateAction,
      gateState,
      activeRun,
      "2026-09-08T00:00:30Z",
    );
    assert.equal(proposal.proposed_lifecycle, lifecycle);
    const event = ownerEvent(gateAction, activeRun, gateState, proposal, {
      id: `owner-event.${gateAction.id}.${eventType}.20260908`,
      event_type: eventType,
    });
    assert.equal(validateEventSchema(event), true, ajv.errorsText(validateEventSchema.errors));
  }
  assert.deepEqual(validateEvaluationBundle(activeCondition, activeObservations, activeRun), {
    valid: true,
    errors: [],
  });
  assert.equal(state.lifecycle, "inactive");
});

test("shadow condition governance cannot support an operational claim", () => {
  const shadowApproved = clone(action);
  shadowApproved.record_lifecycle = "approved";
  shadowApproved.funding.status = "secured";
  shadowApproved.approved_by = [{
    organisation: "Synthetic external review body",
    role: "test approver",
    approved_at: "2026-09-08T00:00:00Z",
  }];
  const evaluated = {
    gates: run.gate_results,
    condition_resolution: run.condition_resolution,
    errors: [],
  };
  const state = priorState(shadowApproved);
  const proposal = proposeTransition(evaluated, shadowApproved, state, run, "2026-09-08T00:00:30Z");
  const event = ownerEvent(shadowApproved, run, state, proposal, {
    event_type: proposal.proposed_lifecycle === "active" ? "activate" : "prepare",
  });
  assert.ok(validateOperationalActionState(
    condition,
    observations,
    run,
    shadowApproved,
    state,
    proposal,
    event,
  ).errors.some(({ code }) => code === "CONDITION_LIFECYCLE_NOT_OPERATIONAL"));
});

test("prior state must predate evaluation and patch run versions remain representable", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const futureState = priorState(approved, "inactive", "2026-09-09T00:00:00Z");
  assert.throws(
    () => proposeTransition(evaluated, approved, futureState, activeRun, "2026-09-09T00:00:01Z"),
    /prior state.*after.*evaluation/i,
  );

  const eventSchema = schema("owner-transition-event.schema.json");
  assert.equal(eventSchema.$defs.evaluationRunReference.properties.version.pattern, "^3\\.0\\.[0-9]+$");
  assert.deepEqual(validateEvaluationBundle(activeCondition, activeObservations, activeRun), {
    valid: true,
    errors: [],
  });
});
