import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  FIXED_EVALUATOR_REF,
  computeConditionDefinitionHash,
  computeObservationHash,
  computeSignalDefinitionHash,
  evaluateCondition,
  evaluateKernelCondition,
  evaluateTruthExpression,
  resealKernel,
  selectCurrentEvidence,
  validateExecutableIfKernel,
} from "../validate.mjs";

const fixturePath = resolve(import.meta.dirname, "../fixtures/kernel.synthetic.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const schema = readFileSync(resolve(import.meta.dirname, "../schema/executable-if-kernel.schema.json"), "utf8");
const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
const conformanceVectors = JSON.parse(readFileSync(
  resolve(import.meta.dirname, "../conformance-vectors.json"), "utf8",
));
const clone = (value) => structuredClone(value);

test("every condition requires a declared category and discretion belongs only to availability", () => {
  for (const category of [undefined, "optimism"]) {
    const changed = kernelThroughRevision((revised) => {
      if (category === undefined) delete revised.condition_category;
      else revised.condition_category = category;
    });
    assert.equal(validateExecutableIfKernel(changed).machine_valid, false);
  }
  const changed = kernelThroughRevision((revised) => {
    revised.condition_category = "price";
    revised.condition_subtype = "discretion";
  });
  assert.equal(validateExecutableIfKernel(changed).machine_valid, false);
});

test("standalone evaluation enforces categories, subtype and declared numeric range", () => {
  function evaluate(category, subtype, range, threshold = 0.8) {
    const item = clone(definition("condition.worker-option"));
    item.condition_category = category;
    if (subtype !== undefined) item.condition_subtype = subtype;
    const signals = clone(fixture.signals);
    if (range !== undefined) signals[0].value_range = range;
    signals[0].signal_definition_hash = computeSignalDefinitionHash(signals[0]);
    item.predicates["option-coverage"].signal_ref.signal_definition_hash = signals[0].signal_definition_hash;
    item.predicates["option-coverage"].threshold.value = threshold;
    item.definition_hash = computeConditionDefinitionHash(item);
    return evaluateCondition(item, signals, [], { evaluatedAt: "2026-06-01T00:00:00Z" });
  }
  for (const category of ["price", "permission", "proximity", "availability", "capability"]) {
    assert.equal(evaluate(category).mechanically_valid_for_evaluation, true);
  }
  assert.equal(evaluate("availability", "discretion").mechanically_valid_for_evaluation, true);
  for (const [category, subtype] of [[undefined, undefined], ["invented", undefined], ["price", "discretion"]]) {
    assert.equal(evaluate(category, subtype).mechanically_valid_for_evaluation, false);
  }
  for (const range of [{ minimum: 1, maximum: 0 }, { minimum: 0, maximum: 1e9 }]) {
    assert.equal(evaluate("availability", undefined, range).mechanically_valid_for_evaluation, false);
  }
  assert.equal(evaluate("availability", undefined, { minimum: 0.2, maximum: 0.9 }, 0.2)
    .mechanically_valid_for_evaluation, false);
  assert.equal(evaluate("availability", undefined, { minimum: 0.2, maximum: 0.9 }, 0.8)
    .mechanically_valid_for_evaluation, true);
});

test("measured observations cannot borrow synthetic provenance and synthetic observations stay synthetic", () => {
  const observation = fixture.observations[0];
  const measured = clone(fixture);
  measured.observations[0].classification = "measured-observation";
  assert.equal(validateExecutableIfKernel(measured).schema_valid, false);
  measured.observations[0].source_id = "source.abs.patient-experiences";
  assert.equal(validateExecutableIfKernel(measured).schema_valid, true);
  const synthetic = clone(fixture);
  synthetic.observations[0].source_id = "source.abs.patient-experiences";
  assert.equal(validateExecutableIfKernel(synthetic).schema_valid, false);
  assert.equal(observation.classification, "synthetic-observation");
});

test("ratio threshold revisions retain both possible passing and failing values", () => {
  for (const [operator, value] of [["gte", 0], ["gte", 1e9], ["lte", 1], ["lt", 0], ["gt", 1]]) {
    const changed = kernelThroughRevision((revised) => {
      revised.predicates["option-coverage"].operator = operator;
      revised.predicates["option-coverage"].threshold.value = value;
    });
    const result = validateExecutableIfKernel(changed);
    assert.equal(result.machine_valid, false, `${operator} ${value} must reject`);
    assert.ok(result.errors.some(({ code }) => code === "PREDICATE_THRESHOLD_VACUOUS"));
  }
  for (const value of [0.01, 0.85, 1]) {
    const changed = kernelThroughRevision((revised) => {
      revised.predicates["option-coverage"].threshold.value = value;
    });
    assert.equal(validateExecutableIfKernel(changed).machine_valid, true);
  }
});

function definition(id) {
  return fixture.events
    .flatMap(({ introduced_definitions: introduced }) => introduced)
    .find(({ condition_id: conditionId }) => conditionId === id);
}

function observationsFor(id) {
  return selectCurrentEvidence(fixture).filter(
    ({ condition_definition_ref: ref }) => ref.condition_id === id,
  );
}

function kernelThroughRevision(mutate) {
  const changed = clone(fixture);
  changed.events = changed.events.slice(0, 3);
  changed.observations = [];
  changed.evidence_events = [];
  changed.current_evidence_state = [];
  const revision = changed.events.at(-1);
  const revised = revision.introduced_definitions[0];
  mutate(revised, changed);
  revised.definition_hash = computeConditionDefinitionHash(revised);
  revision.new_states[0].condition_definition_ref.definition_hash = revised.definition_hash;
  changed.current_state = clone(revision.new_states);
  return resealKernel(changed);
}

test("the synthetic kernel is closed, reproducible and non-authorising", () => {
  const result = validateExecutableIfKernel(fixture);
  assert.equal(fixture.schema_version, "1.1.0");
  assert.equal(result.schema_valid, true);
  assert.equal(result.integrity_valid, true);
  assert.equal(result.history_valid, true);
  assert.equal(result.machine_valid, true);
  assert.equal(result.executable, true);
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.action_authorised, false);
  assert.equal(result.publication_approved, false);
  assert.deepEqual(fixture.evaluator, FIXED_EVALUATOR_REF);
});

