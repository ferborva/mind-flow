import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const DEFAULT_SCHEMA = JSON.parse(readFileSync(
  new URL("./schema/possible-path.schema.json", import.meta.url),
  "utf8",
));

const OPERATIONS = [
  "added",
  "narrowed",
  "split",
  "merged",
  "challenged",
  "satisfied",
  "failed",
  "expired",
  "superseded",
  "disputed",
  "withdrawn",
];

const MATERIAL_CHANGES = new Set(OPERATIONS.filter((operation) => operation !== "added"));
const SIGNAL_ROLES = [
  "leading",
  "confirming",
  "counter",
  "outcome",
  "readiness",
  "intervention-exposure",
  "information-harm",
];

function issue(code, path, message, keyword = "integrity") {
  return { code, path, message, keyword };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function computeOutcomeScopeHash(scope) {
  const value = structuredClone(scope);
  delete value.scope_hash;
  return hash(`mind-flow:possible-path:v1:outcome-scope\n${canonicalJson(value)}`);
}

export function renderPublicClaimCeiling(path) {
  const scope = path.outcome_scope;
  const conditions = scope.if_conditions
    .map(({ public_condition: publicCondition }) => publicCondition)
    .join("; and if ");
  return `Synthetic possible path, not a finding: ${scope.who} may ${scope.verb} ${scope.object} at ${scope.standard}, in ${scope.place}, during ${scope.period}, only if ${conditions}. This open-world hypothesis is unscored and grants no action authority.`;
}

function duplicateIssues(items, key, path) {
  const seen = new Set();
  const errors = [];
  for (const [index, item] of items.entries()) {
    if (seen.has(item[key])) {
      errors.push(issue("DUPLICATE_ID", `/${path}/${index}/${key}`, `${item[key]} is duplicated`));
    }
    seen.add(item[key]);
  }
  return errors;
}

function exactSet(values, expected) {
  return values.length === expected.length
    && new Set(values).size === expected.length
    && expected.every((value) => values.includes(value));
}

function anchorBinding(anchor, outcomeScopeHash) {
  return {
    condition_id: anchor.condition_id,
    ledger_ref: anchor.ledger_ref,
    ledger_manifest_hash: anchor.ledger_manifest_hash,
    condition_version: anchor.condition_version,
    as_of_sequence: anchor.as_of_sequence,
    as_of_event_id: anchor.as_of_event_id,
    as_of_event_hash: anchor.as_of_event_hash,
    outcome_scope_hash: outcomeScopeHash,
  };
}

function publicNarrativeStrings(path) {
  return [
    path.title,
    path.hypothesis_summary,
    ...(path.graph?.nodes || []).flatMap((node) => [node.label]),
    ...(path.graph?.edges || []).flatMap((edge) => [
      edge.label,
      edge.branches?.if_true?.public_explanation,
      edge.branches?.if_false?.public_explanation,
      edge.branches?.if_unknown?.public_explanation,
    ]),
    path.strongest_competing_path?.label,
    path.strongest_competing_path?.selection_reason,
    path.strongest_competing_path?.incompatible_claim,
    ...(path.strongest_competing_path?.discriminating_observations || []).flatMap((observation) => [
      observation.construct,
      observation.possible_path_pattern,
      observation.competing_path_pattern,
    ]),
    path.abandonment?.public_notice,
  ].filter((value) => typeof value === "string");
}

export function validatePossiblePath(path, { schema = DEFAULT_SCHEMA } = {}) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);
  const schemaValid = validateSchema(path);
  const errors = (validateSchema.errors || []).map((error) => ({
    ...error,
    code: "SCHEMA_INVALID",
    path: error.instancePath,
    message: error.message || "schema validation failed",
  }));

  const boundaries = {
    path_truth_assessed: false,
    forecast_produced: false,
    probability_produced: false,
    crisis_verdict_produced: false,
    authority_verified: false,
    action_authorised: false,
  };

  if (!schemaValid) {
    return {
      machine_valid: false,
      schema_valid: false,
      integrity_valid: false,
      boundaries,
      public_claim_ceiling: null,
      errors,
    };
  }

  const expectedScopeHash = computeOutcomeScopeHash(path.outcome_scope);
  if (path.outcome_scope.scope_hash !== expectedScopeHash) {
    errors.push(issue(
      "OUTCOME_SCOPE_HASH_MISMATCH",
      "/outcome_scope/scope_hash",
      "WHO VERB OBJECT STANDARD PLACE PERIOD IF must be resealed together",
    ));
  }

  errors.push(...duplicateIssues(path.condition_anchors, "condition_id", "condition_anchors"));
  errors.push(...duplicateIssues(path.condition_evolution_policies, "condition_id", "condition_evolution_policies"));
  errors.push(...duplicateIssues(path.graph.nodes, "node_id", "graph/nodes"));
  errors.push(...duplicateIssues(path.graph.edges, "edge_id", "graph/edges"));
  errors.push(...duplicateIssues(
    path.population_accounting.affected_populations,
    "population_id",
    "population_accounting/affected_populations",
  ));

  const conditionIds = path.outcome_scope.if_conditions
    .map(({ condition_id: conditionId }) => conditionId);
  if (new Set(conditionIds).size !== conditionIds.length) {
    errors.push(issue(
      "DUPLICATE_OUTCOME_CONDITION",
      "/outcome_scope/if_conditions",
      "each IF condition can appear only once in the public outcome scope",
    ));
  }
  const anchorIds = path.condition_anchors.map(({ condition_id: conditionId }) => conditionId);
  const policyIds = path.condition_evolution_policies.map(({ condition_id: conditionId }) => conditionId);
  if (!exactSet(anchorIds, conditionIds)) {
    errors.push(issue(
      "CONDITION_ANCHOR_COVERAGE_INVALID",
      "/condition_anchors",
      "every and only the IF conditions in the outcome scope need one anchor",
    ));
  }
  if (!exactSet(policyIds, conditionIds)) {
    errors.push(issue(
      "CONDITION_POLICY_COVERAGE_INVALID",
      "/condition_evolution_policies",
      "every and only the bound IF conditions need one evolution policy",
    ));
  }
  if (!exactSet(path.signal_portfolio.condition_ids, conditionIds)) {
    errors.push(issue(
      "SIGNAL_CONDITION_COVERAGE_INVALID",
      "/signal_portfolio/condition_ids",
      "the signal portfolio must name every and only the bound IF conditions",
    ));
  }

  const anchorById = new Map(path.condition_anchors.map((anchor) => [anchor.condition_id, anchor]));
  for (const [conditionIndex, condition] of path.outcome_scope.if_conditions.entries()) {
    const anchor = anchorById.get(condition.condition_id);
    if (anchor && anchor.rendered_if !== `IF ${condition.public_condition}`) {
      errors.push(issue(
        "PUBLIC_IF_ANCHOR_MISMATCH",
        `/outcome_scope/if_conditions/${conditionIndex}/public_condition`,
        "the public IF clause must reproduce the exact anchored condition wording",
      ));
    }
  }
  const nodeById = new Map(path.graph.nodes.map((node) => [node.node_id, node]));
  const populationIds = new Set(path.population_accounting.affected_populations
    .map(({ population_id: populationId }) => populationId));

  if (!nodeById.has(path.graph.entry_node_id)) {
    errors.push(issue("UNRESOLVED_ENTRY_NODE", "/graph/entry_node_id", "entry node does not resolve"));
  }

  for (const [nodeIndex, node] of path.graph.nodes.entries()) {
    for (const populationId of node.affected_population_ids) {
      if (!populationIds.has(populationId)) {
        errors.push(issue(
          "UNRESOLVED_AFFECTED_POPULATION",
          `/graph/nodes/${nodeIndex}/affected_population_ids`,
          `${populationId} is not in affected population accounting`,
        ));
      }
    }
  }

  const boundOnEdges = new Set();
  for (const [edgeIndex, edge] of path.graph.edges.entries()) {
    for (const [field, nodeId] of [
      ["from_node_id", edge.from_node_id],
      ["to_node_id", edge.to_node_id],
    ]) {
      if (!nodeById.has(nodeId)) {
        errors.push(issue(
          "UNRESOLVED_EDGE_NODE",
          `/graph/edges/${edgeIndex}/${field}`,
          `${nodeId} does not resolve`,
        ));
      }
    }
    const bindingIds = edge.condition_bindings.map(({ condition_id: conditionId }) => conditionId);
    if (new Set(bindingIds).size !== bindingIds.length) {
      errors.push(issue(
        "DUPLICATE_EDGE_CONDITION",
        `/graph/edges/${edgeIndex}/condition_bindings`,
        "an edge cannot count the same condition more than once",
      ));
    }
    for (const [bindingIndex, binding] of edge.condition_bindings.entries()) {
      boundOnEdges.add(binding.condition_id);
      const anchor = anchorById.get(binding.condition_id);
      if (!anchor) {
        errors.push(issue(
          "UNRESOLVED_EDGE_CONDITION",
          `/graph/edges/${edgeIndex}/condition_bindings/${bindingIndex}/condition_id`,
          `${binding.condition_id} does not resolve to a path anchor`,
        ));
      } else if (!isDeepStrictEqual(binding, anchorBinding(anchor, expectedScopeHash))) {
        errors.push(issue(
          "EDGE_SCOPE_BINDING_MISMATCH",
          `/graph/edges/${edgeIndex}/condition_bindings/${bindingIndex}`,
          "edge binding must reproduce the condition anchor and complete outcome-scope hash",
        ));
      }
    }
    for (const [branchName, requiredAction] of [
      ["if_true", "human-decision-required"],
      ["if_false", "block-edge-traversal"],
      ["if_unknown", "block-edge-traversal"],
    ]) {
      const branch = edge.branches[branchName];
      if (!nodeById.has(branch.target_node_id)) {
        errors.push(issue(
          "UNRESOLVED_BRANCH_NODE",
          `/graph/edges/${edgeIndex}/branches/${branchName}/target_node_id`,
          `${branch.target_node_id} does not resolve`,
        ));
      }
      if (branch.action !== requiredAction) {
        errors.push(issue(
          "FAIL_CLOSED_BRANCH_INVALID",
          `/graph/edges/${edgeIndex}/branches/${branchName}/action`,
          `${branchName} must use ${requiredAction}`,
        ));
      }
    }
    if (edge.branches.if_true.target_node_id !== edge.to_node_id) {
      errors.push(issue(
        "TRUE_BRANCH_TARGET_MISMATCH",
        `/graph/edges/${edgeIndex}/branches/if_true/target_node_id`,
        "the explicit true branch must name the proposed edge destination",
      ));
    }
    for (const branchName of ["if_false", "if_unknown"]) {
      if (edge.branches[branchName].target_node_id === edge.to_node_id) {
        errors.push(issue(
          "BLOCKED_BRANCH_TARGET_MISMATCH",
          `/graph/edges/${edgeIndex}/branches/${branchName}/target_node_id`,
          `${branchName} cannot quietly target the edge destination while claiming to block traversal`,
        ));
      }
    }
  }
  for (const conditionId of conditionIds) {
    if (!boundOnEdges.has(conditionId)) {
      errors.push(issue(
        "UNUSED_PATH_CONDITION",
        "/graph/edges",
        `${conditionId} is in the public IF scope but no consequential edge binds it`,
      ));
    }
  }

  for (const [policyIndex, policy] of path.condition_evolution_policies.entries()) {
    const anchor = anchorById.get(policy.condition_id);
    if (anchor && (
      policy.ledger_ref !== anchor.ledger_ref
      || policy.ledger_manifest_hash !== anchor.ledger_manifest_hash
      || policy.anchor_event_hash !== anchor.as_of_event_hash
    )) {
      errors.push(issue(
        "EVOLUTION_POLICY_ANCHOR_MISMATCH",
        `/condition_evolution_policies/${policyIndex}`,
        "evolution policy must bind the exact condition ledger and event anchor",
      ));
    }
    const operations = policy.on_event.map(({ operation }) => operation);
    if (!exactSet(operations, OPERATIONS)) {
      errors.push(issue(
        "EVOLUTION_MATRIX_INCOMPLETE",
        `/condition_evolution_policies/${policyIndex}/on_event`,
        "the policy must cover each closed evolution operation exactly once",
      ));
    }
    for (const [eventIndex, eventPolicy] of policy.on_event.entries()) {
      if (MATERIAL_CHANGES.has(eventPolicy.operation) && eventPolicy.disposition !== "fail-closed") {
        errors.push(issue(
          "CONDITION_CHANGE_LAUNDERING",
          `/condition_evolution_policies/${policyIndex}/on_event/${eventIndex}/disposition`,
          `${eventPolicy.operation} changes a bound condition and must stop this path pending re-registration`,
        ));
      }
      if (eventPolicy.disposition === "fail-closed" && eventPolicy.out_of_scope_proof) {
        errors.push(issue(
          "OUT_OF_SCOPE_PROOF_CONTRADICTS_DISPOSITION",
          `/condition_evolution_policies/${policyIndex}/on_event/${eventIndex}/out_of_scope_proof`,
          "a fail-closed event cannot also claim no effect",
        ));
      }
    }
  }

  const declaredRoles = path.signal_portfolio.roles.map(({ role }) => role);
  if (!exactSet(declaredRoles, SIGNAL_ROLES)) {
    errors.push(issue(
      "SIGNAL_ROLE_COVERAGE_INVALID",
      "/signal_portfolio/roles",
      "each of the seven signal roles must be assigned or unresolved exactly once",
    ));
  }
  const signalRoles = new Map();
  for (const role of path.signal_portfolio.roles) {
    if (role.status === "assigned" && role.unresolved_reason) {
      errors.push(issue(
        "SIGNAL_ROLE_STATUS_CONTRADICTION",
        "/signal_portfolio/roles",
        `${role.role} cannot be assigned and unresolved together`,
      ));
    }
    if (role.status === "unresolved" && role.signal_ids) {
      errors.push(issue(
        "SIGNAL_ROLE_STATUS_CONTRADICTION",
        "/signal_portfolio/roles",
        `${role.role} cannot be unresolved while assigning signals`,
      ));
    }
    for (const signalId of role.signal_ids || []) {
      const prior = signalRoles.get(signalId) || [];
      prior.push(role.role);
      signalRoles.set(signalId, prior);
    }
  }
  for (const [signalId, roles] of signalRoles.entries()) {
    if (new Set(roles).size > 1) {
      errors.push(issue(
        "SIGNAL_ROLE_REUSE",
        "/signal_portfolio/roles",
        `${signalId} is laundered across roles ${roles.join(", ")}`,
      ));
    }
  }

  if (path.strongest_competing_path.path_id === path.path_id) {
    errors.push(issue(
      "COMPETING_PATH_NOT_DISTINCT",
      "/strongest_competing_path/path_id",
      "the strongest competing path must have a distinct identity",
    ));
  }

  const forbidden = /\b(?:forecast|probability|likelihood|inevitable|crisis)\b|\d+(?:\.\d+)?\s*%/i;
  for (const [index, value] of publicNarrativeStrings(path).entries()) {
    if (forbidden.test(value)) {
      errors.push(issue(
        "FORBIDDEN_VERDICT_LANGUAGE",
        `/public_narrative/${index}`,
        "possible-path narrative cannot present forecast, probability or crisis-verdict language",
      ));
    }
  }

  const expectedCeiling = renderPublicClaimCeiling(path);
  if (path.public_claim_ceiling !== expectedCeiling) {
    errors.push(issue(
      "PUBLIC_CLAIM_CEILING_MISMATCH",
      "/public_claim_ceiling",
      "the public claim ceiling must be generated from the complete typed outcome scope",
    ));
  }

  const integrityValid = errors.length === 0;
  return {
    machine_valid: schemaValid && integrityValid,
    schema_valid: schemaValid,
    integrity_valid: integrityValid,
    boundaries,
    public_claim_ceiling: expectedCeiling,
    errors,
  };
}
