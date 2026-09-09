import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

/**
 * Pure evaluator for condition-contract expressions.
 *
 * It accepts already-resolved predicate states. Fetching data, comparing values
 * with thresholds and deciding whether evidence is stale belong to a separate
 * layer. This module only combines those states without erasing uncertainty.
 */

export const EVALUATOR_VERSION = "3.0.1";

export const PREDICATE_TRUTH_STATES = Object.freeze([
  "true",
  "false",
  "unknown",
  "stale",
  "conflicted",
]);

// Compatibility alias. New contracts should name this predicate-truth axis.
export const STATES = PREDICATE_TRUTH_STATES;

// Gate truth has the same values but is a distinct semantic axis.
export const GATE_TRUTH_STATES = PREDICATE_TRUTH_STATES;

export const GATES = Object.freeze([
  "watch",
  "prepare",
  "act",
  "pause",
  "reverse",
  "recover",
  "graduate",
]);

const STATE_SET = new Set(PREDICATE_TRUTH_STATES);
const EXPRESSION_KEYS = new Set([
  "predicate_ref",
  "all",
  "any",
  "not",
  "alternative_if",
  "veto_if",
  "unless",
]);

function combineUncertainty(left, right) {
  return left === right ? left : "unknown";
}

function allPair(left, right) {
  if (left === "false" || right === "false") return "false";
  if (left === "true") return right;
  if (right === "true") return left;
  return combineUncertainty(left, right);
}

function anyPair(left, right) {
  if (left === "true" || right === "true") return "true";
  if (left === "false") return right;
  if (right === "false") return left;
  return combineUncertainty(left, right);
}

