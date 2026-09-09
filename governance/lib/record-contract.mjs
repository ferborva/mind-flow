import { createHash } from "node:crypto";

const HASH = /^sha256:[a-f0-9]{64}$/;
const DECISIVE_STATE = "true";
const MAX_UNAUTHENTICATED_RECEIPT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const BOUNDARIES = Object.freeze({
  empirical_truth_established: false,
  affected_party_consent_established: false,
  authority_verified: false,
  action_authorised: false,
  publication_approved: false,
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(domain, value) {
  return `sha256:${createHash("sha256")
    .update(`${domain}\n${canonicalJson(value)}`, "utf8")
    .digest("hex")}`;
}

export function computeGovernanceReceiptHash(receipt) {
  const retained = structuredClone(receipt);
  delete retained.receipt_hash;
  return hash("mind-flow:governance:evaluation-receipt:v1", retained);
}

export function computeGovernancePayloadHash(payload, recordKind) {
  return hash(`mind-flow:governance:${recordKind}:payload:v1`, payload);
}

export function computeGovernanceRecordHash(record) {
  const retained = structuredClone(record);
  delete retained.record_hash;
  return hash(`mind-flow:governance:${record.record_kind}:record:v1`, retained);
}

export function issue(code, path, message) {
  return { code, path, message };
}

export function schemaIssues(validateSchema, record) {
  if (validateSchema(record)) return [];
  return (validateSchema.errors || []).map((error) => issue(
    "SCHEMA_INVALID",
    error.instancePath || "/",
    error.message || "schema validation failed",
  ));
}

function exactSet(values, expected) {
  return values.length === expected.length &&
    new Set(values).size === values.length &&
    new Set(expected).size === expected.length &&
    expected.every((value) => values.includes(value));
}

function validInstant(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validUtcInstant(value) {
  return validInstant(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value);
}

function ifProjection(binding) {
  const receipt = binding?.evaluation_receipt_ref;
  return {
    condition_id: binding?.condition_definition_ref?.condition_id,
    definition_version: binding?.condition_definition_ref?.definition_version,
    definition_hash: binding?.condition_definition_ref?.definition_hash,
    receipt_id: receipt?.receipt_id,
    receipt_version: receipt?.receipt_version,
    receipt_hash: receipt?.receipt_hash,
    evaluated_at: receipt?.evaluated_at,
    valid_until: receipt?.valid_until,
    mechanically_valid_for_evaluation: receipt?.mechanically_valid_for_evaluation,
    computed_rule_state: receipt?.computed_rule_state,
    empirical_truth_established: receipt?.empirical_truth_established,
    authority_effect: receipt?.authority_effect,
    action_authorised: receipt?.action_authorised,
  };
}

function referenceProblems(record, expectedIfBinding) {
  const errors = [];
  const binding = record?.payload?.if_binding;
  if (!expectedIfBinding || typeof expectedIfBinding !== "object") {
    errors.push(issue(
      "EXPECTED_IF_BINDING_REQUIRED",
      "/payload/if_binding",
      "verification requires a separately supplied expected IF definition and receipt binding",
    ));
    return errors;
  }
  if (canonicalJson(ifProjection(binding)) !== canonicalJson(expectedIfBinding)) {
    errors.push(issue(
      "IF_BINDING_MISMATCH",
      "/payload/if_binding",
      "recorded condition definition or evaluation receipt differs from the verifier expectation",
    ));
  }
  const definition = binding?.condition_definition_ref;
  const receipt = binding?.evaluation_receipt_ref;
  if (definition?.condition_id !== receipt?.condition_id ||
      definition?.definition_version !== receipt?.definition_version ||
      definition?.definition_hash !== receipt?.definition_hash) {
    errors.push(issue(
      "IF_RECEIPT_DEFINITION_MISMATCH",
      "/payload/if_binding/evaluation_receipt_ref",
      "evaluation receipt must repeat the exact bound condition identity, version and hash",
    ));
  }
  if (receipt?.computed_rule_state !== DECISIVE_STATE) {
    errors.push(issue(
      "IF_STATE_FAIL_CLOSED",
      "/payload/if_binding/evaluation_receipt_ref/computed_rule_state",
      "a concluded negotiation or recorded decision requires a current true machine state; false, unknown, stale and conflicted fail closed",
    ));
  }
  if (!HASH.test(receipt?.receipt_hash || "") ||
      receipt.receipt_hash !== computeGovernanceReceiptHash(receipt)) {
    errors.push(issue(
      "IF_RECEIPT_HASH_MISMATCH",
      "/payload/if_binding/evaluation_receipt_ref/receipt_hash",
      "evaluation receipt hash must content-address every retained receipt field",
    ));
  }
  const evaluatedAt = Date.parse(receipt?.evaluated_at);
  const validUntil = Date.parse(receipt?.valid_until);
  if (Number.isFinite(evaluatedAt) && Number.isFinite(validUntil) &&
      (validUntil < evaluatedAt ||
       validUntil - evaluatedAt > MAX_UNAUTHENTICATED_RECEIPT_VALIDITY_MS)) {
    errors.push(issue(
      "IF_RECEIPT_VALIDITY_WINDOW_EXCEEDED",
      "/payload/if_binding/evaluation_receipt_ref/valid_until",
      "an unauthenticated receipt may remain current for at most 30 days after evaluation",
    ));
  }
  if (receipt?.mechanically_valid_for_evaluation !== true ||
      receipt?.empirical_truth_established !== false ||
      receipt?.authority_effect !== "none" ||
      receipt?.action_authorised !== false) {
    errors.push(issue(
      "IF_RECEIPT_BOUNDARY_INVALID",
      "/payload/if_binding/evaluation_receipt_ref",
      "receipt eligibility cannot establish empirical truth, authority or action permission",
    ));
  }
  return errors;
}

function temporalProblems(record, asOf) {
  const errors = [];
  if (!validInstant(asOf)) {
    errors.push(issue(
      "AS_OF_REQUIRED",
      "/",
      "verification requires an explicit parseable as-of instant",
    ));
    return errors;
  }
  if (!validUtcInstant(asOf)) {
    errors.push(issue(
      "AS_OF_NOT_UTC",
      "/",
      "verification as-of must be an exact RFC 3339 UTC instant ending in Z",
    ));
    return errors;
  }
  const payload = record?.payload;
  const receipt = payload?.if_binding?.evaluation_receipt_ref;
  const timeline = payload?.reconsideration;
  const authority = payload?.authority;
  const retainedInstants = [
    payload?.created_at,
    receipt?.evaluated_at,
    receipt?.valid_until,
    timeline?.valid_from,
    timeline?.reconsider_at,
    timeline?.expires_at,
    authority?.expires_at,
    ...(payload?.representations || []).map(({ mandate_expires_at: value }) => value),
    ...(payload?.positions || []).map(({ recorded_at: value }) => value),
    ...(payload?.dissent || []).map(({ recorded_at: value }) => value),
    ...(record?.signatures || []).map(({ signed_at: value }) => value),
  ];
  if (retainedInstants.some((value) => !validUtcInstant(value))) {
    errors.push(issue(
      "RECORD_TIME_NOT_UTC",
      "/payload",
      "every retained governance instant must be an exact RFC 3339 UTC instant ending in Z",
    ));
    return errors;
  }
  const asOfTime = Date.parse(asOf);
  const evaluatedAt = Date.parse(receipt.evaluated_at);
  if (Date.parse(receipt.evaluated_at) > Date.parse(payload.created_at) ||
      Date.parse(receipt.valid_until) < Date.parse(payload.created_at) ||
      Date.parse(timeline.valid_from) > Date.parse(payload.created_at) ||
      Date.parse(timeline.reconsider_at) > Date.parse(timeline.expires_at) ||
      Date.parse(payload.created_at) > Date.parse(timeline.expires_at) ||
      Date.parse(authority.expires_at) < Date.parse(payload.created_at) ||
      Date.parse(authority.expires_at) < Date.parse(timeline.expires_at)) {
    errors.push(issue(
      "TEMPORAL_ORDER_INVALID",
      "/payload/reconsideration",
      "receipt, creation, reconsideration and expiry instants are not chronologically coherent",
    ));
  }
  if (asOfTime > Date.parse(receipt.valid_until)) {
    errors.push(issue(
      "IF_RECEIPT_STALE",
      "/payload/if_binding/evaluation_receipt_ref/valid_until",
      "the IF receipt is stale at the verifier as-of instant",
    ));
  }
  if (asOfTime > Date.parse(timeline.expires_at)) {
    errors.push(issue(
      "RECORD_EXPIRED",
      "/payload/reconsideration/expires_at",
      "the record has expired and must be reconsidered",
    ));
  }
  if (asOfTime >= Date.parse(timeline.reconsider_at)) {
    errors.push(issue(
      "RECONSIDERATION_DUE",
      "/payload/reconsideration/reconsider_at",
      "the scheduled review is due; the record must be reconsidered before it can remain current",
    ));
  }
  if (asOfTime > Date.parse(authority.expires_at)) {
    errors.push(issue(
      "AUTHORITY_EXPIRED",
      "/payload/authority/expires_at",
      "the claimed authority has expired at the verifier as-of instant",
    ));
  }
  if (asOfTime < Date.parse(timeline.valid_from) || asOfTime < Date.parse(payload.created_at)) {
    errors.push(issue(
      "RECORD_NOT_YET_VALID",
      "/payload/reconsideration/valid_from",
      "the record did not yet exist at the verifier as-of instant",
    ));
  }
  for (const [index, signature] of (record?.signatures || []).entries()) {
    const signedAt = Date.parse(signature?.signed_at);
    if (!validInstant(signature?.signed_at) || signedAt < Date.parse(payload.created_at) ||
        signedAt > Date.parse(timeline.expires_at) || signedAt > asOfTime) {
      errors.push(issue(
        "SIGNATURE_TIME_INVALID",
        `/signatures/${index}/signed_at`,
        "required attestations must follow record creation and precede expiry and verification",
      ));
    }
    if (Number.isFinite(signedAt) && signedAt < evaluatedAt) {
      errors.push(issue(
        "ATTESTATION_PREDATES_IF_EVALUATION",
        `/signatures/${index}/signed_at`,
        "an attestation cannot predate the IF evaluation that the record relies on",
      ));
    }
  }
  for (const [kind, entries] of [
    ["positions", payload?.positions || []],
    ["dissent", payload?.dissent || []],
  ]) {
    for (const [index, entry] of entries.entries()) {
      if (Date.parse(entry.recorded_at) < evaluatedAt) {
        errors.push(issue(
          "DELIBERATION_PREDATES_IF_EVALUATION",
          `/payload/${kind}/${index}/recorded_at`,
          "positions and dissent cannot predate the IF evaluation used by the deliberation",
        ));
      }
      if (Date.parse(entry.recorded_at) > Date.parse(payload.created_at) ||
          Date.parse(entry.recorded_at) > asOfTime) {
        errors.push(issue(
          "DELIBERATION_TIME_INVALID",
          `/payload/${kind}/${index}/recorded_at`,
          "positions and dissent must be recorded no later than record creation and verification",
        ));
      }
    }
  }
  for (const [index, representation] of (payload?.representations || []).entries()) {
    const expiresAt = Date.parse(representation.mandate_expires_at);
    if (expiresAt < Date.parse(payload.created_at)) {
      errors.push(issue(
        "REPRESENTATION_TIME_INVALID",
        `/payload/representations/${index}/mandate_expires_at`,
        "a representation mandate must remain current when the record is created",
      ));
    }
    if (asOfTime > expiresAt) {
      errors.push(issue(
        "REPRESENTATION_EXPIRED",
        `/payload/representations/${index}/mandate_expires_at`,
        "an expired representation cannot support a current governance record",
      ));
    }
  }
  return errors;
}

function integrityProblems(record) {
  const errors = [];
  if (!HASH.test(record?.payload_hash || "") ||
      record.payload_hash !== computeGovernancePayloadHash(record.payload, record.record_kind)) {
    errors.push(issue(
      "PAYLOAD_HASH_MISMATCH",
      "/payload_hash",
      "payload differs from its content address",
    ));
  }
  if (!HASH.test(record?.record_hash || "") ||
      record.record_hash !== computeGovernanceRecordHash(record)) {
    errors.push(issue(
      "RECORD_HASH_MISMATCH",
      "/record_hash",
      "complete signed record differs from its content address",
    ));
  }
  for (const [index, signature] of (record?.signatures || []).entries()) {
    if (signature.signed_payload_hash !== record.payload_hash) {
      errors.push(issue(
        "SIGNATURE_PAYLOAD_MISMATCH",
        `/signatures/${index}/signed_payload_hash`,
        "signature attestation does not bind the exact payload hash",
      ));
    }
  }
  return errors;
}

function representationProblems(payload, expectedGovernanceContext) {
  const errors = [];
  const consumers = (payload?.affected_consumers || []).map(({ consumer_id: id }) => id);
  const represented = (payload?.representations || []).map(({ consumer_id: id }) => id);
  if (!exactSet(represented, consumers)) {
    errors.push(issue(
      "REPRESENTATION_COVERAGE_INVALID",
      "/payload/representations",
      "every affected consumer must have exactly one explicit representation record",
    ));
  }
  const participantIds = new Set((payload?.participants || []).map(({ actor_id: id }) => id));
  const actionOwnerId = payload?.action_candidate?.owner_actor_id ?? payload?.action?.owner_actor_id;
  const authorityHolderId = payload?.authority?.holder_actor_id;
  const routeIds = [];
  for (const [index, representation] of (payload?.representations || []).entries()) {
    if (!participantIds.has(representation.representative_actor_id)) {
      errors.push(issue(
        "REPRESENTATIVE_NOT_PARTICIPANT",
        `/payload/representations/${index}/representative_actor_id`,
        "an affected-party representative must be a named participant",
      ));
    }
    const route = representation.challenge_route;
    routeIds.push(route?.route_id);
    const receivers = route?.receiving_actor_ids || [];
    if (receivers.some((id) => !participantIds.has(id)) ||
        receivers.includes(representation.representative_actor_id) ||
        !receivers.includes(actionOwnerId) || !receivers.includes(authorityHolderId)) {
      errors.push(issue(
        "CHALLENGE_ROUTE_INVALID",
        `/payload/representations/${index}/challenge_route`,
        "a challenge route must reach the action owner and authority holder through other retained participants",
      ));
    }
  }
  if (new Set(routeIds).size !== routeIds.length) {
    errors.push(issue(
      "CHALLENGE_ROUTE_INVALID",
      "/payload/representations",
      "each representation requires a distinct challenge route identity",
    ));
  }
  if (!expectedGovernanceContext || typeof expectedGovernanceContext !== "object") {
    errors.push(issue(
      "EXPECTED_GOVERNANCE_CONTEXT_REQUIRED",
      "/payload/affected_consumers",
      "verification requires a separately supplied participant, affected-consumer and representation context",
    ));
    return errors;
  }
  for (const key of ["participants", "affected_consumers", "representations"]) {
    if (!Array.isArray(expectedGovernanceContext[key]) ||
        !sameCanonical(payload?.[key], expectedGovernanceContext[key])) {
      errors.push(issue(
        "GOVERNANCE_CONTEXT_MISMATCH",
        `/payload/${key}`,
        "recorded governance scope differs from the separately supplied expected context",
      ));
    }
  }
  return errors;
}

function responsibilityProblems(payload, action) {
  const errors = [];
  const participants = payload?.participants || [];
  const rolesByActor = new Map(participants.map(({ actor_id: id, roles }) => [id, roles || []]));
  const representativeIds = (payload?.representations || [])
    .map(({ representative_actor_id: id }) => id);
  const actionOwnerId = action?.owner_actor_id;
  const authorityHolderId = payload?.authority?.holder_actor_id;
  const responsibilityIds = [...representativeIds, actionOwnerId, authorityHolderId];
  if (new Set(responsibilityIds).size !== responsibilityIds.length) {
    errors.push(issue(
      "ACTOR_RESPONSIBILITY_COLLISION",
      "/payload/participants",
      "affected-party representatives, the candidate action owner and the authority holder must be distinct actors",
    ));
  }
  const actorsWithRole = (role) => participants
    .filter(({ roles }) => roles?.includes(role))
    .map(({ actor_id: id }) => id);
  if (!exactSet(actorsWithRole("affected-party-representative"), representativeIds) ||
      !exactSet(actorsWithRole("candidate-action-owner"), [actionOwnerId]) ||
      !exactSet(actorsWithRole("candidate-authority-holder"), [authorityHolderId]) ||
      participants.some(({ actor_id: id }) => !rolesByActor.get(id)?.includes("negotiator"))) {
    errors.push(issue(
      "SEMANTIC_ROLE_COVERAGE_INVALID",
      "/payload/participants",
      "roles must identify exactly the retained representatives, action owner and authority holder, and every participant must be a negotiator",
    ));
  }
  return errors;
}

function signatureProblems(record, expectedSignerIds) {
  const errors = [];
  const declared = record?.payload?.signature_policy?.required_signer_actor_ids || [];
  const actual = (record?.signatures || []).map(({ signer_actor_id: id }) => id);
  if (!exactSet(declared, expectedSignerIds) || !exactSet(actual, expectedSignerIds)) {
    errors.push(issue(
      "SIGNATURE_COVERAGE_INVALID",
      "/signatures",
      "every required affected representative, owner and participant must attest to record accuracy",
    ));
  }
  const rolesByActor = new Map((record?.payload?.participants || [])
    .map(({ actor_id: id, roles }) => [id, roles]));
  for (const [index, signature] of (record?.signatures || []).entries()) {
    if (!rolesByActor.has(signature.signer_actor_id) ||
        !exactSet(signature.signer_roles, rolesByActor.get(signature.signer_actor_id))) {
      errors.push(issue(
        "SIGNATURE_ROLE_MISMATCH",
        `/signatures/${index}/signer_roles`,
        "signature roles must equal the signer's retained participant roles",
      ));
    }
  }
  return errors;
}

function boundaryProblems(payload) {
  const errors = [];
  const syntheticIdentities = (payload?.participants || [])
    .every(({ identity_verification: state }) => state === "synthetic-unverified");
  const syntheticMandates = (payload?.representations || [])
    .every(({ mandate_verification: state }) => state === "synthetic-unverified");
  if (canonicalJson(payload?.boundaries) !== canonicalJson(BOUNDARIES) ||
      payload?.authority?.verification_status !== "synthetic-unverified" ||
      payload?.authority?.authority_effect !== "none" ||
      !syntheticIdentities || !syntheticMandates) {
    errors.push(issue(
      "AUTHORITY_BOUNDARY_INVALID",
      "/payload/boundaries",
      "synthetic records cannot establish truth, consent, authority, action or publication permission",
    ));
  }
  return errors;
}

function actionProblems(action, payload) {
  const errors = [];
  const lowRegretVerbs = new Set(["assess", "consult", "prepare", "review", "rehearse"]);
  if (!lowRegretVerbs.has(action?.verb) ||
      action?.effect_class !== "research-rehearsal-only" ||
      action?.operational_changes_prohibited !== true ||
      action?.reversibility?.class !== "reversible" ||
      action?.reversibility?.irreversible_effects_prohibited !== true ||
      !action?.reversibility?.rollback_plan) {
    errors.push(issue(
      "ACTION_NOT_REVERSIBLE",
      "/payload/action",
      "the only representable action is bounded, reversible and paired with a rollback plan",
    ));
  }
  const requiredStops = [
    "if-binding-changed",
    "affected-party-challenge",
    "harm-detected",
    "authority-or-signature-invalid",
  ];
  const stopIds = (action?.stop_conditions || []).map(({ trigger_id: id }) => id);
  if (!requiredStops.every((id) => stopIds.includes(id))) {
    errors.push(issue(
      "ACTION_STOP_CONDITIONS_INCOMPLETE",
      "/payload/action/stop_conditions",
      "reversible action must stop on IF drift, affected-party challenge, harm or authority/signature invalidation",
    ));
  }
  const participantIds = new Set((payload?.participants || []).map(({ actor_id: id }) => id));
  const representativeIds = (payload?.representations || [])
    .map(({ representative_actor_id: id }) => id);
  const remedyOwnerId = action?.reversibility?.remedy_owner_actor_id;
  if (!participantIds.has(remedyOwnerId)) {
    errors.push(issue(
      "ACTION_REMEDY_OWNER_INVALID",
      "/payload/action/reversibility/remedy_owner_actor_id",
      "the remedy owner must be a retained participant accountable for rollback and recovery",
    ));
  }
  for (const [index, stop] of (action?.stop_conditions || []).entries()) {
    const invokers = stop?.invoker_actor_ids || [];
    const unknownInvoker = invokers.some((id) => !participantIds.has(id));
    const affectedPartyControl = ["affected-party-challenge", "harm-detected"]
      .includes(stop?.trigger_id);
    if (unknownInvoker || (affectedPartyControl &&
        representativeIds.some((id) => !invokers.includes(id)))) {
      errors.push(issue(
        "ACTION_STOP_INVOKER_INVALID",
        `/payload/action/stop_conditions/${index}/invoker_actor_ids`,
        "stop invokers must be retained participants, and every representative can invoke affected-party and harm stops",
      ));
    }
  }
  return errors;
}

function reconsiderationProblems(payload, kind) {
  const required = [
    "if-binding-changed",
    "affected-party-challenge",
    "dissent-or-signature-changed",
    "authority-changed",
    "harm-or-scope-changed",
  ];
  if (kind === "decision") required.push("action-control-failed");
  const triggerIds = (payload?.reconsideration?.triggers || []).map(({ trigger_id: id }) => id);
  if (payload?.reconsideration?.if_expired !== "block-and-renegotiate" ||
      !required.every((id) => triggerIds.includes(id))) {
    return [issue(
      "RECONSIDERATION_INCOMPLETE",
      "/payload/reconsideration",
      "expiry and every material IF, party, dissent, authority, harm and control change must force reconsideration",
    )];
  }
  return [];
}

export function baseRecordProblems(record, {
  asOf,
  expectedIfBinding,
  validateSchema,
  kind,
  expectedSignerIds,
  expectedGovernanceContext,
  action,
}) {
  const structural = schemaIssues(validateSchema, record);
  if (structural.length > 0) return structural;
  return [
    ...integrityProblems(record),
    ...referenceProblems(record, expectedIfBinding),
    ...temporalProblems(record, asOf),
    ...representationProblems(record?.payload, expectedGovernanceContext),
    ...responsibilityProblems(record?.payload, action),
    ...signatureProblems(record, expectedSignerIds),
    ...boundaryProblems(record?.payload),
    ...actionProblems(action, record?.payload),
    ...reconsiderationProblems(record?.payload, kind),
  ];
}

export function sameSet(values, expected) {
  return exactSet(values, expected);
}

export function sameCanonical(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export const GOVERNANCE_BOUNDARIES = BOUNDARIES;
