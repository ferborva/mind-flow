import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  deriveResultingLifecycleState,
  evaluateGates,
  proposeTransition,
} from "../evaluator.mjs";
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
    approved_at: "2026-09-08T00:00:00Z",
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

function syntheticSourceOwnerEvent(approved, lifecycle, recordedAt) {
  const transitions = {
    watching: ["watch", "inactive"],
    preparing: ["prepare", "inactive"],
    active: ["activate", "inactive"],
    paused: ["pause", "active"],
    reversing: ["reverse", "active"],
    recovering: ["begin-recovery", "inactive"],
    graduated: ["graduate", "active"],
  };
  const [eventType, fromLifecycle] = transitions[lifecycle];
  return {
    schema_version: "1.0.0",
    id: `owner-event.synthetic.${lifecycle}.20260907`,
    action_ref: actionReference(approved),
    transition_proposal_ref: {
      id: `transition-proposal.synthetic.${lifecycle}`,
      version: "1.0.0",
      checksum: `sha256:${"3".repeat(64)}`,
    },
    evaluation_run_ref: {
      id: `evaluation.synthetic.${lifecycle}`,
      version: "3.0.0",
      checksum: `sha256:${"4".repeat(64)}`,
    },
    prior_state_ref: {
      id: `action-state.synthetic.${fromLifecycle}`,
      version: "1.0.0",
      checksum: `sha256:${"5".repeat(64)}`,
      lifecycle: fromLifecycle,
      trust_state: "unverified-external",
    },
    event_type: eventType,
    from_lifecycle: fromLifecycle,
    to_lifecycle: lifecycle,
    recorded_at: recordedAt,
    trust_state: "unverified-external",
    owner: clone(approved.owner),
    provenance: {
      producer: { organisation: "Synthetic action owner", role: "state recorder" },
      method: "Embedded unverified owner event for contract testing",
    },
  };
}

function priorState(approved, lifecycle = "inactive", recordedAt = null) {
  const effectiveRecordedAt = recordedAt ?? (lifecycle === "inactive"
    ? "2026-09-07T12:00:00Z"
    : "2026-09-08T00:00:00Z");
  if (lifecycle !== "inactive") {
    return deriveResultingLifecycleState(
      approved,
      syntheticSourceOwnerEvent(approved, lifecycle, effectiveRecordedAt),
    );
  }
  return {
    schema_version: "1.0.0",
    id: `action-state.${approved.id}.${lifecycle}.20260907`,
    action_ref: actionReference(approved),
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle,
    recorded_at: effectiveRecordedAt,
    lineage: { kind: "initial-assertion" },
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

test("a held action proposal preserves whether its basis gate was false, unknown or stale", () => {
  const { activeCondition, activeObservations, activeRun } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);

  for (const basisGateState of ["false", "unknown", "stale"]) {
    const predicateStates = Object.fromEntries(
      activeObservations.map(({ predicate_ref: predicateRef, state: observationState }) => [
        predicateRef,
        predicateRef === "access-falling" ? basisGateState : observationState,
      ]),
    );
    const evaluated = evaluateGates(activeCondition, predicateStates);
    const matchingRun = clone(activeRun);
    matchingRun.id = `${activeRun.id}.${basisGateState}`;
    matchingRun.gate_results = clone(evaluated.gates);
    matchingRun.condition_resolution = clone(evaluated.condition_resolution);

    const proposal = proposeTransition(
      evaluated,
      approved,
      state,
      matchingRun,
      "2026-09-08T00:00:30Z",
    );
    assert.equal(proposal.proposal, "hold");
    assert.equal(proposal.basis_gate_state, basisGateState);
    assert.equal(validateProposalSchema(proposal), true, ajv.errorsText(validateProposalSchema.errors));
  }
});

test("the owner event follows and exactly enacts the computed proposal", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");
  const event = ownerEvent(approved, activeRun, state, proposal);
  const resultingState = deriveResultingLifecycleState(approved, event);
  assert.equal(validateEventSchema(event), true, ajv.errorsText(validateEventSchema.errors));
  assert.equal(validateStateSchema(resultingState), true, ajv.errorsText(validateStateSchema.errors));
  assert.deepEqual(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    event,
    resultingState,
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
    deriveResultingLifecycleState(approved, contradiction),
  ).errors.some(({ code }) => code === "OWNER_EVENT_PROPOSAL_MISMATCH"));

  const expiredEvent = clone(event);
  expiredEvent.recorded_at = "2028-01-01T00:00:00Z";
  assert.throws(
    () => deriveResultingLifecycleState(approved, expiredEvent),
    /action-bound owner event/i,
  );
  const expired = validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    expiredEvent,
    null,
  );
  assert.ok(expired.errors.some(({ code }) => code === "OWNER_EVENT_AFTER_ACTION_EXPIRY"));
  assert.ok(expired.errors.some(({ code }) => code === "OWNER_EVENT_AFTER_FUNDING_VALIDITY"));
  assert.ok(expired.errors.some(({ code }) => code === "OWNER_EVENT_AFTER_CONDITION_EXPIRY"));
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

  const watchAction = clone(approved);
  watchAction.gate = "watch";
  const watchingState = priorState(watchAction, "watching");
  const continuing = proposeTransition(
    { gates: activeRun.gate_results, condition_resolution: activeRun.condition_resolution, errors: [] },
    watchAction,
    watchingState,
    activeRun,
    "2026-09-08T00:00:30Z",
  );
  const selfEvent = ownerEvent(watchAction, activeRun, watchingState, continuing, {
    event_type: "watch",
    from_lifecycle: "watching",
    to_lifecycle: "watching",
  });
  assert.equal(validateEventSchema(selfEvent), false, "unchanged state cannot be represented as an event");
  assert.deepEqual(validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    watchAction,
    watchingState,
    continuing,
    null,
    null,
  ), { valid: true, errors: [] });
});

