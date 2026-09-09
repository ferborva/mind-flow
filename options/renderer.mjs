import {
  assertConditionalOption,
  checksumJson,
  hasBlockingDissent,
  selectedGateEvaluation,
} from "./validation.mjs";

const OBJECT_VOCABULARY = Object.freeze({
  "option-object.income-housing-healthcare-continuity": "income, housing and healthcare continuity",
  "option-object.bounded-public-consultation": "a bounded public consultation",
  "option-object.temporary-delivery-safeguard": "a temporary delivery safeguard",
  "option-object.scoped-evidence-review": "a scoped evidence review",
});

const SAFETY_LABEL = "AGENT-PROPOSED OPTION, NOT AUTHORISED; READINESS: UNKNOWN OR CANDIDATE-ONLY; EVALUATION: CONTENT-VALIDATED, EXTERNALLY UNVERIFIED";

function dissentText(dissent) {
  if (dissent.status === "unknown") {
    return "Caller-supplied unverified dissent assertion status: unknown.";
  }
  return `Caller-supplied unverified dissent assertion: ${dissent.records.map((record) =>
    `${record.concern} by ${record.actor_ref}`).join("; ")}.`;
}

function candidateText(option, gateEligibility, scopeChecksum) {
  const objectLabel = OBJECT_VOCABULARY[option.object.vocabulary_ref];
  const actor = `caller-supplied unverified actor assertion ${option.actor_ref} (${option.actor_class}-role candidate)`;
  return [
    `[${SAFETY_LABEL}]`,
    `Condition ${option.condition_definition_ref.id}@${option.condition_definition_ref.version},`,
    `gate ${gateEligibility.path}, and scope ${scopeChecksum} are content-bound.`,
    "If the selected gate remains true and eligible, and every declared dependency is independently verified as addressed,",
    `${actor} could consider an option to ${option.verb} ${objectLabel} within the exact service and scope recorded in the atomic envelope.`,
    "The completed evaluation is content-validated but externally unverified and non-authorising.",
    dissentText(option.dissent),
    `This proposal expires at ${option.expires_at}.`,
  ].join(" ");
}

function withheldText(option, gateEligibility, scopeChecksum) {
  const blocking = option.dissent.records
    .filter(({ concern }) => concern === "consent" || concern === "rights")
    .map(({ concern, actor_ref: actorRef }) => `${concern} dissent by ${actorRef}`)
    .join("; ");
  return [
    `[WITHHELD; ${SAFETY_LABEL}]`,
    `Proposal withheld because a caller-supplied unverified blocking assertion is present: ${blocking}.`,
    `Caller-supplied unverified actor assertion ${option.actor_ref}; condition ${option.condition_definition_ref.id}@${option.condition_definition_ref.version};`,
    `gate ${gateEligibility.path}; scope ${scopeChecksum}.`,
    "The completed evaluation is content-validated but externally unverified, non-authorising, and cannot override dissent.",
    dissentText(option.dissent),
    `This withheld record expires at ${option.expires_at}.`,
  ].join(" ");
}

export function renderConditionalOption(option, settings = {}) {
  assertConditionalOption(option, settings);

  const gateEligibility = selectedGateEvaluation(option, settings.evaluation_bundle);
  const scopeChecksum = checksumJson(option.scope);
  const blocked = hasBlockingDissent(option);
  const unsignedRecord = {
    record_version: "2.0.0",
    assertion_trust: "caller-supplied-unverified",
    option_ref: {
      id: option.id,
      schema_version: option.schema_version,
      version: option.option_version,
      checksum: checksumJson(option),
    },
    publication_state: blocked ? "withheld" : "candidate-only",
    claim_class: option.claim_class,
    authorisation_state: option.authorisation_state,
    actor_ref: {
      id: option.actor_ref,
      class: option.actor_class,
      trust_state: "caller-supplied-unverified",
    },
    action: {
      bound_gate: option.bound_gate,
      verb: option.verb,
      object: structuredClone(option.object),
    },
    condition_ref: structuredClone(option.condition_definition_ref),
    gate_ref: structuredClone(gateEligibility),
    scope_ref: {
      checksum: scopeChecksum,
      scope: structuredClone(option.scope),
    },
    protected_outcome: structuredClone(option.protected_outcome),
    gate_requirements: structuredClone(option.gate_requirements),
    readiness_dependencies: structuredClone(option.readiness_dependencies),
    cross_actor_dependencies: structuredClone(option.cross_actor_dependencies),
    dissent: structuredClone(option.dissent),
    review: structuredClone(option.review),
    expires_at: option.expires_at,
    expiry_effect: option.expiry_effect,
    provenance: structuredClone(option.provenance),
    text: blocked
      ? withheldText(option, gateEligibility, scopeChecksum)
      : candidateText(option, gateEligibility, scopeChecksum),
  };

  return {
    ...unsignedRecord,
    output_digest: checksumJson(unsignedRecord),
  };
}
