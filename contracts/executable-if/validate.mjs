import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, "schema/executable-if-kernel.schema.json"), "utf8"));
const semantics = JSON.parse(readFileSync(resolve(here, "evaluator-semantics.json"), "utf8"));
const conformanceVectors = JSON.parse(readFileSync(resolve(here, "conformance-vectors.json"), "utf8"));
const implementationSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const HASH_DOMAIN = "mind-flow:executable-if:v1";
const DAY_MS = 86_400_000;
const SCOPE_AXES = ["jurisdictions", "geographies", "cohorts", "services"];
const NON_DECISIVE = new Set(["unknown", "stale", "conflicted"]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(kind, value) {
  return `sha256:${createHash("sha256")
    .update(`${HASH_DOMAIN}:${kind}\n${canonicalJson(value)}`)
    .digest("hex")}`;
}

function without(value, key) {
  const copy = structuredClone(value);
  delete copy[key];
  return copy;
}

export const FIXED_EVALUATOR_REF = Object.freeze({
  id: semantics.id,
  version: semantics.version,
  digest: digest("evaluator-semantics", semantics),
  implementation_digest: digest("evaluator-implementation", implementationSource),
  conformance_vectors_digest: digest("evaluator-conformance-vectors", conformanceVectors),
});

export function computeSignalDefinitionHash(signal) {
  return digest("signal-definition", without(signal, "signal_definition_hash"));
}

export function computeConditionDefinitionHash(definition) {
  return digest("condition-definition", without(definition, "definition_hash"));
}

export function computeObservationHash(observation) {
  return digest("observation", without(observation, "observation_hash"));
}

export function computeEventHash(event) {
  return digest("definition-event", without(event, "event_hash"));
}

export function computeEvidenceEventHash(event) {
  return digest("evidence-event", without(event, "evidence_event_hash"));
}

export function computeManifestHash(kernel) {
  return digest("kernel-manifest", without(kernel, "manifest_hash"));
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function sameRef(left, right) {
  return same(left, right);
}

function refFor(definition) {
  return {
    condition_id: definition.condition_id,
    definition_version: definition.definition_version,
    definition_hash: definition.definition_hash,
  };
}

function signalRefFor(signal) {
  return {
    signal_id: signal.signal_id,
    definition_version: signal.definition_version,
    signal_definition_hash: signal.signal_definition_hash,
  };
}

function observationRefFor(observation) {
  return {
    observation_id: observation.observation_id,
    observation_hash: observation.observation_hash,
  };
}

function definitionKey(reference) {
  return `${reference.condition_id}@${reference.definition_version}`;
}

function signalKey(reference) {
  return `${reference.signal_id}@${reference.definition_version}`;
}

function stateKey(state) {
  return state.condition_id;
}

function error(code, path, message) {
  return { code, path, message };
}

function parseVersion(value) {
  return value.split(".").map(Number);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function isStrictScopeSubset(next, previous) {
  let strict = false;
  for (const axis of SCOPE_AXES) {
    const before = new Set(previous[axis]);
    if (!next[axis].every((value) => before.has(value))) return false;
    if (next[axis].length < previous[axis].length) strict = true;
  }
  return strict;
}

function definitionSemantics(definition, { includeScope = true } = {}) {
  const result = structuredClone(definition);
  for (const key of [
    "condition_id",
    "definition_version",
    "definition_hash",
    "effective_from",
  ]) delete result[key];
  if (!includeScope) delete result.scope;
  return result;
}

function normalisedScope(scope) {
  return Object.fromEntries(SCOPE_AXES.map((axis) => [axis, [...scope[axis]].sort()]));
}

function isExactSingleAxisPartition(parentScope, childScopes) {
  if (childScopes.length < 2) return false;
  const parent = normalisedScope(parentScope);
  const children = childScopes.map(normalisedScope);
  const varyingAxes = SCOPE_AXES.filter((axis) =>
    children.some((child) => !same(child[axis], parent[axis])));
  if (varyingAxes.length !== 1) return false;
  const splitAxis = varyingAxes[0];
  for (const axis of SCOPE_AXES) {
    if (axis !== splitAxis && children.some((child) => !same(child[axis], parent[axis]))) {
      return false;
    }
  }
  const parentValues = new Set(parent[splitAxis]);
  const seen = new Set();
  for (const child of children) {
    for (const value of child[splitAxis]) {
      if (!parentValues.has(value) || seen.has(value)) return false;
      seen.add(value);
    }
  }
  return seen.size === parentValues.size && [...parentValues].every((value) => seen.has(value));
}

function expressionRefs(expression, into = []) {
  if (expression.predicate_ref) into.push(expression.predicate_ref);
  else if (expression.not) expressionRefs(expression.not, into);
  else for (const child of expression.all || expression.any || []) expressionRefs(child, into);
  return into;
}

function evaluateOperator(operator, value, threshold) {
  if (operator === "gt") return value > threshold;
  if (operator === "gte") return value >= threshold;
  if (operator === "lt") return value < threshold;
  if (operator === "lte") return value <= threshold;
  if (operator === "eq") return value === threshold;
  if (operator === "neq") return value !== threshold;
  throw new Error(`unsupported operator ${operator}`);
}

function reduceTruth(kind, states) {
  const decisive = kind === "all" ? "false" : "true";
  const identity = kind === "all" ? "true" : "false";
  if (states.includes(decisive)) return { state: decisive };
  if (states.every((state) => state === identity)) return { state: identity };
  const unresolved = [...new Set(states.filter((state) => NON_DECISIVE.has(state)))];
  return { state: unresolved.length === 1 ? unresolved[0] : "unknown" };
}

export function evaluateTruthExpression(expression, predicateStates) {
  if (expression.predicate_ref) {
    return { state: predicateStates[expression.predicate_ref] || "unknown" };
  }
  if (expression.not) {
    const result = evaluateTruthExpression(expression.not, predicateStates);
    if (result.state === "true") return { state: "false" };
    if (result.state === "false") return { state: "true" };
    return result;
  }
  const kind = expression.all ? "all" : "any";
  return reduceTruth(kind, expression[kind].map((child) =>
    evaluateTruthExpression(child, predicateStates).state));
}

function predicateResult(predicate, observations, evaluatedAt) {
  const empty = {
    state: predicate.missing_result,
    observed_periods: 0,
    eligible_periods: 0,
    excluded_periods: [],
    errors: [],
  };
  if (observations.length === 0) return empty;
  const evaluatedMs = Date.parse(evaluatedAt);
  const validPast = observations.filter(({ period, recorded_at: recordedAt }) =>
    Date.parse(period.end) <= evaluatedMs && Date.parse(recordedAt) <= evaluatedMs);
  if (validPast.length === 0) return empty;
  const latestMs = Math.max(...validPast.map(({ period }) => Date.parse(period.end)));
  if ((evaluatedMs - latestMs) / DAY_MS > predicate.window.maximum_age_days) {
    return { ...empty, state: predicate.stale_result };
  }
  const cutoff = evaluatedMs - predicate.window.lookback_days * DAY_MS;
  const grouped = new Map();
  for (const observation of validPast) {
    if (Date.parse(observation.period.end) < cutoff) continue;
    const key = `${observation.period.start}/${observation.period.end}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(observation);
  }
  const periods = [...grouped.entries()].map(([period, values]) => ({
    period,
    start: Date.parse(values[0].period.start),
    end: Date.parse(values[0].period.end),
    values,
  })).sort((left, right) => left.end - right.end || left.start - right.start);
  const errors = [];
  for (let left = 0; left < periods.length; left += 1) {
    for (let right = left + 1; right < periods.length; right += 1) {
      if (periods[right].start <= periods[left].end) {
        errors.push(error("OVERLAPPING_OBSERVATION_PERIODS", "/observations",
          "distinct persistence periods must not overlap"));
      }
    }
  }
  if (errors.length > 0) return { ...empty, observed_periods: periods.length, errors };

  const assessed = periods.map((period) => {
    const reasons = [];
    const sourceCount = new Set(period.values.map(({ source_id: sourceId }) => sourceId)).size;
    const artifactCount = new Set(period.values.map(
      ({ source_artifact_hash: artifactHash }) => artifactHash)).size;
    const minimumCoverage = Math.min(...period.values.map(({ coverage }) =>
      coverage.observed_units / coverage.eligible_units));
    if (sourceCount < predicate.source_policy.minimum_distinct_source_ids) {
      reasons.push("insufficient-distinct-source-ids");
    }
    if (artifactCount < predicate.source_policy.minimum_distinct_artifact_hashes) {
      reasons.push("insufficient-distinct-artifacts");
    }
    if (minimumCoverage < predicate.source_policy.minimum_coverage_ratio) {
      reasons.push("coverage-below-floor");
    }
    return { ...period, reasons };
  });
  const requiredPeriods = Math.max(
    predicate.window.minimum_observations,
    predicate.window.persistence,
  );
  const selected = assessed.slice(-requiredPeriods);
  const excludedPeriods = selected.filter(({ reasons }) => reasons.length > 0).map(({ period, reasons }) => ({
    period,
    reasons,
  }));
  const eligiblePeriods = assessed.filter(({ reasons }) => reasons.length === 0).length;
  if (selected.length < requiredPeriods || excludedPeriods.length > 0) {
    return {
      ...empty,
      observed_periods: assessed.length,
      eligible_periods: eligiblePeriods,
      excluded_periods: excludedPeriods,
    };
  }
  const periodStates = selected.map(({ values }) => {
    const results = new Set(values.map(({ value }) =>
      evaluateOperator(predicate.operator, value, predicate.threshold.value)));
    return results.size > 1 ? "conflicted" : (results.has(true) ? "true" : "false");
  });
  const latest = periodStates.slice(-predicate.window.persistence);
  if (latest.includes("conflicted")) {
    return {
      ...empty,
      state: predicate.conflict_result,
      observed_periods: assessed.length,
      eligible_periods: eligiblePeriods,
    };
  }
  return {
    state: latest.every((state) => state === "true") ? "true" : "false",
    observed_periods: assessed.length,
    eligible_periods: eligiblePeriods,
    excluded_periods: [],
    errors: [],
  };
}

function typeMatches(kind, value) {
  return kind === "number"
    ? typeof value === "number" && Number.isFinite(value)
    : typeof value === "boolean";
}

export function evaluateCondition(definition, signals, observations, { evaluatedAt }) {
  const signalMap = new Map(signals.map((signal) => [signalKey(signal), signal]));
  const predicateResults = {};
  const errors = [];
  const usable = [];
  if (definition.definition_hash !== computeConditionDefinitionHash(definition)) {
    errors.push(error("DEFINITION_HASH_MISMATCH", "/definition_hash",
      "condition definition hash does not match definition bytes"));
  }
  if (!same(definition.evaluator_ref, FIXED_EVALUATOR_REF)) {
    errors.push(error("EVALUATOR_IDENTITY_MISMATCH", "/evaluator_ref",
      "condition definition must use the fixed evaluator semantics"));
  }
  validateDefinitionSemantics(definition, signalMap, errors, "/definition");
  if (typeof evaluatedAt !== "string" || !Number.isFinite(Date.parse(evaluatedAt)) ||
      !evaluatedAt.endsWith("Z")) {
    errors.push(error("EVALUATION_TIME_INVALID", "/evaluated_at",
      "evaluatedAt must be a UTC date-time"));
  }
  if (!Number.isFinite(Date.parse(definition.effective_from)) || !definition.effective_from.endsWith("Z")) {
    errors.push(error("DEFINITION_EFFECTIVE_TIME_INVALID", "/definition/effective_from",
      "definition effective_from must be a UTC date-time"));
  } else if (Date.parse(evaluatedAt) < Date.parse(definition.effective_from)) {
    errors.push(error("EVALUATION_BEFORE_DEFINITION", "/evaluated_at",
      "a condition cannot be evaluated before its definition becomes effective"));
  }
  const claimStartsAt = Date.parse(definition.claim?.period?.starts_at);
  const claimEndsAt = Date.parse(definition.claim?.period?.ends_at);
  if (Number.isFinite(Date.parse(evaluatedAt)) &&
      (Date.parse(evaluatedAt) < claimStartsAt || Date.parse(evaluatedAt) > claimEndsAt)) {
    errors.push(error("EVALUATION_OUTSIDE_CLAIM_PERIOD", "/evaluated_at",
      "evaluation time must fall inside the typed claim period"));
  }
  for (const [index, signal] of signals.entries()) {
    if (signal.signal_definition_hash !== computeSignalDefinitionHash(signal)) {
      errors.push(error("SIGNAL_HASH_MISMATCH", `/signals/${index}/signal_definition_hash`,
        "signal definition hash does not match signal bytes"));
    }
  }
  const sourcePeriodCells = new Set();
  for (const [index, observation] of observations.entries()) {
    const path = `/observations/${index}`;
    if (!sameRef(observation.condition_definition_ref, refFor(definition))) continue;
    const predicate = definition.predicates[observation.predicate_id];
    const signal = predicate && signalMap.get(signalKey(predicate.signal_ref));
    if (!predicate || !signal || !sameRef(observation.signal_ref, predicate.signal_ref)) {
      errors.push(error("OBSERVATION_PREDICATE_UNRESOLVED", path,
        "observation predicate and signal must resolve within the evaluated definition"));
      continue;
    }
    if (observation.observation_hash !== computeObservationHash(observation)) {
      errors.push(error("OBSERVATION_HASH_MISMATCH", `${path}/observation_hash`,
        "observation hash does not match observation bytes"));
      continue;
    }
    if (!same(observation.scope, definition.scope)) {
      errors.push(error("OBSERVATION_SCOPE_MISMATCH", `${path}/scope`,
        "observation scope must equal the evaluated condition scope"));
      continue;
    }
    if (observation.unit !== signal.unit || !typeMatches(signal.value_kind, observation.value)) {
      errors.push(error("OBSERVATION_TYPE_OR_UNIT_MISMATCH", path,
        "observation type and unit must match its exact signal definition"));
      continue;
    }
    if (!observation.coverage || observation.coverage.eligible_units < 1 ||
        observation.coverage.observed_units < 1 || observation.coverage.missing_units < 0 ||
        observation.coverage.observed_units + observation.coverage.missing_units !==
          observation.coverage.eligible_units) {
      errors.push(error("OBSERVATION_COVERAGE_INCOHERENT", `${path}/coverage`,
        "coverage counts must be positive, non-negative and sum to eligible units"));
      continue;
    }
    const start = Date.parse(observation.period.start);
    const end = Date.parse(observation.period.end);
    const recorded = Date.parse(observation.recorded_at);
    if (![start, end, recorded].every(Number.isFinite)) {
      errors.push(error("OBSERVATION_TIME_INVALID", path,
        "observation period and recorded_at must be valid UTC date-times"));
      continue;
    }
    if (start > end || end > recorded) {
      errors.push(error("OBSERVATION_CHRONOLOGY_INVALID", path,
        "observation requires period start <= end <= recorded_at"));
      continue;
    }
    if (start < Date.parse(definition.effective_from) || recorded < Date.parse(definition.effective_from)) {
      errors.push(error("OBSERVATION_PREDATES_DEFINITION", path,
        "an observation cannot support a definition before it becomes effective"));
      continue;
    }
    if (start < claimStartsAt || end > claimEndsAt) {
      errors.push(error("OBSERVATION_OUTSIDE_CLAIM_PERIOD", `${path}/period`,
        "an observation period cannot escape the typed claim period"));
      continue;
    }
    if (recorded > Date.parse(evaluatedAt)) {
      errors.push(error("OBSERVATION_AFTER_EVALUATION", `${path}/recorded_at`,
        "an observation recorded after evaluation cannot enter the result"));
      continue;
    }
    const cell = canonicalJson([
      observation.condition_definition_ref,
      observation.predicate_id,
      observation.signal_ref,
      observation.period,
      observation.source_id,
    ]);
    if (sourcePeriodCells.has(cell)) {
      errors.push(error("DUPLICATE_SOURCE_PERIOD_CELL", path,
        "one source id can provide only one value for a signal-period cell"));
      continue;
    }
    sourcePeriodCells.add(cell);
    usable.push(observation);
  }
  for (const [predicateId, predicate] of Object.entries(definition.predicates)) {
    const signal = signalMap.get(signalKey(predicate.signal_ref));
    if (!signal || !sameRef(predicate.signal_ref, signalRefFor(signal))) {
      errors.push(error("PREDICATE_SIGNAL_REF_MISMATCH", `/predicates/${predicateId}/signal_ref`,
        "predicate does not resolve to the exact signal definition"));
      predicateResults[predicateId] = { state: "unknown", eligible_periods: 0 };
      continue;
    }
    const selected = usable.filter((observation) =>
      sameRef(observation.condition_definition_ref, refFor(definition)) &&
      observation.predicate_id === predicateId &&
      sameRef(observation.signal_ref, predicate.signal_ref));
    predicateResults[predicateId] = predicateResult(predicate, selected, evaluatedAt);
    errors.push(...predicateResults[predicateId].errors.map((item) => ({
      ...item,
      path: `/predicates/${predicateId}${item.path}`,
    })));
  }
  const computedTruth = evaluateTruthExpression(
    definition.truth_expression,
    Object.fromEntries(Object.entries(predicateResults).map(([id, result]) => [id, result.state])),
  );
  const conditionTruth = errors.length === 0 ? computedTruth : { state: "unknown" };
  const receipt = {
    evaluated_at: evaluatedAt,
    clock: { source: "caller-supplied", trusted: false },
    evaluator_ref: FIXED_EVALUATOR_REF,
    condition_definition_ref: refFor(definition),
    observation_hashes: observations.map(({ observation_hash: hash }) => hash).sort(),
    mechanically_valid_for_evaluation: errors.length === 0,
    computed_rule_state: { axis: "computed_rule_state", ...conditionTruth },
    executable: errors.length === 0,
    errors,
    predicate_results: predicateResults,
    condition_truth: { axis: "condition_truth", ...conditionTruth },
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
  };
  return { ...receipt, evaluation_hash: digest("evaluation-receipt", receipt) };
}

function validateDefinitionSemantics(definition, signals, errors, path) {
  if (!same(definition.evaluator_ref, FIXED_EVALUATOR_REF)) {
    errors.push(error("EVALUATOR_IDENTITY_MISMATCH", `${path}/evaluator_ref`,
      "condition definition must use the fixed evaluator semantics"));
  }
  const claimStart = Date.parse(definition.claim?.period?.starts_at);
  const claimEnd = Date.parse(definition.claim?.period?.ends_at);
  if (!Number.isFinite(claimStart) || !Number.isFinite(claimEnd) || claimStart > claimEnd) {
    errors.push(error("CONDITION_CLAIM_PERIOD_INVALID", `${path}/claim/period`,
      "typed claim period requires valid ordered UTC boundaries"));
  }
  const refs = expressionRefs(definition.truth_expression);
  if (new Set(refs).size !== refs.length ||
      refs.some((reference) => !Object.hasOwn(definition.predicates, reference)) ||
      Object.keys(definition.predicates).some((predicateId) => !refs.includes(predicateId))) {
    errors.push(error("TRUTH_EXPRESSION_NOT_CLOSED", `${path}/truth_expression`,
      "truth expression must reference every predicate exactly once"));
  }
  for (const [predicateId, predicate] of Object.entries(definition.predicates)) {
    const signal = signals.get(signalKey(predicate.signal_ref));
    if (!signal || !sameRef(predicate.signal_ref, signalRefFor(signal))) {
      errors.push(error("PREDICATE_SIGNAL_REF_MISMATCH", `${path}/predicates/${predicateId}/signal_ref`,
        "predicate signal reference is unresolved or drifted"));
      continue;
    }
    if (predicate.threshold.unit !== signal.unit || !typeMatches(signal.value_kind, predicate.threshold.value)) {
      errors.push(error("PREDICATE_TYPE_OR_UNIT_MISMATCH", `${path}/predicates/${predicateId}/threshold`,
        "threshold type and unit must match the referenced signal"));
    }
    if (signal.value_kind === "boolean" && !["eq", "neq"].includes(predicate.operator)) {
      errors.push(error("PREDICATE_OPERATOR_TYPE_MISMATCH", `${path}/predicates/${predicateId}/operator`,
        "boolean signals support only eq and neq"));
    }
    if (predicate.window.persistence > predicate.window.minimum_observations) {
      errors.push(error("PERSISTENCE_EXCEEDS_MINIMUM", `${path}/predicates/${predicateId}/window`,
        "persistence cannot exceed the minimum required distinct periods"));
    }
  }
}

function validateDefinition(definition, signals, definitions, errors, path) {
  validateDefinitionSemantics(definition, signals, errors, path);
  const key = definitionKey(definition);
  if (definitions.has(key)) {
    errors.push(error("DEFINITION_VERSION_REUSED", path,
      "one condition id and version can be introduced only once"));
  } else definitions.set(key, definition.definition_hash);
}

function validateStateRef(state, definitions, errors, path) {
  if (state.condition_id !== state.condition_definition_ref.condition_id) {
    errors.push(error("STATE_IDENTITY_MISMATCH", path, "state and definition condition ids differ"));
  }
  const expected = definitions.get(definitionKey(state.condition_definition_ref));
  if (!expected || !sameRef(state.condition_definition_ref, refFor(expected))) {
    errors.push(error("STATE_DEFINITION_UNRESOLVED", `${path}/condition_definition_ref`,
      "state definition reference is unresolved or drifted"));
  }
}

function stateMap(states) {
  return new Map(states.map((state) => [state.condition_id, state]));
}

function validateEvolutionOperation(event, prior, introduced, errors, path) {
  const previous = event.previous_states;
  const next = event.new_states;
  const activeNext = next.filter(({ lifecycle }) => lifecycle === "active");
  const supersededNext = next.filter(({ lifecycle }) => lifecycle === "superseded");
  const introducedById = new Map(introduced.map((definition) => [definition.condition_id, definition]));
  const requireStateIncrement = (before, after) => {
    if (after.state_version !== before.state_version + 1) {
      errors.push(error("STATE_VERSION_NOT_INCREMENTED", path, "state version must increment exactly once"));
    }
  };

  const expectedIdentityKind = ["split", "merge"].includes(event.operation)
    ? event.operation
    : "none";
  if (event.identity_change.kind !== expectedIdentityKind) {
    errors.push(error("IDENTITY_CHANGE_OPERATION_MISMATCH", `${path}/identity_change`,
      "identity-change metadata must exactly match the event operation"));
  }

  if (event.operation === "added") {
    if (previous.length !== 0 || next.length !== 1 || activeNext.length !== 1 || introduced.length !== 1 ||
        next[0].state_version !== 1 || introduced[0].definition_version !== "1.0.0" ||
        !sameRef(next[0].condition_definition_ref, refFor(introduced[0]))) {
      errors.push(error("INVALID_ADDED_EVENT", path, "added must introduce one version-one active identity"));
    }
    return;
  }

  if (["narrowed", "definition-revised"].includes(event.operation)) {
    if (previous.length !== 1 || next.length !== 1 || activeNext.length !== 1 || introduced.length !== 1) {
      errors.push(error("INVALID_REVISION_EVENT", path, "revision must replace one active identity with one definition"));
      return;
    }
    const before = previous[0];
    const after = next[0];
    const oldDefinition = prior.get(definitionKey(before.condition_definition_ref));
    const newDefinition = introduced[0];
    requireStateIncrement(before, after);
    if (before.condition_id !== after.condition_id || after.condition_id !== newDefinition.condition_id ||
        !sameRef(after.condition_definition_ref, refFor(newDefinition)) || !oldDefinition ||
        compareVersions(newDefinition.definition_version, oldDefinition.definition_version) <= 0) {
      errors.push(error("INVALID_REVISION_IDENTITY", path, "revision identity or definition version is invalid"));
      return;
    }
    if (event.operation === "narrowed") {
      if (!isStrictScopeSubset(newDefinition.scope, oldDefinition.scope) ||
          !same(definitionSemantics(newDefinition, { includeScope: false }),
            definitionSemantics(oldDefinition, { includeScope: false }))) {
        errors.push(error("NARROWING_NOT_STRICT_SUBSET", path,
          "narrowing must only make at least one scope axis a strict subset"));
      }
    } else {
      if (!same(newDefinition.claim, oldDefinition.claim) ||
          newDefinition.proposition !== oldDefinition.proposition) {
        errors.push(error("CONDITION_MEANING_CHANGED", path,
          "a definition revision cannot change the typed claim or its proposition"));
      }
      if (!same(newDefinition.scope, oldDefinition.scope)) {
        errors.push(error("DEFINITION_REVISION_SCOPE_CHANGED", path,
          "scope changes require narrowed, split or merge"));
      }
      if (same(definitionSemantics(newDefinition), definitionSemantics(oldDefinition))) {
        errors.push(error("DEFINITION_REVISION_NO_CHANGE", path,
          "definition-revised must change executable semantics"));
      }
    }
    return;
  }

  if (event.operation === "split") {
    if (previous.length !== 1 || supersededNext.length !== 1 || activeNext.length < 2 ||
        introduced.length !== activeNext.length || event.identity_change.kind !== "split") {
      errors.push(error("INVALID_SPLIT_EVENT", path, "split must supersede one identity and add two or more"));
      return;
    }
    const before = previous[0];
    const source = prior.get(definitionKey(before.condition_definition_ref));
    const superseded = supersededNext[0];
    requireStateIncrement(before, superseded);
    if (!sameRef(superseded.condition_definition_ref, before.condition_definition_ref) || !source ||
        !same(event.identity_change.from_condition_ids, [before.condition_id]) ||
        !same([...event.identity_change.to_condition_ids].sort(), activeNext.map(stateKey).sort())) {
      errors.push(error("INVALID_SPLIT_IDENTITY", path, "split identity map is inconsistent"));
    }
    if (!source) return;
    for (const state of activeNext) {
      const definition = introducedById.get(state.condition_id);
      if (!definition || definition.definition_version !== "1.0.0" || state.state_version !== 1 ||
          !sameRef(state.condition_definition_ref, refFor(definition)) ||
          !isStrictScopeSubset(definition.scope, source.scope) ||
          !same(definitionSemantics(definition, { includeScope: false }),
            definitionSemantics(source, { includeScope: false }))) {
        errors.push(error("INVALID_SPLIT_TARGET", path, "each split target must be a new strict-scope identity"));
      }
    }
    if (!isExactSingleAxisPartition(source.scope, introduced.map(({ scope }) => scope))) {
      errors.push(error("INVALID_SPLIT_PARTITION", path,
        "split targets must form one exhaustive disjoint partition along exactly one scope axis"));
    }
    return;
  }

  if (event.operation === "merge") {
    if (previous.length < 2 || supersededNext.length !== previous.length || activeNext.length !== 1 ||
        introduced.length !== 1 || event.identity_change.kind !== "merge") {
      errors.push(error("INVALID_MERGE_EVENT", path, "merge must supersede two or more identities and add one"));
      return;
    }
    const sources = previous.map((state) => prior.get(definitionKey(state.condition_definition_ref)));
    const target = introduced[0];
    if (sources.some((source) => !source) ||
        !sources.every((source) => same(definitionSemantics(source, { includeScope: false }),
          definitionSemantics(target, { includeScope: false }))) ||
        !isExactSingleAxisPartition(target.scope, sources.map(({ scope }) => scope)) ||
        !same([...event.identity_change.from_condition_ids].sort(), previous.map(stateKey).sort()) ||
        !same(event.identity_change.to_condition_ids, [target.condition_id]) ||
        target.definition_version !== "1.0.0" ||
        activeNext[0].state_version !== 1 ||
        !sameRef(activeNext[0].condition_definition_ref, refFor(target))) {
      errors.push(error("INVALID_MERGE_TARGET", path, "merge semantics, scope or identities are inconsistent"));
    }
    for (const before of previous) {
      const after = supersededNext.find((state) => state.condition_id === before.condition_id);
      if (!after || !sameRef(after.condition_definition_ref, before.condition_definition_ref)) {
        errors.push(error("INVALID_MERGE_SOURCE", path, "merge must preserve each superseded definition"));
      } else requireStateIncrement(before, after);
    }
  }
}

function validateHistory(kernel, signalMap, errors) {
  const definitionHashes = new Map();
  const definitionObjects = new Map();
  const definitionIntroducedAt = new Map();
  const current = new Map();
  let previousHash = null;
  let previousTime = -Infinity;
  const eventIds = new Set();

  kernel.events.forEach((event, index) => {
    const path = `/events/${index}`;
    if (event.sequence !== index + 1) errors.push(error("EVENT_SEQUENCE_GAP", `${path}/sequence`, "event sequences must be contiguous"));
    if (eventIds.has(event.event_id)) errors.push(error("DUPLICATE_EVENT_ID", `${path}/event_id`, "event ids must be unique"));
    eventIds.add(event.event_id);
    if (Date.parse(event.recorded_at) <= previousTime) {
      errors.push(error("EVENT_CHRONOLOGY_INVALID", `${path}/recorded_at`, "events must be strictly chronological"));
    }
    previousTime = Date.parse(event.recorded_at);
    if (event.previous_event_hash !== previousHash) {
      errors.push(error("EVENT_CHAIN_BROKEN", `${path}/previous_event_hash`, "event does not bind the prior event hash"));
    }
    if (event.event_hash !== computeEventHash(event)) {
      errors.push(error("EVENT_HASH_MISMATCH", `${path}/event_hash`, "event hash does not match event bytes"));
    }
    if (event.authority_effect !== "none" || event.action_authorised !== false) {
      errors.push(error("EVENT_AUTHORITY_CLAIM", path, "definition events cannot authorise action"));
    }

    const priorDefinitions = new Map(definitionObjects);
    for (const [definitionIndex, definition] of event.introduced_definitions.entries()) {
      const definitionPath = `${path}/introduced_definitions/${definitionIndex}`;
      if (definition.definition_hash !== computeConditionDefinitionHash(definition)) {
        errors.push(error("DEFINITION_HASH_MISMATCH", `${definitionPath}/definition_hash`,
          "condition definition hash does not match definition bytes"));
      }
      if (definition.effective_from !== event.recorded_at) {
        errors.push(error("DEFINITION_EFFECTIVE_TIME_MISMATCH", `${definitionPath}/effective_from`,
          "prototype definitions become effective exactly when their introducing event is recorded"));
      }
      validateDefinition(definition, signalMap, definitionHashes, errors, definitionPath);
      const key = definitionKey(definition);
      if (!definitionObjects.has(key)) {
        definitionObjects.set(key, definition);
        definitionIntroducedAt.set(key, event.recorded_at);
      }
    }
    for (const [stateIndex, state] of event.previous_states.entries()) {
      validateStateRef(state, priorDefinitions, errors, `${path}/previous_states/${stateIndex}`);
      const expected = current.get(state.condition_id);
      if (!expected || !same(expected, state) || state.lifecycle !== "active") {
        errors.push(error("PREVIOUS_STATE_NOT_CURRENT", `${path}/previous_states/${stateIndex}`,
          "event previous state must equal the active folded state"));
      }
    }
    for (const [stateIndex, state] of event.new_states.entries()) {
      validateStateRef(state, definitionObjects, errors, `${path}/new_states/${stateIndex}`);
    }
    if (event.operation === "added" && event.new_states.some((state) => current.has(state.condition_id))) {
      errors.push(error("ADDED_IDENTITY_ALREADY_EXISTS", path,
        "added cannot reuse an identity already present in the history fold"));
    }
    if (["split", "merge"].includes(event.operation)) {
      const previousIds = new Set(event.previous_states.map(stateKey));
      for (const state of event.new_states.filter(({ lifecycle }) => lifecycle === "active")) {
        if (current.has(state.condition_id) && !previousIds.has(state.condition_id)) {
          errors.push(error("DERIVED_IDENTITY_ALREADY_EXISTS", path,
            "split and merge targets must introduce new condition identities"));
        }
      }
    }
    validateEvolutionOperation(event, priorDefinitions, event.introduced_definitions, errors, path);
    for (const state of event.new_states) current.set(state.condition_id, state);
    previousHash = event.event_hash;
  });

  const declared = stateMap(kernel.current_state);
  if (declared.size !== kernel.current_state.length || declared.size !== current.size ||
      [...current].some(([id, state]) => !same(declared.get(id), state))) {
    errors.push(error("CURRENT_STATE_FOLD_MISMATCH", "/current_state",
      "declared current state must equal the complete event fold"));
  }
  return {
    currentState: [...current.values()].sort((left, right) => left.condition_id.localeCompare(right.condition_id)),
    definitionObjects,
    definitionIntroducedAt,
    definitionHistory: [...new Set([...definitionObjects.values()].map(({ condition_id: id }) => id))]
      .sort()
      .map((id) => ({
        condition_id: id,
        versions: [...definitionObjects.values()]
          .filter(({ condition_id: conditionId }) => conditionId === id)
          .map(({ definition_version: version }) => version)
          .sort(compareVersions),
      })),
  };
}

function validateObservations(kernel, signalMap, definitionObjects, definitionIntroducedAt, errors) {
  const ids = new Set();
  for (const [index, observation] of kernel.observations.entries()) {
    const path = `/observations/${index}`;
    if (ids.has(observation.observation_id)) {
      errors.push(error("DUPLICATE_OBSERVATION_ID", `${path}/observation_id`, "observation ids must be unique"));
    }
    ids.add(observation.observation_id);
    if (observation.observation_hash !== computeObservationHash(observation)) {
      errors.push(error("OBSERVATION_HASH_MISMATCH", `${path}/observation_hash`,
        "observation hash does not match observation bytes"));
    }
    const definition = definitionObjects.get(definitionKey(observation.condition_definition_ref));
    if (!definition || !sameRef(observation.condition_definition_ref, refFor(definition))) {
      errors.push(error("OBSERVATION_DEFINITION_UNRESOLVED", `${path}/condition_definition_ref`,
        "observation condition definition is unresolved or drifted"));
      continue;
    }
    const predicate = definition.predicates[observation.predicate_id];
    if (!predicate || !sameRef(observation.signal_ref, predicate.signal_ref)) {
      errors.push(error("OBSERVATION_PREDICATE_UNRESOLVED", `${path}/predicate_id`,
        "observation predicate or signal binding is unresolved"));
      continue;
    }
    const signal = signalMap.get(signalKey(observation.signal_ref));
    if (!signal || observation.unit !== signal.unit || !typeMatches(signal.value_kind, observation.value)) {
      errors.push(error("OBSERVATION_TYPE_OR_UNIT_MISMATCH", path,
        "observation type and unit must match its exact signal definition"));
    }
    const start = Date.parse(observation.period.start);
    const end = Date.parse(observation.period.end);
    const recorded = Date.parse(observation.recorded_at);
    if (![start, end, recorded].every(Number.isFinite)) {
      errors.push(error("OBSERVATION_TIME_INVALID", path,
        "observation period and recorded_at must be valid UTC date-times"));
    } else if (start > end || end > recorded) {
      errors.push(error("OBSERVATION_CHRONOLOGY_INVALID", path,
        "observation requires period start <= end <= recorded_at"));
    }
    const introducedAt = Date.parse(definitionIntroducedAt.get(definitionKey(
      observation.condition_definition_ref)));
    if (Number.isFinite(start) && Number.isFinite(recorded) &&
        (start < introducedAt || recorded < introducedAt)) {
      errors.push(error("OBSERVATION_PREDATES_DEFINITION", path,
        "an observation cannot support a definition before its introducing event"));
    }
    const claimStart = Date.parse(definition.claim.period.starts_at);
    const claimEnd = Date.parse(definition.claim.period.ends_at);
    if (Number.isFinite(start) && Number.isFinite(end) &&
        (start < claimStart || end > claimEnd)) {
      errors.push(error("OBSERVATION_OUTSIDE_CLAIM_PERIOD", `${path}/period`,
        "an observation period cannot escape the typed claim period"));
    }
    if (!same(observation.scope, definition.scope)) {
      errors.push(error("OBSERVATION_SCOPE_MISMATCH", `${path}/scope`,
        "observation scope must equal its condition definition scope"));
    }
    if (observation.coverage.observed_units + observation.coverage.missing_units !==
        observation.coverage.eligible_units) {
      errors.push(error("OBSERVATION_COVERAGE_INCOHERENT", `${path}/coverage`,
        "observed and missing units must equal eligible units"));
    }
  }
}

function evidenceStateKey(state) {
  return state.observation_ref.observation_id;
}

function sameObservationCell(left, right) {
  return same(
    [left.condition_definition_ref, left.predicate_id, left.signal_ref, left.scope,
      left.period, left.unit, left.source_id],
    [right.condition_definition_ref, right.predicate_id, right.signal_ref, right.scope,
      right.period, right.unit, right.source_id],
  );
}

function validateEvidenceHistory(kernel, errors) {
  const observations = new Map(kernel.observations.map((observation) => [
    observation.observation_id,
    observation,
  ]));
  const current = new Map();
  const introducedIds = new Set();
  const eventIds = new Set();
  let previousHash = null;
  let previousTime = -Infinity;

  const validateStateRef = (state, path) => {
    const observation = observations.get(state.observation_ref.observation_id);
    if (!observation || !sameRef(state.observation_ref, observationRefFor(observation))) {
      errors.push(error("EVIDENCE_STATE_OBSERVATION_UNRESOLVED", `${path}/observation_ref`,
        "evidence state must bind an exact registered observation"));
    }
    return observation;
  };
  const sameStateRef = (left, right) => sameRef(left.observation_ref, right.observation_ref);
  const requireTransition = (before, after, lifecycle, path) => {
    if (!sameStateRef(before, after) || after.state_version !== before.state_version + 1 ||
        after.lifecycle !== lifecycle) {
      errors.push(error("INVALID_EVIDENCE_STATE_TRANSITION", path,
        "evidence state must preserve its observation, increment once and enter the required lifecycle"));
    }
  };

  kernel.evidence_events.forEach((event, index) => {
    const path = `/evidence_events/${index}`;
    if (event.sequence !== index + 1) {
      errors.push(error("EVIDENCE_EVENT_SEQUENCE_GAP", `${path}/sequence`,
        "evidence event sequences must be contiguous"));
    }
    if (eventIds.has(event.evidence_event_id)) {
      errors.push(error("DUPLICATE_EVIDENCE_EVENT_ID", `${path}/evidence_event_id`,
        "evidence event ids must be unique"));
    }
    eventIds.add(event.evidence_event_id);
    const eventTime = Date.parse(event.recorded_at);
    if (eventTime <= previousTime) {
      errors.push(error("EVIDENCE_EVENT_CHRONOLOGY_INVALID", `${path}/recorded_at`,
        "evidence events must be strictly chronological"));
    }
    previousTime = eventTime;
    if (event.previous_evidence_event_hash !== previousHash) {
      errors.push(error("EVIDENCE_EVENT_CHAIN_BROKEN", `${path}/previous_evidence_event_hash`,
        "evidence event does not bind the prior event hash"));
    }
    if (event.evidence_event_hash !== computeEvidenceEventHash(event)) {
      errors.push(error("EVIDENCE_EVENT_HASH_MISMATCH", `${path}/evidence_event_hash`,
        "evidence event hash does not match event bytes"));
    }
    if (event.authority_effect !== "none" || event.action_authorised !== false) {
      errors.push(error("EVIDENCE_EVENT_AUTHORITY_CLAIM", path,
        "evidence events cannot authorise action"));
    }
    for (const [stateIndex, state] of event.previous_states.entries()) {
      const statePath = `${path}/previous_states/${stateIndex}`;
      validateStateRef(state, statePath);
      const expected = current.get(evidenceStateKey(state));
      if (!expected || !same(expected, state) || !["active", "challenged"].includes(state.lifecycle)) {
        errors.push(error("PREVIOUS_EVIDENCE_STATE_NOT_CURRENT", statePath,
          "event previous evidence state must equal a current mutable state"));
      }
    }
    for (const [stateIndex, state] of event.new_states.entries()) {
      const observation = validateStateRef(state, `${path}/new_states/${stateIndex}`);
      if (observation && Date.parse(observation.recorded_at) > eventTime) {
        errors.push(error("EVIDENCE_EVENT_PREDATES_OBSERVATION", path,
          "an evidence event cannot precede the observation it references"));
      }
    }

    const previous = event.previous_states;
    const next = event.new_states;
    if (event.operation === "evidence-added") {
      if (previous.length !== 0 || next.length !== 1 || next[0].state_version !== 1 ||
          next[0].lifecycle !== "active" || event.relation.kind !== "none" ||
          current.has(evidenceStateKey(next[0])) || introducedIds.has(evidenceStateKey(next[0]))) {
        errors.push(error("INVALID_EVIDENCE_ADDED_EVENT", path,
          "evidence-added must introduce one new active observation at state version one"));
      } else introducedIds.add(evidenceStateKey(next[0]));
    } else if (event.operation === "evidence-corrected") {
      const before = previous[0];
      const oldAfter = before && next.find((state) => evidenceStateKey(state) === evidenceStateKey(before));
      const replacement = next.find((state) => !before || evidenceStateKey(state) !== evidenceStateKey(before));
      const sourceObservation = before && observations.get(evidenceStateKey(before));
      const replacementObservation = replacement && observations.get(evidenceStateKey(replacement));
      if (previous.length !== 1 || next.length !== 2 || !oldAfter || !replacement ||
          replacement.state_version !== 1 || replacement.lifecycle !== "active" ||
          event.relation.kind !== "correction" ||
          !sameRef(event.relation.from_observation_ref, before.observation_ref) ||
          !sameRef(event.relation.to_observation_ref, replacement.observation_ref) ||
          introducedIds.has(evidenceStateKey(replacement)) || current.has(evidenceStateKey(replacement)) ||
          !sourceObservation || !replacementObservation ||
          !sameObservationCell(sourceObservation, replacementObservation)) {
        errors.push(error("INVALID_EVIDENCE_CORRECTION", path,
          "a correction must supersede one current observation with one new same-cell observation"));
      } else {
        requireTransition(before, oldAfter, "superseded", path);
        introducedIds.add(evidenceStateKey(replacement));
      }
    } else {
      const before = previous[0];
      const after = next[0];
      const expected = {
        "evidence-challenged": ["active", "challenged"],
        "challenge-resolved": ["challenged", "active"],
        "evidence-withdrawn": [["active", "challenged"], "withdrawn"],
        "evidence-expired": ["active", "expired"],
      }[event.operation];
      const allowedBefore = Array.isArray(expected?.[0]) ? expected[0] : [expected?.[0]];
      if (previous.length !== 1 || next.length !== 1 || event.relation.kind !== "none" ||
          !expected || !allowedBefore.includes(before?.lifecycle)) {
        errors.push(error("INVALID_EVIDENCE_LIFECYCLE_EVENT", path,
          "challenge, resolution, withdrawal and expiry require one exact current state"));
      } else requireTransition(before, after, expected[1], path);
    }
    for (const state of event.new_states) current.set(evidenceStateKey(state), state);
    previousHash = event.evidence_event_hash;
  });

  for (const observationId of observations.keys()) {
    if (!introducedIds.has(observationId)) {
      errors.push(error("OBSERVATION_MISSING_EVIDENCE_EVENT", "/observations",
        `observation ${observationId} was never introduced by evidence history`));
    }
  }
  for (const observationId of introducedIds) {
    if (!observations.has(observationId)) {
      errors.push(error("EVIDENCE_EVENT_OBSERVATION_MISSING", "/evidence_events",
        `evidence history introduced missing observation ${observationId}`));
    }
  }
  const declared = new Map(kernel.current_evidence_state.map((state) => [evidenceStateKey(state), state]));
  if (declared.size !== kernel.current_evidence_state.length || declared.size !== current.size ||
      [...current].some(([id, state]) => !same(declared.get(id), state))) {
    errors.push(error("CURRENT_EVIDENCE_STATE_FOLD_MISMATCH", "/current_evidence_state",
      "declared evidence state must equal the complete evidence-event fold"));
  }

  const activeCells = new Set();
  for (const state of current.values()) {
    if (state.lifecycle !== "active") continue;
    const observation = observations.get(evidenceStateKey(state));
    if (!observation) continue;
    const cell = canonicalJson([
      observation.condition_definition_ref,
      observation.predicate_id,
      observation.signal_ref,
      observation.period,
      observation.source_id,
    ]);
    if (activeCells.has(cell)) {
      errors.push(error("DUPLICATE_ACTIVE_SOURCE_PERIOD_CELL", "/current_evidence_state",
        "only one active observation may occupy a source-period cell"));
    }
    activeCells.add(cell);
  }

  return [...current.values()].sort((left, right) =>
    evidenceStateKey(left).localeCompare(evidenceStateKey(right)));
}

export function selectCurrentEvidence(kernel) {
  const active = new Map((kernel.current_evidence_state || [])
    .filter(({ lifecycle }) => lifecycle === "active")
    .map((state) => [state.observation_ref.observation_id, state.observation_ref.observation_hash]));
  return (kernel.observations || []).filter((observation) =>
    active.get(observation.observation_id) === observation.observation_hash);
}

export function resealKernel(kernel) {
  for (const signal of kernel.signals || []) {
    signal.signal_definition_hash = computeSignalDefinitionHash(signal);
  }
  let previousHash = null;
  for (const event of kernel.events || []) {
    for (const definition of event.introduced_definitions || []) {
      definition.definition_hash = computeConditionDefinitionHash(definition);
    }
    event.previous_event_hash = previousHash;
    event.event_hash = computeEventHash(event);
    previousHash = event.event_hash;
  }
  for (const observation of kernel.observations || []) {
    observation.observation_hash = computeObservationHash(observation);
  }
  let previousEvidenceEventHash = null;
  for (const event of kernel.evidence_events || []) {
    event.previous_evidence_event_hash = previousEvidenceEventHash;
    event.evidence_event_hash = computeEvidenceEventHash(event);
    previousEvidenceEventHash = event.evidence_event_hash;
  }
  kernel.manifest_hash = computeManifestHash(kernel);
  return kernel;
}

export function validateExecutableIfKernel(kernel) {
  const errors = [];
  const schemaValid = validateSchema(kernel);
  if (!schemaValid) {
    errors.push(...validateSchema.errors.map((item) =>
      error("SCHEMA_INVALID", item.instancePath || "/", item.message || "schema validation failed")));
  }
  if (!schemaValid) {
    return {
      schema_valid: false,
      integrity_valid: false,
      history_valid: false,
      evidence_history_valid: false,
      machine_valid: false,
      mechanically_valid_for_evaluation: false,
      executable: false,
      empirical_truth_established: false,
      authority_effect: "none",
      action_authorised: false,
      publication_approved: false,
      definition_history: [],
      current_definition_state: [],
      current_state: [],
      current_evidence_state: [],
      errors,
    };
  }

  const signalMap = new Map();
  const signalVersions = new Map();
  for (const [index, signal] of kernel.signals.entries()) {
    if (signal.signal_definition_hash !== computeSignalDefinitionHash(signal)) {
      errors.push(error("SIGNAL_HASH_MISMATCH", `/signals/${index}/signal_definition_hash`,
        "signal definition hash does not match signal bytes"));
    }
    const key = signalKey(signal);
    if (signalVersions.has(key)) {
      errors.push(error("SIGNAL_VERSION_REUSED", `/signals/${index}`,
        "signal id and version must be unique"));
    }
    signalVersions.set(key, signal.signal_definition_hash);
    signalMap.set(key, signal);
  }
  if (!same(kernel.evaluator, FIXED_EVALUATOR_REF)) {
    errors.push(error("EVALUATOR_IDENTITY_MISMATCH", "/evaluator",
      "kernel must use the fixed evaluator semantics"));
  }
  const historyStart = errors.length;
  const history = validateHistory(kernel, signalMap, errors);
  const historyValid = errors.length === historyStart;
  validateObservations(
    kernel,
    signalMap,
    history.definitionObjects,
    history.definitionIntroducedAt,
    errors,
  );
  const evidenceHistoryStart = errors.length;
  const currentEvidenceState = validateEvidenceHistory(kernel, errors);
  const evidenceHistoryValid = errors.length === evidenceHistoryStart;
  if (kernel.manifest_hash !== computeManifestHash(kernel)) {
    errors.push(error("MANIFEST_HASH_MISMATCH", "/manifest_hash", "manifest hash does not match kernel bytes"));
  }
  const integrityCodes = new Set([
    "SIGNAL_HASH_MISMATCH", "DEFINITION_HASH_MISMATCH", "OBSERVATION_HASH_MISMATCH",
    "EVENT_HASH_MISMATCH", "EVENT_CHAIN_BROKEN", "EVIDENCE_EVENT_HASH_MISMATCH",
    "EVIDENCE_EVENT_CHAIN_BROKEN", "MANIFEST_HASH_MISMATCH",
  ]);
  const integrityValid = !errors.some(({ code }) => integrityCodes.has(code));
  const machineValid = errors.length === 0;
  return {
    schema_valid: true,
    integrity_valid: integrityValid,
    history_valid: historyValid,
    evidence_history_valid: evidenceHistoryValid,
    machine_valid: machineValid,
    mechanically_valid_for_evaluation: machineValid,
    executable: machineValid,
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    definition_history: history.definitionHistory,
    current_definition_state: history.currentState,
    current_state: history.currentState,
    current_evidence_state: currentEvidenceState,
    errors,
  };
}

function rejectedKernelEvaluation(kernel, conditionId, evaluatedAt, rejectionErrors) {
  const receipt = {
    evaluated_at: evaluatedAt,
    clock: { source: "caller-supplied", trusted: false },
    evaluator_ref: FIXED_EVALUATOR_REF,
    kernel_manifest_hash: kernel?.manifest_hash || null,
    evidence_state_hash: null,
    requested_condition_id: conditionId,
    condition_definition_ref: null,
    observation_hashes: [],
    mechanically_valid_for_evaluation: false,
    computed_rule_state: { axis: "computed_rule_state", state: "unknown" },
    executable: false,
    errors: rejectionErrors,
    predicate_results: {},
    condition_truth: { axis: "condition_truth", state: "unknown" },
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
  };
  return { ...receipt, evaluation_hash: digest("kernel-evaluation-receipt", receipt) };
}

export function evaluateKernelCondition(kernel, conditionId, { evaluatedAt }) {
  const validation = validateExecutableIfKernel(kernel);
  if (!validation.machine_valid) {
    return rejectedKernelEvaluation(kernel, conditionId, evaluatedAt, [
      error("KERNEL_INVALID", "/", "governed evaluation requires a machine-valid kernel"),
      ...validation.errors,
    ]);
  }
  const state = validation.current_definition_state.find((candidate) =>
    candidate.condition_id === conditionId && candidate.lifecycle === "active");
  if (!state) {
    return rejectedKernelEvaluation(kernel, conditionId, evaluatedAt, [
      error("KERNEL_CONDITION_NOT_ACTIVE", "/current_state",
        "requested condition must resolve to one active current definition"),
    ]);
  }
  const definition = kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
    .find((candidate) => sameRef(refFor(candidate), state.condition_definition_ref));
  if (!definition) {
    return rejectedKernelEvaluation(kernel, conditionId, evaluatedAt, [
      error("KERNEL_CONDITION_UNRESOLVED", "/events",
        "active condition definition could not be resolved"),
    ]);
  }
  const selected = selectCurrentEvidence(kernel).filter((observation) =>
    sameRef(observation.condition_definition_ref, refFor(definition)));
  const base = evaluateCondition(definition, kernel.signals, selected, { evaluatedAt });
  const receipt = structuredClone(base);
  delete receipt.evaluation_hash;
  receipt.kernel_manifest_hash = kernel.manifest_hash;
  receipt.evidence_state_hash = digest(
    "current-evidence-state",
    [...kernel.current_evidence_state].sort((left, right) =>
      evidenceStateKey(left).localeCompare(evidenceStateKey(right))),
  );
  return { ...receipt, evaluation_hash: digest("kernel-evaluation-receipt", receipt) };
}
