import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  campaignManifestSha256,
  prospectivePilotContractIdentity,
  protocolContentSha256,
  sourceChronologyEventSha256,
} from "../../validate.mjs";
import {
  forecastIssueBasisHash,
  renderForecastClaimCeiling,
} from "../../../lib/registry.mjs";
import {
  assessFutureIssuanceBinding,
  contentSha256,
  matureForecastContractIdentity,
} from "../validate.mjs";
import { assertIssuedForecastImmutable as assertImmutableIssue } from "../../../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../../..");
const template = JSON.parse(readFileSync(
  resolve(repositoryRoot, "forecasts/prospective-pilot/examples/preregistration.template.json"),
  "utf8",
));
const matureForecastSeed = JSON.parse(readFileSync(
  resolve(repositoryRoot, "forecasts/fixtures/round-04.worker-option.synthetic.json"),
  "utf8",
));

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function jsonBytes(value) {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function retainedSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: sha256(bytes),
  };
}

function resealProtocol(protocol) {
  protocol.campaign.manifest.manifest_sha256 = campaignManifestSha256(
    protocol.campaign.manifest,
  );
  protocol.registration.protocol_content_sha256 = protocolContentSha256(protocol);
  protocol.registration.external_receipt.registered_content_sha256 =
    protocol.registration.protocol_content_sha256;
  return protocol;
}

function opaqueArtifact(label) {
  const bytes = Buffer.from(`synthetic retained artifact: ${label}\n`, "utf8");
  return { bytes, sha256: sha256(bytes) };
}

function baselineArtifacts(matureBaseline) {
  const baselineRole = matureBaseline.mechanical_role;
  const inputSourceIds = [
    baselineRole === "naive"
      ? "source.synthetic-naive-baseline-input"
      : "source.synthetic-reference-baseline-input",
  ];
  const inputManifestDocument = {
    artifact_type: "prospective-baseline-input-manifest",
    schema_version: "1.0.0",
    baseline_role: baselineRole,
    baseline_id: matureBaseline.family_id,
    input_source_ids: inputSourceIds,
    input_checksums: structuredClone(matureBaseline.calculation.input_checksums),
  };
  const inputManifestBytes = jsonBytes(inputManifestDocument);
  return {
    implementation: opaqueArtifact(`${baselineRole}:implementation`),
    conformanceVectors: opaqueArtifact(`${baselineRole}:conformance-vectors`),
    parameters: opaqueArtifact(`${baselineRole}:parameters`),
    inputManifest: {
      bytes: inputManifestBytes,
      document: inputManifestDocument,
      sha256: sha256(inputManifestBytes),
    },
  };
}

function registeredBaseline(matureBaseline, artifacts) {
  return {
    registration_status: "fixed_before_issue",
    baseline_role: matureBaseline.mechanical_role,
    baseline_id: matureBaseline.family_id,
    target_id: "target.synthetic-issuance-binding",
    kind: "mechanical",
    algorithm_id: matureBaseline.calculation.algorithm_id,
    algorithm_version: matureBaseline.calculation.version,
    input_source_ids: structuredClone(artifacts.inputManifest.document.input_source_ids),
    input_policy: "predeclared-sources-only-no-post-issue-data",
    calculation_timing: "before-forecast-issue",
    implementation_sha256: artifacts.implementation.sha256,
    conformance_vectors_sha256: artifacts.conformanceVectors.sha256,
    parameters_sha256: artifacts.parameters.sha256,
    input_manifest_sha256: artifacts.inputManifest.sha256,
    input_vintage_cutoff_at: "2026-09-07T00:00:00Z",
    missing_input_policy: "withhold-baseline-and-forecast",
    rounding_policy: "round-to-six-decimals-half-even",
    output_probability: null,
    output_policy: "record-only-in-separate-issued-forecast",
  };
}

