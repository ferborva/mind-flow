import assert from "node:assert/strict";
import test from "node:test";

import {
  EVALUATOR_VERSION,
  GATE_TRUTH_STATES,
  GATES,
  PREDICATE_TRUTH_STATES,
  STATES,
  TRUTH_TABLES,
  deriveResultingLifecycleState,
  evaluateExpression,
  evaluateGates,
  proposeTransition,
  resolveCondition,
} from "../evaluator.mjs";
import { checksumJson } from "../semantic-validation.mjs";

const ref = (predicate_ref) => ({ predicate_ref });
const states = (...values) =>
  Object.fromEntries(values.map((state, index) => [String.fromCharCode(97 + index), state]));

const expectedNot = {
  true: "false",
  false: "true",
  unknown: "unknown",
  stale: "stale",
  conflicted: "conflicted",
};

const expectedAll = {
  true:       { true: "true",       false: "false", unknown: "unknown", stale: "stale",      conflicted: "conflicted" },
  false:      { true: "false",      false: "false", unknown: "false",   stale: "false",      conflicted: "false" },
  unknown:    { true: "unknown",    false: "false", unknown: "unknown", stale: "unknown",    conflicted: "unknown" },
  stale:      { true: "stale",      false: "false", unknown: "unknown", stale: "stale",      conflicted: "unknown" },
  conflicted: { true: "conflicted", false: "false", unknown: "unknown", stale: "unknown",    conflicted: "conflicted" },
};

const expectedAny = {
  true:       { true: "true",  false: "true",       unknown: "true",       stale: "true",       conflicted: "true" },
  false:      { true: "true",  false: "false",      unknown: "unknown",    stale: "stale",      conflicted: "conflicted" },
  unknown:    { true: "true",  false: "unknown",    unknown: "unknown",    stale: "unknown",    conflicted: "unknown" },
  stale:      { true: "true",  false: "stale",      unknown: "unknown",    stale: "stale",      conflicted: "unknown" },
  conflicted: { true: "true",  false: "conflicted", unknown: "unknown",    stale: "unknown",    conflicted: "conflicted" },
};

function syntheticSourceOwnerEvent(action, lifecycle, recordedAt = "2026-09-07T00:00:00Z") {
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
    id: `owner-event.synthetic.${lifecycle}`,
    action_ref: {
      id: action.id,
      version: action.action_version,
      checksum: checksumJson(action),
    },
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
    owner: { organisation: "Test only", role: "fixture owner" },
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Embedded unverified owner event for contract testing",
    },
  };
}

const expectedAlternativeIf = expectedAny;

const expectedVetoIf = {
  true:       { true: "false", false: "true",       unknown: "unknown", stale: "stale",      conflicted: "conflicted" },
  false:      { true: "false", false: "false",      unknown: "false",   stale: "false",      conflicted: "false" },
  unknown:    { true: "false", false: "unknown",    unknown: "unknown", stale: "unknown",    conflicted: "unknown" },
  stale:      { true: "false", false: "stale",      unknown: "unknown", stale: "stale",      conflicted: "unknown" },
  conflicted: { true: "false", false: "conflicted", unknown: "unknown", stale: "unknown",    conflicted: "conflicted" },
};

test("five-valued NOT, ALL and ANY truth tables are explicit and complete", () => {
  assert.equal(EVALUATOR_VERSION, "3.0.1");
  assert.deepEqual(PREDICATE_TRUTH_STATES, ["true", "false", "unknown", "stale", "conflicted"]);
  assert.deepEqual(GATE_TRUTH_STATES, PREDICATE_TRUTH_STATES);
  assert.deepEqual(STATES, ["true", "false", "unknown", "stale", "conflicted"]);
  assert.deepEqual(TRUTH_TABLES.not, expectedNot);
  assert.deepEqual(TRUTH_TABLES.all, expectedAll);
  assert.deepEqual(TRUTH_TABLES.any, expectedAny);

  for (const left of STATES) {
    for (const right of STATES) {
      assert.equal(
        evaluateExpression({ all: [ref("a"), ref("b")] }, states(left, right)).state,
        expectedAll[left][right],
      );
      assert.equal(
        evaluateExpression({ any: [ref("a"), ref("b")] }, states(left, right)).state,
        expectedAny[left][right],
      );
    }
    assert.equal(
      evaluateExpression({ not: ref("a") }, states(left)).state,
      expectedNot[left],
    );
  }
});

