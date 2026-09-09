import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assessProspectivePilotProtocol,
  assertProspectivePilotPreregistration,
  assertProspectivePilotProtocol,
  campaignManifestSha256,
  prospectivePilotContractIdentity,
  protocolContentSha256,
  sourceChronologyEventSha256,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pilotRoot = resolve(here, "..");
const template = JSON.parse(
  readFileSync(join(pilotRoot, "examples/preregistration.template.json"), "utf8"),
);

function preregisteredProtocol() {
  const protocol = structuredClone(template);
  protocol.status = "preregistered-unverified";
  protocol.protocol_id = "protocol.synthetic-method-rehearsal.v1";
  protocol.registration = {
    registered_at: "2030-01-01T00:00:00Z",
    protocol_content_sha256: null,
    verification_status: "unverified_external_review_required",
    external_receipt: {
      source: "https://example.invalid/preregistration-receipt",
      checksum: `sha256:${"a".repeat(64)}`,
      registered_content_sha256: null,
      registered_at: "2030-01-01T00:00:00Z",
      checksum_scope: "external-receipt-bytes-not-this-protocol-record",
      verification_status: "unverified_external_review_required",
    },
  };
  protocol.contract = prospectivePilotContractIdentity();
  protocol.campaign.campaign_id = "campaign.synthetic-method-rehearsal";
  Object.assign(protocol.campaign.manifest, {
    manifest_id: "manifest.synthetic-method-rehearsal.v1",
    campaign_id: protocol.campaign.campaign_id,
    status: "sealed",
    protocol_ids: [protocol.protocol_id],
    sealed_at: "2030-01-01T00:00:00Z",
    verification_status: "unverified_external_review_required",
  });
  protocol.campaign.manifest.manifest_sha256 = campaignManifestSha256(
    protocol.campaign.manifest,
  );
  protocol.target = {
    registration_status: "fixed_before_issue",
    target_id: "target.synthetic-binary-method-test",
    question: "Will the preregistered synthetic test event resolve to one?",
    event_definition: "A structural test payload contains the integer one.",
    outcome_type: "binary",
    unit: "binary-indicator",
    observation_window: {
      starts_at: "2030-01-05T00:00:00Z",
      ends_at: "2030-01-31T00:00:00Z",
    },
    resolution_rule: "Resolve one only when retained test bytes contain the integer one; otherwise resolve zero.",
    resolution_source_id: "source.synthetic-resolution-payload",
    resolution_source_uri: "https://example.invalid/synthetic-resolution-payload.json",
    resolution_event_id: "event.synthetic-resolution-payload.2030",
    independence_cluster_id: "cluster.synthetic-method-rehearsal",
    condition_definition_ref: {
      condition_id: "condition.synthetic-method-rehearsal",
      definition_version: "1.0.0",
      definition_hash: `sha256:${"c".repeat(64)}`,
    },
    signal_definition_ref: {
      signal_id: "signal.synthetic-method-rehearsal",
      definition_version: "1.0.0",
      signal_definition_hash: `sha256:${"d".repeat(64)}`,
    },
    metric_id: "metric.synthetic-method-rehearsal",
    metric_checksum: `sha256:${"e".repeat(64)}`,
    scope: {
      geographies: ["Synthetic region"],
      cohorts: ["Synthetic cohort"],
      services: ["Synthetic service"],
    },
    scope_hash: `sha256:${"f".repeat(64)}`,
    kernel_ref: {
      artifact_path: "contracts/executable-if/fixtures/kernel.synthetic.json",
      artifact_sha256: `sha256:${"1".repeat(64)}`,
      kernel_id: "kernel.synthetic-method-rehearsal",
      manifest_hash: `sha256:${"2".repeat(64)}`,
    },
    signal_registry_ref: {
      artifact_path: "signals/fixtures/synthetic-method-rehearsal.json",
      artifact_sha256: `sha256:${"3".repeat(64)}`,
      registry_id: "registry.synthetic-method-rehearsal",
      schema_version: "1.0.0",
    },
    resolver: {
      resolver_id: "resolver.synthetic-binary-json",
      resolver_version: "1.0.0",
      implementation_sha256: `sha256:${"5".repeat(64)}`,
      parameters_sha256: `sha256:${"6".repeat(64)}`,
      conformance_vectors_sha256: `sha256:${"7".repeat(64)}`,
      conflict_policy: "void-and-disclose",
      correction_policy: "withdraw-resolution-and-rescore-never-overwrite",
    },
  };
  protocol.baseline = {
    registration_status: "fixed_before_issue",
    baseline_role: "reference_class",
    baseline_id: "baseline.synthetic-mechanical-v1",
    target_id: protocol.target.target_id,
    kind: "mechanical",
    algorithm_id: "algorithm.synthetic-prior-frequency",
    algorithm_version: "1.0.0",
    input_source_ids: ["source.synthetic-baseline-policy"],
    input_policy: "predeclared-sources-only-no-post-issue-data",
    calculation_timing: "before-forecast-issue",
    implementation_sha256: `sha256:${"1".repeat(64)}`,
    conformance_vectors_sha256: `sha256:${"2".repeat(64)}`,
    parameters_sha256: `sha256:${"3".repeat(64)}`,
    input_manifest_sha256: `sha256:${"4".repeat(64)}`,
    input_vintage_cutoff_at: "2029-12-31T23:59:59Z",
    missing_input_policy: "withhold-baseline-and-forecast",
    rounding_policy: "round-to-six-decimals-half-even",
    output_probability: null,
    output_policy: "record-only-in-separate-issued-forecast",
  };
  protocol.naive_baseline = structuredClone(protocol.baseline);
  protocol.naive_baseline.baseline_role = "naive";
  protocol.naive_baseline.baseline_id = "baseline.synthetic-naive-v1";
  protocol.naive_baseline.algorithm_id = "algorithm.synthetic-constant";
  protocol.naive_baseline.input_manifest_sha256 = `sha256:${"a".repeat(64)}`;
  protocol.scoring.baseline_id = protocol.baseline.baseline_id;
  protocol.scoring.naive_baseline_id = protocol.naive_baseline.baseline_id;
  protocol.scoring.implementation_sha256 = `sha256:${"8".repeat(64)}`;
  protocol.scoring.conformance_vectors_sha256 = `sha256:${"9".repeat(64)}`;
  protocol.clocks = {
    registration_status: "fixed_before_issue",
    time_standard: "rfc3339-utc",
    clock_authority_verification: "unverified_external_review_required",
    preregistered_at: protocol.registration.registered_at,
    issue_opens_at: "2030-01-03T00:00:00Z",
    issue_closes_at: "2030-01-04T00:00:00Z",
    observation_starts_at: protocol.target.observation_window.starts_at,
    observation_ends_at: protocol.target.observation_window.ends_at,
    outcome_publication_not_before: "2030-02-07T00:00:00Z",
    resolve_after: "2030-02-08T00:00:00Z",
    resolution_closes_at: "2030-02-15T00:00:00Z",
  };
  protocol.source_chronology.required_source_ids = [
    "source.synthetic-resolution-payload",
  ];
  const initialSourceEvent = {
    sequence: 1,
    source_id: "source.synthetic-resolution-payload",
    state: "reported_absent",
    observed_at: "2030-01-01T00:00:00Z",
    artifact_sha256: null,
    previous_event_sha256: null,
    event_sha256: null,
    verification_status: "unverified_external_review_required",
  };
  initialSourceEvent.event_sha256 = sourceChronologyEventSha256(initialSourceEvent);
  protocol.source_chronology.events = [initialSourceEvent];
  protocol.source_chronology.preregistered_event_count = 1;
  protocol.source_chronology.preregistered_tip_sha256 = initialSourceEvent.event_sha256;
  protocol.registration.protocol_content_sha256 = protocolContentSha256(protocol);
  protocol.registration.external_receipt.registered_content_sha256 =
    protocol.registration.protocol_content_sha256;
  return protocol;
}

