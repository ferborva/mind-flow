import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { FIXED_EVALUATOR_REF, computeSignalDefinitionHash, computeConditionDefinitionHash,
  computeEventHash, computeObservationHash, computeEvidenceEventHash, computeManifestHash,
  computeEvidenceStateHash } from "../../../contracts/executable-if/validate.mjs";
import { projectExecutableIfEvolution } from "../../../contracts/evolution/project-executable-if.mjs";
import { computeMetricContractChecksum, renderPublicClaimCeiling } from "../../../signals/validate.mjs";

export const root = resolve(import.meta.dirname, "../../..");
export const directory = "forecasts/prospective-pilot/round-08-nero";
export const recordedAt = "2026-09-09T10:51:23Z";
export const sourceId = "source.jsa.nero";
export const sourceUrl = "https://www.jobsandskills.gov.au/data/nero";
export const baselinePath = "pilots/australia/data/nero-clerical-2026-08.r2.json";
export const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
export const sha256 = (bytes: Uint8Array) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
export const source = (path: string) => {
  const bytes = readFileSync(resolve(root, path));
  return { path, bytes, document: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
};

export function boundedEmploymentIndex(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("NERO count must be a nonnegative safe integer");
  return value / (value + 4217);
}

export function buildNeroBasis() {
  const baseline = source(baselinePath);
  const selected = baseline.document.series.filter((item: any) => item.occupation_code === "5311" && item.sa4_code === "101");
  if (selected.length !== 1 || selected[0].latest.value !== 4217 || selected[0].latest.date !== "2026-08-15") {
    throw new Error("The frozen August 2026 Capital Region General Clerks baseline changed");
  }
  const signal: any = {
    signal_id: "signal.nero.5311.101.bounded-stock", definition_version: "1.0.0",
    label: "Bounded NERO employment-stock index, General Clerks, Capital Region",
    construct: "Modelled employment stock x transformed to x/(x+4217); exposure context, not vacancies or worker opportunity",
    population: "NERO occupation code 5311, General Clerks, resident in SA4 code 101, Capital Region",
    estimand: "NERO modelled employed-person count x divided by x plus the frozen August 2026 count 4217",
    aggregation: "One occupation-SA4 series; no aggregation across occupations or regions",
    projection_policy: "exact-scope-only", source_schema_ref: "https://www.jobsandskills.gov.au/data/nero",
    value_kind: "number", unit: "bounded employment index", value_range: { minimum: 0, maximum: 1 },
  };
  signal.signal_definition_hash = computeSignalDefinitionHash(signal);
  const signalRef = { signal_id: signal.signal_id, definition_version: signal.definition_version,
    signal_definition_hash: signal.signal_definition_hash };
  const scope = { jurisdictions: ["Australia"], geographies: ["SA4 101: Capital Region"],
    cohorts: ["ANZSCO4 5311: General Clerks"], services: ["Modelled employment stock, exposure context only"] };
  const definition: any = {
    condition_id: "condition.nero.5311.101.stock", definition_version: "1.0.0", condition_category: "availability",
    proposition: "The modelled employment stock is at least the frozen August 2026 count 4217; this is exposure context only.",
    claim: { who: signal.population, verb: "have", object: "modelled employment stock at or above 4217",
      standard: "bounded employment index x/(x+4217) is at least 0.5", polarity: "affirmative",
      period: { starts_at: "2026-08-01T00:00:00Z", ends_at: "2026-10-31T23:59:59Z" } },
    effective_from: recordedAt, scope,
    predicates: { "stock-threshold": { signal_ref: signalRef, operator: "gte",
      threshold: { value: 0.5, unit: signal.unit },
      window: { lookback_days: 120, minimum_observations: 1, persistence: 1, maximum_age_days: 120 },
      source_policy: { minimum_distinct_source_ids: 1, minimum_distinct_artifact_hashes: 1,
        minimum_coverage_ratio: 1, agreement: "unanimous-per-period" },
      missing_result: "unknown", stale_result: "stale", conflict_result: "conflicted" } },
    truth_expression: { predicate_ref: "stock-threshold" }, evaluator_ref: FIXED_EVALUATOR_REF,
    classification: "research-draft", empirical_truth_established: false, authority_effect: "none", action_authorised: false,
  };
  definition.definition_hash = computeConditionDefinitionHash(definition);
  const definitionRef = { condition_id: definition.condition_id, definition_version: definition.definition_version,
    definition_hash: definition.definition_hash };
  const state = { condition_id: definition.condition_id, state_version: 1,
    condition_definition_ref: definitionRef, lifecycle: "active" };
  const event: any = { sequence: 1, event_id: "event.nero.5311.101.stock.added", operation: "added", recorded_at: recordedAt,
    recorded_by: "Ren (AI agent)", reason: "Fix one observed NERO series and its monotone count threshold before the October outcome.",
    previous_states: [], new_states: [state], introduced_definitions: [definition], identity_change: { kind: "none" },
    authority_effect: "none", action_authorised: false, previous_event_hash: null };
  event.event_hash = computeEventHash(event);
  const observation: any = { observation_id: "observation.nero.5311.101.2026-08", classification: "measured-observation",
    condition_definition_ref: definitionRef, predicate_id: "stock-threshold", signal_ref: signalRef, scope,
    period: { start: "2026-08-01T00:00:00Z", end: "2026-08-31T23:59:59Z" }, recorded_at: recordedAt,
    value: boundedEmploymentIndex(selected[0].latest.value), unit: signal.unit, source_id: sourceId,
    source_artifact_hash: baseline.document.source.checksum, source_independence: "not-verified",
    uncertainty: { status: "not-quantified", reason: "Experimental smoothed modelled stock; no sampling interval, individual inference or real-time vacancy estimate." },
    coverage: { eligible_units: 1, observed_units: 1, missing_units: 0, unit: "preselected occupation-SA4 series cell, not people" },
    authority_effect: "none", action_authorised: false };
  observation.observation_hash = computeObservationHash(observation);
  const evidenceState = { observation_ref: { observation_id: observation.observation_id, observation_hash: observation.observation_hash },
    state_version: 1, lifecycle: "active" };
  const evidenceEvent: any = { sequence: 1, evidence_event_id: "evidence-event.nero.5311.101.2026-08.added",
    operation: "evidence-added", recorded_at: recordedAt, recorded_by: "Ren (AI agent)",
    reason: "Bind the retained August NERO count and its bounded transform; receipt covers one series cell, not human outcomes.",
    previous_states: [], new_states: [evidenceState], relation: { kind: "none" },
    authority_effect: "none", action_authorised: false, previous_evidence_event_hash: null };
  evidenceEvent.evidence_event_hash = computeEvidenceEventHash(evidenceEvent);
  const kernel: any = { schema_version: "1.1.0", kernel_id: "kernel.nero.5311.101.prospective",
    classification: "research-draft", empirical_truth_established: false, authority_effect: "none",
    action_authorised: false, publication_approved: false, evaluator: FIXED_EVALUATOR_REF,
    signals: [signal], events: [event], observations: [observation], evidence_events: [evidenceEvent],
    current_evidence_state: [evidenceState], current_state: [state] };
  kernel.manifest_hash = computeManifestHash(kernel);
  const evolution = projectExecutableIfEvolution(kernel, { artifact_path: `${directory}/kernel.json`,
    artifact_sha256: sha256(jsonBytes(kernel)), generated_at: recordedAt });
  const ledgerRef = `urn:mind-flow:evolution:${evolution.ledger_id}`;
  const period = `${definition.claim.period.starts_at} to ${definition.claim.period.ends_at}`;
  const measurementScope = { construct_id: "construct.nero.5311.101.stock", population: signal.population,
    geography: "SA4 101: Capital Region, Australia", statistical_unit: "one modelled occupation-SA4 series",
    period, unit: signal.unit, denominator: "x plus frozen August 2026 count 4217; not a population denominator", aggregation_level: signal.aggregation };
  const item: any = { signal_id: signal.signal_id, label: signal.label, status: "shadow",
    construct: { construct_id: measurementScope.construct_id, name: signal.label,
      definition: signal.construct, statistical_unit: measurementScope.statistical_unit },
    estimand: { quantity: signal.estimand, population: signal.population, geography: measurementScope.geography,
      period, unit: signal.unit, denominator: measurementScope.denominator, aggregation_level: signal.aggregation },
    epistemic_class: "derived-estimate", source_refs: [sourceId],
    condition_links: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, evidence_role: "confirming",
      edge_type: "necessary", scope: measurementScope }],
    timing: { cadence: "monthly", publication_lag_max_days: 40, prospective_decision_lead_min_days: 0,
      revision_behaviour: "Freeze the August input vintage and first retained October release; retain corrections separately." },
    uncertainty: { representation: "Unquantified model and revision uncertainty", interval_available: false,
      known_limits: ["Stock is not vacancies, worker opportunity, actual GP access, agency or AI causation.",
        "Occupation and SA4 versions are not independently established by the retained archive."] },
    missingness: { mechanism: "A source release or exact series cell may be absent, suppressed or changed.",
      reporting_rule: "Withhold resolution when the exact cell cannot be reconstructed; never impute zero." },
    exclusions: ["cross-series aggregation", "individual inference", "operational use"],
    confounders: ["smoothing", "historical training data", "revisions", "classification changes"],
    negative_controls: ["The fixed equal-probability comparator uses the same source eligibility checks."],
    gaming: { risks: ["selecting a favourable vintage or series after observing it"], detection: "Compare frozen code, scope, first-presence receipt and archive hashes.",
      suspension_rule: "Withhold for ambiguous classifications or conflicting first-release bytes." },
    reflexivity: { risk: "A modelled stock may be mistaken for accessible work.", monitor: "Keep the stock, access and agency interpretations distinct." },
    value_of_information: { decision_ref: null, learning_value: "Test whether a prospective modelled-stock claim can be resolved faithfully.",
      next_observation: "First retained October 2026 NERO release for occupation 5311 and SA4 101." },
    claim_permissions: { causal_claim: false, individual_inference: false, operational_effect: false },
    executable_binding: { kind: "executable-predicate", signal_definition_ref: signalRef,
      condition_definition_ref: definitionRef, predicate_ids: ["stock-threshold"] } };
  item.metric_contract = { metric_id: "metric.nero.5311.101.bounded-stock", measure: signal.estimand,
    unit: signal.unit, denominator: measurementScope.denominator, population: signal.population,
    geography: measurementScope.geography, period, aggregation: signal.aggregation,
    collection_process_ids: ["process.jsa.nero"], source_refs: [sourceId],
    evaluation_rule: "Transform the exact series count x to x/(x+4217), then compare gte 0.5. No population-share interpretation." };
  item.metric_contract.metric_checksum = computeMetricContractChecksum(item.metric_contract);
  item.public_claim_ceiling = renderPublicClaimCeiling(item);
  const registry = { schema_version: "1.1.0", registry_id: "registry.nero.5311.101.prospective",
    status: "agent-proposal", authority: "none", operational_effect: false, as_of: recordedAt,
    condition_bindings: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, binding_status: "locally-verified-complete",
      ledger_manifest_hash: evolution.manifest_hash, ledger_tip_event_id: event.event_id, ledger_tip_hash: event.event_hash,
      condition_definition_ref: definitionRef, condition_source_event_ref: { sequence: 1, event_id: event.event_id, event_hash: event.event_hash },
      evidence_state_ref: { kernel_id: kernel.kernel_id, kernel_manifest_hash: kernel.manifest_hash,
        evidence_event_count: 1, evidence_tip_event_id: evidenceEvent.evidence_event_id, evidence_tip_event_hash: evidenceEvent.evidence_event_hash,
        evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state) }, next_binding: null }],
    sources: [{ source_id: sourceId, label: "NERO, Jobs and Skills Australia", publisher: "Jobs and Skills Australia, Commonwealth of Australia",
      collection_process_id: "process.jsa.nero", depends_on_source_ids: [], evidence_ref: sourceUrl,
      artifact_binding: { status: "acquired-external-bytes", checksum: baseline.document.source.checksum,
        byte_length: 48613300, retrieved_at: "2026-09-08T22:33:29Z", next_acquisition: null } }],
    signals: [item], portfolios: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, scope: measurementScope,
      decision_context: { use: "research-only", owner_ref: null, minimum_useful_lead_days: 0 },
      role_assignments: [{ role: "confirming", signal_ids: [signal.signal_id] }],
      unresolved_roles: ["leading", "counter", "outcome", "readiness", "intervention-exposure", "information-harm"].map((role) =>
        ({ role, reason: "This one-series prospective test supplies no independently measured human or intervention outcome.",
          next_acquisition: "Separate scope-compatible evidence is required before expanding the research claim." })), public_disposition: "methods-only" }] };
  return { kernel, registry, evolution };
}
