import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const actionSchema = JSON.parse(readFileSync(
  new URL("../schema/preparation-action.schema.json", import.meta.url),
  "utf8",
));
const registerSchema = JSON.parse(readFileSync(
  new URL("../schema/preparation-register.schema.json", import.meta.url),
  "utf8",
));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(actionSchema);
const validateSchema = ajv.compile(registerSchema);

const EMERGENCY_MAX_MS = 7 * 24 * 60 * 60 * 1000;
const RETROSPECTIVE_MAX_MS = 30 * 24 * 60 * 60 * 1000;
const EMERGENCY_VERBS = new Set(["pause", "protect", "provide"]);
const QUALITY_RANK = Object.freeze({ exploratory: 0, provisional: 1, validated: 2 });
const TRUST_RANK = Object.freeze({ unverified: 0, "source-authenticated": 1, "independently-reproduced": 2 });
const CONFIDENCE_BY_RANK = Object.freeze(["low", "medium", "high"]);
const DURATION_MS = Object.freeze({
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  quarter: 91 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
});
const REQUIRED_START_GATES = Object.freeze({
  reversible: ["if-true", "resources-ready"],
  "partially-reversible": ["if-true", "resources-ready", "dependencies-committed", "affected-parties-cleared"],
  irreversible: ["if-true", "authority-verified", "resources-ready", "dependencies-committed", "affected-parties-cleared"],
  "emergency-containment": ["if-true", "authority-verified", "resources-ready", "dependencies-committed", "affected-parties-cleared", "alternative-route-ready"],
});
const REQUIRED_EMERGENCY_STOP_GATES = ["threat-ended", "safeguard-failed", "resources-failed", "sunset-reached"];

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function checksumJson(value) {
  return `sha256:${createHash("sha256").update(Buffer.from(canonicalise(value))).digest("hex")}`;
}

export function renderActionSentence(action, plainLanguageIf) {
  const scope = [
    `jurisdictions: ${action.scope.jurisdictions.join(", ")}`,
    `geographies: ${action.scope.geographies.join(", ")}`,
    `cohorts: ${action.scope.cohorts.join(", ")}`,
    `services: ${action.scope.services.join(", ")}`,
    `affected parties: ${action.scope.affected_party_ids.join(", ")}`,
  ].join("; ");
  return `Proposal: ${action.verb} ${action.object.description} within ${scope} IF ${plainLanguageIf}. This record does not authorise action.`;
}

function stripTerminalPunctuation(value) {
  return value.replace(/[.!?]+$/u, "");
}

function renderIfLogic(logic, clauseById) {
  if (logic.clause_ref) {
    const statement = clauseById.get(logic.clause_ref) ?? `[unknown clause ${logic.clause_ref}]`;
    return stripTerminalPunctuation(statement);
  }
  if (logic.all) {
    return `(${logic.all.map((child) => renderIfLogic(child, clauseById)).join(" AND ")})`;
  }
  if (logic.any) {
    return `(${logic.any.map((child) => renderIfLogic(child, clauseById)).join(" OR ")})`;
  }
  if (logic.not) return `NOT (${renderIfLogic(logic.not, clauseById)})`;
  return `(${renderIfLogic(logic.veto_if.condition, clauseById)} AND NOT (${renderIfLogic(logic.veto_if.blocker, clauseById)}))`;
}

export function renderIfExpression(expressionContent) {
  const clauseById = new Map(expressionContent.clauses.map((clause) =>
    [clause.clause_id, clause.statement]));
  return renderIfLogic(expressionContent.logic, clauseById);
}

function problem(code, path, message) {
  return { code, path, message };
}

