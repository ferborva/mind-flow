import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { root, directory, recordedAt, baselinePath, source, sourceId, sourceUrl, sha256, jsonBytes } from "./basis.mts";
import { evaluateKernelCondition, computeEvidenceStateHash } from "../../../contracts/executable-if/validate.mjs";
import { forecastScopeHash, forecastIssueBasisHash, renderForecastClaimCeiling } from "../../lib/registry.mjs";
import { campaignManifestSha256, prospectivePilotContractIdentity, protocolContentSha256, sourceChronologyEventSha256 } from "../validate.mjs";
import { matureForecastContractIdentity } from "../issuance-binding/round-09-validate.mjs";
import { runNeroBaseline } from "../issuance-binding/baseline-execution.mjs";

type CandidateClocks = { sealAt: string; issueOpensAt: string; issuedAt: string; sourceCommit: string; externalReceipt?: any };
const artifact = (path: string) => { const bytes = readFileSync(resolve(root, path)); return { bytes, sha256: sha256(bytes) }; };
const objectArtifact = (document: unknown) => { const bytes = jsonBytes(document); return { bytes, document, sha256: sha256(bytes) }; };
const baseUrl = "https://github.com/ferborva/mind-flow";
const parameters = { occupation_code: "5311", sa4_code: "102", first_month: "2024-08", last_month: "2026-08", horizon_months: 2 };

