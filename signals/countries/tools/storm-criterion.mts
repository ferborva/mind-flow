import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { FIXED_EVALUATOR_REF, computeConditionDefinitionHash, computeSignalDefinitionHash } from '../../../contracts/executable-if/validate.mjs';
import { deriveIncomeMeasurements, serializeIncomeMeasurements } from './income-measurements.mts';

type Row = Record<string, any>;
const sha256 = (bytes: string | Buffer) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^sha256:[a-f0-9]{64}$/;
const categories = ['price', 'permission', 'proximity', 'availability', 'capability'];
const ids = ['income-employment-population.v1', 'income-unemployment.v1', 'income-poverty-lineup.v1'];
const schema = JSON.parse(readFileSync(new URL('../../../contracts/executable-if/schema/executable-if-kernel.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true }); addFormats(ajv); ajv.addSchema(schema);
const validDefinition = ajv.compile({ $ref: `${schema.$id}#/$defs/conditionDefinition` });
const validSignal = ajv.compile({ $ref: `${schema.$id}#/$defs/signalDefinition` });
const proposedAt = '2026-09-10T07:00:00Z'; // Commissioned research epoch, not observation or publication time.

function evidence(value: Row, construct: string) {
  if (value.construct !== construct || value.comparable !== true || !hashPattern.test(value.source_sha256) || !value.source_selector?.trim()) throw new Error('Evidence construct, comparability or source identity absent');
}
function shares(value: Row, construct: string) {
  evidence(value, construct);
  if (value.unit !== 'percent-total-population' || ![value.before, value.after].every(x => Number.isFinite(x) && x >= 0 && x <= 100)) throw new Error('Exact total-population percentage shares required');
  return { before_percent: value.before, after_percent: value.after, change_pp: value.after - value.before, source_sha256: value.source_sha256, source_selector: value.source_selector };
}

// Arithmetic over already scoped/admitted measurements only. Hashes do not
// authenticate a publisher or prove that a claimed construct was measured.
// The retained-data producer below supplies no such measurements this round.
export function evaluateStorm(input: Row) {
  if (!/^[A-Z]{3}$/.test(input.country) || !Number.isInteger(input.period?.from) || !Number.isInteger(input.period?.to) || input.period.from >= input.period.to) throw new Error('Country and ordered annual period required');
  for (const value of [input.disruption, input.binding, input.household].filter(x => x != null)) {
    if (value.country !== input.country || !same(value.period, input.period) || value.claim !== 'access-to-means-of-generating-income') throw new Error('Evidence scope does not match the income-access claim, country and comparison period');
  }
  const direct = input.disruption == null ? null : shares(input.disruption, 'direct-income-route-disruption-share');
  const household = input.household == null ? null : shares(input.household, 'dependent-household-exposure-share');
  if (household && !['dependants-only', 'inclusive-household-exposure'].includes(input.household.membership)) throw new Error('Household membership and overlap reading required');
  if (input.binding != null) {
    evidence(input.binding, 'measured-binding-category');
    if (![input.binding.before, input.binding.after].every(x => categories.includes(x))) throw new Error('Unknown binding category');
  }
  const directTruth = direct ? direct.change_pp >= 5 : null;
  const bindingTruth = input.binding == null ? null : input.binding.before !== input.binding.after;
  const state = directTruth === true || bindingTruth === true ? 'candidate' : directTruth === false && bindingTruth === false ? 'no-candidate' : 'cannot-say';
  return { country: input.country, period: structuredClone(input.period), state,
    triggered_arms: [directTruth === true ? 'direct-share' : null, bindingTruth === true ? 'binding-category' : null].filter(Boolean),
    direct_share: direct, household_share: household ? { ...household, membership: input.household.membership, added_to_direct: false } : null,
    binding_category: input.binding?.after ?? null, previous_binding_category: input.binding?.before ?? null,
    missing_evidence: [direct === null ? 'Comparable direct income-route disruption shares of total population' : null, input.binding == null ? 'Measured before/after binding category for the same income-access claim and population' : null, household === null ? 'Person-linked household exposure mapping with overlap specified' : null].filter(Boolean),
    direction_assumption: 'Increased direct disruption only; beneficial-shift treatment remains Fernando\'s decision',
    forecast_skill_established: false, authority_effect: 'none', action_authorised: false };
}

export function cooccurringCandidates(results: Row[]) {
  if (!results.length || new Set(results.map(x => x.country)).size !== results.length || results.some(x => !same(x.period, results[0].period) || !['candidate', 'no-candidate', 'cannot-say'].includes(x.state))) throw new Error('Distinct countries and identical periods required');
  return { period: results[0].period, countries: results.filter(x => x.state === 'candidate').map(x => x.country).sort(), unknown_countries: results.filter(x => x.state === 'cannot-say').map(x => x.country).sort(), interpretation: 'Co-occurrence only; no summed shares, shared cause, contagion or global coverage inferred' };
}

export function createIncomeConditions(income: Row, measurementHash: string) {
  if (!hashPattern.test(measurementHash) || !same(income.families?.map((f: Row) => f.id), ids)) throw new Error('Exact commissioned income family set required');
  return income.families.map((family: Row) => {
    if (family.disruption_measurement !== 'not-measured' || family.household_mapping !== 'not-available' || !family.coverage.eligible || family.coverage.coverage_by_year.some((r: Row) => r.count < 40)) throw new Error('Native context cannot be promoted to disruption evidence or admit sub-forty breadth');
    const source = income.receipts.find((r: Row) => r.url && r.id === family.source_id) ?? income.receipts.find((r: Row) => r.body_sha256 && r.url?.includes(family.source_id === 'pip-lineup' ? '/pip/v1/pip?' : family.native + '_A'));
    // Existing IF signal/condition schema, unmeasured propositions. The native
    // series is context, not an observation satisfying this signal definition.
    const signal: Row = { signal_id: `signal.storm.${family.id}`, definition_version: '1.0.0', label: `Unmeasured disruption proposition investigated alongside ${family.label}`, construct: 'Change in direct income-route disruption share, not a native stock difference', population: 'Total population of one retained economy in one explicitly scoped annual comparison', estimand: `Percentage-point increase in directly disrupted people. Native context denominator: ${family.denominator}. ${family.limitation}`, aggregation: `No native-series conversion admitted. Additional comparable person-level route-disruption evidence is required. Native context ${family.vintage}; measurement bytes ${measurementHash}.`, projection_policy: 'exact-scope-only', source_schema_ref: `signals/countries/income-measurements.v1.json#${measurementHash}`, value_kind: 'number', unit: 'percentage-point-total-population', value_range: { minimum: -100, maximum: 100 }, signal_definition_hash: '' };
    signal.signal_definition_hash = computeSignalDefinitionHash(signal);
    const definition: Row = { condition_id: `condition.storm.${family.id}`, condition_category: family.condition_category, definition_version: '1.0.0', proposition: 'Direct disruption increased by at least five percentage points of total population; native context alone cannot establish this.', claim: { who: 'A single scoped economy and its total population', verb: 'experience', object: 'increased disruption of access to means of generating income', standard: 'At least five percentage points of total population, from comparable direct measurements', polarity: 'affirmative', period: { starts_at: proposedAt, ends_at: '2027-09-10T07:00:00Z' } }, effective_from: proposedAt, scope: { jurisdictions: ['Retained IMF top-50 economy, separately scoped'], geographies: ['National, no cross-country projection'], cohorts: ['Total population, not only working-age population or labour force'], services: ['Access to means of generating income'] }, predicates: { disrupted: { signal_ref: { signal_id: signal.signal_id, definition_version: signal.definition_version, signal_definition_hash: signal.signal_definition_hash }, operator: 'gte', threshold: { value: 5, unit: signal.unit }, window: { lookback_days: 366, minimum_observations: 1, persistence: 1, maximum_age_days: 366 }, source_policy: { minimum_distinct_source_ids: 1, minimum_distinct_artifact_hashes: 1, minimum_coverage_ratio: 1, agreement: 'unanimous-per-period' }, missing_result: 'unknown', stale_result: 'stale', conflict_result: 'conflicted' } }, truth_expression: { predicate_ref: 'disrupted' }, evaluator_ref: FIXED_EVALUATOR_REF, classification: 'research-draft', empirical_truth_established: false, authority_effect: 'none', action_authorised: false, definition_hash: '' };
    definition.definition_hash = computeConditionDefinitionHash(definition);
    if (!validSignal(signal) || !validDefinition(definition)) throw new Error(`Existing IF schema rejected proposal: ${JSON.stringify(validSignal.errors ?? validDefinition.errors)}`);
    return { family_id: family.id, provenance: 'commissioned-proposal', relationship: family.relationship, source_context_only: true, observations_admitted: 0, source_receipt: source ?? null, measurement_sha256: measurementHash, signal, definition };
  });
}

export function verifyStormBindings(definitions: Row[], bindings: Row[]) {
  const reproduced = deriveIncomeMeasurements();
  const expected = createIncomeConditions(reproduced, sha256(serializeIncomeMeasurements(reproduced)));
  if (!same(definitions, expected)) throw new Error('CONSUMER_DEFINITION_BINDING_MISMATCH: commissioned meaning or retained context changed');
  if (!same(definitions.map(x => x.family_id), ids) || bindings.length !== definitions.length) throw new Error('CONSUMER_DEFINITION_BINDING_MISMATCH');
  for (const entry of definitions) {
    const matches = bindings.filter(x => x.family_id === entry.family_id);
    if (matches.length !== 1 || !validSignal(entry.signal) || !validDefinition(entry.definition) || entry.definition.definition_hash !== computeConditionDefinitionHash(entry.definition) || entry.signal.signal_definition_hash !== computeSignalDefinitionHash(entry.signal) || entry.definition.predicates.disrupted.signal_ref.signal_definition_hash !== entry.signal.signal_definition_hash || matches[0].definition_hash !== entry.definition.definition_hash || matches[0].signal_definition_hash !== entry.signal.signal_definition_hash) throw new Error('CONSUMER_DEFINITION_BINDING_MISMATCH');
  }
  return true;
}

export function nativeMovement(family: Row, before: Row, after: Row) {
  if (after.year !== before.year + 1 || ![before.value, after.value].every(Number.isFinite)) throw new Error('Consecutive finite native observations required');
  const limits = ['native-stock-not-direct-route-disruption', 'gross-flows-and-household-mapping-absent'];
  if (family.id === ids[2]) {
    if (before.welfare_type !== after.welfare_type) limits.push('welfare-type-changed');
    if (before.comparable_spell !== after.comparable_spell) limits.push('comparable-spell-changed');
    if (before.survey_comparability !== true || after.survey_comparability !== true) limits.push('survey-comparability-unestablished');
    limits.push('publisher-lineup-not-independent-surveys');
  } else limits.push('publisher-modelled-vintage', 'denominator-not-total-population');
  const change = after.value - before.value;
  const adverse = family.id === ids[0] ? -change : change;
  return { native_change_pp: change, naive_five_point_crossing: adverse >= 5, population_disruption_change_pp: null, is_storm_fire: false, comparability_limits: limits };
}

export function buildStormReview(income: Row, measurementHash: string) {
  const countryBytes = readFileSync(new URL('../country-set.v1.json', import.meta.url));
  const countries = JSON.parse(countryBytes.toString()).countries;
  if (income.country_set_sha256 !== sha256(countryBytes) || income.history.baseline_year !== 2005 || income.history.last_year !== 2025) throw new Error('Reviewed frame and twenty transitions required');
  const definitions = createIncomeConditions(income, measurementHash);
  const bindings = definitions.map((x: Row) => ({ family_id: x.family_id, definition_hash: x.definition.definition_hash, signal_definition_hash: x.signal.signal_definition_hash }));
  verifyStormBindings(definitions, bindings);
  const countryPeriods: Row[] = [], proxyAudit: Row[] = [];
  for (const country of countries) for (let year = 2006; year <= 2025; year++) {
    const missing: string[] = [], context: Row[] = [];
    for (const family of income.families) {
      const rows = family.observations.filter((r: Row) => r.iso3 === country.iso3 && [year - 1, year].includes(r.year));
      const before = rows.find((r: Row) => r.year === year - 1), after = rows.find((r: Row) => r.year === year);
      if (rows.length !== 2 || !before || !after) { missing.push(family.id); continue; }
      const movement = nativeMovement(family, before, after);
      context.push({ family_id: family.id, year, value: after.value, before_value: before.value, estimate_type: after.estimate_type, denominator: family.denominator, source_selector: after.source_selector, native_change_pp: movement.native_change_pp });
      proxyAudit.push({ family_id: family.id, country: country.iso3, year, ...movement });
    }
    countryPeriods.push({ ...evaluateStorm({ country: country.iso3, period: { from: year - 1, to: year }, disruption: null, binding: null, household: null }), missing_series: missing, native_context: context });
  }
  return { id: 'storm-review.v1', provenance: 'commissioned-proposal', author: 'Ren', measurement_sha256: measurementHash, country_set_sha256: income.country_set_sha256, definitions, consumer: { id: 'storm-criterion.v1', bindings, native_to_disruption_conversion: 'none' }, summary: { country_periods: countryPeriods.length, assessable_storm_periods: 0, storm_fires: null, misses: null, false_fires: null, new_real_evolution_events: 0, programme_real_evolution_events: 1, interpretation: 'No assessable periods, not zero storms. Native counterexample crossings cannot validate the criterion or establish skill.' }, country_periods: countryPeriods, latest: countryPeriods.filter(x => x.period.to === 2025), proxy_audit: proxyAudit };
}

export function loadStormReview() {
  const retained = readFileSync(new URL('../income-measurements.v1.json', import.meta.url), 'utf8');
  if (retained !== serializeIncomeMeasurements(deriveIncomeMeasurements())) throw new Error('Income source replay differs before storm consumption');
  return buildStormReview(JSON.parse(retained), sha256(retained));
}
export function serializeStormReview(review: Row) {
  // Compact mechanically generated rows, keeping definitions and metadata readable.
  const { country_periods, latest, proxy_audit, ...metadata } = review;
  return JSON.stringify(metadata, null, 2).slice(0, -2) + ',\n' +
    [ ['country_periods', country_periods], ['latest', latest], ['proxy_audit', proxy_audit] ]
      .map(([key, rows]) => `  "${key}": [\n${(rows as Row[]).map(row => '    ' + JSON.stringify(row)).join(',\n')}\n  ]`).join(',\n') + '\n}\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || !['--check', '--write'].includes(process.argv[2])) throw new Error('Provide exactly --check or --write (new output only)');
    const output = serializeStormReview(loadStormReview());
    const path = new URL('../storm-review.v1.json', import.meta.url);
    if (process.argv[2] === '--write') writeFileSync(path, output, { flag: 'wx' });
    else if (readFileSync(path, 'utf8') !== output) throw new Error('Storm review reproduction mismatch');
    console.log('Storm review replayed: native context retained; direct disruption and binding change unmeasured');
  } catch (error) { throw new Error('Storm review failed; no inference may replace missing evidence', { cause: error }); }
}
