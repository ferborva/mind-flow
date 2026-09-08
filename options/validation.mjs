import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const OPTION_GATES = Object.freeze([
  "watch",
  "prepare",
  "act",
  "pause",
  "reverse",
  "recover",
  "graduate",
]);

export const READINESS_DEPENDENCIES = Object.freeze([
  "authority",
  "consent",
  "funding",
  "service",
  "help",
  "appeal",
]);

export const MAX_OPTION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

const GATE_RELATIONS = Object.freeze({
  watch: "observe-when",
  prepare: "enable-when",
  act: "enable-when",
  pause: "block-when",
  reverse: "block-when",
  recover: "coexist-when",
  graduate: "end-when",
});

const GATE_ELIGIBILITY_BASES = Object.freeze({
  watch: "concurrent-watch-duty",
  prepare: "candidate-phase",
  act: "candidate-phase",
  pause: "safety-pause",
  reverse: "safety-reverse",
  recover: "concurrent-recovery-duty",
  graduate: "exit-candidate",
});

const GATE_ACTION_POLICY = Object.freeze({
  watch: new Set(["assess:study", "review:study"]),
  prepare: new Set([
    "assess:study",
    "consult:process",
    "coordinate:process",
    "pilot:safeguard",
    "prepare:process",
    "prepare:safeguard",
    "review:study",
  ]),
  act: new Set([
    "fund:service-continuity",
    "pilot:safeguard",
    "protect:service-continuity",
    "protect:safeguard",
    "provide:service-continuity",
  ]),
  pause: new Set(["pause:safeguard", "pause:service-continuity"]),
  reverse: new Set(["reverse:safeguard", "reverse:service-continuity"]),
  recover: new Set([
    "protect:service-continuity",
    "provide:service-continuity",
    "recover:safeguard",
    "recover:service-continuity",
  ]),
  graduate: new Set(["coordinate:process", "review:study"]),
});

const OPERATOR_DIRECTIONS = Object.freeze({
  gt: "at-or-above",
  gte: "at-or-above",
  lt: "at-or-below",
  lte: "at-or-below",
  eq: "maintain",
  change_gt: "increase",
  change_gte: "increase",
  change_lt: "decrease",
  change_lte: "decrease",
});

const CONDITION_LIFECYCLES = new Set(["shadow", "approved", "active", "paused"]);
const BLOCKING_DISSENT = new Set(["consent", "rights"]);
const STRICT_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;
const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

const optionSchema = JSON.parse(readFileSync(
  new URL("./schema/conditional-option.schema.json", import.meta.url),
  "utf8",
));
const conditionSchema = JSON.parse(readFileSync(
  new URL("../contracts/schema/condition-contract.schema.json", import.meta.url),
  "utf8",
));

const optionAjv = new Ajv2020({ allErrors: true, strict: true });
addFormats(optionAjv);
const validateOptionSchema = optionAjv.compile(optionSchema);
const conditionAjv = new Ajv2020({ allErrors: true, strict: true });
addFormats(conditionAjv);
const validateConditionSchema = conditionAjv.compile(conditionSchema);

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function checksumJson(value) {
  const canonicalBytes = Buffer.from(canonicalise(value), "utf8");
  return `sha256:${createHash("sha256").update(canonicalBytes).digest("hex")}`;
}

function problem(code, path, message) {
  return { code, path, message };
}

function strictUtcInstant(value) {
  if (typeof value !== "string") return null;
  const match = STRICT_UTC.exec(value);
  if (!match) return null;

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
    || date.getUTCSeconds() !== second
  ) return null;
  return parsed;
}

function duplicateIds(records) {
  const seen = new Set();
  return records
    .map((record) => record.id)
    .filter((id) => {
      if (seen.has(id)) return true;
      seen.add(id);
      return false;
    });
}

function expressionRefs(expression) {
  if (!expression || typeof expression !== "object") return [];
  if (typeof expression.predicate_ref === "string") return [expression.predicate_ref];
  if (Array.isArray(expression.all)) return expression.all.flatMap(expressionRefs);
  if (Array.isArray(expression.any)) return expression.any.flatMap(expressionRefs);
  if (expression.not) return expressionRefs(expression.not);
  if (expression.alternative_if) {
    return [
      ...expressionRefs(expression.alternative_if.condition),
      ...expressionRefs(expression.alternative_if.alternative),
    ];
  }
  if (expression.veto_if) {
    return [
      ...expressionRefs(expression.veto_if.condition),
      ...expressionRefs(expression.veto_if.blocker),
    ];
  }
  return [];
}