test("equivalent alternatives and veto blockers publish all 25 state pairs", () => {
  assert.deepEqual(TRUTH_TABLES.alternative_if, expectedAlternativeIf);
  assert.deepEqual(TRUTH_TABLES.veto_if, expectedVetoIf);

  for (const condition of STATES) {
    for (const alternative of STATES) {
      const actual = evaluateExpression(
        { alternative_if: { condition: ref("a"), alternative: ref("b") } },
        states(condition, alternative),
      );
      assert.equal(
        actual.state,
        expectedAlternativeIf[condition][alternative],
        `${condition} with equivalent alternative ${alternative}`,
      );
    }
    for (const blocker of STATES) {
      const actual = evaluateExpression(
        { veto_if: { condition: ref("a"), blocker: ref("b") } },
        states(condition, blocker),
      );
      assert.equal(
        actual.state,
        expectedVetoIf[condition][blocker],
        `${condition} with veto blocker ${blocker}`,
      );
    }
  }
});

test("ambiguous UNLESS is rejected instead of guessing its meaning", () => {
  const result = evaluateExpression(
    { unless: { condition: ref("a"), exception: ref("b") } },
    states("true", "false"),
  );
  assert.equal(result.state, null);
  assert.deepEqual(result.errors.map((error) => error.code), ["DEPRECATED_UNLESS"]);
});

test("equivalent alternatives and veto blockers preserve decisive traces", () => {
  const primary = evaluateExpression(
    { alternative_if: { condition: ref("a"), alternative: ref("b") } },
    states("true", "conflicted"),
  );
  assert.equal(primary.state, "true");
  assert.deepEqual(primary.trace.map((entry) => entry.predicate_ref), ["a"]);
  assert.deepEqual(primary.skipped_predicates, ["b"]);

  const alternative = evaluateExpression(
    { alternative_if: { condition: ref("a"), alternative: ref("b") } },
    states("false", "true"),
  );
  assert.equal(alternative.state, "true");
  assert.deepEqual(alternative.trace.map((entry) => entry.predicate_ref), ["a", "b"]);
  assert.deepEqual(alternative.decisive_predicates, ["b"]);

  const blocked = evaluateExpression(
    { veto_if: { condition: ref("a"), blocker: ref("b") } },
    states("conflicted", "true"),
  );
  assert.equal(blocked.state, "false");
  assert.deepEqual(blocked.trace.map((entry) => entry.predicate_ref), ["b"]);
  assert.deepEqual(blocked.skipped_predicates, ["a"]);

  const uncertain = evaluateExpression(
    { veto_if: { condition: ref("a"), blocker: ref("b") } },
    states("false", "unknown"),
  );
  assert.equal(uncertain.state, "false");
  assert.deepEqual(uncertain.trace.map((entry) => entry.predicate_ref), ["b", "a"]);
  assert.deepEqual(uncertain.uncertain_predicates, ["b"]);
  assert.deepEqual(uncertain.decisive_predicates, ["a"]);
});

test("mixed uncertainty reasons do not manufacture an ordinal hierarchy", () => {
  for (const left of ["unknown", "stale", "conflicted"]) {
    for (const right of ["unknown", "stale", "conflicted"]) {
      const expected = left === right ? left : "unknown";
      assert.equal(
        evaluateExpression({ all: [ref("a"), ref("b")] }, states(left, right)).state,
        expected,
        `ALL ${left}, ${right}`,
      );
      assert.equal(
        evaluateExpression({ any: [ref("a"), ref("b")] }, states(left, right)).state,
        expected,
        `ANY ${left}, ${right}`,
      );
    }
  }
});

test("short-circuiting occurs only for decisive false in ALL and true in ANY", () => {
  const all = evaluateExpression(
    { all: [ref("a"), ref("b"), ref("c")] },
    states("unknown", "false", "conflicted"),
  );
  assert.equal(all.state, "false");
  assert.deepEqual(all.trace.map((entry) => entry.predicate_ref), ["a", "b"]);
  assert.deepEqual(all.decisive_predicates, ["b"]);
  assert.deepEqual(all.uncertain_predicates, ["a"]);
  assert.deepEqual(all.skipped_predicates, ["c"]);

  const any = evaluateExpression(
    { any: [ref("a"), ref("b"), ref("c")] },
    states("stale", "true", "conflicted"),
  );
  assert.equal(any.state, "true");
  assert.deepEqual(any.trace.map((entry) => entry.predicate_ref), ["a", "b"]);
  assert.deepEqual(any.decisive_predicates, ["b"]);
  assert.deepEqual(any.uncertain_predicates, ["a"]);
  assert.deepEqual(any.skipped_predicates, ["c"]);
});

