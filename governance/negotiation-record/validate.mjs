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
  sameSet,
} from "../lib/record-contract.mjs";

const commonSchemaBytes = readFileSync(
  new URL("../schema/governance-record-common.schema.json", import.meta.url),
);
const negotiationSchemaBytes = readFileSync(
  new URL("./schema/negotiation-record.schema.json", import.meta.url),
);
const schemaDigests = {
  common: "f1ae03fee24d05b63460fdc953416256083741b92f8431a7106afa6f723b04f7",
  negotiation: "67c58eaf268703dd8bf657ed94c9eed4ba01ae9f397c11d281bf1f58cc37c256",
};
for (const [name, bytes] of [
  ["common", commonSchemaBytes],
  ["negotiation", negotiationSchemaBytes],
]) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== schemaDigests[name]) {
    throw new Error(`${name} governance schema bytes differ from the pinned validator contract`);
  }
}
const commonSchema = JSON.parse(commonSchemaBytes.toString("utf8"));
const negotiationSchema = JSON.parse(negotiationSchemaBytes.toString("utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(commonSchema);
const validateSchema = ajv.compile(negotiationSchema);

function distinct(values) {
  return [...new Set(values)];
}

function negotiationProblems(record, expectedGovernanceContext) {
  const errors = [];
  const payload = record?.payload;
  const participantIds = (payload?.participants || []).map(({ actor_id: id }) => id);
  const consumerIds = (payload?.affected_consumers || []).map(({ consumer_id: id }) => id);
  const positionActors = (payload?.positions || []).map(({ actor_id: id }) => id);
  if (!sameSet(positionActors, participantIds)) {
    errors.push(issue(
      "POSITION_COVERAGE_INVALID",
      "/payload/positions",
      "a concluded negotiation preserves exactly one current position for every participant",
    ));
  }
  const positionById = new Map((payload?.positions || [])
    .map((position) => [position.position_id, position]));
  for (const [index, position] of (payload?.positions || []).entries()) {
    if (!position.affected_consumer_ids?.every((id) => consumerIds.includes(id))) {
      errors.push(issue(
        "POSITION_CONSUMER_UNKNOWN",
        `/payload/positions/${index}/affected_consumer_ids`,
        "position refers to a consumer outside the affected-consumer register",
      ));
    }
  }
  for (const [index, dissent] of (payload?.dissent || []).entries()) {
    const position = positionById.get(dissent.position_id);
    if (!position || position.actor_id !== dissent.actor_id || position.status === "withdrawn" ||
        !dissent.affected_consumer_ids?.every((id) => consumerIds.includes(id))) {
      errors.push(issue(
        "DISSENT_REFERENCE_INVALID",
        `/payload/dissent/${index}`,
        "dissent must resolve to the dissenter's preserved position and known affected consumers",
      ));
    }
  }
  const unresolved = (payload?.dissent || [])
    .filter(({ status }) => status === "unresolved")
    .map(({ dissent_id: id }) => id);
  if (!sameSet(payload?.outcome?.unresolved_dissent_ids || [], unresolved)) {
    errors.push(issue(
      "DISSENT_PRESERVATION_INVALID",
      "/payload/outcome/unresolved_dissent_ids",
      "outcome must preserve every unresolved dissent identity",
    ));
  }
  const agreementStatus = payload?.outcome?.agreement_status;
  const contradictsDissentState =
    (unresolved.length === 0 && agreementStatus === "provisional-with-unresolved-dissent") ||
    (unresolved.length > 0 && agreementStatus === "provisional");
  if (contradictsDissentState) {
    errors.push(issue(
      "DISSENT_OUTCOME_STATE_INVALID",
      "/payload/outcome/agreement_status",
      "the agreement status must distinguish unresolved dissent from a record with no unresolved dissent",
    ));
  }
  const externalScope = expectedGovernanceContext?.deliberation_scope;
  const positionIds = (payload?.positions || []).map(({ position_id: id }) => id);
  const dissentIds = (payload?.dissent || []).map(({ dissent_id: id }) => id);
  if (!externalScope ||
      !sameSet(positionIds, externalScope.position_ids || []) ||
      !sameSet(dissentIds, externalScope.dissent_ids || []) ||
      !sameSet(unresolved, externalScope.unresolved_dissent_ids || [])) {
    errors.push(issue(
      "DELIBERATION_SCOPE_MISMATCH",
      "/payload/positions",
      "positions, dissent and unresolved dissent must exactly match the separately supplied external context",
    ));
  }
  const blocking = (payload?.dissent || [])
    .some(({ status, blocks_activation: blocks }) => status === "unresolved" && blocks);
  if (blocking && (payload?.outcome?.activation_state !== "blocked" ||
      !payload?.outcome?.blocking_reasons?.includes("unresolved-blocking-dissent"))) {
    errors.push(issue(
      "DISSENT_GATE_INVALID",
      "/payload/outcome/activation_state",
      "unresolved blocking dissent must keep activation blocked and publicly named",
    ));
  }
  if (!participantIds.includes(payload?.authority?.holder_actor_id) ||
      !participantIds.includes(payload?.action_candidate?.owner_actor_id)) {
    errors.push(issue(
      "OWNER_NOT_PARTICIPANT",
      "/payload/authority",
      "authority claimant and candidate action owner must be named negotiation participants",
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

export function validateNegotiationRecord(record, {
  asOf,
  expectedIfBinding,
  expectedGovernanceContext,
} = {}) {
  const payload = record?.payload;
  const expectedSigners = distinct([
    ...(expectedGovernanceContext?.participants || [])
      .filter(Boolean).map(({ actor_id: id }) => id),
    ...(expectedGovernanceContext?.representations || []).filter(Boolean)
      .map(({ representative_actor_id: id }) => id),
  ]);
  const errors = baseRecordProblems(record, {
    asOf,
    expectedIfBinding,
    validateSchema,
    kind: "negotiation",
    expectedSignerIds: expectedSigners,
    expectedGovernanceContext,
    action: payload?.action_candidate,
  });
  if (!errors.some(({ code }) => code === "SCHEMA_INVALID")) {
    errors.push(...negotiationProblems(record, expectedGovernanceContext));
  }
  const machineValid = errors.length === 0;
  const activationEligible = machineValid &&
    payload.outcome.activation_state === "eligible-for-authority-review" &&
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