function conditionContractErrors(condition, asOf) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    return [problem(
      "MISSING_CONDITION_ARTIFACT",
      "$.condition",
      "Validation requires the supplied condition artifact.",
    )];
  }

  if (!validateConditionSchema(condition)) {
    return (validateConditionSchema.errors || []).map((error) => problem(
      "CONDITION_SCHEMA_INVALID",
      `$.condition${error.instancePath}`,
      error.message || "The condition does not satisfy condition-contract schema v3.",
    ));
  }

  const errors = [];
  const createdAt = strictUtcInstant(condition.created_at);
  const validFrom = strictUtcInstant(condition.governance.valid_from);
  const expiresAt = strictUtcInstant(condition.governance.expires_at);
  const asOfInstant = strictUtcInstant(asOf);

  for (const [value, code, path] of [
    [createdAt, "INVALID_CONDITION_CREATED_AT", "$.condition.created_at"],
    [validFrom, "INVALID_CONDITION_VALID_FROM", "$.condition.governance.valid_from"],
    [expiresAt, "INVALID_CONDITION_EXPIRY", "$.condition.governance.expires_at"],
  ]) {
    if (value === null) {
      errors.push(problem(code, path, "Condition governance times must be exact UTC instants ending in Z."));
    }
  }

  if (createdAt !== null && validFrom !== null && validFrom < createdAt) {
    errors.push(problem(
      "CONDITION_VALID_BEFORE_CREATION",
      "$.condition.governance.valid_from",
      "Condition validity cannot begin before condition creation.",
    ));
  }
  if (validFrom !== null && expiresAt !== null && expiresAt <= validFrom) {
    errors.push(problem(
      "CONDITION_EXPIRES_BEFORE_VALID",
      "$.condition.governance.expires_at",
      "Condition expiry must be after its validity start.",
    ));
  }
  if (asOfInstant !== null && validFrom !== null && asOfInstant < validFrom) {
    errors.push(problem(
      "CONDITION_NOT_YET_VALID",
      "$.condition.governance.valid_from",
      "The condition is not yet valid at as_of.",
    ));
  }
  if (asOfInstant !== null && expiresAt !== null && asOfInstant >= expiresAt) {
    errors.push(problem(
      "CONDITION_EXPIRED",
      "$.condition.governance.expires_at",
      "The condition has expired at as_of.",
    ));
  }
  if (!CONDITION_LIFECYCLES.has(condition.governance.lifecycle)) {
    errors.push(problem(
      condition.governance.lifecycle === "retired" ? "CONDITION_RETIRED" : "CONDITION_LIFECYCLE_INELIGIBLE",
      "$.condition.governance.lifecycle",
      "Only a current governed condition may support an option proposal.",
    ));
  }

  const requirementIds = condition.evidence_requirements.map(({ id }) => id);
  if (new Set(requirementIds).size !== requirementIds.length) {
    errors.push(problem(
      "DUPLICATE_EVIDENCE_REQUIREMENT",
      "$.condition.evidence_requirements",
      "Condition evidence requirement IDs must be unique.",
    ));
  }
  const requirements = new Set(requirementIds);
  for (const [predicateRef, predicate] of Object.entries(condition.predicates)) {
    const sourceIds = predicate.evidence.source_ids;
    for (const sourceId of sourceIds) {
      if (!requirements.has(sourceId)) {
        errors.push(problem(
          "UNKNOWN_EVIDENCE_REQUIREMENT",
          `$.condition.predicates.${predicateRef}.evidence.source_ids`,
          `Evidence requirement ${sourceId} is not declared by the condition.`,
        ));
      }
    }
    if (predicate.evidence.minimum_sources > new Set(sourceIds).size) {
      errors.push(problem(
        "IMPOSSIBLE_SOURCE_COUNT",
        `$.condition.predicates.${predicateRef}.evidence.minimum_sources`,
        "minimum_sources exceeds the permitted source count.",
      ));
    }
    if (predicate.window.persistence > predicate.window.minimum_observations) {
      errors.push(problem(
        "IMPOSSIBLE_PERSISTENCE",
        `$.condition.predicates.${predicateRef}.window.persistence`,
        "Predicate persistence cannot exceed minimum observations.",
      ));
    }
  }
  for (const [gate, expression] of Object.entries(condition.gates)) {
    for (const predicateRef of expressionRefs(expression)) {
      if (!Object.hasOwn(condition.predicates, predicateRef)) {
        errors.push(problem(
          "UNKNOWN_GATE_PREDICATE",
          `$.condition.gates.${gate}`,
          `Gate ${gate} references undeclared predicate ${predicateRef}.`,
        ));
      }
    }
  }
  return errors;
}

