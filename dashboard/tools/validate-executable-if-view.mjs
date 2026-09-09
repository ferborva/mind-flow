import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  evaluateKernelCondition,
  validateExecutableIfKernel,
} from "../../contracts/executable-if/validate.mjs";

const schema = JSON.parse(readFileSync(
  new URL("../schema/executable-if-view.schema.json", import.meta.url),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const STATES = ["true", "false", "unknown", "stale", "conflicted"];
const PROJECTION_ROLES = [
  "transition-bundle",
  "possible-path",
  "preparation-register",
  "forecast",
];

function issue(code, path, message, keyword = "semantic") {
  return { code, path, message, keyword };
}

function exactSet(values, expected) {
  return values.length === expected.length
    && new Set(values).size === expected.length
    && expected.every((value) => values.includes(value));
}

function definitionKey(ref) {
  return `${ref?.condition_id || ""}\u0000${ref?.definition_version || ""}\u0000${ref?.definition_hash || ""}`;
}

function activeDefinitions(kernel, validation) {
  const definitions = new Map(kernel.events
    .flatMap(({ introduced_definitions: introduced = [] }) => introduced)
    .map((definition) => [definitionKey({
      condition_id: definition.condition_id,
      definition_version: definition.definition_version,
      definition_hash: definition.definition_hash,
    }), definition]));
  return new Map((validation.current_definition_state || [])
    .filter(({ lifecycle }) => lifecycle === "active")
    .map((state) => [state.condition_id, definitions.get(definitionKey(state.condition_definition_ref))]));
}

function expectedSourceBinding(sourceKernel) {
  const kernel = sourceKernel.document;
  return {
    artifact_path: sourceKernel.path,
    artifact_sha256: sourceKernel.sha256,
    kernel_id: kernel.kernel_id,
    schema_version: kernel.schema_version,
    manifest_hash: kernel.manifest_hash,
  };
}

function sourceDocumentId(role, document) {
  if (role === "transition-bundle") return document?.bundle_id;
  if (role === "possible-path") return document?.path_id;
  if (role === "preparation-register") return document?.register_id;
  if (role === "forecast") return document?.id;
  return undefined;
}

function retainedSourceValid(role, source, errors) {
  const basePath = `/projection_sources/${role}`;
  if (!(source?.bytes instanceof Uint8Array) || !source?.document ||
      !source?.path || !source?.sha256) {
    errors.push(issue(
      "PROJECTION_SOURCE_UNRESOLVED",
      basePath,
      `the ${role} projection source requires retained bytes, document, path and digest`,
    ));
    return false;
  }
  const bytes = Buffer.from(source.bytes);
  const actualSha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  let retainedDocument;
  try {
    retainedDocument = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    errors.push(issue(
      "PROJECTION_SOURCE_BYTES_INVALID",
      basePath,
      `retained ${role} bytes are not JSON: ${error.message}`,
    ));
    return false;
  }
  if (actualSha256 !== source.sha256 || !isDeepStrictEqual(retainedDocument, source.document)) {
    errors.push(issue(
      "PROJECTION_SOURCE_BYTES_MISMATCH",
      basePath,
      `the ${role} document or digest does not equal its retained bytes`,
    ));
    return false;
  }
  return true;
}

function projectionSourcesAssessment(view, sourceKernel, projectionSources, errors) {
  if (view?.schema_version !== "1.1.0") return;
  const resolved = new Map();
  for (const role of PROJECTION_ROLES) {
    const source = projectionSources?.[role];
    const ref = view?.projection_sources?.[role];
    if (!retainedSourceValid(role, source, errors)) continue;
    const expected = {
      role,
      id: sourceDocumentId(role, source.document),
      path: source.path,
      sha256: source.sha256,
    };
    if (!isDeepStrictEqual(ref, expected)) {
      errors.push(issue(
        "PROJECTION_SOURCE_MISMATCH",
        `/projection_sources/${role}`,
        `the displayed ${role} reference must match its exact retained source`,
      ));
      continue;
    }
    resolved.set(role, source.document);
  }

  const bundle = resolved.get("transition-bundle");
  const expectedArtifacts = [
    ["possible-path", projectionSources?.["possible-path"]],
    ["preparation-register", projectionSources?.["preparation-register"]],
    ["forecast", projectionSources?.forecast],
    ["executable-if-kernel", sourceKernel],
  ];
  const artifactRefs = new Map((bundle?.artifacts || []).map((ref) => [ref.role, ref]));
  if (bundle?.schema_version !== "1.2.0" || bundle?.bundle_stage !== "pre-projection-core" ||
      bundle?.artifacts?.length !== 7) {
    errors.push(issue(
      "PROJECTION_BUNDLE_INVALID",
      "/projection_sources/transition-bundle",
      "the view must derive from a seven-artifact Round 4 pre-projection core",
    ));
  }
  for (const [role, source] of expectedArtifacts) {
    if (!source || !isDeepStrictEqual(artifactRefs.get(role), {
      role,
      path: source.path,
      sha256: source.sha256,
    })) {
      errors.push(issue(
        "PROJECTION_BUNDLE_ARTIFACT_MISMATCH",
        `/projection_sources/${role}`,
        `the pre-projection bundle must retain the exact ${role} artifact`,
      ));
    }
  }
}

function expectedClaimScope(definition) {
  return {
    claim: definition?.claim,
    scope: definition?.scope,
  };
}

function expectedProvenance(view, receipt) {
  return {
    visibility: "always-visible",
    source_binding: view.source_binding,
    condition_definition_ref: receipt.condition_definition_ref,
    claim_scope: view.claim_scope,
    clock: {
      evaluated_at: receipt.evaluated_at,
      source: receipt.clock.source,
      trusted: receipt.clock.trusted,
    },
    evidence_state_hash: receipt.evidence_state_hash,
    observation_hashes: receipt.observation_hashes,
    evaluation_hash: receipt.evaluation_hash,
  };
}

function legendAssessment(view, errors) {
  const entries = Array.isArray(view?.state_legend) ? view.state_legend : [];
  const states = entries.map(({ state }) => state);
  if (!exactSet(states, STATES)) {
    errors.push(issue(
      "STATE_LEGEND_PARTITION_INVALID",
      "/state_legend",
      "the public legend must contain true, false, unknown, stale and conflicted exactly once",
    ));
  }
  for (const field of ["public_label", "public_meaning", "next_step"]) {
    const values = entries.map((entry) => entry?.[field]);
    if (values.length !== STATES.length || new Set(values).size !== STATES.length) {
      errors.push(issue(
        "STATE_LEGEND_SEMANTICS_COLLAPSED",
        "/state_legend",
        `every IF state requires distinct ${field} copy`,
      ));
    }
  }
  return new Map(entries.map((entry) => [entry.state, entry]));
}

function contextAssessment(view, index, errors) {
  for (const [contextIndex, context] of (view.context_series || []).entries()) {
    const path = `/condition_views/${index}/context_series/${contextIndex}`;
    if (context?.condition_truth_effect !== "none") {
      errors.push(issue(
        "CONTEXT_TRUTH_EFFECT_FORBIDDEN",
        `${path}/condition_truth_effect`,
        "macro context cannot change an executable IF state",
      ));
    }
    if (context?.may_satisfy_predicate !== false || context?.evidence_role !== "macro-context-only") {
      errors.push(issue(
        "CONTEXT_PREDICATE_BINDING_FORBIDDEN",
        path,
        "macro context cannot satisfy a condition predicate or present itself as executable evidence",
      ));
    }
  }
}

function forecastAssessment(view, index, errors) {
  for (const [forecastIndex, forecast] of (view.forecast_context || []).entries()) {
    const path = `/condition_views/${index}/forecast_context/${forecastIndex}`;
    if (forecast?.condition_truth_effect !== "none"
        || forecast?.may_set_if_state !== false
        || forecast?.semantic_role !== "forecast-probability-not-condition-truth") {
      errors.push(issue(
        "FORECAST_TRUTH_EFFECT_FORBIDDEN",
        path,
        "a forecast probability is orthogonal to the current executable IF state",
      ));
    }
  }
}

export function validateExecutableIfView(view, { sourceKernel, projectionSources } = {}) {
  const errors = [];
  const schemaConformant = validateSchema(view);
  if (!schemaConformant) {
    errors.push(...(validateSchema.errors || []).map((error) => issue(
      "SCHEMA_INVALID",
      error.instancePath || "/",
      error.message || "schema validation failed",
      error.keyword,
    )));
  }

  const legendByState = legendAssessment(view, errors);
  projectionSourcesAssessment(view, sourceKernel, projectionSources, errors);
  const kernel = sourceKernel?.document;
  let retainedDocument = null;
  if (!(sourceKernel?.bytes instanceof Uint8Array)) {
    errors.push(issue(
      "SOURCE_BYTES_UNRESOLVED",
      "/condition_views",
      "the pure validator requires the retained source-kernel bytes",
    ));
  } else {
    const bytes = Buffer.from(sourceKernel.bytes);
    const actualSha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    if (actualSha256 !== sourceKernel.sha256) {
      errors.push(issue(
        "SOURCE_BYTES_HASH_MISMATCH",
        "/condition_views",
        "supplied kernel digest does not match the retained bytes",
      ));
    }
    try {
      retainedDocument = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      errors.push(issue(
        "SOURCE_BYTES_INVALID",
        "/condition_views",
        `retained source-kernel bytes are not JSON: ${error.message}`,
      ));
    }
    if (retainedDocument && !isDeepStrictEqual(retainedDocument, kernel)) {
      errors.push(issue(
        "SOURCE_DOCUMENT_MISMATCH",
        "/condition_views",
        "the supplied source-kernel document does not equal the retained bytes",
      ));
    }
  }
  const kernelValidation = kernel && typeof kernel === "object"
    ? validateExecutableIfKernel(kernel)
    : { machine_valid: false, current_definition_state: [] };
  if (!kernelValidation.machine_valid) {
    errors.push(issue(
      "SOURCE_KERNEL_INVALID",
      "/condition_views",
      "dashboard projection requires a machine-valid source kernel",
    ));
  }
  if (!sourceKernel?.path || !sourceKernel?.sha256) {
    errors.push(issue(
      "SOURCE_KERNEL_UNRESOLVED",
      "/condition_views",
      "source kernel path and retained-byte digest are required",
    ));
  }

  const expectedSource = kernel && sourceKernel?.path && sourceKernel?.sha256
    ? expectedSourceBinding(sourceKernel)
    : null;
  const definitions = kernel ? activeDefinitions(kernel, kernelValidation) : new Map();
  const displayedIfStates = {};
  const conditionIds = new Set();

  for (const [index, conditionView] of (view?.condition_views || []).entries()) {
    const basePath = `/condition_views/${index}`;
    const conditionId = conditionView?.condition_id;
    if (conditionIds.has(conditionId)) {
      errors.push(issue("DUPLICATE_CONDITION_VIEW", `${basePath}/condition_id`, "condition view ids must be unique"));
    }
    conditionIds.add(conditionId);

    if (!expectedSource || !isDeepStrictEqual(conditionView?.source_binding, expectedSource)) {
      errors.push(issue(
        "SOURCE_BINDING_MISMATCH",
        `${basePath}/source_binding`,
        "display source identity must match the supplied kernel artifact exactly",
      ));
    }

    const definition = definitions.get(conditionId);
    if (!definition) {
      errors.push(issue(
        "CONDITION_DEFINITION_UNRESOLVED",
        `${basePath}/condition_id`,
        "condition must resolve to exactly one active source-kernel definition",
      ));
      contextAssessment(conditionView, index, errors);
      forecastAssessment(conditionView, index, errors);
      continue;
    }
    const definitionRef = {
      condition_id: definition.condition_id,
      definition_version: definition.definition_version,
      definition_hash: definition.definition_hash,
    };
    if (!isDeepStrictEqual(conditionView.condition_definition_ref, definitionRef)) {
      errors.push(issue(
        "CONDITION_DEFINITION_MISMATCH",
        `${basePath}/condition_definition_ref`,
        "displayed condition definition must be the active kernel definition",
      ));
    }
    if (!isDeepStrictEqual(conditionView.claim_scope, expectedClaimScope(definition))) {
      errors.push(issue(
        "CLAIM_SCOPE_MISMATCH",
        `${basePath}/claim_scope`,
        "displayed WHO VERB OBJECT STANDARD POLARITY PERIOD and scope must match the active definition",
      ));
    }

    const evaluatedAt = conditionView.evaluation_receipt?.evaluated_at;
    if (evaluatedAt !== view?.generated_at) {
      errors.push(issue(
        "EVALUATION_CLOCK_MISMATCH",
        `${basePath}/evaluation_receipt/evaluated_at`,
        "the dashboard view clock and receipt evaluation clock must be identical",
      ));
    }
    const recomputed = evaluateKernelCondition(kernel, conditionId, { evaluatedAt });
    if (!isDeepStrictEqual(conditionView.evaluation_receipt, recomputed)) {
      errors.push(issue(
        "EVALUATION_RECEIPT_MISMATCH",
        `${basePath}/evaluation_receipt`,
        "the complete displayed receipt must equal a fresh kernel evaluation",
      ));
    }

    const computedState = recomputed.computed_rule_state.state;
    displayedIfStates[conditionId] = conditionView.display?.state;
    if (conditionView.display?.state !== computedState) {
      errors.push(issue(
        "DISPLAYED_STATE_MISMATCH",
        `${basePath}/display/state`,
        "the displayed IF state must equal the recomputed receipt state",
      ));
    }
    const legend = legendByState.get(computedState);
    if (!legend || !isDeepStrictEqual(conditionView.display, {
      state: computedState,
      public_label: legend.public_label,
      public_meaning: legend.public_meaning,
      next_step: legend.next_step,
    })) {
      errors.push(issue(
        "DISPLAY_COPY_MISMATCH",
        `${basePath}/display`,
        "the displayed label, meaning and next step must come from the fixed five-state legend",
      ));
    }

    const expectedPanel = expectedProvenance(conditionView, recomputed);
    if (conditionView.provenance_panel?.visibility !== "always-visible") {
      errors.push(issue(
        "PROVENANCE_NOT_VISIBLE",
        `${basePath}/provenance_panel/visibility`,
        "source, scope and clock provenance must be visible without interaction",
      ));
    }
    if (!isDeepStrictEqual(conditionView.provenance_panel?.source_binding, expectedPanel.source_binding)) {
      errors.push(issue(
        "PROVENANCE_SOURCE_MISMATCH",
        `${basePath}/provenance_panel/source_binding`,
        "visible source provenance must equal the condition source binding",
      ));
    }
    if (!isDeepStrictEqual(conditionView.provenance_panel?.condition_definition_ref,
      expectedPanel.condition_definition_ref)) {
      errors.push(issue(
        "PROVENANCE_DEFINITION_MISMATCH",
        `${basePath}/provenance_panel/condition_definition_ref`,
        "visible definition provenance must equal the recomputed receipt",
      ));
    }
    if (!isDeepStrictEqual(conditionView.provenance_panel?.claim_scope, expectedPanel.claim_scope)) {
      errors.push(issue(
        "PROVENANCE_SCOPE_MISMATCH",
        `${basePath}/provenance_panel/claim_scope`,
        "visible scope provenance must equal the active definition",
      ));
    }
    if (!isDeepStrictEqual(conditionView.provenance_panel?.clock, expectedPanel.clock)) {
      errors.push(issue(
        "PROVENANCE_CLOCK_MISMATCH",
        `${basePath}/provenance_panel/clock`,
        "visible clock provenance must preserve the receipt time, source and trust status",
      ));
    }
    for (const field of ["evidence_state_hash", "observation_hashes", "evaluation_hash"]) {
      if (!isDeepStrictEqual(conditionView.provenance_panel?.[field], expectedPanel[field])) {
        errors.push(issue(
          "PROVENANCE_EVIDENCE_MISMATCH",
          `${basePath}/provenance_panel/${field}`,
          "visible evidence provenance must equal the recomputed receipt",
        ));
      }
    }

    contextAssessment(conditionView, index, errors);
    forecastAssessment(conditionView, index, errors);
  }

  if (view?.schema_version === "1.1.0" && projectionSources?.forecast?.document) {
    const forecast = projectionSources.forecast.document;
    const conditionView = (view.condition_views || [])
      .find(({ condition_id: id }) => id === forecast.target?.condition_id);
    const forecastView = conditionView?.forecast_context?.find(({ forecast_id: id }) =>
      id === forecast.id);
    const expected = {
      forecast_id: forecast.id,
      public_label: forecast.question,
      probability: forecast.probability,
      semantic_role: "forecast-probability-not-condition-truth",
      condition_truth_effect: "none",
      may_set_if_state: false,
      issued_at: forecast.issued_at,
      target_period: {
        starts_at: forecast.target?.observation_window_start,
        ends_at: forecast.target?.observation_window_end,
      },
    };
    if (!forecastView || !isDeepStrictEqual(forecastView, expected)) {
      errors.push(issue(
        "FORECAST_PROJECTION_MISMATCH",
        "/condition_views/forecast_context",
        "displayed probability and target must equal the exact forecast source without setting IF truth",
      ));
    }
  }

  const sourceErrorCodes = new Set([
    "SOURCE_KERNEL_INVALID",
    "SOURCE_KERNEL_UNRESOLVED",
    "SOURCE_BYTES_UNRESOLVED",
    "SOURCE_BYTES_HASH_MISMATCH",
    "SOURCE_BYTES_INVALID",
    "SOURCE_DOCUMENT_MISMATCH",
    "SOURCE_BINDING_MISMATCH",
  ]);
  const projectionErrorCodes = new Set([
    "PROJECTION_SOURCE_UNRESOLVED",
    "PROJECTION_SOURCE_BYTES_INVALID",
    "PROJECTION_SOURCE_BYTES_MISMATCH",
    "PROJECTION_SOURCE_MISMATCH",
    "PROJECTION_BUNDLE_INVALID",
    "PROJECTION_BUNDLE_ARTIFACT_MISMATCH",
    "FORECAST_PROJECTION_MISMATCH",
  ]);
  return {
    schema_conformant: schemaConformant,
    source_verified: !errors.some(({ code }) => sourceErrorCodes.has(code)),
    projection_sources_verified: view?.schema_version !== "1.1.0" ||
      !errors.some(({ code }) => projectionErrorCodes.has(code)),
    semantic_valid: errors.length === 0,
    state_legend: Object.fromEntries(legendByState),
    displayed_if_states: displayedIfStates,
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    errors,
  };
}
