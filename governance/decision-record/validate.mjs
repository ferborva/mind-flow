import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  GOVERNANCE_BOUNDARIES,
  baseRecordProblems,
  computeGovernancePayloadHash,
  computeGovernanceReceiptHash,
  computeGovernanceRecordHash,
  issue,
  sameCanonical,
  sameSet,
} from "../lib/record-contract.mjs";
import { validateNegotiationRecord } from "../negotiation-record/validate.mjs";

const commonSchemaBytes = readFileSync(
  new URL("../schema/governance-record-common.schema.json", import.meta.url),
);
const decisionSchemaBytes = readFileSync(
  new URL("./schema/decision-record.schema.json", import.meta.url),
);
const schemaDigests = {
  common: "f1ae03fee24d05b63460fdc953416256083741b92f8431a7106afa6f723b04f7",
  decision: "c9e074335dce77bb149f97ac91bb00d2799b579e6e651777486d3080fd434d34",
};
for (const [name, bytes] of [
  ["common", commonSchemaBytes],
  ["decision", decisionSchemaBytes],
]) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== schemaDigests[name]) {
    throw new Error(`${name} governance schema bytes differ from the pinned validator contract`);
  }
}
const commonSchema = JSON.parse(commonSchemaBytes.toString("utf8"));
const decisionSchema = JSON.parse(decisionSchemaBytes.toString("utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(commonSchema);
const validateSchema = ajv.compile(decisionSchema);

function distinct(values) {
  return [...new Set(values)];
}

function sourceProblems(
  record,
  sourceNegotiation,
  expectedIfBinding,
  expectedGovernanceContext,
  asOf,
) {
  if (!sourceNegotiation || typeof sourceNegotiation !== "object") {
    return [issue(
      "NEGOTIATION_SOURCE_REQUIRED",
      "/payload/negotiation_ref",
      "decision verification requires the complete retained source negotiation",
    )];
  }
  const errors = [];
  const sourceResult = validateNegotiationRecord(sourceNegotiation, {
    expectedIfBinding,
    expectedGovernanceContext,
    asOf,
  });
  if (!sourceResult.machine_valid) {
    return [issue(
      "SOURCE_NEGOTIATION_INVALID",
      "/payload/negotiation_ref",
      "source negotiation does not pass its own contract at the decision verification instant",
    )];
  }
  const sourceReference = {
    record_id: sourceNegotiation.record_id,
    version: sourceNegotiation.version,
    record_hash: sourceNegotiation.record_hash,
  };
  if (!sameCanonical(record?.payload?.negotiation_ref, sourceReference) ||
      sourceNegotiation.record_hash !== computeGovernanceRecordHash(sourceNegotiation)) {
    errors.push(issue(
      "NEGOTIATION_BINDING_MISMATCH",
      "/payload/negotiation_ref",
      "decision does not bind the exact content-addressed source negotiation",
    ));
  }
  if (!sameCanonical(record?.payload?.if_binding, sourceNegotiation.payload.if_binding)) {
    errors.push(issue(
      "NEGOTIATION_IF_BINDING_MISMATCH",
      "/payload/if_binding",
      "decision must retain the source negotiation's exact IF definition and receipt snapshot",
    ));
  }
  const sourcePositionIds = sourceNegotiation.payload.positions.map(({ position_id: id }) => id);
  const sourceDissentIds = sourceNegotiation.payload.dissent.map(({ dissent_id: id }) => id);
  const sourceUnresolvedIds = sourceNegotiation.payload.dissent
    .filter(({ status }) => status === "unresolved")
    .map(({ dissent_id: id }) => id);
  const deliberation = record?.payload?.deliberation;
  if (!sameSet(deliberation?.position_refs || [], sourcePositionIds) ||
      !sameSet(deliberation?.dissent_refs || [], sourceDissentIds) ||
      !sameSet(deliberation?.unresolved_dissent_refs || [], sourceUnresolvedIds)) {
    errors.push(issue(
      "DELIBERATION_PRESERVATION_INVALID",
      "/payload/deliberation",
      "decision must preserve every source position, dissent and unresolved dissent identity",
    ));
  }
  if (!sameCanonical(record?.payload?.affected_consumers, sourceNegotiation.payload.affected_consumers) ||
      !sameCanonical(record?.payload?.representations, sourceNegotiation.payload.representations) ||
      !sameCanonical(record?.payload?.participants, sourceNegotiation.payload.participants)) {
    errors.push(issue(
      "AFFECTED_CONSUMER_MISMATCH",
      "/payload/affected_consumers",
      "decision must carry forward source consumers, representations and participants unchanged",
    ));
  }
  if (!sameCanonical(record?.payload?.action, sourceNegotiation.payload.action_candidate)) {
    errors.push(issue(
      "ACTION_NEGOTIATION_MISMATCH",
      "/payload/action",
      "decision action must equal the exact candidate action preserved by the source negotiation",
    ));
  }
  if (!sameCanonical(record?.payload?.authority, sourceNegotiation.payload.authority)) {
    errors.push(issue(
      "AUTHORITY_NEGOTIATION_MISMATCH",
      "/payload/authority",
      "decision authority claim must equal the exact claim preserved by the source negotiation",
    ));
  }
  const latestSourceSignature = Math.max(...sourceNegotiation.signatures
    .map(({ signed_at: value }) => Date.parse(value)));
  if (Date.parse(sourceNegotiation.payload.created_at) >= Date.parse(record?.payload?.created_at) ||
      latestSourceSignature >= Date.parse(record?.payload?.created_at)) {
    errors.push(issue(
      "NEGOTIATION_CHRONOLOGY_INVALID",
      "/payload/negotiation_ref",
      "the complete source negotiation and all required attestations must predate the decision",
    ));
  }
  const blockingDissent = sourceNegotiation.payload.dissent
    .some(({ status, blocks_activation: blocks }) => status === "unresolved" && blocks);
  if (blockingDissent && (record?.payload?.decision?.activation_state !== "blocked" ||
      !record?.payload?.decision?.blocking_reasons?.includes("unresolved-blocking-dissent"))) {
    errors.push(issue(
      "DISSENT_GATE_INVALID",
      "/payload/decision/activation_state",
      "unresolved blocking dissent in the source negotiation must block the decision action",
    ));
  }
  return errors;
}

function decisionProblems(record) {
  const errors = [];
  const payload = record?.payload;
  const participantIds = (payload?.participants || []).map(({ actor_id: id }) => id);
  if (!participantIds.includes(payload?.authority?.holder_actor_id) ||
      !participantIds.includes(payload?.action?.owner_actor_id)) {
    errors.push(issue(
      "OWNER_NOT_PARTICIPANT",
      "/payload/authority",
      "decision authority claimant and action owner must be retained participants",
    ));
  }
  const selected = (payload?.alternatives || [])
    .filter(({ disposition }) => disposition === "selected");
  if (selected.length !== 1 || selected[0].option_id !== payload?.decision?.selected_option_id ||
      selected[0].action_id !== payload?.action?.action_id) {
    errors.push(issue(
      "DECISION_SELECTION_INVALID",
      "/payload/decision/selected_option_id",
      "decision must select exactly one preserved alternative",
    ));
  }
  const optionIds = (payload?.alternatives || []).map(({ option_id: id }) => id);
  if (new Set(optionIds).size !== optionIds.length) {
    errors.push(issue(
      "ALTERNATIVE_ID_DUPLICATE",
      "/payload/alternatives",
      "every decision alternative must have a unique identity",
    ));
  }
  if ((payload?.alternatives || []).some((option) =>
    option.disposition !== "selected" && option.action_id !== null)) {
    errors.push(issue(
      "ALTERNATIVE_ACTION_BINDING_INVALID",
      "/payload/alternatives",
      "only the selected alternative may bind the retained action",
    ));
  }
  return errors;
}

function boundariesForResult(payload) {
  return {
    empirical_truth_established: payload?.boundaries?.empirical_truth_established ?? false,
    affected_party_consent_established:
      payload?.boundaries?.affected_party_consent_established ?? false,
    authority_verified: payload?.boundaries?.authority_verified ?? false,
    action_authorised: payload?.boundaries?.action_authorised ?? false,
  };
}

export function validateDecisionRecord(record, {
  asOf,
  expectedIfBinding,
  expectedGovernanceContext,
  sourceNegotiation,
} = {}) {
  const payload = record?.payload;
  const expectedSigners = distinct([
    ...(expectedGovernanceContext?.representations || []).filter(Boolean)
      .map(({ representative_actor_id: id }) => id),
    sourceNegotiation?.payload?.authority?.holder_actor_id,
    sourceNegotiation?.payload?.action_candidate?.owner_actor_id,
  ].filter(Boolean));
  const errors = baseRecordProblems(record, {
    asOf,
    expectedIfBinding,
    validateSchema,
    kind: "decision",
    expectedSignerIds: expectedSigners,
    expectedGovernanceContext,
    action: payload?.action,
  });
  if (!errors.some(({ code }) => code === "SCHEMA_INVALID")) {
    errors.push(
      ...sourceProblems(
        record,
        sourceNegotiation,
        expectedIfBinding,
        expectedGovernanceContext,
        asOf,
      ),
      ...decisionProblems(record),
    );
  }
  const machineValid = errors.length === 0;
  const activationEligible = machineValid &&
    payload.decision.activation_state === "eligible-for-implementation" &&
    payload.authority.verification_status === "externally-verified" &&
    payload.boundaries.action_authorised === true;
  return {
    machine_valid: machineValid,
    activation_eligible: activationEligible,
    context_authenticated: false,
    errors,
    boundaries: boundariesForResult(payload),
  };
}

export {
  GOVERNANCE_BOUNDARIES,
  computeGovernancePayloadHash,
  computeGovernanceReceiptHash,
  computeGovernanceRecordHash,
};
