import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  evaluateKernelCondition,
  validateExecutableIfKernel,
} from "../../contracts/executable-if/validate.mjs";
import { validateExecutableIfEvolution } from "../../contracts/evolution/project-executable-if.mjs";

const actionSchema = JSON.parse(readFileSync(
  new URL("../schema/preparation-action-1.2.schema.json", import.meta.url),
  "utf8",
));
const registerSchema = JSON.parse(readFileSync(
  new URL("../schema/preparation-register-1.2.schema.json", import.meta.url),
  "utf8",
));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(actionSchema);
const validateSchema = ajv.compile(registerSchema);

const IF_STATES = Object.freeze(["true", "false", "unknown", "stale", "conflicted"]);
const NONDECISIVE_STATES = new Set(["unknown", "stale", "conflicted"]);
const LOW_REGRET_VERBS = new Set(["assess", "consult", "prepare", "review"]);
const REQUIRED_START_GATES = Object.freeze([
  "if-state-eligible",
  "receipt-current",
  "resources-ready",
  "human-approval",
]);
const REQUIRED_STOP_GATES = Object.freeze([
  "condition-state-changed",
  "receipt-invalidated",
  "safeguard-failed",
]);

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function same(left, right) {
  return canonicalise(left) === canonicalise(right);
}

function retainedSourceBytesMatch(source) {
  if (!(source?.bytes instanceof Uint8Array)) return false;
  const bytes = Buffer.from(source.bytes);
  const sha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (sha256 !== source.sha256) return false;
  try {
    return same(JSON.parse(bytes.toString("utf8")), source.document);
  } catch {
    return false;
  }
}

function problem(code, path, message) {
  return { code, path, message };
}

function pinnedRef(envelope) {
  return envelope && {
    id: envelope.id,
    version: envelope.version,
    checksum: envelope.checksum,
  };
}

function envelopeMap(envelopes = []) {
  return new Map(envelopes.map((envelope) => [canonicalise(pinnedRef(envelope)), envelope]));
}

function resolveEnvelope(reference, envelopes) {
  return envelopeMap(envelopes || []).get(canonicalise(reference));
}

function schemaProblems() {
  return (validateSchema.errors || []).map((error) => problem(
    "SCHEMA_INVALID",
    error.instancePath || "/",
    error.message || "schema validation failed",
  ));
}

function activeDefinition(kernel, conditionId) {
  const state = kernel?.current_state?.find(({ lifecycle, condition_definition_ref: reference }) =>
    lifecycle === "active" && reference.condition_id === conditionId);
  if (!state) return null;
  return kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
    .find((definition) => same({
      condition_id: definition.condition_id,
      definition_version: definition.definition_version,
      definition_hash: definition.definition_hash,
    }, state.condition_definition_ref)) || null;
}

function publicCondition(definition) {
  const { who, verb, object, standard, period } = definition.claim;
  return `${who} ${verb} ${object}, at the standard that ${standard}, from ${period.starts_at} through ${period.ends_at}`;
}

function conditionScope(definition) {
  return {
    ...structuredClone(definition.scope),
    period: structuredClone(definition.claim.period),
  };
}

function expectedConditionBinding(sourceKernel, sourceEvolution, conditionId) {
  const kernel = sourceKernel.document;
  const evolution = sourceEvolution.document;
  const definition = activeDefinition(kernel, conditionId);
  const projected = evolution?.current_state?.conditions?.find(({ condition_definition_ref: reference }) =>
    reference.condition_id === conditionId);
  if (!definition || !projected) return null;
  return {
    condition_id: conditionId,
    public_condition: publicCondition(definition),
    kernel: {
      artifact_ref: { artifact_path: sourceKernel.path, artifact_sha256: sourceKernel.sha256 },
      kernel_id: kernel.kernel_id,
      manifest_hash: kernel.manifest_hash,
      condition_definition_ref: structuredClone(projected.condition_definition_ref),
    },
    evolution: {
      artifact_ref: { artifact_path: sourceEvolution.path, artifact_sha256: sourceEvolution.sha256 },
      ledger_id: evolution.ledger_id,
      manifest_hash: evolution.manifest_hash,
      source_state_version: projected.source_state_version,
      history_tip_ref: {
        sequence: evolution.source_history_ref.tip_sequence,
        event_id: evolution.source_history_ref.tip_event_id,
        event_hash: evolution.source_history_ref.tip_event_hash,
      },
      condition_source_event_ref: structuredClone(projected.source_event_ref),
    },
    condition_scope: conditionScope(definition),
    scope_relationship: "exact",
    verification_state: "bundle-verification-required",
    authority_effect: "none",
    action_authorised: false,
  };
}