test("a synthetic observation cannot claim a non-synthetic provenance source ID", () => {
  const substituted = clone(fixture);
  substituted.observations[0].source_id = "source.official-labour-register";

  const result = validateExecutableIfKernel(substituted);
  assert.equal(result.schema_valid, false);
  assert.ok(result.errors.some(({ path }) => path.endsWith("/source_id")));
});

test("every signal and condition definition is immutable and content addressed", () => {
  for (const signal of fixture.signals) {
    assert.equal(signal.signal_definition_hash, computeSignalDefinitionHash(signal));
  }
  for (const item of fixture.events.flatMap(({ introduced_definitions: values }) => values)) {
    assert.equal(item.definition_hash, computeConditionDefinitionHash(item));
    assert.deepEqual(item.evaluator_ref, FIXED_EVALUATOR_REF);
  }
  for (const observation of fixture.observations) {
    assert.equal(observation.observation_hash, computeObservationHash(observation));
  }
});

test("signals declare their population, estimand, aggregation and projection boundary", () => {
  for (const signal of fixture.signals) {
    assert.match(signal.population, /.+/);
    assert.match(signal.estimand, /.+/);
    assert.match(signal.aggregation, /.+/);
    assert.equal(signal.projection_policy, "exact-scope-only");
    assert.match(signal.source_schema_ref, /.+/);
  }
});

test("typed claim identity includes the bounded period", () => {
  for (const item of fixture.events.flatMap(({ introduced_definitions: definitions }) => definitions)) {
    assert.deepEqual(item.claim.period, {
      starts_at: "2026-01-01T00:00:00Z",
      ends_at: "2026-12-31T23:59:59Z",
    });
  }
});

test("normalized observations produce fixed five-valued predicate and condition truth", () => {
  const active = definition("condition.worker-option.nsw");
  const observed = observationsFor(active.condition_id);
  const result = evaluateCondition(active, fixture.signals, observed, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });

  assert.equal(result.executable, true);
  assert.equal(result.mechanically_valid_for_evaluation, true);
  assert.equal(result.condition_truth.axis, "condition_truth");
  assert.equal(result.condition_truth.state, "true");
  assert.deepEqual(result.computed_rule_state, {
    axis: "computed_rule_state",
    state: "true",
  });
  assert.equal(result.evaluated_at, "2026-09-09T00:00:00Z");
  assert.deepEqual(result.condition_definition_ref, {
    condition_id: active.condition_id,
    definition_version: active.definition_version,
    definition_hash: active.definition_hash,
  });
  assert.match(result.evaluation_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.predicate_results["option-coverage"].state, "true");
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.action_authorised, false);

  const missing = evaluateCondition(active, fixture.signals, [], {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(missing.condition_truth.state, "unknown");

  const falseInputs = observed.map((item) => {
    const changed = clone(item);
    changed.value = changed.unit === "boolean" ? false : 0.5;
    changed.observation_hash = computeObservationHash(changed);
    return changed;
  });
  assert.equal(evaluateCondition(active, fixture.signals, falseInputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  }).condition_truth.state, "false");

  const staleInputs = observed.map((item, index) => {
    const changed = clone(item);
    const day = 1 + index * 3;
    changed.period = {
      start: `2026-05-${String(day).padStart(2, "0")}T00:00:00Z`,
      end: `2026-05-${String(day + 1).padStart(2, "0")}T00:00:00Z`,
    };
    changed.recorded_at = `2026-05-${String(day + 2).padStart(2, "0")}T00:00:00Z`;
    changed.observation_hash = computeObservationHash(changed);
    return changed;
  });
  assert.equal(evaluateCondition(active, fixture.signals, staleInputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  }).condition_truth.state, "stale");

  const disagreement = clone(observed.find(
    ({ observation_id: id }) => id === "observation.option-coverage.august",
  ));
  disagreement.observation_id = "observation.worker-option.nsw.conflict";
  disagreement.source_id = "source.synthetic-independent-review";
  disagreement.value = 0.5;
  disagreement.observation_hash = computeObservationHash(disagreement);
  assert.equal(evaluateCondition(active, fixture.signals, [...observed, disagreement], {
    evaluatedAt: "2026-09-09T00:00:00Z",
  }).condition_truth.state, "conflicted");
});

test("observations bind exact scope while source independence remains unverified", () => {
  for (const observation of fixture.observations) {
    assert.deepEqual(observation.scope, definition("condition.worker-option.nsw").scope);
    assert.equal(observation.source_independence, "not-verified");
    assert.equal(observation.uncertainty.status, "not-quantified");
    assert.equal(observation.coverage.eligible_units,
      observation.coverage.observed_units + observation.coverage.missing_units);
  }
  assert.doesNotMatch(schema, /minimum_independent_sources/);
  assert.match(schema, /minimum_distinct_source_ids/);
});

