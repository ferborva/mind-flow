import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { computeEvidenceStateHash } from "../executable-if/validate.mjs";

const HASH_DOMAIN = "mind-flow:condition-agency-map:v1";
const REPOSITORY_SCHEMA = JSON.parse(readFileSync(
  new URL("./schema/condition-agency-map.schema.json", import.meta.url),
  "utf8",
));
const LOCI = [
  "technical",
  "organisational",
  "market",
  "legal-institutional",
  "infrastructure",
  "ecological",
  "personal-capacity",
  "shared-system",
  "unknown",
];
const MOVER_ROLES = new Set(["controls", "influences", "depends-on", "duty-bears"]);
const MODE_ROLES = {
  act: new Set(["controls"]),
  prepare: new Set(["controls", "influences", "duty-bears", "delivers"]),
  watch: new Set(["observes", "verifies", "depends-on"]),
  negotiate: new Set(["negotiates", "depends-on"]),
  coordinate: new Set(["controls", "influences", "duty-bears", "funds", "delivers"]),
  "escalate-for-authority": new Set(["depends-on", "duty-bears"]),
  "cannot-move": new Set(["affected", "depends-on"]),
  investigate: new Set([
    "controls", "influences", "depends-on", "duty-bears", "funds",
    "delivers", "verifies", "affected", "negotiates", "observes",
  ]),
};
const DEPENDENCY_MODES = new Set(["negotiate", "coordinate", "escalate-for-authority"]);
const DEPENDENCY_ROLES = new Set([
  "controls", "influences", "depends-on", "duty-bears", "funds", "delivers",
  "verifies", "negotiates",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksum(kind, value) {
  return `sha256:${createHash("sha256")
    .update(`${HASH_DOMAIN}:${kind}\n${canonicalJson(value)}`, "utf8")
    .digest("hex")}`;
}

function metricHashMaterial(metric) {
  const material = structuredClone(metric);
  delete material.metric_checksum;
  return material;
}

export function computeMetricChecksum(metric) {
  return checksum("metric", metricHashMaterial(metric));
}

function issue(code, path, message, keyword = "integrity") {
  return { code, path, message, keyword };
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function sameSet(left, right) {
  return isDeepStrictEqual(sortedUnique(left), sortedUnique(right));
}

function duplicateIssues(items, field, path) {
  const seen = new Set();
  const errors = [];
  for (const [index, item] of items.entries()) {
    const value = item?.[field];
    if (seen.has(value)) {
      errors.push(issue("DUPLICATE_ID", `/${path}/${index}/${field}`, `${value} is duplicated`));
    }
    seen.add(value);
  }
  return errors;
}

function outcomeHashMaterial(map) {
  const scope = structuredClone(map.outcome_scope);
  delete scope.scope_hash;
  const conditionById = new Map((map.conditions || []).map((condition) => [
    condition.condition_id,
    condition,
  ]));
  return {
    goal: map.goal,
    outcome_scope: scope,
    if_clauses: (scope.condition_ids || []).map((conditionId) => {
      const condition = conditionById.get(conditionId);
      const clause = condition ? {
        condition_id: condition.condition_id,
        public_if_clause: condition.public_if_clause,
        ledger_anchor: condition.ledger_anchor,
      } : { condition_id: conditionId, unresolved: true };
      if (condition?.canonical_binding) clause.canonical_binding = condition.canonical_binding;
      return clause;
    }),
    ...(map.signal_registry_ref ? { signal_registry_ref: map.signal_registry_ref } : {}),
  };
}

function logicReferences(logic) {
  if (logic.condition_ref) return [logic.condition_ref];
  if (logic.all) return logic.all.flatMap(logicReferences);
  if (logic.any) return logic.any.flatMap(logicReferences);
  return logicReferences(logic.not);
}

function renderConditionLogic(logic, conditions) {
  if (logic.condition_ref) {
    return conditions.get(logic.condition_ref)?.public_if_clause ||
      `[unresolved ${logic.condition_ref}]`;
  }
  if (logic.all) {
    return `all of (${logic.all.map((child) =>
      renderConditionLogic(child, conditions)).join("; and ")})`;
  }
  if (logic.any) {
    return `at least one route holds: (${logic.any.map((child) =>
      renderConditionLogic(child, conditions)).join("; or ")})`;
  }
  return `not (${renderConditionLogic(logic.not, conditions)})`;
}

function renderCompletionTest(test) {
  return `${test.measure} ${test.operator} ${String(test.threshold)} ${test.unit}; verifier ${test.verifier_actor_ref}`;
}

export function computeOutcomeScopeHash(map) {
  return checksum("outcome-scope", outcomeHashMaterial(map));
}

export function renderBoundPublicIfClause(definition) {
  const { claim } = definition;
  return `${claim.who} ${claim.verb} ${claim.object}, at the standard that ${claim.standard}, from ${claim.period.starts_at} through ${claim.period.ends_at}`;
}

function actorByRef(map) {
  return new Map((map.actors || []).map((actor) => [actor.actor_ref, actor]));
}

function conditionById(map) {
  return new Map((map.conditions || []).map((condition) => [condition.condition_id, condition]));
}

export function computePublicProjection(map) {
  const actors = actorByRef(map);
  const conditions = conditionById(map);
  const scope = map.outcome_scope || {};
  const conditionLogic = scope.condition_logic
    ? renderConditionLogic(scope.condition_logic, conditions)
    : "[unresolved condition logic]";
  const consumerStatement = map.schema_version === "1.1.0"
    ? `${scope.people || "People"} may ${scope.verb || ""} ${scope.object || ""} to the following standard: ${scope.standard || ""}, in ${scope.place || ""}, during ${scope.period || ""}, if ${conditionLogic}.`
    : `${scope.people || "People"} may ${scope.verb || ""} ${scope.object || ""} at ${scope.standard || ""}, in ${scope.place || ""}, during ${scope.period || ""}, if ${conditionLogic}.`;

  const affectedParties = (scope.affected_actor_refs || [])
    .map((actorRef) => ({
      actor_ref: actorRef,
      label: actors.get(actorRef)?.label || `[unresolved ${actorRef}]`,
      identity_verification: actors.get(actorRef)?.identity_verification ||
        "external-unverified",
    }))
    .sort((left, right) => left.actor_ref.localeCompare(right.actor_ref));

  const signalContracts = (map.signals || [])
    .map((signal) => ({
      signal_ref: signal.signal_ref,
      condition_id: signal.condition_id,
      role: signal.role,
      label: signal.label,
      measure: signal.metric?.measure || "[unresolved measure]",
      unit: signal.metric?.unit || "[unresolved unit]",
      denominator: signal.metric?.denominator || "[unresolved denominator]",
      population: signal.metric?.population || "[unresolved population]",
      geography: signal.metric?.geography || "[unresolved geography]",
      period: signal.metric?.period || "[unresolved period]",
      aggregation: signal.metric?.aggregation || "[unresolved aggregation]",
      direction: signal.metric?.direction || "unknown",
      metric_checksum: signal.metric?.metric_checksum ||
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      ...(signal.registered_metric_ref ? {
        registered_metric_checksum: signal.registered_metric_ref.metric_checksum,
        binding_kind: signal.registered_metric_ref.binding_kind,
      } : {}),
      verification: signal.verification,
    }))
    .sort((left, right) => left.signal_ref.localeCompare(right.signal_ref));

  const providerPlans = (map.provider_plans || [])
    .map((plan) => {
      const actor = actors.get(plan.actor_ref);
      const when = (plan.when_clauses || []).map((clause) => {
        const condition = conditions.get(clause.condition_id);
        return `${condition?.public_if_clause || `[unresolved ${clause.condition_id}]`} [${clause.mode}]`;
      });
      return {
        actor_ref: plan.actor_ref,
        status: "conditional plan hypothesis, not forecast or commitment",
        statement: `${actor?.label || plan.actor_ref} proposes that it could ${plan.offered_verb} ${plan.offered_object} at ${plan.standard}, in ${plan.geographies?.join(", ") || plan.place}, from ${plan.starts_at || plan.period} through ${plan.ends_at || plan.period}, when ${when.join("; and when ")}. Capability and identity remain caller-asserted and unverified. This is a conditional plan hypothesis, not a forecast or commitment.`,
        condition_moves: (plan.when_clauses || []).map((clause) =>
          `${clause.condition_id}: ${clause.mode}`),
        conditions: (plan.when_clauses || []).map((clause) => ({
          condition_id: clause.condition_id,
          mode: clause.mode,
          completion_criterion: clause.completion_criterion,
          completion_test: clause.completion_test
            ? renderCompletionTest(clause.completion_test)
            : "[unresolved completion test]",
          dependency_actor_refs: clause.dependency_actor_refs,
          next_review: clause.next_review,
          verification: clause.completion_test?.verification || "external-unverified",
        })),
      };
    })
    .sort((left, right) => left.actor_ref.localeCompare(right.actor_ref));

  const actionHypotheses = (map.action_hypotheses || [])
    .map((action) => ({
      hypothesis_id: action.hypothesis_id,
      status: "proposal-only; not authorised",
      statement: `${actors.get(action.actor_ref)?.label || action.actor_ref} proposes ${action.verb} ${action.object} as a hypothesis that ${action.intended_signal_ref} would ${action.expected_direction} for ${action.target_condition_id}.`,
      falsifier: action.falsifier,
    }))
    .sort((left, right) => left.hypothesis_id.localeCompare(right.hypothesis_id));

  return {
    goal: `${map.goal?.statement || ""} This is a value choice, not a directly measured state.`,
    freshness: {
      as_of: map.as_of,
      runtime_evaluation_required: true,
    },
    affected_parties: affectedParties,
    consumer_if: {
      status: "unscored outcome hypothesis",
      statement: consumerStatement,
      ...(map.schema_version === "1.1.0" ? {
        basis: {
          condition_definition_refs: map.conditions.map(({ canonical_binding: binding }) =>
            binding.condition_definition_ref),
          evidence_state_refs: map.conditions.map(({ canonical_binding: binding }) =>
            binding.evidence_state_ref),
          condition_truth_assessed: false,
          authority_effect: "none",
        },
      } : {}),
    },
    signal_contracts: signalContracts,
    provider_when_plans: providerPlans,
    action_hypotheses: actionHypotheses,
    boundary: "Structural consistency does not establish condition truth, actor identity, control, consent, commitment or authority. No action is authorised.",
  };
}

function actorReferences(map, actorRefs) {
  const errors = [];
  for (const [conditionIndex, condition] of map.conditions.entries()) {
    const seen = new Set();
    for (const [relationIndex, relation] of condition.relations.entries()) {
      if (!actorRefs.has(relation.actor_ref)) {
        errors.push(issue(
          "UNRESOLVED_ACTOR_REF",
          `/conditions/${conditionIndex}/relations/${relationIndex}/actor_ref`,
          `${relation.actor_ref} is not registered`,
        ));
      }
      if (seen.has(relation.actor_ref)) {
        errors.push(issue(
          "DUPLICATE_CONDITION_ACTOR",
          `/conditions/${conditionIndex}/relations/${relationIndex}/actor_ref`,
          `${relation.actor_ref} has more than one relation record for this condition`,
        ));
      }
      seen.add(relation.actor_ref);
    }
  }
  for (const [planIndex, plan] of map.provider_plans.entries()) {
    if (!actorRefs.has(plan.actor_ref)) {
      errors.push(issue(
        "UNRESOLVED_ACTOR_REF",
        `/provider_plans/${planIndex}/actor_ref`,
        `${plan.actor_ref} is not registered`,
      ));
    }
    for (const [clauseIndex, clause] of plan.when_clauses.entries()) {
      for (const [dependencyIndex, dependency] of clause.dependency_actor_refs.entries()) {
        if (!actorRefs.has(dependency)) {
          errors.push(issue(
            "UNRESOLVED_ACTOR_REF",
            `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/dependency_actor_refs/${dependencyIndex}`,
            `${dependency} is not registered`,
          ));
        }
      }
    }
  }
  for (const [actionIndex, action] of map.action_hypotheses.entries()) {
    if (!actorRefs.has(action.actor_ref)) {
      errors.push(issue(
        "UNRESOLVED_ACTOR_REF",
        `/action_hypotheses/${actionIndex}/actor_ref`,
        `${action.actor_ref} is not registered`,
      ));
    }
  }
  return errors;
}

function conditionIntegrity(map, conditionIds, signalByRef, actors) {
  const errors = [];
  if (!sameSet(map.outcome_scope.condition_ids, [...conditionIds])) {
    errors.push(issue(
      "OUTCOME_CONDITION_COVERAGE_MISMATCH",
      "/outcome_scope/condition_ids",
      "The public outcome must bind every registered condition exactly once.",
    ));
  }
  const logicRefs = logicReferences(map.outcome_scope.condition_logic);
  if (logicRefs.length !== conditionIds.size ||
      new Set(logicRefs).size !== logicRefs.length ||
      !sameSet(logicRefs, [...conditionIds])) {
    errors.push(issue(
      "OUTCOME_LOGIC_COVERAGE_MISMATCH",
      "/outcome_scope/condition_logic",
      "The condition logic must reference every registered condition exactly once.",
    ));
  }
  if (map.outcome_scope.scope_hash !== computeOutcomeScopeHash(map)) {
    errors.push(issue(
      "OUTCOME_SCOPE_HASH_MISMATCH",
      "/outcome_scope/scope_hash",
      "The goal, complete public promise, IF wording and ledger anchors must be resealed together.",
    ));
  }
  if (!sameSet(map.condition_loci, LOCI)) {
    errors.push(issue(
      "CONDITION_LOCUS_VOCABULARY_MISMATCH",
      "/condition_loci",
      "The map must expose the complete locus vocabulary, including unknown.",
    ));
  }

  const affectedRefs = new Set(map.outcome_scope.affected_actor_refs);
  for (const actorRef of affectedRefs) {
    if (actors.get(actorRef)?.actor_class !== "affected-people") {
      errors.push(issue(
        "SCOPED_AFFECTED_ACTOR_INVALID",
        "/outcome_scope/affected_actor_refs",
        `${actorRef} must resolve to an affected-people actor.`,
      ));
    }
  }

  for (const [index, condition] of map.conditions.entries()) {
    if (condition.ledger_anchor.condition_id !== condition.condition_id) {
      errors.push(issue(
        "CONDITION_LEDGER_ID_MISMATCH",
        `/conditions/${index}/ledger_anchor/condition_id`,
        "The condition must bind its own canonical ledger identity.",
      ));
    }
    const roles = condition.relations.flatMap((relation) => relation.roles);
    if (!roles.includes("affected")) {
      errors.push(issue(
        "AFFECTED_RELATION_MISSING",
        `/conditions/${index}/relations`,
        "Every condition must name at least one affected actor.",
      ));
    }
    const relationByActor = new Map(condition.relations.map((relation) => [
      relation.actor_ref,
      relation,
    ]));
    if ([...affectedRefs].some((actorRef) =>
      !relationByActor.get(actorRef)?.roles.includes("affected")) ||
      condition.relations.some((relation) =>
        relation.roles.includes("affected") && !affectedRefs.has(relation.actor_ref))) {
      errors.push(issue(
        "SCOPED_AFFECTED_RELATION_MISSING",
        `/conditions/${index}/relations`,
        "Affected relations must match the scoped affected-people actors exactly.",
      ));
    }
    if (!roles.some((role) => MOVER_ROLES.has(role))) {
      errors.push(issue(
        "CONDITION_AGENCY_UNMAPPED",
        `/conditions/${index}/relations`,
        "Every condition must expose control, influence, dependence, duty or an explicit unknown relation.",
      ));
    }
    for (const [signalIndex, signalRef] of condition.signal_refs.entries()) {
      const signal = signalByRef.get(signalRef);
      if (!signal) {
        errors.push(issue(
          "UNRESOLVED_SIGNAL_REF",
          `/conditions/${index}/signal_refs/${signalIndex}`,
          `${signalRef} is not registered`,
        ));
      } else if (signal.condition_id !== condition.condition_id) {
        errors.push(issue(
          "SIGNAL_CONDITION_MISMATCH",
          `/conditions/${index}/signal_refs/${signalIndex}`,
          `${signalRef} is registered for ${signal.condition_id}`,
        ));
      }
    }
  }
  const referencedSignals = new Set(map.conditions.flatMap(({ signal_refs }) => signal_refs));
  for (const signalRef of signalByRef.keys()) {
    if (!referencedSignals.has(signalRef)) {
      errors.push(issue(
        "ORPHAN_SIGNAL",
        "/signals",
        `${signalRef} is not exposed by its registered condition.`,
      ));
    }
  }
  for (const [index, signal] of map.signals.entries()) {
    if (signal.metric.metric_checksum !== computeMetricChecksum(signal.metric)) {
      errors.push(issue(
        "SIGNAL_METRIC_HASH_MISMATCH",
        `/signals/${index}/metric/metric_checksum`,
        "The estimand, denominator, sources and evaluation rule must be resealed together.",
      ));
    }
    if (signal.metric.population !== map.outcome_scope.people ||
        signal.metric.geography !== map.outcome_scope.place ||
        signal.metric.period !== map.outcome_scope.period) {
      errors.push(issue(
        "SIGNAL_METRIC_SCOPE_MISMATCH",
        `/signals/${index}/metric`,
        "A signal in this map must preserve the registered outcome population, place and period.",
      ));
    }
  }
  return errors;
}

function planIntegrity(map, actors, conditions) {
  const errors = [];
  const expectedConditions = [...conditions.keys()];
  const providerActorRefs = new Set(map.provider_plans.map(({ actor_ref: actorRef }) => actorRef));
  const materialRoles = new Set([
    "controls", "influences", "duty-bears", "funds", "delivers", "negotiates",
  ]);
  const relevantProviderRefs = new Set(map.conditions.flatMap((condition) =>
    condition.relations
      .filter((relation) => relation.roles.some((role) => materialRoles.has(role)))
      .map(({ actor_ref: actorRef }) => actorRef)));
  for (const actorRef of relevantProviderRefs) {
    if (actors.get(actorRef)?.actor_class !== "affected-people" &&
        !providerActorRefs.has(actorRef)) {
      errors.push(issue(
        "RELEVANT_PROVIDER_PLAN_MISSING",
        "/provider_plans",
        `${actorRef} has a material condition relationship but no public WHEN plan.`,
      ));
    }
  }

  for (const [planIndex, plan] of map.provider_plans.entries()) {
    const actor = actors.get(plan.actor_ref);
    if (actor?.actor_class === "affected-people") {
      errors.push(issue(
        "AFFECTED_ACTOR_AS_PROVIDER",
        `/provider_plans/${planIndex}/actor_ref`,
        "The consumer side cannot be silently recast as the provider plan.",
      ));
    }
    const capable = actor?.capabilities.some((capability) =>
      capability.verb === plan.offered_verb &&
      capability.object_class === plan.object_class &&
      plan.geographies.every((geography) => capability.geographies.includes(geography)) &&
      plan.services.every((service) => capability.services.includes(service))) || false;
    if (!capable || !plan.jurisdictions.every((jurisdiction) =>
      actor?.jurisdictions.includes(jurisdiction))) {
      errors.push(issue(
        "PROVIDER_CAPABILITY_MISMATCH",
        `/provider_plans/${planIndex}`,
        "The offered verb, object and scope must fit one caller-asserted actor capability.",
      ));
    }
    if (!sameSet(plan.jurisdictions, map.outcome_scope.jurisdictions) ||
        !sameSet(plan.geographies, map.outcome_scope.geographies) ||
        !plan.services.every((service) => map.outcome_scope.services.includes(service)) ||
        plan.starts_at !== map.outcome_scope.starts_at ||
        plan.ends_at !== map.outcome_scope.ends_at) {
      errors.push(issue(
        "PROVIDER_SCOPE_MISMATCH",
        `/provider_plans/${planIndex}`,
        "A provider plan must use the complete typed outcome scope and time window.",
      ));
    }
    const clauseIds = plan.when_clauses.map(({ condition_id }) => condition_id);
    if (new Set(clauseIds).size !== clauseIds.length || !sameSet(clauseIds, expectedConditions)) {
      errors.push(issue(
        "PLAN_CONDITION_COVERAGE_MISMATCH",
        `/provider_plans/${planIndex}/when_clauses`,
        "Each provider plan must address every registered condition exactly once.",
      ));
    }
    for (const [clauseIndex, clause] of plan.when_clauses.entries()) {
      const condition = conditions.get(clause.condition_id);
      if (!condition) continue;
      if (clause.condition_anchor_hash !== condition.ledger_anchor.tip_hash) {
        errors.push(issue(
          "PLAN_CONDITION_ANCHOR_MISMATCH",
          `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/condition_anchor_hash`,
          "The WHEN clause must bind the exact condition-ledger tip.",
        ));
      }
      const relation = condition.relations.find(({ actor_ref }) => actor_ref === plan.actor_ref);
      const allowedRoles = MODE_ROLES[clause.mode] || new Set();
      const relationFits = relation?.roles.some((role) => allowedRoles.has(role)) || false;
      const dependencyFits = !DEPENDENCY_MODES.has(clause.mode) ||
        clause.dependency_actor_refs.length > 0;
      if (!relationFits || !dependencyFits) {
        errors.push(issue(
          "PLAN_MODE_ROLE_MISMATCH",
          `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/mode`,
          `${clause.mode} is not supported by this actor's declared relation and dependencies.`,
        ));
      }
      const verifier = actors.get(clause.completion_test.verifier_actor_ref);
      const verifierRelation = condition.relations.find(({ actor_ref: actorRef }) =>
        actorRef === clause.completion_test.verifier_actor_ref);
      if (!verifier || clause.completion_test.verifier_actor_ref === plan.actor_ref ||
          !verifierRelation?.roles.includes("verifies")) {
        errors.push(issue(
          "COMPLETION_VERIFIER_INVALID",
          `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/completion_test/verifier_actor_ref`,
          "A completion test needs a distinct registered verifier related to this condition.",
        ));
      }
      for (const [dependencyIndex, dependencyRef] of clause.dependency_actor_refs.entries()) {
        const dependencyRelation = condition.relations.find(
          ({ actor_ref }) => actor_ref === dependencyRef,
        );
        if (
          dependencyRef === plan.actor_ref ||
          !dependencyRelation?.roles.some((role) => DEPENDENCY_ROLES.has(role))
        ) {
          errors.push(issue(
            "INVALID_CONDITION_DEPENDENCY",
            `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/dependency_actor_refs/${dependencyIndex}`,
            "A dependency must be a distinct actor with a relevant relation to this condition.",
          ));
        }
      }
    }
  }

  for (const conditionId of expectedConditions) {
    const dependencies = new Map(map.provider_plans.map((plan) => {
      const clause = plan.when_clauses.find(({ condition_id: id }) => id === conditionId);
      return [plan.actor_ref, (clause?.dependency_actor_refs || [])
        .filter((actorRef) => providerActorRefs.has(actorRef))];
    }));
    const visiting = new Set();
    const visited = new Set();
    let cycle = false;
    function visit(actorRef) {
      if (visiting.has(actorRef)) {
        cycle = true;
        return;
      }
      if (visited.has(actorRef)) return;
      visiting.add(actorRef);
      for (const dependency of dependencies.get(actorRef) || []) visit(dependency);
      visiting.delete(actorRef);
      visited.add(actorRef);
    }
    for (const actorRef of dependencies.keys()) visit(actorRef);
    if (cycle) {
      errors.push(issue(
        "PROVIDER_DEPENDENCY_CYCLE",
        "/provider_plans",
        `${conditionId} contains a blocked actor-dependency cycle.`,
      ));
    }
  }
  return errors;
}

function temporalIntegrity(map, evaluatedAt) {
  const errors = [];
  const asOf = Date.parse(map.as_of);
  const evaluationTime = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluationTime)) {
    errors.push(issue(
      "TRUSTED_EVALUATION_TIME_REQUIRED",
      "/",
      "Validation requires a caller-supplied, trusted evaluation instant.",
    ));
    return errors;
  }
  if (Date.parse(map.created_at) > asOf) {
    errors.push(issue(
      "INVALID_MAP_CLOCK",
      "/created_at",
      "The map cannot be created after its declared as-of time.",
    ));
  }
  if (asOf > evaluationTime) {
    errors.push(issue(
      "MAP_FROM_FUTURE",
      "/as_of",
      "The map as-of time cannot be later than the trusted evaluation instant.",
    ));
  }
  if (Date.parse(map.outcome_scope.starts_at) >= Date.parse(map.outcome_scope.ends_at)) {
    errors.push(issue(
      "INVALID_OUTCOME_PERIOD",
      "/outcome_scope",
      "The typed outcome period must have a start before its end.",
    ));
  }
  for (const [planIndex, plan] of map.provider_plans.entries()) {
    for (const [clauseIndex, clause] of plan.when_clauses.entries()) {
      if (Date.parse(clause.next_review) <= evaluationTime) {
        errors.push(issue(
          "PLAN_REVIEW_EXPIRED",
          `/provider_plans/${planIndex}/when_clauses/${clauseIndex}/next_review`,
          "A provider WHEN clause must be reviewed after the map's as-of time.",
        ));
      }
    }
  }
  for (const [actionIndex, action] of map.action_hypotheses.entries()) {
    if (Date.parse(action.expires_at) <= evaluationTime) {
      errors.push(issue(
        "ACTION_HYPOTHESIS_EXPIRED",
        `/action_hypotheses/${actionIndex}/expires_at`,
        "An action hypothesis must expire after the map's as-of time.",
      ));
    }
  }
  return errors;
}

function actionIntegrity(map, actors, conditions, signals) {
  const errors = [];
  for (const [index, action] of map.action_hypotheses.entries()) {
    const condition = conditions.get(action.target_condition_id);
    if (!condition) {
      errors.push(issue(
        "UNRESOLVED_ACTION_CONDITION",
        `/action_hypotheses/${index}/target_condition_id`,
        `${action.target_condition_id} is not registered`,
      ));
    }
    const intended = signals.get(action.intended_signal_ref);
    if (!intended) {
      errors.push(issue(
        "UNRESOLVED_SIGNAL_REF",
        `/action_hypotheses/${index}/intended_signal_ref`,
        `${action.intended_signal_ref} is not registered`,
      ));
    } else if (intended.condition_id !== action.target_condition_id) {
      errors.push(issue(
        "ACTION_SIGNAL_CONDITION_MISMATCH",
        `/action_hypotheses/${index}/intended_signal_ref`,
        "The intended signal must measure the targeted condition.",
      ));
    }
    const secondaryRefs = [...action.counter_signal_refs, ...action.harm_signal_refs];
    for (const [signalIndex, signalRef] of secondaryRefs.entries()) {
      if (!signals.has(signalRef)) {
        errors.push(issue(
          "UNRESOLVED_SIGNAL_REF",
          `/action_hypotheses/${index}/secondary_signal_refs/${signalIndex}`,
          `${signalRef} is not registered`,
        ));
      }
    }
    if (secondaryRefs.some((signalRef) =>
      signals.get(signalRef)?.condition_id !== action.target_condition_id)) {
      errors.push(issue(
        "ACTION_SECONDARY_SIGNAL_CONDITION_MISMATCH",
        `/action_hypotheses/${index}`,
        "Counter and harm signals must preserve the target condition scope.",
      ));
    }
    if (secondaryRefs.includes(action.intended_signal_ref)) {
      errors.push(issue(
        "ACTION_SIGNAL_ROLE_REUSE",
        `/action_hypotheses/${index}`,
        "The intended signal cannot also serve as counter or information-harm evidence.",
      ));
    }
    for (const signalRef of action.counter_signal_refs) {
      if (signals.get(signalRef)?.role !== "counter") {
        errors.push(issue(
          "ACTION_COUNTER_ROLE_MISMATCH",
          `/action_hypotheses/${index}/counter_signal_refs`,
          `${signalRef} is not registered as counter evidence.`,
        ));
      }
    }
    for (const signalRef of action.harm_signal_refs) {
      if (signals.get(signalRef)?.role !== "information-harm") {
        errors.push(issue(
          "ACTION_HARM_ROLE_MISMATCH",
          `/action_hypotheses/${index}/harm_signal_refs`,
          `${signalRef} is not registered as information-harm evidence.`,
        ));
      }
    }

    const actor = actors.get(action.actor_ref);
    if (actor) {
      const capable = actor.capabilities.some((capability) =>
        capability.verb === action.verb &&
        capability.object_class === action.object_class &&
        capability.geographies.includes(action.geography) &&
        capability.services.includes(action.service));
      if (!capable) {
        errors.push(issue(
          "ACTION_CAPABILITY_MISMATCH",
          `/action_hypotheses/${index}`,
          "The proposed action exceeds every caller-asserted actor capability.",
        ));
      }
    }
  }
  return errors;
}

function exactEvidenceStateRef(kernel) {
  const tip = kernel.evidence_events.at(-1);
  return {
    kernel_id: kernel.kernel_id,
    kernel_manifest_hash: kernel.manifest_hash,
    event_count: kernel.evidence_events.length,
    tip_event_id: tip.evidence_event_id,
    tip_event_hash: tip.evidence_event_hash,
    state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
  };
}

function normalizeRegistryEvidenceState(reference) {
  return reference ? {
    kernel_id: reference.kernel_id,
    kernel_manifest_hash: reference.kernel_manifest_hash,
    event_count: reference.evidence_event_count,
    tip_event_id: reference.evidence_tip_event_id,
    tip_event_hash: reference.evidence_tip_event_hash,
    state_hash: reference.evidence_state_hash,
  } : null;
}

function sourceBindingIntegrity(map, {
  sourceKernel,
  sourceEvolution,
  sourceSignalRegistry,
  sourceSignalRegistryArtifactPath,
  sourceSignalRegistryArtifactSha256,
}) {
  const errors = [];
  if (!sourceKernel || !sourceEvolution || !sourceSignalRegistry ||
      !sourceSignalRegistryArtifactPath || !sourceSignalRegistryArtifactSha256) {
    return [issue(
      "AGENCY_SOURCE_BINDINGS_REQUIRED",
      "/",
      "v1.1 validation requires retained kernel, evolution and signal-registry sources",
    )];
  }

  const registryRef = map.signal_registry_ref;
  if (!registryRef || registryRef.registry_id !== sourceSignalRegistry.registry_id ||
      registryRef.schema_version !== sourceSignalRegistry.schema_version ||
      registryRef.artifact_path !== sourceSignalRegistryArtifactPath ||
      registryRef.artifact_sha256 !== sourceSignalRegistryArtifactSha256) {
    errors.push(issue(
      "AGENCY_SIGNAL_REGISTRY_REF_MISMATCH",
      "/signal_registry_ref",
      "the agency map must bind the exact retained signal-registry bytes and identity",
    ));
  }

  const activeStates = sourceKernel.current_state.filter(({ lifecycle }) => lifecycle === "active");
  const definitions = sourceKernel.events.flatMap(({ introduced_definitions: values }) => values);
  const registrySignals = new Map(sourceSignalRegistry.signals.map((signal) => [
    signal.signal_id,
    signal,
  ]));
  const registrySources = new Map(sourceSignalRegistry.sources.map((source) => [
    source.source_id,
    source,
  ]));
  const evolutionConditions = new Map(sourceEvolution.current_state.conditions.map((condition) => [
    condition.condition_definition_ref.condition_id,
    condition,
  ]));
  const registryConditions = new Map(sourceSignalRegistry.condition_bindings.map((binding) => [
    binding.condition_id,
    binding,
  ]));
  const expectedEvidenceState = exactEvidenceStateRef(sourceKernel);
  const historyTip = {
    sequence: sourceEvolution.source_history_ref.tip_sequence,
    event_id: sourceEvolution.source_history_ref.tip_event_id,
    event_hash: sourceEvolution.source_history_ref.tip_event_hash,
  };

  for (const [conditionIndex, condition] of map.conditions.entries()) {
    const canonical = condition.canonical_binding;
    const active = activeStates.find(({ condition_definition_ref: reference }) =>
      reference.condition_id === condition.condition_id);
    const definition = definitions.find(({ definition_hash: hash }) =>
      hash === active?.condition_definition_ref.definition_hash);
    const evolution = evolutionConditions.get(condition.condition_id);
    const registry = registryConditions.get(condition.condition_id);
    if (!active || !definition || !evolution ||
        !canonical || !isDeepStrictEqual(
          canonical.condition_definition_ref,
          active.condition_definition_ref,
        ) || !isDeepStrictEqual(
          evolution.condition_definition_ref,
          active.condition_definition_ref,
        ) || !isDeepStrictEqual(
          registry?.condition_definition_ref,
          active.condition_definition_ref,
        )) {
      errors.push(issue(
        "AGENCY_CONDITION_DEFINITION_MISMATCH",
        `/conditions/${conditionIndex}/canonical_binding/condition_definition_ref`,
        "the agency condition must resolve to one exact active executable definition",
      ));
      continue;
    }
    const expectedEvolutionRef = {
      ledger_id: sourceEvolution.ledger_id,
      schema_version: sourceEvolution.schema_version,
      manifest_hash: sourceEvolution.manifest_hash,
    };
    if (!isDeepStrictEqual(canonical.evolution_ref, expectedEvolutionRef) ||
        !isDeepStrictEqual(canonical.history_tip_ref, historyTip) ||
        registry?.ledger_manifest_hash !== sourceEvolution.manifest_hash ||
        registry?.ledger_tip_event_id !== historyTip.event_id ||
        registry?.ledger_tip_hash !== historyTip.event_hash) {
      errors.push(issue(
        "AGENCY_EVOLUTION_BINDING_MISMATCH",
        `/conditions/${conditionIndex}/canonical_binding/evolution_ref`,
        "evolution identity, complete history tip and condition producer must remain distinct and exact",
      ));
    }
    const registryProducerRef = {
      sequence: canonical.condition_source_event_ref?.sequence,
      event_id: canonical.condition_source_event_ref?.event_id,
      event_hash: canonical.condition_source_event_ref?.event_hash,
    };
    if (!isDeepStrictEqual(canonical.condition_source_event_ref, evolution.source_event_ref) ||
        !isDeepStrictEqual(registryProducerRef, registry.condition_source_event_ref) ||
        condition.ledger_anchor.condition_version !== active.condition_definition_ref.definition_version ||
        condition.ledger_anchor.tip_event_id !== evolution.source_event_ref.event_id ||
        condition.ledger_anchor.tip_hash !== evolution.source_event_ref.event_hash) {
      errors.push(issue(
        "AGENCY_CONDITION_SOURCE_EVENT_MISMATCH",
        `/conditions/${conditionIndex}/canonical_binding/condition_source_event_ref`,
        "the active condition must bind its own producer event rather than borrowing the history tip",
      ));
    }
    if (!isDeepStrictEqual(canonical.evidence_state_ref, expectedEvidenceState) ||
        !isDeepStrictEqual(evolution.evidence_state_ref, {
          event_count: expectedEvidenceState.event_count,
          tip_event_id: expectedEvidenceState.tip_event_id,
          tip_event_hash: expectedEvidenceState.tip_event_hash,
          state_hash: expectedEvidenceState.state_hash,
        }) || !isDeepStrictEqual(
          normalizeRegistryEvidenceState(registry.evidence_state_ref),
          expectedEvidenceState,
        )) {
      errors.push(issue(
        "AGENCY_EVIDENCE_STATE_MISMATCH",
        `/conditions/${conditionIndex}/canonical_binding/evidence_state_ref`,
        "the agency condition must preserve the exact executable evidence-history checkpoint",
      ));
    }
    if (condition.public_if_clause !== renderBoundPublicIfClause(definition)) {
      errors.push(issue(
        "AGENCY_PUBLIC_IF_MISMATCH",
        `/conditions/${conditionIndex}/public_if_clause`,
        "public IF wording must be rendered from the immutable executable claim and PERIOD",
      ));
    }
  }

  if (map.condition_ledger_ref.ledger_id !== sourceEvolution.ledger_id ||
      map.condition_ledger_ref.ledger_version !== sourceEvolution.schema_version ||
      map.condition_ledger_ref.tip_event_id !== historyTip.event_id ||
      map.condition_ledger_ref.tip_hash !== historyTip.event_hash) {
    errors.push(issue(
      "AGENCY_EVOLUTION_BINDING_MISMATCH",
      "/condition_ledger_ref",
      "the agency ledger reference must preserve the complete evolution history tip",
    ));
  }

  for (const [signalIndex, signal] of map.signals.entries()) {
    const registered = registrySignals.get(signal.signal_ref);
    const reference = signal.registered_metric_ref;
    const kind = registered?.executable_binding
      ? "executable-predicate"
      : registered?.supplemental_binding?.kind;
    const link = registered?.condition_links.find(({ condition_id: id, evidence_role: role }) =>
      id === signal.condition_id && role === signal.role);
    const contract = registered?.metric_contract;
    const sourceRecords = (registered?.source_refs || []).map((id) => registrySources.get(id));
    const sourceUris = sourceRecords.map(({ evidence_ref: uri } = {}) => uri).filter(Boolean).sort();
    const processes = [...new Set(sourceRecords
      .map(({ collection_process_id: id } = {}) => id).filter(Boolean))];
    const exactMetric = contract && signal.label === registered.label && link &&
      signal.metric.metric_id === contract.metric_id &&
      signal.metric.measure === contract.measure &&
      signal.metric.unit === contract.unit &&
      signal.metric.denominator === contract.denominator &&
      signal.metric.population === contract.population &&
      signal.metric.geography === contract.geography &&
      signal.metric.period === contract.period &&
      signal.metric.aggregation === contract.aggregation &&
      signal.metric.evaluation_rule === contract.evaluation_rule &&
      processes.length === 1 && signal.metric.collection_process_id === processes[0] &&
      isDeepStrictEqual([...signal.metric.source_refs].sort(), sourceUris);
    const exactReference = reference && reference.registry_id === sourceSignalRegistry.registry_id &&
      reference.signal_id === registered?.signal_id &&
      reference.metric_id === contract?.metric_id &&
      reference.metric_checksum === contract?.metric_checksum &&
      reference.binding_kind === kind &&
      reference.projection_profile === "signal-registry-estimand-to-agency-metric-v1";
    if (!exactMetric || !exactReference) {
      errors.push(issue(
        "AGENCY_REGISTERED_METRIC_MISMATCH",
        `/signals/${signalIndex}`,
        "agency metrics must exactly reproduce a resolvable canonical signal-registry contract",
      ));
    }
  }

  for (const [actionIndex, action] of map.action_hypotheses.entries()) {
    const intended = registrySignals.get(action.intended_signal_ref);
    const counterValid = action.counter_signal_refs.every((signalId) =>
      registrySignals.get(signalId)?.supplemental_binding?.purpose === "counter");
    const harmValid = action.harm_signal_refs.every((signalId) =>
      registrySignals.get(signalId)?.supplemental_binding?.purpose === "information-harm");
    if (!intended?.executable_binding || !counterValid || !harmValid) {
      errors.push(issue(
        "AGENCY_ACTION_SIGNAL_SEMANTICS_MISMATCH",
        `/action_hypotheses/${actionIndex}`,
        "intended action signals must be executable while counter and harm evidence remain supplemental",
      ));
    }
  }
  return errors;
}

export function validateConditionAgencyMap(map, options = {}) {
  const { evaluatedAt } = options;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(REPOSITORY_SCHEMA);
  const schemaValid = validateSchema(map);
  const errors = (validateSchema.errors || []).map((error) => ({
    code: "SCHEMA_INVALID",
    path: error.instancePath,
    message: error.message || "schema validation failed",
    keyword: error.keyword,
  }));

  if (schemaValid) {
    errors.push(...duplicateIssues(map.actors, "actor_ref", "actors"));
    errors.push(...duplicateIssues(map.signals, "signal_ref", "signals"));
    errors.push(...duplicateIssues(map.signals.map(({ metric }) => metric), "metric_id", "signals/metrics"));
    errors.push(...duplicateIssues(map.conditions, "condition_id", "conditions"));
    errors.push(...duplicateIssues(map.provider_plans, "plan_id", "provider_plans"));
    errors.push(...duplicateIssues(map.action_hypotheses, "hypothesis_id", "action_hypotheses"));
    errors.push(...temporalIntegrity(map, evaluatedAt));

    const actors = actorByRef(map);
    const conditions = conditionById(map);
    const signals = new Map(map.signals.map((signal) => [signal.signal_ref, signal]));
    errors.push(...actorReferences(map, new Set(actors.keys())));
    errors.push(...conditionIntegrity(map, new Set(conditions.keys()), signals, actors));
    errors.push(...planIntegrity(map, actors, conditions));
    errors.push(...actionIntegrity(map, actors, conditions, signals));

    if (map.schema_version === "1.1.0") {
      errors.push(...sourceBindingIntegrity(map, options));
    }

    if (!isDeepStrictEqual(map.public_projection, computePublicProjection(map))) {
      errors.push(issue(
        "PUBLIC_PROJECTION_MISMATCH",
        "/public_projection",
        "The public IF, provider WHEN plans, action hypotheses and boundary must be regenerated exactly.",
      ));
    }
  }

  const sourceBindingsVerified = map?.schema_version === "1.1.0" &&
    !errors.some(({ code }) => code.startsWith("AGENCY_") || code === "SCHEMA_INVALID");
  return {
    machine_valid: schemaValid && errors.length === 0,
    schema_valid: schemaValid,
    integrity_valid: schemaValid && errors.length === 0,
    condition_truth_assessed: false,
    actor_identity_verified: false,
    control_verified: false,
    forecast_produced: false,
    commitment_created: false,
    action_authorised: false,
    source_bindings_verified: sourceBindingsVerified,
    errors,
  };
}
