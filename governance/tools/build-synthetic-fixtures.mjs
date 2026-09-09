#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

import {
  computeGovernancePayloadHash,
  computeGovernanceReceiptHash,
  computeGovernanceRecordHash,
} from "../lib/record-contract.mjs";

const negotiationPath = new URL(
  "../negotiation-record/fixtures/worker-transition.negotiation.synthetic.json",
  import.meta.url,
);
const decisionPath = new URL(
  "../decision-record/fixtures/worker-transition.decision.synthetic.json",
  import.meta.url,
);

const boundaries = Object.freeze({
  empirical_truth_established: false,
  affected_party_consent_established: false,
  authority_verified: false,
  action_authorised: false,
  publication_approved: false,
});

const participants = Object.freeze([
  {
    actor_id: "actor.worker-representative.synthetic",
    label: "Synthetic affected-worker representative",
    roles: ["affected-party-representative", "negotiator"],
    identity_verification: "synthetic-unverified",
  },
  {
    actor_id: "actor.household-representative.synthetic",
    label: "Synthetic worker-household representative",
    roles: ["affected-party-representative", "negotiator"],
    identity_verification: "synthetic-unverified",
  },
  {
    actor_id: "actor.transition-provider.synthetic",
    label: "Synthetic transition-support provider",
    roles: ["candidate-action-owner", "negotiator"],
    identity_verification: "synthetic-unverified",
  },
  {
    actor_id: "actor.public-authority-candidate.synthetic",
    label: "Synthetic candidate public authority",
    roles: ["candidate-authority-holder", "negotiator"],
    identity_verification: "synthetic-unverified",
  },
]);

const affectedConsumers = Object.freeze([
  {
    consumer_id: "consumer.affected-workers.synthetic",
    label: "Synthetic affected workers",
    affected_how: "Work, earnings, conditions, refusal rights and access to review may change.",
    materiality: "direct",
  },
  {
    consumer_id: "consumer.worker-households.synthetic",
    label: "Synthetic worker households",
    affected_how: "Household income continuity and care arrangements may change.",
    materiality: "indirect-material",
  },
]);

const representations = Object.freeze([
  {
    representation_id: "representation.affected-workers.synthetic",
    consumer_id: "consumer.affected-workers.synthetic",
    representative_actor_id: "actor.worker-representative.synthetic",
    selection_basis: "Synthetic placeholder. No election, sampling or identity check occurred.",
    mandate_scope: "Record worker safeguards, objections and requested changes only.",
    mandate_expires_at: "2026-10-01T00:00:00Z",
    mandate_verification: "synthetic-unverified",
    consent_established: false,
    challenge_route: {
      route_id: "challenge.affected-workers.synthetic",
      receiving_actor_ids: [
        "actor.transition-provider.synthetic",
        "actor.public-authority-candidate.synthetic",
      ],
      channel_description: "Synthetic dual-recipient route. No live channel or response service exists.",
      effect: "pause-and-record-only",
    },
  },
  {
    representation_id: "representation.worker-households.synthetic",
    consumer_id: "consumer.worker-households.synthetic",
    representative_actor_id: "actor.household-representative.synthetic",
    selection_basis: "Synthetic placeholder. No household mandate or identity check occurred.",
    mandate_scope: "Record household continuity concerns and objections only.",
    mandate_expires_at: "2026-10-01T00:00:00Z",
    mandate_verification: "synthetic-unverified",
    consent_established: false,
    challenge_route: {
      route_id: "challenge.worker-households.synthetic",
      receiving_actor_ids: [
        "actor.transition-provider.synthetic",
        "actor.public-authority-candidate.synthetic",
      ],
      channel_description: "Synthetic dual-recipient route. No live channel or response service exists.",
      effect: "pause-and-record-only",
    },
  },
]);

function ifBinding() {
  const receipt = {
    receipt_id: "receipt.condition.worker-option.nsw.20260909",
    receipt_version: "1.0.0",
    receipt_hash: null,
    condition_id: "condition.worker-option.nsw",
    definition_version: "1.0.0",
    definition_hash: "sha256:f303ac32757a530947666c721d57deb4ba5174b61a1ae690e035303de5b23669",
    evaluated_at: "2026-09-09T00:00:00Z",
    valid_until: "2026-10-09T00:00:00Z",
    mechanically_valid_for_evaluation: true,
    computed_rule_state: "true",
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
  };
  receipt.receipt_hash = computeGovernanceReceiptHash(receipt);
  return {
    condition_definition_ref: {
      condition_id: "condition.worker-option.nsw",
      definition_version: "1.0.0",
      definition_hash: "sha256:f303ac32757a530947666c721d57deb4ba5174b61a1ae690e035303de5b23669",
    },
    evaluation_receipt_ref: receipt,
    effect: "eligibility-only-not-truth-or-authority",
  };
}

