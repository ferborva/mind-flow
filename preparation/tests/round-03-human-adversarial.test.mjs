import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assessPreparationRegister,
  checksumJson,
  renderActionSentence,
  renderIfExpression,
} from "../lib/validate.mjs";

const fixture = JSON.parse(readFileSync(
  resolve(import.meta.dirname, "../fixtures/valid/round-03.register.json"),
  "utf8",
));

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

function refreshExpressionChain(register, expression) {
  expression.checksum = checksumJson(expression.content);
  for (const evaluation of register.if_evaluations) {
    if (evaluation.content.expression_ref.id !== expression.id) continue;
    evaluation.content.expression_ref.checksum = expression.checksum;
    evaluation.checksum = checksumJson(evaluation.content);
    for (const action of register.actions) {
      if (action.if_binding.expression_ref.id === expression.id) {
        action.if_binding.expression_ref.checksum = expression.checksum;
      }
      if (action.if_binding.evaluation_ref.id === evaluation.id) {
        action.if_binding.evaluation_ref.checksum = evaluation.checksum;
      }
    }
  }
}

function refreshEvidenceChain(register, bundle) {
  bundle.checksum = checksumJson(bundle.content);
  for (const evaluation of register.if_evaluations) {
    if (evaluation.content.evidence_bundle_ref.id !== bundle.id) continue;
    evaluation.content.evidence_bundle_ref.checksum = bundle.checksum;
    evaluation.checksum = checksumJson(evaluation.content);
    for (const action of register.actions) {
      if (action.if_binding.evaluation_ref.id === evaluation.id) {
        action.if_binding.evaluation_ref.checksum = evaluation.checksum;
      }
      if (action.evidence_bundle_ref.id === bundle.id) {
        action.evidence_bundle_ref.checksum = bundle.checksum;
      }
    }
  }
}

test("IF logic references every declared clause exactly once", () => {
  const attacked = structuredClone(fixture);
  const expression = attacked.if_expressions.find(({ id }) =>
    id === "if.country-emergency-containment");
  expression.content.logic = {
    all: [
      { clause_ref: "payment-failure-imminent" },
      { clause_ref: "payment-failure-imminent" },
    ],
  };
  refreshExpressionChain(attacked, expression);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "IF_LOGIC_CLAUSE_COVERAGE_MISMATCH"));
});

test("public IF language is a deterministic rendering of complete typed logic", () => {
  for (const expression of fixture.if_expressions) {
    assert.equal(expression.content.plain_language, renderIfExpression(expression.content));
  }

  const attacked = structuredClone(fixture);
  const expression = attacked.if_expressions[0];
  expression.content.plain_language = "a friendlier but incomplete paraphrase";
  const action = attacked.actions.find(({ if_binding: binding }) =>
    binding.expression_ref.id === expression.id);
  action.public_sentence = renderActionSentence(action, expression.content.plain_language);
  refreshExpressionChain(attacked, expression);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "IF_PUBLIC_RENDER_MISMATCH"));
});

test("observation scope cannot stay on Earth after a complete Mars claim mutation", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions[0];
  const expression = attacked.if_expressions.find(({ id }) =>
    id === action.if_binding.expression_ref.id);
  const evaluation = attacked.if_evaluations.find(({ id }) =>
    id === action.if_binding.evaluation_ref.id);
  for (const scoped of [action.scope, expression.content.scope, evaluation.content.scope]) {
    scoped.geographies = ["Mars Colony"];
    for (const evidenceScope of scoped.evidence_scopes) {
      evidenceScope.geography = "Mars Colony";
    }
  }
  for (const capability of action.actor.authority_boundary.capabilities) {
    capability.geographies = ["Mars Colony"];
  }
  action.public_sentence = renderActionSentence(action, expression.content.plain_language);
  refreshExpressionChain(attacked, expression);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "OBSERVATION_SCOPE_MISMATCH"));
});

test("only matching observations from contributing sources satisfy independence", () => {
  const attacked = structuredClone(fixture);
  const evaluation = attacked.if_evaluations.find(({ id }) =>
    id === "evaluation.community-service-drill.20260908");
  const bundle = attacked.evidence_bundles.find(({ id }) =>
    id === evaluation.content.evidence_bundle_ref.id);
  const source = bundle.content.sources.find(({ evidence_id: id }) =>
    id === "evidence.capacity-cross-check");
  source.observations[0].measure = "unrelated-capacity-measure";
  refreshEvidenceChain(attacked, bundle);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "IF_CONTRIBUTING_SOURCE_INDEPENDENCE_UNMET"));
});

