import assert from "node:assert/strict";
import test from "node:test";

import {
  EVALUATOR_VERSION,
  GATE_TRUTH_STATES,
  GATES,
  PREDICATE_TRUTH_STATES,
  STATES,
  TRUTH_TABLES,
  evaluateExpression,
  evaluateGates,
  proposeTransition,
  resolveCondition,
} from "../evaluator.mjs";

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

const expectedAlternativeIf = expectedAny;

const expectedVetoIf = {
  true:       { true: "false", false: "true",       unknown: "unknown", stale: "stale",      conflicted: "conflicted" },
  false:      { true: "false", false: "false",      unknown: "false",   stale: "false",      conflicted: "false" },
  unknown:    { true: "false", false: "unknown",    unknown: "unknown", stale: "unknown",    conflicted: "unknown" },
  stale:      { true: "false", false: "stale",      unknown: "unknown", stale: "stale",      conflicted: "unknown" },
  conflicted: { true: "false", false: "conflicted", unknown: "unknown", stale: "unknown",    conflicted: "conflicted" },
};

test("five-valued NOT, ALL and ANY truth tables are explicit and complete", () => {
  assert.equal(EVALUATOR_VERSION, "2.0.0");
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
  const priorState = (lifecycle) => ({
    schema_version: "1.0.0",
    artifact_type: "lifecycle-state",
    id: `lifecycle-state.test.${lifecycle}`,
    lifecycle_vocabulary: "condition-transition-lifecycle/1.0.0",
    lifecycle,
    recorded_at: "2026-09-07T00:00:00Z",
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic test record",
    },
  });
  const propose = (states, lifecycle, ownerEvent = null) => proposeTransition(
    evaluate(states),
    priorState(lifecycle),
    ownerEvent,
  );

  const activation = propose({ act: "true" }, "inactive");
  assert.equal(activation.proposal_version, "1.0.0");
  assert.equal(activation.lifecycle_mapping_version, "1.0.0");
  assert.equal(activation.prior_state_ref.lifecycle, "inactive");
  assert.match(activation.prior_state_ref.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(activation.owner_event_ref, null);
  assert.equal(activation.proposal, "consider_activation");
  assert.equal(activation.proposed_lifecycle, "active");
  assert.equal(activation.authority_effect, "none");
  assert.equal(activation.automatic_transition, false);
  assert.equal(activation.automatic_support_withdrawal, false);
  assert.deepEqual(activation.concurrent_duties, []);
  assert.deepEqual(activation.transition_conflicts, []);

  assert.equal(
    propose({ prepare: "true", watch: "true" }, "watching").proposal,
    "consider_preparation",
  );
  assert.equal(
    propose({ act: "true" }, "paused").proposal,
    "consider_resume",
  );

  const noLongerTriggered = propose({ watch: "true" }, "active");
  assert.equal(noLongerTriggered.proposal, "continue_active");
  assert.equal(noLongerTriggered.proposed_lifecycle, "active");
  assert.equal(noLongerTriggered.automatic_support_withdrawal, false);

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
  const priorState = {
    schema_version: "1.0.0",
    artifact_type: "lifecycle-state",
    id: "lifecycle-state.test.inactive",
    lifecycle_vocabulary: "condition-transition-lifecycle/1.0.0",
    lifecycle: "inactive",
    recorded_at: "2026-09-07T00:00:00Z",
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

  const forgedEligibility = structuredClone(valid);
  forgedEligibility.condition_resolution.candidate_phase_eligible = false;
  assert.throws(
    () => proposeTransition(forgedEligibility, priorState),
    /resolution does not match/i,
  );

  const unresolvedForgery = structuredClone(valid);
  unresolvedForgery.condition_resolution.unresolved_hard_safeguards = ["reverse"];
  assert.throws(
    () => proposeTransition(unresolvedForgery, priorState),
    /resolution does not match/i,
  );

  const incomplete = structuredClone(valid);
  delete incomplete.gates.prepare;
  incomplete.errors = [{ code: "MISSING_GATE", gate: "prepare" }];
  assert.throws(() => proposeTransition(incomplete, priorState), /complete.*evaluation/i);
});

test("recovering is preserved without a checksum-bound recovery-exit event", () => {
  const gates = Object.fromEntries(GATES.map((gate) => [gate, { state: "false" }]));
  gates.act.state = "true";
  const evaluation = { gates, errors: [] };
  evaluation.condition_resolution = resolveCondition(evaluation);
  const priorState = {
    schema_version: "1.0.0",
    artifact_type: "lifecycle-state",
    id: "lifecycle-state.test.recovering",
    lifecycle_vocabulary: "condition-transition-lifecycle/1.0.0",
    lifecycle: "recovering",
    recorded_at: "2026-09-07T00:00:00Z",
    trust_state: "unverified-external",
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic test record",
    },
  };

  const proposal = proposeTransition(evaluation, priorState);
  assert.equal(proposal.proposal, "await_recovery_exit_event");
  assert.equal(proposal.proposed_lifecycle, "recovering");
  assert.equal(proposal.owner_event_ref, null);

  const ownerEvent = {
    schema_version: "1.0.0",
    artifact_type: "owner-transition-event",
    id: "owner-event.test.exit-recovery",
    event_type: "recovery-exit",
    lifecycle_mapping_version: "1.0.0",
    prior_state_ref: proposal.prior_state_ref,
    evaluation_run_ref: {
      artifact_type: "evaluation-run",
      id: "evaluation.test.recovery-exit-basis",
      version: "2.0.0",
      checksum: `sha256:${"4".repeat(64)}`,
    },
    from_lifecycle: "recovering",
    to_lifecycle: "active",
    recorded_at: "2026-09-07T12:00:00Z",
    trust_state: "unverified-external",
    owner: { organisation: "Test only", role: "unverified owner" },
    provenance: {
      producer: { organisation: "Test only", role: "fixture" },
      method: "Synthetic unverified owner event",
    },
  };
  const exitProposal = proposeTransition(evaluation, priorState, ownerEvent);
  assert.equal(exitProposal.proposal, "consider_recovery_exit");
  assert.equal(exitProposal.proposed_lifecycle, "active");
  assert.equal(exitProposal.owner_event_ref.trust_state, "unverified-external");
  assert.match(exitProposal.owner_event_ref.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(exitProposal.authority_effect, "none");

  const forgedEvent = structuredClone(ownerEvent);
  forgedEvent.prior_state_ref.checksum = `sha256:${"0".repeat(64)}`;
  assert.throws(
    () => proposeTransition(evaluation, priorState, forgedEvent),
    /not bound to the prior state/i,
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
