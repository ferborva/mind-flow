import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessPreparationRegister,
  assertPreparationRegister,
  checksumJson,
} from "../lib/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function decodePointerPart(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function applyOperations(source, operations) {
  const target = structuredClone(source);
  for (const operation of operations) {
    const parts = operation.path.split("/").slice(1).map(decodePointerPart);
    const key = parts.pop();
    const parent = parts.reduce((value, part) => value[part], target);
    if (operation.op === "remove") delete parent[key];
    else if (operation.op === "add" || operation.op === "replace") parent[key] = operation.value;
    else throw new Error(`Unsupported hostile operation ${operation.op}`);
  }
  return target;
}

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

function refreshEvidenceChain(register, bundle) {
  bundle.checksum = checksumJson(bundle.content);
  for (const evaluation of register.if_evaluations) {
    if (evaluation.content.evidence_bundle_ref.id !== bundle.id
      || evaluation.content.evidence_bundle_ref.version !== bundle.version) continue;
    evaluation.content.evidence_bundle_ref.checksum = bundle.checksum;
    evaluation.checksum = checksumJson(evaluation.content);
    for (const action of register.actions) {
      if (action.if_binding.evaluation_ref.id === evaluation.id
        && action.if_binding.evaluation_ref.version === evaluation.version) {
        action.if_binding.evaluation_ref.checksum = evaluation.checksum;
      }
      if (action.evidence_bundle_ref.id === bundle.id
        && action.evidence_bundle_ref.version === bundle.version) {
        action.evidence_bundle_ref.checksum = bundle.checksum;
      }
    }
  }
}

const actionSchema = readJson(join(root, "schema", "preparation-action.schema.json"));
const registerSchema = readJson(join(root, "schema", "preparation-register.schema.json"));
const fixture = readJson(join(root, "fixtures", "valid", "round-03.register.json"));

test("closed schemas accept the public register and reject authority claims", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(actionSchema);
  const validate = ajv.compile(registerSchema);

  assert.equal(validate(fixture), true, ajv.errorsText(validate.errors));
  assert.equal(fixture.schema_version, "1.1.0");
  assert.ok(fixture.actions.every((action) => action.schema_version === "1.1.0"));
  assert.equal(fixture.authorisation_effect, "none");
  assert.ok(fixture.actions.every((action) =>
    action.authorisation_effect === "none" && action.record_kind === "proposal"));

  const authorityLaundering = structuredClone(fixture);
  authorityLaundering.actions[0].authorisation_effect = "execute";
  assert.equal(validate(authorityLaundering), false);
});

test("the valid register covers all four scales without cross-scale command fiction", () => {
  assert.doesNotThrow(() => assertPreparationRegister(fixture));
  assert.deepEqual(
    new Set(fixture.actions.map(({ scale }) => scale)),
    new Set(["individual", "community", "institution", "country"]),
  );
  for (const action of fixture.actions) {
    assert.equal(action.actor.authority_boundary.may_command_other_actors, false);
    assert.ok(action.actor.authority_boundary.cannot_control.length > 0);
    assert.ok(action.cross_actor_dependencies.length > 0);
  }
});

test("each proposal closes its verb, object, IF, evidence, owner and control bindings", () => {
  for (const action of fixture.actions) {
    assert.match(action.public_sentence, new RegExp(`^Proposal: ${action.verb} `));
    assert.ok(action.public_sentence.includes(" IF "));
    assert.ok(action.if_binding.expression_ref.checksum.startsWith("sha256:"));
    assert.ok(action.if_binding.evaluation_ref.checksum.startsWith("sha256:"));
    assert.ok(action.evidence_bundle_ref.checksum.startsWith("sha256:"));
    assert.ok(action.affected_party_dispositions.length > 0);
    assert.ok(action.controls.start_conditions.length > 0);
    assert.ok(action.controls.stop_conditions.length > 0);
    assert.ok(action.controls.review_conditions.length > 0);
    assert.ok(action.recovery_path.steps.length > 0);
    assert.equal(action.inaction_comparator.authorisation_effect, "none");
  }
});