function makeBinaryTable(combine) {
  return Object.fromEntries(
    STATES.map((left) => [
      left,
      Object.fromEntries(STATES.map((right) => [right, combine(left, right)])),
    ]),
  );
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

export const TRUTH_TABLES = deepFreeze({
  not: {
    true: "false",
    false: "true",
    unknown: "unknown",
    stale: "stale",
    conflicted: "conflicted",
  },
  all: makeBinaryTable(allPair),
  any: makeBinaryTable(anyPair),
  alternative_if: makeBinaryTable(anyPair),
  veto_if: makeBinaryTable((condition, blocker) =>
    allPair(condition, {
      true: "false",
      false: "true",
      unknown: "unknown",
      stale: "stale",
      conflicted: "conflicted",
    }[blocker])),
});

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function unique(values) {
  return [...new Set(values)];
}

function error(code, path, message, predicateRef) {
  const result = { code, path, message };
  if (predicateRef !== undefined) result.predicate_ref = predicateRef;
  return result;
}

function expressionKey(expression) {
  if (!expression || typeof expression !== "object" || Array.isArray(expression)) return null;
  const keys = Object.keys(expression);
  return keys.length === 1 && EXPRESSION_KEYS.has(keys[0]) ? keys[0] : null;
}

function validateExpression(expression, predicateStates, knownPredicates, path, errors) {
  const key = expressionKey(expression);
  if (!key) {
    errors.push(error(
      "INVALID_EXPRESSION",
      path,
      "An expression must contain exactly one of predicate_ref, all, any, not, alternative_if or veto_if.",
    ));
    return;
  }

  if (key === "unless") {
    errors.push(error(
      "DEPRECATED_UNLESS",
      path,
      "unless is ambiguous. Use alternative_if for an equivalent route or veto_if for a blocker.",
    ));
    return;
  }

  if (key === "predicate_ref") {
    const ref = expression.predicate_ref;
    if (typeof ref !== "string" || ref.length === 0) {
      errors.push(error("INVALID_PREDICATE_REFERENCE", path, "predicate_ref must be non-empty."));
      return;
    }
    if (knownPredicates && !knownPredicates.has(ref)) {
      errors.push(error(
        "UNKNOWN_PREDICATE_REFERENCE",
        path,
        `Predicate ${ref} is not declared by the condition contract.`,
        ref,
      ));
      return;
    }
    if (!own(predicateStates, ref)) {
      errors.push(error(
        "MISSING_PREDICATE_STATE",
        path,
        `No evaluated state was supplied for predicate ${ref}.`,
        ref,
      ));
      return;
    }
    if (!STATE_SET.has(predicateStates[ref])) {
      errors.push(error(
        "INVALID_PREDICATE_STATE",
        path,
        `Predicate ${ref} has unsupported state ${String(predicateStates[ref])}.`,
        ref,
      ));
    }
    return;
  }

  if (key === "all" || key === "any") {
    const operands = expression[key];
    if (!Array.isArray(operands) || operands.length < 2) {
      errors.push(error(
        "INVALID_OPERANDS",
        path,
        `${key} requires at least two expressions.`,
      ));
      return;
    }
    operands.forEach((operand, index) => {
      validateExpression(operand, predicateStates, knownPredicates, `${path}.${key}[${index}]`, errors);
    });
    return;
  }

  if (key === "not") {
    validateExpression(expression.not, predicateStates, knownPredicates, `${path}.not`, errors);
    return;
  }

  const operator = expression[key];
  const rightKey = key === "alternative_if" ? "alternative" : "blocker";
  const errorCode = key === "alternative_if" ? "INVALID_ALTERNATIVE_IF" : "INVALID_VETO_IF";
  if (
    !operator ||
    typeof operator !== "object" ||
    Array.isArray(operator) ||
    Object.keys(operator).length !== 2 ||
    !own(operator, "condition") ||
    !own(operator, rightKey)
  ) {
    errors.push(error(
      errorCode,
      path,
      `${key} requires exactly one condition and one ${rightKey} expression.`,
    ));
    return;
  }
  validateExpression(
    operator.condition,
    predicateStates,
    knownPredicates,
    `${path}.${key}.condition`,
    errors,
  );
  validateExpression(
    operator[rightKey],
    predicateStates,
    knownPredicates,
    `${path}.${key}.${rightKey}`,
    errors,
  );
}

function collectPredicateRefs(expression) {
  const key = expressionKey(expression);
  if (key === "predicate_ref") return [expression.predicate_ref];
  if (key === "all" || key === "any") return expression[key].flatMap(collectPredicateRefs);
  if (key === "not") return collectPredicateRefs(expression.not);
  if (key === "alternative_if") {
    return [
      ...collectPredicateRefs(expression.alternative_if.condition),
      ...collectPredicateRefs(expression.alternative_if.alternative),
    ];
  }
  if (key === "veto_if") {
    return [
      ...collectPredicateRefs(expression.veto_if.condition),
      ...collectPredicateRefs(expression.veto_if.blocker),
    ];
  }
  return [];
}

function leaf(expression, predicateStates, path) {
  const predicateRef = expression.predicate_ref;
  return {
    state: predicateStates[predicateRef],
    trace: [{ predicate_ref: predicateRef, state: predicateStates[predicateRef], path }],
    decisive: [predicateRef],
    skipped: [],
  };
}

function sequence(expression, predicateStates, path, kind) {
  const operands = expression[kind];
  const decisiveState = kind === "all" ? "false" : "true";
  const identityState = kind === "all" ? "true" : "false";
  let state = identityState;
  let trace = [];
  let skipped = [];
  const children = [];

  for (let index = 0; index < operands.length; index += 1) {
    const child = evaluateValidExpression(
      operands[index],
      predicateStates,
      `${path}.${kind}[${index}]`,
    );
    children.push(child);
    trace = trace.concat(child.trace);
    skipped = skipped.concat(child.skipped);
    state = TRUTH_TABLES[kind][state][child.state];

    if (child.state === decisiveState) {
      for (const remainder of operands.slice(index + 1)) {
        skipped.push(...collectPredicateRefs(remainder));
      }
      return {
        state: decisiveState,
        trace,
        decisive: child.decisive,
        skipped: unique(skipped),
      };
    }
  }

  const decisive = state === identityState
    ? children.flatMap((child) => child.decisive)
    : children
      .filter((child) => child.state !== "true" && child.state !== "false")
      .flatMap((child) => child.decisive);

  return { state, trace, decisive: unique(decisive), skipped: unique(skipped) };
}

function evaluateAlternativeIf(expression, predicateStates, path) {
  const conditionExpression = expression.alternative_if.condition;
  const alternativeExpression = expression.alternative_if.alternative;
  const condition = evaluateValidExpression(
    conditionExpression,
    predicateStates,
    `${path}.alternative_if.condition`,
  );

  if (condition.state === "true") {
    return {
      state: "true",
      trace: condition.trace,
      decisive: condition.decisive,
      skipped: unique([
        ...condition.skipped,
        ...collectPredicateRefs(alternativeExpression),
      ]),
    };
  }

  const alternative = evaluateValidExpression(
    alternativeExpression,
    predicateStates,
    `${path}.alternative_if.alternative`,
  );
  const state = TRUTH_TABLES.alternative_if[condition.state][alternative.state];
  let decisive;

  if (alternative.state === "true") {
    decisive = alternative.decisive;
  } else if (state === "false") {
    decisive = [...condition.decisive, ...alternative.decisive];
  } else {
    decisive = [condition, alternative]
      .filter((child) => child.state !== "true" && child.state !== "false")
      .flatMap((child) => child.decisive);
  }

  return {
    state,
    trace: [...condition.trace, ...alternative.trace],
    decisive: unique(decisive),
    skipped: unique([...condition.skipped, ...alternative.skipped]),
  };
}

function evaluateVetoIf(expression, predicateStates, path) {
  const blockerExpression = expression.veto_if.blocker;
  const conditionExpression = expression.veto_if.condition;
  const blocker = evaluateValidExpression(
    blockerExpression,
    predicateStates,
    `${path}.veto_if.blocker`,
  );

  if (blocker.state === "true") {
    return {
      state: "false",
      trace: blocker.trace,
      decisive: blocker.decisive,
      skipped: unique([
        ...blocker.skipped,
        ...collectPredicateRefs(conditionExpression),
      ]),
    };
  }

  const condition = evaluateValidExpression(
    conditionExpression,
    predicateStates,
    `${path}.veto_if.condition`,
  );
  const state = TRUTH_TABLES.veto_if[condition.state][blocker.state];
  let decisive;

  if (condition.state === "false") {
    decisive = condition.decisive;
  } else if (state === "true") {
    decisive = [...blocker.decisive, ...condition.decisive];
  } else {
    decisive = [blocker, condition]
      .filter((child) => child.state !== "true" && child.state !== "false")
      .flatMap((child) => child.decisive);
  }

  return {
    state,
    trace: [...blocker.trace, ...condition.trace],
    decisive: unique(decisive),
    skipped: unique([...blocker.skipped, ...condition.skipped]),
  };
}

function evaluateValidExpression(expression, predicateStates, path) {
  const key = expressionKey(expression);
  if (key === "predicate_ref") return leaf(expression, predicateStates, path);
  if (key === "all" || key === "any") {
    return sequence(expression, predicateStates, path, key);
  }
  if (key === "not") {
    const child = evaluateValidExpression(expression.not, predicateStates, `${path}.not`);
    return { ...child, state: TRUTH_TABLES.not[child.state] };
  }
  if (key === "alternative_if") {
    return evaluateAlternativeIf(expression, predicateStates, path);
  }
  return evaluateVetoIf(expression, predicateStates, path);
}

function publicResult(result, errors = []) {
  const uncertainPredicates = unique(
    result.trace
      .filter((entry) => entry.state !== "true" && entry.state !== "false")
      .map((entry) => entry.predicate_ref),
  );
  return {
    state: result.state,
    trace: result.trace,
    decisive_predicates: unique(result.decisive),
    uncertain_predicates: uncertainPredicates,
    skipped_predicates: unique(result.skipped),
    errors,
  };
}

function errorResult(errors) {
  return {
    state: null,
    trace: [],
    decisive_predicates: [],
    uncertain_predicates: [],
    skipped_predicates: [],
    errors,
  };
}

/**
 * Evaluate one expression from already-resolved predicate states.
 *
 * `known_predicates` is optional for standalone expressions. Gate evaluation
 * supplies it from the contract so an undeclared reference cannot be mistaken
 * for missing evidence.
 */
export function evaluateExpression(expression, predicateStates, options = {}) {
  const statesByPredicate = predicateStates && typeof predicateStates === "object"
    ? predicateStates
    : {};
  const knownPredicates = options.known_predicates
    ? new Set(options.known_predicates)
    : null;
  const errors = [];
  validateExpression(expression, statesByPredicate, knownPredicates, "$", errors);
  if (errors.length) return errorResult(errors);
  return publicResult(evaluateValidExpression(expression, statesByPredicate, "$"));
}

const HARD_SAFEGUARD_PRIORITY = Object.freeze(["reverse", "pause"]);
const isUnresolvedState = (state) => state !== "true" && state !== "false";
const CANDIDATE_PHASE_PRIORITY = Object.freeze(["act", "prepare", "watch"]);
const CONCURRENT_DUTY_ORDER = Object.freeze(["watch", "recover"]);
const LIFECYCLES = new Set([
  "inactive",
  "watching",
  "preparing",
  "active",
  "paused",
  "reversing",
  "recovering",
  "graduated",
]);
const RECORD_TRUST_STATES = new Set(["unverified-external"]);
const OWNER_EVENT_TRANSITIONS = new Set([
  "watch:inactive:watching",
  "prepare:inactive:preparing",
  "prepare:watching:preparing",
  "activate:inactive:active",
  "activate:watching:active",
  "activate:preparing:active",
  "resume:paused:active",
  "pause:preparing:paused",
  "pause:active:paused",
  "pause:recovering:paused",
  "reverse:preparing:reversing",
  "reverse:active:reversing",
  "reverse:paused:reversing",
  "reverse:recovering:reversing",
  "begin-recovery:inactive:recovering",
  "begin-recovery:watching:recovering",
  "begin-recovery:preparing:recovering",
  "begin-recovery:active:recovering",
  "begin-recovery:paused:recovering",
  "recovery-exit:recovering:active",
  "recovery-exit:recovering:graduated",
  "graduate:active:graduated",
  "graduate:paused:graduated",
]);

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function recordChecksum(record) {
  return `sha256:${createHash("sha256").update(canonicalise(record)).digest("hex")}`;
}

function priorStateReference(priorState) {
  return {
    id: priorState.id,
    version: priorState.schema_version,
    checksum: recordChecksum(priorState),
    lifecycle: priorState.lifecycle,
    trust_state: priorState.trust_state,
  };
}

function actionReference(action) {
  return {
    id: action.id,
    version: action.action_version,
    checksum: recordChecksum(action),
  };
}

function evaluationRunReference(run) {
  return {
    id: run.id,
    version: run.schema_version,
    checksum: recordChecksum(run),
  };
}

function strictInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value || "")) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validArtifactReference(reference, versionPattern = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/) {
  return reference &&
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(reference.id || "") &&
    versionPattern.test(reference.version || "") &&
    /^sha256:[a-f0-9]{64}$/.test(reference.checksum || "");
}