function appendPresence(protocol, observedAt) {
  const event = {
    sequence: protocol.source_chronology.events.length + 1,
    source_id: "source.synthetic-resolution-payload",
    state: "reported_present_checksum_only",
    observed_at: observedAt,
    artifact_sha256: `sha256:${"b".repeat(64)}`,
    previous_event_sha256: protocol.source_chronology.events.at(-1).event_sha256,
    event_sha256: null,
    verification_status: "unverified_external_review_required",
  };
  event.event_sha256 = sourceChronologyEventSha256(event);
  protocol.source_chronology.events.push(event);
  return protocol;
}

function externalContext(protocol) {
  const events = protocol.source_chronology.events;
  return {
    expectedCampaignManifest: structuredClone(protocol.campaign.manifest),
    expectedExternalReceipt: structuredClone(protocol.registration.external_receipt),
    ...(events.length > protocol.source_chronology.preregistered_event_count
      ? {
          expectedSourceChronologyTip: {
            event_count: events.length,
            tip_sha256: events.at(-1).event_sha256,
          },
        }
      : {}),
  };
}

test("the blank template is valid but cannot be mistaken for a preregistration or forecast", () => {
  const result = assessProspectivePilotProtocol(template);

  assert.equal(result.protocol_valid, true);
  assert.equal(result.preregistration_structurally_complete_unverified, false);
  assert.equal(result.status, "draft-template");
  assert.equal(result.forecast_issued, false);
  assert.equal(result.action_authorised, false);
  assert.equal(template.forecast_issuance.probability, null);
  assert.doesNotThrow(() => assertProspectivePilotProtocol(template));
  assert.throws(
    () => assertProspectivePilotPreregistration(template),
    /not a structurally complete preregistration/i,
  );
});

