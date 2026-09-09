import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { assessTransitionBundle } from "../../integration/transition-bundle/assess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const manifestSchema = JSON.parse(readFileSync(
  resolve(here, "schema/experiment-manifest.schema.json"),
  "utf8",
));
const factPackSchema = JSON.parse(readFileSync(
  resolve(here, "schema/fact-pack.schema.json"),
  "utf8",
));
const instrumentSchema = JSON.parse(readFileSync(
  resolve(here, "schema/instrument.schema.json"),
  "utf8",
));
const scriptSchema = JSON.parse(readFileSync(
  resolve(here, "schema/deliberation-script.schema.json"),
  "utf8",
));
const outcomeSchema = JSON.parse(readFileSync(
  resolve(here, "schema/outcome-contract.schema.json"),
  "utf8",
));
const protocolSchema = JSON.parse(readFileSync(
  resolve(here, "schema/protocol-contract.schema.json"),
  "utf8",
));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateManifestSchema = ajv.compile(manifestSchema);
const validateFactPackSchema = ajv.compile(factPackSchema);
const validateInstrumentSchema = ajv.compile(instrumentSchema);
const validateScriptSchema = ajv.compile(scriptSchema);
const validateOutcomeSchema = ajv.compile(outcomeSchema);
const validateProtocolSchema = ajv.compile(protocolSchema);

const REQUIRED_INSTRUMENTS = new Set([
  "conventional-release",
  "release-plus-deliberation",
  "observatory-self-serve",
  "observatory-plus-deliberation",
]);
const REQUIRED_STOP_RULES = new Map([
  ["stop.urgent-irreversible-intent", {
    measure: "urgent-irreversible-action-intention",
    operator: "any",
    threshold: 1,
    strata: ["all-participants", "directly-affected"],
  }],
  ["stop.dangerous-understanding", {
    measure: "dangerous-understanding-increase",
    operator: "gt",
    threshold: 0,
    strata: ["all-participants", "directly-affected", "low-numeracy", "limited-english"],
  }],
  ["stop.serious-reported-harm", {
    measure: "serious-anxiety-stigma-dignity-or-blame-report",
    operator: "any",
    threshold: 1,
    strata: ["all-participants", "directly-affected"],
  }],
  ["stop.missing-no-real-service-notice", {
    measure: "no-real-service-warning-or-authority-notice-missed",
    operator: "any",
    threshold: 1,
    strata: ["all-participants"],
  }],
  ["stop.critical-access-failure", {
    measure: "critical-assistive-technology-path-failure",
    operator: "any",
    threshold: 1,
    strata: ["assistive-technology"],
  }],
  ["stop.privacy-exposure", {
    measure: "personal-data-outside-approved-minimum",
    operator: "any",
    threshold: 1,
    strata: ["all-participants"],
  }],
]);
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const REQUIRED_BOUNDARIES = [
  "no-real-service",
  "no-real-warning",
  "no-action-authority",
  "uncertainty",
  "strongest-challenge",
  "correction-route",
];
const IF_STATES = ["true", "false", "unknown", "stale", "conflicted"];
const FORBIDDEN_SUCCESS_ENDPOINTS = new Set([
  "aesthetic-preference",
  "perceived-authority",
  "uncalibrated-confidence",
]);