function conditionBindingErrors(option, condition) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return [];
  const errors = [];
  const reference = option?.condition_definition_ref;

  if (reference?.id !== condition.id) {
    errors.push(problem(
      "CONDITION_ID_MISMATCH",
      "$.condition_definition_ref.id",
      "The option does not identify the supplied condition artifact.",
    ));
  }
  if (reference?.version !== condition.definition_version) {
    errors.push(problem(
      "CONDITION_VERSION_MISMATCH",
      "$.condition_definition_ref.version",
      "The option does not pin the supplied condition version.",
    ));
  }
  if (reference?.checksum !== checksumJson(condition)) {
    errors.push(problem(
      "CONDITION_CHECKSUM_MISMATCH",
      "$.condition_definition_ref.checksum",
      "The option checksum does not match the supplied condition canonical bytes.",
    ));
  }

  for (const gate of OPTION_GATES) {
    const requirement = option?.gate_requirements?.[gate];
    if (requirement?.path !== `#/gates/${gate}`) {
      errors.push(problem(
        "GATE_PATH_MISMATCH",
        `$.gate_requirements.${gate}.path`,
        `The ${gate} requirement must address the ${gate} condition gate.`,
      ));
    }
    if (requirement?.relation !== GATE_RELATIONS[gate]) {
      errors.push(problem(
        "GATE_RELATION_MISMATCH",
        `$.gate_requirements.${gate}.relation`,
        `The ${gate} gate must use relation ${GATE_RELATIONS[gate]}.`,
      ));
    }
    if (requirement?.trigger_truth_state !== "true") {
      errors.push(problem(
        "GATE_TRUTH_MISMATCH",
        `$.gate_requirements.${gate}.trigger_truth_state`,
        `The ${gate} relation is defined against the true gate state.`,
      ));
    }
  }

  if (!isDeepStrictEqual(option?.scope, condition.scope)) {
    errors.push(problem(
      "CONDITION_SCOPE_MISMATCH",
      "$.scope",
      "The option scope must exactly match the content-bound condition scope.",
    ));
  }

  const predicateRef = option?.protected_outcome?.condition_predicate_ref;
  const predicate = condition.predicates?.[predicateRef];
  if (!predicate || typeof predicate !== "object") {
    errors.push(problem(
      "OUTCOME_PREDICATE_MISSING",
      "$.protected_outcome.condition_predicate_ref",
      "The protected outcome must reference a predicate in the supplied condition.",
    ));
    return errors;
  }

  const reachable = new Set(expressionRefs(condition.gates?.[option?.bound_gate]));
  if (!reachable.has(predicateRef)) {
    errors.push(problem(
      "OUTCOME_NOT_REACHABLE_FROM_GATE",
      "$.protected_outcome.condition_predicate_ref",
      "The protected outcome predicate is not reachable from the selected gate.",
    ));
  }
  if (predicate.signal_id !== option.protected_outcome.measure_ref) {
    errors.push(problem(
      "OUTCOME_SIGNAL_MISMATCH",
      "$.protected_outcome.measure_ref",
      "The protected outcome measure must match its condition predicate signal.",
    ));
  }
  if (predicate.operator !== option.protected_outcome.operator) {
    errors.push(problem(
      "OUTCOME_OPERATOR_MISMATCH",
      "$.protected_outcome.operator",
      "The protected outcome operator must match its condition predicate.",
    ));
  }
  if (predicate.threshold.value !== option.protected_outcome.threshold.value) {
    errors.push(problem(
      "OUTCOME_THRESHOLD_MISMATCH",
      "$.protected_outcome.threshold.value",
      "The protected outcome threshold must match its condition predicate.",
    ));
  }
  if (predicate.threshold.unit !== option.protected_outcome.threshold.unit) {
    errors.push(problem(
      "OUTCOME_UNIT_MISMATCH",
      "$.protected_outcome.threshold.unit",
      "The protected outcome unit must match its condition predicate.",
    ));
  }
  const expectedDirection = OPERATOR_DIRECTIONS[predicate.operator];
  if (expectedDirection && expectedDirection !== option.protected_outcome.direction) {
    errors.push(problem(
      "OUTCOME_DIRECTION_MISMATCH",
      "$.protected_outcome.direction",
      "The protected outcome direction must preserve the predicate operator semantics.",
    ));
  }

  return errors;
}