test("definition events name an author and reason", () => {
  for (const event of fixture.events) {
    assert.match(event.recorded_by, /.+/);
    assert.match(event.reason, /.+/);
  }
});

test("the evidence ledger exercises correction, challenge, withdrawal and expiry", () => {
  const validation = validateExecutableIfKernel(fixture);
  assert.equal(validation.evidence_history_valid, true);
  assert.deepEqual(
    [...new Set(fixture.evidence_events.map(({ operation }) => operation))].sort(),
    [
      "challenge-resolved",
      "evidence-added",
      "evidence-challenged",
      "evidence-corrected",
      "evidence-expired",
      "evidence-withdrawn",
    ],
  );
  assert.ok(fixture.current_evidence_state.some(({ lifecycle }) => lifecycle === "superseded"));
  assert.ok(fixture.current_evidence_state.some(({ lifecycle }) => lifecycle === "withdrawn"));
  assert.ok(fixture.current_evidence_state.some(({ lifecycle }) => lifecycle === "expired"));
  assert.equal(selectCurrentEvidence(fixture).length, 4);
  assert.ok(!selectCurrentEvidence(fixture).some(
    ({ observation_id: id }) => id === "observation.option-coverage.july.original",
  ));
  assert.match(readme, /Only `active` evidence.*eligible for evaluation/is);
  assert.match(readme, /different cell is new evidence, not a\s+correction/is);
});

test("governed evaluation binds the validated kernel and its active evidence fold", () => {
  const result = evaluateKernelCondition(fixture, "condition.worker-option.nsw", {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.mechanically_valid_for_evaluation, true);
  assert.equal(result.computed_rule_state.state, "true");
  assert.equal(result.kernel_manifest_hash, fixture.manifest_hash);
  assert.match(result.evidence_state_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.observation_hashes.length, 4);

  const tampered = clone(fixture);
  tampered.current_evidence_state[0].lifecycle = "active";
  const rejected = evaluateKernelCondition(tampered, "condition.worker-option.nsw", {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(rejected.mechanically_valid_for_evaluation, false);
  assert.equal(rejected.computed_rule_state.state, "unknown");
  assert.ok(rejected.errors.some(({ code }) => code === "KERNEL_INVALID"));
});

test("five-valued logic never coerces unknown, stale or conflicted to false", () => {
  const expression = {
    all: [
      { predicate_ref: "a" },
      { any: [{ predicate_ref: "b" }, { not: { predicate_ref: "c" } }] },
    ],
  };
  assert.equal(evaluateTruthExpression(expression, {
    a: "true", b: "unknown", c: "true",
  }).state, "unknown");
  assert.equal(evaluateTruthExpression(expression, {
    a: "true", b: "stale", c: "true",
  }).state, "stale");
  assert.equal(evaluateTruthExpression(expression, {
    a: "true", b: "conflicted", c: "true",
  }).state, "conflicted");
});

test("the evaluator binds its semantics, implementation and conformance vectors", () => {
  assert.match(FIXED_EVALUATOR_REF.digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(FIXED_EVALUATOR_REF.schema_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(FIXED_EVALUATOR_REF.implementation_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(FIXED_EVALUATOR_REF.conformance_vectors_digest, /^sha256:[a-f0-9]{64}$/);
  for (const vector of conformanceVectors.cases) {
    assert.equal(
      evaluateTruthExpression(vector.expression, vector.states).state,
      vector.expected,
      vector.id,
    );
  }
});

test("the ledger exercises added, narrowed, definition-revised, split and merge", () => {
  assert.deepEqual(
    [...new Set(fixture.events.map(({ operation }) => operation))].sort(),
    ["added", "definition-revised", "merge", "narrowed", "split"],
  );
  const result = validateExecutableIfKernel(fixture);
  assert.ok(result.definition_history.some(
    ({ condition_id: id, versions }) => id === "condition.worker-option" &&
      versions.join(",") === "1.0.0,1.1.0,2.0.0",
  ));
  assert.ok(result.current_state.some(
    ({ condition_id: id, lifecycle }) => id === "condition.worker-option" &&
      lifecycle === "superseded",
  ));
});

test("hostile: exact evaluator identity cannot drift under resealing", () => {
  const changed = clone(fixture);
  changed.evaluator.digest = `sha256:${"0".repeat(64)}`;
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "EVALUATOR_IDENTITY_MISMATCH"));
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.action_authorised, false);
});

test("hostile: signal-definition drift fails even when outer records are resealed", () => {
  const changed = clone(fixture);
  changed.signals[0].unit = "percent";
  changed.signals[0].signal_definition_hash = computeSignalDefinitionHash(changed.signals[0]);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "PREDICATE_SIGNAL_REF_MISMATCH"));
});

test("hostile: one condition version cannot be reused for different definition bytes", () => {
  const changed = clone(fixture);
  const source = clone(changed.events[2].introduced_definitions[0]);
  source.predicates["option-coverage"].threshold.value = 0.99;
  source.definition_hash = computeConditionDefinitionHash(source);
  changed.events[3].introduced_definitions.push(source);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "DEFINITION_VERSION_REUSED"));
});

test("hostile: narrowing cannot expand scope after all hashes are resealed", () => {
  const changed = clone(fixture);
  const narrowed = changed.events.find(({ operation }) => operation === "narrowed");
  const introduced = narrowed.introduced_definitions[0];
  introduced.scope.geographies.push("Queensland");
  introduced.definition_hash = computeConditionDefinitionHash(introduced);
  narrowed.new_states[0].condition_definition_ref = {
    condition_id: introduced.condition_id,
    definition_version: introduced.definition_version,
    definition_hash: introduced.definition_hash,
  };
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "NARROWING_NOT_STRICT_SUBSET"));
});