test("invalid expressions and predicate references are errors, not uncertain states", () => {
  const unknownReference = evaluateExpression(ref("missing"), {}, {
    known_predicates: ["known"],
  });
  assert.equal(unknownReference.state, null);
  assert.deepEqual(unknownReference.errors.map((error) => error.code), [
    "UNKNOWN_PREDICATE_REFERENCE",
  ]);

  const missingState = evaluateExpression(ref("known"), {}, {
    known_predicates: ["known"],
  });
  assert.equal(missingState.state, null);
  assert.deepEqual(missingState.errors.map((error) => error.code), [
    "MISSING_PREDICATE_STATE",
  ]);

  const invalidState = evaluateExpression(ref("known"), { known: "maybe" }, {
    known_predicates: ["known"],
  });
  assert.equal(invalidState.state, null);
  assert.deepEqual(invalidState.errors.map((error) => error.code), [
    "INVALID_PREDICATE_STATE",
  ]);

  const malformed = evaluateExpression({ all: [ref("known"), ref("known")], any: [] }, {
    known: "true",
  });
  assert.equal(malformed.state, null);
  assert.equal(malformed.errors[0].code, "INVALID_EXPRESSION");

  const hiddenBehindShortCircuit = evaluateExpression(
    { all: [ref("known"), ref("missing")] },
    { known: "false" },
    { known_predicates: ["known"] },
  );
  assert.equal(hiddenBehindShortCircuit.state, null);
  assert.deepEqual(hiddenBehindShortCircuit.errors.map((item) => item.code), [
    "UNKNOWN_PREDICATE_REFERENCE",
  ]);
});