function projectReceipt(receipt, bindingReference) {
  return {
    condition_binding_ref: bindingReference,
    evaluated_at: receipt.evaluated_at,
    clock: receipt.clock,
    evaluator_ref: receipt.evaluator_ref,
    condition_definition_ref: receipt.condition_definition_ref,
    kernel_manifest_hash: receipt.kernel_manifest_hash,
    evaluation_hash: receipt.evaluation_hash,
    evidence_state_hash: receipt.evidence_state_hash,
    observation_hashes: receipt.observation_hashes,
    mechanically_valid_for_evaluation: receipt.mechanically_valid_for_evaluation,
    computed_rule_state: receipt.computed_rule_state,
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
  };
}

export function renderActionSentenceV12(action) {
  const states = action.if_binding.state_trigger.eligible_states.join(", ");
  return `Proposal: ${action.verb} ${action.object.description} IF the computed IF state is ${states}. Re-evaluate before starting. Eligibility is not authority. This record does not authorise action.`;
}

function envelopeProblems(envelopes, path) {
  const problems = [];
  const identities = new Set();
  for (const [index, envelope] of (envelopes || []).entries()) {
    const identity = envelope && `${envelope.id}@${envelope.version}`;
    if (identities.has(identity)) {
      problems.push(problem("ENVELOPE_IDENTITY_DUPLICATE", `${path}/${index}`, identity));
    }
    identities.add(identity);
    if (envelope?.checksum !== checksumJsonV12(envelope?.content)) {
      problems.push(problem(
        "ENVELOPE_CHECKSUM_MISMATCH",
        `${path}/${index}/checksum`,
        "envelope checksum must bind its complete canonical content",
      ));
    }
  }
  return problems;
}

function statePartitionProblems(trigger, path) {
  const eligible = trigger?.eligible_states || [];
  const blocked = trigger?.blocked_states || [];
  const union = [...eligible, ...blocked];
  const exactStateSet = IF_STATES.every((state) => union.includes(state)) &&
    union.every((state) => IF_STATES.includes(state));
  const noDuplicates = new Set(union).size === union.length;
  if (eligible.length === 0 || blocked.length === 0 || !exactStateSet || !noDuplicates) {
    return [problem(
      "STATE_PARTITION_INVALID",
      path,
      "eligible and blocked states must be non-empty, disjoint, and partition exactly all five IF states",
    )];
  }
  return [];
}

function gateSet(controls = []) {
  return new Set(controls.map(({ gate }) => gate));
}

function actionProblems(action, index, register) {
  const path = `/actions/${index}`;
  const problems = statePartitionProblems(action?.if_binding?.state_trigger, `${path}/if_binding/state_trigger`);
  const trigger = action?.if_binding?.state_trigger;
  const admitsNondecisive = trigger?.eligible_states?.some((state) => NONDECISIVE_STATES.has(state));
  if (admitsNondecisive && (
    !LOW_REGRET_VERBS.has(action?.verb) ||
    action?.reversibility?.class !== "reversible" ||
    action?.decision_use !== "research-only" ||
    trigger?.re_evaluate_before_start !== true
  )) {
    problems.push(problem(
      "NONDECISIVE_ACTION_UNSAFE",
      path,
      "unknown, stale or conflicted triggers permit only reversible research-only assess, consult, prepare or review actions with immediate re-evaluation",
    ));
  }
  const startGates = gateSet(action?.controls?.start_conditions || []);
  const stopGates = gateSet(action?.controls?.stop_conditions || []);
  for (const gate of REQUIRED_START_GATES) {
    if (!startGates.has(gate)) problems.push(problem("CONTROL_GATE_MISSING", `${path}/controls/start_conditions`, gate));
  }
  for (const gate of REQUIRED_STOP_GATES) {
    if (!stopGates.has(gate)) problems.push(problem("CONTROL_GATE_MISSING", `${path}/controls/stop_conditions`, gate));
  }
  const binding = resolveEnvelope(action?.if_binding?.condition_binding_ref, register.condition_bindings);
  const receipt = resolveEnvelope(action?.if_binding?.evaluation_receipt_ref, register.evaluation_receipts);
  const evidence = resolveEnvelope(action?.evidence_bundle_ref, register.evidence_bundles);
  if (!binding || !receipt || !evidence) {
    problems.push(problem("ACTION_REF_UNRESOLVED", path, "action references must resolve exact envelopes"));
    return problems;
  }
  if (!same(action.scope, {
    jurisdictions: binding.content.condition_scope.jurisdictions,
    geographies: binding.content.condition_scope.geographies,
    cohorts: binding.content.condition_scope.cohorts,
    services: binding.content.condition_scope.services,
  })) {
    problems.push(problem("ACTION_SCOPE_MISMATCH", `${path}/scope`, "action scope must equal the bound condition scope"));
  }
  if (!same(receipt.content.condition_binding_ref, pinnedRef(binding))) {
    problems.push(problem("ACTION_REF_UNRESOLVED", `${path}/if_binding`, "receipt and action must resolve the same condition binding"));
  }
  if (action.public_sentence !== renderActionSentenceV12(action)) {
    problems.push(problem("PUBLIC_SENTENCE_MISMATCH", `${path}/public_sentence`, "public sentence must expose eligible states, re-evaluation and the authority ceiling"));
  }
  return problems;
}

