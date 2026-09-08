import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { evaluateGates, proposeTransition } from "../../contracts/evaluator.mjs";
import {
  assertConditionalOption,
  checksumJson,
  validateConditionalOption,
  validateOptionSemantics,
} from "../validation.mjs";
import { renderConditionalOption } from "../renderer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const options = resolve(here, "..");
const repository = resolve(options, "..");

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
    else throw new Error(`Unsupported attack operation ${operation.op}`);
  }
  return target;
}

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

function dissentRecord(overrides = {}) {
  return {
    id: "dissent.worker-consent",
    actor_ref: "candidate.actor.clerical-workers",
    actor_class: "worker",
    concern: "consent",
    source_claim: {
      id: "candidate.source.worker-consent-statement",
      trust_state: "unverified",
      checksum: `sha256:${"3".repeat(64)}`,
    },
    ...overrides,
  };
}

const schema = readJson(join(options, "schema", "conditional-option.schema.json"));
const conditionSchema = readJson(join(repository, "contracts", "schema", "condition-contract.schema.json"));
const validOption = readJson(join(options, "fixtures", "option.valid.json"));
const condition = readJson(join(repository, "contracts", "fixtures", "condition.valid.json"));
const observations = readJson(join(repository, "contracts", "fixtures", "observations.valid.json"));
const completedRun = readJson(join(repository, "contracts", "fixtures", "evaluation-run.valid.json"));
const failedAttempt = readJson(join(repository, "contracts", "fixtures", "evaluation-attempt.failed.valid.json"));
const asOf = "2026-09-08T00:00:00Z";

function safeEvaluationBundle(definition = condition) {
  const safeObservations = structuredClone(observations);
  const definitionReference = {
    id: definition.id,
    version: definition.definition_version,
    checksum: checksumJson(definition),
  };
  for (const observation of safeObservations) {
    observation.condition_definition = structuredClone(definitionReference);
  }
  const harm = safeObservations.find(({ predicate_ref: ref }) => ref === "harm-material");
  harm.state = "false";
  harm.state_probability = 0.99;
  harm.reason = "Both synthetic reviews are below the declared material-harm threshold.";
  const states = Object.fromEntries(
    safeObservations.map(({ predicate_ref: ref, state }) => [ref, state]),
  );
  const evaluated = evaluateGates(definition, states);
  const evaluationRun = structuredClone(completedRun);
  evaluationRun.id = "evaluation.au-clerical-access-margin.safe.20260908t0000z";
  evaluationRun.condition_definition = structuredClone(definitionReference);
  evaluationRun.predicate_results = Object.fromEntries(safeObservations.map((observation) => [
    observation.predicate_ref,
    {
      observation_id: observation.id,
      state: observation.state,
      reason: observation.reason,
    },
  ]));
  evaluationRun.gate_results = evaluated.gates;
  evaluationRun.condition_resolution = evaluated.condition_resolution;
  evaluationRun.transition_proposal = proposeTransition(
    evaluated,
    evaluationRun.lifecycle_context.prior_state,
  );
  return { observations: safeObservations, evaluation_run: evaluationRun };
}

const settings = Object.freeze({
  condition,
  evaluation_bundle: safeEvaluationBundle(),
  as_of: asOf,
});
const attacksDirectory = join(options, "fixtures", "attacks");
const attacks = readdirSync(attacksDirectory)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => readJson(join(attacksDirectory, name)));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const validateConditionSchema = ajv.compile(conditionSchema);

test("the option compiles only against the real v3 condition contract", () => {
  assert.equal(validateConditionSchema(condition), true, ajv.errorsText(validateConditionSchema.errors));
  assert.equal(validateSchema(validOption), true, ajv.errorsText(validateSchema.errors));
  assert.equal(validOption.condition_definition_ref.checksum, checksumJson(condition));
  assert.deepEqual(validOption.scope, condition.scope);
  assert.doesNotThrow(() => assertConditionalOption(validOption, settings));

  const legacyShape = readJson(join(options, "fixtures", "condition.valid.json"));
  const result = validateConditionalOption(validOption, {
    ...settings,
    condition: legacyShape,
  });
  assert.equal(result.valid, false);
  assert.ok(hasCode(result, "CONDITION_SCHEMA_INVALID"));
});