test("all seven gates evaluate independently with complete trace and no mutation", () => {
  const contract = {
    predicates: Object.fromEntries([
      "access-falling",
      "readiness-useful",
      "output-rising",
      "harm-material",
      "authority-suspended",
      "delivery-slow",
      "access-restored",
      "earnings-restored",
      "appeals-low",
    ].map((id) => [id, {}])),
    gates: {
      watch: { all: [ref("access-falling"), { not: ref("authority-suspended") }] },
      prepare: ref("readiness-useful"),
      act: {
        veto_if: {
          condition: { all: [ref("access-falling"), ref("output-rising")] },
          blocker: { any: [ref("harm-material"), ref("authority-suspended")] },
        },
      },
      pause: ref("delivery-slow"),
      reverse: ref("harm-material"),
      recover: { all: [ref("access-restored"), ref("earnings-restored")] },
      graduate: { all: [ref("access-restored"), ref("appeals-low")] },
    },
  };
  const predicateStates = {
    "access-falling": "true",
    "readiness-useful": "true",
    "output-rising": "true",
    "harm-material": "false",
    "authority-suspended": "false",
    "delivery-slow": "false",
    "access-restored": "true",
    "earnings-restored": "true",
    "appeals-low": "true",
  };
  const before = structuredClone({ contract, predicateStates });
  const result = evaluateGates(contract, predicateStates);

  assert.deepEqual(GATES, ["watch", "prepare", "act", "pause", "reverse", "recover", "graduate"]);
  assert.deepEqual(
    Object.fromEntries(GATES.map((gate) => [gate, result.gates[gate].state])),
    {
      watch: "true",
      prepare: "true",
      act: "true",
      pause: "false",
      reverse: "false",
      recover: "true",
      graduate: "true",
    },
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual({ contract, predicateStates }, before);
  assert.deepEqual(evaluateGates(contract, predicateStates), result, "evaluation must be deterministic");
});

test("condition resolution is orthogonal, non-authorising and safety-first", () => {
  const evaluated = (overrides = {}) => ({
    gates: Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }])),
    errors: [],
    ...overrides,
  });
  const withStates = (statesByGate) => evaluated({
    gates: Object.fromEntries(GATES.map((gate) => [
      gate,
      { state: Object.hasOwn(statesByGate, gate) ? statesByGate[gate] : "false" },
    ])),
  });

  assert.deepEqual(resolveCondition(withStates({ act: "true" })), {
    input_state_axis: "gate_truth",
    safety_control: "none",
    candidate_phase: "act",
    concurrent_duties: [],
    exit_candidate: "none",
    candidate_phase_eligible: true,
    concurrent_duties_eligible: { watch: false, recover: false },
    exit_candidate_eligible: false,
    true_gates: ["act"],
    blocking_gates: [],
    unresolved_hard_safeguards: [],
    transition_conflicts: [],
  });
  assert.deepEqual(resolveCondition(withStates({ act: "true", pause: "true" })), {
    input_state_axis: "gate_truth",
    safety_control: "pause",
    candidate_phase: "act",
    concurrent_duties: [],
    exit_candidate: "none",
    candidate_phase_eligible: false,
    concurrent_duties_eligible: { watch: false, recover: false },
    exit_candidate_eligible: false,
    true_gates: ["act", "pause"],
    blocking_gates: ["pause"],
    unresolved_hard_safeguards: [],
    transition_conflicts: [],
  });
  assert.deepEqual(resolveCondition(withStates({
    watch: "true",
    prepare: "true",
    act: "true",
    pause: "true",
    reverse: "true",
    recover: "true",
  })), {
    input_state_axis: "gate_truth",
    safety_control: "reverse",
    candidate_phase: "act",
    concurrent_duties: ["watch", "recover"],
    exit_candidate: "none",
    candidate_phase_eligible: false,
    concurrent_duties_eligible: { watch: true, recover: true },
    exit_candidate_eligible: false,
    true_gates: ["watch", "prepare", "act", "pause", "reverse", "recover"],
    blocking_gates: ["reverse", "pause"],
    unresolved_hard_safeguards: [],
    transition_conflicts: [],
  });

  for (const safeguard of ["reverse", "pause"]) {
    for (const state of ["unknown", "stale", "conflicted", null, "invalid-state"]) {
      const result = resolveCondition(withStates({ act: "true", [safeguard]: state }));
      assert.equal(result.safety_control, "precautionary_hold", `${safeguard}=${state}`);
      assert.equal(result.candidate_phase_eligible, false, `${safeguard}=${state}`);
      assert.deepEqual(result.blocking_gates, [safeguard], `${safeguard}=${state}`);
      assert.deepEqual(
        result.unresolved_hard_safeguards,
        [safeguard],
        `${safeguard}=${state}`,
      );
    }
  }
});

test("graduation conflicts fail closed while recovery remains concurrent", () => {
  const withStates = (statesByGate) => ({
    gates: Object.fromEntries(GATES.map((gate) => [
      gate,
      { state: Object.hasOwn(statesByGate, gate) ? statesByGate[gate] : "false" },
    ])),
    errors: [],
  });

  const actAndGraduate = resolveCondition(withStates({ act: "true", graduate: "true" }));
  assert.equal(actAndGraduate.candidate_phase, "act");
  assert.equal(actAndGraduate.exit_candidate, "graduate");
  assert.equal(actAndGraduate.candidate_phase_eligible, false);
  assert.equal(actAndGraduate.exit_candidate_eligible, false);
  assert.deepEqual(actAndGraduate.transition_conflicts, ["act_and_graduate"]);

  const recoverAndGraduate = resolveCondition(withStates({ recover: "true", graduate: "true" }));
  assert.deepEqual(recoverAndGraduate.concurrent_duties, ["recover"]);
  assert.equal(recoverAndGraduate.exit_candidate, "graduate");
  assert.equal(recoverAndGraduate.concurrent_duties_eligible.recover, false);
  assert.equal(recoverAndGraduate.exit_candidate_eligible, false);
  assert.deepEqual(recoverAndGraduate.transition_conflicts, ["recover_and_graduate"]);

  const preparationDuringExitConflict = resolveCondition(withStates({
    watch: "true",
    prepare: "true",
    recover: "true",
    graduate: "true",
  }));
  assert.equal(preparationDuringExitConflict.candidate_phase_eligible, false);
  assert.equal(preparationDuringExitConflict.concurrent_duties_eligible.watch, true);
  assert.equal(preparationDuringExitConflict.concurrent_duties_eligible.recover, false);
  assert.equal(preparationDuringExitConflict.exit_candidate_eligible, false);

  const recoverOnly = resolveCondition(withStates({ recover: "true" }));
  assert.equal(recoverOnly.candidate_phase_eligible, false);
  assert.equal(recoverOnly.concurrent_duties_eligible.recover, true);
  assert.equal(recoverOnly.exit_candidate_eligible, false);

  const graduateOnly = resolveCondition(withStates({ graduate: "true" }));
  assert.equal(graduateOnly.candidate_phase_eligible, false);
  assert.equal(graduateOnly.concurrent_duties_eligible.recover, false);
  assert.equal(graduateOnly.exit_candidate_eligible, true);
});