test("a middle observation unused by change arithmetic does not count as contributing", () => {
  const attacked = structuredClone(fixture);
  const expression = attacked.if_expressions[0];
  const clause = expression.content.clauses[0];
  clause.operator = "change_lte";
  clause.threshold.value = -10;
  clause.minimum_independent_sources = 2;
  const evaluation = attacked.if_evaluations[0];
  evaluation.content.clause_results[0].evidence_refs.push("evidence.middle-only-check");
  const bundle = attacked.evidence_bundles.find(({ id }) =>
    id === evaluation.content.evidence_bundle_ref.id);
  bundle.content.sources.push({
    evidence_id: "evidence.middle-only-check",
    role: "observation",
    trust_state: "unverified",
    independence_group: "group.synthetic-middle-only",
    artifact_state: "synthetic-fixture",
    artifact_ref: "https://example.test/middle-only-check.json",
    artifact_checksum: `sha256:${"d".repeat(64)}`,
    party_ids: [],
    observations: [{
      observation_id: "observation.middle-only-check.1",
      measure: clause.measure,
      value: 999,
      unit: clause.threshold.unit,
      observed_at: "2026-08-15T00:00:00Z",
      valid_until: "2026-10-15T00:00:00Z",
      evidence_scope: structuredClone(expression.content.scope.evidence_scopes[0]),
    }],
    outcome_estimates: [],
    harm_estimates: [],
    finding: "Synthetic middle observation that does not enter first-to-last change arithmetic.",
    limitation: "Synthetic fixture only.",
  });
  refreshEvidenceChain(attacked, bundle);
  refreshExpressionChain(attacked, expression);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "IF_CONTRIBUTING_SOURCE_INDEPENDENCE_UNMET"));
});

test("duplicating a harm cannot change a comparator while remaining publishable", () => {
  const attacked = structuredClone(fixture);
  const comparator = attacked.actions[0].inaction_comparator;
  comparator.action_harms.push(structuredClone(comparator.action_harms[0]));
  comparator.comparison = "uncertain";

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "DUPLICATE_HARM_ID"));
});

test("a unique semantic harm identity is enforced even under a fresh record id", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions[0];
  const comparator = action.inaction_comparator;
  const duplicate = structuredClone(comparator.action_harms[0]);
  duplicate.harm_id = "harm.individual-transition-file.action-copy";
  comparator.action_harms.push(duplicate);
  comparator.comparison = "uncertain";
  const bundle = attacked.evidence_bundles.find(({ id }) =>
    id === action.evidence_bundle_ref.id);
  const source = bundle.content.sources.find(({ evidence_id: id }) =>
    id === duplicate.evidence_refs[0]);
  const evidenceDuplicate = structuredClone(source.harm_estimates.find(({ harm_id: id }) =>
    id === comparator.action_harms[0].harm_id));
  evidenceDuplicate.harm_id = duplicate.harm_id;
  source.harm_estimates.push(evidenceDuplicate);
  refreshEvidenceChain(attacked, bundle);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "DUPLICATE_HARM_SEMANTIC_IDENTITY"));
});

test("harm record identities remain unique across the whole register", () => {
  const attacked = structuredClone(fixture);
  attacked.actions[1].inaction_comparator.action_harms[0].harm_id =
    attacked.actions[0].inaction_comparator.action_harms[0].harm_id;

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "DUPLICATE_REGISTER_HARM_ID"));
});

test("a non-compensable party harm veto is derived before other benefits", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions[0];
  const comparator = action.inaction_comparator;
  const harm = comparator.action_harms[0];
  harm.severity_weight = 1;
  harm.likelihood = 1;
  comparator.comparison = "action-appears-safer";
  const bundle = attacked.evidence_bundles.find(({ id }) =>
    id === action.evidence_bundle_ref.id);
  const source = bundle.content.sources.find(({ evidence_id: id }) =>
    id === harm.evidence_refs[0]);
  const evidenceHarm = source.harm_estimates.find(({ harm_id: id }) =>
    id === harm.harm_id);
  evidenceHarm.severity_weight = harm.severity_weight;
  evidenceHarm.likelihood = harm.likelihood;
  refreshEvidenceChain(attacked, bundle);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  const mismatch = result.errors.find(({ code }) => code === "COMPARATOR_HEADLINE_MISMATCH");
  assert.match(mismatch?.message ?? "", /action-blocked-by-harm-veto/);
});

