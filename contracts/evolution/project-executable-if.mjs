import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  computeEvidenceStateHash,
  validateExecutableIfKernel,
} from "../executable-if/validate.mjs";

const schema = JSON.parse(readFileSync(
  new URL("./schema/executable-if-evolution.schema.json", import.meta.url),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const HASH_DOMAIN = "mind-flow:executable-if-evolution:v2";

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

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function problem(code, path, message) {
  return { code, path, message };
}

function definitionRef(definition) {
  return {
    condition_id: definition.condition_id,
    definition_version: definition.definition_version,
    definition_hash: definition.definition_hash,
  };
}

function sourceEventRef(event) {
  return {
    sequence: event.sequence,
    event_id: event.event_id,
    operation: event.operation,
    event_hash: event.event_hash,
  };
}

function definitionsByRef(kernel) {
  return new Map(kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
    .map((definition) => [canonicalJson(definitionRef(definition)), definition]));
}

function activeDefinitionStates(kernel) {
  return [...kernel.current_state]
    .filter(({ lifecycle }) => lifecycle === "active")
    .sort((left, right) => left.condition_id.localeCompare(right.condition_id));
}

function producerForState(kernel, state) {
  return [...kernel.events].reverse().find((event) => event.new_states.some((candidate) =>
    same(candidate, state)));
}

function evidenceStateRef(kernel) {
  const tip = kernel.evidence_events.at(-1);
  return {
    event_count: kernel.evidence_events.length,
    tip_event_id: tip.evidence_event_id,
    tip_event_hash: tip.evidence_event_hash,
    state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
  };
}

function sourceHistoryRef(kernel) {
  const tip = kernel.events.at(-1);
  const evidenceTip = kernel.evidence_events.at(-1);
  return {
    history_status: "complete-and-locally-validated",
    event_count: kernel.events.length,
    tip_sequence: tip.sequence,
    tip_event_id: tip.event_id,
    tip_event_hash: tip.event_hash,
    operations: kernel.events.map(({ operation }) => operation),
    event_refs: kernel.events.map(sourceEventRef),
    active_condition_definition_refs: activeDefinitionStates(kernel)
      .map(({ condition_definition_ref: reference }) => structuredClone(reference)),
    evidence_event_count: kernel.evidence_events.length,
    evidence_tip_event_id: evidenceTip.evidence_event_id,
    evidence_tip_event_hash: evidenceTip.evidence_event_hash,
    evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
  };
}

function conditionProjections(kernel) {
  const definitions = definitionsByRef(kernel);
  const evidenceRef = evidenceStateRef(kernel);
  return activeDefinitionStates(kernel).map((state) => {
    const definition = definitions.get(canonicalJson(state.condition_definition_ref));
    const producer = producerForState(kernel, state);
    if (!definition || !producer) {
      throw new TypeError(`active condition ${state.condition_id} has no exact definition producer`);
    }
    return {
      condition_definition_ref: structuredClone(state.condition_definition_ref),
      source_state_version: state.state_version,
      source_lifecycle: state.lifecycle,
      source_event_ref: sourceEventRef(producer),
      proposition: definition.proposition,
      claim: structuredClone(definition.claim),
      scope: structuredClone(definition.scope),
      evidence_state_ref: structuredClone(evidenceRef),
      assessment_status: "open",
      assessment: null,
      unresolved_challenge_ids: [],
    };
  });
}

function publicProjection(projection) {
  // This is a retained provenance annotation, not an inference from event count.
  // Pin the AU construction prefix's hash-chain tip and current overlay identity;
  // do not relabel historical overlays or any similarly named, different history.
  const auConstruction = projection.ledger_id === 'ledger.au.primary-care.current' &&
    projection.source_kernel_ref.kernel_id === 'kernel.au.primary-care.r3' &&
    projection.source_history_ref.event_refs[10]?.event_hash ===
      'sha256:54d8a297b4b7dbda0e1d0aed523d5b5982682431e6daab8d9894c57165b11758';
  return {
    history: {
      status: "complete-source-bound",
      change_count: projection.source_history_ref.event_count,
      operations: structuredClone(projection.source_history_ref.operations),
      notice: "The executable IF kernel owns definition history. This overlay binds that complete local history and opens no empirical assessment." +
        (auConstruction ? " Events 1 to 11 are construction replay, not eleven observed changes. Later events require their own source-based justification; event count alone is not an empirical progress measure." : ""),
    },
    active_conditions: projection.condition_projections.map((condition) => ({
      condition_definition_ref: structuredClone(condition.condition_definition_ref),
      proposition: condition.proposition,
      claim: structuredClone(condition.claim),
      scope: structuredClone(condition.scope),
      assessment_status: condition.assessment_status,
    })),
    boundaries: {
      mechanical_rule_state_is_empirical_truth: false,
      authority_granted: false,
      action_authorised: false,
    },
  };
}

export function computeExecutableIfEvolutionManifestHash(projection) {
  return digest("overlay-manifest", without(projection, "manifest_hash"));
}

export function projectExecutableIfEvolution(kernel, {
  artifact_path: artifactPath,
  artifact_sha256: artifactSha256,
  generated_at: generatedAt,
  ledger_id: ledgerId = `ledger.${kernel?.kernel_id}.assessment-overlay`,
} = {}) {
  const sourceValidation = validateExecutableIfKernel(kernel);
  if (!sourceValidation.machine_valid || !sourceValidation.integrity_valid ||
      !sourceValidation.evidence_history_valid) {
    throw new TypeError("executable IF evolution requires an intact source kernel");
  }
  const history = sourceHistoryRef(kernel);
  const conditions = conditionProjections(kernel);
  const projection = {
    schema_version: "2.0.0",
    ledger_id: ledgerId,
    classification: "research-draft",
    generated_at: generatedAt,
    source_kernel_ref: {
      artifact_path: artifactPath,
      artifact_sha256: artifactSha256,
      kernel_id: kernel.kernel_id,
      manifest_hash: kernel.manifest_hash,
      evaluator_ref: structuredClone(kernel.evaluator),
    },
    source_history_ref: history,
    condition_projections: conditions,
    governance_events: [],
    current_state: {
      as_of_sequence: history.tip_sequence,
      as_of_event_id: history.tip_event_id,
      as_of_event_hash: history.tip_event_hash,
      evidence_state_hash: history.evidence_state_hash,
      conditions: structuredClone(conditions),
    },
    publication_anchor: {
      verification_status: "not-verified-by-external-checkpoint",
      checkpoint_uri: "https://mind-flow.org/checkpoints/unpublished/round-04",
      source_event_count: history.event_count,
      tip_event_id: history.tip_event_id,
      tip_event_hash: history.tip_event_hash,
    },
    public_projection: null,
    manifest_hash: null,
    contract_boundary: {
      definition_history_owner: "source-executable-if-kernel",
      history_validity_effect: "source-binding-and-integrity-only",
      condition_truth_effect: "none",
      authority_effect: "none",
      action_authorisation_effect: "none",
    },
  };
  projection.public_projection = publicProjection(projection);
  projection.manifest_hash = computeExecutableIfEvolutionManifestHash(projection);
  return projection;
}

export function validateExecutableIfEvolution(projection, {
  sourceKernel,
  sourceKernelArtifactSha256,
} = {}) {
  const errors = [];
  const schemaValid = validateSchema(projection);
  if (!schemaValid) {
    errors.push(...(validateSchema.errors || []).map((error) => ({
      code: "SCHEMA_INVALID",
      path: error.instancePath || "$",
      message: error.message,
    })));
  }
  const manifestValid = projection?.manifest_hash ===
    computeExecutableIfEvolutionManifestHash(projection);
  if (!manifestValid) {
    errors.push(problem(
      "MANIFEST_HASH_MISMATCH",
      "$.manifest_hash",
      "evolution overlay manifest does not match its exact canonical content",
    ));
  }
  if (!same(projection?.condition_projections, projection?.current_state?.conditions)) {
    errors.push(problem(
      "CURRENT_STATE_MISMATCH",
      "$.current_state.conditions",
      "current state must reproduce the exact active condition projections",
    ));
  }
  if (!same(projection?.public_projection, publicProjection(projection))) {
    errors.push(problem(
      "PUBLIC_PROJECTION_MISMATCH",
      "$.public_projection",
      "public projection must be deterministically rendered from the source-bound overlay",
    ));
  }

  let sourceBindingVerified = false;
  if (!sourceKernel || !sourceKernelArtifactSha256) {
    errors.push(problem(
      "SOURCE_KERNEL_UNVERIFIED",
      "$.source_kernel_ref",
      "complete history requires the exact retained source-kernel bytes",
    ));
  } else {
    const sourceValidation = validateExecutableIfKernel(sourceKernel);
    const expectedKernelRef = {
      artifact_path: projection?.source_kernel_ref?.artifact_path,
      artifact_sha256: sourceKernelArtifactSha256,
      kernel_id: sourceKernel.kernel_id,
      manifest_hash: sourceKernel.manifest_hash,
      evaluator_ref: sourceKernel.evaluator,
    };
    const expectedHistory = sourceHistoryRef(sourceKernel);
    const expectedConditions = conditionProjections(sourceKernel);
    const expectedCurrent = {
      as_of_sequence: expectedHistory.tip_sequence,
      as_of_event_id: expectedHistory.tip_event_id,
      as_of_event_hash: expectedHistory.tip_event_hash,
      evidence_state_hash: expectedHistory.evidence_state_hash,
      conditions: structuredClone(expectedConditions),
    };
    const kernelRefValid = sourceValidation.machine_valid &&
      sourceValidation.integrity_valid && sourceValidation.evidence_history_valid &&
      same(projection?.source_kernel_ref, expectedKernelRef);
    const sourceHistoryValid = same(projection?.source_history_ref, expectedHistory);
    const projectionValid = same(projection?.condition_projections, expectedConditions) &&
      same(projection?.current_state, expectedCurrent);
    if (!kernelRefValid) {
      errors.push(problem(
        "SOURCE_KERNEL_MISMATCH",
        "$.source_kernel_ref",
        "source reference must bind the exact validated kernel bytes, manifest and evaluator",
      ));
    }
    if (!sourceHistoryValid) {
      errors.push(problem(
        "SOURCE_HISTORY_MISMATCH",
        "$.source_history_ref",
        "source history must preserve every kernel definition and evidence event tip",
      ));
    }
    if (!projectionValid) {
      errors.push(problem(
        "ACTIVE_DEFINITION_REF_MISMATCH",
        "$.condition_projections",
        "active projections must reproduce exact kernel definitions, claims, scopes and producer events",
      ));
    }
    sourceBindingVerified = kernelRefValid && sourceHistoryValid && projectionValid;
  }

  const generated = Date.parse(projection?.generated_at);
  const sourceRecorded = Date.parse(sourceKernel?.evidence_events?.at(-1)?.recorded_at);
  if (sourceKernel && (!Number.isFinite(generated) || generated < sourceRecorded)) {
    errors.push(problem(
      "PROJECTION_CHRONOLOGY_INVALID",
      "$.generated_at",
      "an evolution overlay cannot predate the source history it claims to bind",
    ));
  }

  const machineValid = schemaValid;
  const integrityValid = schemaValid && manifestValid &&
    !errors.some(({ code }) => ["CURRENT_STATE_MISMATCH", "PUBLIC_PROJECTION_MISMATCH"].includes(code));
  const historyComplete = sourceBindingVerified;
  return {
    schema_valid: schemaValid,
    machine_valid: machineValid,
    integrity_valid: integrityValid,
    source_binding_verified: sourceBindingVerified,
    history_complete: historyComplete,
    ledger_valid: machineValid && integrityValid && sourceBindingVerified &&
      !errors.some(({ code }) => code === "PROJECTION_CHRONOLOGY_INVALID"),
    current_state: structuredClone(projection?.current_state || null),
    public_projection: structuredClone(projection?.public_projection || null),
    condition_truth_assessed: false,
    authority_granted: false,
    action_authorised: false,
    errors,
  };
}
