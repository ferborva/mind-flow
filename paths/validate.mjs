import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  computeEvidenceStateHash,
  evaluateKernelCondition,
} from "../contracts/executable-if/validate.mjs";

const DEFAULT_SCHEMA_BYTES = readFileSync(
  new URL("./schema/possible-path.schema.json", import.meta.url),
);
const DEFAULT_SCHEMA_SHA256 = "85d9703b285913253fe4ef30ea66a312e1d8532f28327b0fd6abcb790dac6bce";
const actualSchemaSha256 = createHash("sha256").update(DEFAULT_SCHEMA_BYTES).digest("hex");
if (actualSchemaSha256 !== DEFAULT_SCHEMA_SHA256) {
  throw new Error("possible-path schema bytes do not match the validator's pinned contract digest");
}
const DEFAULT_SCHEMA = JSON.parse(DEFAULT_SCHEMA_BYTES.toString("utf8"));

const OPERATIONS_V1 = [
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
const OPERATIONS_V2 = [
  "added",
  "narrowed",
  "definition-revised",
  "split",
  "merge",
  "challenged",
  "satisfied",
  "failed",
  "expired",
  "superseded",
  "disputed",
  "withdrawn",
];

const MATERIAL_CHANGES = new Set([...OPERATIONS_V1, ...OPERATIONS_V2]
  .filter((operation) => operation !== "added"));
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

export function computeCanonicalBindingHash(binding) {
  return hash(`mind-flow:possible-path:v1:canonical-binding\n${canonicalJson(binding)}`);
}

export function renderPublicClaimCeiling(path) {
  const scope = path.outcome_scope;
  const conditions = scope.if_conditions
    .map(({ public_condition: publicCondition }) => publicCondition)
    .join("; and if ");
  const affected = path.population_accounting.affected_populations
    .map(({ label }) => label)
    .join("; ");
  const omissions = path.population_accounting.omissions.entries.length > 0
    ? path.population_accounting.omissions.entries.map(({ public_notice }) => public_notice).join(" ")
    : `No omitted population was identified by this limited search: ${path.population_accounting.omissions.search_limitations}`;
  const competitors = path.competing_paths.map(({ label }) => label).join("; ");
  const outcome = path.schema_version === "1.2"
    ? `${scope.who} may ${scope.verb} ${scope.object} to the following standard: ${scope.standard}`
    : `${scope.who} may ${scope.verb} ${scope.object} at ${scope.standard}`;
  return `Synthetic possible path, not a finding: ${outcome}, in ${scope.place}, during ${scope.period}, only if ${conditions}. Affected populations: ${affected}. Scope omissions: ${omissions} Named competing paths: ${competitors}. This open-world hypothesis is unscored and grants no action authority.`;
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
  const binding = {
    condition_id: anchor.condition_id,
    ledger_ref: anchor.ledger_ref,
    ledger_manifest_hash: anchor.ledger_manifest_hash,
    condition_version: anchor.condition_version,
    as_of_sequence: anchor.as_of_sequence,
    as_of_event_id: anchor.as_of_event_id,
    as_of_event_hash: anchor.as_of_event_hash,
    outcome_scope_hash: outcomeScopeHash,
  };
  if (anchor.canonical_binding_hash) {
    binding.canonical_binding_hash = anchor.canonical_binding_hash;
  }
  return binding;
}

function publicNarrativeStrings(path) {
  return [
    path.title,
    path.hypothesis_summary,
    path.outcome_scope?.who,
    path.outcome_scope?.verb,
    path.outcome_scope?.object,
    path.outcome_scope?.standard,
    path.outcome_scope?.place,
    path.outcome_scope?.period,
    ...(path.outcome_scope?.if_conditions || []).map(({ public_condition: publicCondition }) =>
      publicCondition),
    ...(path.graph?.nodes || []).flatMap((node) => [node.label]),
    ...(path.graph?.edges || []).flatMap((edge) => [
      edge.label,
      edge.branches?.if_true?.public_explanation,
      edge.branches?.if_false?.public_explanation,
      edge.branches?.if_unknown?.public_explanation,
      edge.branches?.if_stale?.public_explanation,
      edge.branches?.if_conflicted?.public_explanation,
    ]),
    ...(path.competing_paths || []).flatMap((competitor) => [
      competitor.label,
      competitor.selection_reason,
      competitor.incompatible_claim,
      ...competitor.discriminating_observations.flatMap((observation) => [
        observation.construct,
        observation.possible_path_pattern,
        observation.competing_path_pattern,
      ]),
    ]),
    path.abandonment?.public_notice,
    ...(path.population_accounting?.affected_populations || []).map(({ label }) => label),
    ...(path.population_accounting?.omissions?.entries || []).map(({ public_notice: notice }) => notice),
  ].filter((value) => typeof value === "string");
}

function graphIntegrityIssues(path, conditionIds, nodeById) {
  const errors = [];
  const outgoing = new Map(path.graph.nodes.map(({ node_id: nodeId }) => [nodeId, []]));
  for (const edge of path.graph.edges) {
    if (outgoing.has(edge.from_node_id) && nodeById.has(edge.to_node_id)) {
      outgoing.get(edge.from_node_id).push(edge);
    }
  }

  for (const node of path.graph.nodes) {
    if (node.kind === "abandonment" && outgoing.get(node.node_id).length > 0) {
      errors.push(issue(
        "ABANDONMENT_NOT_SINK",
        "/graph/edges",
        `${node.node_id} is an abandonment node and cannot have outgoing edges`,
      ));
    }
    if (node.kind === "outcome" && outgoing.get(node.node_id).length > 0) {
      errors.push(issue(
        "OUTCOME_NOT_SINK",
        "/graph/edges",
        `${node.node_id} is an outcome node and cannot have outgoing edges`,
      ));
    }
  }

  for (const [edgeIndex, edge] of path.graph.edges.entries()) {
    const blockedBranches = path.schema_version === "1.2"
      ? ["if_false", "if_unknown", "if_stale", "if_conflicted"]
      : ["if_false", "if_unknown"];
    for (const branchName of blockedBranches) {
      const branch = edge.branches[branchName];
      if (!branch) continue;
      const target = nodeById.get(branch.target_node_id);
      if (target && (target.kind !== "abandonment" || outgoing.get(target.node_id).length > 0)) {
        errors.push(issue(
          "BLOCKED_BRANCH_NOT_TERMINAL",
          `/graph/edges/${edgeIndex}/branches/${branchName}/target_node_id`,
          `${branchName} must terminate at an abandonment sink`,
        ));
      }
    }
  }

  const colour = new Map();
  let cycleFound = false;
  function detectCycle(nodeId) {
    colour.set(nodeId, "visiting");
    for (const edge of outgoing.get(nodeId) || []) {
      const nextColour = colour.get(edge.to_node_id);
      if (nextColour === "visiting") cycleFound = true;
      else if (nextColour !== "visited") detectCycle(edge.to_node_id);
    }
    colour.set(nodeId, "visited");
  }
  for (const nodeId of outgoing.keys()) {
    if (!colour.has(nodeId)) detectCycle(nodeId);
  }
  if (cycleFound) {
    errors.push(issue(
      "GRAPH_CYCLE",
      "/graph/edges",
      "possible-path traversal must be acyclic so every consequential route can be checked",
    ));
  }

  let reachedOutcome = false;
  const visited = new Set();
  function inspectRoutes(nodeId, accumulated) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const routeKey = `${nodeId}\n${[...accumulated].sort().join("\n")}`;
    if (visited.has(routeKey)) return;
    visited.add(routeKey);
    if (node.kind === "outcome") {
      reachedOutcome = true;
      if (!exactSet([...accumulated], conditionIds)) {
        errors.push(issue(
          "OUTCOME_ROUTE_CONDITION_COVERAGE_INVALID",
          "/graph/edges",
          `${nodeId} is reachable without every registered IF condition`,
        ));
      }
      return;
    }
    for (const edge of outgoing.get(nodeId) || []) {
      const nextConditions = new Set(accumulated);
      for (const binding of edge.condition_bindings) nextConditions.add(binding.condition_id);
      inspectRoutes(edge.to_node_id, nextConditions);
    }
  }
  inspectRoutes(path.graph.entry_node_id, new Set());
  if (!reachedOutcome) {
    errors.push(issue(
      "OUTCOME_UNREACHABLE",
      "/graph/entry_node_id",
      "the entry node must have at least one explicit route to an outcome",
    ));
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

function evaluationProjection(evaluation) {
  return {
    evaluated_at: evaluation.evaluated_at,
    evaluator_ref: evaluation.evaluator_ref,
    condition_definition_ref: evaluation.condition_definition_ref,
    observation_hashes: evaluation.observation_hashes,
    mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
    computed_rule_state: evaluation.computed_rule_state,
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    kernel_manifest_hash: evaluation.kernel_manifest_hash,
    evidence_state_hash: evaluation.evidence_state_hash,
    evaluation_hash: evaluation.evaluation_hash,
  };
}

function exactSourceRefs({ sourceKernel, sourceEvolution, sourceSignalRegistry, sourceAgencyMap }) {
  return {
    kernel: {
      id: sourceKernel.document.kernel_id,
      artifact_path: sourceKernel.path,
      artifact_sha256: sourceKernel.sha256,
      manifest_hash: sourceKernel.document.manifest_hash,
    },
    evolution: {
      id: sourceEvolution.document.ledger_id,
      artifact_path: sourceEvolution.path,
      artifact_sha256: sourceEvolution.sha256,
      manifest_hash: sourceEvolution.document.manifest_hash,
    },
    signal_registry: {
      id: sourceSignalRegistry.document.registry_id,
      artifact_path: sourceSignalRegistry.path,
      artifact_sha256: sourceSignalRegistry.sha256,
    },
    agency_map: {
      id: sourceAgencyMap.document.id,
      artifact_path: sourceAgencyMap.path,
      artifact_sha256: sourceAgencyMap.sha256,
      outcome_scope_hash: sourceAgencyMap.document.outcome_scope.scope_hash,
    },
  };
}

function sourceBindingIntegrity(path, sources) {
  const errors = [];
  const sourceValues = [
    sources.sourceKernel,
    sources.sourceEvolution,
    sources.sourceSignalRegistry,
    sources.sourceAgencyMap,
  ];
  if (sourceValues.some((source) => !source?.document || !source?.path || !source?.sha256)) {
    return [issue(
      "PATH_SOURCE_BINDINGS_REQUIRED",
      "/source_refs",
      "v1.2 validation requires retained kernel, evolution, signal-registry and agency-map sources",
    )];
  }

  const kernel = sources.sourceKernel.document;
  const evolution = sources.sourceEvolution.document;
  const registry = sources.sourceSignalRegistry.document;
  const agency = sources.sourceAgencyMap.document;
  if (!isDeepStrictEqual(path.source_refs, exactSourceRefs(sources))) {
    errors.push(issue(
      "PATH_SOURCE_REF_MISMATCH",
      "/source_refs",
      "the path must bind the exact retained source artifact identities and bytes",
    ));
  }

  const expectedOutcome = {
    who: agency.outcome_scope.people,
    verb: agency.outcome_scope.verb,
    object: agency.outcome_scope.object,
    standard: agency.outcome_scope.standard,
    place: agency.outcome_scope.place,
    period: agency.outcome_scope.period,
    if_conditions: agency.conditions.map((condition) => ({
      condition_id: condition.condition_id,
      public_condition: condition.public_if_clause,
    })),
  };
  const pathOutcome = structuredClone(path.outcome_scope);
  delete pathOutcome.scope_hash;
  if (!isDeepStrictEqual(pathOutcome, expectedOutcome)) {
    errors.push(issue(
      "PATH_SCOPE_MISMATCH",
      "/outcome_scope",
      "the path must reproduce the complete agency WHO VERB OBJECT STANDARD PLACE PERIOD IF scope",
    ));
  }

  const kernelDefinitions = kernel.events.flatMap(({ introduced_definitions: values }) => values);
  const evolutionById = new Map(evolution.current_state.conditions.map((condition) => [
    condition.condition_definition_ref.condition_id,
    condition,
  ]));
  const registryById = new Map(registry.condition_bindings.map((binding) => [
    binding.condition_id,
    binding,
  ]));
  const evidenceState = exactEvidenceStateRef(kernel);
  const historyTip = {
    sequence: evolution.source_history_ref.tip_sequence,
    event_id: evolution.source_history_ref.tip_event_id,
    event_hash: evolution.source_history_ref.tip_event_hash,
  };

  for (const [anchorIndex, anchor] of path.condition_anchors.entries()) {
    const canonical = anchor.canonical_binding;
    const active = kernel.current_state.find(({ lifecycle, condition_definition_ref: reference }) =>
      lifecycle === "active" && reference.condition_id === anchor.condition_id);
    const definition = kernelDefinitions.find(({ definition_hash: value }) =>
      value === active?.condition_definition_ref.definition_hash);
    const evolutionCondition = evolutionById.get(anchor.condition_id);
    const registryCondition = registryById.get(anchor.condition_id);
    if (!active || !definition || !evolutionCondition || !registryCondition || !canonical ||
        !isDeepStrictEqual(canonical.condition_definition_ref, active.condition_definition_ref) ||
        !isDeepStrictEqual(evolutionCondition.condition_definition_ref, active.condition_definition_ref) ||
        !isDeepStrictEqual(registryCondition.condition_definition_ref, active.condition_definition_ref)) {
      errors.push(issue(
        "PATH_CONDITION_REF_MISMATCH",
        `/condition_anchors/${anchorIndex}/canonical_binding/condition_definition_ref`,
        "the path must bind one exact active executable condition definition",
      ));
      continue;
    }
    if (canonical.evolution_manifest_hash !== evolution.manifest_hash ||
        !isDeepStrictEqual(canonical.history_tip_ref, historyTip) ||
        !isDeepStrictEqual(canonical.condition_source_event_ref, evolutionCondition.source_event_ref)) {
      errors.push(issue(
        "PATH_EVOLUTION_REF_MISMATCH",
        `/condition_anchors/${anchorIndex}/canonical_binding`,
        "history tip, condition producer and evolution manifest must remain exact and distinct",
      ));
    }
    if (!isDeepStrictEqual(canonical.evidence_state_ref, evidenceState)) {
      errors.push(issue(
        "PATH_EVIDENCE_STATE_MISMATCH",
        `/condition_anchors/${anchorIndex}/canonical_binding/evidence_state_ref`,
        "the path must preserve the exact executable evidence checkpoint",
      ));
    }
    const computed = evaluationProjection(evaluateKernelCondition(kernel, anchor.condition_id, {
      evaluatedAt: canonical.evaluation_ref?.evaluated_at,
    }));
    if (!isDeepStrictEqual(canonical.evaluation_ref, computed)) {
      errors.push(issue(
        "PATH_EVALUATION_RECEIPT_MISMATCH",
        `/condition_anchors/${anchorIndex}/canonical_binding/evaluation_ref`,
        "the visible five-state result must equal a fresh executable-kernel evaluation receipt",
      ));
    }
    if (anchor.canonical_binding_hash !== computeCanonicalBindingHash(canonical)) {
      errors.push(issue(
        "PATH_CANONICAL_BINDING_HASH_MISMATCH",
        `/condition_anchors/${anchorIndex}/canonical_binding_hash`,
        "the complete condition, history, evidence and evaluation binding must be resealed together",
      ));
    }
  }

  const registrySignals = new Map(registry.signals.map((signal) => [signal.signal_id, signal]));
  const agencySignals = new Map(agency.signals.map((signal) => [signal.signal_ref, signal]));
  for (const [roleIndex, role] of path.signal_portfolio.roles.entries()) {
    if (role.status === "unresolved") {
      if (role.registered_signal_refs) {
        errors.push(issue(
          "PATH_SIGNAL_REF_MISMATCH",
          `/signal_portfolio/roles/${roleIndex}`,
          "an unresolved role cannot carry registered signal claims",
        ));
      }
      continue;
    }
    const refs = role.registered_signal_refs || [];
    const refIds = refs.map(({ signal_id: signalId }) => signalId);
    if (!exactSet(refIds, role.signal_ids)) {
      errors.push(issue(
        "PATH_SIGNAL_REF_MISMATCH",
        `/signal_portfolio/roles/${roleIndex}`,
        "every assigned signal ID must have one exact canonical metric reference",
      ));
      continue;
    }
    for (const reference of refs) {
      const registered = registrySignals.get(reference.signal_id);
      const agencySignal = agencySignals.get(reference.signal_id);
      const bindingKind = registered?.executable_binding?.kind ||
        registered?.supplemental_binding?.kind;
      const matchingRole = registered?.condition_links.some(({ condition_id: conditionId, evidence_role: evidenceRole }) =>
        path.signal_portfolio.condition_ids.includes(conditionId) && evidenceRole === role.role);
      if (!registered || !agencySignal || !matchingRole ||
          reference.metric_id !== registered.metric_contract?.metric_id ||
          reference.metric_checksum !== registered.metric_contract?.metric_checksum ||
          reference.metric_checksum !== agencySignal.registered_metric_ref?.metric_checksum ||
          reference.binding_kind !== bindingKind) {
        errors.push(issue(
          "PATH_SIGNAL_REF_MISMATCH",
          `/signal_portfolio/roles/${roleIndex}/registered_signal_refs`,
          "path signals must resolve to the exact registered role, binding kind and metric contract",
        ));
      }
    }
  }
  return errors;
}

export function validatePossiblePath(path, sources = {}) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(DEFAULT_SCHEMA);
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

  if (path?.governance?.auto_action !== false
      || path?.governance?.authority_status !== "externally-unverified"
      || path?.governance?.action_authorised !== false
      || path?.governance?.human_decision_required !== true
      || path?.governance?.owner_ref !== null) {
    errors.push(issue(
      "AUTHORITY_BOUNDARY_INVALID",
      "/governance",
      "possible paths cannot grant or verify action authority",
    ));
  }

  if (!schemaValid) {
    return {
      machine_valid: false,
      schema_valid: false,
      integrity_valid: false,
      boundaries,
      public_claim_ceiling: null,
      public_narrative: {
        deterministic_text: null,
        publication_status: "human-review-required",
      },
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
    const requiredBranches = [
      ["if_true", "human-decision-required", "human-review"],
      ["if_false", "block-edge-traversal", "repair-or-alternate"],
      ["if_unknown", "block-edge-traversal", "acquire-missing-evidence"],
      ...(path.schema_version === "1.2" ? [
        ["if_stale", "block-edge-traversal", "refresh-and-re-evaluate"],
        ["if_conflicted", "block-edge-traversal", "adjudicate-conflict"],
      ] : []),
    ];
    if (path.schema_version === "1.2" &&
        !exactSet(Object.keys(edge.branches), requiredBranches.map(([name]) => name))) {
      errors.push(issue(
        "PATH_FIVE_STATE_BRANCHES_INCOMPLETE",
        `/graph/edges/${edgeIndex}/branches`,
        "true, false, unknown, stale and conflicted must each remain explicit",
      ));
    }
    for (const [branchName, requiredAction, requiredRecovery] of requiredBranches) {
      const branch = edge.branches[branchName];
      if (!branch) continue;
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
      if (path.schema_version === "1.2" && branch.recovery !== requiredRecovery) {
        errors.push(issue(
          "PATH_STATE_RECOVERY_MISMATCH",
          `/graph/edges/${edgeIndex}/branches/${branchName}/recovery`,
          `${branchName} must preserve its distinct ${requiredRecovery} recovery path`,
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
    for (const branchName of requiredBranches.slice(1).map(([name]) => name)) {
      if (edge.branches[branchName]?.target_node_id === edge.to_node_id) {
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
  errors.push(...graphIntegrityIssues(path, conditionIds, nodeById));

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
    const expectedOperations = path.schema_version === "1.2" ? OPERATIONS_V2 : OPERATIONS_V1;
    if (!exactSet(operations, expectedOperations)) {
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
    if (path.schema_version === "1.2" && role.status === "assigned" &&
        !role.registered_signal_refs) {
      errors.push(issue(
        "PATH_SIGNAL_REF_MISMATCH",
        "/signal_portfolio/roles",
        `${role.role} must bind exact registered signal and metric identities`,
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

  const competitorIds = path.competing_paths.map(({ path_id: pathId }) => pathId);
  if (new Set(competitorIds).size !== competitorIds.length) {
    errors.push(issue(
      "DUPLICATE_COMPETING_PATH",
      "/competing_paths",
      "every named competing path must have a distinct identity",
    ));
  }
  if (competitorIds.includes(path.path_id)) {
    errors.push(issue(
      "COMPETING_PATH_NOT_DISTINCT",
      "/competing_paths",
      "a competing path cannot reuse the candidate path identity",
    ));
  }
  if (!competitorIds.includes(path.strongest_competing_path_id)) {
    errors.push(issue(
      "UNRESOLVED_STRONGEST_COMPETING_PATH",
      "/strongest_competing_path_id",
      "the strongest competing path selection must resolve to one named competitor",
    ));
  }

  const forbidden = /\b(?:forecast|probability|likelihood|inevitable|crisis|chance|odds)\b|\d+(?:\.\d+)?\s*%|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:in|out of)\s+(?:ten|hundred|thousand|\d+)\b|\b(?:most|a majority of)\s+(?:cases|people|workers|outcomes|events|paths)\b|\b(?:0|1)?\.\d+\b/i;
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

  if (path.schema_version === "1.2") {
    errors.push(...sourceBindingIntegrity(path, sources));
  }

  const integrityValid = errors.length === 0;
  const sourceBindingsVerified = path.schema_version === "1.2" &&
    !errors.some(({ code }) => code.startsWith("PATH_") && [
      "PATH_SOURCE_BINDINGS_REQUIRED",
      "PATH_SOURCE_REF_MISMATCH",
      "PATH_SCOPE_MISMATCH",
      "PATH_CONDITION_REF_MISMATCH",
      "PATH_EVOLUTION_REF_MISMATCH",
      "PATH_EVIDENCE_STATE_MISMATCH",
      "PATH_EVALUATION_RECEIPT_MISMATCH",
      "PATH_CANONICAL_BINDING_HASH_MISMATCH",
      "PATH_SIGNAL_REF_MISMATCH",
    ].includes(code));
  return {
    machine_valid: schemaValid && integrityValid,
    schema_valid: schemaValid,
    integrity_valid: integrityValid,
    source_bindings_verified: sourceBindingsVerified,
    boundaries,
    public_claim_ceiling: expectedCeiling,
    public_narrative: {
      deterministic_text: expectedCeiling,
      publication_status: "human-review-required",
    },
    errors,
  };
}