function buildProtocol(forecast, referenceArtifacts, naiveArtifacts) {
  const protocol = structuredClone(template);
  protocol.status = "preregistered-unverified";
  protocol.protocol_id = "protocol.synthetic-issuance-binding.v1";
  protocol.contract = prospectivePilotContractIdentity();
  protocol.registration = {
    registered_at: "2026-09-07T00:00:00Z",
    protocol_content_sha256: null,
    verification_status: "unverified_external_review_required",
    external_receipt: {
      source: "https://example.invalid/synthetic-preregistration-receipt",
      checksum: `sha256:${"a".repeat(64)}`,
      registered_content_sha256: null,
      registered_at: "2026-09-07T00:00:00Z",
      checksum_scope: "external-receipt-bytes-not-this-protocol-record",
      verification_status: "unverified_external_review_required",
    },
  };
  protocol.campaign.campaign_id = forecast.baseline.campaign_id;
  Object.assign(protocol.campaign.manifest, {
    manifest_id: "manifest.synthetic-issuance-binding.v1",
    campaign_id: protocol.campaign.campaign_id,
    status: "sealed",
    protocol_ids: [protocol.protocol_id],
    sealed_at: protocol.registration.registered_at,
    verification_status: "unverified_external_review_required",
  });
  protocol.target = {
    registration_status: "fixed_before_issue",
    target_id: "target.synthetic-issuance-binding",
    question: forecast.question,
    event_definition: forecast.target.event,
    outcome_type: "binary",
    unit: forecast.target.unit,
    observation_window: {
      starts_at: forecast.target.observation_window_start,
      ends_at: forecast.target.observation_window_end,
    },
    resolution_rule: forecast.target.resolution_rule,
    resolution_source_id: forecast.issue_basis.metric_contract.source_refs[0],
    resolution_source_uri: forecast.target.resolution_source,
    resolution_event_id: forecast.target.resolution_event_id,
    independence_cluster_id: forecast.target.independence_cluster_id,
    condition_definition_ref: structuredClone(forecast.issue_basis.condition_definition_ref),
    signal_definition_ref: structuredClone(forecast.issue_basis.signal_definition_ref),
    metric_id: forecast.target.metric_id,
    metric_checksum: forecast.target.metric_checksum,
    scope: structuredClone(forecast.target.scope),
    scope_hash: forecast.target.scope_hash,
    kernel_ref: structuredClone(forecast.issue_basis.kernel_ref),
    signal_registry_ref: structuredClone(forecast.issue_basis.signal_registry_ref),
    resolver: {
      resolver_id: forecast.target.resolver.resolver_id,
      resolver_version: forecast.target.resolver.resolver_version,
      implementation_sha256: `sha256:${"1".repeat(64)}`,
      parameters_sha256: `sha256:${"2".repeat(64)}`,
      conformance_vectors_sha256: `sha256:${"3".repeat(64)}`,
      conflict_policy: "void-and-disclose",
      correction_policy: "withdraw-resolution-and-rescore-never-overwrite",
    },
  };
  protocol.baseline = registeredBaseline(forecast.baseline, referenceArtifacts);
  protocol.naive_baseline = registeredBaseline(forecast.naive_baseline, naiveArtifacts);
  protocol.scoring.baseline_id = protocol.baseline.baseline_id;
  protocol.scoring.naive_baseline_id = protocol.naive_baseline.baseline_id;
  protocol.scoring.implementation_sha256 = `sha256:${"7".repeat(64)}`;
  protocol.scoring.conformance_vectors_sha256 = `sha256:${"8".repeat(64)}`;
  protocol.clocks = {
    registration_status: "fixed_before_issue",
    time_standard: "rfc3339-utc",
    clock_authority_verification: "unverified_external_review_required",
    preregistered_at: protocol.registration.registered_at,
    issue_opens_at: "2026-09-08T00:00:00Z",
    issue_closes_at: "2026-09-09T12:00:00Z",
    observation_starts_at: protocol.target.observation_window.starts_at,
    observation_ends_at: protocol.target.observation_window.ends_at,
    outcome_publication_not_before: forecast.target.outcome_publication_not_before,
    resolve_after: forecast.resolve_after,
    resolution_closes_at: forecast.resolve_by,
  };
  protocol.source_chronology.required_source_ids = [protocol.target.resolution_source_id];
  const absence = {
    sequence: 1,
    source_id: protocol.target.resolution_source_id,
    state: "reported_absent",
    observed_at: protocol.registration.registered_at,
    artifact_sha256: null,
    previous_event_sha256: null,
    event_sha256: null,
    verification_status: "unverified_external_review_required",
  };
  absence.event_sha256 = sourceChronologyEventSha256(absence);
  protocol.source_chronology.events = [absence];
  protocol.source_chronology.preregistered_event_count = 1;
  protocol.source_chronology.preregistered_tip_sha256 = absence.event_sha256;
  return resealProtocol(protocol);
}