function ownerEventReference(ownerEvent) {
  return {
    id: ownerEvent.id,
    version: ownerEvent.schema_version,
    checksum: recordChecksum(ownerEvent),
  };
}

function validOwnerEventForAction(action, ownerEvent) {
  const ownerEventTime = strictInstant(ownerEvent?.recorded_at);
  const actionValidFrom = strictInstant(action.valid_from);
  const actionExpiresAt = strictInstant(action.expires_at);
  const fundingValidThrough = strictInstant(action.funding?.valid_through);
  const approvalTimes = (action.approved_by || []).map(({ approved_at: approvedAt }) =>
    strictInstant(approvedAt));
  return ownerEvent &&
    /^1\.0\.[0-9]+$/.test(ownerEvent.schema_version || "") &&
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(ownerEvent.id || "") &&
    isDeepStrictEqual(ownerEvent.action_ref, actionReference(action)) &&
    validArtifactReference(ownerEvent.transition_proposal_ref, /^1\.0\.[0-9]+$/) &&
    validArtifactReference(ownerEvent.evaluation_run_ref, /^3\.0\.[0-9]+$/) &&
    validArtifactReference(ownerEvent.prior_state_ref, /^1\.0\.[0-9]+$/) &&
    OWNER_EVENT_TRANSITIONS.has(
      `${ownerEvent.event_type}:${ownerEvent.from_lifecycle}:${ownerEvent.to_lifecycle}`,
    ) &&
    ownerEvent.prior_state_ref.lifecycle === ownerEvent.from_lifecycle &&
    ownerEvent.prior_state_ref.trust_state === "unverified-external" &&
    ownerEvent.trust_state === "unverified-external" &&
    (!action.owner || isDeepStrictEqual(ownerEvent.owner, action.owner)) &&
    ownerEventTime !== null &&
    (action.valid_from === undefined || (actionValidFrom !== null && ownerEventTime >= actionValidFrom)) &&
    (action.expires_at === undefined || (actionExpiresAt !== null && ownerEventTime <= actionExpiresAt)) &&
    (action.funding?.valid_through === undefined || (
      fundingValidThrough !== null && ownerEventTime <= fundingValidThrough
    )) &&
    approvalTimes.every((approvedAt) => approvedAt !== null && ownerEventTime >= approvedAt);
}