test("all content-addressed references resolve and are recomputed", () => {
  for (const expression of fixture.if_expressions) {
    assert.equal(expression.checksum, checksumJson(expression.content));
  }
  for (const evaluation of fixture.if_evaluations) {
    assert.equal(evaluation.checksum, checksumJson(evaluation.content));
  }
  for (const bundle of fixture.evidence_bundles) {
    assert.equal(bundle.checksum, checksumJson(bundle.content));
  }
});

test("hostile mutations fail with their declared machine-readable errors", () => {
  const attacks = readdirSync(join(root, "fixtures", "hostile"))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(join(root, "fixtures", "hostile", name)));

  assert.ok(attacks.length >= 10);
  for (const attack of attacks) {
    const result = assessPreparationRegister(applyOperations(fixture, attack.operations));
    assert.equal(result.structurally_publishable_proposal, false, attack.id);
    for (const code of attack.expected_codes) {
      assert.ok(hasCode(result, code), `${attack.id}:${code}\n${JSON.stringify(result.errors, null, 2)}`);
    }
    assert.equal(result.action_authorised, false, attack.id);
  }
});

test("irreversible proposals carry a higher evidence, authority and consent burden", () => {
  const irreversible = fixture.actions.find(({ reversibility }) =>
    reversibility.class === "irreversible");
  assert.ok(irreversible);
  const bundle = fixture.evidence_bundles.find(({ id }) =>
    id === irreversible.evidence_bundle_ref.id);
  assert.equal(bundle.content.quality, "validated");
  assert.equal(irreversible.authority_evidence.state,
    "caller-asserted-verified-with-independent-review");
  assert.ok(irreversible.affected_party_dispositions
    .filter(({ relationships }) => relationships.includes("burdened"))
    .every(({ disposition, necessity_evaluation_ref: necessityRef }) =>
      disposition === "consented" || necessityRef !== null));
  assert.ok(fixture.actions.flatMap(({ affected_party_dispositions: parties }) => parties)
    .every(({ disposition }) => disposition !== "necessity-test-passed"));
});

test("the emergency exception is narrow, timeboxed, safeguarded and reviewable", () => {
  const emergency = fixture.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  assert.ok(emergency);
  assert.ok(["pause", "protect", "provide"].includes(emergency.verb));
  assert.ok(emergency.emergency_exception.rights_safeguards.length >= 2);
  assert.ok(Date.parse(emergency.emergency_exception.ends_at)
    - Date.parse(emergency.emergency_exception.starts_at) <= 7 * 24 * 60 * 60 * 1000);
  assert.ok(Date.parse(emergency.emergency_exception.retrospective_review_by)
    - Date.parse(emergency.emergency_exception.ends_at) <= 30 * 24 * 60 * 60 * 1000);
});

test("contract conformance never asserts action authority or empirical truth", () => {
  const assessment = assessPreparationRegister(fixture);
  assert.deepEqual(assessment, {
    schema_conformant: true,
    register_consistent: true,
    structurally_publishable_proposal: true,
    evidence_truth_assessed: false,
    actor_identity_verified: false,
    action_authorised: false,
    errors: [],
  });
});

test("a coherent false IF remains publishable for early preparation but cannot start action", () => {
  const beforeTrigger = structuredClone(fixture);
  const evaluation = beforeTrigger.if_evaluations[0];
  const bundle = beforeTrigger.evidence_bundles.find(({ id }) =>
    id === evaluation.content.evidence_bundle_ref.id);
  const source = bundle.content.sources.find(({ evidence_id: id }) =>
    id === "evidence.household-access-test");
  for (const observation of source.observations) observation.value = 10;
  evaluation.content.clause_results[0].result = "false";
  evaluation.content.result = "false";
  refreshEvidenceChain(beforeTrigger, bundle);

  const assessment = assessPreparationRegister(beforeTrigger);
  assert.equal(assessment.structurally_publishable_proposal, true);
  assert.equal(assessment.action_authorised, false);
  assert.equal(beforeTrigger.actions[0].if_binding.required_result, "true");
  assert.equal(evaluation.content.result, "false");
});

test("IF expressions bind canonical evolution-ledger tips instead of parallel prose history", () => {
  for (const expression of fixture.if_expressions) {
    assert.equal("evolution" in expression.content, false);
    assert.match(expression.content.condition_binding.ledger_ref,
      /^urn:mind-flow:condition-ledger:/);
    assert.match(expression.content.condition_binding.ledger_tip_hash, /^sha256:/);
    assert.equal(expression.content.condition_binding.verification_state, "external-unverified");
  }
});