test("hostile: action or empirical truth claims are rejected, even with valid IFs", () => {
  for (const mutate of [
    (changed) => { changed.action_authorised = true; },
    (changed) => { changed.empirical_truth_established = true; },
    (changed) => { changed.publication_approved = true; },
  ]) {
    const changed = clone(fixture);
    mutate(changed);
    resealKernel(changed);
    const result = validateExecutableIfKernel(changed);
    assert.equal(result.machine_valid, false);
    assert.equal(result.empirical_truth_established, false);
    assert.equal(result.action_authorised, false);
    assert.equal(result.publication_approved, false);
  }
});

test("hostile: an observation cannot borrow a definition's scope", () => {
  const changed = clone(fixture);
  changed.observations[0].scope.geographies = ["Queensland"];
  changed.observations[0].observation_hash = computeObservationHash(changed.observations[0]);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "OBSERVATION_SCOPE_MISMATCH"));
});

test("hostile: replaying an identical condition version is not a new event", () => {
  const changed = clone(fixture);
  const repeated = clone(changed.events[2].introduced_definitions[0]);
  changed.events[3].introduced_definitions.push(repeated);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "DEFINITION_VERSION_REUSED"));
});

test("hostile: malformed or future observations cannot enter standalone evaluation", () => {
  const active = definition("condition.worker-option.nsw");
  const invalid = clone(observationsFor(active.condition_id));
  const invalidBoolean = invalid.find(({ predicate_id: id }) => id === "human-review");
  invalidBoolean.value = 0.5;
  invalidBoolean.observation_hash = computeObservationHash(invalidBoolean);
  const malformed = evaluateCondition(active, fixture.signals, invalid, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(malformed.executable, false);
  assert.ok(malformed.errors.some(({ code }) => code === "OBSERVATION_TYPE_OR_UNIT_MISMATCH"));

  const future = clone(observationsFor(active.condition_id));
  future[0].recorded_at = "2026-09-10T00:00:00Z";
  future[0].observation_hash = computeObservationHash(future[0]);
  const result = evaluateCondition(active, fixture.signals, future, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "OBSERVATION_AFTER_EVALUATION"));
});

test("hostile: standalone evaluation rejects unsealed condition semantics", () => {
  const changed = clone(definition("condition.worker-option.nsw"));
  changed.predicates["option-coverage"].threshold.value = 0.1;
  const result = evaluateCondition(changed, fixture.signals, observationsFor(changed.condition_id), {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.ok(result.errors.some(({ code }) => code === "DEFINITION_HASH_MISMATCH"));
});

test("hostile: a revision cannot invert an unchanged claim with NOT", () => {
  const changed = kernelThroughRevision((revised) => {
    revised.truth_expression = { not: revised.truth_expression };
  });
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "CONDITION_TRUTH_LOGIC_CHANGED"));
});

test("hostile: a revision cannot reverse a predicate operator direction", () => {
  const changed = kernelThroughRevision((revised) => {
    revised.predicates["option-coverage"].operator = "lte";
  });
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "PREDICATE_DIRECTION_CHANGED"));
});

test("hostile: a revision cannot silently swap the signal measured by a predicate", () => {
  const changed = kernelThroughRevision((revised, kernel) => {
    const substitute = clone(kernel.signals[0]);
    substitute.signal_id = "signal.synthetic-harm.ratio";
    substitute.label = "Synthetic harm ratio";
    substitute.construct = "A different construct with a compatible numeric type";
    substitute.estimand = substitute.construct;
    substitute.signal_definition_hash = computeSignalDefinitionHash(substitute);
    kernel.signals.push(substitute);
    revised.predicates["option-coverage"].signal_ref = {
      signal_id: substitute.signal_id,
      definition_version: substitute.definition_version,
      signal_definition_hash: substitute.signal_definition_hash,
    };
  });
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "PREDICATE_SIGNAL_CHANGED"));
});

test("hostile: standalone evaluation cannot redefine the missing predicate result", () => {
  const active = clone(definition("condition.worker-option.nsw"));
  active.predicates["option-coverage"].missing_result = "true";
  active.definition_hash = computeConditionDefinitionHash(active);
  const result = evaluateCondition(active, fixture.signals, [], {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.mechanically_valid_for_evaluation, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "PREDICATE_RESULT_POLICY_INVALID"));
});

test("hostile: alternate spellings of an evaluation instant are rejected", () => {
  const result = evaluateCondition(
    definition("condition.worker-option.nsw"),
    fixture.signals,
    observationsFor("condition.worker-option.nsw"),
    { evaluatedAt: "2026-09-09T00:00:00.000Z" },
  );
  assert.equal(result.mechanically_valid_for_evaluation, false);
  assert.ok(result.errors.some(({ code }) => code === "EVALUATION_TIME_INVALID"));
});