test("one party's worse harm cannot be offset by another party's improvement", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions[0];
  const expression = attacked.if_expressions.find(({ id }) =>
    id === action.if_binding.expression_ref.id);
  const evaluation = attacked.if_evaluations.find(({ id }) =>
    id === action.if_binding.evaluation_ref.id);
  const secondPartyId = "party.second-participating-individual";
  for (const scope of [action.scope, expression.content.scope, evaluation.content.scope]) {
    scope.affected_party_ids.push(secondPartyId);
  }
  action.affected_party_dispositions.push({
    party_id: secondPartyId,
    party: "Second participating individual",
    relationships: ["affected", "burdened"],
    disposition: "consented",
    evidence_ref: "evidence.second-party-consent",
    necessity_evaluation_ref: null,
    response: "The fictional fixture records consent for this scoped comparison.",
    safeguard: "Participation remains voluntary with the same remedy route.",
    challenge_route: action.affected_party_governance.challenge_route,
  });
  const comparator = action.inaction_comparator;
  const dimensionId = comparator.harm_taxonomy.dimensions[0].dimension_id;
  const actionHarm = {
    harm_id: "harm.second-participating-individual.action",
    party_id: secondPartyId,
    dimension_id: dimensionId,
    severity_weight: 0.2,
    likelihood: 0.1,
    evidence_refs: ["evidence.household-access-test"],
  };
  const inactionHarm = {
    harm_id: "harm.second-participating-individual.inaction",
    party_id: secondPartyId,
    dimension_id: dimensionId,
    severity_weight: 0.1,
    likelihood: 0.1,
    evidence_refs: ["evidence.household-access-test"],
  };
  comparator.action_harms.push(actionHarm);
  comparator.inaction_harms.push(inactionHarm);
  comparator.comparison = "action-appears-safer";

  const bundle = attacked.evidence_bundles.find(({ id }) =>
    id === action.evidence_bundle_ref.id);
  bundle.content.sources.push({
    evidence_id: "evidence.second-party-consent",
    role: "affected-party-testimony",
    trust_state: "unverified",
    independence_group: "group.synthetic-second-party-consent",
    artifact_state: "synthetic-fixture",
    artifact_ref: "https://example.test/second-party-consent.json",
    artifact_checksum: `sha256:${"e".repeat(64)}`,
    party_ids: [secondPartyId],
    observations: [],
    outcome_estimates: [],
    harm_estimates: [],
    finding: "Synthetic consent record for the second affected party.",
    limitation: "Synthetic fixture only; identity and consent are not authenticated.",
  });
  const estimateSource = bundle.content.sources.find(({ evidence_id: id }) =>
    id === "evidence.household-access-test");
  const { evidence_refs: actionEvidenceRefs, ...actionEvidence } = actionHarm;
  const { evidence_refs: inactionEvidenceRefs, ...inactionEvidence } = inactionHarm;
  assert.ok(actionEvidenceRefs.length > 0 && inactionEvidenceRefs.length > 0);
  estimateSource.harm_estimates.push(
    { ...actionEvidence, arm: "action" },
    { ...inactionEvidence, arm: "inaction" },
  );
  action.public_sentence = renderActionSentence(action, expression.content.plain_language);
  refreshEvidenceChain(attacked, bundle);
  refreshExpressionChain(attacked, expression);

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  const mismatch = result.errors.find(({ code }) => code === "COMPARATOR_HEADLINE_MISMATCH");
  assert.match(mismatch?.message ?? "", /uncertain/);
});

test("a caller-provided necessity status cannot satisfy an affected-party gate", () => {
  const attacked = structuredClone(fixture);
  attacked.actions[0].affected_party_dispositions[0].disposition =
    "necessity-test-passed";

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
});

test("necessity is derived from current scope, alternatives, dissent and appeal", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  action.affected_party_governance.necessity_evaluations[0].dissent.status = "unresolved";
  action.affected_party_governance.necessity_evaluations[0].dissent.records = [
    "Affected recipients dispute that the selected route is least restrictive.",
  ];

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "NECESSITY_DISSENT_UNRESOLVED"));
  assert.ok(hasCode(result, "EMERGENCY_RIGHTS_GATE_UNMET"));
});

test("recovery must follow the action and bind actual reserved resources", () => {
  const impossibleChronology = structuredClone(fixture);
  const action = impossibleChronology.actions[0];
  action.recovery_path.complete_by = action.generated_at;
  let result = assessPreparationRegister(impossibleChronology);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "RECOVERY_CHRONOLOGY_INVALID"));

  const expiredCapacity = structuredClone(fixture);
  expiredCapacity.actions[0].resources.capacity.readiness_valid_until =
    "2026-09-09T00:00:00Z";
  result = assessPreparationRegister(expiredCapacity);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "RECOVERY_RESOURCE_BINDING_INVALID"));

  const unreservedCapacity = structuredClone(fixture);
  unreservedCapacity.actions[0].resources.capacity.status = "conditional";
  result = assessPreparationRegister(unreservedCapacity);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "RECOVERY_RESOURCE_BINDING_INVALID"));
});

test("an acting body cannot label itself as its independent emergency reviewer", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  action.emergency_exception.independent_reviewer.organisation =
    action.accountable_owner.organisation;

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "EMERGENCY_REVIEWER_CONFLICT"));
});

test("reviewer independence remains caller-asserted and does not cross the trust boundary", () => {
  const action = fixture.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  assert.equal(action.emergency_exception.independent_reviewer.identity_state,
    "caller-asserted-unverified");
  assert.equal(action.emergency_exception.independent_reviewer.independence_state,
    "caller-asserted-unverified");
  assert.deepEqual(action.emergency_exception.independent_reviewer.conflict_checks, {
    employment: "none-declared",
    financial: "none-declared",
    reporting: "none-declared",
    appointment_control: "external-to-acting-body",
  });
  assert.equal(assessPreparationRegister(fixture).actor_identity_verified, false);
});