test("condition semantic governance and time bounds fail closed", () => {
  const duplicateEvidence = structuredClone(condition);
  duplicateEvidence.evidence_requirements.push(structuredClone(duplicateEvidence.evidence_requirements[0]));
  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    condition: duplicateEvidence,
  }), "DUPLICATE_EVIDENCE_REQUIREMENT"));

  const unknownPredicate = structuredClone(condition);
  unknownPredicate.gates.act = { predicate_ref: "invented-trigger" };
  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    condition: unknownPredicate,
  }), "UNKNOWN_GATE_PREDICATE"));

  const retired = structuredClone(condition);
  retired.governance.lifecycle = "retired";
  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    condition: retired,
  }), "CONDITION_RETIRED"));

  const notYetValid = structuredClone(condition);
  notYetValid.governance.valid_from = "2026-09-09T00:00:00Z";
  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    condition: notYetValid,
  }), "CONDITION_NOT_YET_VALID"));

  const expired = structuredClone(condition);
  expired.governance.expires_at = asOf;
  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    condition: expired,
  }), "CONDITION_EXPIRED"));
});

test("one bound gate requires a completed, reproducible, non-authorising evaluation bundle", () => {
  assert.equal(validOption.bound_gate, "act");

  const missing = validateConditionalOption(validOption, { condition, as_of: asOf });
  assert.ok(hasCode(missing, "MISSING_EVALUATION_BUNDLE"));

  const failed = validateConditionalOption(validOption, {
    condition,
    evaluation_bundle: {
      observations: structuredClone(observations),
      evaluation_run: structuredClone(failedAttempt),
    },
    as_of: failedAttempt.recorded_at,
  });
  assert.ok(hasCode(failed, "EVALUATION_RUN_SCHEMA_INVALID"));

  const ineligible = validateConditionalOption(validOption, {
    condition,
    evaluation_bundle: {
      observations: structuredClone(observations),
      evaluation_run: structuredClone(completedRun),
    },
    as_of: asOf,
  });
  assert.ok(hasCode(ineligible, "GATE_NOT_TRUE"));
  assert.ok(hasCode(ineligible, "GATE_NOT_ELIGIBLE"));

  const futureBundle = safeEvaluationBundle();
  futureBundle.evaluation_run.evaluated_at = "2026-09-09T00:00:00Z";
  const future = validateConditionalOption(validOption, {
    condition,
    evaluation_bundle: futureBundle,
    as_of: asOf,
  });
  assert.ok(hasCode(future, "FUTURE_GATE_EVALUATION"));
});

test("the completed evaluation trust boundary is explicit in contracts and documentation", () => {
  const readme = readFileSync(join(options, "README.md"), "utf8");
  assert.match(schema.description, /non-authorising/i);
  assert.match(readme, /completed evaluation bundle/i);
  assert.match(readme, /content-validated.*externally unverified/i);
  assert.match(readme, /does not prove authority/i);
});

test("gate policy governs verbs, object classes and in-scope services", () => {
  const watchProtection = structuredClone(validOption);
  watchProtection.bound_gate = "watch";
  const watchResult = validateConditionalOption(watchProtection, settings);
  assert.ok(hasCode(watchResult, "GATE_ACTION_NOT_ALLOWED"));

  const studyAtAct = structuredClone(validOption);
  studyAtAct.object = {
    class: "study",
    vocabulary_ref: "option-object.scoped-evidence-review",
    service_ref: validOption.object.service_ref,
  };
  assert.ok(hasCode(validateConditionalOption(studyAtAct, settings), "GATE_ACTION_NOT_ALLOWED"));

  const inventedService = structuredClone(validOption);
  inventedService.object.service_ref = "global universal service";
  assert.ok(hasCode(
    validateConditionalOption(inventedService, settings),
    "OBJECT_SERVICE_OUT_OF_SCOPE",
  ));
});