function hasValidStateLineage(priorState, action) {
  if (priorState.lifecycle === "inactive") {
    return isDeepStrictEqual(priorState.lineage, { kind: "initial-assertion" });
  }
  const lineage = priorState.lineage;
  const ownerEvent = lineage?.owner_event;
  const ownerEventRef = ownerEvent && ownerEventReference(ownerEvent);
  return lineage?.kind === "owner-transition-event" &&
    validArtifactReference(lineage.owner_event_ref, /^1\.0\.[0-9]+$/) &&
    validOwnerEventForAction(action, ownerEvent) &&
    isDeepStrictEqual(lineage.owner_event_ref, ownerEventRef) &&
    priorState.id === `action-state.${action.id}.${ownerEvent.to_lifecycle}.${ownerEventRef.checksum
      .slice("sha256:".length)}` &&
    ownerEvent.to_lifecycle === priorState.lifecycle &&
    ownerEvent.recorded_at === priorState.recorded_at &&
    ownerEvent.trust_state === priorState.trust_state &&
    isDeepStrictEqual(ownerEvent.provenance, priorState.provenance);
}

function validatePriorState(priorState, action, run, generatedAt) {
  if (
    !priorState ||
    !/^1\.0\.[0-9]+$/.test(priorState.schema_version || "") ||
    typeof priorState.id !== "string" ||
    priorState.lifecycle_vocabulary !== "action-transition-lifecycle/1.0.0" ||
    !LIFECYCLES.has(priorState.lifecycle) ||
    !RECORD_TRUST_STATES.has(priorState.trust_state) ||
    !isDeepStrictEqual(priorState.action_ref, actionReference(action)) ||
    !hasValidStateLineage(priorState, action)
  ) {
    throw new TypeError("A valid action-bound lifecycle-state record is required.");
  }
  const stateAt = strictInstant(priorState.recorded_at);
  const evaluatedAt = strictInstant(run?.evaluated_at);
  const proposalAt = strictInstant(generatedAt);
  if (stateAt === null || evaluatedAt === null || stateAt > evaluatedAt) {
    throw new TypeError("The prior state must not be recorded after the evaluation.");
  }
  if (proposalAt === null || proposalAt < evaluatedAt) {
    throw new TypeError("The transition proposal must not predate its evaluation.");
  }
}

