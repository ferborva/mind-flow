import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  checksumJson,
  validateEvaluationBundle,
} from "./semantic-validation.mjs";
import {
  validateConditionalOption,
  validateConditionalOptionBinding,
} from "../options/validation.mjs";

export { checksumJson };

const REQUIRED_BRANCH_KINDS = Object.freeze([
  "positive",
  "adverse",
  "measurement-alternative",
  "recovery",
]);
const UNRESOLVED_GATE_STATES = new Set(["unknown", "stale", "conflicted"]);
const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const EVALUATOR_REGISTRY = JSON.parse(readFileSync(
  new URL("./evaluator-registry.json", import.meta.url),
  "utf8",
));
const PATHWAY_EVALUATOR_MANIFEST_BYTES = readFileSync(
  new URL("./pathway-evaluator-manifest.json", import.meta.url),
);
const PATHWAY_EVALUATOR_MANIFEST = JSON.parse(PATHWAY_EVALUATOR_MANIFEST_BYTES.toString("utf8"));
const PATHWAY_EVALUATOR = EVALUATOR_REGISTRY.evaluators.find(
  ({ id, version }) => id === "mind-flow.condition-pathway" && version === "1.0.0",
);
const REPOSITORY_ROOT = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const CANONICAL_DEPENDENCY_PATH = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

function checksumBytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicaliseForDigest(value) {
  if (Array.isArray(value)) return `[${value.map(canonicaliseForDigest).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicaliseForDigest(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumCanonicalJson(value) {
  return checksumBytes(canonicaliseForDigest(value));
}

function readRepositoryDependency(path) {
  const resolved = realpathSync(resolve(REPOSITORY_ROOT, path));
  const fromRoot = relative(REPOSITORY_ROOT, resolved);
  if (fromRoot === "" || fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(fromRoot)) {
    throw new TypeError(`The condition-pathway evaluator dependency ${path} escapes the repository.`);
  }
  return readFileSync(resolved);
}

function evaluatorRegistryProjection(registry) {
  const projection = structuredClone(registry);
  const ownEntry = projection.evaluators.find(
    ({ id, version }) => id === "mind-flow.condition-pathway" && version === "1.0.0",
  );
  delete ownEntry.digest;
  return projection;
}

export function validatePathwayEvaluatorProvenance({
  registry,
  manifest,
  manifestBytes,
  readDependency,
}) {
  const matchingEvaluators = (registry?.evaluators || []).filter(
    ({ id, version }) => id === "mind-flow.condition-pathway" && version === "1.0.0",
  );
  if (matchingEvaluators.length !== 1) {
    throw new TypeError("Exactly one condition-pathway evaluator must be registered.");
  }
  const evaluator = matchingEvaluators[0];
  if (!Array.isArray(manifest?.dependencies) || manifest.dependencies.length === 0) {
    throw new TypeError("The condition-pathway evaluator manifest is invalid.");
  }
  const seen = new Set();
  for (const dependency of manifest.dependencies) {
    const path = dependency?.path;
    const segments = typeof path === "string" ? path.split("/") : [];
    if (
      typeof path !== "string" ||
      !CANONICAL_DEPENDENCY_PATH.test(path) ||
      segments.some((segment) => segment === "." || segment === "..") ||
      seen.has(path)
    ) {
      throw new TypeError("The condition-pathway evaluator manifest contains an unsafe or non-canonical path.");
    }
    seen.add(path);
  }
  if (evaluator.digest_kind !== "executable-manifest-sha256") {
    throw new TypeError("The condition-pathway evaluator must bind an executable manifest.");
  }
  if (evaluator.digest !== checksumBytes(manifestBytes)) {
    throw new TypeError("The registered condition-pathway evaluator manifest digest does not match.");
  }
  if (
    manifest.authority_effect !== "none" ||
    manifest.registry_projection?.kind !== "canonical-json-sha256-without-self-digest" ||
    manifest.registry_projection.digest !== checksumCanonicalJson(evaluatorRegistryProjection(registry))
  ) {
    throw new TypeError("The condition-pathway evaluator registry projection does not match.");
  }
  for (const dependency of manifest.dependencies) {
    const path = dependency.path;
    const bytes = readDependency(path);
    if (dependency.digest !== checksumBytes(bytes)) {
      throw new TypeError(`The condition-pathway evaluator dependency ${path} does not match its manifest.`);
    }
  }
  return true;
}

validatePathwayEvaluatorProvenance({
  registry: EVALUATOR_REGISTRY,
  manifest: PATHWAY_EVALUATOR_MANIFEST,
  manifestBytes: PATHWAY_EVALUATOR_MANIFEST_BYTES,
  readDependency: readRepositoryDependency,
});

function problem(code, path, message) {
  return { code, path, message };
}

function instant(value) {
  if (!STRICT_UTC.test(value || "")) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function definitionReference(condition) {
  return {
    id: condition.id,
    version: condition.definition_version,
    checksum: checksumJson(condition),
  };
}

function evaluationReference(run) {
  return {
    id: run.id,
    version: run.schema_version,
    checksum: checksumJson(run),
  };
}

function pathwayReference(definition) {
  return {
    id: definition.id,
    version: definition.definition_version,
    checksum: checksumJson(definition),
  };
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

function supportingArtifactReference(artifact) {
  const version = artifact?.version ??
    artifact?.definition_version ??
    artifact?.assessment_version ??
    artifact?.forecast_version ??
    artifact?.option_version ??
    artifact?.action_version ??
    artifact?.schema_version;
  if (typeof artifact?.id !== "string" || typeof version !== "string") return null;
  return { id: artifact.id, version, checksum: checksumJson(artifact) };
}

function supportingReferenceErrors(definition, conditions, supportingArtifacts) {
  const errors = [];
  const references = [];
  const add = (reference, path, role = "support", branch = null) => {
    if (reference !== null && reference !== undefined) {
      references.push({ reference, path, role, branch });
    }
  };
  for (const [branchIndex, branch] of (definition?.branches || []).entries()) {
    for (const [index, reference] of (branch.binding_interpretation?.evidence_refs || []).entries()) {
      add(
        reference,
        `$.branches[${branchIndex}].binding_interpretation.evidence_refs[${index}]`,
        "binding-evidence",
      );
    }
    add(
      branch.forecast_relation?.forecast_ref,
      `$.branches[${branchIndex}].forecast_relation.forecast_ref`,
      "forecast",
    );
    for (const field of [
      "detector_ref",
      "loss_function_ref",
      "performance_evidence_ref",
      "review_capacity_ref",
      "lead_time_evidence_ref",
    ]) add(
      branch.early_warning?.[field],
      `$.branches[${branchIndex}].early_warning.${field}`,
      `early-warning:${field}`,
    );
    for (const [index, reference] of (branch.operational_action?.option_refs || []).entries()) {
      add(
        reference,
        `$.branches[${branchIndex}].operational_action.option_refs[${index}]`,
        "conditional-option",
        branch,
      );
    }
  }
  for (const [name, safeguard] of Object.entries(definition?.participation_safeguards || {})) {
    for (const [index, reference] of (safeguard.evidence_refs || []).entries()) {
      add(
        reference,
        `$.participation_safeguards.${name}.evidence_refs[${index}]`,
        `participation-evidence:${name}`,
      );
    }
  }
  const resolved = (supportingArtifacts || []).map((artifact) => ({
    artifact,
    reference: supportingArtifactReference(artifact),
  })).filter(({ reference }) => reference !== null);
  for (const { reference, path, role, branch } of references) {
    const match = resolved.find((candidate) => isDeepStrictEqual(candidate.reference, reference));
    if (!match) {
      errors.push(problem(
        "PATHWAY_SUPPORTING_ARTIFACT_UNRESOLVED",
        path,
        "Every evidence, forecast, readiness, option and participation reference must resolve to supplied checksum-pinned content.",
      ));
      continue;
    }
    if (role === "conditional-option") {
      const boundCondition = conditions.get(match.artifact.condition_definition_ref?.id);
      const optionResult = validateConditionalOptionBinding(match.artifact, boundCondition);
      const declaredCondition = (definition.condition_definitions || []).some((candidate) =>
        isDeepStrictEqual(candidate, match.artifact.condition_definition_ref));
      const testedBinding = (branch?.gate_tests || []).some((gateTest) =>
        gateTest.gate === match.artifact.bound_gate &&
        gateTest.expected_states.includes("true") &&
        isDeepStrictEqual(gateTest.condition_definition, match.artifact.condition_definition_ref));
      if (
        !optionResult.valid ||
        !isDeepStrictEqual(match.artifact.scope, definition.scope) ||
        !declaredCondition ||
        !testedBinding
      ) {
        errors.push(problem(
          "PATHWAY_OPTION_ARTIFACT_INVALID",
          path,
          "A candidate option must satisfy its closed schema and bind this pathway scope, condition and tested gate.",
        ));
      }
    } else {
      errors.push(problem(
        "PATHWAY_SUPPORT_ROLE_UNVALIDATED",
        path,
        `Supporting role ${role} has no registered schema and semantic validator, so it cannot be linked yet.`,
      ));
    }
  }
  return errors;
}

export function validateConditionPathwayDefinition(
  definition,
  conditionDefinitions,
  supportingArtifacts = [],
) {
  const errors = [];
  const authorityBoundaryIsClosed =
    definition?.public_term === "possible-path" &&
    definition?.claim_boundary?.probability_effect === "none" &&
    definition?.claim_boundary?.forecast_effect === "reference-only" &&
    definition?.claim_boundary?.causal_effect === "none" &&
    definition?.claim_boundary?.authority_effect === "none" &&
    definition?.governance?.authority_effect === "none" &&
    (definition?.branches || []).every((branch) =>
      branch.early_warning?.authority_effect === "none" &&
      branch.operational_action?.authority_effect === "none");
  if (!authorityBoundaryIsClosed) {
    errors.push(problem(
      "PATHWAY_AUTHORITY_BOUNDARY_INVALID",
      "$.claim_boundary",
      "A possible-path definition cannot create probability, causality, forecast or action authority.",
    ));
  }
  const conditions = new Map((conditionDefinitions || []).map((condition) => [condition.id, condition]));
  const declaredReferences = definition?.condition_definitions || [];
  const declaredIds = declaredReferences.map(({ id }) => id);
  if (new Set(declaredIds).size !== declaredIds.length) {
    errors.push(problem(
      "PATHWAY_CONDITION_REFERENCE_DUPLICATE",
      "$.condition_definitions",
      "Condition definition references must be unique.",
    ));
  }
  for (const [index, reference] of declaredReferences.entries()) {
    const condition = conditions.get(reference.id);
    if (!condition || !isDeepStrictEqual(reference, definitionReference(condition))) {
      errors.push(problem(
        "PATHWAY_CONDITION_REFERENCE_UNKNOWN",
        `$.condition_definitions[${index}]`,
        "Every condition reference must resolve by exact id, version and checksum.",
      ));
      continue;
    }
    if (!isDeepStrictEqual(definition.scope, condition.scope)) {
      errors.push(problem(
        "PATHWAY_SCOPE_MISMATCH",
        "$.scope",
        "The possible-path scope must exactly match every bound condition definition.",
      ));
    }
  }
  for (const condition of conditionDefinitions || []) {
    if (!declaredIds.includes(condition.id)) {
      errors.push(problem(
        "PATHWAY_CONDITION_UNDECLARED",
        "$.condition_definitions",
        `Supplied condition ${condition.id} is not declared by the pathway.`,
      ));
    }
  }

  const branches = definition?.branches || [];
  const branchIds = branches.map(({ id }) => id);
  if (new Set(branchIds).size !== branchIds.length) {
    errors.push(problem(
      "PATHWAY_BRANCH_DUPLICATE",
      "$.branches",
      "Possible-path branch IDs must be unique.",
    ));
  }
  for (const kind of REQUIRED_BRANCH_KINDS) {
    if (!branches.some((branch) => branch.kind === kind)) {
      errors.push(problem(
        "PATHWAY_REQUIRED_BRANCH_MISSING",
        "$.branches",
        `At least one ${kind} branch is required.`,
      ));
    }
  }

  const gateTestIds = new Set();
  const branchHypotheses = new Map();
  for (const [branchIndex, branch] of branches.entries()) {
    if (!/\bIF\b/.test(branch.public_statement || "")) {
      errors.push(problem(
        "PATHWAY_PUBLIC_IF_MISSING",
        `$.branches[${branchIndex}].public_statement`,
        "Every public possible-path statement must name its IF explicitly.",
      ));
    }
    const testedGatePredicates = new Set();
    const boundConditionPredicates = new Set();
    const branchGateBindings = new Set();
    for (const [testIndex, gateTest] of (branch.gate_tests || []).entries()) {
      const testPath = `$.branches[${branchIndex}].gate_tests[${testIndex}]`;
      if (gateTestIds.has(gateTest.id)) {
        errors.push(problem(
          "PATHWAY_GATE_TEST_DUPLICATE",
          `${testPath}.id`,
          "Gate-test IDs must be unique across the pathway.",
        ));
      }
      gateTestIds.add(gateTest.id);
      const gateBinding = checksumJson({
        condition_definition: gateTest.condition_definition,
        gate: gateTest.gate,
      });
      if (branchGateBindings.has(gateBinding)) {
        errors.push(problem(
          "PATHWAY_BRANCH_GATE_CONTRADICTION",
          testPath,
          "A branch may test a condition gate only once; repeated tests could encode contradictory states.",
        ));
      }
      branchGateBindings.add(gateBinding);
      const condition = conditions.get(gateTest.condition_definition?.id);
      if (
        !condition ||
        !declaredIds.includes(gateTest.condition_definition?.id) ||
        !isDeepStrictEqual(gateTest.condition_definition, definitionReference(condition))
      ) {
        errors.push(problem(
          "PATHWAY_CONDITION_REFERENCE_UNKNOWN",
          `${testPath}.condition_definition`,
          "A gate test must pin one declared condition definition exactly.",
        ));
        continue;
      }
      if (!Object.hasOwn(condition.gates || {}, gateTest.gate)) {
        errors.push(problem(
          "PATHWAY_GATE_UNKNOWN",
          `${testPath}.gate`,
          `Gate ${String(gateTest.gate)} is not present in the condition definition.`,
        ));
      } else {
        for (const predicateRef of expressionRefs(condition.gates[gateTest.gate])) {
          testedGatePredicates.add(predicateRef);
        }
      }
      for (const predicateRef of Object.keys(condition.predicates || {})) {
        boundConditionPredicates.add(predicateRef);
      }
      if ((gateTest.expected_states || []).length === 5) {
        errors.push(problem(
          "PATHWAY_GATE_TEST_TAUTOLOGY",
          `${testPath}.expected_states`,
          "A possible-path gate test must exclude at least one truth state so evidence could count against it.",
        ));
      }
    }
    for (const predicateRef of branch.next_discriminating_predicates || []) {
      if (!boundConditionPredicates.has(predicateRef)) {
        errors.push(problem(
          "PATHWAY_DISCRIMINATOR_UNKNOWN",
          `$.branches[${branchIndex}].next_discriminating_predicates`,
          `Discriminating predicate ${predicateRef} is absent from the branch's bound conditions.`,
        ));
      } else if (!testedGatePredicates.has(predicateRef)) {
        errors.push(problem(
          "PATHWAY_DISCRIMINATOR_NOT_IN_TESTED_GATE",
          `$.branches[${branchIndex}].next_discriminating_predicates`,
          `Discriminating predicate ${predicateRef} does not affect any gate tested by this branch.`,
        ));
      }
    }

    const hypothesis = checksumJson((branch.gate_tests || []).map((gateTest) => ({
      condition_definition: gateTest.condition_definition,
      gate: gateTest.gate,
      expected_states: [...(gateTest.expected_states || [])].sort(),
    })).sort((left, right) => checksumJson(left).localeCompare(checksumJson(right))));
    if (branchHypotheses.has(hypothesis)) {
      errors.push(problem(
        "PATHWAY_BRANCH_HYPOTHESIS_DUPLICATE",
        `$.branches[${branchIndex}].gate_tests`,
        `This branch repeats the tested IF hypothesis of branch ${branchHypotheses.get(hypothesis)}.`,
      ));
    } else {
      branchHypotheses.set(hypothesis, branch.id);
    }

    const hasExpected = (gates, states) => (branch.gate_tests || []).some((gateTest) =>
      gates.includes(gateTest.gate) && gateTest.expected_states.some((state) => states.includes(state)));
    const kindIsConsistent =
      (branch.kind === "positive" && hasExpected(["watch", "prepare", "act"], ["true"])) ||
      (branch.kind === "adverse" && hasExpected(
        ["pause", "reverse"],
        ["true", "unknown", "stale", "conflicted"],
      )) ||
      (branch.kind === "measurement-alternative" && hasExpected(
        ["watch", "prepare", "act", "pause", "reverse", "recover", "graduate"],
        ["unknown", "stale", "conflicted"],
      )) ||
      (branch.kind === "recovery" && hasExpected(["recover", "graduate"], ["true"]));
    if (!kindIsConsistent) {
      errors.push(problem(
        "PATHWAY_BRANCH_KIND_INCONSISTENT",
        `$.branches[${branchIndex}].kind`,
        "The branch kind does not match the role and expected state of any tested IF gate.",
      ));
    }
  }

  errors.push(...supportingReferenceErrors(definition, conditions, supportingArtifacts));

  for (const [branchIndex, branch] of branches.entries()) {
    if (branch.early_warning?.readiness !== "shadow-ready") continue;
    const ids = [
      branch.early_warning.detector_ref?.id,
      branch.early_warning.loss_function_ref?.id,
      branch.early_warning.performance_evidence_ref?.id,
      branch.early_warning.review_capacity_ref?.id,
      branch.early_warning.lead_time_evidence_ref?.id,
    ];
    if (new Set(ids).size !== ids.length) {
      errors.push(problem(
        "PATHWAY_READINESS_ROLE_ALIAS",
        `$.branches[${branchIndex}].early_warning`,
        "Detector, loss, performance, review-capacity and lead-time roles require distinct artifacts.",
      ));
    }
  }

  const createdAt = instant(definition?.created_at);
  const validFrom = instant(definition?.governance?.valid_from);
  const expiresAt = instant(definition?.governance?.expires_at);
  if (createdAt === null || validFrom === null || expiresAt === null) {
    errors.push(problem(
      "PATHWAY_TIME_INVALID",
      "$.governance",
      "Pathway creation, validity and expiry must be exact UTC instants.",
    ));
  } else if (createdAt > validFrom || validFrom >= expiresAt) {
    errors.push(problem(
      "PATHWAY_TIME_ORDER_INVALID",
      "$.governance",
      "Pathway creation must not follow validity, and expiry must follow validity.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

function branchObservation(branch, runsByCondition) {
  const gateTruth = [];
  let unresolvedMismatch = false;
  let decisiveMismatch = false;
  for (const gateTest of branch.gate_tests) {
    const run = runsByCondition.get(gateTest.condition_definition.id);
    if (!run) return { pathObservation: "not-assessed", gateTruth: [] };
    const state = run.gate_results?.[gateTest.gate]?.state;
    gateTruth.push({
      test_ref: gateTest.id,
      gate: gateTest.gate,
      state,
      evaluation_run_ref: evaluationReference(run),
    });
    if (!gateTest.expected_states.includes(state)) {
      if (UNRESOLVED_GATE_STATES.has(state)) unresolvedMismatch = true;
      else decisiveMismatch = true;
    }
  }
  const pathObservation = decisiveMismatch
    ? "not-consistent-with"
    : unresolvedMismatch
      ? "underdetermined"
      : "consistent-with";
  return { pathObservation, gateTruth };
}

export function assessConditionPathway(
  definition,
  evaluationBundles,
  assessedAt,
  supportingArtifacts = [],
) {
  const assessedInstant = instant(assessedAt);
  if (assessedInstant === null) {
    throw new TypeError("A condition-pathway assessment requires an exact UTC assessed_at.");
  }
  if (!Array.isArray(evaluationBundles) || evaluationBundles.length === 0) {
    throw new TypeError("At least one completed evaluation bundle is required.");
  }
  const conditions = evaluationBundles.map(({ condition }) => condition);
  const definitionResult = validateConditionPathwayDefinition(
    definition,
    conditions,
    supportingArtifacts,
  );
  if (!definitionResult.valid) {
    throw new TypeError(`The pathway definition is invalid: ${definitionResult.errors
      .map(({ code }) => code).join(", ")}.`);
  }
  const validFrom = instant(definition.governance.valid_from);
  const expiresAt = instant(definition.governance.expires_at);
  if (assessedInstant < validFrom || assessedInstant >= expiresAt) {
    throw new TypeError("The pathway definition is not current at the assessment time.");
  }
  if (definition.governance.lifecycle === "retired") {
    throw new TypeError("A retired pathway definition cannot produce a new assessment.");
  }

  const suppliedCounts = new Map();
  for (const bundle of evaluationBundles) {
    const id = bundle?.condition?.id;
    suppliedCounts.set(id, (suppliedCounts.get(id) || 0) + 1);
  }
  if (
    evaluationBundles.length !== definition.condition_definitions.length ||
    definition.condition_definitions.some(({ id }) => suppliedCounts.get(id) !== 1)
  ) {
    throw new TypeError("Exactly one evaluation bundle is required for each declared condition.");
  }

  const runsByCondition = new Map();
  const evaluationInputs = [];
  for (const reference of definition.condition_definitions) {
    const bundle = evaluationBundles.find(({ condition }) => condition?.id === reference.id);
    if (!bundle) throw new TypeError(`A completed evaluation bundle is required for ${reference.id}.`);
    const validation = validateEvaluationBundle(
      bundle.condition,
      bundle.observations,
      bundle.evaluation_run,
    );
    if (!validation.valid) {
      throw new TypeError(`The completed evaluation bundle for ${reference.id} is invalid: ${validation.errors
        .map(({ code }) => code).join(", ")}.`);
    }
    const evaluatedAt = instant(bundle.evaluation_run.evaluated_at);
    if (evaluatedAt === null || evaluatedAt > assessedInstant) {
      throw new TypeError("An evaluation cannot occur after its pathway assessment.");
    }
    const conditionValidFrom = instant(bundle.condition.governance?.valid_from);
    const conditionExpiresAt = instant(bundle.condition.governance?.expires_at);
    if (
      conditionValidFrom === null ||
      conditionExpiresAt === null ||
      assessedInstant < conditionValidFrom ||
      assessedInstant >= conditionExpiresAt
    ) {
      throw new TypeError("A bound condition definition is not current at the pathway assessment time.");
    }
    if (evaluatedAt < validFrom) {
      throw new TypeError("An evaluation run predates the pathway validity window.");
    }
    runsByCondition.set(reference.id, bundle.evaluation_run);
    evaluationInputs.push({
      condition_definition: definitionReference(bundle.condition),
      evaluation_run: evaluationReference(bundle.evaluation_run),
    });
  }

  for (const branch of definition.branches) {
    if (branch.operational_action.status !== "candidate-only") continue;
    for (const reference of branch.operational_action.option_refs) {
      const option = supportingArtifacts.find((artifact) =>
        isDeepStrictEqual(supportingArtifactReference(artifact), reference));
      const bundle = evaluationBundles.find(({ condition }) =>
        condition.id === option?.condition_definition_ref?.id);
      const optionResult = validateConditionalOption(option, {
        condition: bundle?.condition,
        evaluation_bundle: bundle ? {
          observations: bundle.observations,
          evaluation_run: bundle.evaluation_run,
        } : undefined,
        as_of: assessedAt,
      });
      if (!optionResult.valid) {
        throw new TypeError(`The candidate option ${reference.id} is invalid at assessment time: ${optionResult.errors
          .map(({ code }) => code).join(", ")}.`);
      }
    }
  }

  const branchAssessments = definition.branches.map((branch) => {
    const { pathObservation, gateTruth } = branchObservation(branch, runsByCondition);
    return {
      branch_ref: branch.id,
      kind: branch.kind,
      axes: {
        definition_lifecycle: definition.governance.lifecycle,
        gate_truth: gateTruth,
        binding_interpretation: branch.binding_interpretation.class,
        path_observation: pathObservation,
        migration_evidence: "not-assessed",
        operational_action: branch.operational_action.status,
      },
      forecast_relation: {
        status: branch.forecast_relation.status,
        probability_effect: "none",
      },
      early_warning_readiness: branch.early_warning.readiness,
      next_discriminating_predicates: [...branch.next_discriminating_predicates],
    };
  });
  const simultaneouslyConsistent = branchAssessments
    .filter(({ axes }) => axes.path_observation === "consistent-with")
    .map(({ branch_ref }) => branch_ref);
  const discriminatingPredicates = [...new Set(
    definition.branches.flatMap(({ next_discriminating_predicates: refs }) => refs),
  )];
  const pathwayRef = pathwayReference(definition);
  const identityDigest = checksumJson({
    pathway_definition: pathwayRef,
    evaluation_inputs: evaluationInputs,
    assessed_at: assessedAt,
  }).slice("sha256:".length);

  return {
    schema_version: "1.0.0",
    id: `assessment.${definition.id}.${assessedAt
      .toLowerCase().replaceAll(/[^a-z0-9]+/g, "")}.${identityDigest}`,
    assessment_version: "1.0.0",
    assessed_at: assessedAt,
    pathway_definition: pathwayRef,
    evaluation_inputs: evaluationInputs,
    branch_assessments: branchAssessments,
    cross_branch: {
      simultaneously_consistent: simultaneouslyConsistent,
      discriminating_predicates: discriminatingPredicates,
      selection_effect: "none",
    },
    claim_boundary: structuredClone(definition.claim_boundary),
    provenance: {
      classification: "repository-computed",
      evaluator: structuredClone(PATHWAY_EVALUATOR),
      external_truth: "unverified",
    },
  };
}

export function validateConditionPathwayBundle(
  definition,
  assessment,
  evaluationBundles,
  supportingArtifacts = [],
) {
  try {
    const expected = assessConditionPathway(
      definition,
      evaluationBundles,
      assessment?.assessed_at,
      supportingArtifacts,
    );
    if (!isDeepStrictEqual(expected, assessment)) {
      return {
        valid: false,
        errors: [problem(
          "PATHWAY_ASSESSMENT_MISMATCH",
          "$.assessment",
          "The pathway assessment does not reproduce from its definition and evaluation bundles.",
        )],
      };
    }
    return { valid: true, errors: [] };
  } catch (cause) {
    return {
      valid: false,
      errors: [problem(
        "PATHWAY_BUNDLE_INVALID",
        "$.assessment",
        cause instanceof Error ? cause.message : "The pathway bundle is invalid.",
      )],
    };
  }
}