test("stateful transition proposals never authorise or withdraw support", () => {
  const evaluate = (statesByGate) => {
    const evaluation = {
    gates: Object.fromEntries(GATES.map((gate) => [
      gate,
      { state: Object.hasOwn(statesByGate, gate) ? statesByGate[gate] : "false" },
    ])),
    errors: [],
    };
    evaluation.condition_resolution = resolveCondition(evaluation);
    return evaluation;
  };
  const actionFor = (gate = "act") => ({
    id: `action.test.${gate}`,
    action_version: "1.0.0",
    gate,
  });
  const run = {
    id: "evaluation.test.transition",
    schema_version: "3.0.0",
    run_status: "completed",
    evaluated_at: "2026-09-08T00:00:00Z",
  };
  const priorState = (lifecycle, action) => lifecycle === "inactive" ? ({
    schema_version: "1.0.0",
    id: `action-state.${action.id}.${lifecycle}`,
    action_ref: {
      id: action.id,
      version: action.action_version,
      checksum: checksumJson(action),
    },
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle,
    recorded_at: "2026-09-07T00:00:00Z",
    lineage: { kind: "initial-assertion" },
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic test record",
    },
  }) : deriveResultingLifecycleState(action, syntheticSourceOwnerEvent(action, lifecycle));
  const propose = (states, lifecycle, gate = "act") => {
    const action = actionFor(gate);
    const evaluation = evaluate(states);
    const matchingRun = {
      ...run,
      gate_results: evaluation.gates,
      condition_resolution: evaluation.condition_resolution,
    };
    return proposeTransition(
      evaluation,
      action,
      priorState(lifecycle, action),
      matchingRun,
      "2026-09-08T00:00:30Z",
    );
  };

  const activation = propose({ act: "true" }, "inactive");
  assert.equal(activation.schema_version, "1.0.0");
  assert.equal(activation.prior_state_ref.lifecycle, "inactive");
  assert.match(activation.prior_state_ref.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.match(activation.action_ref.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.match(activation.evaluation_run_ref.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(activation.proposal, "consider_activation");
  assert.equal(activation.proposed_lifecycle, "active");
  assert.equal(activation.authority_effect, "none");
  assert.equal(activation.automatic_transition, false);
  assert.equal(activation.automatic_support_withdrawal, false);
  assert.deepEqual(activation.concurrent_duties, []);
  assert.deepEqual(activation.transition_conflicts, []);

  assert.equal(
    propose({ prepare: "true", watch: "true" }, "watching", "prepare").proposal,
    "consider_preparation",
  );
  assert.equal(
    propose({ act: "true", prepare: "false" }, "inactive", "prepare").proposal,
    "hold",
    "a true act gate cannot substitute for a prepare-bound action's false gate",
  );
  assert.equal(
    propose({ act: "true", prepare: "true" }, "inactive", "prepare").proposal,
    "consider_preparation",
    "a lower-priority true prepare gate remains independently actionable",
  );
  assert.equal(
    propose({ act: "true" }, "paused").proposal,
    "consider_resume",
  );

  const noLongerTriggered = propose({ watch: "true" }, "active");
  assert.equal(noLongerTriggered.proposal, "continue_active");
  assert.equal(noLongerTriggered.proposed_lifecycle, "active");
  assert.equal(noLongerTriggered.automatic_support_withdrawal, false);

  const continuingWatch = propose({ watch: "true" }, "watching", "watch");
  assert.equal(continuingWatch.proposal, "continue_watching");
  assert.equal(continuingWatch.proposed_lifecycle, "watching");

  const reverseWithRecovery = propose({ reverse: "true", recover: "true" }, "active");
  assert.equal(reverseWithRecovery.proposal, "consider_reversal");
  assert.equal(reverseWithRecovery.proposed_lifecycle, "reversing");
  assert.deepEqual(reverseWithRecovery.concurrent_duties, ["recover"]);

  const unresolvedPause = propose({ pause: "stale" }, "active");
  assert.equal(unresolvedPause.proposal, "consider_precautionary_pause");
  assert.equal(unresolvedPause.proposed_lifecycle, "paused");

  const inactiveUnresolved = propose({ pause: "stale" }, "inactive");
  assert.equal(inactiveUnresolved.proposal, "hold");
  assert.equal(inactiveUnresolved.proposed_lifecycle, "inactive");

  const conflict = propose({ act: "true", graduate: "true" }, "active");
  assert.equal(conflict.proposal, "hold_for_review");
  assert.equal(conflict.proposed_lifecycle, "active");

  const conflictWithReversal = propose(
    { act: "true", reverse: "true", graduate: "true" },
    "active",
  );
  assert.equal(conflictWithReversal.proposal, "consider_reversal");
  assert.equal(conflictWithReversal.proposed_lifecycle, "reversing");
  assert.deepEqual(conflictWithReversal.transition_conflicts, ["act_and_graduate"]);

  const noReactivation = propose({ act: "true" }, "graduated");
  assert.equal(noReactivation.proposal, "hold_for_new_contract");
  assert.equal(noReactivation.proposed_lifecycle, "graduated");
});

test("transition proposals reject incomplete or forged evaluations", () => {
  const action = { id: "action.test.act", action_version: "1.0.0", gate: "act" };
  const run = {
    id: "evaluation.test.transition-validation",
    schema_version: "3.0.0",
    run_status: "completed",
    evaluated_at: "2026-09-08T00:00:00Z",
  };
  const priorState = {
    schema_version: "1.0.0",
    id: "action-state.test.inactive",
    action_ref: {
      id: action.id,
      version: action.action_version,
      checksum: checksumJson(action),
    },
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle: "inactive",
    recorded_at: "2026-09-07T00:00:00Z",
    lineage: { kind: "initial-assertion" },
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic test record",
    },
  };
  const gates = Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }]));
  gates.act.state = "true";
  const valid = { gates, errors: [] };
  valid.condition_resolution = resolveCondition(valid);
  run.gate_results = structuredClone(valid.gates);
  run.condition_resolution = structuredClone(valid.condition_resolution);

  const forgedEligibility = structuredClone(valid);
  forgedEligibility.condition_resolution.candidate_phase_eligible = false;
  assert.throws(
    () => proposeTransition(forgedEligibility, action, priorState, run, "2026-09-08T00:00:30Z"),
    /resolution does not match/i,
  );

  const unresolvedForgery = structuredClone(valid);
  unresolvedForgery.condition_resolution.unresolved_hard_safeguards = ["reverse"];
  assert.throws(
    () => proposeTransition(unresolvedForgery, action, priorState, run, "2026-09-08T00:00:30Z"),
    /resolution does not match/i,
  );

  const incomplete = structuredClone(valid);
  delete incomplete.gates.prepare;
  incomplete.errors = [{ code: "MISSING_GATE", gate: "prepare" }];
  assert.throws(
    () => proposeTransition(incomplete, action, priorState, run, "2026-09-08T00:00:30Z"),
    /complete.*evaluation/i,
  );

  const otherEvaluation = structuredClone(valid);
  otherEvaluation.gates.act.state = "false";
  otherEvaluation.condition_resolution = resolveCondition(otherEvaluation);
  const otherRun = {
    ...run,
    id: "evaluation.test.other-run",
    gate_results: otherEvaluation.gates,
    condition_resolution: otherEvaluation.condition_resolution,
  };
  assert.throws(
    () => proposeTransition(valid, action, priorState, otherRun, "2026-09-08T00:00:30Z"),
    /evaluation.*run/i,
  );
});