function validatedResolution(evaluation) {
  if (
    !evaluation ||
    typeof evaluation !== "object" ||
    !Array.isArray(evaluation.errors) ||
    evaluation.errors.length > 0 ||
    !GATES.every((gate) => GATE_TRUTH_STATES.includes(evaluation.gates?.[gate]?.state))
  ) {
    throw new TypeError("A complete, error-free seven-gate evaluation is required.");
  }
  const recomputed = resolveCondition(evaluation);
  if (!isDeepStrictEqual(evaluation.condition_resolution, recomputed)) {
    throw new TypeError("The recorded condition resolution does not match gate recomputation.");
  }
  return recomputed;
}

function validateEvaluationRunBasis(evaluation, resolution, run) {
  if (
    !run ||
    !/^3\.0\.[0-9]+$/.test(run.schema_version || "") ||
    run.run_status !== "completed" ||
    !isDeepStrictEqual(run.gate_results, evaluation.gates) ||
    !isDeepStrictEqual(run.condition_resolution, resolution)
  ) {
    throw new TypeError("The evaluation and completed evaluation run do not match exactly.");
  }
}

/**
 * Resolve gate truth into orthogonal, non-authorising condition outputs.
 * This records safety precedence and conditional eligibility only. It neither
 * grants authority nor changes an action lifecycle.
 */