test("hostile: governed evaluation cannot use evidence state recorded in its future", () => {
  const beforeLatestEvidence = evaluateKernelCondition(fixture, "condition.worker-option.nsw", {
    evaluatedAt: "2026-09-02T12:00:00Z",
  });
  assert.equal(beforeLatestEvidence.mechanically_valid_for_evaluation, false);
  assert.ok(beforeLatestEvidence.errors.some(
    ({ code }) => code === "EVALUATION_BEFORE_EVIDENCE_STATE",
  ));

  const futureLedger = clone(fixture);
  futureLedger.evidence_events.at(-1).recorded_at = "2026-09-10T00:00:00Z";
  resealKernel(futureLedger);
  const futureEvent = evaluateKernelCondition(futureLedger, "condition.worker-option.nsw", {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(futureEvent.mechanically_valid_for_evaluation, false);
  assert.ok(futureEvent.errors.some(
    ({ code }) => code === "EVALUATION_BEFORE_EVIDENCE_STATE",
  ));
});

test("hostile: an observation cannot bypass evidence-event governance", () => {
  const changed = clone(fixture);
  const duplicate = clone(changed.observations.at(-1));
  duplicate.observation_id = "observation.option-coverage.august.duplicate";
  duplicate.value = 0.2;
  duplicate.observation_hash = computeObservationHash(duplicate);
  changed.observations.push(duplicate);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "OBSERVATION_MISSING_EVIDENCE_EVENT"));
});

test("the checked-in synthetic fixture is reproducible without rewriting it", () => {
  const output = execFileSync(process.execPath, [
    resolve(import.meta.dirname, "../tools/build-synthetic-fixture.mjs"),
    "--check",
  ], { encoding: "utf8" });
  assert.match(output, /verified synthetic executable IF fixture/i);
});

test("operator guidance keeps computation, evidence, scope and authority separate", () => {
  assert.match(readme, /distinct source IDs do not establish independence/i);
  assert.match(readme, /computed state from registered observations/i);
  assert.match(readme, /out of scope.*not a truth state/i);
  assert.match(readme, /does not.*authorise.*action/is);
  assert.match(readme, /hash.*does not authenticate.*source/is);
});

test("hostile: added cannot reset an existing active condition identity", () => {
  const changed = clone(fixture);
  const prior = definition("condition.worker-option.nsw");
  const replacement = clone(prior);
  replacement.definition_version = "2.0.0";
  replacement.predicates["option-coverage"].threshold.value = 0.96;
  replacement.definition_hash = computeConditionDefinitionHash(replacement);
  changed.events.push({
    sequence: 6,
    event_id: "event.worker-option.illegal-readd",
    operation: "added",
    recorded_at: "2026-06-01T00:00:00Z",
    recorded_by: "Hostile test",
    reason: "Attempt to reset an active identity.",
    previous_states: [],
    new_states: [{
      condition_id: replacement.condition_id,
      state_version: 1,
      condition_definition_ref: {
        condition_id: replacement.condition_id,
        definition_version: replacement.definition_version,
        definition_hash: replacement.definition_hash,
      },
      lifecycle: "active",
    }],
    introduced_definitions: [replacement],
    identity_change: { kind: "none" },
    authority_effect: "none",
    action_authorised: false,
    previous_event_hash: null,
    event_hash: `sha256:${"0".repeat(64)}`,
  });
  changed.current_state = changed.current_state.map((state) =>
    state.condition_id === replacement.condition_id
      ? clone(changed.events.at(-1).new_states[0])
      : state);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "ADDED_IDENTITY_ALREADY_EXISTS"));
});

test("hostile: split children must form one exhaustive, disjoint scope partition", () => {
  const changed = clone(fixture);
  changed.events = changed.events.slice(0, 4);
  changed.observations = [];
  const split = changed.events.at(-1);
  const general = split.introduced_definitions[0];
  const payroll = split.introduced_definitions[1];
  payroll.scope = clone(general.scope);
  payroll.definition_hash = computeConditionDefinitionHash(payroll);
  const payrollState = split.new_states.find(({ condition_id: id }) => id === payroll.condition_id);
  payrollState.condition_definition_ref.definition_hash = payroll.definition_hash;
  changed.current_state = clone(split.new_states);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "INVALID_SPLIT_PARTITION"));
});

test("hostile: operation and identity-change metadata cannot disagree", () => {
  const changed = clone(fixture);
  changed.events[1].identity_change = {
    kind: "split",
    from_condition_ids: ["condition.worker-option"],
    to_condition_ids: ["condition.worker-option"],
  };
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "IDENTITY_CHANGE_OPERATION_MISMATCH"));
});

test("hostile: an observation cannot be recorded before its definition exists", () => {
  const changed = clone(fixture);
  changed.observations[0].period = {
    start: "2026-04-01T00:00:00Z",
    end: "2026-04-29T00:00:00Z",
  };
  changed.observations[0].recorded_at = "2026-04-30T00:00:00Z";
  changed.observations[0].observation_hash = computeObservationHash(changed.observations[0]);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "OBSERVATION_PREDATES_DEFINITION"));
});

test("historical measured periods can be registered now but retain staleness and recording chronology", () => {
  const active = definition("condition.worker-option.nsw");
  const observations = clone(observationsFor(active.condition_id));
  for (const [index, item] of observations.entries()) {
    item.classification = "measured-observation";
    item.source_id = item.source_id.replace("source.synthetic", "source.retained");
    item.period.start = `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00Z`;
    item.period.end = item.period.start;
    item.recorded_at = "2026-06-01T00:00:00Z";
    item.observation_hash = computeObservationHash(item);
  }
  const result = evaluateCondition(active, fixture.signals, observations, { evaluatedAt: "2026-06-10T00:00:00Z" });
  assert.equal(result.mechanically_valid_for_evaluation, true, JSON.stringify(result.errors));
  assert.equal(result.computed_rule_state.state, "stale");
  observations[0].recorded_at = "2026-04-30T00:00:00Z";
  observations[0].observation_hash = computeObservationHash(observations[0]);
  const backdated = evaluateCondition(active, fixture.signals, observations, { evaluatedAt: "2026-06-10T00:00:00Z" });
  assert.equal(backdated.mechanically_valid_for_evaluation, false);
  assert.ok(backdated.errors.some(({ code }) => code === "OBSERVATION_PREDATES_DEFINITION"));
});