function keyOf(value) {
  return `${value.id}@${value.version}`;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function sameValue(left, right) {
  return canonicalise(left) === canonicalise(right);
}

function isSubset(values, allowed) {
  const allowedSet = new Set(allowed);
  return values.every((value) => allowedSet.has(value));
}

function comparisonPasses(operator, value, threshold) {
  if (operator === "gt" || operator === "change_gt") return value > threshold;
  if (operator === "gte" || operator === "change_gte") return value >= threshold;
  if (operator === "lt" || operator === "change_lt") return value < threshold;
  if (operator === "lte" || operator === "change_lte") return value <= threshold;
  if (operator === "eq") return value === threshold;
  return false;
}

function windowStartAt(evaluatedAt, window) {
  const instant = new Date(evaluatedAt);
  if (window.unit === "month") instant.setUTCMonth(instant.getUTCMonth() - window.value);
  else if (window.unit === "quarter") instant.setUTCMonth(instant.getUTCMonth() - 3 * window.value);
  else if (window.unit === "year") instant.setUTCFullYear(instant.getUTCFullYear() - window.value);
  else instant.setTime(evaluatedAt - window.value * DURATION_MS[window.unit]);
  return instant.getTime();
}

function computeClauseResult(
  clause,
  evidenceRefs,
  evidenceById,
  evidenceScopes,
  evaluatedAt,
  errors,
  path,
) {
  const candidates = evidenceRefs.flatMap((evidenceId) => {
    const source = evidenceById.get(evidenceId);
    if (!source) return [];
    return source.observations
      .filter(({ measure, unit }) => measure === clause.measure && unit === clause.threshold.unit)
      .map((observation) => ({ ...observation, evidenceId }));
  });
  const observations = candidates.filter((observation) =>
    evidenceScopes.some((scope) => sameValue(scope, observation.evidence_scope)));
  if (candidates.length !== observations.length) {
    errors.push(problem("OBSERVATION_SCOPE_MISMATCH", path,
      `${clause.clause_id} has a matching measure outside the expression and evaluation evidence scope.`));
  }
  const windowStart = windowStartAt(evaluatedAt, clause.window);
  const current = observations.filter((observation) => {
    const observedAt = Date.parse(observation.observed_at);
    return observedAt <= evaluatedAt
      && observedAt >= windowStart
      && Date.parse(observation.valid_until) > evaluatedAt;
  });
  const future = observations.some(({ observed_at: observedAt }) => Date.parse(observedAt) > evaluatedAt);
  if (future) {
    errors.push(problem("FUTURE_CLAUSE_EVIDENCE", path,
      `${clause.clause_id} references an observation made after evaluation.`));
  }
  const stale = observations.length > 0 && current.length < observations.length;
  if (current.length < clause.window.minimum_observations) {
    return {
      result: "unknown",
      stale,
      insufficient: true,
      contributingEvidenceIds: [...new Set(current.map(({ evidenceId }) => evidenceId))],
    };
  }
  let values;
  let contributingObservations;
  if (clause.operator.startsWith("change_")) {
    const ordered = [...current].sort((left, right) =>
      Date.parse(left.observed_at) - Date.parse(right.observed_at));
    values = [ordered.at(-1).value - ordered[0].value];
    contributingObservations = ordered.length === 1
      ? [ordered[0]]
      : [ordered[0], ordered.at(-1)];
  } else {
    values = current.map(({ value }) => value);
    contributingObservations = current;
  }
  const comparisons = values.map((value) => comparisonPasses(
    clause.operator,
    value,
    clause.threshold.value,
  ));
  const contributingEvidenceIds = [...new Set(
    contributingObservations.map(({ evidenceId }) => evidenceId),
  )];
  if (comparisons.every(Boolean)) {
    return { result: "true", stale, insufficient: false, contributingEvidenceIds };
  }
  if (comparisons.every((value) => !value)) {
    return { result: "false", stale, insufficient: false, contributingEvidenceIds };
  }
  return { result: "conflicted", stale, insufficient: false, contributingEvidenceIds };
}

function expectedComparatorHeadline(comparator) {
  const preferences = comparator.expected_outcomes.map((outcome) => {
    if (outcome.direction === "higher-is-better") {
      if (outcome.with_action.lower > outcome.without_action.upper) return 1;
      if (outcome.without_action.lower > outcome.with_action.upper) return -1;
      return 0;
    }
    if (outcome.with_action.upper < outcome.without_action.lower) return 1;
    if (outcome.without_action.upper < outcome.with_action.lower) return -1;
    return 0;
  });
  const dimensions = new Map(comparator.harm_taxonomy.dimensions.map((dimension) =>
    [dimension.dimension_id, dimension]));
  const inactionByPartyDimension = new Map(comparator.inaction_harms.map((harm) =>
    [`${harm.party_id}|${harm.dimension_id}`, harm]));
  for (const actionHarm of comparator.action_harms) {
    const actionScore = actionHarm.severity_weight * actionHarm.likelihood;
    const dimension = dimensions.get(actionHarm.dimension_id);
    if (dimension?.non_compensable && actionScore >= dimension.action_veto_threshold) {
      return "action-blocked-by-harm-veto";
    }
    const inactionHarm = inactionByPartyDimension.get(
      `${actionHarm.party_id}|${actionHarm.dimension_id}`,
    );
    if (!inactionHarm) continue;
    const inactionScore = inactionHarm.severity_weight * inactionHarm.likelihood;
    preferences.push(Math.sign(inactionScore - actionScore));
  }
  if (preferences.every((value) => value > 0)) return "action-appears-safer";
  if (preferences.every((value) => value < 0)) return "inaction-appears-safer";
  if (preferences.every((value) => value === 0)) return "similar";
  return "uncertain";
}

function logicReferences(logic) {
  if (logic.clause_ref) return [logic.clause_ref];
  if (logic.all) return logic.all.flatMap(logicReferences);
  if (logic.any) return logic.any.flatMap(logicReferences);
  if (logic.not) return logicReferences(logic.not);
  if (logic.veto_if) {
    return [
      ...logicReferences(logic.veto_if.condition),
      ...logicReferences(logic.veto_if.blocker),
    ];
  }
  return [];
}

function invert(result) {
  if (result === "true") return "false";
  if (result === "false") return "true";
  return result;
}

function evaluateLogic(logic, results) {
  if (logic.clause_ref) return results.get(logic.clause_ref) || "unknown";
  if (logic.not) return invert(evaluateLogic(logic.not, results));
  if (logic.veto_if) {
    const condition = evaluateLogic(logic.veto_if.condition, results);
    const blocker = evaluateLogic(logic.veto_if.blocker, results);
    if (blocker === "true") return "false";
    if (blocker === "conflicted" || condition === "conflicted") return "conflicted";
    if (blocker === "unknown" || condition === "unknown") return "unknown";
    return condition;
  }
  const operator = logic.all ? "all" : "any";
  const values = logic[operator].map((child) => evaluateLogic(child, results));
  if (operator === "all" && values.includes("false")) return "false";
  if (operator === "any" && values.includes("true")) return "true";
  if (values.includes("conflicted")) return "conflicted";
  if (values.includes("unknown")) return "unknown";
  return operator === "all" ? "true" : "false";
}

function deriveValidNecessityEvaluations(action, evidenceById, asOf, path, errors) {
  const evaluations = action.affected_party_governance.necessity_evaluations;
  const validIds = new Set();
  const duplicateIds = new Set(duplicateValues(evaluations.map(({ evaluation_id: id }) => id)));
  for (const duplicate of duplicateIds) {
    errors.push(problem("DUPLICATE_NECESSITY_EVALUATION",
      `${path}.affected_party_governance.necessity_evaluations`,
      `${duplicate} appears more than once.`));
  }

  for (const [index, evaluation] of evaluations.entries()) {
    const evaluationPath = `${path}.affected_party_governance.necessity_evaluations[${index}]`;
    let valid = !duplicateIds.has(evaluation.evaluation_id);
    const fail = (code, field, message) => {
      valid = false;
      errors.push(problem(code, `${evaluationPath}.${field}`, message));
    };
    if (!action.scope.affected_party_ids.includes(evaluation.party_id)) {
      fail("NECESSITY_PARTY_OUT_OF_SCOPE", "party_id",
        "A necessity evaluation must name a party inside the action scope.");
    }
    if (!sameValue(evaluation.scope, action.scope)) {
      fail("NECESSITY_SCOPE_MISMATCH", "scope",
        "A necessity evaluation must bind the complete action scope.");
    }
    const evidence = evidenceById.get(evaluation.evidence_ref);
    if (evidence?.role !== "evaluation" || !evidence.party_ids.includes(evaluation.party_id)) {
      fail("NECESSITY_EVIDENCE_INVALID", "evidence_ref",
        "Necessity evidence must be an evaluation source explicitly bound to the burdened party.");
    }
    const alternativeIds = evaluation.alternatives_considered
      .map(({ alternative_id: id }) => id);
    const selected = evaluation.alternatives_considered
      .filter(({ disposition }) => disposition === "selected");
    if (duplicateValues(alternativeIds).length
      || selected.length !== 1
      || selected[0].alternative_id !== evaluation.least_restrictive_alternative_id) {
      fail("NECESSITY_ALTERNATIVES_INVALID", "alternatives_considered",
        "Alternatives must be unique and exactly one selected least-restrictive route must match the declared identity.");
    }
    if (evaluation.dissent.status === "unresolved") {
      fail("NECESSITY_DISSENT_UNRESOLVED", "dissent",
        "Unresolved affected-party dissent prevents a derived necessity pass.");
    }
    const validFrom = Date.parse(evaluation.valid_from);
    const expiresAt = Date.parse(evaluation.expires_at);
    if (validFrom > asOf || expiresAt <= asOf || expiresAt <= validFrom) {
      fail("NECESSITY_WINDOW_INVALID", "expires_at",
        "A necessity evaluation must already apply and remain current at the register as_of time.");
    }
    if (evaluation.appeal_route !== action.affected_party_governance.challenge_route) {
      fail("NECESSITY_APPEAL_ROUTE_MISMATCH", "appeal_route",
        "Necessity review and affected-party governance must expose the same appeal route.");
    }
    if (action.reversibility.class === "emergency-containment") {
      const emergency = action.emergency_exception;
      if (!emergency
        || evaluation.threat !== emergency.threat
        || evaluation.reviewer_ref !== emergency.independent_reviewer.reviewer_id
        || expiresAt > Date.parse(emergency.ends_at)) {
        fail("NECESSITY_EMERGENCY_BINDING_INVALID", "reviewer_ref",
          "Emergency necessity must bind its stated threat, reviewer and containment expiry.");
      }
    }
    if (valid) validIds.add(evaluation.evaluation_id);
  }

  const referencedIds = action.affected_party_dispositions
    .map(({ necessity_evaluation_ref: ref }) => ref)
    .filter(Boolean);
  for (const evaluation of evaluations) {
    if (!referencedIds.includes(evaluation.evaluation_id)) {
      errors.push(problem("UNUSED_NECESSITY_EVALUATION",
        `${path}.affected_party_governance.necessity_evaluations`,
        `${evaluation.evaluation_id} is not bound to an affected-party disposition.`));
      validIds.delete(evaluation.evaluation_id);
    }
  }
  return validIds;
}

function schemaProblems() {
  return (validateSchema.errors || []).map((error) => problem(
    "SCHEMA_NONCONFORMANT",
    error.instancePath || "$",
    error.message || "The preparation register does not conform to its closed schema.",
  ));
}

function refProblem(errors, reference, registry, path, kind) {
  const record = registry.get(keyOf(reference));
  if (!record) {
    errors.push(problem(
      "UNRESOLVED_REFERENCE",
      path,
      `${kind} ${keyOf(reference)} is not present in this register.`,
    ));
    return null;
  }
  if (record.checksum !== reference.checksum) {
    errors.push(problem(
      "REFERENCE_CHECKSUM_MISMATCH",
      `${path}.checksum`,
      `${kind} reference checksum does not match the addressed record.`,
    ));
  }
  return record;
}

function semanticProblems(register) {
  const errors = [];
  const asOf = Date.parse(register.as_of);
  const collections = [
    ["if_expressions", register.if_expressions],
    ["if_evaluations", register.if_evaluations],
    ["evidence_bundles", register.evidence_bundles],
  ];

  for (const [name, records] of collections) {
    for (const duplicate of duplicateValues(records.map(keyOf))) {
      errors.push(problem("DUPLICATE_RECORD", `$.${name}`, `${duplicate} appears more than once.`));
    }
    records.forEach((record, index) => {
      if (record.checksum !== checksumJson(record.content)) {
        errors.push(problem(
          "CONTENT_CHECKSUM_MISMATCH",
          `$.${name}[${index}].checksum`,
          "The declared checksum does not match canonical content bytes.",
        ));
      }
    });
  }
  for (const duplicate of duplicateValues(register.actions.map((action) =>
    `${action.action_id}@${action.version}`))) {
    errors.push(problem("DUPLICATE_ACTION", "$.actions", `${duplicate} appears more than once.`));
  }
  const registerHarmIds = register.actions.flatMap((action) => [
    ...action.inaction_comparator.action_harms,
    ...action.inaction_comparator.inaction_harms,
  ]).map(({ harm_id: id }) => id);
  for (const duplicate of duplicateValues(registerHarmIds)) {
    errors.push(problem("DUPLICATE_REGISTER_HARM_ID", "$.actions",
      `${duplicate} is reused across the register; harm identities must be globally unique.`));
  }

  const expressions = new Map(register.if_expressions.map((record) => [keyOf(record), record]));
  const evaluations = new Map(register.if_evaluations.map((record) => [keyOf(record), record]));
  const bundles = new Map(register.evidence_bundles.map((record) => [keyOf(record), record]));

  register.evidence_bundles.forEach((bundle, bundleIndex) => {
    const sourceIds = bundle.content.sources.map(({ evidence_id: id }) => id);
    for (const duplicate of duplicateValues(sourceIds)) {
      errors.push(problem("DUPLICATE_EVIDENCE_SOURCE",
        `$.evidence_bundles[${bundleIndex}].content.sources`,
        `${duplicate} appears more than once in the evidence bundle.`));
    }
    const artifactChecksums = bundle.content.sources.map(({ artifact_checksum: checksum }) => checksum);
    for (const duplicate of duplicateValues(artifactChecksums)) {
      errors.push(problem("DUPLICATE_EVIDENCE_ARTIFACT",
        `$.evidence_bundles[${bundleIndex}].content.sources`,
        `${duplicate} is presented as more than one evidence source.`));
    }
    bundle.content.sources.forEach((source, sourceIndex) => {
      if (source.artifact_state === "synthetic-fixture" && source.trust_state !== "unverified") {
        errors.push(problem("SYNTHETIC_EVIDENCE_TRUST_LAUNDERING",
          `$.evidence_bundles[${bundleIndex}].content.sources[${sourceIndex}].trust_state`,
          "Synthetic fixture evidence cannot claim authenticated or reproduced trust."));
      }
    });
    const evidenceHarmIds = bundle.content.sources.flatMap(({ harm_estimates: harms }) =>
      harms.map(({ harm_id: id }) => id));
    for (const duplicate of duplicateValues(evidenceHarmIds)) {
      errors.push(problem("DUPLICATE_EVIDENCE_HARM_ID",
        `$.evidence_bundles[${bundleIndex}].content.sources`,
        `${duplicate} is reused by more than one evidence harm record.`));
    }
  });

  register.if_expressions.forEach((expression, expressionIndex) => {
    const path = `$.if_expressions[${expressionIndex}].content`;
    const clauseIds = expression.content.clauses.map(({ clause_id: id }) => id);
    for (const duplicate of duplicateValues(clauseIds)) {
      errors.push(problem(
        "DUPLICATE_IF_CLAUSE",
        `$.if_expressions[${expressionIndex}].content.clauses`,
        `${duplicate} appears more than once.`,
      ));
    }
    for (const reference of logicReferences(expression.content.logic)) {
      if (!clauseIds.includes(reference)) {
        errors.push(problem(
          "UNKNOWN_IF_CLAUSE",
          `$.if_expressions[${expressionIndex}].content.logic`,
          `${reference} is not declared by the IF expression.`,
        ));
      }
    }
    const logicClauseRefs = logicReferences(expression.content.logic);
    if (duplicateValues(logicClauseRefs).length
      || !sameValue([...logicClauseRefs].sort(), [...clauseIds].sort())) {
      errors.push(problem(
        "IF_LOGIC_CLAUSE_COVERAGE_MISMATCH",
        `${path}.logic`,
        "IF logic must reference every declared clause exactly once.",
      ));
    }
    const renderedIf = renderIfExpression(expression.content);
    if (expression.content.plain_language !== renderedIf) {
      errors.push(problem(
        "IF_PUBLIC_RENDER_MISMATCH",
        `${path}.plain_language`,
        "Public IF language must be the deterministic rendering of the complete typed logic.",
      ));
    }
    const scopeIdentities = expression.content.scope.evidence_scopes.map(canonicalise);
    if (duplicateValues(scopeIdentities).length) {
      errors.push(problem("DUPLICATE_EVIDENCE_SCOPE", `${path}.scope.evidence_scopes`,
        "Each evidence scope must have one unique semantic identity."));
    }
    for (const evidenceScope of expression.content.scope.evidence_scopes) {
      if (!expression.content.scope.cohorts.includes(evidenceScope.population)
        || !expression.content.scope.geographies.includes(evidenceScope.geography)) {
        errors.push(problem("EVIDENCE_SCOPE_OUTSIDE_EXPRESSION", `${path}.scope.evidence_scopes`,
          "Evidence populations and geographies must be explicit members of the public expression scope."));
      }
    }
    const binding = expression.content.condition_binding;
    if (binding.verification_state === "external-unverified" && binding.verified_at !== null) {
      errors.push(problem("CONDITION_LEDGER_VERIFICATION_INCOHERENT",
        `$.if_expressions[${expressionIndex}].content.condition_binding.verified_at`,
        "An externally unverified ledger binding cannot carry a verification time."));
    }
    if (binding.verification_state === "locally-verified-complete"
      && binding.verified_at === null) {
      errors.push(problem("CONDITION_LEDGER_VERIFICATION_INCOHERENT",
        `$.if_expressions[${expressionIndex}].content.condition_binding.verified_at`,
        "A locally verified complete ledger binding needs a verification time."));
    }
  });

  register.if_evaluations.forEach((evaluation, evaluationIndex) => {
    const path = `$.if_evaluations[${evaluationIndex}].content`;
    const expression = refProblem(
      errors,
      evaluation.content.expression_ref,
      expressions,
      `${path}.expression_ref`,
      "IF expression",
    );
    const bundle = refProblem(
      errors,
      evaluation.content.evidence_bundle_ref,
      bundles,
      `${path}.evidence_bundle_ref`,
      "evidence bundle",
    );
    if (!expression || !bundle) return;

    if (!sameValue(evaluation.content.scope, expression.content.scope)) {
      errors.push(problem("EVALUATION_SCOPE_MISMATCH", `${path}.scope`,
        "Evaluation scope must exactly equal the IF expression scope."));
    }
    const evaluatedAt = Date.parse(evaluation.content.evaluated_at);
    const validUntil = Date.parse(evaluation.content.valid_until);
    if (Date.parse(bundle.content.as_of) > evaluatedAt) {
      errors.push(problem("FUTURE_EVIDENCE_BUNDLE", `${path}.evidence_bundle_ref`,
        "The evidence bundle cannot post-date its evaluation."));
    }
    if (evaluatedAt > asOf) {
      errors.push(problem("FUTURE_EVALUATION", `${path}.evaluated_at`,
        "An evaluation cannot post-date the register as_of time."));
    }
    if (validUntil <= asOf || validUntil <= evaluatedAt) {
      errors.push(problem("STALE_IF_EVALUATION", `${path}.valid_until`,
        "An action-bound IF evaluation must remain current at register as_of."));
    }

    const clauseIds = new Set(expression.content.clauses.map(({ clause_id: id }) => id));
    const resultIds = evaluation.content.clause_results.map(({ clause_ref: ref }) => ref);
    if (duplicateValues(resultIds).length || resultIds.some((id) => !clauseIds.has(id))
      || clauseIds.size !== resultIds.length) {
      errors.push(problem("IF_RESULT_COVERAGE_MISMATCH", `${path}.clause_results`,
        "Evaluation results must cover every IF clause exactly once and no other clause."));
    }
    const evidenceIds = new Set(bundle.content.sources.map(({ evidence_id: id }) => id));
    const evidenceById = new Map(bundle.content.sources.map((source) => [source.evidence_id, source]));
    const clauseById = new Map(expression.content.clauses.map((clause) => [clause.clause_id, clause]));
    const computedClauseResults = new Map();
    for (const [resultIndex, result] of evaluation.content.clause_results.entries()) {
      for (const evidenceId of result.evidence_refs) {
        if (!evidenceIds.has(evidenceId)) {
          errors.push(problem("UNRESOLVED_EVIDENCE_REFERENCE",
            `${path}.clause_results[${resultIndex}].evidence_refs`,
            `${evidenceId} is not in the bound evidence bundle.`));
        }
      }
      const clause = clauseById.get(result.clause_ref);
      if (!clause) continue;
      if (QUALITY_RANK[bundle.content.quality] < QUALITY_RANK[clause.evidence_requirement]) {
        errors.push(problem("EVIDENCE_QUALITY_BELOW_IF_REQUIREMENT",
          `${path}.evidence_bundle_ref`,
          `${result.clause_ref} requires ${clause.evidence_requirement} evidence.`));
      }
      const computedClause = computeClauseResult(
        clause,
        result.evidence_refs,
        evidenceById,
        evaluation.content.scope.evidence_scopes,
        evaluatedAt,
        errors,
        `${path}.clause_results[${resultIndex}].evidence_refs`,
      );
      const contributingIndependenceGroups = new Set(computedClause.contributingEvidenceIds
        .map((id) => evidenceById.get(id)?.independence_group)
        .filter(Boolean));
      if (result.result !== "unknown"
        && contributingIndependenceGroups.size < clause.minimum_independent_sources) {
        errors.push(problem("IF_CONTRIBUTING_SOURCE_INDEPENDENCE_UNMET",
          `${path}.clause_results[${resultIndex}].evidence_refs`,
          `${result.clause_ref} requires matching current observations from ${clause.minimum_independent_sources} independent source groups.`));
        errors.push(problem("IF_SOURCE_INDEPENDENCE_UNMET",
          `${path}.clause_results[${resultIndex}].evidence_refs`,
          `${result.clause_ref} lacks the required independent contributing source groups.`));
      }
      computedClauseResults.set(result.clause_ref, computedClause.result);
      if (computedClause.stale && result.result !== "unknown") {
        errors.push(problem("STALE_CLAUSE_EVIDENCE",
          `${path}.clause_results[${resultIndex}].evidence_refs`,
          `${result.clause_ref} uses stale or out-of-window evidence but is not declared unknown.`));
      }
      if (computedClause.insufficient && result.result !== "unknown") {
        errors.push(problem("CLAUSE_OBSERVATIONS_INSUFFICIENT",
          `${path}.clause_results[${resultIndex}].evidence_refs`,
          `${result.clause_ref} lacks the registered minimum current observations.`));
      }
      if (computedClause.result !== result.result) {
        errors.push(problem("CLAUSE_RESULT_MISMATCH",
          `${path}.clause_results[${resultIndex}].result`,
          `Declared ${result.result} does not match typed-observation result ${computedClause.result}.`));
      }
    }
    const computed = evaluateLogic(expression.content.logic, computedClauseResults);
    if (computed !== evaluation.content.result) {
      errors.push(problem("EVALUATION_RESULT_MISMATCH", `${path}.result`,
        `Declared ${evaluation.content.result} does not match recomputed ${computed}.`));
    }
  });

  register.actions.forEach((action, actionIndex) => {
    const path = `$.actions[${actionIndex}]`;
    const expression = refProblem(errors, action.if_binding.expression_ref, expressions,
      `${path}.if_binding.expression_ref`, "IF expression");
    const evaluation = refProblem(errors, action.if_binding.evaluation_ref, evaluations,
      `${path}.if_binding.evaluation_ref`, "IF evaluation");
    const bundle = refProblem(errors, action.evidence_bundle_ref, bundles,
      `${path}.evidence_bundle_ref`, "evidence bundle");
    if (!expression || !evaluation || !bundle) return;

    if (action.scale !== action.actor.scale) {
      errors.push(problem("ACTOR_SCALE_MISMATCH", `${path}.actor.scale`,
        "The actor scale must equal the proposal scale."));
    }
    if (action.decision_use !== "research-only"
      && expression.content.condition_binding.verification_state !== "locally-verified-complete") {
      errors.push(problem("CONDITION_LEDGER_UNVERIFIED", `${path}.decision_use`,
        "Decision-linked preparation requires a locally verified complete canonical condition ledger."));
    }
    if (action.decision_use !== "research-only"
      && bundle.content.sources.some(({ artifact_state: state }) => state !== "acquired-external-bytes")) {
      errors.push(problem("DECISION_EVIDENCE_NOT_EXTERNAL", `${path}.evidence_bundle_ref`,
        "Decision-linked preparation cannot rely on synthetic or unacquired evidence artefacts."));
    }
    const capabilityMatches = action.actor.authority_boundary.capabilities.some((capability) =>
      capability.verbs.includes(action.verb)
      && capability.object_classes.includes(action.object.class)
      && isSubset(action.scope.jurisdictions, capability.jurisdictions)
      && isSubset(action.scope.geographies, capability.geographies)
      && isSubset(action.scope.services, capability.services));
    if (!capabilityMatches) {
      errors.push(problem("ACTION_OUTSIDE_AUTHORITY_CAPABILITY", `${path}.actor.authority_boundary.capabilities`,
        "Verb, object class, jurisdiction, geography and service must fit one structured actor capability."));
    }
    const expectedSentence = renderActionSentence(action, expression.content.plain_language);
    if (action.public_sentence !== expectedSentence) {
      errors.push(problem("PUBLIC_SENTENCE_MISMATCH", `${path}.public_sentence`,
        "Public language must render the exact verb, object and content-bound IF."));
    }
    if (!sameValue(action.scope, expression.content.scope)
      || !sameValue(action.scope, evaluation.content.scope)) {
      errors.push(problem("ACTION_SCOPE_MISMATCH", `${path}.scope`,
        "Action, IF expression and IF evaluation scopes must match exactly."));
    }
    if (!sameValue(action.if_binding.expression_ref, evaluation.content.expression_ref)) {
      errors.push(problem("ACTION_EVALUATION_EXPRESSION_MISMATCH", `${path}.if_binding`,
        "The selected evaluation must evaluate the selected IF expression."));
    }
    if (!sameValue(action.evidence_bundle_ref, evaluation.content.evidence_bundle_ref)) {
      errors.push(problem("ACTION_EVIDENCE_MISMATCH", `${path}.evidence_bundle_ref`,
        "The action and IF evaluation must bind the same evidence bundle."));
    }
    if (Date.parse(evaluation.content.valid_until) <= asOf) {
      errors.push(problem("ACTION_IF_STALE", `${path}.if_binding.evaluation_ref`,
        "The proposal cannot bind an expired IF evaluation."));
    }
    if (Date.parse(action.generated_at) > asOf || Date.parse(action.review_by) <= asOf) {
      errors.push(problem("ACTION_REVIEW_WINDOW_INVALID", path,
        "Generation cannot be in the future and public review must still be due."));
    }
    if (Date.parse(action.review_by) > Date.parse(evaluation.content.valid_until)) {
      errors.push(problem("REVIEW_AFTER_IF_EXPIRY", `${path}.review_by`,
        "Proposal review must occur no later than expiry of its bound IF evaluation."));
    }

    const partyIds = action.affected_party_dispositions.map(({ party_id: id }) => id);
    if (duplicateValues(partyIds).length) {
      errors.push(problem("DUPLICATE_PARTY_DISPOSITION", `${path}.affected_party_dispositions`,
        "Each affected party must have one complete governance disposition."));
    }
    if (!sameValue([...partyIds].sort(), [...action.scope.affected_party_ids].sort())) {
      errors.push(problem("PARTY_SCOPE_COVERAGE_MISMATCH", `${path}.affected_party_dispositions`,
        "Affected-party dispositions must cover every party named by the action and IF scope exactly once."));
    }
    const bundleEvidenceIds = new Set(bundle.content.sources.map(({ evidence_id: id }) => id));
    const bundleEvidenceById = new Map(bundle.content.sources.map((source) => [source.evidence_id, source]));
    const validNecessityIds = deriveValidNecessityEvaluations(
      action,
      bundleEvidenceById,
      asOf,
      path,
      errors,
    );
    action.affected_party_dispositions.forEach((party, partyIndex) => {
      if (!bundleEvidenceIds.has(party.evidence_ref)) {
        errors.push(problem("PARTY_EVIDENCE_UNRESOLVED",
          `${path}.affected_party_dispositions[${partyIndex}].evidence_ref`,
          "Affected-party disposition evidence must resolve inside the bound evidence bundle."));
      } else {
        const partyEvidence = bundleEvidenceById.get(party.evidence_ref);
        if (partyEvidence.role !== "affected-party-testimony"
          || !partyEvidence.party_ids.includes(party.party_id)) {
          errors.push(problem("PARTY_EVIDENCE_ROLE_INVALID",
            `${path}.affected_party_dispositions[${partyIndex}].evidence_ref`,
            "Disposition evidence must be affected-party testimony explicitly bound to that party."));
        }
      }
      if (party.challenge_route !== action.affected_party_governance.challenge_route) {
        errors.push(problem("PARTY_CHALLENGE_ROUTE_MISMATCH",
          `${path}.affected_party_dispositions[${partyIndex}].challenge_route`,
          "Each party must receive the published affected-party challenge route."));
      }
      if (party.necessity_evaluation_ref !== null
        && !validNecessityIds.has(party.necessity_evaluation_ref)) {
        errors.push(problem("PARTY_NECESSITY_EVALUATION_INVALID",
          `${path}.affected_party_dispositions[${partyIndex}].necessity_evaluation_ref`,
          "A necessity gate is derived only from a current party, scope, dissent, alternatives, expiry, appeal and reviewer-bound evaluation."));
      }
    });
    const objectionPartyIds = action.affected_party_governance.objections.map(({ party_id: id }) => id);
    for (const duplicate of duplicateValues(objectionPartyIds)) {
      errors.push(problem("DUPLICATE_PARTY_OBJECTION",
        `${path}.affected_party_governance.objections`, `${duplicate} has duplicate objections.`));
    }
    if (objectionPartyIds.some((id) => !action.scope.affected_party_ids.includes(id))) {
      errors.push(problem("OBJECTION_PARTY_OUT_OF_SCOPE",
        `${path}.affected_party_governance.objections`,
        "Every objection must name a party retained in the scoped affected-party universe."));
    }
    const objectedPartyIds = action.affected_party_dispositions
      .filter(({ disposition }) => disposition === "objected")
      .map(({ party_id: id }) => id);
    if (objectedPartyIds.some((id) => !objectionPartyIds.includes(id))) {
      errors.push(problem("PARTY_OBJECTION_HIDDEN", `${path}.affected_party_governance.objections`,
        "Every objecting party needs a visible objection and response record."));
    }
    if (action.affected_party_governance.challenge_route
      !== action.accountable_owner.accountability_route) {
      errors.push(problem("PARTY_CHALLENGE_ROUTE_MISMATCH",
        `${path}.affected_party_governance.challenge_route`,
        "Affected-party coverage challenges must reach the accountable owner's public route."));
    }
    const allControls = [
      ...action.controls.start_conditions,
      ...action.controls.stop_conditions,
      ...action.controls.review_conditions,
    ];
    const controlOwners = allControls.map(({ responsible_owner_ref: ref }) => ref);
    if (controlOwners.some((ref) => ref !== action.accountable_owner.owner_id)
      || action.recovery_path.owner_ref !== action.accountable_owner.owner_id) {
      errors.push(problem("OWNER_BINDING_MISMATCH", path,
        "Every control and recovery step must bind the accountable owner."));
    }
    const controlEvidenceIds = new Set([
      ...bundleEvidenceIds,
      ...register.if_evaluations.map(({ id }) => id),
    ]);
    allControls.forEach((control, controlIndex) => {
      if (control.evidence_refs.some((ref) => !controlEvidenceIds.has(ref))) {
        errors.push(problem("CONTROL_EVIDENCE_UNRESOLVED", `${path}.controls[${controlIndex}]`,
          "Every executable control must bind an IF evaluation or evidence source in this register."));
      }
    });
    const startGates = new Set(action.controls.start_conditions.map(({ gate }) => gate));
    const stopGates = new Set(action.controls.stop_conditions.map(({ gate }) => gate));
    const reviewGates = new Set(action.controls.review_conditions.map(({ gate }) => gate));
    for (const gate of REQUIRED_START_GATES[action.reversibility.class]) {
      if (!startGates.has(gate)) {
        errors.push(problem("REQUIRED_CONTROL_GATE_MISSING", `${path}.controls.start_conditions`,
          `${gate} is required before ${action.reversibility.class} preparation can start.`));
      }
    }
    if (!reviewGates.has("scheduled-review") || !reviewGates.has("post-action-review")) {
      errors.push(problem("REQUIRED_CONTROL_GATE_MISSING", `${path}.controls.review_conditions`,
        "Scheduled and post-action review gates are required."));
    }
    if (action.controls.start_conditions.some(({ effect }) => effect !== "allow-start")
      || action.controls.stop_conditions.some(({ effect }) => effect !== "stop")
      || action.controls.review_conditions.some(({ effect }) => effect !== "require-review")) {
      errors.push(problem("CONTROL_EFFECT_MISMATCH", `${path}.controls`,
        "Control effects must match their start, stop or review collection."));
    }
    if (action.cross_actor_dependencies.some(({ actor_id: id }) => id === action.actor.actor_id)) {
      errors.push(problem("SELF_DEPENDENCY", `${path}.cross_actor_dependencies`,
        "Cross-actor dependencies must name a different actor."));
    }

    const comparatorRecords = [
      ...action.inaction_comparator.expected_outcomes,
      ...action.inaction_comparator.action_harms,
      ...action.inaction_comparator.inaction_harms,
    ];
    const comparator = action.inaction_comparator;
    const allHarms = [...comparator.action_harms, ...comparator.inaction_harms];
    const harmIds = allHarms.map(({ harm_id: id }) => id);
    if (duplicateValues(harmIds).length) {
      errors.push(problem("DUPLICATE_HARM_ID", `${path}.inaction_comparator`,
        "A harm identity may appear only once across action and inaction arms."));
    }
    const dimensions = comparator.harm_taxonomy.dimensions;
    const dimensionIds = dimensions.map(({ dimension_id: id }) => id);
    if (duplicateValues(dimensionIds).length) {
      errors.push(problem("DUPLICATE_HARM_DIMENSION",
        `${path}.inaction_comparator.harm_taxonomy.dimensions`,
        "The declared non-overlapping taxonomy must give each dimension one identity."));
    }
    const declaredDimensions = new Set(dimensionIds);
    const usedDimensions = new Set(allHarms.map(({ dimension_id: id }) => id));
    if (allHarms.some(({ dimension_id: id }) => !declaredDimensions.has(id))
      || dimensions.some(({ dimension_id: id }) => !usedDimensions.has(id))) {
      errors.push(problem("HARM_TAXONOMY_COVERAGE_MISMATCH",
        `${path}.inaction_comparator.harm_taxonomy`,
        "Every used harm dimension must be declared exactly once and every declaration must be used."));
    }
    for (const [field, arm] of [["action_harms", "action"], ["inaction_harms", "inaction"]]) {
      const semanticIds = comparator[field].map((harm) =>
        `${arm}|${harm.party_id}|${harm.dimension_id}`);
      if (duplicateValues(semanticIds).length) {
        errors.push(problem("DUPLICATE_HARM_SEMANTIC_IDENTITY",
          `${path}.inaction_comparator.${field}`,
          "Each arm may contain only one estimate for a party and non-overlapping harm dimension."));
      }
    }
    const actionPairs = comparator.action_harms.map((harm) =>
      `${harm.party_id}|${harm.dimension_id}`).sort();
    const inactionPairs = comparator.inaction_harms.map((harm) =>
      `${harm.party_id}|${harm.dimension_id}`).sort();
    if (!sameValue(actionPairs, inactionPairs)) {
      errors.push(problem("HARM_ARM_COVERAGE_MISMATCH", `${path}.inaction_comparator`,
        "Action and inaction arms must cover the same party and harm-dimension identities."));
    }
    for (const [outcomeIndex, outcome] of comparatorRecords.entries()) {
      for (const ref of outcome.evidence_refs) {
        if (!bundleEvidenceIds.has(ref)) {
          errors.push(problem("COMPARATOR_EVIDENCE_UNRESOLVED",
            `${path}.inaction_comparator.expected_outcomes[${outcomeIndex}].evidence_refs`,
            `${ref} is absent from the bound evidence bundle.`));
        }
      }
    }
    for (const [outcomeIndex, outcome] of action.inaction_comparator.expected_outcomes.entries()) {
      for (const arm of ["without_action", "with_action"]) {
        const estimate = outcome[arm];
        if (estimate.lower > estimate.estimate || estimate.estimate > estimate.upper) {
          errors.push(problem("COMPARATOR_INTERVAL_INCOHERENT",
            `${path}.inaction_comparator.expected_outcomes[${outcomeIndex}].${arm}`,
            "Comparator interval must contain its point estimate."));
        }
        const expectedEvidence = {
          measure: outcome.measure,
          unit: outcome.unit,
          arm: arm.replace("_", "-"),
          ...estimate,
        };
        const boundEstimates = outcome.evidence_refs.flatMap((ref) =>
          bundleEvidenceById.get(ref)?.outcome_estimates ?? []);
        if (!boundEstimates.some((candidate) => sameValue(candidate, expectedEvidence))) {
          errors.push(problem("COMPARATOR_ESTIMATE_EVIDENCE_MISMATCH",
            `${path}.inaction_comparator.expected_outcomes[${outcomeIndex}].${arm}`,
            "Each arm estimate and interval must exactly match a bound evidence record."));
        }
      }
    }
    for (const [field, arm] of [["action_harms", "action"], ["inaction_harms", "inaction"]]) {
      for (const [harmIndex, harm] of action.inaction_comparator[field].entries()) {
        const expectedEvidence = {
          harm_id: harm.harm_id,
          party_id: harm.party_id,
          dimension_id: harm.dimension_id,
          arm,
          severity_weight: harm.severity_weight,
          likelihood: harm.likelihood,
        };
        const boundHarms = harm.evidence_refs.flatMap((ref) =>
          bundleEvidenceById.get(ref)?.harm_estimates ?? []);
        if (!boundHarms.some((candidate) => sameValue(candidate, expectedEvidence))) {
          errors.push(problem("COMPARATOR_HARM_EVIDENCE_MISMATCH",
            `${path}.inaction_comparator.${field}[${harmIndex}]`,
            "Each harm estimate must exactly match a bound evidence record for that action arm and party."));
        }
      }
    }
    const comparatorPartyIds = [
      ...action.inaction_comparator.action_harms,
      ...action.inaction_comparator.inaction_harms,
    ].map(({ party_id: id }) => id);
    if (comparatorPartyIds.some((id) => !action.scope.affected_party_ids.includes(id))) {
      errors.push(problem("COMPARATOR_PARTY_OUT_OF_SCOPE", `${path}.inaction_comparator`,
        "Comparator harms must name a party in the scoped affected-party universe."));
    }
    for (const field of ["action_harms", "inaction_harms"]) {
      const covered = new Set(action.inaction_comparator[field].map(({ party_id: id }) => id));
      if (action.scope.affected_party_ids.some((id) => !covered.has(id))) {
        errors.push(problem("COMPARATOR_PARTY_COVERAGE_MISMATCH",
          `${path}.inaction_comparator.${field}`,
          "Both action and inaction arms must estimate harm for every scoped affected party."));
      }
    }
    const expectedHeadline = expectedComparatorHeadline(action.inaction_comparator);
    if (action.inaction_comparator.comparison !== expectedHeadline) {
      errors.push(problem("COMPARATOR_HEADLINE_MISMATCH",
        `${path}.inaction_comparator.comparison`,
        `Declared comparison does not match derived ${expectedHeadline}.`));
    }
    const comparatorEvidence = comparatorRecords.flatMap(({ evidence_refs: refs }) => refs)
      .map((ref) => bundleEvidenceById.get(ref))
      .filter(Boolean);
    const trustRank = comparatorEvidence.length > 0
      ? Math.min(...comparatorEvidence.map(({ trust_state: state }) => TRUST_RANK[state]))
      : 0;
    const expectedConfidence = CONFIDENCE_BY_RANK[Math.min(
      QUALITY_RANK[bundle.content.quality],
      trustRank,
    )];
    if (action.inaction_comparator.confidence !== expectedConfidence) {
      errors.push(problem("COMPARATOR_CONFIDENCE_MISMATCH",
        `${path}.inaction_comparator.confidence`,
        `Declared confidence does not match evidence-bound ${expectedConfidence}.`));
    }

    if (["reversible", "partially-reversible"].includes(action.reversibility.class)
      && (!action.recovery_path.funding_reserved || !action.recovery_path.capacity_reserved)) {
      errors.push(problem("RECOVERY_NOT_RESERVED", `${path}.recovery_path`,
        "A reversible preparation proposal must reserve both recovery funding and capacity."));
    }

    const funding = action.resources.funding;
    if (funding.status === "secured" && (
      funding.amount === null
      || funding.currency === null
      || funding.valid_through === null
      || Date.parse(funding.valid_through) < Date.parse(action.review_by)
    )) {
      errors.push(problem("SECURED_FUNDING_INCOMPLETE", `${path}.resources.funding`,
        "Secured funding needs a non-negative amount, currency and a future validity time."));
    }
    const capacity = action.resources.capacity;
    const availableById = new Map(capacity.available.map((resource) => [resource.resource_id, resource]));
    const capacitySatisfied = capacity.required.every((required) => {
      const available = availableById.get(required.resource_id);
      return available
        && available.unit === required.unit
        && available.quantity >= required.quantity;
    });
    if (capacity.status === "available" && (!capacitySatisfied || capacity.gap.length > 0)) {
      errors.push(problem("AVAILABLE_CAPACITY_INCOHERENT", `${path}.resources.capacity`,
        "Available capacity must meet every structured quantity and declare no gap."));
    }
    if (Date.parse(capacity.readiness_checked_at) > asOf
      || Date.parse(capacity.readiness_valid_until) <= asOf) {
      errors.push(problem("CAPACITY_READINESS_STALE", `${path}.resources.capacity`,
        "Capacity readiness must be checked no later than as_of and remain current after it."));
    }

    const recovery = action.recovery_path;
    const recoveryBase = action.reversibility.class === "emergency-containment"
      ? Date.parse(action.emergency_exception.ends_at)
      : Date.parse(action.generated_at);
    const recoveryCompleteBy = Date.parse(recovery.complete_by);
    const recoveryMaximum = recoveryBase
      + recovery.complete_within.value * DURATION_MS[recovery.complete_within.unit];
    if (recoveryCompleteBy <= recoveryBase) {
      errors.push(problem("RECOVERY_CHRONOLOGY_INVALID", `${path}.recovery_path.complete_by`,
        "Recovery completion must occur after the action or emergency-containment period it remedies."));
    }
    if (recoveryCompleteBy > recoveryMaximum) {
      errors.push(problem("RECOVERY_DEADLINE_INCOHERENT", `${path}.recovery_path.complete_by`,
        "The explicit recovery deadline exceeds the registered completion duration."));
    }
    if (Date.parse(recovery.funding_valid_through) < recoveryCompleteBy
      || Date.parse(recovery.capacity_valid_through) < recoveryCompleteBy) {
      errors.push(problem("RECOVERY_RESOURCES_EXPIRE_EARLY", `${path}.recovery_path`,
        "Reserved recovery funding and capacity must remain valid through the completion deadline."));
    }
    if (funding.status !== "secured"
      || capacity.status !== "available"
      || funding.valid_through === null
      || Date.parse(funding.valid_through) < recoveryCompleteBy
      || Date.parse(capacity.readiness_valid_until) < recoveryCompleteBy) {
      errors.push(problem("RECOVERY_RESOURCE_BINDING_INVALID", `${path}.resources`,
        "The action's actual funding and capacity records must remain valid through recovery completion."));
    }

    if (action.reversibility.class === "irreversible") {
      if (bundle.content.quality !== "validated") {
        errors.push(problem("IRREVERSIBLE_EVIDENCE_TOO_WEAK", `${path}.evidence_bundle_ref`,
          "Irreversible action requires a validated evidence bundle."));
      }
      if (action.authority_evidence.state !== "caller-asserted-verified-with-independent-review"
        || !action.authority_evidence.independent_review_ref) {
        errors.push(problem("IRREVERSIBLE_AUTHORITY_TOO_WEAK", `${path}.authority_evidence`,
          "Irreversible action requires separately verified authority and independent review."));
      }
      const burdened = action.affected_party_dispositions.filter(({ relationships }) =>
        relationships.includes("burdened"));
      if (burdened.length === 0
        || burdened.some((party) => party.disposition !== "consented"
          && !validNecessityIds.has(party.necessity_evaluation_ref))) {
        errors.push(problem("IRREVERSIBLE_PARTY_GATE_UNMET", `${path}.affected_party_dispositions`,
          "Every burdened party needs recorded consent or a reviewable public necessity test."));
      }
      if (action.affected_party_governance.known_omissions.length > 0) {
        errors.push(problem("IRREVERSIBLE_PARTY_COVERAGE_INCOMPLETE",
          `${path}.affected_party_governance.known_omissions`,
          "Known affected-party omissions must be resolved before an irreversible proposal clears its higher gate."));
      }
      if (action.resources.funding.status !== "secured"
        || action.resources.capacity.status !== "available"
        || action.cross_actor_dependencies.some(({ commitment_state: state }) => state !== "committed")) {
        errors.push(problem("IRREVERSIBLE_RESOURCES_NOT_READY", `${path}.resources`,
          "Irreversible action needs secured funding, available capacity and committed dependencies."));
      }
      if (!action.recovery_path.funding_reserved || !action.recovery_path.capacity_reserved) {
        errors.push(problem("IRREVERSIBLE_REMEDY_NOT_RESERVED", `${path}.recovery_path`,
          "Irreversible action still requires funded, staffed remedy for preventable harm."));
      }
    }

    const emergency = action.emergency_exception;
    if (action.reversibility.class !== "emergency-containment" && emergency) {
      errors.push(problem("EMERGENCY_EXCEPTION_MISAPPLIED", `${path}.emergency_exception`,
        "Only a narrowly classified emergency-containment proposal may use the exception."));
    }
    if (action.reversibility.class === "emergency-containment") {
      if (!emergency) {
        errors.push(problem("EMERGENCY_EXCEPTION_REQUIRED", path,
          "Emergency containment requires the complete exception record."));
        return;
      }
      if (!EMERGENCY_VERBS.has(action.verb) || action.object.class !== "emergency-containment") {
        errors.push(problem("EMERGENCY_VERB_NOT_ALLOWED", `${path}.verb`,
          "Emergency containment is limited to pause, protect or provide on a containment object."));
      }
      const starts = Date.parse(emergency.starts_at);
      const ends = Date.parse(emergency.ends_at);
      const retrospective = Date.parse(emergency.retrospective_review_by);
      if (starts > asOf || ends <= asOf || ends <= starts || ends - starts > EMERGENCY_MAX_MS) {
        errors.push(problem("EMERGENCY_TIMEBOX_TOO_LONG", `${path}.emergency_exception`,
          "Emergency containment must begin no later than as_of and end within seven days."));
      }
      if (Date.parse(action.review_by) > ends) {
        errors.push(problem("EMERGENCY_REVIEW_AFTER_SUNSET", `${path}.review_by`,
          "The first emergency review must occur no later than the containment sunset."));
      }
      if (retrospective <= ends || retrospective - ends > RETROSPECTIVE_MAX_MS) {
        errors.push(problem("EMERGENCY_REVIEW_WINDOW_INVALID",
          `${path}.emergency_exception.retrospective_review_by`,
          "Retrospective review must occur after containment and within thirty days."));
      }
      if (action.authority_evidence.state === "caller-asserted-unverified"
        || !action.authority_evidence.instrument_ref
        || !action.authority_evidence.verification_ref) {
        errors.push(problem("EMERGENCY_AUTHORITY_TOO_WEAK", `${path}.authority_evidence`,
          "The exception cannot substitute for a separately verified authority basis."));
      }
      if (bundle.content.sources.length < 2 || bundle.content.quality === "exploratory") {
        errors.push(problem("EMERGENCY_EVIDENCE_TOO_WEAK", `${path}.evidence_bundle_ref`,
          "Emergency containment needs at least provisional evidence from two recorded sources."));
      }
      if (action.cross_actor_dependencies.some(({ commitment_state: state }) => state !== "committed")) {
        errors.push(problem("EMERGENCY_DEPENDENCY_NOT_READY", `${path}.cross_actor_dependencies`,
          "Every delivery dependency must be committed before emergency containment starts."));
      }
      if (funding.amount === null || funding.amount <= 0) {
        errors.push(problem("EMERGENCY_FUNDING_NONPOSITIVE", `${path}.resources.funding.amount`,
          "Emergency containment needs a positive, quantified funding allocation."));
      }
      if (emergency.independent_reviewer.relationship !== "independent") {
        errors.push(problem("EMERGENCY_REVIEW_NOT_INDEPENDENT",
          `${path}.emergency_exception.independent_reviewer.relationship`,
          "The emergency reviewer must be structurally independent of the acting body."));
      }
      const reviewer = emergency.independent_reviewer;
      const reviewerOrganisation = reviewer.organisation.trim().toLowerCase();
      if ([action.accountable_owner.organisation, action.actor.name]
        .map((value) => value.trim().toLowerCase())
        .includes(reviewerOrganisation)
        || [action.accountable_owner.owner_id, action.actor.actor_id]
          .includes(reviewer.reviewer_id)) {
        errors.push(problem("EMERGENCY_REVIEWER_CONFLICT",
          `${path}.emergency_exception.independent_reviewer`,
          "The named reviewer must be a distinct person and organisation from the acting and accountable bodies."));
      }
      if (action.resources.funding.status !== "secured"
        || action.resources.capacity.status !== "available"
        || !action.recovery_path.funding_reserved
        || !action.recovery_path.capacity_reserved) {
        errors.push(problem("EMERGENCY_RESOURCES_NOT_READY", `${path}.resources`,
          "Containment and recovery need secured funding and available capacity."));
      }
      if (Date.parse(action.resources.funding.valid_through) < ends) {
        errors.push(problem("EMERGENCY_FUNDING_EXPIRES_EARLY", `${path}.resources.funding.valid_through`,
          "Containment funding must remain secured through the emergency sunset."));
      }
      if (Date.parse(capacity.readiness_valid_until) < ends) {
        errors.push(problem("EMERGENCY_CAPACITY_EXPIRES_EARLY",
          `${path}.resources.capacity.readiness_valid_until`,
          "Capacity readiness must remain current through the emergency sunset."));
      }
      for (const gate of REQUIRED_EMERGENCY_STOP_GATES) {
        if (!stopGates.has(gate)) {
          errors.push(problem("REQUIRED_CONTROL_GATE_MISSING", `${path}.controls.stop_conditions`,
            `${gate} is required to contain emergency action.`));
        }
      }
      const burdened = action.affected_party_dispositions.filter(({ relationships }) =>
        relationships.includes("burdened"));
      if (burdened.length === 0
        || burdened.some((party) => party.disposition !== "consented"
          && !validNecessityIds.has(party.necessity_evaluation_ref))) {
        errors.push(problem("EMERGENCY_RIGHTS_GATE_UNMET", `${path}.affected_party_dispositions`,
          "Emergency burdens need consent or a documented, challengeable necessity test."));
      }
      if (action.affected_party_governance.known_omissions.length > 0) {
        errors.push(problem("EMERGENCY_PARTY_COVERAGE_INCOMPLETE",
          `${path}.affected_party_governance.known_omissions`,
          "Known affected-party omissions prevent use of the emergency exception."));
      }
    }
  });

  return errors;
}

export function assessPreparationRegister(register) {
  const schemaConformant = validateSchema(register);
  const errors = schemaConformant ? semanticProblems(register) : schemaProblems();
  return {
    schema_conformant: schemaConformant,
    register_consistent: schemaConformant && errors.length === 0,
    structurally_publishable_proposal: schemaConformant && errors.length === 0,
    evidence_truth_assessed: false,
    actor_identity_verified: false,
    action_authorised: false,
    errors,
  };
}

export function assertPreparationRegister(register) {
  const result = assessPreparationRegister(register);
  if (!result.structurally_publishable_proposal) {
    throw new Error(`Preparation register is not publishable:\n${result.errors
      .map(({ code, path, message }) => `${code} ${path}: ${message}`).join("\n")}`);
  }
  return result;
}
