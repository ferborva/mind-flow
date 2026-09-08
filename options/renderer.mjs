import {
  assertConditionalOption,
  checksumJson,
  hasBlockingDissent,
} from "./validation.mjs";

const OBJECT_VOCABULARY = Object.freeze({
  "option-object.income-housing-healthcare-continuity": "income, housing and healthcare continuity",
  "option-object.bounded-public-consultation": "a bounded public consultation",
  "option-object.temporary-delivery-safeguard": "a temporary delivery safeguard",
  "option-object.scoped-evidence-review": "a scoped evidence review",
});

const SAFETY_LABEL = "AGENT-PROPOSED OPTION, NOT AUTHORISED; READINESS: UNKNOWN OR CANDIDATE-ONLY; GATE ELIGIBILITY: NON-AUTHORISING INPUT";

function dissentText(dissent) {
  if (dissent.status === "unknown") return "Dissent status: unknown.";
  return `Dissent recorded: ${dissent.records.map((record) =>
    `${record.concern} by ${record.actor_ref}`).join("; ")}.`;
}

function candidateText(option, gateEligibility, scopeChecksum) {
  const objectLabel = OBJECT_VOCABULARY[option.object.vocabulary_ref];
  const actor = `candidate ${option.actor_class}-role actor ${option.actor_ref}`;
  return [
    `[${SAFETY_LABEL}]`,
    `Condition ${option.condition_definition_ref.id}@${option.condition_definition_ref.version},`,
    `gate ${gateEligibility.gate_ref}, and scope ${scopeChecksum} are content-bound.`,
    "If the selected gate remains true and eligible, and every declared dependency remains addressed,",
    `${actor} could consider an option to ${option.verb} ${objectLabel} for ${option.object.service_ref}.`,
    "The eligible gate evaluation is non-authorising.",
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
    `Proposal withheld because blocking ${blocking} is recorded.`,
    `Actor ${option.actor_ref}; condition ${option.condition_definition_ref.id}@${option.condition_definition_ref.version};`,
    `gate ${gateEligibility.gate_ref}; scope ${scopeChecksum}.`,
    "The eligible gate evaluation is non-authorising and cannot override dissent.",
    dissentText(option.dissent),
    `This withheld record expires at ${option.expires_at}.`,
  ].join(" ");
}

export function renderConditionalOption(option, settings = {}) {
  assertConditionalOption(option, settings);

  const gateEligibility = settings.gate_eligibility;
  const scopeChecksum = checksumJson(option.scope);
  const blocked = hasBlockingDissent(option);
  const unsignedRecord = {
    record_version: "1.0.0",
    option_id: option.id,
    publication_state: blocked ? "withheld" : "candidate-only",
    actor_ref: {
      id: option.actor_ref,
      class: option.actor_class,
    },
    condition_ref: structuredClone(option.condition_definition_ref),
    gate_ref: {
      path: gateEligibility.gate_ref,
      evaluation_id: gateEligibility.evaluation_id,
      evaluated_at: gateEligibility.evaluated_at,
      truth_state: gateEligibility.truth_state,
      eligibility_state: gateEligibility.eligibility_state,
      eligibility_basis: gateEligibility.eligibility_basis,
      authorisation_effect: gateEligibility.authorisation_effect,
    },
    scope_ref: {
      checksum: scopeChecksum,
      scope: structuredClone(option.scope),
    },
    dissent: structuredClone(option.dissent),
    expires_at: option.expires_at,
    text: blocked
      ? withheldText(option, gateEligibility, scopeChecksum)
      : candidateText(option, gateEligibility, scopeChecksum),
  };

  return {
    ...unsignedRecord,
    output_digest: checksumJson(unsignedRecord),
  };
}
