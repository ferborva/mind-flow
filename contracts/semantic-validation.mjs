import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { GATES, evaluateGates } from "./evaluator.mjs";

const QUALITY = Object.freeze({ exploratory: 0, provisional: 1, validated: 2 });

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function checksumJson(value) {
  return `sha256:${createHash("sha256").update(canonicalise(value)).digest("hex")}`;
}

function problem(code, path, message) {
  return { code, path, message };
}

function instant(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateOrder(errors, earlier, later, code, earlierPath, laterPath) {
  const start = instant(earlier);
  const end = instant(later);
  if (start !== null && end !== null && start > end) {
    errors.push(problem(code, laterPath, `${laterPath} must not precede ${earlierPath}.`));
  }
}

function definitionReferenceErrors(definition, reference, path) {
  const errors = [];
  if (!reference || reference.id !== definition.id) {
    errors.push(problem(
      "DEFINITION_ID_MISMATCH",
      `${path}.id`,
      "The reference does not identify this condition definition.",
    ));
  }
  if (!reference || reference.version !== definition.definition_version) {
    errors.push(problem(
      "DEFINITION_VERSION_MISMATCH",
      `${path}.version`,
      "The reference does not pin this definition version.",
    ));
  }
  if (!reference || reference.checksum !== checksumJson(definition)) {
    errors.push(problem(
      "DEFINITION_CHECKSUM_MISMATCH",
      `${path}.checksum`,
      "The reference checksum does not match the canonical definition content.",
    ));
  }
  return errors;
}

function expressionRefs(expression) {
  if (!expression || typeof expression !== "object") return [];
  if (typeof expression.predicate_ref === "string") return [expression.predicate_ref];
  if (Array.isArray(expression.all)) return expression.all.flatMap(expressionRefs);
  if (Array.isArray(expression.any)) return expression.any.flatMap(expressionRefs);
  if (expression.not) return expressionRefs(expression.not);
  if (expression.unless) {
    return [
      ...expressionRefs(expression.unless.condition),
      ...expressionRefs(expression.unless.exception),
    ];
  }
  return [];
}

function validateDefinitionSemantics(definition) {
  const errors = [];
  validateOrder(
    errors,
    definition.created_at,
    definition.governance?.valid_from,
    "DEFINITION_VALID_BEFORE_CREATION",
    "$.created_at",
    "$.governance.valid_from",
  );
  validateOrder(
    errors,
    definition.governance?.valid_from,
    definition.governance?.expires_at,
    "DEFINITION_EXPIRES_BEFORE_VALID",
    "$.governance.valid_from",
    "$.governance.expires_at",
  );

  const requirementIds = (definition.evidence_requirements || []).map((item) => item.id);
  if (new Set(requirementIds).size !== requirementIds.length) {
    errors.push(problem(
      "DUPLICATE_EVIDENCE_REQUIREMENT",
      "$.evidence_requirements",
      "Evidence requirement IDs must be unique.",
    ));
  }
  const requirements = new Set(requirementIds);
  for (const [predicateRef, predicate] of Object.entries(definition.predicates || {})) {
    const sourceIds = predicate.evidence?.source_ids || [];
    for (const sourceId of sourceIds) {
      if (!requirements.has(sourceId)) {
        errors.push(problem(
          "UNKNOWN_EVIDENCE_REQUIREMENT",
          `$.predicates.${predicateRef}.evidence.source_ids`,
          `Evidence requirement ${sourceId} is not declared.`,
        ));
      }
    }
    if ((predicate.evidence?.minimum_sources || 0) > new Set(sourceIds).size) {
      errors.push(problem(
        "IMPOSSIBLE_SOURCE_COUNT",
        `$.predicates.${predicateRef}.evidence.minimum_sources`,
        "minimum_sources exceeds the number of permitted source IDs.",
      ));
    }
    if ((predicate.window?.persistence || 0) > (predicate.window?.minimum_observations || 0)) {
      errors.push(problem(
        "IMPOSSIBLE_PERSISTENCE",
        `$.predicates.${predicateRef}.window.persistence`,
        "Persistence cannot exceed minimum observations.",
      ));
    }
  }
  for (const [gate, expression] of Object.entries(definition.gates || {})) {
    for (const predicateRef of expressionRefs(expression)) {
      if (!Object.hasOwn(definition.predicates || {}, predicateRef)) {
        errors.push(problem(
          "UNKNOWN_GATE_PREDICATE",
          `$.gates.${gate}`,
          `Gate ${gate} references undeclared predicate ${predicateRef}.`,
        ));
      }
    }
  }
  return errors;
}

function validateObservationSemantics(definition, observation, index) {
  const root = `$.observations[${index}]`;
  const errors = definitionReferenceErrors(
    definition,
    observation.condition_definition,
    `${root}.condition_definition`,
  );
  const predicate = definition.predicates?.[observation.predicate_ref];
  if (!predicate) {
    errors.push(problem(
      "UNKNOWN_OBSERVATION_PREDICATE",
      `${root}.predicate_ref`,
      `Predicate ${String(observation.predicate_ref)} is not declared.`,
    ));
    return errors;
  }

  validateOrder(
    errors,
    observation.period?.start,
    observation.period?.end,
    "OBSERVATION_PERIOD_REVERSED",
    `${root}.period.start`,
    `${root}.period.end`,
  );
  validateOrder(
    errors,
    observation.period?.end,
    observation.recorded_at,
    "OBSERVATION_RECORDED_BEFORE_PERIOD_END",
    `${root}.period.end`,
    `${root}.recorded_at`,
  );
  if ((observation.coverage?.observed || 0) > (observation.coverage?.expected || 0)) {
    errors.push(problem(
      "OBSERVATION_COVERAGE_EXCEEDS_EXPECTED",
      `${root}.coverage.observed`,
      "Observed coverage cannot exceed expected coverage.",
    ));
  }
  if (
    observation.state !== "unknown" &&
    (observation.coverage?.observed || 0) < (predicate.window?.minimum_observations || 0)
  ) {
    errors.push(problem(
      "OBSERVATION_COVERAGE_BELOW_POLICY",
      `${root}.coverage.observed`,
      "A reasoned state must cover at least the predicate's minimum observations.",
    ));
  }

  if (
    observation.uncertainty?.status === "quantified" &&
    observation.uncertainty.lower > observation.uncertainty.upper
  ) {
    errors.push(problem(
      "UNCERTAINTY_BOUNDS_REVERSED",
      `${root}.uncertainty`,
      "A quantified uncertainty lower bound cannot exceed its upper bound.",
    ));
  }

  const evidence = observation.evidence || [];
  for (const [evidenceIndex, record] of evidence.entries()) {
    validateOrder(
      errors,
      observation.period?.end,
      record.retrieved_at,
      "EVIDENCE_RETRIEVED_BEFORE_PERIOD_END",
      `${root}.period.end`,
      `${root}.evidence[${evidenceIndex}].retrieved_at`,
    );
    validateOrder(
      errors,
      record.retrieved_at,
      observation.recorded_at,
      "EVIDENCE_RETRIEVED_AFTER_OBSERVATION",
      `${root}.evidence[${evidenceIndex}].retrieved_at`,
      `${root}.recorded_at`,
    );
  }

  if (observation.state === "stale") {
    validateOrder(
      errors,
      observation.period?.end,
      observation.stale_since,
      "STALE_BEFORE_PERIOD_END",
      `${root}.period.end`,
      `${root}.stale_since`,
    );
    validateOrder(
      errors,
      observation.stale_since,
      observation.recorded_at,
      "STALE_AFTER_OBSERVATION",
      `${root}.stale_since`,
      `${root}.recorded_at`,
    );
  }

  if (observation.state !== "unknown") {
    const policy = predicate.evidence;
    const permittedSources = new Set(policy.source_ids);
    const actualSources = new Set(evidence.map((record) => record.source_id));
    if (actualSources.size < policy.minimum_sources) {
      errors.push(problem(
        "INSUFFICIENT_EVIDENCE_SOURCES",
        `${root}.evidence`,
        "The reasoned state does not meet its minimum source count.",
      ));
    }
    for (const sourceId of actualSources) {
      if (!permittedSources.has(sourceId)) {
        errors.push(problem(
          "UNEXPECTED_EVIDENCE_SOURCE",
          `${root}.evidence`,
          `Evidence source ${sourceId} is not permitted by the predicate definition.`,
        ));
      }
    }
    if (evidence.some((record) => QUALITY[record.quality] < QUALITY[policy.minimum_quality])) {
      errors.push(problem(
        "INSUFFICIENT_EVIDENCE_QUALITY",
        `${root}.evidence`,
        "At least one evidence record is below the predicate's minimum quality.",
      ));
    }
    if (policy.require_uncertainty && observation.uncertainty?.status !== "quantified") {
      errors.push(problem(
        "UNCERTAINTY_REQUIRED",
        `${root}.uncertainty.status`,
        "This predicate requires quantified uncertainty for a reasoned state.",
      ));
    }
    if (
      (observation.state === "true" || observation.state === "false") &&
      policy.minimum_probability !== undefined &&
      (observation.state_probability === undefined ||
        observation.state_probability < policy.minimum_probability)
    ) {
      errors.push(problem(
        "STATE_PROBABILITY_BELOW_POLICY",
        `${root}.state_probability`,
        "The observation does not meet the predicate's probability policy.",
      ));
    }
  }
  return errors;
}

export function validateEvaluationBundle(definition, observations, run) {
  const errors = validateDefinitionSemantics(definition);
  const definitionChecksum = checksumJson(definition);
  errors.push(...definitionReferenceErrors(
    definition,
    run.condition_definition,
    "$.run.condition_definition",
  ));

  const observationsById = new Map();
  for (const [index, observation] of observations.entries()) {
    if (observationsById.has(observation.id)) {
      errors.push(problem(
        "DUPLICATE_OBSERVATION_ID",
        `$.observations[${index}].id`,
        `Observation ID ${observation.id} is duplicated.`,
      ));
    }
    observationsById.set(observation.id, observation);
    errors.push(...validateObservationSemantics(definition, observation, index));
  }

  const referenced = new Set(
    Object.values(definition.gates || {}).flatMap(expressionRefs),
  );
  const results = run.predicate_results || {};
  for (const predicateRef of referenced) {
    if (!Object.hasOwn(results, predicateRef)) {
      errors.push(problem(
        "MISSING_PREDICATE_RESULT",
        `$.run.predicate_results.${predicateRef}`,
        `No predicate result was recorded for ${predicateRef}.`,
      ));
    }
  }
  for (const [predicateRef, result] of Object.entries(results)) {
    if (!referenced.has(predicateRef)) {
      errors.push(problem(
        "UNREFERENCED_PREDICATE_RESULT",
        `$.run.predicate_results.${predicateRef}`,
        `Predicate result ${predicateRef} is not used by any gate.`,
      ));
    }
    const observation = observationsById.get(result.observation_id);
    if (
      !observation ||
      observation.predicate_ref !== predicateRef ||
      observation.state !== result.state ||
      observation.reason !== result.reason
    ) {
      errors.push(problem(
        "OBSERVATION_REFERENCE_MISMATCH",
        `$.run.predicate_results.${predicateRef}`,
        "The predicate result does not reproduce its referenced observation.",
      ));
      continue;
    }
    validateOrder(
      errors,
      observation.recorded_at,
      run.evaluated_at,
      "RUN_EVALUATED_BEFORE_OBSERVATION",
      `$.observations.${result.observation_id}.recorded_at`,
      "$.run.evaluated_at",
    );
  }

  validateOrder(
    errors,
    definition.governance?.valid_from,
    run.evaluated_at,
    "RUN_BEFORE_DEFINITION_VALID",
    "$.definition.governance.valid_from",
    "$.run.evaluated_at",
  );
  validateOrder(
    errors,
    run.evaluated_at,
    definition.governance?.expires_at,
    "RUN_AFTER_DEFINITION_EXPIRY",
    "$.run.evaluated_at",
    "$.definition.governance.expires_at",
  );

  if (run.condition_definition?.checksum === definitionChecksum) {
    const stateMap = Object.fromEntries(
      Object.entries(results).map(([predicateRef, result]) => [predicateRef, result.state]),
    );
    const evaluated = evaluateGates(definition, stateMap);
    for (const gate of GATES) {
      if (!isDeepStrictEqual(evaluated.gates[gate], run.gate_results?.[gate])) {
        errors.push(problem(
          "GATE_RESULT_MISMATCH",
          `$.run.gate_results.${gate}`,
          `Recorded ${gate} output does not match deterministic evaluation.`,
        ));
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateActionBinding(definition, action) {
  const errors = [
    ...validateDefinitionSemantics(definition),
    ...definitionReferenceErrors(
      definition,
      action.condition_definition,
      "$.action.condition_definition",
    ),
  ];
  if (!Object.hasOwn(definition.gates || {}, action.gate)) {
    errors.push(problem(
      "ACTION_GATE_MISSING",
      "$.action.gate",
      `Action gate ${String(action.gate)} is not defined by the condition.`,
    ));
  }
  for (const [transition, gate] of Object.entries(action.reversibility || {})) {
    if (!Object.hasOwn(definition.gates || {}, gate)) {
      errors.push(problem(
        "ACTION_REVERSIBILITY_GATE_MISSING",
        `$.action.reversibility.${transition}`,
        `Reversibility transition ${transition} references undefined gate ${String(gate)}.`,
      ));
    }
  }
  validateOrder(
    errors,
    definition.governance?.valid_from,
    action.valid_from,
    "ACTION_BEFORE_DEFINITION_VALID",
    "$.definition.governance.valid_from",
    "$.action.valid_from",
  );
  validateOrder(
    errors,
    action.valid_from,
    action.expires_at,
    "ACTION_EXPIRES_BEFORE_VALID",
    "$.action.valid_from",
    "$.action.expires_at",
  );
  validateOrder(
    errors,
    action.expires_at,
    definition.governance?.expires_at,
    "ACTION_OUTLIVES_DEFINITION",
    "$.action.expires_at",
    "$.definition.governance.expires_at",
  );
  if (action.funding?.valid_through) {
    validateOrder(
      errors,
      action.expires_at,
      action.funding.valid_through,
      "FUNDING_EXPIRES_BEFORE_ACTION",
      "$.action.expires_at",
      "$.action.funding.valid_through",
    );
  }
  return { valid: errors.length === 0, errors };
}