test("recovery exit is proposed before and separately from any owner event", () => {
  const gates = Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }]));
  gates.act.state = "true";
  const evaluation = { gates, errors: [] };
  evaluation.condition_resolution = resolveCondition(evaluation);
  const action = { id: "action.test.recovery-exit", action_version: "1.0.0", gate: "act" };
  const run = {
    id: "evaluation.test.recovery-exit-basis",
    schema_version: "3.0.0",
    run_status: "completed",
    evaluated_at: "2026-09-08T00:00:00Z",
    gate_results: structuredClone(evaluation.gates),
    condition_resolution: structuredClone(evaluation.condition_resolution),
  };
  const priorState = deriveResultingLifecycleState(
    action,
    syntheticSourceOwnerEvent(action, "recovering"),
  );

  const exitProposal = proposeTransition(
    evaluation,
    action,
    priorState,
    run,
    "2026-09-08T00:00:30Z",
  );
  assert.equal(exitProposal.proposal, "consider_recovery_exit");
  assert.equal(exitProposal.proposed_lifecycle, "active");
  assert.equal(Object.hasOwn(exitProposal, "owner_event_ref"), false);
  assert.equal(exitProposal.authority_effect, "none");

  const prepareBoundAction = { ...action, id: "action.test.recovery-prepare", gate: "prepare" };
  const prepareBoundState = deriveResultingLifecycleState(
    prepareBoundAction,
    syntheticSourceOwnerEvent(prepareBoundAction, "recovering"),
  );
  const wrongGateExit = proposeTransition(
    evaluation,
    prepareBoundAction,
    prepareBoundState,
    run,
    "2026-09-08T00:00:30Z",
  );
  assert.equal(wrongGateExit.proposal, "await_recovery_evidence");
  assert.equal(wrongGateExit.proposed_lifecycle, "recovering");

  const noExitGates = Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }]));
  const noExit = { gates: noExitGates, errors: [] };
  noExit.condition_resolution = resolveCondition(noExit);
  const noExitRun = {
    ...run,
    id: "evaluation.test.recovery-no-exit-basis",
    gate_results: structuredClone(noExit.gates),
    condition_resolution: structuredClone(noExit.condition_resolution),
  };
  const hold = proposeTransition(
    noExit,
    action,
    priorState,
    noExitRun,
    "2026-09-08T00:00:30Z",
  );
  assert.equal(hold.proposal, "await_recovery_evidence");
  assert.equal(hold.proposed_lifecycle, "recovering");
});