// Pure preparation: no writes, network, issuance or caller-code execution.
// The returned forecast is an in-memory proposal until the separate issue step.
export function prepareNeroCandidate({ sealAt, issueOpensAt, issuedAt, sourceCommit, externalReceipt = null }: CandidateClocks) {
  if (!(Date.parse(sealAt) >= Date.parse(recordedAt) && Date.parse(sealAt) < Date.parse(issueOpensAt) &&
      Date.parse(issueOpensAt) <= Date.parse(issuedAt) && Date.parse(issuedAt) < Date.parse("2026-09-30T00:00:00Z"))) {
    throw new Error("candidate clocks must follow source preparation and precede the fixed observation month");
  }
  const sourceKernel = source(`${directory}/kernel.json`);
  const sourceSignalRegistry = source(`${directory}/registry.json`);
  const inputSource = source(baselinePath);
  const kernel = sourceKernel.document;
  const registry = sourceSignalRegistry.document;
  const definition = kernel.events[0].introduced_definitions[0];
  const definitionRef = kernel.current_state[0].condition_definition_ref;
  const predicate = definition.predicates["stock-threshold"];
  const metric = registry.signals[0].metric_contract;
  const targetScope = { geographies: definition.scope.geographies, cohorts: definition.scope.cohorts, services: definition.scope.services };
  const evaluator = evaluateKernelCondition(kernel, definition.condition_id, { evaluatedAt: issuedAt });
  const evidenceTip = kernel.evidence_events.at(-1);
  const campaignId = "campaign.nero.5311.102.october-2026";
  const protocolId = "protocol.nero.5311.102.october-2026.v1";
  const targetId = "target.nero.5311.102.october-2026";
  const baselineImplementation = artifact("forecasts/prospective-pilot/issuance-binding/baseline-execution.mjs");
  const baselineConformance = artifact("forecasts/prospective-pilot/issuance-binding/baseline-conformance.json");
  const parametersArtifact = objectArtifact(parameters);
  const retainedArtifacts: any = {};
  const baselines: any = {};
  for (const role of ["reference", "naive"]) {
    const mechanicalRole = role === "reference" ? "reference_class" : "naive";
    const algorithmId = role === "reference" ? "mind-flow.nero-two-month-direction" : "mind-flow.equal-probability";
    const baselineId = `family.nero.${role}.v1`;
    const inputManifest = objectArtifact({ artifact_type: "prospective-baseline-input-manifest", schema_version: "1.0.0",
      baseline_role: mechanicalRole, baseline_id: baselineId, input_source_ids: [sourceId], input_checksums: [inputSource.sha256] });
    retainedArtifacts[`${role}BaselineArtifacts`] = { implementation: baselineImplementation, conformanceVectors: baselineConformance,
      parameters: parametersArtifact, inputManifest, inputs: [{ bytes: inputSource.bytes }] };
    baselines[role] = { campaign_id: campaignId, family_id: baselineId,
      name: role === "reference" ? "Frozen two-month direction frequency with Laplace smoothing" : "Frozen equal-probability comparator",
      kind: "mechanical", mechanical_role: mechanicalRole,
      probability: runNeroBaseline(algorithmId, inputSource.document, parameters),
      method: role === "reference" ? "Count nonnegative two-month changes from August 2024 through August 2026 in the retained August 2026 vintage; (successes+1)/(comparisons+2)." : "Return 0.5 after the same input eligibility checks.",
      declared_at: sealAt, policy_snapshot: { source: `${baseUrl}/blob/${sourceCommit}/${directory}/README.md`,
        retrieved_at: sealAt, vintage: protocolId, checksum: artifact(`${directory}/README.md`).sha256 },
      calculation: { algorithm_id: algorithmId, version: "1.0.0", input_checksums: [inputSource.sha256],
        checksum: null, verification_status: "unverified_external_review_required" } };
  }
  const forecast: any = { schema_version: "1.4.0", id: "forecast.nero.5311.102.october-2026.v1",
    epistemic_class: "forecast", forecast_use: "research_only", status: "issued",
    title: "October NERO General Clerks employment stock in Central Coast versus the frozen August count",
    question: "Will the first retained October 2026 NERO release report at least 3092 employed persons for occupation 5311, General Clerks, in SA4 102, Central Coast?",
    issued_at: issuedAt, resolve_after: "2026-11-01T00:00:00Z", resolve_by: "2026-12-07T00:00:00Z",
    probability: baselines.reference.probability,
    target: { event: "The first retained October 2026 NERO value for General Clerks in Central Coast is at least 3092.",
      unit: "binary event on a modelled employment stock", scope: targetScope, signal_id: predicate.signal_ref.signal_id,
      metric_id: metric.metric_id, metric_checksum: metric.metric_checksum, condition_id: definition.condition_id,
      scope_hash: forecastScopeHash(targetScope),
      resolution_rule: "Retain the first October archive and first-presence receipt. Select exactly one CSV cell with anzsco4_code 5311, sa4_code 101 and date 2026-10-15. Derive x/(x+3092). Resolve 1 iff this is at least 0.5 (equivalently x>=3092), else 0. No substitutions or later-vintage shopping; apply the prewritten resolution and void procedure.",
      resolution_source: sourceUrl, resolution_event_id: "event.nero.5311.102.2026-10", independence_cluster_id: "cluster.nero-model.2026",
      resolver: { resolver_id: "mind-flow.binary-threshold-json", resolver_version: "1.1.0",
        measure: metric.measure, observation_unit: metric.unit, operator: "gte", threshold: 0.5 },
      observation_window_start: "2026-10-01T00:00:00Z", observation_window_end: "2026-10-31T23:59:59Z",
      outcome_publication_not_before: "2026-11-01T00:00:00Z" },
    baseline: baselines.reference, naive_baseline: baselines.naive,
    method: { kind: "model", description: "Use the predeclared two-month direction algorithm as the primary forecast and reference comparator. This tests prospective discipline; it cannot demonstrate advantage over that same comparator.", version: "1.0.0" },
    data_vintages: [{ source: `${baseUrl}/blob/${sourceCommit}/${baselinePath}`, retrieved_at: recordedAt,
      vintage: "August 2026 retained NERO projection, classification-status correction r2", checksum: inputSource.sha256 },
    { source: inputSource.document.source.archive_url, retrieved_at: "2026-09-08T22:33:29Z", vintage: "2026-08", checksum: inputSource.document.source.checksum }],
    provenance: { author: "Ren", class: "agent-proposal", issued_commit: sourceCommit,
      disclaimer: "Research-only agent forecast of a modelled stock. No calibration, causal, agency, access or action claim. issued_commit identifies the source checkout at issuance; the containing record commit is discoverable from Git history and cannot be embedded in itself." },
    assumptions: ["The selected source-native code and label pair remains comparable across the frozen August and first October releases.",
      "Historical two-month signs in one smoothed and revised vintage provide a mechanical baseline, not independent trials or calibrated future probabilities.",
      "First retained release may differ from later corrections; all later changes remain separately visible.",
      "The bounded index is a monotone transform, not a population share or available jobs."],
    counter_hypotheses: ["The October modelled count is below 3092.", "Smoothing, revisions or classification changes break historical comparability.",
      "The October archive is unavailable by resolution close."],
    void_policy: { allowed_reason_codes: ["source_retired", "measure_materially_changed", "resolution_evidence_unavailable"], evidence_required: true },
    issue_basis: { basis_version: "1.0.0", issued_at: issuedAt,
      kernel_ref: { artifact_path: sourceKernel.path, artifact_sha256: sourceKernel.sha256, kernel_id: kernel.kernel_id, manifest_hash: kernel.manifest_hash },
      signal_registry_ref: { artifact_path: sourceSignalRegistry.path, artifact_sha256: sourceSignalRegistry.sha256, registry_id: registry.registry_id, schema_version: registry.schema_version },
      condition_definition_ref: definitionRef, predicate_id: "stock-threshold", signal_definition_ref: predicate.signal_ref,
      metric_contract: metric, condition_scope: { ...definition.scope, period: definition.claim.period }, target_scope_hash: forecastScopeHash(targetScope),
      evidence_state_ref: { kernel_id: kernel.kernel_id, kernel_manifest_hash: kernel.manifest_hash, event_count: kernel.evidence_events.length,
        tip_event_id: evidenceTip.evidence_event_id, tip_event_hash: evidenceTip.evidence_event_hash, state_hash: computeEvidenceStateHash(kernel.current_evidence_state) },
      issue_evaluation_receipt: Object.fromEntries(["evaluated_at", "clock", "evaluator_ref", "condition_definition_ref", "observation_hashes",
        "mechanically_valid_for_evaluation", "computed_rule_state", "empirical_truth_established", "authority_effect", "action_authorised",
        "publication_approved", "kernel_manifest_hash", "evidence_state_hash", "evaluation_hash"].map((field) => [field, evaluator[field]])),
      interpretation_boundaries: { probability_relation: "orthogonal-to-current-computed-if-state", current_if_state_is_forecast_probability: false,
        probability_establishes_empirical_truth: false, probability_establishes_causality: false, probability_establishes_authority: false,
        empirical_truth_established: false, causality_established: false, authority_effect: "none", action_authorised: false, public_claim_ceiling: "" } },
    resolution: { status: "pending" }, history: [{ at: issuedAt, event: "issued", actor: "Ren",
      note: "No-consequence prospective record. Preserve these exact issued bytes; append resolution or void separately." }] };
  forecast.issue_basis.interpretation_boundaries.public_claim_ceiling = renderForecastClaimCeiling(forecast);
  forecast.issue_basis.issue_basis_hash = forecastIssueBasisHash(forecast.issue_basis);
  const protocol: any = source("forecasts/prospective-pilot/examples/preregistration.template.json").document;
  protocol.status = "preregistered-unverified";
  protocol.protocol_id = protocolId;
  protocol.contract = prospectivePilotContractIdentity();
  protocol.registration = { registered_at: sealAt, protocol_content_sha256: null,
    verification_status: "unverified_external_review_required", external_receipt: externalReceipt };
  protocol.campaign.campaign_id = campaignId;
  Object.assign(protocol.campaign.manifest, { manifest_id: "manifest.nero.5311.102.october-2026.v1", campaign_id: campaignId,
    status: "sealed", protocol_ids: [protocolId], sealed_at: sealAt, verification_status: "unverified_external_review_required" });
  protocol.campaign.manifest.manifest_sha256 = campaignManifestSha256(protocol.campaign.manifest);
  const resolverParameters = objectArtifact({ occupation_code: "5311", sa4_code: "102", date: "2026-10-15", count_baseline: 3092,
    dependencies: Object.fromEntries([`${directory}/basis.mts`, `${directory}/resolver.mts`, "dashboard/tools/build-nero-baseline.mjs", "forecasts/prospective-pilot/tests/round-09-nero.test.mjs",
      "forecasts/prospective-pilot/issuance-binding/round-09-validate.mjs"]
      .map((path) => [path, artifact(path).sha256])) });
  const resolverImplementation = artifact("forecasts/lib/resolution.mjs");
  const resolverConformance = artifact("forecasts/tests/resolution-event-hardening.test.mjs");
  protocol.target = { registration_status: "fixed_before_issue", target_id: targetId, question: forecast.question,
    event_definition: forecast.target.event, outcome_type: "binary", unit: forecast.target.unit,
    observation_window: { starts_at: forecast.target.observation_window_start, ends_at: forecast.target.observation_window_end },
    resolution_rule: forecast.target.resolution_rule, resolution_source_id: sourceId, resolution_source_uri: sourceUrl,
    resolution_event_id: forecast.target.resolution_event_id, independence_cluster_id: forecast.target.independence_cluster_id,
    condition_definition_ref: definitionRef, signal_definition_ref: predicate.signal_ref, metric_id: metric.metric_id,
    metric_checksum: metric.metric_checksum, scope: targetScope, scope_hash: forecast.target.scope_hash,
    kernel_ref: forecast.issue_basis.kernel_ref, signal_registry_ref: forecast.issue_basis.signal_registry_ref,
    resolver: { resolver_id: forecast.target.resolver.resolver_id, resolver_version: forecast.target.resolver.resolver_version,
      implementation_sha256: resolverImplementation.sha256, parameters_sha256: resolverParameters.sha256,
      conformance_vectors_sha256: resolverConformance.sha256, conflict_policy: "void-and-disclose", correction_policy: "withdraw-resolution-and-rescore-never-overwrite" } };
  for (const role of ["reference", "naive"]) {
    const mature = baselines[role];
    const artifacts = retainedArtifacts[`${role}BaselineArtifacts`];
    protocol[role === "reference" ? "baseline" : "naive_baseline"] = {
      registration_status: "fixed_before_issue", baseline_role: mature.mechanical_role, baseline_id: mature.family_id, target_id: targetId,
      kind: "mechanical", algorithm_id: mature.calculation.algorithm_id, algorithm_version: "1.0.0", input_source_ids: [sourceId],
      input_policy: "predeclared-sources-only-no-post-issue-data", calculation_timing: "before-forecast-issue",
      implementation_sha256: artifacts.implementation.sha256, conformance_vectors_sha256: artifacts.conformanceVectors.sha256,
      parameters_sha256: artifacts.parameters.sha256, input_manifest_sha256: artifacts.inputManifest.sha256,
      input_vintage_cutoff_at: recordedAt, missing_input_policy: "withhold-baseline-and-forecast", rounding_policy: "round-to-six-decimals-half-even",
      output_probability: null, output_policy: "record-only-in-separate-issued-forecast" };
  }
  Object.assign(protocol.clocks, { registration_status: "fixed_before_issue", preregistered_at: sealAt,
    issue_opens_at: issueOpensAt, issue_closes_at: "2026-09-30T00:00:00Z",
    observation_starts_at: forecast.target.observation_window_start, observation_ends_at: forecast.target.observation_window_end,
    outcome_publication_not_before: forecast.target.outcome_publication_not_before,
    resolve_after: forecast.resolve_after, resolution_closes_at: forecast.resolve_by });
  const absence: any = { sequence: 1, source_id: sourceId, state: "reported_absent", observed_at: "2026-09-10T00:00:41Z",
    artifact_sha256: null, previous_event_sha256: null, verification_status: "unverified_external_review_required" };
  absence.event_sha256 = sourceChronologyEventSha256(absence);
  protocol.source_chronology = { policy: "append-only-absence-to-retained-presence", required_source_ids: [sourceId],
    preregistered_event_count: 1, preregistered_tip_sha256: absence.event_sha256, events: [absence] };
  Object.assign(protocol.scoring, { baseline_id: baselines.reference.family_id, naive_baseline_id: baselines.naive.family_id,
    implementation_sha256: artifact("forecasts/lib/scoring.mjs").sha256,
    conformance_vectors_sha256: artifact("forecasts/tests/forecast.test.mjs").sha256 });
  protocol.registration.protocol_content_sha256 = protocolContentSha256(protocol);
  for (const role of ["reference", "naive"]) {
    const registered = protocol[role === "reference" ? "baseline" : "naive_baseline"];
    const calculation = { artifact_type: "prospective-baseline-calculation", schema_version: "1.0.0",
      baseline_role: registered.baseline_role, protocol_id: protocolId, protocol_content_sha256: protocol.registration.protocol_content_sha256,
      campaign_id: campaignId, target_id: targetId, baseline_id: registered.baseline_id, algorithm_id: registered.algorithm_id,
      algorithm_version: registered.algorithm_version, implementation_sha256: registered.implementation_sha256,
      conformance_vectors_sha256: registered.conformance_vectors_sha256, parameters_sha256: registered.parameters_sha256,
      input_source_ids: registered.input_source_ids, input_policy: registered.input_policy, input_manifest_sha256: registered.input_manifest_sha256,
      input_checksums: [inputSource.sha256], input_vintage_cutoff_at: registered.input_vintage_cutoff_at,
      missing_input_policy: registered.missing_input_policy, rounding_policy: registered.rounding_policy,
      calculated_at: sealAt, output_probability: baselines[role].probability, verification_status: "unverified_external_review_required" };
    retainedArtifacts[`${role}BaselineCalculation`] = objectArtifact(calculation);
    baselines[role].calculation.checksum = retainedArtifacts[`${role}BaselineCalculation`].sha256;
  }
  const preregistrationBytes = jsonBytes(protocol);
  forecast.prospective_registration = { protocol_id: protocolId, protocol_content_sha256: protocol.registration.protocol_content_sha256,
    preregistration_sha256: sha256(preregistrationBytes), campaign_manifest_id: protocol.campaign.manifest.manifest_id,
    campaign_manifest_sha256: protocol.campaign.manifest.manifest_sha256, target_id: targetId,
    resolver: protocol.target.resolver, mature_contract: matureForecastContractIdentity() };
  const matureForecastBytes = jsonBytes(forecast);
  const resolverArtifacts = { implementation: resolverImplementation, parameters: resolverParameters, conformanceVectors: resolverConformance,
    dependencies: Object.fromEntries(Object.keys(resolverParameters.document.dependencies).map((path) => [path, artifact(path)])) };
  return { protocol, forecast, parameters, resolverParameters: resolverParameters.document, retainedArtifacts,
    input: { preregistrationBytes, matureForecastBytes,
      byteAnchors: { preregistration_sha256: sha256(preregistrationBytes), mature_forecast_sha256: sha256(matureForecastBytes) },
      preregistrationContext: { expectedCampaignManifest: protocol.campaign.manifest, expectedExternalReceipt: externalReceipt },
      matureForecastSources: { sourceKernel, sourceSignalRegistry, ...retainedArtifacts, resolverArtifacts } } };
}