export function resolveCondition(evaluation) {
  const gates = evaluation?.gates || evaluation || {};
  const gateState = (gate) => gates?.[gate]?.state ?? null;
  const trueGates = GATES.filter((gate) => gateState(gate) === "true");
  const trueSafeguards = HARD_SAFEGUARD_PRIORITY.filter(
    (gate) => gateState(gate) === "true",
  );
  const unresolvedHardSafeguards = HARD_SAFEGUARD_PRIORITY.filter(
    (gate) => isUnresolvedState(gateState(gate)),
  );

  const safetyControl = gateState("reverse") === "true"
    ? "reverse"
    : gateState("pause") === "true"
      ? "pause"
      : unresolvedHardSafeguards.length > 0
        ? "precautionary_hold"
        : "none";
  const candidatePhase = CANDIDATE_PHASE_PRIORITY.find(
    (gate) => gateState(gate) === "true",
  ) || "idle";
  const concurrentDuties = CONCURRENT_DUTY_ORDER.filter(
    (gate) => gateState(gate) === "true",
  );
  const exitCandidate = gateState("graduate") === "true" ? "graduate" : "none";
  const transitionConflicts = [];
  if (gateState("act") === "true" && gateState("graduate") === "true") {
    transitionConflicts.push("act_and_graduate");
  }
  if (gateState("recover") === "true" && gateState("graduate") === "true") {
    transitionConflicts.push("recover_and_graduate");
  }
  const actAndGraduate = transitionConflicts.includes("act_and_graduate");
  const recoverAndGraduate = transitionConflicts.includes("recover_and_graduate");
  const blockingGates = safetyControl === "reverse"
    ? [...trueSafeguards, ...unresolvedHardSafeguards]
    : safetyControl === "pause"
      ? [...trueSafeguards, ...unresolvedHardSafeguards]
      : safetyControl === "precautionary_hold"
        ? unresolvedHardSafeguards
        : [];

  return {
    input_state_axis: "gate_truth",
    safety_control: safetyControl,
    candidate_phase: candidatePhase,
    concurrent_duties: concurrentDuties,
    exit_candidate: exitCandidate,
    candidate_phase_eligible:
      safetyControl === "none" &&
      candidatePhase !== "idle" &&
      transitionConflicts.length === 0,
    concurrent_duties_eligible: {
      watch: concurrentDuties.includes("watch"),
      recover: concurrentDuties.includes("recover") && !recoverAndGraduate,
    },
    exit_candidate_eligible:
      exitCandidate === "graduate" &&
      safetyControl === "none" &&
      !actAndGraduate &&
      !recoverAndGraduate,
    true_gates: trueGates,
    blocking_gates: blockingGates,
    unresolved_hard_safeguards: unresolvedHardSafeguards,
    transition_conflicts: transitionConflicts,
  };
}