test("recent incomplete or low-coverage evidence blocks older complete truth", () => {
  const active = clone(definition("condition.worker-option.nsw"));
  for (const predicate of Object.values(active.predicates)) {
    predicate.source_policy.minimum_distinct_source_ids = 2;
    predicate.source_policy.minimum_coverage_ratio = 0.8;
  }
  active.definition_hash = computeConditionDefinitionHash(active);
  const inputs = observationsFor(active.condition_id).flatMap((original) => {
    const first = clone(original);
    first.condition_definition_ref.definition_hash = active.definition_hash;
    first.observation_hash = computeObservationHash(first);
    const second = clone(first);
    second.observation_id = `${first.observation_id}.second-source`;
    second.source_id = "source.synthetic-worker-review";
    second.observation_hash = computeObservationHash(second);
    return [first, second];
  });
  const latest = clone(inputs.find(({ predicate_id: id }) => id === "option-coverage"));
  latest.observation_id = "observation.option-coverage.september.incomplete";
  latest.period = { start: "2026-09-01T00:00:00Z", end: "2026-09-08T00:00:00Z" };
  latest.recorded_at = "2026-09-09T00:00:00Z";
  latest.value = 0.2;
  latest.coverage = { eligible_units: 100, observed_units: 20, missing_units: 80, unit: "synthetic affected workers" };
  latest.observation_hash = computeObservationHash(latest);
  const result = evaluateCondition(active, fixture.signals, [...inputs, latest], {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, true);
  assert.equal(result.predicate_results["option-coverage"].state, "unknown");
  assert.equal(result.condition_truth.state, "unknown");
});

test("hostile: standalone evaluation enforces closed condition semantics", () => {
  const active = clone(definition("condition.worker-option.nsw"));
  active.truth_expression = { predicate_ref: "option-coverage" };
  active.definition_hash = computeConditionDefinitionHash(active);
  const inputs = observationsFor(active.condition_id).map((observation) => {
    const changed = clone(observation);
    changed.condition_definition_ref.definition_hash = active.definition_hash;
    changed.observation_hash = computeObservationHash(changed);
    return changed;
  });
  const result = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "TRUTH_EXPRESSION_NOT_CLOSED"));
});

test("hostile: definition revision cannot invert the condition's meaning", () => {
  const changed = clone(fixture);
  changed.events = changed.events.slice(0, 3);
  changed.observations = [];
  const revision = changed.events.at(-1);
  const revised = revision.introduced_definitions[0];
  revised.proposition = "Affected workers have no credible alternative and no accessible human review route.";
  revised.definition_hash = computeConditionDefinitionHash(revised);
  revision.new_states[0].condition_definition_ref.definition_hash = revised.definition_hash;
  changed.current_state = clone(revision.new_states);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "CONDITION_MEANING_CHANGED"));
});

test("hostile: typed claim identity cannot change behind stable display prose", () => {
  const changed = clone(fixture);
  changed.events = changed.events.slice(0, 3);
  changed.observations = [];
  const revision = changed.events.at(-1);
  const revised = revision.introduced_definitions[0];
  revised.claim.polarity = "negative";
  revised.definition_hash = computeConditionDefinitionHash(revised);
  revision.new_states[0].condition_definition_ref.definition_hash = revised.definition_hash;
  changed.current_state = clone(revision.new_states);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "CONDITION_MEANING_CHANGED"));
});

test("hostile: standalone evaluation rejects an operator incompatible with its signal type", () => {
  const active = clone(definition("condition.worker-option.nsw"));
  active.predicates["human-review"].operator = "gt";
  active.definition_hash = computeConditionDefinitionHash(active);
  const inputs = observationsFor(active.condition_id).map((observation) => {
    const changed = clone(observation);
    changed.condition_definition_ref.definition_hash = active.definition_hash;
    changed.observation_hash = computeObservationHash(changed);
    return changed;
  });
  const result = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "PREDICATE_OPERATOR_TYPE_MISMATCH"));
});

test("hostile: malformed observation time fails closed", () => {
  const active = definition("condition.worker-option.nsw");
  const inputs = clone(observationsFor(active.condition_id));
  inputs[0].period.start = "not-a-date";
  inputs[0].observation_hash = computeObservationHash(inputs[0]);
  const result = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "OBSERVATION_TIME_INVALID"));
});

test("hostile: overlapping periods cannot masquerade as persistence", () => {
  const active = definition("condition.worker-option.nsw");
  const inputs = clone(observationsFor(active.condition_id));
  const august = inputs.find(({ observation_id: id }) => id === "observation.option-coverage.august");
  august.period.start = "2026-07-15T00:00:00Z";
  august.observation_hash = computeObservationHash(august);
  const result = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "OVERLAPPING_OBSERVATION_PERIODS"));
});