test("shadow condition governance cannot support an operational claim", () => {
  const shadowApproved = clone(action);
  shadowApproved.gate = "prepare";
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
    null,
  ).errors.some(({ code }) => code === "CONDITION_LIFECYCLE_NOT_OPERATIONAL"));
});

test("condition approval must not follow evaluation or operational transition chronology", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  activeCondition.governance.approved_by[0].approved_at = "2026-09-09T00:00:00Z";
  const reference = {
    id: activeCondition.id,
    version: activeCondition.definition_version,
    checksum: checksumJson(activeCondition),
  };
  for (const observation of activeObservations) observation.condition_definition = clone(reference);
  activeRun.condition_definition = clone(reference);
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");
  const event = ownerEvent(approved, activeRun, state, proposal);
  const result = validateOperationalActionState(
    activeCondition,
    activeObservations,
    activeRun,
    approved,
    state,
    proposal,
    event,
    deriveResultingLifecycleState(approved, event),
  );
  assert.ok(result.errors.some(({ code }) => code === "TRANSITION_EVALUATION_BUNDLE_INVALID"));
});

test("state patch versions are accepted consistently and non-initial states require event lineage", () => {
  const { activeCondition, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  state.schema_version = "1.0.1";
  assert.equal(validateStateSchema(state), true, ajv.errorsText(validateStateSchema.errors));
  assert.doesNotThrow(() => proposeTransition(
    evaluated,
    approved,
    state,
    activeRun,
    "2026-09-08T00:00:30Z",
  ));

  const fabricated = priorState(approved, "graduated");
  delete fabricated.lineage;
  assert.equal(validateStateSchema(fabricated), false, "non-initial state without lineage must fail");
  assert.throws(
    () => proposeTransition(evaluated, approved, fabricated, activeRun, "2026-09-08T00:00:30Z"),
    /lifecycle-state record/i,
  );

  fabricated.lineage = {
    kind: "owner-transition-event",
    owner_event_ref: {
      id: "owner-event.fabricated",
      version: "1.0.0",
      checksum: `sha256:${"2".repeat(64)}`,
    },
  };
  assert.equal(validateStateSchema(fabricated), false, "an event reference without the event must fail");
  assert.throws(
    () => proposeTransition(evaluated, approved, fabricated, activeRun, "2026-09-08T00:00:30Z"),
    /lifecycle-state record/i,
  );

  const impossibleHistory = priorState(approved, "active");
  impossibleHistory.lineage.owner_event.prior_state_ref.lifecycle = "graduated";
  impossibleHistory.lineage.owner_event_ref.checksum = checksumJson(
    impossibleHistory.lineage.owner_event,
  );
  assert.equal(
    validateStateSchema(impossibleHistory),
    true,
    "schema shape alone cannot prove the embedded event's lifecycle transition",
  );
  assert.throws(
    () => proposeTransition(
      evaluated,
      approved,
      impossibleHistory,
      activeRun,
      "2026-09-08T00:00:30Z",
    ),
    /lifecycle-state record/i,
    "a source event whose pinned prior lifecycle contradicts its from-state must fail",
  );

  assert.throws(
    () => deriveResultingLifecycleState(
      approved,
      syntheticSourceOwnerEvent(approved, "active", "2026-09-07T23:59:59Z"),
    ),
    /action-bound owner event/i,
    "an embedded source event cannot predate action validity",
  );

  const relabelledState = priorState(approved, "active");
  relabelledState.id = "action-state.reused-constant";
  assert.equal(validateStateSchema(relabelledState), true, ajv.errorsText(validateStateSchema.errors));
  assert.throws(
    () => proposeTransition(evaluated, approved, relabelledState, activeRun, "2026-09-08T00:00:30Z"),
    /lifecycle-state record/i,
    "a derived state ID must remain bound to the source event digest",
  );

  const roleConfused = priorState(approved, "active");
  roleConfused.lineage.owner_event.transition_proposal_ref.version = "9.9.9";
  roleConfused.lineage.owner_event.evaluation_run_ref.version = "9.9.9";
  roleConfused.lineage.owner_event.prior_state_ref.version = "9.9.9";
  roleConfused.lineage.owner_event_ref.checksum = checksumJson(roleConfused.lineage.owner_event);
  assert.equal(
    validateStateSchema(roleConfused),
    false,
    "embedded owner-event references must retain their role-specific versions",
  );
  assert.throws(
    () => proposeTransition(evaluated, approved, roleConfused, activeRun, "2026-09-08T00:00:30Z"),
    /lifecycle-state record/i,
  );

  const wrongOwnerEvent = syntheticSourceOwnerEvent(
    approved,
    "active",
    "2026-09-08T00:00:00Z",
  );
  wrongOwnerEvent.owner = { organisation: "Different body", role: "unbound operator" };
  assert.throws(
    () => deriveResultingLifecycleState(approved, wrongOwnerEvent),
    /action-bound owner event/i,
    "a source event cannot assert a different owner from the action",
  );

  const approvedLater = clone(approved);
  approvedLater.approved_by[0].approved_at = "2026-09-08T00:00:10Z";
  const beforeApprovalEvent = syntheticSourceOwnerEvent(
    approvedLater,
    "active",
    "2026-09-08T00:00:05Z",
  );
  assert.throws(
    () => deriveResultingLifecycleState(approvedLater, beforeApprovalEvent),
    /action-bound owner event/i,
    "a source event cannot predate action approval",
  );

  const impossibleTupleState = priorState(approved, "active");
  impossibleTupleState.lineage.owner_event.event_type = "pause";
  impossibleTupleState.lineage.owner_event.from_lifecycle = "active";
  impossibleTupleState.lineage.owner_event_ref.checksum = checksumJson(
    impossibleTupleState.lineage.owner_event,
  );
  impossibleTupleState.id = `action-state.${approved.id}.active.${
    impossibleTupleState.lineage.owner_event_ref.checksum.slice("sha256:".length)
  }`;
  assert.equal(
    validateStateSchema(impossibleTupleState),
    false,
    "the nested owner event must enforce the standalone transition matrix",
  );
  assert.throws(
    () => deriveResultingLifecycleState(approved, impossibleTupleState.lineage.owner_event),
    /action-bound owner event/i,
  );
});

test("a changing operational claim must bind the exact resulting state", () => {
  const { activeCondition, activeObservations, activeRun, evaluated } = activeConditionAndRun();
  const approved = approvedAction(activeCondition);
  const state = priorState(approved);
  const proposal = proposeTransition(evaluated, approved, state, activeRun, "2026-09-08T00:00:30Z");
  const event = ownerEvent(approved, activeRun, state, proposal);

  const missing = validateOperationalActionState(
    activeCondition, activeObservations, activeRun, approved, state, proposal, event, null,
  );
  assert.ok(missing.errors.some(({ code }) => code === "RESULTING_STATE_REQUIRED"));

  const fabricated = deriveResultingLifecycleState(approved, event);
  fabricated.lifecycle = "graduated";
  const mismatched = validateOperationalActionState(
    activeCondition, activeObservations, activeRun, approved, state, proposal, event, fabricated,
  );
  assert.ok(mismatched.errors.some(({ code }) => code === "RESULTING_STATE_MISMATCH"));
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
