/**
 * Pure evaluator for condition-contract expressions.
 *
 * It accepts already-resolved predicate states. Fetching data, comparing values
 * with thresholds and deciding whether evidence is stale belong to a separate
 * layer. This module only combines those states without erasing uncertainty.
 */

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

/**
 * Resolve whether a newly active action is safe from complete gate-truth output.
 * Recovery and graduation remain visible in eligible_gates but cannot override
 * a hard reverse or pause safeguard.
 */
export function resolveAction(evaluation) {
  const gates = evaluation?.gates || evaluation || {};
  const gateState = (gate) => gates?.[gate]?.state ?? null;
  const eligibleGates = GATES.filter((gate) => gateState(gate) === "true");
  const trueSafeguards = HARD_SAFEGUARD_PRIORITY.filter(
    (gate) => gateState(gate) === "true",
  );
  const unresolvedHardSafeguards = HARD_SAFEGUARD_PRIORITY.filter(
    (gate) => isUnresolvedState(gateState(gate)),
  );

  if (trueSafeguards.length > 0) {
    return {
      input_state_axis: "gate_truth",
      decision: trueSafeguards[0],
      activation_allowed: false,
      eligible_gates: eligibleGates,
      blocking_gates: [...trueSafeguards, ...unresolvedHardSafeguards],
      unresolved_hard_safeguards: unresolvedHardSafeguards,
    };
  }

  if (unresolvedHardSafeguards.length > 0) {
    return {
      input_state_axis: "gate_truth",
      decision: "no_action",
      activation_allowed: false,
      eligible_gates: eligibleGates,
      blocking_gates: unresolvedHardSafeguards,
      unresolved_hard_safeguards: unresolvedHardSafeguards,
    };
  }

  if (gateState("act") === "true") {
    return {
      input_state_axis: "gate_truth",
      decision: "act",
      activation_allowed: true,
      eligible_gates: eligibleGates,
      blocking_gates: [],
      unresolved_hard_safeguards: [],
    };
  }

  const actUnresolved = isUnresolvedState(gateState("act"));
  return {
    input_state_axis: "gate_truth",
    decision: "no_action",
    activation_allowed: false,
    eligible_gates: eligibleGates,
    blocking_gates: actUnresolved ? ["act"] : [],
    unresolved_hard_safeguards: [],
  };
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
    action_resolution: resolveAction({ gates, errors }),
    errors,
  };
}