function transitionRecord(
  resolution,
  action,
  priorState,
  run,
  generatedAt,
  proposal,
  proposedLifecycle,
  conflicts = [],
) {
  const actionRef = actionReference(action);
  const evaluationRunRef = evaluationRunReference(run);
  const priorStateRef = priorStateReference(priorState);
  const identityDigest = recordChecksum({
    action_ref: actionRef,
    evaluation_run_ref: evaluationRunRef,
    prior_state_ref: priorStateRef,
    generated_at: generatedAt,
  }).slice("sha256:".length);
  return {
    schema_version: "1.0.0",
    id: `transition-proposal.${action.id}.${generatedAt
      .toLowerCase().replaceAll(/[^a-z0-9]+/g, "")}.${identityDigest}`,
    action_ref: actionRef,
    evaluation_run_ref: evaluationRunRef,
    prior_state_ref: priorStateRef,
    generated_at: generatedAt,
    proposal,
    basis_gate_state: run.gate_results[action.gate].state,
    proposed_lifecycle: proposedLifecycle,
    authority_effect: "none",
    automatic_transition: false,
    automatic_support_withdrawal: false,
    concurrent_duties: [...resolution.concurrent_duties],
    transition_conflicts: [...resolution.transition_conflicts, ...conflicts],
  };
}

/**
 * Derive the state created by one externally asserted owner event. The state
 * remains unverified-external and cannot make the event authoritative.
 */
export function deriveResultingLifecycleState(action, ownerEvent) {
  if (
    !validOwnerEventForAction(action, ownerEvent) ||
    !LIFECYCLES.has(ownerEvent.to_lifecycle)
  ) {
    throw new TypeError("A valid action-bound owner event is required to derive lifecycle state.");
  }
  const eventRef = ownerEventReference(ownerEvent);
  const identityDigest = eventRef.checksum.slice("sha256:".length);
  return {
    schema_version: "1.0.0",
    id: `action-state.${action.id}.${ownerEvent.to_lifecycle}.${identityDigest}`,
    action_ref: actionReference(action),
    lifecycle_vocabulary: "action-transition-lifecycle/1.0.0",
    lifecycle: ownerEvent.to_lifecycle,
    recorded_at: ownerEvent.recorded_at,
    lineage: {
      kind: "owner-transition-event",
      owner_event_ref: eventRef,
      owner_event: structuredClone(ownerEvent),
    },
    trust_state: "unverified-external",
    provenance: structuredClone(ownerEvent.provenance),
  };
}

/**
 * Propose, but never perform or authorise, a lifecycle transition.
 * Prior lifecycle prevents a fresh gate evaluation from silently reactivating
 * a reversed or graduated option, or withdrawing an already active support.
 */