test("a complete no-consequence preregistration fixes the protocol without issuing a forecast", () => {
  const protocol = preregisteredProtocol();
  const result = assertProspectivePilotProtocol(protocol);

  assert.equal(result.protocol_valid, true);
  assert.equal(result.preregistration_structurally_complete_unverified, true);
  assert.equal(result.supplied_context_objects_match, false);
  assert.equal(result.independent_anchor_verified, false);
  assert.equal(Object.hasOwn(result, "preregistration_context_bound"), false);
  assert.equal(result.status, "preregistered-unverified");
  assert.equal(result.forecast_issued, false);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.action_authorised, false);
  assert.equal(result.external_registration_verified, false);
  assert.doesNotThrow(() => assertProspectivePilotPreregistration(
    protocol,
    externalContext(protocol),
  ));
  assert.throws(
    () => assertProspectivePilotPreregistration(protocol),
    /external.*context|campaign.*receipt/i,
  );
});

test("campaign membership and the sealed manifest are exact and non-circular", () => {
  const protocol = preregisteredProtocol();
  protocol.campaign.manifest.protocol_ids.push("protocol.unregistered-intruder.v1");

  assert.throws(
    () => assertProspectivePilotProtocol(protocol),
    /manifest.*checksum/i,
  );

  const missingSelf = preregisteredProtocol();
  missingSelf.campaign.manifest.protocol_ids = ["protocol.some-other-record.v1"];
  missingSelf.campaign.manifest.manifest_sha256 = campaignManifestSha256(
    missingSelf.campaign.manifest,
  );
  assert.throws(
    () => assertProspectivePilotProtocol(missingSelf),
    /manifest.*protocol/i,
  );

  const sealedAfterRegistration = preregisteredProtocol();
  sealedAfterRegistration.campaign.manifest.sealed_at = "2030-01-02T00:00:00Z";
  sealedAfterRegistration.campaign.manifest.manifest_sha256 = campaignManifestSha256(
    sealedAfterRegistration.campaign.manifest,
  );
  assert.throws(
    () => assertProspectivePilotProtocol(sealedAfterRegistration),
    /manifest.*sealed.*registration/i,
  );
});

test("the registration receipt binds all preregistered substance without self-hashing", () => {
  const changedTarget = preregisteredProtocol();
  changedTarget.target.question = "A changed question after registration.";
  assert.throws(
    () => assertProspectivePilotProtocol(changedTarget),
    /protocol.*content.*checksum/i,
  );

  const changedReceiptBinding = preregisteredProtocol();
  changedReceiptBinding.registration.external_receipt.registered_content_sha256 =
    `sha256:${"d".repeat(64)}`;
  assert.throws(
    () => assertProspectivePilotProtocol(changedReceiptBinding),
    /receipt.*content/i,
  );
});

