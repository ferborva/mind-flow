import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { computeConditionDefinitionHash } from '../../../contracts/executable-if/validate.mjs';
import { evaluateStorm, cooccurringCandidates, buildStormReview, nativeMovement, createIncomeConditions, verifyStormBindings } from '../tools/storm-criterion.mts';

const income = JSON.parse(readFileSync(new URL('../income-measurements.v1.json', import.meta.url)));
const hash = 'sha256:' + createHash('sha256').update(readFileSync(new URL('../income-measurements.v1.json', import.meta.url))).digest('hex');
const base = { country: 'AUS', period: { from: 2024, to: 2025 }, disruption: null, binding: null, household: null };
// Deliberately synthetic. These exercise arithmetic, not source admission.
const provenance = { country: 'AUS', period: { from: 2024, to: 2025 }, claim: 'access-to-means-of-generating-income', source_sha256: 'sha256:' + 'a'.repeat(64), source_selector: 'synthetic fixture only', comparable: true };
const share = { ...provenance, construct: 'direct-income-route-disruption-share', unit: 'percent-total-population', before: 1, after: 6 };
const binding = { ...provenance, construct: 'measured-binding-category', before: 'price', after: 'availability' };

test('missing measurements are unknown, never zero or a negative finding', () => {
  const result = evaluateStorm(base);
  assert.equal(result.state, 'cannot-say');
  assert.equal(result.direct_share, null);
  assert.equal(result.household_share, null);
  assert.equal(result.binding_category, null);
});
test('inclusive five-point boundary and three-valued OR, with no invented timing', () => {
  assert.equal(evaluateStorm({ ...base, disruption: share }).state, 'candidate');
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, after: 5.999 } }).state, 'cannot-say');
  assert.equal(evaluateStorm({ ...base, binding }).state, 'candidate');
  assert.equal(evaluateStorm({ ...base, binding: { ...binding, after: 'price' } }).state, 'cannot-say');
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, after: 5 }, binding: { ...binding, after: 'price' } }).state, 'no-candidate');
  const result = evaluateStorm({ ...base, disruption: share, binding });
  assert.equal(result.forecast_skill_established, false);
  assert.equal(result.action_authorised, false);
  assert.deepEqual(result.triggered_arms, ['direct-share', 'binding-category']);
});
test('native denominators, net stocks and non-comparable panels cannot satisfy disruption', () => {
  for (const patch of [{ unit: 'percent-labour-force' }, { construct: 'poverty-stock' }, { comparable: false }, { before: NaN }, { after: 101 }, { source_selector: '' }]) {
    assert.throws(() => evaluateStorm({ ...base, disruption: { ...share, ...patch } }));
  }
  assert.throws(() => evaluateStorm({ ...base, binding: { ...binding, after: 'GDP' } }));
  assert.throws(() => evaluateStorm({ ...base, period: { from: 2025, to: 2024 } }));
  assert.throws(() => evaluateStorm({ ...base, disruption: { ...share, country: 'USA' } }));
  assert.throws(() => evaluateStorm({ ...base, binding: { ...binding, period: { from: 2023, to: 2024 } } }));
});
test('household exposure stays separate and never substitutes for direct disruption', () => {
  const household = { ...provenance, construct: 'dependent-household-exposure-share', unit: 'percent-total-population', before: 3, after: 12, membership: 'dependants-only' };
  const result = evaluateStorm({ ...base, household });
  assert.equal(result.state, 'cannot-say');
  assert.equal(result.household_share.change_pp, 9);
  assert.equal(result.direct_share, null);
  assert.throws(() => evaluateStorm({ ...base, household: { ...household, membership: 'unspecified' } }));
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, before: 9, after: 1 }, binding: { ...binding, after: 'price' } }).state, 'no-candidate');
});
test('co-occurrence uses distinct national results in the same period, never adds shares', () => {
  const a = evaluateStorm({ ...base, disruption: share });
  const b = evaluateStorm({ ...base, country: 'USA', binding: { ...binding, country: 'USA' } });
  const result = cooccurringCandidates([a, b, evaluateStorm({ ...base, country: 'ARG' })]);
  assert.deepEqual(result.countries, ['AUS', 'USA']);
  assert.equal(result.unknown_countries.length, 1);
  assert.equal('affected_share' in result, false);
  assert.throws(() => cooccurringCandidates([a, a]));
  assert.throws(() => cooccurringCandidates([a, { ...b, period: { from: 2023, to: 2024 } }]));
});
test('all three families use existing IF definitions, exact consumer bindings and no automatic evidence conversion', () => {
  const definitions = createIncomeConditions(income, hash);
  assert.equal(definitions.length, 3);
  assert.deepEqual(definitions.map(x => x.definition.condition_category), ['availability', 'availability', 'price']);
  const bindings = definitions.map(x => ({ family_id: x.family_id, definition_hash: x.definition.definition_hash, signal_definition_hash: x.signal.signal_definition_hash }));
  assert.equal(verifyStormBindings(definitions, bindings), true);
  assert.throws(() => verifyStormBindings(definitions, bindings.map((b, i) => i ? b : { ...b, definition_hash: 'sha256:' + 'f'.repeat(64) })), /BINDING/);
  assert.throws(() => verifyStormBindings(definitions, bindings.slice(1)), /BINDING/);
  const forged = structuredClone(definitions), forgedBindings = structuredClone(bindings);
  forged[0].definition.predicates.disrupted.threshold.value = 1;
  forged[0].definition.definition_hash = computeConditionDefinitionHash(forged[0].definition);
  forgedBindings[0].definition_hash = forged[0].definition.definition_hash;
  assert.throws(() => verifyStormBindings(forged, forgedBindings), /BINDING/);
  assert.throws(() => createIncomeConditions({ ...income, families: income.families.map((f,i) => i ? f : { ...f, disruption_measurement: 'measured' }) }, hash));
});
test('twenty-year source-derived review refuses to call proxy crossings storm fires', () => {
  const result = buildStormReview(income, hash);
  assert.equal(result.country_periods.length, 1000);
  assert.equal(result.country_periods.filter(x => x.state === 'cannot-say').length, 1000);
  assert.equal(result.summary.assessable_storm_periods, 0);
  assert.equal(result.summary.storm_fires, null);
  assert.equal(result.summary.false_fires, null);
  assert.equal(result.summary.misses, null);
  assert.equal(result.summary.new_real_evolution_events, 0);
  assert.equal(result.latest.length, 50);
  assert.equal(result.latest.find(x => x.country === 'ARG').missing_series.includes('income-poverty-lineup.v1'), true);
  assert.equal(result.proxy_audit.length, 2980);
});
test('PIP welfare changes and unknown comparability cannot turn into real population movements', () => {
  const f = income.families[2];
  const a = { year: 2024, value: 4, welfare_type: 'income', comparable_spell: 1, survey_comparability: null, estimate_type: 'projection' };
  const b = { ...a, year: 2025, value: 10, welfare_type: 'consumption', estimate_type: 'nowcast' };
  const result = nativeMovement(f, a, b);
  assert.equal(result.native_change_pp, 6);
  assert.equal(result.population_disruption_change_pp, null);
  assert.ok(result.comparability_limits.includes('welfare-type-changed'));
  assert.ok(result.comparability_limits.includes('survey-comparability-unestablished'));
  assert.equal(result.naive_five_point_crossing, true);
  assert.equal(result.is_storm_fire, false);
});

test('storm source replay runs directly in CI, without conditional or failure-tolerant execution', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/integrity.yml', import.meta.url), 'utf8');
  assert.match(workflow, /- name: Reproduce commissioned storm criterion\n        run: node signals\/countries\/tools\/storm-criterion\.mts --check\n/);
});
