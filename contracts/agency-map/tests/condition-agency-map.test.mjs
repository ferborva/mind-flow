import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  computeOutcomeScopeHash,
  computePublicProjection,
  computeMetricChecksum,
  validateConditionAgencyMap,
} from "../validate.mjs";

const root = resolve(import.meta.dirname, "..");
const schema = JSON.parse(readFileSync(resolve(
  root,
  "schema/condition-agency-map.schema.json",
), "utf8"));
const fixture = JSON.parse(readFileSync(resolve(
  root,
  "fixtures/australian-clerical-agency.synthetic.json",
), "utf8"));
const readme = readFileSync(resolve(root, "README.md"), "utf8");
const repositoryRoot = resolve(root, "../..");

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
}

function round4Sources() {
  const registryPath = "signals/fixtures/round-04.worker-option.synthetic.json";
  const registryBytes = readFileSync(resolve(repositoryRoot, registryPath));
  return {
    sourceKernel: readJson("contracts/executable-if/fixtures/kernel.synthetic.json"),
    sourceEvolution: readJson("contracts/evolution/fixtures/round-04.worker-option.synthetic.json"),
    sourceSignalRegistry: JSON.parse(registryBytes.toString("utf8")),
    sourceSignalRegistryArtifactPath: registryPath,
    sourceSignalRegistryArtifactSha256: `sha256:${createHash("sha256").update(registryBytes).digest("hex")}`,
  };
}

function round4Fixture() {
  return readJson("contracts/agency-map/fixtures/round-04.worker-option.synthetic.json");
}

function validateRound4(document) {
  return validateConditionAgencyMap(document, {
    evaluatedAt: "2026-09-09T00:00:00Z",
    ...round4Sources(),
  });
}

function clone(value) {
  return structuredClone(value);
}

function validate(value) {
  return validateConditionAgencyMap(value, {
    schema,
    evaluatedAt: "2026-09-09T00:00:00Z",
  });
}

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

test("Round 4 agency binds exact definition, evidence, registry metrics and public IF", () => {
  const document = round4Fixture();
  const result = validateRound4(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.source_bindings_verified, true);
  assert.equal(document.schema_version, "1.1.0");
  assert.deepEqual(
    document.signals.map(({ registered_metric_ref: reference }) => reference.binding_kind),
    [
      "executable-predicate",
      "executable-predicate",
      "supplemental-observation",
      "supplemental-observation",
    ],
  );
  assert.equal(document.public_projection.consumer_if.basis.condition_truth_assessed, false);
  assert.match(document.public_projection.consumer_if.statement, /to the following standard:/i);
  assert.ok(document.public_projection.signal_contracts.every((signal) =>
    signal.registered_metric_checksum && signal.binding_kind));
});