test("issue and close clocks fail closed on peeking or ambiguous timezone chronology", () => {
  const overlap = preregisteredProtocol();
  overlap.clocks.issue_closes_at = overlap.clocks.observation_starts_at;
  assert.throws(
    () => assertProspectivePilotProtocol(overlap),
    /clock.*chronology|issue.*observation/i,
  );

  const localTime = preregisteredProtocol();
  localTime.clocks.issue_opens_at = "2030-01-03T10:00:00+10:00";
  assert.throws(() => assertProspectivePilotProtocol(localTime), /UTC|Z/i);

  const looseManifestTime = preregisteredProtocol();
  looseManifestTime.campaign.manifest.sealed_at = "2030-01-01 00:00:00Z";
  looseManifestTime.campaign.manifest.manifest_sha256 = campaignManifestSha256(
    looseManifestTime.campaign.manifest,
  );
  assert.throws(() => assertProspectivePilotProtocol(looseManifestTime), /UTC|Z/i);
});

test("source chronology begins with reported absence, stays append-only and cannot report presence before observation ends", () => {
  const earlyPresence = appendPresence(
    preregisteredProtocol(),
    "2030-01-04T12:00:00Z",
  );
  assert.throws(
    () => assertProspectivePilotProtocol(earlyPresence),
    /source.*present.*observation.*end/i,
  );

  const afterObservation = appendPresence(
    preregisteredProtocol(),
    "2030-02-01T00:00:00Z",
  );
  assert.doesNotThrow(() => assertProspectivePilotPreregistration(
    afterObservation,
    externalContext(afterObservation),
  ));

  const unanchoredTail = appendPresence(
    preregisteredProtocol(),
    "2030-02-01T00:00:00Z",
  );
  assert.throws(
    () => assertProspectivePilotPreregistration(unanchoredTail, {
      expectedCampaignManifest: unanchoredTail.campaign.manifest,
      expectedExternalReceipt: unanchoredTail.registration.external_receipt,
    }),
    /tip.*anchor|chronology/i,
  );

  const rolledBack = preregisteredProtocol();
  assert.throws(
    () => assertProspectivePilotPreregistration(rolledBack, {
      expectedCampaignManifest: rolledBack.campaign.manifest,
      expectedExternalReceipt: rolledBack.registration.external_receipt,
      expectedSourceChronologyTip: {
        event_count: 2,
        tip_sha256: `sha256:${"f".repeat(64)}`,
      },
    }),
    /tip.*anchor|chronology/i,
  );

  const latePresence = appendPresence(
    preregisteredProtocol(),
    "2030-02-16T00:00:00Z",
  );
  assert.throws(
    () => assertProspectivePilotProtocol(latePresence),
    /resolution.*close|too late/i,
  );

  const duplicatePresence = appendPresence(
    appendPresence(preregisteredProtocol(), "2030-02-01T00:00:00Z"),
    "2030-02-02T00:00:00Z",
  );
  assert.throws(
    () => assertProspectivePilotProtocol(duplicatePresence),
    /multiple.*presence|one.*presence/i,
  );

  const reordered = preregisteredProtocol();
  reordered.source_chronology.events[0].sequence = 2;
  assert.throws(() => assertProspectivePilotProtocol(reordered), /sequence|append/i);

  const firstPresent = preregisteredProtocol();
  firstPresent.source_chronology.events[0].state = "reported_present_checksum_only";
  firstPresent.source_chronology.events[0].artifact_sha256 = `sha256:${"c".repeat(64)}`;
  assert.throws(() => assertProspectivePilotProtocol(firstPresent), /begin.*absent/i);

  const rewrittenInitialAbsence = preregisteredProtocol();
  rewrittenInitialAbsence.source_chronology.events[0].observed_at =
    "2029-12-31T00:00:00Z";
  rewrittenInitialAbsence.source_chronology.events[0].event_sha256 =
    sourceChronologyEventSha256(rewrittenInitialAbsence.source_chronology.events[0]);
  rewrittenInitialAbsence.source_chronology.preregistered_tip_sha256 =
    rewrittenInitialAbsence.source_chronology.events[0].event_sha256;
  assert.throws(
    () => assertProspectivePilotProtocol(rewrittenInitialAbsence),
    /protocol.*content.*checksum/i,
  );

  const semanticOverclaim = preregisteredProtocol();
  semanticOverclaim.source_chronology.events[0].state = "confirmed_absent";
  assert.throws(
    () => assertProspectivePilotProtocol(semanticOverclaim),
    /schema|state/i,
  );
});