function action(actionId) {
  const invokerActorIds = participants.map(({ actor_id: id }) => id);
  return {
    action_id: actionId,
    owner_actor_id: "actor.transition-provider.synthetic",
    verb: "rehearse",
    effect_class: "research-rehearsal-only",
    operational_changes_prohibited: true,
    object: {
      object_id: "object.worker-controlled-transition-support.synthetic",
      label: "a worker-controlled transition-support rehearsal",
    },
    scope: {
      who: "Synthetic affected General Clerks and Payroll Clerks",
      standard: "Voluntary rehearsal only, with no employment, entitlement or service change",
      place: "New South Wales, Australia",
      period: "2026-09-16 through 2026-09-30",
    },
    maximum_duration_days: 14,
    reversibility: {
      class: "reversible",
      irreversible_effects_prohibited: true,
      remedy_owner_actor_id: "actor.transition-provider.synthetic",
      rollback_plan: "Stop the rehearsal, revoke access and delete participant-controlled copies on request.",
      residual_harm: "The rehearsal may still create anxiety, privacy loss or false confidence.",
    },
    stop_conditions: [
      {
        trigger_id: "if-binding-changed",
        condition: "The definition, receipt or computed IF state changes.",
        response: "Stop and require a new negotiation against a fresh exact receipt.",
        invoker_actor_ids: invokerActorIds,
      },
      {
        trigger_id: "affected-party-challenge",
        condition: "An affected consumer or representative challenges scope, safety or representation.",
        response: "Pause, preserve the challenge and reconsider before resumption.",
        invoker_actor_ids: invokerActorIds,
      },
      {
        trigger_id: "harm-detected",
        condition: "Privacy, coercion, income, conditions, care or information harm is reported.",
        response: "Stop exposure, protect affected people and assess recovery.",
        invoker_actor_ids: invokerActorIds,
      },
      {
        trigger_id: "authority-or-signature-invalid",
        condition: "Claimed authority, mandate or a required signature expires or is withdrawn.",
        response: "Stop. The record grants no fallback authority.",
        invoker_actor_ids: invokerActorIds,
      },
    ],
  };
}

function reconsideration(createdAt, reconsiderAt, expiresAt, decision = false) {
  const triggers = [
    {
      trigger_id: "if-binding-changed",
      condition: "The IF definition, receipt, evidence tip or computed state changes.",
      response: "Block and renegotiate against a fresh exact binding.",
    },
    {
      trigger_id: "affected-party-challenge",
      condition: "An affected consumer challenges representation, scope, terms or safety.",
      response: "Preserve the challenge and reopen deliberation.",
    },
    {
      trigger_id: "dissent-or-signature-changed",
      condition: "Dissent changes or an attestation is added, corrected or withdrawn.",
      response: "Invalidate the prior completion state and reconsider.",
    },
    {
      trigger_id: "authority-changed",
      condition: "The authority holder, basis, scope or verification status changes.",
      response: "Block until authority is independently reverified.",
    },
    {
      trigger_id: "harm-or-scope-changed",
      condition: "A new harm, consumer, omission or scope mismatch is identified.",
      response: "Stop and reopen affected-party review.",
    },
  ];
  if (decision) triggers.push({
    trigger_id: "action-control-failed",
    condition: "A start, stop, monitoring or rollback control fails.",
    response: "Stop the candidate action and reopen the decision.",
  });
  return {
    valid_from: createdAt,
    reconsider_at: reconsiderAt,
    expires_at: expiresAt,
    if_expired: "block-and-renegotiate",
    triggers,
  };
}

function signatures(payloadHash, signerIds, signedAt) {
  return signerIds.map((signerId, index) => ({
    signature_id: `signature.synthetic.${index + 1}`,
    signer_actor_id: signerId,
    signer_roles: participants.find(({ actor_id: id }) => id === signerId).roles,
    attestation: "record-accuracy-not-agreement",
    signed_payload_hash: payloadHash,
    signature_method: "synthetic-placeholder",
    signature_value: `synthetic:not-cryptographic:${index + 1}`,
    identity_verification: "not-authenticated",
    signed_at: signedAt,
  }));
}