function calculationArtifact(protocol, forecast, role) {
  const reference = role === "reference";
  const registered = reference ? protocol.baseline : protocol.naive_baseline;
  const mature = reference ? forecast.baseline : forecast.naive_baseline;
  const document = {
    artifact_type: "prospective-baseline-calculation",
    schema_version: "1.0.0",
    baseline_role: registered.baseline_role,
    protocol_id: protocol.protocol_id,
    protocol_content_sha256: protocol.registration.protocol_content_sha256,
    campaign_id: protocol.campaign.campaign_id,
    target_id: protocol.target.target_id,
    baseline_id: registered.baseline_id,
    algorithm_id: mature.calculation.algorithm_id,
    algorithm_version: mature.calculation.version,
    implementation_sha256: registered.implementation_sha256,
    conformance_vectors_sha256: registered.conformance_vectors_sha256,
    parameters_sha256: registered.parameters_sha256,
    input_source_ids: structuredClone(registered.input_source_ids),
    input_policy: registered.input_policy,
    input_manifest_sha256: registered.input_manifest_sha256,
    input_checksums: structuredClone(mature.calculation.input_checksums),
    input_vintage_cutoff_at: registered.input_vintage_cutoff_at,
    missing_input_policy: registered.missing_input_policy,
    rounding_policy: registered.rounding_policy,
    calculated_at: "2026-09-08T12:00:00Z",
    output_probability: mature.probability,
    verification_status: "unverified_external_review_required",
  };
  const bytes = jsonBytes(document);
  mature.calculation.checksum = sha256(bytes);
  return { bytes, document };
}

function externalProtocolContext(protocol) {
  return {
    expectedCampaignManifest: structuredClone(protocol.campaign.manifest),
    expectedExternalReceipt: structuredClone(protocol.registration.external_receipt),
  };
}

function setup() {
  const forecast = structuredClone(matureForecastSeed);
  const referenceBaselineArtifacts = baselineArtifacts(forecast.baseline);
  const naiveBaselineArtifacts = baselineArtifacts(forecast.naive_baseline);
  const protocol = buildProtocol(forecast, referenceBaselineArtifacts, naiveBaselineArtifacts);
  const referenceBaselineCalculation = calculationArtifact(protocol, forecast, "reference");
  const naiveBaselineCalculation = calculationArtifact(protocol, forecast, "naive");
  const preregistrationBytes = jsonBytes(protocol);
  const matureForecastBytes = jsonBytes(forecast);
  return {
    protocol,
    forecast,
    input: {
      preregistrationBytes,
      matureForecastBytes,
      byteAnchors: {
        preregistration_sha256: sha256(preregistrationBytes),
        mature_forecast_sha256: sha256(matureForecastBytes),
      },
      preregistrationContext: externalProtocolContext(protocol),
      matureForecastSources: {
        sourceKernel: retainedSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
        sourceSignalRegistry: retainedSource("signals/fixtures/round-04.worker-option.synthetic.json"),
        referenceBaselineCalculation,
        naiveBaselineCalculation,
        referenceBaselineArtifacts,
        naiveBaselineArtifacts,
      },
    },
  };
}

function assess(setupResult) {
  return assessFutureIssuanceBinding(setupResult.input);
}

function issueCodes(result) {
  return result.issues.map(({ code }) => code);
}

function blockerCodes(result) {
  return result.blockers.map(({ code }) => code);
}

function refreshBytes(setupResult) {
  setupResult.input.preregistrationBytes = jsonBytes(setupResult.protocol);
  setupResult.input.matureForecastBytes = jsonBytes(setupResult.forecast);
  setupResult.input.byteAnchors = {
    preregistration_sha256: sha256(setupResult.input.preregistrationBytes),
    mature_forecast_sha256: sha256(setupResult.input.matureForecastBytes),
  };
  setupResult.input.preregistrationContext = externalProtocolContext(setupResult.protocol);
  return setupResult;
}

function bindProspectiveRegistration(candidate) {
  const { protocol, forecast } = candidate;
  forecast.prospective_registration = {
    protocol_id: protocol.protocol_id,
    protocol_content_sha256: protocol.registration.protocol_content_sha256,
    preregistration_sha256: sha256(jsonBytes(protocol)),
    campaign_manifest_id: protocol.campaign.manifest.manifest_id,
    campaign_manifest_sha256: protocol.campaign.manifest.manifest_sha256,
    target_id: protocol.target.target_id,
    resolver: structuredClone(protocol.target.resolver),
    mature_contract: matureForecastContractIdentity(),
  };
  return refreshBytes(candidate);
}