test("proposal IDs bind the evaluation run at the same generation instant", () => {
  const gates = Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }]));
  gates.act.state = "true";
  const evaluation = { gates, errors: [] };
  evaluation.condition_resolution = resolveCondition(evaluation);
  const action = { id: "action.test.collision", action_version: "1.0.0", gate: "act" };
  const priorState = {
    schema_version: "1.0.0",
    id: "action-state.test.collision",
    action_ref: { id: action.id, version: action.action_version, checksum: checksumJson(action) },
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle: "inactive",
    recorded_at: "2026-09-07T00:00:00Z",
    lineage: { kind: "initial-assertion" },
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic test record",
    },
  };
  const run = {
    id: "evaluation.test.collision.first",
    schema_version: "3.0.0",
    run_status: "completed",
    evaluated_at: "2026-09-08T00:00:00Z",
    gate_results: structuredClone(evaluation.gates),
    condition_resolution: structuredClone(evaluation.condition_resolution),
  };
  const secondRun = { ...run, id: "evaluation.test.collision.second" };
  const generatedAt = "2026-09-08T00:00:30Z";
  assert.notEqual(
    proposeTransition(evaluation, action, priorState, run, generatedAt).id,
    proposeTransition(evaluation, action, priorState, secondRun, generatedAt).id,
  );
});

test("gate evaluation reports missing gates and bad references without hiding valid gates", () => {
  const contract = {
    predicates: { ready: {} },
    gates: {
      watch: ref("ready"),
      prepare: ref("ready"),
      act: ref("absent"),
      pause: ref("ready"),
      reverse: ref("ready"),
      recover: ref("ready"),
    },
  };
  const result = evaluateGates(contract, { ready: "false" });

  assert.equal(result.gates.watch.state, "false");
  assert.equal(result.gates.act.state, null);
  assert.equal(result.gates.graduate.state, null);
  assert.deepEqual(result.errors.map((error) => error.code).sort(), [
    "MISSING_GATE",
    "UNKNOWN_PREDICATE_REFERENCE",
  ]);
});