test("hostile: source aliases sharing artifacts cannot satisfy a multi-artifact gate", () => {
  const active = clone(definition("condition.worker-option.nsw"));
  for (const predicate of Object.values(active.predicates)) {
    predicate.source_policy.minimum_distinct_source_ids = 2;
    predicate.source_policy.minimum_distinct_artifact_hashes = 2;
  }
  active.definition_hash = computeConditionDefinitionHash(active);
  const inputs = observationsFor(active.condition_id).flatMap((observation) => {
    const first = clone(observation);
    first.condition_definition_ref.definition_hash = active.definition_hash;
    first.observation_hash = computeObservationHash(first);
    const alias = clone(first);
    alias.observation_id = `${first.observation_id}.alias`;
    alias.source_id = `${first.source_id}.alias`;
    alias.observation_hash = computeObservationHash(alias);
    return [first, alias];
  });
  const result = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(result.executable, true);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.predicate_results["option-coverage"].excluded_periods.every(
    ({ reasons }) => reasons.includes("insufficient-distinct-artifacts"),
  ));
});

test("hostile: evaluation cannot precede the selected definition", () => {
  const active = definition("condition.worker-option.nsw");
  const result = evaluateCondition(active, fixture.signals, [], {
    evaluatedAt: "2026-04-30T00:00:00Z",
  });
  assert.equal(result.executable, false);
  assert.equal(result.condition_truth.state, "unknown");
  assert.ok(result.errors.some(({ code }) => code === "EVALUATION_BEFORE_DEFINITION"));
});

test("hostile: evaluation and observations cannot escape the claim period", () => {
  const active = definition("condition.worker-option.nsw");
  const outsideEvaluation = evaluateCondition(active, fixture.signals, [], {
    evaluatedAt: "2027-01-01T00:00:00Z",
  });
  assert.equal(outsideEvaluation.mechanically_valid_for_evaluation, false);
  assert.ok(outsideEvaluation.errors.some(
    ({ code }) => code === "EVALUATION_OUTSIDE_CLAIM_PERIOD",
  ));

  const inputs = clone(observationsFor(active.condition_id));
  inputs[0].period.end = "2027-01-01T00:00:00Z";
  inputs[0].recorded_at = "2027-01-02T00:00:00Z";
  inputs[0].observation_hash = computeObservationHash(inputs[0]);
  const outsideObservation = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2027-01-03T00:00:00Z",
  });
  assert.equal(outsideObservation.mechanically_valid_for_evaluation, false);
  assert.ok(outsideObservation.errors.some(
    ({ code }) => code === "OBSERVATION_OUTSIDE_CLAIM_PERIOD",
  ));
});

test("evaluation receipts are deterministic and bind the caller-supplied clock", () => {
  const active = definition("condition.worker-option.nsw");
  const inputs = observationsFor(active.condition_id);
  const first = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  const repeated = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
  const later = evaluateCondition(active, fixture.signals, inputs, {
    evaluatedAt: "2026-09-10T00:00:00Z",
  });
  assert.equal(first.evaluation_hash, repeated.evaluation_hash);
  assert.notEqual(first.evaluation_hash, later.evaluation_hash);
  assert.deepEqual(first.clock, { source: "caller-supplied", trusted: false });
  assert.deepEqual(first.observation_hashes, [...first.observation_hashes].sort());
});

test("hostile: a merge cannot fabricate Cartesian scope cells", () => {
  const makeDefinition = (id, effectiveFrom, geographies, cohorts) => {
    const item = clone(definition("condition.worker-option.nsw"));
    item.condition_id = id;
    item.definition_version = "1.0.0";
    item.effective_from = effectiveFrom;
    item.scope.geographies = geographies;
    item.scope.cohorts = cohorts;
    item.definition_hash = computeConditionDefinitionHash(item);
    return item;
  };
  const makeState = (item, stateVersion, lifecycle = "active") => ({
    condition_id: item.condition_id,
    state_version: stateVersion,
    condition_definition_ref: {
      condition_id: item.condition_id,
      definition_version: item.definition_version,
      definition_hash: item.definition_hash,
    },
    lifecycle,
  });
  const makeEvent = (sequence, id, operation, recordedAt, previousStates, newStates,
    introducedDefinitions, identityChange) => ({
    sequence,
    event_id: id,
    operation,
    recorded_at: recordedAt,
    recorded_by: "Hostile test",
    reason: "Try to manufacture unobserved scope combinations.",
    previous_states: previousStates,
    new_states: newStates,
    introduced_definitions: introducedDefinitions,
    identity_change: identityChange,
    authority_effect: "none",
    action_authorised: false,
    previous_event_hash: null,
    event_hash: `sha256:${"0".repeat(64)}`,
  });

  const nswGeneral = makeDefinition(
    "condition.cartesian.nsw-general", "2026-06-01T00:00:00Z",
    ["New South Wales"], ["General Clerks"],
  );
  const qldPayroll = makeDefinition(
    "condition.cartesian.qld-payroll", "2026-06-02T00:00:00Z",
    ["Queensland"], ["Payroll Clerks"],
  );
  const falseUnion = makeDefinition(
    "condition.cartesian.false-union", "2026-06-03T00:00:00Z",
    ["New South Wales", "Queensland"], ["General Clerks", "Payroll Clerks"],
  );
  const firstState = makeState(nswGeneral, 1);
  const secondState = makeState(qldPayroll, 1);
  const targetState = makeState(falseUnion, 1);
  const kernel = {
    schema_version: fixture.schema_version,
    kernel_id: "kernel.cartesian.hostile",
    classification: "research-draft",
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    evaluator: clone(FIXED_EVALUATOR_REF),
    signals: clone(fixture.signals),
    events: [
      makeEvent(1, "event.cartesian.first", "added", "2026-06-01T00:00:00Z",
        [], [firstState], [nswGeneral], { kind: "none" }),
      makeEvent(2, "event.cartesian.second", "added", "2026-06-02T00:00:00Z",
        [], [secondState], [qldPayroll], { kind: "none" }),
      makeEvent(3, "event.cartesian.merge", "merge", "2026-06-03T00:00:00Z",
        [firstState, secondState], [
          makeState(nswGeneral, 2, "superseded"),
          makeState(qldPayroll, 2, "superseded"),
          targetState,
        ], [falseUnion], {
          kind: "merge",
          from_condition_ids: [nswGeneral.condition_id, qldPayroll.condition_id],
          to_condition_ids: [falseUnion.condition_id],
        }),
    ],
    observations: [],
    evidence_events: [],
    current_evidence_state: [],
    current_state: [
      makeState(nswGeneral, 2, "superseded"),
      makeState(qldPayroll, 2, "superseded"),
      targetState,
    ],
    manifest_hash: `sha256:${"0".repeat(64)}`,
  };
  resealKernel(kernel);
  const result = validateExecutableIfKernel(kernel);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "INVALID_MERGE_TARGET"));
});

