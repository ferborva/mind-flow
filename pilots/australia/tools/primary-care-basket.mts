import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMeasurements, verifyCapture, digest } from './primary-care.mts';
import { FIXED_EVALUATOR_REF, computeSignalDefinitionHash, computeConditionDefinitionHash, computeEventHash, computeManifestHash, computeObservationHash, computeEvidenceEventHash, validateExecutableIfKernel } from '../../../contracts/executable-if/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const recordedAt = '2026-09-09T11:10:06Z';
const normalisedAt = '2026-09-09T11:10:20Z';
const hashPlaceholder = 'sha256:' + '0'.repeat(64);
const ref = (d: any) => ({ condition_id: d.condition_id, definition_version: d.definition_version, definition_hash: d.definition_hash });
const state = (d: any, state_version: number, lifecycle = 'active') => ({ condition_id: d.condition_id, state_version, condition_definition_ref: ref(d), lifecycle });

export function buildBasket() {
  const measured = deriveMeasurements();
  const capture = verifyCapture();
  const used = ['gp-cost-delay', 'gp-urgent-under-four-hours', 'gp-fte-remoteness', 'health-system-navigation-difficulty', 'telehealth-relationship-lookback', 'prescription-cost-delay', 'specialist-gap', 'after-hours-delay'];
  const signals = measured.series.filter(s => used.includes(s.id)).map(s => {
    const value: any = { signal_id: `signal.au.${s.id}`, definition_version: '1.0.0', label: s.id, construct: s.measurement_role, population: s.population, estimand: s.evidence_ceiling, aggregation: 'Exact publisher series and geography only; no cross-person or cross-service projection', projection_policy: 'exact-scope-only', source_schema_ref: s.source_url, value_kind: 'number', unit: s.points[0].unit, signal_definition_hash: hashPlaceholder };
    if (value.unit !== 'percent') value.value_range = { minimum: 0 };
    value.signal_definition_hash = computeSignalDefinitionHash(value); return value;
  });
  const byId = new Map(signals.map(s => [s.signal_id.replace('signal.au.', ''), s]));
  const scope = (geographies: string[], cohorts: string[], services: string[]) => ({ jurisdictions: ['Australia'], geographies, cohorts, services });
  const definitions: any[] = [], events: any[] = [];
  const eventTime = () => new Date(Date.parse(recordedAt) + events.length * 1000).toISOString().replace('.000Z', 'Z');
  const current = new Map<string, any>();
  function definition(id: string, signalId: string, category: string, definitionScope: any, version = '1.0.0', windowDays = 90) {
    const signal = byId.get(signalId)!;
    const value: any = { condition_id: id, definition_version: version, condition_category: category, proposition: `The registered ${signalId} condition satisfies its explicit research threshold within the registered scope.`, claim: { who: 'The exact population named by the bound signal', verb: 'satisfy', object: `the ${signalId} research condition`, standard: 'Registered threshold only; not personal service access', polarity: 'affirmative', period: { starts_at: recordedAt, ends_at: '2027-09-09T10:43:00Z' } }, effective_from: recordedAt, scope: definitionScope, predicates: { measure: { signal_ref: { signal_id: signal.signal_id, definition_version: signal.definition_version, signal_definition_hash: signal.signal_definition_hash }, operator: signalId === 'gp-urgent-under-four-hours' ? 'gte' : 'lte', threshold: { value: signalId === 'gp-urgent-under-four-hours' ? 100 : 0, unit: signal.unit }, window: { lookback_days: windowDays, minimum_observations: 1, persistence: 1, maximum_age_days: windowDays }, source_policy: { minimum_distinct_source_ids: 1, minimum_distinct_artifact_hashes: 1, minimum_coverage_ratio: 1, agreement: 'unanimous-per-period' }, missing_result: 'unknown', stale_result: 'stale', conflict_result: 'conflicted' } }, truth_expression: { predicate_ref: 'measure' }, evaluator_ref: FIXED_EVALUATOR_REF, classification: 'research-draft', empirical_truth_established: false, authority_effect: 'none', action_authorised: false, definition_hash: hashPlaceholder };
    value.effective_from = eventTime();
    value.claim.period.starts_at = '2018-01-01T00:00:00Z';
    if (signalId === 'gp-fte-remoteness') value.predicates.measure.operator = 'gt';
    value.definition_hash = computeConditionDefinitionHash(value); definitions.push(value); return value;
  }
  function event(operation: string, previous: any[], next: any[], introduced: any[], reason: string, identity_change: any = { kind: 'none' }) {
    const value: any = { sequence: events.length + 1, event_id: `event.au.primary-care.${events.length + 1}`, operation, recorded_at: recordedAt, recorded_by: 'Ren (AI agent)', reason, previous_states: previous, new_states: next, introduced_definitions: introduced, identity_change, authority_effect: 'none', action_authorised: false, previous_event_hash: events.at(-1)?.event_hash ?? null, event_hash: hashPlaceholder };
    value.recorded_at = eventTime();
    value.event_hash = computeEventHash(value); events.push(value); for (const s of next) current.set(s.condition_id, s); return value;
  }
  const add = (d: any, reason: string) => event('added', [], [state(d, 1)], [d], reason);
  const adult = 'Survey-scope residents aged 15 years and over';
  const costBroad = definition('condition.au.gp.cost', 'gp-cost-delay', 'price', scope(['NSW'], [adult, 'Children under 15 years'], ['GP consultation']));
  add(costBroad, 'Initial explicitly unmeasured scope candidate before applying ABS survey coverage. No evaluation or access claim issued.');
  const costNarrow = definition(costBroad.condition_id, 'gp-cost-delay', 'price', scope(['NSW'], [adult], ['GP consultation']), '1.1.0');
  event('narrowed', [state(costBroad, 1)], [state(costNarrow, 2)], [costNarrow], 'Retained ABS Patient Experiences scope excludes under-15s. The proposed child coverage is removed, invalidating any consumer bound to the broader definition. Source: abs-patient-experiences.');
  const costAnnual = definition(costBroad.condition_id, 'gp-cost-delay', 'price', costNarrow.scope, '1.2.0', 366);
  event('definition-revised', [state(costNarrow, 2)], [state(costAnnual, 3)], [costAnnual], 'RoGS table10A.26 supplies annual rather than monthly observations. Change prospective observation window from90 to366 days; keep zero cost-barrier threshold and exact signal. Historic2024-25 observations still cannot be projected into a newly registered period.');
  const permissionBroad = definition('condition.au.gp.telehealth-context', 'telehealth-relationship-lookback', 'permission', scope(['Australia'], ['MBS telehealth rule'], ['Routine GP telehealth', 'Urgent unsociable-hours GP telehealth']));
  add(permissionBroad, 'Initial service grouping for inspecting the official MBS relationship rule; not an assertion that all services share identical eligibility.');
  const routine = definition('condition.au.gp.telehealth-routine', 'telehealth-relationship-lookback', 'permission', scope(['Australia'], ['MBS telehealth rule'], ['Routine GP telehealth']));
  const urgent = definition('condition.au.gp.telehealth-urgent', 'telehealth-relationship-lookback', 'permission', scope(['Australia'], ['MBS telehealth rule'], ['Urgent unsociable-hours GP telehealth']));
  event('split', [state(permissionBroad, 1)], [state(permissionBroad, 2, 'superseded'), state(routine, 1), state(urgent, 1)], [routine, urgent], 'MBS AN.1.1 explicitly exempts urgent unsociable-hours services from the eligible-practitioner requirement. Split the service scope; routine twelve-month observations cannot satisfy the urgent child. The MyMedicare alternative and all exemptions remain in retained source. The split preserves predicate semantics and makes the missing urgent-pathway observation visible.', { kind: 'split', from_condition_ids: [permissionBroad.condition_id], to_condition_ids: [routine.condition_id, urgent.condition_id] });
  const specs = [
    ['condition.au.gp.timely', 'gp-urgent-under-four-hours', 'availability', scope(['NSW'], [adult], ['GP urgent consultation'])],
    ['condition.au.gp.spatial-context', 'gp-fte-remoteness', 'proximity', scope(['NSW remoteness strata'], ['Resident population supply context'], ['GP spatial supply'])],
    ['condition.au.gp.navigation-context', 'health-system-navigation-difficulty', 'capability', scope(['Australia'], ['Adults represented in2018 Health Literacy Survey'], ['Health-system navigation'])],
    ['condition.au.prescription.cost', 'prescription-cost-delay', 'price', scope(['NSW'], [adult], ['Prescription medicines, aggregate context'])],
    ['condition.au.specialist.cost', 'specialist-gap', 'price', scope(['NSW'], ['Patient-billed specialist attendances'], ['Specialist referral pathway, aggregate context'])],
    ['condition.au.after-hours.delay', 'after-hours-delay', 'availability', scope(['Australia'], [adult], ['After-hours GP consultation'])],
  ];
  for (const [id, signal, category, scoped] of specs) add(definition(id as string, signal as string, category as string, scoped), 'Retained primary-care series defines a bounded research condition; source role and population remain explicit in the basket. No current personal access inferred.');
  const kernel: any = { schema_version: '1.1.0', kernel_id: 'kernel.au.primary-care', classification: 'research-draft', empirical_truth_established: false, authority_effect: 'none', action_authorised: false, publication_approved: false, evaluator: FIXED_EVALUATOR_REF, signals, events, observations: [], evidence_events: [], current_evidence_state: [], current_state: [...current.values()], manifest_hash: hashPlaceholder };
  for (const currentState of current.values()) {
    if (currentState.lifecycle !== 'active' || currentState.condition_id === urgent.condition_id) continue;
    const d = definitions.find(d => d.definition_hash === currentState.condition_definition_ref.definition_hash);
    const series = measured.series.find(s => `signal.au.${s.id}` === d.predicates.measure.signal_ref.signal_id)!;
    const geography = series.points.some((p: any) => p.geography === 'NSW') ? 'NSW' : 'Aust';
    const p = series.points.find((p: any) => p.geography === geography && (series.id !== 'gp-fte-remoteness' || p.remoteness === 'Outer regional'));
    if (!p) throw new Error(`No same-scope point: ${series.id}`);
    if (series.id === 'gp-fte-remoteness') continue; // Multi-stratum context is not an exact single-stratum scope.
    const annual = p.period.match(/^(\d{4})-(\d{2})$/);
    const period = annual ? { start: `${annual[1]}-07-01T00:00:00Z`, end: `${Number(annual[1]) + 1}-06-30T23:59:59Z` } : p.period === '2018' ? { start: '2018-01-01T00:00:00Z', end: '2018-08-31T23:59:59Z' } : { start: '2026-09-09T10:40:00Z', end: '2026-09-09T10:40:00Z' };
    if (series.id === 'telehealth-relationship-lookback') {
      const instant = new Date(capture.artifacts.find((a: any) => a.id === series.source_id).http_date).toISOString().replace('.000Z', 'Z');
      period.start = instant; period.end = instant;
    }
    const observation: any = { observation_id: `observation.au.${series.id}`, classification: 'measured-observation', condition_definition_ref: ref(d), predicate_id: 'measure', signal_ref: d.predicates.measure.signal_ref, scope: d.scope, period, recorded_at: '2026-09-09T10:49:00Z', value: p.value, unit: p.unit, source_id: `source.${series.source_id}`, source_artifact_hash: series.source_artifact_hash, source_independence: 'not-verified', uncertainty: { status: 'not-quantified', reason: `The kernel has no interval type; published95%CI half-width is ${p.published_95ci_half_width ?? 'not supplied'} in the external measurement artifact. Sampling and non-sampling error are not jointly quantified.` }, coverage: { eligible_units: 1, observed_units: 1, missing_units: 0, unit: 'Selected publisher series cell, not people or survey response coverage' }, authority_effect: 'none', action_authorised: false, observation_hash: hashPlaceholder };
    observation.recorded_at = normalisedAt;
    observation.observation_hash = computeObservationHash(observation); kernel.observations.push(observation);
    const evidenceState = { observation_ref: { observation_id: observation.observation_id, observation_hash: observation.observation_hash }, state_version: 1, lifecycle: 'active' };
    const evidenceEvent: any = { sequence: kernel.evidence_events.length + 1, evidence_event_id: `evidence.au.primary-care.${kernel.evidence_events.length + 1}`, operation: 'evidence-added', recorded_at: new Date(Date.parse('2026-09-09T10:49:00Z') + kernel.evidence_events.length * 1000).toISOString().replace('.000Z', 'Z'), recorded_by: 'Ren (AI agent)', reason: `Normalise retained ${series.source_id} cell without changing its historical reference period.`, previous_states: [], new_states: [evidenceState], relation: { kind: 'none' }, authority_effect: 'none', action_authorised: false, previous_evidence_event_hash: kernel.evidence_events.at(-1)?.evidence_event_hash ?? null, evidence_event_hash: hashPlaceholder };
    evidenceEvent.recorded_at = new Date(Date.parse(normalisedAt) + kernel.evidence_events.length * 1000).toISOString().replace('.000Z', 'Z');
    evidenceEvent.evidence_event_hash = computeEvidenceEventHash(evidenceEvent); kernel.evidence_events.push(evidenceEvent); kernel.current_evidence_state.push(evidenceState);
  }
  kernel.kernel_id = 'kernel.au.primary-care.r2';
  kernel.manifest_hash = computeManifestHash(kernel);
  const valid = validateExecutableIfKernel(kernel); if (!valid.machine_valid) throw new Error(JSON.stringify(valid.errors));
  const bind = (id: string) => { const d = definitions.find(d => d.definition_hash === current.get(id)?.condition_definition_ref.definition_hash); const s = measured.series.find(s => `signal.au.${s.id}` === d.predicates.measure.signal_ref.signal_id)!; return { condition_category: d.condition_category, condition_definition_ref: ref(d), series_id: s.id, owner: s.owner, population: s.population, measurement_role: s.measurement_role, evidence_ceiling: s.evidence_ceiling }; };
  const basket = { id: 'australia-primary-care.v1', recorded_at: recordedAt, country: 'Australia', status: 'research-draft', provenance: 'commissioned-proposal', kernel_path: 'pilots/australia/basket/primary-care.kernel.json', kernel_manifest_hash: kernel.manifest_hash, selection_rationale: 'One GP contact, one common medicine pathway, one specialist referral and one after-hours alternative make the access promise concrete. Aggregate context is never presented as item-specific attainment.', items: [
    { id: 'gp-consultation', label: 'GP consultation, including a separately scoped routine telehealth pathway', conditions: ['condition.au.gp.cost', routine.condition_id, 'condition.au.gp.spatial-context', 'condition.au.gp.timely', 'condition.au.gp.navigation-context'].map(bind) },
    { id: 'atorvastatin-prescription', label: 'Prescription and community-pharmacy dispensing of atorvastatin where clinically prescribed', selection_source: 'aihw-medicines', conditions: [bind('condition.au.prescription.cost')], missing_item_specific_categories: ['price', 'permission', 'proximity', 'availability', 'capability'], note: 'Atorvastatin is identified among the most-prescribed medicines by AIHW. The retained cost-delay series covers all prescribed medicines, not this drug; no dose or clinical recommendation.' },
    { id: 'specialist-referral', label: 'GP referral followed by a Medicare specialist consultation', permission_source: 'mbs-referrals', conditions: [bind('condition.au.specialist.cost')], missing_item_specific_categories: ['permission', 'proximity', 'availability', 'capability'], note: 'Retained referral rule explains the default12-month period and exceptions. No specialist-specific availability or completed-referral series established.' },
    { id: 'after-hours-gp', label: 'After-hours GP consultation, with urgent unsociable-hours telehealth distinguished', conditions: [bind('condition.au.after-hours.delay'), bind(urgent.condition_id)], missing_item_specific_categories: ['price', 'proximity', 'capability'], note: 'ABS all-after-hours series is broader than the urgent unsociable-hours MBS exception. They cannot be treated as the same cohort.' },
  ], evolution_ceiling: 'These are source-driven research definition changes recorded together during construction, not a fabricated historical operational deployment. Existing consumers bound to prior definitions become incompatible. No observations are backdated to predate registration.', empirical_execution_blocker: 'The current evaluator requires observation period start at or after definition effective_from. Retained2024-25 and2018 periods precede this new registration. No empirical observations inserted under false dates; unknown stays unknown.', threshold_rationale: 'Zero cost-related obstruction and universal timely coverage operationalise the example promise as contestable research thresholds. Zero GP FTE is a diagnostic failure sentinel for spatial context, not a target for adequate access; that contextual definition must not be read as a personal access predicate.', gates: measured.gates };
  basket.empirical_execution_blocker = 'Historical measured periods are accepted by the repaired existing evaluator. Freshness windows are unchanged; annual2024-25 and2018 inputs are stale. Context-only spatial strata and unmatched urgent telehealth observations remain absent. Rule parameters are not personal eligibility.';
  basket.threshold_rationale = 'Zero cost-related obstruction and universal timely coverage operationalise the example promise as contestable research thresholds. Positive GP FTE tests only whether any measured supply exists, not whether it is adequate. A zero-month relationship threshold tests absence of that rule parameter, not complete eligibility.';
  basket.id = 'australia-primary-care.r2';
  basket.kernel_path = 'pilots/australia/basket/primary-care.kernel.r2.json';
  const specialist = basket.items.find(item => item.id === 'specialist-referral')!;
  specialist.missing_item_specific_categories = ['price', 'permission', 'proximity', 'availability', 'capability'];
  Object.assign(basket, {
    construction_revision: {
      supersedes_path: 'pilots/australia/basket/primary-care.v1.json',
      supersedes_sha256: digest(readFileSync(resolve(root, 'pilots/australia/basket/primary-care.v1.json'))),
      reason: 'Independent review found arbitrary finite numeric maxima and a missing specialist item-specific price ceiling. Replace maxima with principled nonnegative one-sided domains and expose that missing category. Reconstruct this research kernel against the corrected evaluator; original artifacts and all source observations remain retained unchanged. This is not an operational condition-history continuation.',
      source_values_changed: false,
      historical_observation_periods_changed: false,
    },
    numeric_domain_rationale: 'Months of required lookback, GP FTE intensity and nonnegative patient-paid gaps cannot be negative under these definitions. No finite natural upper bound is established. Domains therefore declare minimum zero and omit maximum; ratio and percent retain intrinsic bounds. These are definition domains, not observed sample extrema.',
    coverage_ceiling: 'Coverage1/1 counts a selected published series cell only. It establishes neither survey representativeness, response coverage nor coverage of individual access conditions.',
  });
  return { kernel, basket };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const { kernel, basket } = buildBasket(); for (const [name, value] of [['primary-care.kernel.r2.json', kernel], ['primary-care.r2.json', basket]]) { const path = resolve(root, 'pilots/australia/basket', name as string); const bytes = JSON.stringify(value, null, 2) + '\n'; if (process.argv.includes('--check')) { if (readFileSync(path, 'utf8') !== bytes) throw new Error(`Basket drift: ${name}`); } else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); } } console.log('Primary-care basket construction revision2 reproduced; original retained'); } catch (error) { console.error(error); process.exitCode = 1; }
}