function gateEligibilityErrors(option, condition, eligibility, asOf) {
  if (!eligibility || typeof eligibility !== "object" || Array.isArray(eligibility)) {
    return [problem(
      "MISSING_GATE_ELIGIBILITY",
      "$.gate_eligibility",
      "Compilation requires a selected-gate eligibility input.",
    )];
  }

  const errors = [];
  const required = [
    "evaluation_id",
    "condition_definition_ref",
    "gate_ref",
    "truth_state",
    "eligibility_state",
    "eligibility_basis",
    "authorisation_effect",
    "evaluated_at",
  ];
  const extras = Object.keys(eligibility).filter((key) => !required.includes(key));
  if (required.some((key) => !Object.hasOwn(eligibility, key)) || extras.length) {
    errors.push(problem(
      "GATE_ELIGIBILITY_SHAPE_INVALID",
      "$.gate_eligibility",
      "Gate eligibility must contain only its closed non-authorising contract fields.",
    ));
  }
  if (!ID.test(eligibility.evaluation_id || "")) {
    errors.push(problem(
      "GATE_EVALUATION_ID_INVALID",
      "$.gate_eligibility.evaluation_id",
      "Gate eligibility requires a stable evaluation ID.",
    ));
  }
  if (!isDeepStrictEqual(eligibility.condition_definition_ref, option?.condition_definition_ref)) {
    errors.push(problem(
      "GATE_CONDITION_MISMATCH",
      "$.gate_eligibility.condition_definition_ref",
      "Gate eligibility must pin the same condition as the option.",
    ));
  }
  if (eligibility.gate_ref !== `#/gates/${option?.bound_gate}`) {
    errors.push(problem(
      "GATE_ELIGIBILITY_MISMATCH",
      "$.gate_eligibility.gate_ref",
      "Gate eligibility must address the option's selected bound gate.",
    ));
  }
  if (eligibility.truth_state !== "true" || eligibility.eligibility_state !== "eligible") {
    errors.push(problem(
      "GATE_NOT_ELIGIBLE",
      "$.gate_eligibility.eligibility_state",
      "The selected gate must have an eligible true-state evaluation.",
    ));
  }
  if (eligibility.eligibility_basis !== GATE_ELIGIBILITY_BASES[option?.bound_gate]) {
    errors.push(problem(
      "GATE_ELIGIBILITY_BASIS_MISMATCH",
      "$.gate_eligibility.eligibility_basis",
      "Gate eligibility must use the selected gate's lifecycle semantics.",
    ));
  }
  if (eligibility.authorisation_effect !== "none") {
    errors.push(problem(
      "GATE_ELIGIBILITY_AUTHORISING",
      "$.gate_eligibility.authorisation_effect",
      "Gate eligibility is input to a proposal and cannot authorise action.",
    ));
  }

  const evaluatedAt = strictUtcInstant(eligibility.evaluated_at);
  const asOfInstant = strictUtcInstant(asOf);
  if (evaluatedAt === null) {
    errors.push(problem(
      "INVALID_GATE_EVALUATED_AT",
      "$.gate_eligibility.evaluated_at",
      "Gate evaluation time must be an exact UTC instant ending in Z.",
    ));
  } else if (asOfInstant !== null && evaluatedAt > asOfInstant) {
    errors.push(problem(
      "FUTURE_GATE_EVALUATION",
      "$.gate_eligibility.evaluated_at",
      "A gate evaluation cannot occur after as_of.",
    ));
  } else if (asOfInstant !== null && evaluatedAt !== asOfInstant) {
    errors.push(problem(
      "GATE_EVALUATION_NOT_CURRENT",
      "$.gate_eligibility.evaluated_at",
      "The selected-gate evaluation must be current at as_of.",
    ));
  }

  if (condition && eligibility.condition_definition_ref?.checksum !== checksumJson(condition)) {
    errors.push(problem(
      "GATE_CONDITION_CHECKSUM_MISMATCH",
      "$.gate_eligibility.condition_definition_ref.checksum",
      "Gate eligibility does not content-bind the supplied condition.",
    ));
  }
  return errors;
}

