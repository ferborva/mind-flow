import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

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

function gateEligibility(overrides = {}) {
  return {
    evaluation_id: "evaluation.au-clerical-access-margin.2026-09-08",
    condition_definition_ref: structuredClone(validOption.condition_definition_ref),
    gate_ref: `#/gates/${validOption.bound_gate}`,
    truth_state: "true",
    eligibility_state: "eligible",
    eligibility_basis: "candidate-phase",
    authorisation_effect: "none",
    evaluated_at: "2026-09-08T00:00:00Z",
    ...overrides,
  };
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
const asOf = "2026-09-08T00:00:00Z";
const settings = Object.freeze({
  condition,
  gate_eligibility: gateEligibility(),
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

test("one bound gate requires eligible, explicitly non-authorising evaluation input", () => {
  assert.equal(validOption.bound_gate, "act");

  const missing = validateConditionalOption(validOption, { condition, as_of: asOf });
  assert.ok(hasCode(missing, "MISSING_GATE_ELIGIBILITY"));

  const wrongGate = validateConditionalOption(validOption, {
    ...settings,
    gate_eligibility: gateEligibility({ gate_ref: "#/gates/watch" }),
  });
  assert.ok(hasCode(wrongGate, "GATE_ELIGIBILITY_MISMATCH"));

  const ineligible = validateConditionalOption(validOption, {
    ...settings,
    gate_eligibility: gateEligibility({ eligibility_state: "ineligible" }),
  });
  assert.ok(hasCode(ineligible, "GATE_NOT_ELIGIBLE"));

  const authorising = validateConditionalOption(validOption, {
    ...settings,
    gate_eligibility: gateEligibility({ authorisation_effect: "authorised" }),
  });
  assert.ok(hasCode(authorising, "GATE_ELIGIBILITY_AUTHORISING"));

  const wrongBasis = validateConditionalOption(validOption, {
    ...settings,
    gate_eligibility: gateEligibility({ eligibility_basis: "safety-pause" }),
  });
  assert.ok(hasCode(wrongBasis, "GATE_ELIGIBILITY_BASIS_MISMATCH"));

  const future = validateConditionalOption(validOption, {
    ...settings,
    gate_eligibility: gateEligibility({ evaluated_at: "2099-01-01T00:00:00Z" }),
  });
  assert.ok(hasCode(future, "FUTURE_GATE_EVALUATION"));
});

test("the caller-supplied gate trust boundary is explicit in contracts and documentation", () => {
  const readme = readFileSync(join(options, "README.md"), "utf8");
  assert.match(schema.description, /caller-supplied.*non-authorising.*not.*fact or authority/i);
  assert.match(readme, /caller-supplied/i);
  assert.match(readme, /not an evaluated fact/i);
  assert.match(readme, /does not prove authority/i);
});

test("gate policy governs verbs, object classes and in-scope services", () => {
  const watchProtection = structuredClone(validOption);
  watchProtection.bound_gate = "watch";
  const watchResult = validateConditionalOption(watchProtection, {
    ...settings,
    gate_eligibility: gateEligibility({ gate_ref: "#/gates/watch" }),
  });
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
  const conditionBoundEligibility = gateEligibility({
    condition_definition_ref: structuredClone(conditionBoundOption.condition_definition_ref),
  });
  assert.ok(hasCode(validateConditionalOption(conditionBoundOption, {
    condition: shortCondition,
    gate_eligibility: conditionBoundEligibility,
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
    assert.match(record.text, new RegExp(`blocking ${concern} dissent`, "i"));
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
  assert.match(record.text, /Dissent recorded: evidence by candidate\.actor\.clerical-workers/i);
  assert.deepEqual(record.dissent, surfaced.dissent);
});

test("renderer returns one atomic public record with bound refs and a verifiable digest", () => {
  const record = renderConditionalOption(validOption, settings);
  assert.deepEqual(Object.keys(record).sort(), [
    "actor_ref",
    "condition_ref",
    "dissent",
    "expires_at",
    "gate_ref",
    "option_id",
    "output_digest",
    "publication_state",
    "record_version",
    "scope_ref",
    "text",
  ]);
  assert.equal(record.actor_ref.id, validOption.actor_ref);
  assert.deepEqual(record.condition_ref, validOption.condition_definition_ref);
  assert.equal(record.gate_ref.path, "#/gates/act");
  assert.equal(record.gate_ref.authorisation_effect, "none");
  assert.deepEqual(record.scope_ref.scope, condition.scope);
  assert.equal(record.scope_ref.checksum, checksumJson(condition.scope));
  const { output_digest: outputDigest, ...unsigned } = record;
  assert.equal(outputDigest, checksumJson(unsigned));
  assert.match(record.text, /^\[AGENT-PROPOSED OPTION, NOT AUTHORISED;/);
  assert.match(record.text, /could consider an option to protect income, housing and healthcare continuity/);
  assert.match(record.text, /eligible gate evaluation is non-authorising/i);
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
    () => renderConditionalOption(validOption, { condition, gate_eligibility: settings.gate_eligibility }),
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