test("target, baseline, clocks and policy cannot remain unresolved after preregistration", () => {
  const unresolved = preregisteredProtocol();
  unresolved.target = structuredClone(template.target);
  assert.throws(() => assertProspectivePilotProtocol(unresolved), /target.*fixed/i);

  const lateBaseline = preregisteredProtocol();
  lateBaseline.baseline.calculation_timing = "after-forecast-issue";
  assert.throws(() => assertProspectivePilotProtocol(lateBaseline), /schema|baseline/i);

  const unboundBaseline = preregisteredProtocol();
  unboundBaseline.baseline.implementation_sha256 = null;
  assert.throws(
    () => assertProspectivePilotProtocol(unboundBaseline),
    /schema|baseline|implementation/i,
  );
});

test("campaign and receipt context must be supplied separately and match exactly", () => {
  const protocol = preregisteredProtocol();
  const competingManifest = structuredClone(protocol.campaign.manifest);
  competingManifest.protocol_ids = ["protocol.competing-self-only.v1"];
  competingManifest.manifest_sha256 = campaignManifestSha256(competingManifest);
  assert.throws(
    () => assertProspectivePilotPreregistration(protocol, {
      expectedCampaignManifest: competingManifest,
      expectedExternalReceipt: protocol.registration.external_receipt,
    }),
    /campaign.*context|manifest/i,
  );

  const swappedReceipt = structuredClone(protocol.registration.external_receipt);
  swappedReceipt.source = "https://example.invalid/a-different-receipt";
  assert.throws(
    () => assertProspectivePilotPreregistration(protocol, {
      expectedCampaignManifest: protocol.campaign.manifest,
      expectedExternalReceipt: swappedReceipt,
    }),
    /receipt.*context/i,
  );
});

test("the preregistration cannot carry a forecast, authority or operational consequence", () => {
  const issued = preregisteredProtocol();
  issued.forecast_issuance.status = "issued";
  issued.forecast_issuance.probability = 0.7;
  issued.forecast_issuance.issued_at = issued.clocks.issue_opens_at;
  assert.throws(() => assertProspectivePilotProtocol(issued), /schema|not_issued|probability/i);

  const authority = preregisteredProtocol();
  authority.authority.action_authorised = true;
  authority.authority.operational_effect = true;
  assert.throws(() => assertProspectivePilotProtocol(authority), /schema|authori|operational/i);
});

test("scoring and revision controls are fixed before issue", () => {
  const scoring = preregisteredProtocol();
  scoring.scoring.primary = "accuracy";
  assert.throws(() => assertProspectivePilotProtocol(scoring), /schema|scoring/i);

  const revision = preregisteredProtocol();
  revision.revision_policy.source_chronology = "overwrite_allowed";
  assert.throws(() => assertProspectivePilotProtocol(revision), /schema|revision/i);

  const substitutedBaseline = preregisteredProtocol();
  substitutedBaseline.scoring.baseline_id = "baseline.unregistered-substitute";
  assert.throws(
    () => assertProspectivePilotProtocol(substitutedBaseline),
    /scoring.*baseline/i,
  );

  const unrelatedTarget = preregisteredProtocol();
  unrelatedTarget.baseline.target_id = "target.unrelated";
  assert.throws(
    () => assertProspectivePilotProtocol(unrelatedTarget),
    /baseline.*target/i,
  );
});