test("the README makes the public trust boundary and inaction comparison legible", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /proposal.*not.*instruction/is);
  assert.match(readme, /valid.*does not.*authorise/is);
  assert.match(readme, /inaction.*not.*safe/is);
  assert.match(readme, /individual.*community.*institution.*country/is);
  assert.match(readme, /emergency.*seven days.*retrospective review/is);
  assert.match(readme, /node --test preparation\/tests\/\*\.test\.mjs/);
});

test("typed observations determine clause results and stale evidence becomes unknown", () => {
  const contradicted = structuredClone(fixture);
  const action = contradicted.actions.find(({ action_id: id }) =>
    id === "action.country-payment-containment");
  const bundle = contradicted.evidence_bundles.find(({ id }) =>
    id === action.evidence_bundle_ref.id);
  const telemetry = bundle.content.sources.find(({ evidence_id: id }) =>
    id === "evidence.payment-telemetry");
  telemetry.observations.find(({ measure }) => measure === "payment-integrity-risk").value = 0;
  refreshEvidenceChain(contradicted, bundle);
  let result = assessPreparationRegister(contradicted);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "CLAUSE_RESULT_MISMATCH"));

  const stale = structuredClone(fixture);
  const staleAction = stale.actions.find(({ action_id: id }) =>
    id === "action.country-payment-containment");
  const staleBundle = stale.evidence_bundles.find(({ id }) =>
    id === staleAction.evidence_bundle_ref.id);
  for (const source of staleBundle.content.sources) {
    for (const observation of source.observations) {
      observation.valid_until = "2026-09-07T00:00:00Z";
    }
  }
  refreshEvidenceChain(stale, staleBundle);
  result = assessPreparationRegister(stale);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "STALE_CLAUSE_EVIDENCE"));
  assert.ok(hasCode(result, "CLAUSE_RESULT_MISMATCH"));

  const disclosedUnknown = structuredClone(fixture);
  const unknownEvaluation = disclosedUnknown.if_evaluations[0];
  const unknownBundle = disclosedUnknown.evidence_bundles.find(({ id }) =>
    id === unknownEvaluation.content.evidence_bundle_ref.id);
  for (const observation of unknownBundle.content.sources[0].observations) {
    observation.valid_until = "2026-09-07T00:00:00Z";
  }
  unknownEvaluation.content.clause_results[0].result = "unknown";
  unknownEvaluation.content.result = "unknown";
  refreshEvidenceChain(disclosedUnknown, unknownBundle);
  result = assessPreparationRegister(disclosedUnknown);
  assert.equal(result.structurally_publishable_proposal, true, JSON.stringify(result.errors));
});

test("emergency gates require coherent live resources, committed dependencies and executable controls", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  action.cross_actor_dependencies[0].commitment_state = "declined";
  action.resources.funding.amount = 0;
  action.resources.capacity.readiness_valid_until = "2026-09-07T00:00:00Z";
  action.controls.start_conditions = action.controls.start_conditions
    .filter(({ gate }) => gate !== "if-true");
  action.emergency_exception.independent_reviewer.relationship = "self-review";

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  for (const code of [
    "EMERGENCY_DEPENDENCY_NOT_READY",
    "EMERGENCY_FUNDING_NONPOSITIVE",
    "CAPACITY_READINESS_STALE",
    "REQUIRED_CONTROL_GATE_MISSING",
    "EMERGENCY_REVIEW_NOT_INDEPENDENT",
  ]) assert.ok(hasCode(result, code), code);
});

test("an action must fit a structured actor capability", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions.find(({ scale }) => scale === "community");
  const expression = attacked.if_expressions.find(({ id }) =>
    id === action.if_binding.expression_ref.id);
  action.verb = "pause";
  action.public_sentence = `Proposal: ${action.verb} ${action.object.description} IF ${expression.content.plain_language}. This record does not authorise action.`;

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "ACTION_OUTSIDE_AUTHORITY_CAPABILITY"));
});