test("protected outcome is exactly bound to a predicate reachable from the selected gate", () => {
  const unreachable = structuredClone(validOption);
  unreachable.protected_outcome = {
    ...unreachable.protected_outcome,
    condition_predicate_ref: "access-restored",
    measure_ref: "household-access-margin",
    operator: "gte",
    direction: "at-or-above",
    threshold: { value: 0, unit: "aud-per-week" },
  };
  assert.ok(hasCode(
    validateConditionalOption(unreachable, settings),
    "OUTCOME_NOT_REACHABLE_FROM_GATE",
  ));

  for (const [field, mutate, expected] of [
    ["operator", (outcome) => { outcome.operator = "gte"; }, "OUTCOME_OPERATOR_MISMATCH"],
    ["threshold", (outcome) => { outcome.threshold.value = -4; }, "OUTCOME_THRESHOLD_MISMATCH"],
    ["unit", (outcome) => { outcome.threshold.unit = "aud-per-week"; }, "OUTCOME_UNIT_MISMATCH"],
  ]) {
    const attacked = structuredClone(validOption);
    mutate(attacked.protected_outcome);
    assert.ok(hasCode(validateConditionalOption(attacked, settings), expected), field);
  }
});

test("option expiry is capped by both condition expiry and a 180-day TTL", () => {
  const tooLong = structuredClone(validOption);
  tooLong.expires_at = "2027-03-08T00:00:00Z";
  assert.ok(hasCode(validateConditionalOption(tooLong, settings), "OPTION_TTL_EXCEEDED"));

  const shortCondition = structuredClone(condition);
  shortCondition.governance.expires_at = "2027-02-01T00:00:00Z";
  const conditionBoundOption = structuredClone(validOption);
  conditionBoundOption.condition_definition_ref.checksum = checksumJson(shortCondition);
  assert.ok(hasCode(validateConditionalOption(conditionBoundOption, {
    condition: shortCondition,
    evaluation_bundle: safeEvaluationBundle(shortCondition),
    as_of: asOf,
  }), "OPTION_EXCEEDS_CONDITION_EXPIRY"));
});