export function proposeTransition(evaluation, action, priorState, run, generatedAt) {
  validatePriorState(priorState, action, run, generatedAt);
  const priorLifecycle = priorState.lifecycle;
  const resolution = validatedResolution(evaluation);
  validateEvaluationRunBasis(evaluation, resolution, run);
  const record = (proposal, proposedLifecycle, conflicts = []) => transitionRecord(
    resolution,
    action,
    priorState,
    run,
    generatedAt,
    proposal,
    proposedLifecycle,
    conflicts,
  );

  if (priorLifecycle === "graduated") {
    return record("hold_for_new_contract", priorLifecycle);
  }

  if (resolution.safety_control === "reverse") {
    if (priorLifecycle === "reversing") {
      return record("continue_reversal", "reversing");
    }
    if (["preparing", "active", "paused", "recovering"].includes(priorLifecycle)) {
      return record("consider_reversal", "reversing");
    }
    return record("hold", priorLifecycle);
  }

  if (priorLifecycle === "reversing") {
    return record("hold_for_new_contract", "reversing");
  }

  if (["pause", "precautionary_hold"].includes(resolution.safety_control)) {
    if (["preparing", "active", "recovering"].includes(priorLifecycle)) {
      const proposal = resolution.safety_control === "pause"
        ? "consider_pause"
        : "consider_precautionary_pause";
      return record(proposal, "paused");
    }
    return record("hold", priorLifecycle);
  }

  if (resolution.transition_conflicts.length > 0) {
    return record("hold_for_review", priorLifecycle);
  }

  if (priorLifecycle === "recovering") {
    if (
      resolution.concurrent_duties.includes("recover") &&
      resolution.concurrent_duties_eligible.recover
    ) {
      return record("continue_recovery", "recovering");
    }
    if (resolution.exit_candidate === "graduate" && resolution.exit_candidate_eligible) {
      return record("consider_recovery_exit", "graduated");
    }
    if (
      action.gate === "act" &&
      resolution.candidate_phase === "act" &&
      resolution.candidate_phase_eligible
    ) {
      return record("consider_recovery_exit", "active");
    }
    return record("await_recovery_evidence", "recovering");
  }

  if (resolution.exit_candidate === "graduate" && resolution.exit_candidate_eligible) {
    if (["active", "paused", "recovering"].includes(priorLifecycle)) {
      return record("consider_graduation", "graduated");
    }
    return record("hold_for_review", priorLifecycle, ["graduate_without_existing_action"]);
  }

  if (
    resolution.concurrent_duties.includes("recover") &&
    resolution.concurrent_duties_eligible.recover
  ) {
    if (priorLifecycle === "active") {
      return record("continue_with_recovery", "active");
    }
    return record("consider_recovery", "recovering");
  }

  if (
    action.gate === "act" &&
    resolution.candidate_phase === "act" &&
    resolution.candidate_phase_eligible
  ) {
    if (priorLifecycle === "paused") {
      return record("consider_resume", "active");
    }
    if (["inactive", "watching", "preparing"].includes(priorLifecycle)) {
      return record("consider_activation", "active");
    }
    return record("continue_active", "active");
  }

  if (
    action.gate === "prepare" &&
    evaluation.gates.prepare.state === "true" &&
    resolution.safety_control === "none" &&
    resolution.transition_conflicts.length === 0
  ) {
    if (["inactive", "watching"].includes(priorLifecycle)) {
      return record("consider_preparation", "preparing");
    }
    if (priorLifecycle === "preparing") {
      return record("continue_preparation", "preparing");
    }
  }

  if (priorLifecycle === "active") {
    return record("continue_active", "active");
  }
  if (priorLifecycle === "paused") {
    return record("hold", "paused");
  }
  if (priorLifecycle === "preparing") {
    return record("hold", "preparing");
  }
  if (
    action.gate === "watch" &&
    resolution.concurrent_duties_eligible.watch
  ) {
    if (priorLifecycle === "watching") {
      return record("continue_watching", "watching");
    }
    return record("consider_watching", "watching");
  }
  return record("hold", priorLifecycle);
}

/** Evaluate every required lifecycle gate independently. */
export function evaluateGates(contract, predicateStates) {
  const gates = {};
  const errors = [];
  const predicates = contract && contract.predicates && typeof contract.predicates === "object"
    ? Object.keys(contract.predicates)
    : [];
  const expressions = contract && contract.gates && typeof contract.gates === "object"
    ? contract.gates
    : {};

  for (const gate of GATES) {
    if (!own(expressions, gate)) {
      const gateErrors = [error("MISSING_GATE", `$.gates.${gate}`, `Required gate ${gate} is missing.`)];
      gates[gate] = errorResult(gateErrors);
      errors.push(...gateErrors.map((entry) => ({ ...entry, gate })));
      continue;
    }
    const result = evaluateExpression(expressions[gate], predicateStates, {
      known_predicates: predicates,
    });
    gates[gate] = result;
    errors.push(...result.errors.map((entry) => ({ ...entry, gate })));
  }

  return {
    gates,
    condition_resolution: resolveCondition({ gates, errors }),
    errors,
  };
}