function error(code, path, message) {
  return { code, path, message };
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sameReference(left, right) {
  return left?.fact_pack_id === right?.fact_pack_id
    && left?.path === right?.path
    && left?.sha256 === right?.sha256;
}

function sameFileReference(left, right) {
  return left?.artifact_id === right?.artifact_id
    && left?.path === right?.path
    && left?.sha256 === right?.sha256;
}

function sameSourceBundleReference(left, right) {
  return left?.bundle_id === right?.bundle_id
    && left?.bundle_stage === right?.bundle_stage
    && left?.schema_version === right?.schema_version
    && left?.path === right?.path
    && left?.sha256 === right?.sha256;
}

function loadArtifact(ref, rootDir) {
  if (!ref || typeof ref.path !== "string" || isAbsolute(ref.path)
    || ref.path.split("/").some((part) => part === "" || part === "..")) {
    throw new Error("path must be a closed repository-relative file path");
  }
  const realRoot = realpathSync(rootDir);
  const candidate = resolve(realRoot, ref.path);
  let traversed = realRoot;
  for (const part of ref.path.split("/")) {
    traversed = resolve(traversed, part);
    if (lstatSync(traversed).isSymbolicLink()) {
      throw new Error("symbolic links are not accepted in experiment artifact paths");
    }
  }
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(realRoot, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)
    || isAbsolute(fromRoot)) {
    throw new Error("artifact path escapes the repository root");
  }
  const metadata = lstatSync(realCandidate);
  if (!metadata.isFile()) throw new Error("experiment artifacts must be regular files");
  if (metadata.size > MAX_ARTIFACT_BYTES) {
    throw new Error(`experiment artifact exceeds ${MAX_ARTIFACT_BYTES} bytes`);
  }
  const bytes = readFileSync(realCandidate);
  return { bytes, path: realCandidate };
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sameSet(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function pointerValue(document, pointer) {
  if (!document || typeof pointer !== "string" || !pointer.startsWith("/")) {
    return undefined;
  }
  return pointer.slice(1).split("/").reduce((value, rawPart) => {
    if (value === undefined || value === null) return undefined;
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    return Object.hasOwn(value, part) ? value[part] : undefined;
  }, document);
}

export function assessSourceFactBinding(sourceBundle, factPack) {
  const errors = [];
  const sourceCanonical = sourceBundle?.canonical;
  const factCanonical = factPack?.canonical;
  if (sourceBundle?.bundle_stage !== "pre-projection-core"
    || sourceCanonical?.root_role !== "agency-map"
    || !Array.isArray(sourceCanonical?.condition_ids)
    || sourceCanonical.condition_ids.length === 0
    || sourceCanonical?.outcome_logic_ref?.artifact_role !== "agency-map"
    || sourceCanonical?.outcome_logic_ref?.json_pointer
      !== "/outcome_scope/condition_logic"
    || !sourceCanonical?.scope_manifest_ref?.scope_manifest_id
    || !sourceCanonical?.scope_manifest_ref?.path
    || !sourceCanonical?.scope_manifest_ref?.sha256
    || sourceCanonical?.executable_if_ref?.artifact_role !== "executable-if-kernel"
    || !sourceCanonical?.executable_if_ref?.kernel_id
    || !sourceCanonical?.executable_if_ref?.manifest_hash
    || !Array.isArray(sourceCanonical?.executable_if_ref?.active_condition_definition_refs)
    || sourceCanonical.executable_if_ref.active_condition_definition_refs.length === 0
    || !sourceCanonical?.executable_if_ref?.evidence_state_ref?.evidence_state_hash) {
    errors.push(error(
      "SOURCE_CANONICAL_CONTRACT_INVALID",
      "$.source_transition_bundle.canonical",
      "The source must expose the fixed pre-projection condition, scope and executable IF contract.",
    ));
  }
  if (!sourceCanonical || !factCanonical
    || !sameSet(sourceCanonical.condition_ids, factCanonical.condition_ids)
    || !isDeepStrictEqual(
      sourceCanonical.outcome_logic_ref,
      factCanonical.outcome_logic_ref,
    )
    || !isDeepStrictEqual(sourceCanonical.scope_manifest_ref, factCanonical.scope_manifest_ref)
    || !isDeepStrictEqual(sourceCanonical.executable_if_ref, factCanonical.executable_if_ref)) {
    errors.push(error(
      "FACT_PACK_CANONICAL_MISMATCH",
      "$.fact_pack.canonical",
      "The fact pack must bind the source bundle's exact condition set, outcome logic and scope manifest.",
    ));
  }
  const factConditionIds = factCanonical?.condition_ids || [];
  const displayedConditionIds = Array.isArray(factPack?.if_conditions)
    ? factPack.if_conditions
      .filter((condition) => condition && typeof condition === "object"
        && !Array.isArray(condition) && typeof condition.condition_id === "string")
      .map(({ condition_id: id }) => id)
    : [];
  if (displayedConditionIds.length !== factPack?.if_conditions?.length
    || !unique(displayedConditionIds)
    || !sameSet(factConditionIds, displayedConditionIds)) {
    errors.push(error(
      "FACT_PACK_IF_COVERAGE_MISMATCH",
      "$.fact_pack.if_conditions",
      "The public fact pack must expose every canonical condition exactly once.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

export function assessFactPackSemantics(factPack, {
  rootDir = defaultRoot,
  sourceBundle = null,
} = {}) {
  const errors = [];
  const schemaValid = validateFactPackSchema(factPack);
  if (!schemaValid) {
    errors.push(error(
      "FACT_PACK_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateFactPackSchema.errors, { separator: "; " }),
    ));
  }
  const claims = Array.isArray(factPack?.claims)
    ? factPack.claims.filter((claim) => claim && typeof claim === "object"
      && !Array.isArray(claim))
    : [];
  const ids = claims.map(({ claim_id: id }) => id);
  if (claims.length !== factPack?.claims?.length || !unique(ids)) {
    errors.push(error(
      "FACT_PACK_CLAIM_ID_DUPLICATE",
      "$.claims",
      "Fact-pack claim identities must be unique and structurally valid.",
    ));
  }
  const legend = Array.isArray(factPack?.state_legend) ? factPack.state_legend : [];
  const legendStates = legend.map(({ state }) => state);
  if (!sameSet(legendStates, IF_STATES) || !unique(legendStates)) {
    errors.push(error(
      "STATE_LEGEND_PARTITION_INVALID",
      "$.state_legend",
      "The shared fact pack must distinguish all five executable IF states exactly once.",
    ));
  }
  for (const field of ["public_label", "public_meaning", "next_step"]) {
    if (!unique(legend.map((entry) => entry?.[field]))) {
      errors.push(error(
        "STATE_LEGEND_SEMANTICS_COLLAPSED",
        "$.state_legend",
        `Every executable IF state requires distinct ${field} copy.`,
      ));
    }
  }
  const possiblePathArtifact = sourceBundle?.artifacts?.find(({ role }) =>
    role === "possible-path") || null;
  const loadedSourceDocuments = new Map();
  const resolveProjection = (ref) => {
    if (!ref || ref.artifact_role !== "possible-path") return null;
    if (possiblePathArtifact
      && (ref.path !== possiblePathArtifact.path || ref.sha256 !== possiblePathArtifact.sha256)) {
      return null;
    }
    try {
      let document = loadedSourceDocuments.get(ref.path);
      if (!document) {
        const loaded = loadArtifact(ref, rootDir);
        if (digest(loaded.bytes) !== ref.sha256) return null;
        document = JSON.parse(loaded.bytes.toString("utf8"));
        loadedSourceDocuments.set(ref.path, document);
      }
      const value = pointerValue(document, ref.json_pointer);
      return value === undefined ? null : { document, value };
    } catch {
      return null;
    }
  };
  const consultation = factPack?.decision_context?.affected_party_consultation;
  const consultationSource = resolveProjection(consultation?.source_ref);
  const affectedPopulations = Array.isArray(consultationSource?.value)
    ? consultationSource.value
    : [];
  const expectedConsultationStatement = affectedPopulations.length > 0
    ? `Affected-party status: ${affectedPopulations.map(({ label }) => label).join("; ")} have not reviewed the goal, threshold, labels or proposed response.`
    : null;
  if (consultation?.source_ref?.json_pointer
      !== "/population_accounting/affected_populations"
    || affectedPopulations.length === 0
    || affectedPopulations.some(({ voice_status: voiceStatus }) =>
      voiceStatus !== "not-consulted")
    || consultation?.status !== "not-consulted"
    || consultation?.review_completed !== false
    || !isDeepStrictEqual(consultation?.population_ids,
      affectedPopulations.map(({ population_id: populationId }) => populationId))
    || !isDeepStrictEqual(consultation?.unreviewed_fields,
      ["goal", "threshold", "labels", "proposed-response"])
    || consultation?.public_statement !== expectedConsultationStatement) {
    errors.push(error(
      "AFFECTED_PARTY_CONTEXT_MISMATCH",
      "$.decision_context.affected_party_consultation",
      "The fact pack must preserve the source-bound not-consulted status of every named affected population.",
    ));
  }
  for (const [index, entry] of legend.entries()) {
    const resolved = resolveProjection(entry?.source_ref);
    const candidateEdgeIndexes = (resolved?.document?.graph?.edges || [])
      .map((edge, edgeIndex) => ({ edge, edgeIndex }))
      .filter(({ edge }) => IF_STATES.every((state) => edge?.branches?.[`if_${state}`]))
      .map(({ edgeIndex }) => edgeIndex);
    const expectedPointer = candidateEdgeIndexes.length === 1
      ? `/graph/edges/${candidateEdgeIndexes[0]}/branches/if_${entry?.state}`
      : null;
    const branch = resolved?.value;
    if (!resolved || entry?.source_ref?.json_pointer !== expectedPointer
      || !branch || typeof branch !== "object" || Array.isArray(branch)
      || entry.public_label !== `IF ${entry.state}`
      || entry.public_meaning !== branch.public_explanation
      || entry.next_step !== branch.recovery) {
      errors.push(error(
        "STATE_LEGEND_SOURCE_MISMATCH",
        `$.state_legend[${index}]`,
        "Every five-state meaning must project the exact source path branch for that state.",
      ));
    }
  }

  const pathClaims = claims.filter(({ claim_id: id }) =>
    id === "claim.synthetic-transition-path");
  if (pathClaims.length !== 1) {
    errors.push(error(
      "PATH_CLAIM_SOURCE_MISMATCH",
      "$.claims",
      "The possible-path public claim must appear exactly once.",
    ));
  } else {
    const claim = pathClaims[0];
    const requiredPointers = [
      "/public_claim_ceiling",
      "/competing_paths",
      "/epistemic_contract",
      "/outcome_scope",
    ];
    const resolvedByPointer = new Map((claim.source_refs || []).map((ref) => [
      ref.json_pointer,
      resolveProjection(ref),
    ]));
    const publicClaim = resolvedByPointer.get("/public_claim_ceiling")?.value;
    const competitors = resolvedByPointer.get("/competing_paths")?.value;
    const epistemic = resolvedByPointer.get("/epistemic_contract")?.value;
    const outcomeScope = resolvedByPointer.get("/outcome_scope")?.value;
    const expectedScope = outcomeScope
      ? `WHO: ${outcomeScope.who}; PLACE: ${outcomeScope.place}; PERIOD: ${outcomeScope.period}.`
      : null;
    const expectedUncertainty = epistemic
      ? `Truth status: ${epistemic.truth_status}; world model: ${epistemic.world_model}; quantification: ${epistemic.quantification}.`
      : null;
    if (!sameSet((claim.source_refs || []).map(({ json_pointer: pointer }) => pointer),
      requiredPointers)
      || typeof publicClaim !== "string" || !Array.isArray(competitors)
      || !epistemic || !outcomeScope
      || claim.text !== publicClaim
      || claim.epistemic_status !== "scenario"
      || claim.scope !== expectedScope
      || claim.uncertainty !== expectedUncertainty) {
      errors.push(error(
        "PATH_CLAIM_SOURCE_MISMATCH",
        "$.claims",
        "The path claim, competitors, epistemic boundary and scope must be exact typed source projections.",
      ));
    }
  }
  const legendByState = new Map(legend.map((entry) => [entry.state, entry]));
  for (const [index, condition] of (factPack?.if_conditions || []).entries()) {
    const expected = legendByState.get(condition?.state);
    if (!expected || !isDeepStrictEqual(condition?.public_state_display, expected)) {
      errors.push(error(
        "IF_STATE_DISPLAY_MISMATCH",
        `$.if_conditions[${index}].public_state_display`,
        "Condition display copy must come from the exact five-state legend entry.",
      ));
    }
  }
  if (factPack?.forecast_context?.truth_effect !== "none"
    || factPack?.forecast_context?.may_set_if_state !== false
    || factPack?.forecast_context?.semantic_role
      !== "forecast-probability-not-current-if-state") {
    errors.push(error(
      "PROBABILITY_TRUTH_EFFECT_FORBIDDEN",
      "$.forecast_context",
      "A forecast probability cannot set or alter the current executable IF state.",
    ));
  }
  return { schema_valid: schemaValid, valid: errors.length === 0, errors };
}

export function assessDeliberationScriptSemantics(script, expectedFactPackRef) {
  const errors = [];
  const schemaValid = validateScriptSchema(script);
  if (!schemaValid) {
    errors.push(error(
      "DELIBERATION_SCRIPT_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateScriptSchema.errors, { separator: "; " }),
    ));
  }
  if (!sameReference(script?.fact_pack_ref, expectedFactPackRef)) {
    errors.push(error(
      "FACILITATION_FACT_PACK_MISMATCH",
      "$.fact_pack_ref",
      "Facilitation must bind the exact fact-pack bytes used by every arm.",
    ));
  }
  const boundary = script?.facilitation_boundary || {};
  if ([
    "may_add_facts",
    "may_add_urgency",
    "may_add_probability",
    "may_set_if_state",
    "may_recommend_action",
  ].some((field) => boundary[field] !== false)) {
    errors.push(error(
      "FACILITATION_LEAKAGE",
      "$.facilitation_boundary",
      "Facilitation cannot add facts, urgency, probabilities, IF states or action recommendations.",
    ));
  }
  return { schema_valid: schemaValid, valid: errors.length === 0, errors };
}

export function assessOutcomeContractSemantics(outcome) {
  const errors = [];
  const schemaValid = validateOutcomeSchema(outcome);
  if (!schemaValid) {
    errors.push(error(
      "OUTCOME_CONTRACT_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateOutcomeSchema.errors, { separator: "; " }),
    ));
  }
  if (outcome?.primary_endpoint !== "complete-unaided-boundary-reconstruction"
    || FORBIDDEN_SUCCESS_ENDPOINTS.has(outcome?.primary_endpoint)
    || outcome?.endpoint_boundary?.aesthetic_preference !== "descriptive-only-not-success"
    || outcome?.endpoint_boundary?.perceived_authority !== "safety-harm-not-success"
    || outcome?.endpoint_boundary?.uncalibrated_confidence !== "calibration-harm-not-success"
    || outcome?.endpoint_boundary?.thesis_agreement !== "not-an-outcome") {
    errors.push(error(
      "SUCCESS_ENDPOINT_FORBIDDEN",
      "$.primary_endpoint",
      "Aesthetic preference, perceived authority, uncalibrated confidence and thesis agreement cannot be success endpoints.",
    ));
  }
  return { schema_valid: schemaValid, valid: errors.length === 0, errors };
}

export function assessExecutableIfFactBinding(sourceBundle, factPack, {
  rootDir = defaultRoot,
  sourceAssessment: suppliedAssessment = null,
} = {}) {
  const errors = [];
  let sourceAssessment = suppliedAssessment;
  try {
    sourceAssessment ||= assessTransitionBundle(sourceBundle, { rootDir });
  } catch (cause) {
    errors.push(error("SOURCE_CORE_ASSESSMENT_FAILED", "$", cause.message));
    return {
      valid: false,
      computed_rule_state: null,
      empirical_truth_established: false,
      authority_effect: "none",
      errors,
    };
  }
  if (sourceBundle?.bundle_stage !== "pre-projection-core"
    || sourceAssessment?.bundle_coherent !== true) {
    errors.push(error(
      "SOURCE_CORE_INELIGIBLE",
      "$",
      "Executable IF facts require the coherent Round 4 pre-projection core.",
    ));
  }

  let scopeManifest = null;
  try {
    const scopeRef = sourceBundle.canonical.scope_manifest_ref;
    const loaded = loadArtifact(scopeRef, rootDir);
    if (digest(loaded.bytes) !== scopeRef.sha256) {
      errors.push(error("SCOPE_MANIFEST_HASH_MISMATCH", "$.decision_context.scope",
        "Scope manifest bytes do not match the source core."));
    } else {
      scopeManifest = JSON.parse(loaded.bytes.toString("utf8"));
    }
  } catch (cause) {
    errors.push(error("SCOPE_MANIFEST_UNRESOLVED", "$.decision_context.scope", cause.message));
  }
  if (!scopeManifest
    || !isDeepStrictEqual(factPack?.decision_context?.scope, scopeManifest.canonical_scope)
    || factPack?.decision_context?.mapping_truth_assessed !== false) {
    errors.push(error(
      "CONDITION_SCOPE_MISMATCH",
      "$.decision_context.scope",
      "The fact pack must preserve the exact canonical scope and unresolved mapping-truth boundary.",
    ));
  }

  const evaluations = sourceAssessment?.executable_if?.governed_evaluations || [];
  const activeConditions = sourceAssessment?.component_results?.["evolution-ledger"]
    ?.public_projection?.active_conditions || [];
  const factConditions = Array.isArray(factPack?.if_conditions) ? factPack.if_conditions : [];
  const expectedConditionIds = sourceBundle?.canonical?.condition_ids || [];
  if (!sameSet(factConditions.map(({ condition_id: id }) => id), expectedConditionIds)
    || !unique(factConditions.map(({ condition_id: id }) => id))) {
    errors.push(error(
      "FACT_PACK_IF_COVERAGE_MISMATCH",
      "$.if_conditions",
      "Every source-core condition must appear exactly once in the shared facts.",
    ));
  }

  for (const [index, condition] of factConditions.entries()) {
    const receipt = evaluations.find((candidate) =>
      candidate.condition_definition_ref?.condition_id === condition.condition_id);
    const active = activeConditions.find((candidate) =>
      candidate.condition_definition_ref?.condition_id === condition.condition_id);
    if (!active || !isDeepStrictEqual(condition.condition_definition_ref,
      active.condition_definition_ref)) {
      errors.push(error(
        "CONDITION_DEFINITION_MISMATCH",
        `$.if_conditions[${index}].condition_definition_ref`,
        "The displayed condition must bind the exact active definition.",
      ));
    }
    if (!active || !isDeepStrictEqual(condition.claim, active.claim)
      || !isDeepStrictEqual(condition.scope, active.scope)) {
      errors.push(error(
        "CONDITION_SCOPE_MISMATCH",
        `$.if_conditions[${index}]`,
        "The displayed condition must preserve exact claim, period and scope fields.",
      ));
    }
    if (!receipt || !isDeepStrictEqual(condition.evaluation_receipt, receipt)) {
      errors.push(error(
        "EVALUATION_RECEIPT_MISMATCH",
        `$.if_conditions[${index}].evaluation_receipt`,
        "The displayed evaluation receipt must equal the recomputed source-core receipt.",
      ));
    }
    if (!receipt || condition.state !== receipt.computed_rule_state?.state) {
      errors.push(error(
        "DISPLAYED_STATE_MISMATCH",
        `$.if_conditions[${index}].state`,
        "The displayed IF state must equal the source-core computed rule state.",
      ));
    }
  }

  const forecastArtifact = sourceBundle?.artifacts?.find(({ role }) => role === "forecast");
  const forecastContext = factPack?.forecast_context;
  if (!forecastArtifact || forecastContext?.forecast_ref?.artifact_role !== "forecast"
    || forecastContext?.forecast_ref?.path !== forecastArtifact.path
    || forecastContext?.forecast_ref?.sha256 !== forecastArtifact.sha256
    || forecastContext?.forecast_ref?.json_pointer !== "/probability"
    || forecastContext?.condition_id !== expectedConditionIds[0]
    || forecastContext?.probability !== sourceAssessment?.component_results?.forecast?.forecast_probability
    || forecastContext?.issue_time_evaluation_hash !== evaluations[0]?.evaluation_hash
    || forecastContext?.truth_effect !== "none"
    || forecastContext?.may_set_if_state !== false) {
    errors.push(error(
      "FORECAST_CONTEXT_MISMATCH",
      "$.forecast_context",
      "Forecast context must bind its exact source while remaining orthogonal to current IF truth.",
    ));
  }

  return {
    valid: errors.length === 0,
    computed_rule_state: evaluations[0]?.computed_rule_state?.state || null,
    empirical_truth_established: false,
    authority_effect: "none",
    errors,
  };
}

export function assessExperimentManifest(manifest, { rootDir = defaultRoot } = {}) {
  const errors = [];
  const schemaValid = validateManifestSchema(manifest);
  if (!schemaValid) {
    errors.push(error(
      "MANIFEST_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateManifestSchema.errors, { separator: "; " }),
    ));
  }

  const arms = Array.isArray(manifest?.arms) ? manifest.arms : [];
  const semanticArms = arms.filter((arm) => arm && typeof arm === "object"
    && !Array.isArray(arm));
  const stopRules = Array.isArray(manifest?.safety?.stop_rules)
    ? manifest.safety.stop_rules
    : [];
  const semanticStopRules = stopRules.filter((rule) => rule && typeof rule === "object"
    && !Array.isArray(rule));
  const references = [
    ["$.protocol_ref", manifest?.protocol_ref],
    ["$.source_transition_bundle", manifest?.source_transition_bundle],
    ["$.fact_pack", manifest?.fact_pack],
    ...arms.flatMap((arm, index) => [
      ...(arm?.instrument_ref
        ? [[`$.arms[${index}].instrument_ref`, arm.instrument_ref]]
        : []),
      [`$.arms[${index}].fact_pack_ref`, arm?.fact_pack_ref],
      [`$.arms[${index}].outcome_contract_ref`, arm?.outcome_contract_ref],
      ...(arm?.deliberation_script_ref
        ? [[`$.arms[${index}].deliberation_script_ref`, arm.deliberation_script_ref]]
        : []),
    ]),
  ];

  let artifactIntegrity = true;
  const loadedByPath = new Map();
  for (const [path, ref] of references) {
    try {
      const loaded = loadedByPath.get(ref?.path) || loadArtifact(ref, rootDir);
      if (ref?.path) loadedByPath.set(ref.path, loaded);
      if (digest(loaded.bytes) !== ref.sha256) {
        artifactIntegrity = false;
        errors.push(error(
          "ARTIFACT_HASH_MISMATCH",
          `${path}.sha256`,
          "Retained artifact bytes do not match the manifest content address.",
        ));
      }
    } catch (cause) {
      artifactIntegrity = false;
      errors.push(error("ARTIFACT_PATH_INVALID", path, cause.message));
    }
  }

  let sourceDocument = null;
  let factPack = null;
  let artifactContractsValid = true;
  const parseJsonArtifact = (ref, code, path) => {
    try {
      const bytes = loadedByPath.get(ref?.path)?.bytes;
      return bytes ? JSON.parse(bytes.toString("utf8")) : null;
    } catch (cause) {
      artifactContractsValid = false;
      errors.push(error(code, path, cause.message));
      return null;
    }
  };
  try {
    const sourceBytes = loadedByPath.get(manifest?.source_transition_bundle?.path)?.bytes;
    if (sourceBytes) sourceDocument = JSON.parse(sourceBytes.toString("utf8"));
  } catch (cause) {
    errors.push(error("SOURCE_BUNDLE_JSON_INVALID", "$.source_transition_bundle", cause.message));
  }
  try {
    const factBytes = loadedByPath.get(manifest?.fact_pack?.path)?.bytes;
    if (factBytes) factPack = JSON.parse(factBytes.toString("utf8"));
  } catch (cause) {
    errors.push(error("FACT_PACK_JSON_INVALID", "$.fact_pack", cause.message));
  }

  const factPackAssessment = factPack
    ? assessFactPackSemantics(factPack, { rootDir, sourceBundle: sourceDocument })
    : { schema_valid: false, valid: false, errors: [] };
  const factPackSchemaValid = factPackAssessment.schema_valid;
  if (factPack && !factPackAssessment.valid) {
    artifactContractsValid = false;
    errors.push(...factPackAssessment.errors.map((item) => ({
      ...item,
      path: `$.fact_pack${item.path === "$" ? "" : item.path.slice(1)}`,
    })));
  }

  const protocol = parseJsonArtifact(
    manifest?.protocol_ref,
    "PROTOCOL_JSON_INVALID",
    "$.protocol_ref",
  );
  if (!protocol || !validateProtocolSchema(protocol)
    || protocol.protocol_id !== manifest?.protocol_ref?.artifact_id) {
    artifactContractsValid = false;
    errors.push(error(
      "ARTIFACT_TYPE_INVALID",
      "$.protocol_ref",
      "The protocol reference must resolve to the fixed structured protocol and matching inner ID.",
    ));
  }
  if (sourceDocument
    && sourceDocument.bundle_id !== manifest?.source_transition_bundle?.bundle_id) {
    errors.push(error(
      "SOURCE_BUNDLE_ID_MISMATCH",
      "$.source_transition_bundle.bundle_id",
      "The source bundle ID does not match the retained source-bundle bytes.",
    ));
  }
  if (factPack && factPack.fact_pack_id !== manifest?.fact_pack?.fact_pack_id) {
    errors.push(error(
      "FACT_PACK_ID_MISMATCH",
      "$.fact_pack.fact_pack_id",
      "The fact-pack ID does not match the retained fact-pack bytes.",
    ));
  }
  if (factPack && !sameSourceBundleReference(
    factPack.source_transition_bundle_ref,
    manifest?.source_transition_bundle,
  )) {
    errors.push(error(
      "FACT_PACK_SOURCE_MISMATCH",
      "$.fact_pack",
      "The fact pack does not bind the manifest's exact source transition bundle bytes.",
    ));
  }
  const sourceFactBinding = assessSourceFactBinding(sourceDocument, factPack);
  errors.push(...sourceFactBinding.errors);

  let sourceAssessment = null;
  let sourceCoreEligible = false;
  if (sourceDocument) {
    try {
      sourceAssessment = assessTransitionBundle(sourceDocument, { rootDir });
      sourceCoreEligible = sourceDocument.bundle_stage === "pre-projection-core"
        && sourceAssessment.bundle_coherent === true;
      if (!sourceCoreEligible) {
        errors.push(error(
          "SOURCE_CORE_INELIGIBLE",
          "$.source_transition_bundle",
          "The pinned source must be the coherent seven-artifact Round 4 pre-projection core before an experiment can be eligible.",
        ));
      }
    } catch (cause) {
      errors.push(error("SOURCE_CORE_ASSESSMENT_FAILED", "$.source_transition_bundle", cause.message));
    }
  }

  const executableIfFactBinding = sourceDocument && factPack
    ? assessExecutableIfFactBinding(sourceDocument, factPack, { rootDir, sourceAssessment })
    : { valid: false, errors: [] };
  if (!executableIfFactBinding.valid) {
    artifactContractsValid = false;
    errors.push(...executableIfFactBinding.errors.map((item) => ({
      ...item,
      path: `$.fact_pack${item.path === "$" ? "" : item.path.slice(1)}`,
    })));
  }

  let claimSourceBindingsValid = Boolean(sourceDocument && factPackSchemaValid);
  const claims = Array.isArray(factPack?.claims)
    ? factPack.claims.filter((claim) => claim && typeof claim === "object"
      && !Array.isArray(claim))
    : [];
  const claimIds = claims.map(({ claim_id: id }) => id);
  if (!unique(claimIds) || claims.length !== factPack?.claims?.length) {
    claimSourceBindingsValid = false;
    errors.push(error(
      "FACT_PACK_CLAIM_ID_DUPLICATE",
      "$.fact_pack.claims",
      "Fact-pack claim identities must be unique and structurally valid.",
    ));
  }
  for (const [claimIndex, claim] of claims.entries()) {
    const sourceRefs = Array.isArray(claim.source_refs) ? claim.source_refs : [];
    for (const [sourceIndex, ref] of sourceRefs.entries()) {
      const expected = ref?.artifact_role === "transition-bundle"
        ? manifest?.source_transition_bundle
        : sourceDocument?.artifacts?.find(({ role }) => role === ref?.artifact_role);
      const refPath = `$.fact_pack.claims[${claimIndex}].source_refs[${sourceIndex}]`;
      if (!expected || expected.path !== ref?.path || expected.sha256 !== ref?.sha256) {
        claimSourceBindingsValid = false;
        errors.push(error(
          "FACT_PACK_SOURCE_REF_MISMATCH",
          refPath,
          "A fact-pack source must resolve exactly to the pinned source core or one of its content-addressed artifacts.",
        ));
        continue;
      }
      try {
        const loaded = loadedByPath.get(ref.path) || loadArtifact(ref, rootDir);
        loadedByPath.set(ref.path, loaded);
        if (digest(loaded.bytes) !== ref.sha256) {
          artifactIntegrity = false;
          claimSourceBindingsValid = false;
          errors.push(error("ARTIFACT_HASH_MISMATCH", `${refPath}.sha256`,
            "Fact-pack source bytes do not match their content address."));
          continue;
        }
        const document = JSON.parse(loaded.bytes.toString("utf8"));
        if (pointerValue(document, ref.json_pointer) === undefined) {
          claimSourceBindingsValid = false;
          errors.push(error(
            "FACT_PACK_SOURCE_POINTER_INVALID",
            `${refPath}.json_pointer`,
            "The source pointer does not resolve inside the retained artifact bytes.",
          ));
        }
      } catch (cause) {
        artifactIntegrity = false;
        claimSourceBindingsValid = false;
        errors.push(error("ARTIFACT_PATH_INVALID", refPath, cause.message));
      }
    }
  }

  let factParity = semanticArms.length === 4;
  for (const [index, arm] of semanticArms.entries()) {
    if (!sameReference(arm.fact_pack_ref, manifest?.fact_pack)) {
      factParity = false;
      errors.push(error(
        "ARM_FACT_PACK_MISMATCH",
        `$.arms[${index}].fact_pack_ref`,
        "Every arm must bind the exact same fact-pack ID, path and content hash.",
      ));
    }
  }

  const factClaimIds = claims.map(({ claim_id: id }) => id);
  const factConditionIds = factPack?.canonical?.condition_ids || [];
  for (const [index, arm] of semanticArms.entries()) {
    const instrument = parseJsonArtifact(
      arm.instrument_ref,
      "INSTRUMENT_JSON_INVALID",
      `$.arms[${index}].instrument_ref`,
    );
    if (!instrument || !validateInstrumentSchema(instrument)
      || instrument.instrument_id !== arm.instrument_ref?.artifact_id
      || instrument.instrument_kind !== arm.instrument_kind
      || !sameSourceBundleReference(
        instrument.source_transition_bundle_ref,
        manifest?.source_transition_bundle,
      )
      || !sameReference(instrument.fact_pack_ref, manifest?.fact_pack)
      || !sameSet(instrument.render_contract?.claim_ids, factClaimIds)
      || !sameSet(instrument.render_contract?.condition_ids, factConditionIds)
      || !sameSet(instrument.render_contract?.state_legend_states, IF_STATES)
      || !sameSet(instrument.render_contract?.boundary_ids, REQUIRED_BOUNDARIES)) {
      artifactContractsValid = false;
      errors.push(error(
        "ARTIFACT_TYPE_INVALID",
        `$.arms[${index}].instrument_ref`,
        "An instrument must match its arm, bind the exact source and fact pack, and render every claim, condition, state and boundary.",
      ));
    }

    const outcome = parseJsonArtifact(
      arm.outcome_contract_ref,
      "OUTCOME_CONTRACT_JSON_INVALID",
      `$.arms[${index}].outcome_contract_ref`,
    );
    const outcomeAssessment = outcome
      ? assessOutcomeContractSemantics(outcome)
      : { valid: false };
    if (!outcome || !outcomeAssessment.valid
      || outcome.outcome_contract_id !== arm.outcome_contract_ref?.artifact_id
      || outcome.outcome_contract_id !== protocol?.analysis?.outcome_contract_id
      || outcome.estimand_id !== protocol?.analysis?.estimand_id
      || outcome.primary_endpoint !== protocol?.analysis?.primary_endpoint) {
      artifactContractsValid = false;
      errors.push(error(
        "ARTIFACT_TYPE_INVALID",
        `$.arms[${index}].outcome_contract_ref`,
        "The outcome artifact must satisfy its fixed schema and bind the protocol's exact outcome and estimand identities.",
      ));
    }

    if (arm.deliberation_script_ref) {
      const script = parseJsonArtifact(
        arm.deliberation_script_ref,
        "DELIBERATION_SCRIPT_JSON_INVALID",
        `$.arms[${index}].deliberation_script_ref`,
      );
      const scriptAssessment = script
        ? assessDeliberationScriptSemantics(script, manifest?.fact_pack)
        : { valid: false };
      if (!script || !scriptAssessment.valid
        || script.script_id !== arm.deliberation_script_ref.artifact_id) {
        artifactContractsValid = false;
        errors.push(error(
          "ARTIFACT_TYPE_INVALID",
          `$.arms[${index}].deliberation_script_ref`,
          "The deliberation reference must resolve to a fixed-script artifact with the matching inner ID.",
        ));
      }
    }
  }

  let protocolConstraintsValid = true;
  const armIds = semanticArms.map(({ arm_id: id }) => id);
  const instruments = semanticArms.map(({ instrument_kind: kind }) => kind);
  if (!unique(armIds) || !unique(instruments)
    || instruments.length !== REQUIRED_INSTRUMENTS.size
    || instruments.some((kind) => !REQUIRED_INSTRUMENTS.has(kind))) {
    protocolConstraintsValid = false;
    errors.push(error(
      "EXPERIMENT_ARM_SET_INVALID",
      "$.arms",
      "The manifest requires one unique arm for each preregistered comparator.",
    ));
  }
  if (semanticArms.some((arm) =>
    arm.allocation_weight !== protocol?.design?.allocation_ratio_by_instrument?.[arm.instrument_kind])) {
    protocolConstraintsValid = false;
    errors.push(error(
      "ALLOCATION_CONTRACT_MISMATCH",
      "$.arms",
      "Every arm allocation weight must equal the fixed balanced ratio in the structured protocol.",
    ));
  }
  const conventional = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "conventional-release");
  const releaseDeliberation = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "release-plus-deliberation");
  const observatoryDeliberation = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "observatory-plus-deliberation");
  const observatorySelfServe = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "observatory-self-serve");
  if (conventional?.deliberation_script_ref !== null
    || observatorySelfServe?.deliberation_script_ref !== null
    || !releaseDeliberation?.deliberation_script_ref
    || !sameFileReference(
      releaseDeliberation?.deliberation_script_ref,
      observatoryDeliberation?.deliberation_script_ref,
    )) {
    protocolConstraintsValid = false;
    errors.push(error(
      "DELIBERATION_SCRIPT_PARITY_INVALID",
      "$.arms",
      "Only the two deliberation arms may use a script, and both must bind the same script bytes.",
    ));
  }
  const outcomeRef = semanticArms[0]?.outcome_contract_ref;
  if (!outcomeRef || semanticArms.length !== 4
    || semanticArms.some((arm) => !sameFileReference(arm.outcome_contract_ref, outcomeRef))) {
    protocolConstraintsValid = false;
    errors.push(error(
      "OUTCOME_CONTRACT_PARITY_INVALID",
      "$.arms",
      "Every arm must bind the exact same outcome contract.",
    ));
  }

  const stopRuleIds = semanticStopRules.map(({ rule_id: id }) => id);
  for (const [required, specification] of REQUIRED_STOP_RULES) {
    if (!stopRuleIds.includes(required)) {
      protocolConstraintsValid = false;
      errors.push(error(
        "SAFETY_STOP_RULE_MISSING",
        "$.safety.stop_rules",
        `The preregistered ${required} stop line is missing.`,
      ));
      continue;
    }
    const declared = semanticStopRules.find(({ rule_id: id }) => id === required);
    if (declared.measure !== specification.measure
      || declared.operator !== specification.operator
      || declared.threshold !== specification.threshold
      || !sameSet(declared.strata, specification.strata)
      || declared.effect !== "pause-and-independent-review"
      || declared.compensation_across_strata !== "forbidden") {
      protocolConstraintsValid = false;
      errors.push(error(
        "SAFETY_STOP_RULE_MISMATCH",
        "$.safety.stop_rules",
        `The preregistered ${required} stop line has been weakened or reinterpreted.`,
      ));
    }
  }
  if (!unique(stopRuleIds)) {
    protocolConstraintsValid = false;
    errors.push(error(
      "SAFETY_STOP_RULE_DUPLICATE",
      "$.safety.stop_rules",
      "Safety stop-rule identities must be unique.",
    ));
  }

  const contractErrors = errors.filter(({ code }) => code !== "SOURCE_CORE_INELIGIBLE");
  const manifestContractValid = schemaValid
    && artifactIntegrity
    && factPackSchemaValid
    && sourceFactBinding.valid
    && executableIfFactBinding.valid
    && claimSourceBindingsValid
    && factParity
    && protocolConstraintsValid
    && artifactContractsValid
    && contractErrors.length === 0;
  const manifestValid = manifestContractValid && sourceCoreEligible;

  return {
    schema_version: "1.0.0",
    manifest_id: manifest?.manifest_id || null,
    schema_valid: schemaValid,
    artifact_integrity: artifactIntegrity,
    artifact_contracts_valid: artifactContractsValid,
    fact_pack_schema_valid: factPackSchemaValid,
    source_fact_binding_valid: sourceFactBinding.valid,
    executable_if_fact_binding_valid: executableIfFactBinding.valid,
    claim_source_bindings_valid: claimSourceBindingsValid,
    source_core_eligible: sourceCoreEligible,
    source_core_assessment: sourceAssessment ? {
      bundle_id: sourceAssessment.bundle_id,
      bundle_stage: sourceAssessment.bundle_stage,
      machine_valid: sourceAssessment.machine_valid,
      components_valid: sourceAssessment.components_valid,
      bundle_coherent: sourceAssessment.bundle_coherent,
      coherence_blocker_codes: sourceAssessment.coherence_blockers
        .map(({ code }) => code),
    } : null,
    fact_parity: factParity,
    rendered_parity_assessed: false,
    protocol_constraints_valid: protocolConstraintsValid,
    manifest_contract_valid: manifestContractValid,
    manifest_valid: manifestValid,
    analysis_ready: false,
    recruitment_allowed: false,
    truth_effect: "none",
    authority_effect: "none",
    errors,
  };
}

export function assertExperimentManifest(manifest, options) {
  const result = assessExperimentManifest(manifest, options);
  if (!result.manifest_valid) {
    const detail = result.errors.map(({ code, path, message }) =>
      `${code} (${path}): ${message}`).join("\n");
    throw new Error(`Experiment manifest is invalid:\n${detail}`);
  }
  return result;
}