test("typed prospective references clear representational blockers but do not assert execution or authority", () => {
  const candidate = bindProspectiveRegistration(setup());
  const result = assess(candidate);
  assert.equal(result.mature_forecast_valid, true, JSON.stringify(result.issues));
  assert.deepEqual(issueCodes(result), []);
  assert.deepEqual(blockerCodes(result), ["BASELINE_EXECUTION_NOT_INDEPENDENTLY_REPRODUCED"]);
  assert.equal(result.issuance_authorised, false);
});

test("prospective references cannot drift or disappear after issue", () => {
  for (const field of ["protocol_id", "protocol_content_sha256", "preregistration_sha256",
    "campaign_manifest_id", "campaign_manifest_sha256", "target_id", "resolver", "mature_contract"]) {
    const candidate = bindProspectiveRegistration(setup());
    const before = structuredClone(candidate.forecast);
    candidate.forecast.prospective_registration[field] = field.endsWith("sha256")
      ? `sha256:${"f".repeat(64)}` : "different";
    refreshBytes(candidate);
    assert.equal(assess(candidate).binding_complete, false);
    assert.ok(issueCodes(assess(candidate)).includes("PROSPECTIVE_REGISTRATION_MISMATCH"));
    assert.throws(() => assertImmutableIssue(before, candidate.forecast), /prospective_registration/);
  }
  const candidate = bindProspectiveRegistration(setup());
  const before = structuredClone(candidate.forecast);
  delete candidate.forecast.prospective_registration;
  assert.throws(() => assertImmutableIssue(before, candidate.forecast), /prospective_registration/);
});