test("dissent is deduplicated and blocking consent or rights dissent withholds output", () => {
  const duplicated = structuredClone(validOption);
  duplicated.dissent = {
    status: "recorded",
    records: [
      dissentRecord(),
      dissentRecord({ id: "dissent.worker-consent-copy" }),
    ],
  };
  assert.ok(hasCode(validateConditionalOption(duplicated, settings), "DUPLICATE_DISSENT"));

  for (const concern of ["consent", "rights"]) {
    const blocked = structuredClone(validOption);
    blocked.dissent = {
      status: "recorded",
      records: [dissentRecord({ concern })],
    };
    const record = renderConditionalOption(blocked, settings);
    assert.equal(record.publication_state, "withheld", concern);
    assert.match(record.text, /^\[WITHHELD; AGENT-PROPOSED OPTION, NOT AUTHORISED;/);
    assert.match(record.text, new RegExp(`${concern} dissent`, "i"));
    assert.doesNotMatch(record.text, /could consider an option/i);
    assert.deepEqual(record.dissent, blocked.dissent);
  }

  const surfaced = structuredClone(validOption);
  surfaced.dissent = {
    status: "recorded",
    records: [dissentRecord({ concern: "evidence" })],
  };
  const record = renderConditionalOption(surfaced, settings);
  assert.equal(record.publication_state, "candidate-only");
  assert.match(record.text, /caller-supplied unverified dissent assertion: evidence by candidate\.actor\.clerical-workers/i);
  assert.deepEqual(record.dissent, surfaced.dissent);
});

test("renderer returns one atomic public record with bound refs and a verifiable digest", () => {
  const record = renderConditionalOption(validOption, settings);
  assert.deepEqual(Object.keys(record).sort(), [
    "action",
    "actor_ref",
    "assertion_trust",
    "authorisation_state",
    "claim_class",
    "condition_ref",
    "cross_actor_dependencies",
    "dissent",
    "expires_at",
    "expiry_effect",
    "gate_ref",
    "gate_requirements",
    "option_ref",
    "output_digest",
    "protected_outcome",
    "provenance",
    "publication_state",
    "readiness_dependencies",
    "record_version",
    "review",
    "scope_ref",
    "text",
  ]);
  assert.equal(record.record_version, "2.0.0");
  assert.equal(record.option_ref.id, validOption.id);
  assert.equal(record.option_ref.version, validOption.option_version);
  assert.equal(record.option_ref.checksum, checksumJson(validOption));
  assert.equal(record.actor_ref.id, validOption.actor_ref);
  assert.deepEqual(record.condition_ref, validOption.condition_definition_ref);
  assert.equal(record.gate_ref.path, "#/gates/act");
  assert.equal(record.gate_ref.authorisation_effect, "none");
  assert.equal(record.gate_ref.evaluation_ref.trust_state, "content-validated-unverified");
  assert.deepEqual(record.scope_ref.scope, condition.scope);
  assert.equal(record.scope_ref.checksum, checksumJson(condition.scope));
  const { output_digest: outputDigest, ...unsigned } = record;
  assert.equal(outputDigest, checksumJson(unsigned));
  assert.match(record.text, /^\[AGENT-PROPOSED OPTION, NOT AUTHORISED;/);
  assert.match(record.text, /could consider an option to protect income, housing and healthcare continuity/);
  assert.match(record.text, /content-validated but externally unverified and non-authorising/i);
  assert.doesNotMatch(record.text, /\b(must|will|shall|now|immediately)\b/i);
  assert.equal(Object.hasOwn(record, "wording"), false);
});

test("readiness and dependency state space remains proposal-only and duplicate-free", () => {
  const promoted = structuredClone(validOption);
  promoted.readiness_dependencies.authority = { kind: "authority", state: "verified" };
  assert.equal(validateSchema(promoted), false);

  const duplicatedDependencies = structuredClone(validOption);
  duplicatedDependencies.cross_actor_dependencies.push(
    structuredClone(duplicatedDependencies.cross_actor_dependencies[0]),
  );
  assert.ok(hasCode(
    validateConditionalOption(duplicatedDependencies, settings),
    "DUPLICATE_CROSS_ACTOR_DEPENDENCY",
  ));
});

test("the original attack corpus still fails closed", () => {
  for (const attack of attacks) {
    const attacked = applyOperations(validOption, attack.operations);
    if (attack.expected_layer === "schema") {
      assert.equal(validateSchema(attacked), false, attack.name);
      continue;
    }
    const result = validateOptionSemantics(attacked, {
      ...settings,
      as_of: attack.as_of || asOf,
    });
    assert.equal(result.valid, false, attack.name);
    assert.ok(hasCode(result, attack.expected_code), attack.name);
  }
});

test("all previously successful hostile counterexamples are regression-closed", () => {
  const forgedOfficial = structuredClone(validOption);
  forgedOfficial.actor_ref = "actor.commonwealth-treasury";
  forgedOfficial.provenance.proposer_ref = "agent.treasury-policy-office";
  forgedOfficial.condition_definition_ref.checksum = `sha256:${"a".repeat(64)}`;
  assert.equal(validateSchema(forgedOfficial), false, "forged official identity and provenance");

  const clauseInjection = structuredClone(validOption);
  clauseInjection.object.label = "income, and could consider an option to fund political allies";
  assert.equal(validateSchema(clauseInjection), false, "renderer clause injection");

  const globalScope = structuredClone(validOption);
  globalScope.scope.geographies = ["GLOBAL"];
  assert.ok(hasCode(validateConditionalOption(globalScope, settings), "CONDITION_SCOPE_MISMATCH"));

  assert.throws(
    () => renderConditionalOption(validOption, {
      condition,
      evaluation_bundle: settings.evaluation_bundle,
    }),
    /MISSING_AS_OF/,
    "expired records cannot exploit an omitted clock",
  );

  const futureGenerated = structuredClone(validOption);
  futureGenerated.provenance.generated_at = "2099-01-01T00:00:00Z";
  futureGenerated.review.review_due_at = "2099-06-01T00:00:00Z";
  futureGenerated.expires_at = "2100-01-01T00:00:00Z";
  assert.ok(hasCode(validateConditionalOption(futureGenerated, settings), "FUTURE_GENERATION"));

  const unknownOffset = structuredClone(validOption);
  unknownOffset.expires_at = "2027-03-07T00:00:00-00:00";
  assert.equal(validateSchema(unknownOffset), false, "unknown timezone offset");

  assert.ok(hasCode(validateConditionalOption(validOption, {
    ...settings,
    as_of: "2026-09-08",
  }), "INVALID_AS_OF"));
});