test("the comparator headline is derived from symmetric evidence-bound estimates", () => {
  const attacked = structuredClone(fixture);
  const comparator = attacked.actions[0].inaction_comparator;
  comparator.comparison = comparator.comparison === "action-appears-safer"
    ? "inaction-appears-safer"
    : "action-appears-safer";

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "COMPARATOR_HEADLINE_MISMATCH"));
  for (const outcome of comparator.expected_outcomes) {
    assert.equal(typeof outcome.with_action.estimate, "number");
    assert.equal(typeof outcome.without_action.estimate, "number");
    assert.ok(outcome.evidence_refs.length > 0);
  }

  const unboundEstimate = structuredClone(fixture);
  unboundEstimate.actions[0].inaction_comparator.expected_outcomes[0]
    .with_action.estimate += 0.01;
  const evidenceResult = assessPreparationRegister(unboundEstimate);
  assert.equal(evidenceResult.structurally_publishable_proposal, false);
  assert.ok(hasCode(evidenceResult, "COMPARATOR_ESTIMATE_EVIDENCE_MISMATCH"));
});

test("affected-party coverage is scope-bound and evidence must name the party", () => {
  const omitted = structuredClone(fixture);
  const action = omitted.actions.find(({ reversibility }) =>
    reversibility.class === "irreversible");
  action.affected_party_dispositions[0].party_id = "party.friendly-advisor";
  let result = assessPreparationRegister(omitted);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "PARTY_SCOPE_COVERAGE_MISMATCH"));

  const wrongEvidence = structuredClone(fixture);
  const evidenceAction = wrongEvidence.actions.find(({ reversibility }) =>
    reversibility.class === "irreversible");
  evidenceAction.affected_party_dispositions[0].evidence_ref = "evidence.rights-audit";
  result = assessPreparationRegister(wrongEvidence);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "PARTY_EVIDENCE_ROLE_INVALID"));
});

test("decision-linked proposals bind a verified canonical condition-ledger tip", () => {
  for (const expression of fixture.if_expressions) {
    assert.equal("evolution" in expression.content, false);
    assert.match(expression.content.condition_binding.ledger_tip_hash, /^sha256:/);
  }

  const attacked = structuredClone(fixture);
  attacked.actions[0].decision_use = "public-decision";
  const expression = attacked.if_expressions.find(({ id }) =>
    id === attacked.actions[0].if_binding.expression_ref.id);
  expression.content.condition_binding.verification_state = "external-unverified";
  expression.checksum = checksumJson(expression.content);
  attacked.actions[0].if_binding.expression_ref.checksum = expression.checksum;
  const evaluation = attacked.if_evaluations.find(({ id }) =>
    id === attacked.actions[0].if_binding.evaluation_ref.id);
  evaluation.content.expression_ref.checksum = expression.checksum;
  evaluation.checksum = checksumJson(evaluation.content);
  attacked.actions[0].if_binding.evaluation_ref.checksum = evaluation.checksum;

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "CONDITION_LEDGER_UNVERIFIED"));
});

test("assessment language and claimed authority states do not launder verification", () => {
  const result = assessPreparationRegister(fixture);
  assert.equal(result.structurally_publishable_proposal, true);
  assert.equal("safe_to_publish_as_proposal" in result, false);
  assert.ok(fixture.actions.every(({ authority_evidence: evidence }) =>
    evidence.state.startsWith("caller-asserted-")));
  assert.ok(fixture.evidence_bundles.flatMap(({ content }) => content.sources)
    .every((source) => source.artifact_state === "synthetic-fixture"
      && source.trust_state === "unverified"));
});

test("recovery resources remain reserved through their explicit completion deadline", () => {
  const attacked = structuredClone(fixture);
  const recovery = attacked.actions[0].recovery_path;
  recovery.funding_valid_through = "2026-09-08T00:00:01Z";

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "RECOVERY_RESOURCES_EXPIRE_EARLY"));
});

test("retrospective review must begin strictly after emergency containment ends", () => {
  const attacked = structuredClone(fixture);
  const action = attacked.actions.find(({ reversibility }) =>
    reversibility.class === "emergency-containment");
  action.emergency_exception.retrospective_review_by = action.emergency_exception.ends_at;

  const result = assessPreparationRegister(attacked);
  assert.equal(result.structurally_publishable_proposal, false);
  assert.ok(hasCode(result, "EMERGENCY_REVIEW_WINDOW_INVALID"));
});