test("valid components remain blocked where the mature schema cannot carry exact issuance bindings", () => {
  const candidate = setup();
  const result = assess(candidate);

  assert.equal(result.preregistration_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.mature_forecast_valid, true, JSON.stringify(result.issues, null, 2));
  assert.equal(result.records_structurally_valid_with_supplied_context, true);
  assert.equal(result.retained_baseline_artifact_bytes_matched, true);
  assert.equal(result.independent_anchor_verified, false);
  assert.equal(result.baseline_execution_independently_reproduced, false);
  assert.equal(Object.hasOwn(result, "component_records_valid"), false);
  assert.equal(result.machine_valid, false);
  assert.equal(result.binding_complete, false);
  assert.equal(result.eligible_for_issuance_review, false);
  assert.equal(result.issuance_authorised, false);
  assert.deepEqual(result.boundaries, {
    empirical_truth_established: false,
    causal_truth_established: false,
    authority_verified: false,
    action_authorised: false,
    publication_approved: false,
  });
  assert.equal(result.content_addresses.preregistration_sha256,
    contentSha256(candidate.input.preregistrationBytes));
  assert.equal(result.content_addresses.mature_forecast_sha256,
    contentSha256(candidate.input.matureForecastBytes));
  assert.deepEqual(result.contract_identities.preregistration, candidate.protocol.contract);
  assert.equal(result.contract_identities.mature_forecast.schema_path,
    "forecasts/schema/binary-forecast.schema.json");
  assert.match(result.contract_identities.mature_forecast.schema_sha256,
    /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.contract_identities.mature_forecast.validator_path,
    "forecasts/lib/registry.mjs");
  assert.match(result.contract_identities.mature_forecast.validator_sha256,
    /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(issueCodes(result), []);
  assert.deepEqual(new Set(blockerCodes(result)), new Set([
    "MATURE_PROTOCOL_REFERENCE_UNREPRESENTABLE",
    "MATURE_CAMPAIGN_MANIFEST_REFERENCE_UNREPRESENTABLE",
    "MATURE_TARGET_ID_UNREPRESENTABLE",
    "MATURE_RESOLVER_ARTIFACT_BINDING_UNREPRESENTABLE",
    "MATURE_CONTRACT_IDENTITY_UNREPRESENTABLE",
    "BASELINE_EXECUTION_NOT_INDEPENDENTLY_REPRODUCED",
  ]));
});

test("hostile: exact raw-byte anchors reject semantically identical replacement bytes", () => {
  const candidate = setup();
  candidate.input.preregistrationBytes = Buffer.concat([
    candidate.input.preregistrationBytes,
    Buffer.from("\n"),
  ]);
  candidate.input.matureForecastBytes = Buffer.concat([
    candidate.input.matureForecastBytes,
    Buffer.from("\n"),
  ]);

  const result = assess(candidate);
  assert.ok(issueCodes(result).includes("PREREGISTRATION_BYTES_DRIFT"));
  assert.ok(issueCodes(result).includes("MATURE_FORECAST_BYTES_DRIFT"));
  assert.notEqual(result.content_addresses.preregistration_sha256,
    candidate.input.byteAnchors.preregistration_sha256);
  assert.notEqual(result.content_addresses.mature_forecast_sha256,
    candidate.input.byteAnchors.mature_forecast_sha256);
});

test("hostile: protocol content tampering fails the fixed preregistration validator", () => {
  const candidate = setup();
  candidate.protocol.protocol_id = "protocol.synthetic-substitute.v1";
  candidate.input.preregistrationBytes = jsonBytes(candidate.protocol);
  candidate.input.byteAnchors.preregistration_sha256 = sha256(candidate.input.preregistrationBytes);

  const result = assess(candidate);
  assert.equal(result.preregistration_valid, false);
  assert.ok(issueCodes(result).includes("PREREGISTRATION_FIXED_VALIDATION_FAILED"));
});

test("hostile: contract identity and calculation protocol-hash drift fail closed", () => {
  const contractDrift = setup();
  contractDrift.protocol.contract.validator_sha256 = `sha256:${"f".repeat(64)}`;
  resealProtocol(contractDrift.protocol);
  refreshBytes(contractDrift);
  assert.ok(issueCodes(assess(contractDrift))
    .includes("PREREGISTRATION_FIXED_VALIDATION_FAILED"));

  const protocolHashDrift = setup();
  const source = protocolHashDrift.input.matureForecastSources.referenceBaselineCalculation;
  source.document.protocol_content_sha256 = `sha256:${"e".repeat(64)}`;
  source.bytes = jsonBytes(source.document);
  protocolHashDrift.forecast.baseline.calculation.checksum = sha256(source.bytes);
  refreshBytes(protocolHashDrift);
  assert.ok(issueCodes(assess(protocolHashDrift))
    .includes("BASELINE_CALCULATION_BINDING_MISMATCH"));
});

test("hostile: campaign, target, source, cluster and issue-window drift is typed", () => {
  const attacks = [
    ["CAMPAIGN_BINDING_MISMATCH", (candidate) => {
      candidate.forecast.baseline.campaign_id = "campaign.synthetic-substitute";
      candidate.forecast.naive_baseline.campaign_id = "campaign.synthetic-substitute";
    }],
    ["TARGET_QUESTION_MISMATCH", (candidate) => {
      candidate.forecast.question = "A substituted synthetic question?";
    }],
    ["TARGET_EVENT_MISMATCH", (candidate) => {
      candidate.forecast.target.event = "A substituted synthetic event.";
      candidate.forecast.issue_basis.interpretation_boundaries.public_claim_ceiling =
        renderForecastClaimCeiling(candidate.forecast);
      candidate.forecast.issue_basis.issue_basis_hash = forecastIssueBasisHash(
        candidate.forecast.issue_basis,
      );
    }],
    ["TARGET_UNIT_MISMATCH", (candidate) => {
      candidate.forecast.target.unit = "substituted-unit";
    }],
    ["TARGET_WINDOW_MISMATCH", (candidate) => {
      candidate.forecast.target.observation_window_start = "2026-09-11T00:00:00Z";
    }],
    ["TARGET_SOURCE_MISMATCH", (candidate) => {
      candidate.protocol.target.resolution_source_id = "source.synthetic-substitute";
      candidate.protocol.source_chronology.required_source_ids = [
        candidate.protocol.target.resolution_source_id,
      ];
      candidate.protocol.source_chronology.events[0].source_id =
        candidate.protocol.target.resolution_source_id;
      candidate.protocol.source_chronology.events[0].event_sha256 =
        sourceChronologyEventSha256(candidate.protocol.source_chronology.events[0]);
      candidate.protocol.source_chronology.preregistered_tip_sha256 =
        candidate.protocol.source_chronology.events[0].event_sha256;
      resealProtocol(candidate.protocol);
    }],
    ["INDEPENDENCE_CLUSTER_MISMATCH", (candidate) => {
      candidate.forecast.target.independence_cluster_id = "cluster.synthetic-substitute";
    }],
    ["RESOLVER_IDENTITY_MISMATCH", (candidate) => {
      candidate.protocol.target.resolver.resolver_version = "9.9.9";
      resealProtocol(candidate.protocol);
    }],
    ["ISSUED_OUTSIDE_PREREGISTERED_WINDOW", (candidate) => {
      candidate.protocol.clocks.issue_closes_at = "2026-09-08T12:00:00Z";
      resealProtocol(candidate.protocol);
    }],
  ];

  for (const [expectedCode, mutate] of attacks) {
    const candidate = setup();
    mutate(candidate);
    refreshBytes(candidate);
    const result = assess(candidate);
    assert.ok(issueCodes(result).includes(expectedCode),
      `${expectedCode}: ${JSON.stringify(result.issues, null, 2)}`);
    assert.equal(result.binding_complete, false);
  }
});

test("hostile: every mature IF target binding must equal its preregistered value", () => {
  const attacks = [
    ["TARGET_CONDITION_BINDING_MISMATCH", (candidate) => {
      candidate.protocol.target.condition_definition_ref.definition_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["TARGET_SIGNAL_BINDING_MISMATCH", (candidate) => {
      candidate.protocol.target.signal_definition_ref.signal_definition_hash =
        `sha256:${"0".repeat(64)}`;
    }],
    ["TARGET_METRIC_BINDING_MISMATCH", (candidate) => {
      candidate.protocol.target.metric_checksum = `sha256:${"0".repeat(64)}`;
    }],
    ["TARGET_SCOPE_MISMATCH", (candidate) => {
      candidate.protocol.target.scope.cohorts = ["Substituted cohort"];
    }],
    ["TARGET_KERNEL_BINDING_MISMATCH", (candidate) => {
      candidate.protocol.target.kernel_ref.manifest_hash = `sha256:${"0".repeat(64)}`;
    }],
    ["TARGET_REGISTRY_BINDING_MISMATCH", (candidate) => {
      candidate.protocol.target.signal_registry_ref.registry_id = "registry.substituted";
    }],
    ["TARGET_SOURCE_MISMATCH", (candidate) => {
      candidate.protocol.target.resolution_source_uri =
        "https://example.invalid/substituted-resolution.json";
    }],
    ["TARGET_SOURCE_MISMATCH", (candidate) => {
      candidate.protocol.target.resolution_event_id = "event.substituted";
    }],
  ];

  for (const [expectedCode, mutate] of attacks) {
    const candidate = setup();
    mutate(candidate);
    resealProtocol(candidate.protocol);
    refreshBytes(candidate);
    const result = assess(candidate);
    assert.ok(issueCodes(result).includes(expectedCode),
      `${expectedCode}: ${JSON.stringify(result.issues, null, 2)}`);
  }
});

test("hostile: mature publication and resolution clocks cannot drift", () => {
  for (const [expectedCode, mutate] of [
    ["PUBLICATION_CLOCK_MISMATCH", (candidate) => {
      candidate.protocol.clocks.outcome_publication_not_before = "2027-01-09T00:00:00Z";
    }],
    ["RESOLVE_AFTER_MISMATCH", (candidate) => {
      candidate.protocol.clocks.resolve_after = "2027-01-09T00:00:00Z";
    }],
  ]) {
    const candidate = setup();
    mutate(candidate);
    resealProtocol(candidate.protocol);
    refreshBytes(candidate);
    assert.ok(issueCodes(assess(candidate)).includes(expectedCode));
  }
});

test("hostile: baseline algorithm, version, input and calculation-byte drift is typed", () => {
  for (const [expectedCode, mutate] of [
    ["BASELINE_ALGORITHM_MISMATCH", (candidate) => {
      candidate.forecast.baseline.calculation.algorithm_id = "algorithm.synthetic-substitute";
    }],
    ["BASELINE_VERSION_MISMATCH", (candidate) => {
      candidate.forecast.baseline.calculation.version = "9.9.9";
    }],
    ["BASELINE_INPUT_MANIFEST_MISMATCH", (candidate) => {
      candidate.forecast.baseline.calculation.input_checksums = [`sha256:${"f".repeat(64)}`];
    }],
  ]) {
    const candidate = setup();
    mutate(candidate);
    candidate.input.matureForecastSources.referenceBaselineCalculation =
      calculationArtifact(candidate.protocol, candidate.forecast, "reference");
    refreshBytes(candidate);
    const result = assess(candidate);
    assert.ok(issueCodes(result).includes(expectedCode),
      `${expectedCode}: ${JSON.stringify(result.issues, null, 2)}`);
  }

  const changedBytes = setup();
  changedBytes.input.matureForecastSources.referenceBaselineCalculation.bytes = Buffer.concat([
    changedBytes.input.matureForecastSources.referenceBaselineCalculation.bytes,
    Buffer.from("\n"),
  ]);
  const changedResult = assess(changedBytes);
  assert.ok(issueCodes(changedResult).includes("BASELINE_CALCULATION_BYTES_MISMATCH"));

  const ambiguousClock = setup();
  const calculation = ambiguousClock.input.matureForecastSources.referenceBaselineCalculation;
  calculation.document.calculated_at = "2026-09-08T22:00:00+10:00";
  calculation.bytes = jsonBytes(calculation.document);
  ambiguousClock.forecast.baseline.calculation.checksum = sha256(calculation.bytes);
  refreshBytes(ambiguousClock);
  assert.ok(issueCodes(assess(ambiguousClock))
    .includes("BASELINE_CALCULATION_BINDING_MISMATCH"));
});

test("hostile: naive comparator shopping and unregistered calculation fields fail closed", () => {
  const comparator = setup();
  comparator.forecast.naive_baseline.family_id = "family.substituted-naive.v1";
  refreshBytes(comparator);
  assert.ok(issueCodes(assess(comparator)).includes("BASELINE_ID_MISMATCH"));

  for (const role of ["reference", "naive"]) {
    const candidate = setup();
    const source = candidate.input.matureForecastSources[`${role}BaselineCalculation`];
    source.document.contradictory_probability = 0.99;
    source.bytes = jsonBytes(source.document);
    const mature = role === "reference"
      ? candidate.forecast.baseline
      : candidate.forecast.naive_baseline;
    mature.calculation.checksum = sha256(source.bytes);
    refreshBytes(candidate);
    assert.ok(issueCodes(assess(candidate)).includes("BASELINE_CALCULATION_SCHEMA_INVALID"));
  }
});

test("hostile: baseline inputs and implementation claims require exact retained bytes", () => {
  const expandedInputs = setup();
  expandedInputs.forecast.baseline.calculation.input_checksums.push(
    `sha256:${"0".repeat(64)}`,
  );
  expandedInputs.input.matureForecastSources.referenceBaselineCalculation =
    calculationArtifact(expandedInputs.protocol, expandedInputs.forecast, "reference");
  refreshBytes(expandedInputs);
  assert.ok(issueCodes(assess(expandedInputs)).includes("BASELINE_INPUT_MANIFEST_MISMATCH"));

  const missingBytes = setup();
  delete missingBytes.input.matureForecastSources.naiveBaselineArtifacts.implementation;
  assert.ok(issueCodes(assess(missingBytes)).includes(
    "BASELINE_IMPLEMENTATION_BYTES_MISMATCH",
  ));

  const changedManifest = setup();
  const manifest = changedManifest.input.matureForecastSources
    .referenceBaselineArtifacts.inputManifest;
  manifest.document.extra = "contradiction";
  manifest.bytes = jsonBytes(manifest.document);
  changedManifest.protocol.baseline.input_manifest_sha256 = sha256(manifest.bytes);
  manifest.sha256 = changedManifest.protocol.baseline.input_manifest_sha256;
  resealProtocol(changedManifest.protocol);
  refreshBytes(changedManifest);
  assert.ok(issueCodes(assess(changedManifest)).includes(
    "BASELINE_INPUT_MANIFEST_SCHEMA_INVALID",
  ));
});

test("hostile: missing external context or mature source bytes never degrades to local-only validation", () => {
  const noContext = setup();
  delete noContext.input.preregistrationContext;
  assert.ok(issueCodes(assess(noContext)).includes("PREREGISTRATION_CONTEXT_REQUIRED"));

  const noSources = setup();
  delete noSources.input.matureForecastSources.sourceKernel;
  assert.ok(issueCodes(assess(noSources)).includes("MATURE_SOURCE_ARTIFACTS_REQUIRED"));

  const noAnchors = setup();
  delete noAnchors.input.byteAnchors;
  const result = assess(noAnchors);
  assert.ok(issueCodes(result).includes("BYTE_ANCHORS_REQUIRED"));
  assert.equal(result.machine_valid, false);
});
