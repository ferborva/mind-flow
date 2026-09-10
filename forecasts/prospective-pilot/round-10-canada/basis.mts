import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { FIXED_EVALUATOR_REF, computeSignalDefinitionHash, computeConditionDefinitionHash,
  computeEventHash, computeObservationHash, computeEvidenceEventHash, computeManifestHash,
  computeEvidenceStateHash } from "../../../contracts/executable-if/validate.mjs";
import { projectExecutableIfEvolution } from "../../../contracts/evolution/project-executable-if.mjs";
import { computeMetricContractChecksum, renderPublicClaimCeiling } from "../../../signals/validate.mjs";
import { deriveCanadaDraft, serializeCanadaDraft } from './draft.mts';

export const root = resolve(import.meta.dirname, "../../..");
export const directory = "forecasts/prospective-pilot/round-10-canada";
export const recordedAt = "2026-09-10T07:09:35Z";
export const sourceId = "source.ilo.canada-reported";
export const sourceUrl = "https://rplumber.ilo.org/data/indicator?id=UNE_DEAP_SEX_AGE_RT_M&ref_area=CAN&source=BA%3A147&sex=SEX_T&classif1=AGE_YTHADULT_YGE15&timefrom=2016&format=.csv&type=both";
export const baselinePath = "forecasts/prospective-pilot/round-10-canada/preregistration-draft.json";
export const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
export const sha256 = (bytes: Uint8Array) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
export const source = (path: string) => {
  const bytes = readFileSync(resolve(root, path));
  return { path, bytes, document: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
};

export function boundedUnemploymentIndex(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new TypeError("Unemployment percent must be in 0 to 100");
  return value / 100;
}

export function buildCanadaBasis() {
  const baseline = source(baselinePath);
  if(!baseline.bytes.equals(Buffer.from(serializeCanadaDraft(deriveCanadaDraft()))))throw new Error('Canadian basis must replay the pinned native source');
  if (baseline.document.reference.value !== "7.302") throw new Error("Frozen August Canadian reference changed");
  const signal: any = {
    signal_id: "signal.canada.unemployment.bounded-rate", definition_version: "1.0.0",
    label: "ILO reported unemployment fraction, Canada, both sexes, age 15+",
    construct: "Reported unemployment rate x transformed to x/100; exposure context, not vacancies or worker opportunity",
    population: "Canadian labour force aged 15 and older, both sexes",
    estimand: "ILO reported unemployment percent x divided by 100",
    aggregation: "One country-sex-age series; no aggregation across countries or age groups",
    projection_policy: "exact-scope-only", source_schema_ref: "https://rplumber.ilo.org/data/indicator?id=UNE_DEAP_SEX_AGE_RT_M&ref_area=CAN&source=BA%3A147&sex=SEX_T&classif1=AGE_YTHADULT_YGE15&timefrom=2016&format=.csv&type=both",
    value_kind: "number", unit: "fraction of Canadian labour force aged 15 and older", value_range: { minimum: 0, maximum: 1 },
  };
  signal.signal_definition_hash = computeSignalDefinitionHash(signal);
  const signalRef = { signal_id: signal.signal_id, definition_version: signal.definition_version,
    signal_definition_hash: signal.signal_definition_hash };
  const scope = { jurisdictions: ["Canada"], geographies: ["Canada"],
    cohorts: ["Both sexes, labour force aged 15 and older"], services: ["Reported unemployment rate, exposure context only"] };
  const definition: any = {
    condition_id: "condition.canada.unemployment.stock", definition_version: "1.0.0", condition_category: "availability",
    proposition: "The reported unemployment rate is at least the frozen August 2026 rate 7.302 percent; this is exposure context only.",
    claim: { who: signal.population, verb: "have", object: "reported unemployment rate at or above 7.302",
      standard: "fraction of Canadian labour force aged 15 and older x/100 is at least 0.07302", polarity: "affirmative",
      period: { starts_at: "2026-08-01T00:00:00Z", ends_at: "2026-10-31T23:59:59Z" } },
    effective_from: recordedAt, scope,
    predicates: { "stock-threshold": { signal_ref: signalRef, operator: "gte",
      threshold: { value: 0.07302, unit: signal.unit },
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
  const event: any = { sequence: 1, event_id: "event.canada.unemployment.stock.added", operation: "added", recorded_at: recordedAt,
    recorded_by: "Ren (AI agent)", reason: "Fix one observed ILO reported unemployment series and its monotone rate threshold before the October outcome.",
    previous_states: [], new_states: [state], introduced_definitions: [definition], identity_change: { kind: "none" },
    authority_effect: "none", action_authorised: false, previous_event_hash: null };
  event.event_hash = computeEventHash(event);
  const observation: any = { observation_id: "observation.canada.unemployment.2026-08", classification: "measured-observation",
    condition_definition_ref: definitionRef, predicate_id: "stock-threshold", signal_ref: signalRef, scope,
    period: { start: "2026-08-01T00:00:00Z", end: "2026-08-31T23:59:59Z" }, recorded_at: recordedAt,
    value: boundedUnemploymentIndex(Number(baseline.document.reference.value)), unit: signal.unit, source_id: sourceId,
    source_artifact_hash: baseline.document.source.body_sha256, source_independence: "not-verified",
    uncertainty: { status: "not-quantified", reason: "Reported LFS microdata-processed estimate; no retained sampling interval, individual inference or income-loss measurement." },
    coverage: { eligible_units: 1, observed_units: 1, missing_units: 0, unit: "preselected country-sex-age series cell, not people" },
    authority_effect: "none", action_authorised: false };
  observation.observation_hash = computeObservationHash(observation);
  const evidenceState = { observation_ref: { observation_id: observation.observation_id, observation_hash: observation.observation_hash },
    state_version: 1, lifecycle: "active" };
  const evidenceEvent: any = { sequence: 1, evidence_event_id: "evidence-event.canada.unemployment.2026-08.added",
    operation: "evidence-added", recorded_at: recordedAt, recorded_by: "Ren (AI agent)",
    reason: "Bind the retained August ILO reported unemployment rate and its bounded transform; receipt covers one series cell, not human outcomes.",
    previous_states: [], new_states: [evidenceState], relation: { kind: "none" },
    authority_effect: "none", action_authorised: false, previous_evidence_event_hash: null };
  evidenceEvent.evidence_event_hash = computeEvidenceEventHash(evidenceEvent);
  const kernel: any = { schema_version: "1.1.0", kernel_id: "kernel.canada.unemployment.prospective",
    classification: "research-draft", empirical_truth_established: false, authority_effect: "none",
    action_authorised: false, publication_approved: false, evaluator: FIXED_EVALUATOR_REF,
    signals: [signal], events: [event], observations: [observation], evidence_events: [evidenceEvent],
    current_evidence_state: [evidenceState], current_state: [state] };
  kernel.manifest_hash = computeManifestHash(kernel);
  const evolution = projectExecutableIfEvolution(kernel, { artifact_path: `${directory}/kernel.json`,
    artifact_sha256: sha256(jsonBytes(kernel)), generated_at: recordedAt });
  const ledgerRef = `urn:mind-flow:evolution:${evolution.ledger_id}`;
  const period = `${definition.claim.period.starts_at} to ${definition.claim.period.ends_at}`;
  const measurementScope = { construct_id: "construct.canada.unemployment.stock", population: signal.population,
    geography: "Canada", statistical_unit: "one reported country unemployment-rate cell",
    period, unit: signal.unit, denominator: "Canadian labour force aged 15 and older; not total population", aggregation_level: signal.aggregation };
  const item: any = { signal_id: signal.signal_id, label: signal.label, status: "shadow",
    construct: { construct_id: measurementScope.construct_id, name: signal.label,
      definition: signal.construct, statistical_unit: measurementScope.statistical_unit },
    estimand: { quantity: signal.estimand, population: signal.population, geography: measurementScope.geography,
      period, unit: signal.unit, denominator: measurementScope.denominator, aggregation_level: signal.aggregation },
    epistemic_class: "derived-estimate", source_refs: [sourceId],
    condition_links: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, evidence_role: "confirming",
      edge_type: "correlated-only", scope: measurementScope }],
    timing: { cadence: "monthly", publication_lag_max_days: null, prospective_decision_lead_min_days: 0,
      revision_behaviour: "Freeze the August input vintage and first eligible retained October release; retain corrections separately. Publisher ingestion lag is unknown; 31 December is an operational resolution cutoff, not a guaranteed lag." },
    uncertainty: { representation: "Unquantified sampling and revision uncertainty", interval_available: false,
      known_limits: ["Unemployment is not total-population income loss, a binding availability diagnosis, agency or AI causation.",
        "Availability is a commissioned research relationship only; no causal or binding income-access category is inferred."] },
    missingness: { mechanism: "A source release or exact series cell may be absent, suppressed or changed.",
      reporting_rule: "Withhold resolution when the exact cell cannot be reconstructed; never impute zero." },
    exclusions: ["cross-series aggregation", "individual inference", "operational use"],
    confounders: ["sampling", "seasonality", "revisions", "classification changes"],
    negative_controls: ["The fixed equal-probability comparator uses the same source eligibility checks."],
    gaming: { risks: ["selecting a favourable vintage or series after observing it"], detection: "Compare frozen code, scope, first-presence receipt and archive hashes.",
      suspension_rule: "Withhold for ambiguous classifications or conflicting first-release bytes." },
    reflexivity: { risk: "An unemployment statistic may be mistaken for binding work availability.", monitor: "Keep the stock, access and agency interpretations distinct." },
    value_of_information: { decision_ref: null, learning_value: "Test whether a prospective reported-statistic claim can be resolved faithfully.",
      next_observation: "First retained October 2026 ILO reported unemployment release for CAN/BA:147/SEX_T/AGE_YTHADULT_YGE15." },
    claim_permissions: { causal_claim: false, individual_inference: false, operational_effect: false },
    executable_binding: { kind: "executable-predicate", signal_definition_ref: signalRef,
      condition_definition_ref: definitionRef, predicate_ids: ["stock-threshold"] } };
  item.metric_contract = { metric_id: "metric.canada.unemployment.bounded-rate", measure: signal.estimand,
    unit: signal.unit, denominator: measurementScope.denominator, population: signal.population,
    geography: measurementScope.geography, period, aggregation: signal.aggregation,
    collection_process_ids: ["process.ilo.canada-reported"], source_refs: [sourceId],
    evaluation_rule: "Transform the exact series percent x to x/100, then compare gte 0.07302. No population-share interpretation." };
  item.metric_contract.metric_checksum = computeMetricContractChecksum(item.metric_contract);
  item.public_claim_ceiling = renderPublicClaimCeiling(item);
  const registry = { schema_version: "1.1.0", registry_id: "registry.canada.unemployment.prospective",
    status: "agent-proposal", authority: "none", operational_effect: false, as_of: recordedAt,
    condition_bindings: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, binding_status: "locally-verified-complete",
      ledger_manifest_hash: evolution.manifest_hash, ledger_tip_event_id: event.event_id, ledger_tip_hash: event.event_hash,
      condition_definition_ref: definitionRef, condition_source_event_ref: { sequence: 1, event_id: event.event_id, event_hash: event.event_hash },
      evidence_state_ref: { kernel_id: kernel.kernel_id, kernel_manifest_hash: kernel.manifest_hash,
        evidence_event_count: 1, evidence_tip_event_id: evidenceEvent.evidence_event_id, evidence_tip_event_hash: evidenceEvent.evidence_event_hash,
        evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state) }, next_binding: null }],
    sources: [{ source_id: sourceId, label: "ILOSTAT reported Canadian LFS", publisher: "International Labour Organization",
      collection_process_id: "process.ilo.canada-reported", depends_on_source_ids: [], evidence_ref: sourceUrl,
      artifact_binding: { status: "acquired-external-bytes", checksum: baseline.document.source.body_sha256,
        byte_length: 37528, retrieved_at: "2026-09-10T06:54:55Z", next_acquisition: null } }],
    signals: [item], portfolios: [{ condition_id: definition.condition_id, ledger_ref: ledgerRef, scope: measurementScope,
      decision_context: { use: "research-only", owner_ref: null, minimum_useful_lead_days: 0 },
      role_assignments: [{ role: "confirming", signal_ids: [signal.signal_id] }],
      unresolved_roles: ["leading", "counter", "outcome", "readiness", "intervention-exposure", "information-harm"].map((role) =>
        ({ role, reason: "This one-series prospective test supplies no independently measured human or intervention outcome.",
          next_acquisition: "Separate scope-compatible evidence is required before expanding the research claim." })), public_disposition: "methods-only" }] };
  return { kernel, registry, evolution };
}
