import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  GATES,
  GATE_TRUTH_STATES,
  evaluateGates,
  resolveAction,
} from "./evaluator.mjs";

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
  if (expression.unless) {
    return [
      ...expressionRefs(expression.unless.condition),
      ...expressionRefs(expression.unless.exception),
    ];
  }
  return [];
}

function expressionSemanticErrors(expression, path) {
  if (!expression || typeof expression !== "object") return [];
  if (expression.unless) {
    return [problem(
      "DEPRECATED_UNLESS_OPERATOR",
      path,
      "unless is ambiguous. Use alternative_if for an equivalent route or veto_if for a blocker.",
    )];
  }
  if (Array.isArray(expression.all)) {
    return expression.all.flatMap((child, index) =>
      expressionSemanticErrors(child, `${path}.all[${index}]`));
  }
  if (Array.isArray(expression.any)) {
    return expression.any.flatMap((child, index) =>
      expressionSemanticErrors(child, `${path}.any[${index}]`));
  }
  if (expression.not) return expressionSemanticErrors(expression.not, `${path}.not`);
  if (expression.alternative_if) {
    return [
      ...expressionSemanticErrors(
        expression.alternative_if.condition,
        `${path}.alternative_if.condition`,
      ),
      ...expressionSemanticErrors(
        expression.alternative_if.alternative,
        `${path}.alternative_if.alternative`,
      ),
    ];
  }
  if (expression.veto_if) {
    return [
      ...expressionSemanticErrors(
        expression.veto_if.condition,
        `${path}.veto_if.condition`,
      ),
      ...expressionSemanticErrors(
        expression.veto_if.blocker,
        `${path}.veto_if.blocker`,
      ),
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
    errors.push(...expressionSemanticErrors(expression, `$.gates.${gate}`));
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
    if (!isDeepStrictEqual(evaluated.action_resolution, run.action_resolution)) {
      errors.push(problem(
        "ACTION_RESOLUTION_MISMATCH",
        "$.run.action_resolution",
        "Recorded action resolution does not match deterministic safety precedence.",
      ));
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateActionBinding(definition, action, evaluation) {
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
  if (action.lifecycle === "active") {
    if (!evaluation) {
      errors.push(problem(
        "ACTION_ACTIVATION_EVALUATION_REQUIRED",
        "$.action.lifecycle",
        "An active action requires a complete deterministic gate evaluation.",
      ));
    } else {
      const evaluationComplete =
        Array.isArray(evaluation.errors) &&
        evaluation.errors.length === 0 &&
        GATES.every((gate) =>
          GATE_TRUTH_STATES.includes(evaluation.gates?.[gate]?.state));
      if (!evaluationComplete) {
        errors.push(problem(
          "ACTION_ACTIVATION_EVALUATION_INVALID",
          "$.evaluation",
          "An active action requires successful outputs for every gate.",
        ));
      }
      const gateState = evaluation.gates?.[action.gate]?.state ?? null;
      if (gateState !== "true") {
        errors.push(problem(
          "ACTION_GATE_NOT_TRUE",
          `$.evaluation.gates.${action.gate}`,
          `Action gate ${String(action.gate)} must have gate-truth state true before activation.`,
        ));
      }
      const resolution = resolveAction(evaluation);
      if (action.gate === "act" && !resolution.activation_allowed) {
        errors.push(problem(
          "ACTION_ACTIVATION_BLOCKED",
          "$.evaluation.action_resolution",
          `Action activation is blocked by ${resolution.blocking_gates.join(", ") || "gate precedence"}.`,
        ));
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateEvaluationAttempt(definition, observations, attempt) {
  const errors = [
    ...validateDefinitionSemantics(definition),
    ...definitionReferenceErrors(
      definition,
      attempt.condition_definition,
      "$.attempt.condition_definition",
    ),
  ];
  validateOrder(
    errors,
    definition.governance?.valid_from,
    attempt.started_at,
    "ATTEMPT_BEFORE_DEFINITION_VALID",
    "$.definition.governance.valid_from",
    "$.attempt.started_at",
  );
  validateOrder(
    errors,
    attempt.started_at,
    attempt.recorded_at,
    "ATTEMPT_RECORDED_BEFORE_START",
    "$.attempt.started_at",
    "$.attempt.recorded_at",
  );
  validateOrder(
    errors,
    attempt.recorded_at,
    definition.governance?.expires_at,
    "ATTEMPT_AFTER_DEFINITION_EXPIRY",
    "$.attempt.recorded_at",
    "$.definition.governance.expires_at",
  );

  const observationsById = new Map(
    (observations || []).map((observation) => [observation.id, observation]),
  );
  const stateMap = {};
  for (const [predicateRef, result] of Object.entries(attempt.predicate_results || {})) {
    const observation = observationsById.get(result.observation_id);
    if (
      !observation ||
      observation.predicate_ref !== predicateRef ||
      observation.state !== result.state ||
      observation.reason !== result.reason
    ) {
      errors.push(problem(
        "ATTEMPT_OBSERVATION_REFERENCE_MISMATCH",
        `$.attempt.predicate_results.${predicateRef}`,
        "The attempt input does not reproduce its referenced observation.",
      ));
      continue;
    }
    errors.push(...validateObservationSemantics(
      definition,
      observation,
      (observations || []).indexOf(observation),
    ));
    validateOrder(
      errors,
      observation.recorded_at,
      attempt.started_at,
      "ATTEMPT_STARTED_BEFORE_OBSERVATION",
      `$.observations.${observation.id}.recorded_at`,
      "$.attempt.started_at",
    );
    stateMap[predicateRef] = result.state;
  }

  const gateResults = attempt.gate_results || {};
  const gateCount = Object.keys(gateResults).length;
  if (attempt.attempt_status === "partial" && (gateCount === 0 || gateCount >= GATES.length)) {
    errors.push(problem(
      "PARTIAL_ATTEMPT_GATE_COUNT_INVALID",
      "$.attempt.gate_results",
      "A partial attempt must contain at least one but fewer than all gate outputs.",
    ));
  }
  if (attempt.attempt_status === "failed" && gateCount !== 0) {
    errors.push(problem(
      "FAILED_ATTEMPT_HAS_GATE_OUTPUT",
      "$.attempt.gate_results",
      "A failed attempt cannot publish a successful gate output.",
    ));
  }

  const evaluated = evaluateGates(definition, stateMap);
  for (const [gate, recorded] of Object.entries(gateResults)) {
    if (!GATES.includes(gate) || !isDeepStrictEqual(evaluated.gates?.[gate], recorded)) {
      errors.push(problem(
        "ATTEMPT_GATE_RESULT_MISMATCH",
        `$.attempt.gate_results.${gate}`,
        `Recorded ${gate} output does not match deterministic evaluation of available inputs.`,
      ));
    }
  }
  return { valid: errors.length === 0, errors };
}

function artifactKey(kind, id) {
  return `${kind}:${id}`;
}

function artifactTime(artifact) {
  if (artifact.kind === "predicate-observation") return artifact.value.recorded_at;
  if (artifact.kind === "evaluation-run") return artifact.value.evaluated_at;
  if (artifact.kind === "evaluation-attempt") return artifact.value.recorded_at;
  return undefined;
}

function artifactConditionReference(artifact) {
  return artifact.value.condition_definition;
}

function correctionScopeMatches(source, replacement) {
  if (!isDeepStrictEqual(
    artifactConditionReference(source),
    artifactConditionReference(replacement),
  )) return false;
  if (source.kind === "predicate-observation") {
    return source.value.predicate_ref === replacement.value.predicate_ref;
  }
  return true;
}

function directlyDependsOn(artifact, source) {
  if (source.kind !== "predicate-observation") return false;
  if (artifact.kind !== "evaluation-run" && artifact.kind !== "evaluation-attempt") return false;
  return Object.values(artifact.value.predicate_results || {}).some(
    (result) => result.observation_id === source.value.id,
  );
}

export function validateCorrectionChain(artifacts, corrections) {
  const errors = [];
  const artifactIndex = new Map();
  for (const [index, artifact] of (artifacts || []).entries()) {
    const key = artifactKey(artifact.kind, artifact.value?.id);
    if (artifactIndex.has(key)) {
      errors.push(problem(
        "DUPLICATE_CORRECTION_ARTIFACT",
        `$.artifacts[${index}]`,
        `Artifact ${key} is duplicated in the validation bundle.`,
      ));
    }
    artifactIndex.set(key, artifact);
  }

  function resolveReference(reference, path) {
    const key = artifactKey(reference?.kind, reference?.id);
    const artifact = artifactIndex.get(key);
    if (!artifact) {
      errors.push(problem(
        "CORRECTION_ARTIFACT_MISSING",
        path,
        `Referenced artifact ${key} is not present in the validation bundle.`,
      ));
      return null;
    }
    if (reference.checksum !== checksumJson(artifact.value)) {
      errors.push(problem(
        "CORRECTION_ARTIFACT_CHECKSUM_MISMATCH",
        `${path}.checksum`,
        `Referenced checksum does not match artifact ${key}.`,
      ));
    }
    return artifact;
  }

  const correctionIds = new Set();
  const outgoing = new Set();
  const incoming = new Set();
  const edges = new Map();
  for (const [index, correction] of (corrections || []).entries()) {
    const root = `$.corrections[${index}]`;
    if (correctionIds.has(correction.id)) {
      errors.push(problem(
        "DUPLICATE_CORRECTION_ID",
        `${root}.id`,
        `Correction ID ${correction.id} is duplicated.`,
      ));
    }
    correctionIds.add(correction.id);

    const sourceKey = artifactKey(correction.corrects?.kind, correction.corrects?.id);
    const replacementKey = artifactKey(
      correction.replacement?.kind,
      correction.replacement?.id,
    );
    if (outgoing.has(sourceKey)) {
      errors.push(problem(
        "CORRECTION_BRANCH",
        `${root}.corrects`,
        `Artifact ${sourceKey} already has a replacement in this chain.`,
      ));
    }
    if (incoming.has(replacementKey)) {
      errors.push(problem(
        "CORRECTION_MERGE",
        `${root}.replacement`,
        `Artifact ${replacementKey} already replaces another artifact.`,
      ));
    }
    outgoing.add(sourceKey);
    incoming.add(replacementKey);
    edges.set(sourceKey, replacementKey);

    if (correction.corrects?.kind !== correction.replacement?.kind) {
      errors.push(problem(
        "CORRECTION_KIND_MISMATCH",
        `${root}.replacement.kind`,
        "A replacement must have the same artifact kind as its predecessor.",
      ));
    }
    if (sourceKey === replacementKey) {
      errors.push(problem(
        "CORRECTION_SELF_REFERENCE",
        `${root}.replacement`,
        "A correction cannot replace an artifact with itself.",
      ));
    }

    const source = resolveReference(correction.corrects, `${root}.corrects`);
    const replacement = resolveReference(correction.replacement, `${root}.replacement`);
    const invalidatedKeys = new Set();
    const invalidatedArtifacts = [];
    for (const [impactIndex, reference] of (correction.invalidates || []).entries()) {
      const invalidated = resolveReference(reference, `${root}.invalidates[${impactIndex}]`);
      if (invalidated) invalidatedArtifacts.push({ artifact: invalidated, impactIndex });
      invalidatedKeys.add(artifactKey(reference.kind, reference.id));
    }

    if (source && replacement) {
      if (!correctionScopeMatches(source, replacement)) {
        errors.push(problem(
          "CORRECTION_SCOPE_MISMATCH",
          `${root}.replacement`,
          "A correction must preserve the condition and predicate scope of its predecessor.",
        ));
      }
      for (const { artifact: invalidated, impactIndex } of invalidatedArtifacts) {
        if (!directlyDependsOn(invalidated, source)) {
          errors.push(problem(
            "CORRECTION_DOWNSTREAM_INVALIDATION_UNRELATED",
            `${root}.invalidates[${impactIndex}]`,
            "An invalidated artifact must directly consume the corrected artifact.",
          ));
        }
      }
      validateOrder(
        errors,
        artifactTime(source),
        artifactTime(replacement),
        "CORRECTION_REPLACEMENT_PREDATES_SOURCE",
        `${root}.corrects`,
        `${root}.replacement`,
      );
      validateOrder(
        errors,
        artifactTime(replacement),
        correction.recorded_at,
        "CORRECTION_RECORDED_BEFORE_REPLACEMENT",
        `${root}.replacement`,
        `${root}.recorded_at`,
      );

      for (const dependent of artifactIndex.values()) {
        if (!directlyDependsOn(dependent, source)) continue;
        const dependentKey = artifactKey(dependent.kind, dependent.value.id);
        if (!invalidatedKeys.has(dependentKey)) {
          errors.push(problem(
            "CORRECTION_DOWNSTREAM_INVALIDATION_MISSING",
            `${root}.invalidates`,
            `Known downstream artifact ${dependentKey} consumed the corrected artifact.`,
          ));
        }
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    const next = edges.get(node);
    if (next && visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  if ([...edges.keys()].some(visit)) {
    errors.push(problem(
      "CORRECTION_CYCLE",
      "$.corrections",
      "Correction edges must form acyclic, linear chains.",
    ));
  }

  return { valid: errors.length === 0, errors };
}