function timeErrors(option, condition, asOf) {
  const errors = [];
  const asOfInstant = strictUtcInstant(asOf);
  if (asOf === undefined) {
    errors.push(problem(
      "MISSING_AS_OF",
      "$.as_of",
      "Validation and rendering require an explicit UTC as_of instant.",
    ));
  } else if (asOfInstant === null) {
    errors.push(problem(
      "INVALID_AS_OF",
      "$.as_of",
      "as_of must be an exact, calendar-valid UTC instant ending in Z.",
    ));
  }

  const generatedAt = strictUtcInstant(option?.provenance?.generated_at);
  const reviewAt = strictUtcInstant(option?.review?.review_due_at);
  const expiresAt = strictUtcInstant(option?.expires_at);

  for (const [value, code, path, message] of [
    [generatedAt, "INVALID_GENERATED_AT", "$.provenance.generated_at", "generated_at"],
    [reviewAt, "INVALID_REVIEW_AT", "$.review.review_due_at", "review_due_at"],
    [expiresAt, "INVALID_EXPIRES_AT", "$.expires_at", "expires_at"],
  ]) {
    if (value === null) {
      errors.push(problem(code, path, `${message} must be an exact, calendar-valid UTC instant ending in Z.`));
    }
  }

  if (generatedAt !== null && reviewAt !== null && reviewAt <= generatedAt) {
    errors.push(problem(
      "REVIEW_BEFORE_GENERATION",
      "$.review.review_due_at",
      "The review must occur after proposal generation.",
    ));
  }
  if (generatedAt !== null && expiresAt !== null && expiresAt <= generatedAt) {
    errors.push(problem(
      "EXPIRY_BEFORE_GENERATION",
      "$.expires_at",
      "The proposal must expire after it is generated.",
    ));
  }
  if (reviewAt !== null && expiresAt !== null && reviewAt >= expiresAt) {
    errors.push(problem(
      "REVIEW_AFTER_EXPIRY",
      "$.review.review_due_at",
      "The proposal review must occur before proposal expiry.",
    ));
  }
  if (generatedAt !== null && expiresAt !== null && expiresAt - generatedAt > MAX_OPTION_TTL_MS) {
    errors.push(problem(
      "OPTION_TTL_EXCEEDED",
      "$.expires_at",
      "The proposal expiry exceeds the maximum 180-day TTL.",
    ));
  }

  const conditionExpiry = strictUtcInstant(condition?.governance?.expires_at);
  if (expiresAt !== null && conditionExpiry !== null && expiresAt > conditionExpiry) {
    errors.push(problem(
      "OPTION_EXCEEDS_CONDITION_EXPIRY",
      "$.expires_at",
      "The proposal cannot outlive its bound condition.",
    ));
  }
  if (asOfInstant !== null && generatedAt !== null && generatedAt > asOfInstant) {
    errors.push(problem(
      "FUTURE_GENERATION",
      "$.provenance.generated_at",
      "The proposal cannot claim generation after as_of.",
    ));
  }
  if (asOfInstant !== null && reviewAt !== null && asOfInstant >= reviewAt) {
    errors.push(problem(
      "REVIEW_OVERDUE",
      "$.review.review_due_at",
      "The proposal is withheld because its review is due or overdue.",
    ));
  }
  if (asOfInstant !== null && expiresAt !== null && asOfInstant >= expiresAt) {
    errors.push(problem(
      "OPTION_EXPIRED",
      "$.expires_at",
      "The proposal has expired and must be withdrawn.",
    ));
  }
  return errors;
}