function verifyExternalBindings(register, sources, problems) {
  const { sourceKernel, sourceEvolution } = sources;
  if (!sourceKernel?.document || !sourceEvolution?.document) {
    problems.push(problem("SOURCE_BINDING_MISMATCH", "/condition_bindings", "exact retained kernel and evolution sources are required"));
    return false;
  }
  if (!retainedSourceBytesMatch(sourceKernel) || !retainedSourceBytesMatch(sourceEvolution)) {
    problems.push(problem(
      "SOURCE_BYTES_MISMATCH",
      "/condition_bindings",
      "source documents and claimed digests must reproduce the retained kernel and evolution bytes",
    ));
    return false;
  }
  const kernelValidation = validateExecutableIfKernel(sourceKernel.document);
  const evolutionValidation = validateExecutableIfEvolution(sourceEvolution.document, {
    sourceKernel: sourceKernel.document,
    sourceKernelArtifactSha256: sourceKernel.sha256,
  });
  if (!kernelValidation.machine_valid || !evolutionValidation.ledger_valid) {
    problems.push(problem("SOURCE_BINDING_MISMATCH", "/condition_bindings", "source artifacts must be internally valid and mutually bound"));
    return false;
  }
  let verified = true;
  for (const [index, envelope] of (register.condition_bindings || []).entries()) {
    const expected = expectedConditionBinding(sourceKernel, sourceEvolution, envelope.content.condition_id);
    if (!expected || !same(envelope.content, expected)) {
      problems.push(problem("CONDITION_BINDING_MISMATCH", `/condition_bindings/${index}/content`, "condition binding must exactly reproduce source identity, history, scope and period"));
      verified = false;
    }
  }
  for (const [index, envelope] of (register.evaluation_receipts || []).entries()) {
    const binding = resolveEnvelope(envelope.content.condition_binding_ref, register.condition_bindings);
    if (!binding || envelope.content.evaluated_at !== register.as_of) {
      problems.push(problem("EVALUATION_RECEIPT_MISMATCH", `/evaluation_receipts/${index}/content`, "receipt must resolve one binding and use the register clock"));
      verified = false;
      continue;
    }
    const recomputed = evaluateKernelCondition(
      sourceKernel.document,
      binding.content.condition_id,
      { evaluatedAt: envelope.content.evaluated_at },
    );
    const expected = projectReceipt(recomputed, pinnedRef(binding));
    if (!same(envelope.content, expected)) {
      problems.push(problem("EVALUATION_RECEIPT_MISMATCH", `/evaluation_receipts/${index}/content`, "receipt must be the exact closed projection of a fresh kernel evaluation"));
      verified = false;
    }
  }
  return verified;
}

export function checksumJsonV12(value) {
  return `sha256:${createHash("sha256").update(Buffer.from(canonicalise(value))).digest("hex")}`;
}

export function assessPreparationRegisterV12(register, sources = {}) {
  const schemaConformant = validateSchema(register);
  const problems = schemaConformant ? [] : schemaProblems();
  problems.push(...envelopeProblems(register?.condition_bindings, "/condition_bindings"));
  problems.push(...envelopeProblems(register?.evaluation_receipts, "/evaluation_receipts"));
  problems.push(...envelopeProblems(register?.evidence_bundles, "/evidence_bundles"));
  for (const [index, action] of (register?.actions || []).entries()) {
    problems.push(...actionProblems(action, index, register));
  }
  const externalBindingsVerified = verifyExternalBindings(register, sources, problems);
  const registerConsistent = schemaConformant && problems.length === 0;
  const actions = (register?.actions || []).map((action) => {
    const receipt = resolveEnvelope(action?.if_binding?.evaluation_receipt_ref, register.evaluation_receipts);
    const state = receipt?.content?.computed_rule_state?.state || "unknown";
    const mechanicallyValid = receipt?.content?.mechanically_valid_for_evaluation === true;
    const triggerMatches = registerConsistent && externalBindingsVerified && mechanicallyValid &&
      action.if_binding.state_trigger.eligible_states.includes(state);
    return {
      action_id: action.action_id,
      computed_rule_state: state,
      trigger_matches: triggerMatches,
      eligible_for_consideration: triggerMatches,
      action_authorised: false,
    };
  });
  return {
    schema_conformant: schemaConformant,
    register_consistent: registerConsistent,
    structurally_publishable_proposal: registerConsistent && externalBindingsVerified,
    external_bindings_verified: externalBindingsVerified,
    actions,
    evidence_truth_assessed: false,
    actor_identity_verified: false,
    action_authorised: false,
    problems,
    errors: problems,
  };
}