test("hostile: a derived identity must begin at definition version one", () => {
  const changed = clone(fixture);
  changed.events = changed.events.slice(0, 4);
  changed.observations = [];
  const split = changed.events.at(-1);
  const child = split.introduced_definitions[0];
  child.definition_version = "9.9.9";
  child.definition_hash = computeConditionDefinitionHash(child);
  const childState = split.new_states.find(({ condition_id: id }) => id === child.condition_id);
  childState.condition_definition_ref.definition_version = child.definition_version;
  childState.condition_definition_ref.definition_hash = child.definition_hash;
  changed.current_state = clone(split.new_states);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "INVALID_SPLIT_TARGET"));
});

test("an unresolved evidence challenge is excluded and leaves the IF unknown", () => {
  const changed = clone(fixture);
  changed.evidence_events = changed.evidence_events.slice(0, 8);
  const retainedIds = new Set([
    "observation.option-coverage.june.withdrawn",
    "observation.human-review.june.expired",
    "observation.option-coverage.july.original",
    "observation.option-coverage.july",
    "observation.human-review.july",
  ]);
  changed.observations = changed.observations.filter(({ observation_id: id }) => retainedIds.has(id));
  changed.current_evidence_state = [
    changed.evidence_events[1].new_states[0],
    changed.evidence_events[3].new_states[0],
    changed.evidence_events[5].new_states[0],
    changed.evidence_events[5].new_states[1],
    changed.evidence_events[7].new_states[0],
  ];
  resealKernel(changed);
  const validation = validateExecutableIfKernel(changed);
  assert.equal(validation.machine_valid, true);
  const active = definition("condition.worker-option.nsw");
  const selected = selectCurrentEvidence(changed);
  assert.ok(!selected.some(({ observation_id: id }) => id === "observation.human-review.july"));
  assert.equal(evaluateCondition(active, fixture.signals, selected, {
    evaluatedAt: "2026-09-09T00:00:00Z",
  }).condition_truth.state, "unknown");
});

test("hostile: a correction cannot change the source-period cell", () => {
  const changed = clone(fixture);
  const replacement = changed.observations.find(
    ({ observation_id: id }) => id === "observation.option-coverage.july",
  );
  replacement.period.start = "2026-07-02T00:00:00Z";
  replacement.observation_hash = computeObservationHash(replacement);
  const correction = changed.evidence_events.find(
    ({ operation }) => operation === "evidence-corrected",
  );
  correction.new_states[1].observation_ref.observation_hash = replacement.observation_hash;
  correction.relation.to_observation_ref.observation_hash = replacement.observation_hash;
  const current = changed.current_evidence_state.find(
    ({ observation_ref: ref }) => ref.observation_id === replacement.observation_id,
  );
  current.observation_ref.observation_hash = replacement.observation_hash;
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "INVALID_EVIDENCE_CORRECTION"));
});

test("hostile: two active observations cannot occupy one source-period cell", () => {
  const changed = clone(fixture);
  const source = changed.observations.find(
    ({ observation_id: id }) => id === "observation.option-coverage.august",
  );
  const duplicate = clone(source);
  duplicate.observation_id = "observation.option-coverage.august.competing";
  duplicate.value = 0.2;
  duplicate.observation_hash = computeObservationHash(duplicate);
  changed.observations.push(duplicate);
  const state = {
    observation_ref: {
      observation_id: duplicate.observation_id,
      observation_hash: duplicate.observation_hash,
    },
    state_version: 1,
    lifecycle: "active",
  };
  changed.evidence_events.push({
    sequence: changed.evidence_events.length + 1,
    evidence_event_id: "evidence-event.august-option.competing",
    operation: "evidence-added",
    recorded_at: "2026-09-04T00:00:00Z",
    recorded_by: "Hostile test",
    reason: "Try to keep two values active in one cell.",
    previous_states: [],
    new_states: [state],
    relation: { kind: "none" },
    authority_effect: "none",
    action_authorised: false,
    previous_evidence_event_hash: null,
    evidence_event_hash: `sha256:${"0".repeat(64)}`,
  });
  changed.current_evidence_state.push(state);
  resealKernel(changed);
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "DUPLICATE_ACTIVE_SOURCE_PERIOD_CELL"));
});

test("hostile: evidence history cannot be rewritten without detection", () => {
  const changed = clone(fixture);
  changed.evidence_events[5].reason = "Rewritten correction rationale.";
  const result = validateExecutableIfKernel(changed);
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "EVIDENCE_EVENT_HASH_MISMATCH"));
});