function seal(record, signerIds, signedAt) {
  record.payload_hash = computeGovernancePayloadHash(record.payload, record.record_kind);
  record.signatures = signatures(record.payload_hash, signerIds, signedAt);
  record.record_hash = computeGovernanceRecordHash(record);
  return record;
}

function buildNegotiation() {
  const signerIds = participants.map(({ actor_id: id }) => id);
  return seal({
    schema_version: "1.0.0",
    record_id: "negotiation.worker-transition.synthetic",
    version: "1.0.0",
    record_kind: "negotiation-record",
    classification: "synthetic-example-not-evidence",
    payload: {
      status: "concluded",
      created_at: "2026-09-10T03:00:00Z",
      public_summary: "Synthetic negotiation: participants recorded conditional terms for a reversible rehearsal. Household dissent remains unresolved, authority and identities are unverified, and activation is blocked.",
      if_binding: ifBinding(),
      participants: structuredClone(participants),
      affected_consumers: structuredClone(affectedConsumers),
      representations: structuredClone(representations),
      positions: [
        {
          position_id: "position.affected-workers.synthetic",
          actor_id: "actor.worker-representative.synthetic",
          public_position: "Any rehearsal must be voluntary, worker-controlled and separate from employment decisions.",
          proposed_terms: ["freely rejectable", "worker-controlled records", "independent challenge route"],
          affected_consumer_ids: ["consumer.affected-workers.synthetic"],
          status: "active",
          recorded_at: "2026-09-10T01:00:00Z",
        },
        {
          position_id: "position.worker-households.synthetic",
          actor_id: "actor.household-representative.synthetic",
          public_position: "No rehearsal should begin without a credible household income and care continuity safeguard.",
          proposed_terms: ["income continuity", "care schedule protection", "household challenge route"],
          affected_consumer_ids: ["consumer.worker-households.synthetic"],
          status: "active",
          recorded_at: "2026-09-10T01:15:00Z",
        },
        {
          position_id: "position.transition-provider.synthetic",
          actor_id: "actor.transition-provider.synthetic",
          public_position: "The provider can rehearse support privately but cannot change jobs, services or entitlements.",
          proposed_terms: ["fourteen-day maximum", "no operational changes", "stop on challenge"],
          affected_consumer_ids: [
            "consumer.affected-workers.synthetic",
            "consumer.worker-households.synthetic"
          ],
          status: "active",
          recorded_at: "2026-09-10T01:30:00Z",
        },
        {
          position_id: "position.public-authority.synthetic",
          actor_id: "actor.public-authority-candidate.synthetic",
          public_position: "The candidate authority can record the option but has no verified power or appropriation to activate it.",
          proposed_terms: ["external authority verification", "no public commitment", "expiry before implementation"],
          affected_consumer_ids: [
            "consumer.affected-workers.synthetic",
            "consumer.worker-households.synthetic"
          ],
          status: "active",
          recorded_at: "2026-09-10T01:45:00Z",
        },
      ],
      dissent: [
        {
          dissent_id: "dissent.household-continuity.synthetic",
          actor_id: "actor.household-representative.synthetic",
          position_id: "position.worker-households.synthetic",
          affected_consumer_ids: ["consumer.worker-households.synthetic"],
          public_dissent: "The proposed rehearsal does not yet prove that household income and care continuity are protected.",
          requested_change: "Add independently reviewed income and care continuity safeguards before any exposure.",
          status: "unresolved",
          blocks_activation: true,
          recorded_at: "2026-09-10T02:00:00Z",
        },
      ],
      action_candidate: action("action.rehearse-worker-support.synthetic"),
      authority: {
        holder_actor_id: "actor.public-authority-candidate.synthetic",
        claimed_basis: "Synthetic placeholder claim only. No law, delegation or appropriation was verified.",
        jurisdictions: ["Australia", "New South Wales"],
        decision_scope: "Record a candidate private rehearsal for later external authority review.",
        verification_status: "synthetic-unverified",
        authority_effect: "none",
        expires_at: "2026-10-01T00:00:00Z",
      },
      outcome: {
        agreement_status: "provisional-with-unresolved-dissent",
        activation_state: "blocked",
        blocking_reasons: ["unresolved-blocking-dissent", "authority-unverified"],
        unresolved_dissent_ids: ["dissent.household-continuity.synthetic"],
        public_explanation: "Participants attested that this record preserves their positions. They did not establish consent or agreement. Unresolved household dissent and unverified authority block activation.",
      },
      reconsideration: reconsideration(
        "2026-09-10T03:00:00Z",
        "2026-09-24T00:00:00Z",
        "2026-10-01T00:00:00Z",
      ),
      signature_policy: {
        required_signer_actor_ids: signerIds,
        signature_meaning: "record-accuracy-not-agreement",
        unanimity_establishes_consent: false,
        external_authentication_required_for_operational_use: true,
      },
      boundaries: structuredClone(boundaries),
    },
  }, signerIds, "2026-09-10T03:15:00Z");
}