test("hostile: agency cannot borrow definition, evidence or metric meaning", () => {
  for (const [code, mutate] of [
    ["AGENCY_CONDITION_DEFINITION_MISMATCH", (document) => {
      document.conditions[0].canonical_binding.condition_definition_ref.definition_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["AGENCY_EVIDENCE_STATE_MISMATCH", (document) => {
      document.conditions[0].canonical_binding.evidence_state_ref.state_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["AGENCY_EVOLUTION_BINDING_MISMATCH", (document) => {
      document.conditions[0].canonical_binding.history_tip_ref.event_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["AGENCY_CONDITION_SOURCE_EVENT_MISMATCH", (document) => {
      document.conditions[0].canonical_binding.condition_source_event_ref.event_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["AGENCY_SIGNAL_REGISTRY_REF_MISMATCH", (document) => {
      document.signal_registry_ref.artifact_sha256 = `sha256:${"0".repeat(64)}`;
    }],
    ["AGENCY_REGISTERED_METRIC_MISMATCH", (document) => {
      document.signals[0].metric.measure = "a different quantity";
      document.signals[0].metric.metric_checksum = computeMetricChecksum(document.signals[0].metric);
    }],
  ]) {
    const document = round4Fixture();
    mutate(document);
    document.outcome_scope.scope_hash = computeOutcomeScopeHash(document);
    document.public_projection = computePublicProjection(document);
    assert.ok(hasCode(validateRound4(document), code), code);
  }
});

test("hostile: supplemental evidence cannot become the action's intended predicate", () => {
  const document = round4Fixture();
  document.action_hypotheses[0].intended_signal_ref =
    "signal.worker-option.counter.synthetic";
  const result = validateRound4(document);
  assert.ok(hasCode(result, "AGENCY_ACTION_SIGNAL_SEMANTICS_MISMATCH"));
});

test("hostile: resealing cannot hide public IF drift from the executable claim", () => {
  const document = round4Fixture();
  document.conditions[0].public_if_clause = "an easier but unrelated condition holds";
  document.outcome_scope.scope_hash = computeOutcomeScopeHash(document);
  document.public_projection = computePublicProjection(document);
  assert.ok(hasCode(validateRound4(document), "AGENCY_PUBLIC_IF_MISMATCH"));
});

test("the synthetic map is explicit but proves no truth, control or authority", () => {
  const result = validate(fixture);
  assert.equal(result.machine_valid, true, JSON.stringify(result, null, 2));
  assert.equal(result.condition_truth_assessed, false);
  assert.equal(result.actor_identity_verified, false);
  assert.equal(result.control_verified, false);
  assert.equal(result.forecast_produced, false);
  assert.equal(result.commitment_created, false);
  assert.equal(result.action_authorised, false);
  assert.deepEqual(fixture.public_projection, computePublicProjection(fixture));
});

test("the complete public promise and its IF clauses are hash-bound", () => {
  assert.equal(fixture.outcome_scope.scope_hash, computeOutcomeScopeHash(fixture));
  const changed = clone(fixture);
  changed.conditions[0].public_if_clause += " for permanent residents only";
  assert.equal(hasCode(validate(changed), "OUTCOME_SCOPE_HASH_MISMATCH"), true);
  assert.equal(hasCode(validate(changed), "PUBLIC_PROJECTION_MISMATCH"), true);
});

test("holdership is decomposed instead of laundering one actor into owner", () => {
  const changed = clone(fixture);
  changed.conditions[0].condition_owner = "actor.employer-coalition";
  const result = validate(changed);
  assert.equal(result.schema_valid, false);
  assert.equal(hasCode(result, "SCHEMA_INVALID"), true);
  for (const condition of fixture.conditions) {
    assert.ok(condition.relations.some(({ roles }) => roles.includes("affected")));
    assert.ok(condition.relations.some(({ roles }) =>
      roles.some((role) => ["controls", "influences", "depends-on", "duty-bears"].includes(role))));
  }
});

test("a technical locus is not treated as an actor or authority", () => {
  const changed = clone(fixture);
  changed.conditions[0].relations[0].actor_ref = "actor.technical-capability";
  assert.equal(hasCode(validate(changed), "UNRESOLVED_ACTOR_REF"), true);
  assert.equal(fixture.condition_loci.includes("technical"), true);
  assert.equal(fixture.authority_effect, "none");
});

test("provider plan modes cannot outrun the actor relationship", () => {
  const changed = clone(fixture);
  const plan = changed.provider_plans.find(({ actor_ref }) =>
    actor_ref === "actor.worker-transition-provider");
  const clause = plan.when_clauses.find(({ condition_id }) =>
    condition_id === "condition.employment-offer-exists");
  clause.mode = "act";
  assert.equal(hasCode(validate(changed), "PLAN_MODE_ROLE_MISMATCH"), true);
});

test("a provider plan covers every condition once without inventing a total sequence", () => {
  for (const plan of fixture.provider_plans) {
    assert.deepEqual(
      new Set(plan.when_clauses.map(({ condition_id }) => condition_id)),
      new Set(fixture.conditions.map(({ condition_id }) => condition_id)),
    );
    assert.equal(plan.ordering, "concurrent-or-dependency-bound");
  }
  const missing = clone(fixture);
  missing.provider_plans[0].when_clauses.pop();
  assert.equal(hasCode(validate(missing), "PLAN_CONDITION_COVERAGE_MISMATCH"), true);

  const ranked = clone(fixture);
  ranked.provider_plans[0].when_clauses[0].sequence_rank = 1;
  assert.equal(validate(ranked).schema_valid, false);
});

test("WHEN renders as a conditional plan hypothesis, never a date or commitment", () => {
  for (const plan of fixture.public_projection.provider_when_plans) {
    assert.match(plan.status, /conditional plan hypothesis/i);
    assert.match(plan.statement, /could/i);
    assert.doesNotMatch(plan.statement, /\bwill\b/i);
  }
  assert.equal(fixture.forecast_produced, false);
  assert.equal(fixture.commitment_created, false);
});

test("action hypotheses bind one condition, intended signal, harms and falsifier", () => {
  const changed = clone(fixture);
  changed.action_hypotheses[0].target_condition_id = "condition.not-registered";
  assert.equal(hasCode(validate(changed), "UNRESOLVED_ACTION_CONDITION"), true);

  const reused = clone(fixture);
  reused.action_hypotheses[0].harm_signal_refs = [
    reused.action_hypotheses[0].intended_signal_ref,
  ];
  assert.equal(hasCode(validate(reused), "ACTION_SIGNAL_ROLE_REUSE"), true);
});

test("claimed action must fit a declared actor capability", () => {
  const changed = clone(fixture);
  changed.action_hypotheses[0].verb = "mandate";
  assert.equal(hasCode(validate(changed), "ACTION_CAPABILITY_MISMATCH"), true);
});

test("five public condition prompts remain a starting set, not a taxonomy", () => {
  for (const prompt of ["price", "permission", "proximity", "availability", "capability"]) {
    assert.match(readme, new RegExp(`\\b${prompt}\\b`, "i"));
  }
  assert.match(readme, /starting set, not a taxonomy/i);
  assert.match(readme, /other/i);
  assert.ok(fixture.conditions.some(({ category_prompts }) => category_prompts.includes("other")));
});

test("the conceptual precedent is cited without claiming external validation", () => {
  assert.match(readme, /Goals.*Signals.*Metrics/is);
  assert.match(readme, /research\.google\/pubs\/measuring-the-user-experience/i);
  assert.match(readme, /does not validate.*societal transition/is);
  assert.match(readme, /proposed extension/i);
});

test("consumer and provider views preserve their power asymmetry", () => {
  assert.match(readme, /not symmetrical/i);
  assert.match(readme, /consumer.*cannot.*provider/is);
  assert.ok(fixture.actors.some(({ actor_class }) => actor_class === "affected-people"));
  assert.ok(fixture.actors.some(({ actor_class }) => actor_class === "institution"));
  assert.equal(fixture.condition_ledger_ref.verification, "external-unverified");
});

test("local structural success cannot upgrade upstream verification", () => {
  const changed = clone(fixture);
  changed.condition_ledger_ref.verification = "verified";
  assert.equal(validate(changed).schema_valid, false);
  assert.match(fixture.public_projection.boundary, /not.*truth.*control.*authority/is);
});

test("a caller-controlled schema cannot manufacture authority", () => {
  const forkedSchema = clone(schema);
  forkedSchema.properties.authority_effect = { type: "string" };
  forkedSchema.properties.action_authorised = { type: "boolean" };
  const changed = clone(fixture);
  changed.authority_effect = "execute";
  changed.action_authorised = true;
  const result = validateConditionAgencyMap(changed, { schema: forkedSchema });
  assert.equal(result.machine_valid, false);
  assert.equal(result.schema_valid, false);
});

test("orphan signals cannot borrow legitimacy from a condition map", () => {
  const changed = clone(fixture);
  changed.signals.push({
    ...changed.signals[0],
    signal_ref: "signal.unmapped",
  });
  assert.equal(hasCode(validate(changed), "ORPHAN_SIGNAL"), true);
});

test("plans and actions cannot remain current after their review clocks expire", () => {
  const reversedClock = clone(fixture);
  reversedClock.created_at = "2026-09-10T00:00:00Z";
  assert.equal(hasCode(validate(reversedClock), "INVALID_MAP_CLOCK"), true);

  const expiredPlan = clone(fixture);
  expiredPlan.provider_plans[0].when_clauses[0].next_review = expiredPlan.as_of;
  assert.equal(hasCode(validate(expiredPlan), "PLAN_REVIEW_EXPIRED"), true);

  const expiredAction = clone(fixture);
  expiredAction.action_hypotheses[0].expires_at = expiredAction.as_of;
  assert.equal(hasCode(validate(expiredAction), "ACTION_HYPOTHESIS_EXPIRED"), true);
});

test("a dependency must be a distinct actor related to the same condition", () => {
  const selfDependency = clone(fixture);
  selfDependency.provider_plans[0].when_clauses[1].dependency_actor_refs = [
    selfDependency.provider_plans[0].actor_ref,
  ];
  assert.equal(hasCode(validate(selfDependency), "INVALID_CONDITION_DEPENDENCY"), true);

  const unrelatedDependency = clone(fixture);
  unrelatedDependency.provider_plans[0].when_clauses[1].dependency_actor_refs = [
    "actor.affected-clerical-workers",
  ];
  assert.equal(hasCode(validate(unrelatedDependency), "INVALID_CONDITION_DEPENDENCY"), true);
});

test("all referenced actors, conditions and signals must resolve", () => {
  const missingActor = clone(fixture);
  missingActor.provider_plans[0].actor_ref = "actor.missing";
  assert.equal(hasCode(validate(missingActor), "UNRESOLVED_ACTOR_REF"), true);

  const missingSignal = clone(fixture);
  missingSignal.conditions[0].signal_refs.push("signal.missing");
  assert.equal(hasCode(validate(missingSignal), "UNRESOLVED_SIGNAL_REF"), true);
});

test("condition logic distinguishes joint requirements from alternative routes", () => {
  assert.ok(fixture.outcome_scope.condition_logic);
  const references = JSON.stringify(fixture.outcome_scope.condition_logic);
  for (const { condition_id: conditionId } of fixture.conditions) {
    assert.equal(references.split(conditionId).length - 1, 1);
  }

  const changed = clone(fixture);
  changed.outcome_scope.condition_logic = {
    any: changed.conditions.map(({ condition_id: conditionId }) => ({
      condition_ref: conditionId,
    })),
  };
  changed.outcome_scope.scope_hash = computeOutcomeScopeHash(changed);
  changed.public_projection = computePublicProjection(changed);
  const result = validate(changed);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.match(changed.public_projection.consumer_if.statement, /at least one/i);
  assert.doesNotMatch(changed.public_projection.consumer_if.statement, /and if/i);

  const omitted = clone(fixture);
  omitted.outcome_scope.condition_logic.all.pop();
  omitted.outcome_scope.scope_hash = computeOutcomeScopeHash(omitted);
  omitted.public_projection = computePublicProjection(omitted);
  assert.equal(hasCode(validate(omitted), "OUTCOME_LOGIC_COVERAGE_MISMATCH"), true);
});

test("provider plans stay inside typed capability, geography, service and time scope", () => {
  const mars = clone(fixture);
  mars.provider_plans[0].geographies = ["Mars"];
  mars.public_projection = computePublicProjection(mars);
  assert.equal(hasCode(validate(mars), "PROVIDER_CAPABILITY_MISMATCH"), true);

  const coercion = clone(fixture);
  coercion.provider_plans[0].offered_verb = "coerce";
  coercion.public_projection = computePublicProjection(coercion);
  assert.equal(hasCode(validate(coercion), "PROVIDER_CAPABILITY_MISMATCH"), true);

  const historic = clone(fixture);
  historic.provider_plans[0].starts_at = "1900-01-01T00:00:00Z";
  historic.provider_plans[0].ends_at = "1900-01-02T00:00:00Z";
  historic.public_projection = computePublicProjection(historic);
  assert.equal(hasCode(validate(historic), "PROVIDER_SCOPE_MISMATCH"), true);
});

test("affected relationships are bound to the scoped affected people", () => {
  assert.deepEqual(fixture.outcome_scope.affected_actor_refs, [
    "actor.affected-clerical-workers",
  ]);
  const reassigned = clone(fixture);
  for (const condition of reassigned.conditions) {
    const worker = condition.relations.find(({ actor_ref: actorRef }) =>
      actorRef === "actor.affected-clerical-workers");
    worker.roles = ["observes"];
    const employer = condition.relations.find(({ actor_ref: actorRef }) =>
      actorRef === "actor.employer-coalition");
    employer.roles.push("affected");
  }
  reassigned.public_projection = computePublicProjection(reassigned);
  assert.equal(hasCode(validate(reassigned), "SCOPED_AFFECTED_RELATION_MISSING"), true);
});

test("every signal exposes a hash-bound estimand and metric in public", () => {
  for (const signal of fixture.signals) {
    assert.ok(signal.metric);
    assert.match(signal.metric.metric_id, /^metric\./);
    assert.match(signal.metric.metric_checksum, /^sha256:[a-f0-9]{64}$/);
  }
  assert.equal(
    fixture.public_projection.signal_contracts.length,
    fixture.signals.length,
  );
  const gamed = clone(fixture);
  gamed.signals[0].metric.denominator = "only cases retained after exclusions";
  assert.equal(hasCode(validate(gamed), "SIGNAL_METRIC_HASH_MISMATCH"), true);
  assert.equal(hasCode(validate(gamed), "PUBLIC_PROJECTION_MISMATCH"), true);
});

test("action counter and harm signals cannot silently change condition scope", () => {
  const changed = clone(fixture);
  changed.action_hypotheses[0].counter_signal_refs = ["signal.offer-counter"];
  changed.action_hypotheses[0].harm_signal_refs = ["signal.offer-harm"];
  assert.equal(hasCode(validate(changed), "ACTION_SECONDARY_SIGNAL_CONDITION_MISMATCH"), true);
});

test("freshness is evaluated against an external clock and exposed publicly", () => {
  const stale = clone(fixture);
  stale.created_at = "2000-01-01T00:00:00Z";
  stale.as_of = "2000-01-01T00:00:00Z";
  for (const plan of stale.provider_plans) {
    for (const clause of plan.when_clauses) {
      clause.next_review = "2000-02-01T00:00:00Z";
    }
  }
  for (const action of stale.action_hypotheses) {
    action.expires_at = "2000-02-01T00:00:00Z";
  }
  stale.outcome_scope.scope_hash = computeOutcomeScopeHash(stale);
  stale.public_projection = computePublicProjection(stale);
  assert.equal(hasCode(validate(stale), "PLAN_REVIEW_EXPIRED"), true);
  assert.equal(hasCode(validate(stale), "ACTION_HYPOTHESIS_EXPIRED"), true);
  assert.equal(fixture.public_projection.freshness.as_of, fixture.as_of);
  assert.ok(fixture.public_projection.provider_when_plans.every(({ conditions }) =>
    conditions.every(({ next_review: nextReview }) => nextReview)));
});

test("completion tests, dependencies and blocked cycles stay visible", () => {
  for (const plan of fixture.public_projection.provider_when_plans) {
    for (const condition of plan.conditions) {
      assert.ok(condition.completion_test);
      assert.ok(Array.isArray(condition.dependency_actor_refs));
      assert.match(condition.verification, /unverified/i);
    }
  }
  const circular = clone(fixture);
  const providerClause = circular.provider_plans[0].when_clauses[0];
  providerClause.mode = "coordinate";
  providerClause.dependency_actor_refs = ["actor.employer-coalition"];
  const employerClause = circular.provider_plans[1].when_clauses[0];
  employerClause.mode = "coordinate";
  employerClause.dependency_actor_refs = ["actor.worker-transition-provider"];
  circular.public_projection = computePublicProjection(circular);
  assert.equal(hasCode(validate(circular), "PROVIDER_DEPENDENCY_CYCLE"), true);
});

test("every materially related provider has a plan or public exclusion", () => {
  const missing = clone(fixture);
  missing.provider_plans = missing.provider_plans.filter(({ actor_ref: actorRef }) =>
    actorRef !== "actor.employer-coalition");
  missing.public_projection = computePublicProjection(missing);
  assert.equal(hasCode(validate(missing), "RELEVANT_PROVIDER_PLAN_MISSING"), true);
});