function gateActionErrors(option) {
  const errors = [];
  const actionKey = `${option?.verb}:${option?.object?.class}`;
  if (!GATE_ACTION_POLICY[option?.bound_gate]?.has(actionKey)) {
    errors.push(problem(
      "GATE_ACTION_NOT_ALLOWED",
      "$.verb",
      "The verb and object class are not permitted for the selected gate.",
    ));
  }
  if (!option?.scope?.services?.includes(option?.object?.service_ref)) {
    errors.push(problem(
      "OBJECT_SERVICE_OUT_OF_SCOPE",
      "$.object.service_ref",
      "The controlled object must target a service in the bound condition scope.",
    ));
  }
  return errors;
}

function dissentErrors(option) {
  const errors = [];
  const records = option?.dissent?.records || [];
  if (duplicateIds(records).length) {
    errors.push(problem(
      "DUPLICATE_DISSENT_ID",
      "$.dissent.records",
      "Dissent record IDs must be unique.",
    ));
  }
  const fingerprints = records.map((record) => checksumJson({
    actor_ref: record.actor_ref,
    concern: record.concern,
    source_claim: record.source_claim,
  }));
  if (new Set(fingerprints).size !== fingerprints.length) {
    errors.push(problem(
      "DUPLICATE_DISSENT",
      "$.dissent.records",
      "Equivalent dissent cannot be repeated under different record IDs.",
    ));
  }
  return errors;
}

export function hasBlockingDissent(option) {
  return (option?.dissent?.records || []).some(({ concern }) => BLOCKING_DISSENT.has(concern));
}

export function validateOptionSemantics(option, {
  condition,
  gate_eligibility: gateEligibility,
  as_of: asOf,
} = {}) {
  const errors = [
    ...conditionContractErrors(condition, asOf),
    ...conditionBindingErrors(option, condition),
    ...gateEligibilityErrors(option, condition, gateEligibility, asOf),
    ...timeErrors(option, condition, asOf),
    ...gateActionErrors(option),
    ...dissentErrors(option),
  ];

  for (const key of READINESS_DEPENDENCIES) {
    const dependency = option?.readiness_dependencies?.[key];
    if (dependency && dependency.kind !== key) {
      errors.push(problem(
        "READINESS_KIND_MISMATCH",
        `$.readiness_dependencies.${key}.kind`,
        `The ${key} dependency must identify itself as ${key}.`,
      ));
    }
  }

  const crossActorDependencies = option?.cross_actor_dependencies || [];
  for (const [index, dependency] of crossActorDependencies.entries()) {
    if (dependency.actor_ref === option?.actor_ref) {
      errors.push(problem(
        "NOT_CROSS_ACTOR",
        `$.cross_actor_dependencies[${index}].actor_ref`,
        "A cross-actor dependency must refer to a different candidate actor.",
      ));
    }
    if (dependency.gate_ref !== option?.bound_gate) {
      errors.push(problem(
        "CROSS_ACTOR_GATE_MISMATCH",
        `$.cross_actor_dependencies[${index}].gate_ref`,
        "Every declared dependency must apply to the selected bound gate.",
      ));
    }
  }
  for (const id of duplicateIds(crossActorDependencies)) {
    errors.push(problem(
      "DUPLICATE_CROSS_ACTOR_DEPENDENCY",
      "$.cross_actor_dependencies",
      `Cross-actor dependency ID ${id} is duplicated.`,
    ));
  }

  const sourceClaims = option?.provenance?.source_claims || [];
  for (const id of duplicateIds(sourceClaims)) {
    errors.push(problem(
      "DUPLICATE_PROVENANCE_SOURCE",
      "$.provenance.source_claims",
      `Provenance source claim ID ${id} is duplicated.`,
    ));
  }

  return { valid: errors.length === 0, errors };
}

export function validateConditionalOption(option, settings = {}) {
  if (!validateOptionSchema(option)) {
    return {
      valid: false,
      errors: (validateOptionSchema.errors || []).map((error) => problem(
        "SCHEMA_INVALID",
        error.instancePath || "$",
        error.message || "The option does not satisfy the closed schema.",
      )),
    };
  }
  return validateOptionSemantics(option, settings);
}

export function assertConditionalOption(option, settings = {}) {
  const result = validateConditionalOption(option, settings);
  if (result.valid) return option;

  const layer = result.errors.some((error) => error.code === "SCHEMA_INVALID")
    ? "schema validation"
    : "semantic validation";
  const error = new Error(
    `Conditional option failed ${layer}: ${result.errors.map((item) => item.code).join(", ")}`,
  );
  error.problems = result.errors;
  throw error;
}