function buildDecision(negotiation) {
  const signerIds = participants.map(({ actor_id: id }) => id);
  return seal({
    schema_version: "1.0.0",
    record_id: "decision.worker-transition.synthetic",
    version: "1.0.0",
    record_kind: "decision-record",
    classification: "synthetic-example-not-evidence",
    payload: {
      status: "recorded",
      created_at: "2026-09-11T03:00:00Z",
      public_summary: "Synthetic decision: retain a reversible rehearsal as the selected candidate, but do not implement it while blocking dissent and authority verification remain unresolved.",
      negotiation_ref: {
        record_id: negotiation.record_id,
        version: negotiation.version,
        record_hash: negotiation.record_hash,
      },
      if_binding: ifBinding(),
      participants: structuredClone(participants),
      affected_consumers: structuredClone(affectedConsumers),
      representations: structuredClone(representations),
      deliberation: {
        position_refs: negotiation.payload.positions.map(({ position_id: id }) => id),
        dissent_refs: negotiation.payload.dissent.map(({ dissent_id: id }) => id),
        unresolved_dissent_refs: negotiation.payload.dissent
          .filter(({ status }) => status === "unresolved")
          .map(({ dissent_id: id }) => id),
      },
      decision: {
        decision_text: "Retain the bounded reversible rehearsal as the selected candidate. Do not implement it until blocking dissent is resolved and authority is independently verified.",
        selected_option_id: "option.reversible-rehearsal.synthetic",
        activation_state: "blocked",
        blocking_reasons: ["unresolved-blocking-dissent", "authority-unverified"],
        rationale: "A reversible rehearsal preserves learning value while explicit blocking gates prevent the candidate from becoming an operational commitment.",
      },
      alternatives: [
        {
          option_id: "option.reversible-rehearsal.synthetic",
          label: "Retain a bounded reversible rehearsal as a blocked candidate",
          disposition: "selected",
          action_id: "action.rehearse-worker-support.synthetic",
          reasons: ["reversible", "bounded", "preserves challenge and rollback"],
        },
        {
          option_id: "option.no-rehearsal.synthetic",
          label: "Do not rehearse",
          disposition: "retained",
          action_id: null,
          reasons: ["avoids rehearsal harms", "remains available if safeguards fail"],
        },
        {
          option_id: "option.expand-consultation.synthetic",
          label: "Expand affected-party consultation before selection",
          disposition: "retained",
          action_id: null,
          reasons: ["representation is unverified", "household dissent remains unresolved"],
        },
      ],
      action: action("action.rehearse-worker-support.synthetic"),
      authority: structuredClone(negotiation.payload.authority),
      reconsideration: reconsideration(
        "2026-09-11T03:00:00Z",
        "2026-09-25T00:00:00Z",
        "2026-10-01T00:00:00Z",
        true,
      ),
      signature_policy: {
        required_signer_actor_ids: signerIds,
        signature_meaning: "record-accuracy-not-agreement",
        unanimity_establishes_consent: false,
        external_authentication_required_for_operational_use: true,
      },
      boundaries: structuredClone(boundaries),
    },
  }, signerIds, "2026-09-11T03:15:00Z");
}

export function buildSyntheticGovernanceFixtures() {
  const negotiation = buildNegotiation();
  return { negotiation, decision: buildDecision(negotiation) };
}

function serialise(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const fixtures = buildSyntheticGovernanceFixtures();
  if (process.argv.includes("--write")) {
    writeFileSync(negotiationPath, serialise(fixtures.negotiation), "utf8");
    writeFileSync(decisionPath, serialise(fixtures.decision), "utf8");
  } else if (process.argv.includes("--check")) {
    const checks = [
      [negotiationPath, fixtures.negotiation],
      [decisionPath, fixtures.decision],
    ];
    for (const [path, expected] of checks) {
      if (readFileSync(path, "utf8") !== serialise(expected)) {
        throw new Error(`${path.pathname} is not reproducible from the synthetic fixture builder`);
      }
    }
  } else {
    process.stdout.write(`${serialise(fixtures.negotiation)}${serialise(fixtures.decision)}`);
  }
}
