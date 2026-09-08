import assert from "node:assert/strict";
import test from "node:test";

import {
  GATE_TRUTH_STATES,
  GATES,
  PREDICATE_TRUTH_STATES,
  STATES,
  TRUTH_TABLES,
  evaluateExpression,
  evaluateGates,
  resolveAction,
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

test("all six gates evaluate independently with complete trace and no mutation", () => {
  const contract = {
    predicates: Object.fromEntries([
      "access-falling",
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

  assert.deepEqual(GATES, ["watch", "act", "pause", "reverse", "recover", "graduate"]);
  assert.deepEqual(
    Object.fromEntries(GATES.map((gate) => [gate, result.gates[gate].state])),
    {
      watch: "true",
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

test("action resolution pre-empts act and blocks unresolved hard safeguards", () => {
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

  assert.deepEqual(resolveAction(withStates({ act: "true" })), {
    input_state_axis: "gate_truth",
    decision: "act",
    activation_allowed: true,
    eligible_gates: ["act"],
    blocking_gates: [],
    unresolved_hard_safeguards: [],
  });
  assert.deepEqual(resolveAction(withStates({ act: "true", pause: "true" })), {
    input_state_axis: "gate_truth",
    decision: "pause",
    activation_allowed: false,
    eligible_gates: ["act", "pause"],
    blocking_gates: ["pause"],
    unresolved_hard_safeguards: [],
  });
  assert.deepEqual(resolveAction(withStates({ act: "true", pause: "true", reverse: "true" })), {
    input_state_axis: "gate_truth",
    decision: "reverse",
    activation_allowed: false,
    eligible_gates: ["act", "pause", "reverse"],
    blocking_gates: ["reverse", "pause"],
    unresolved_hard_safeguards: [],
  });

  for (const safeguard of ["reverse", "pause"]) {
    for (const state of ["unknown", "stale", "conflicted", null, "invalid-state"]) {
      const result = resolveAction(withStates({ act: "true", [safeguard]: state }));
      assert.equal(result.decision, "no_action", `${safeguard}=${state}`);
      assert.equal(result.activation_allowed, false, `${safeguard}=${state}`);
      assert.deepEqual(result.blocking_gates, [safeguard], `${safeguard}=${state}`);
      assert.deepEqual(
        result.unresolved_hard_safeguards,
        [safeguard],
        `${safeguard}=${state}`,
      );
    }
  }
});

test("gate evaluation reports missing gates and bad references without hiding valid gates", () => {
  const contract = {
    predicates: { ready: {} },
    gates: {
      watch: ref("ready"),
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
