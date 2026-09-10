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
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, before: 9, after: 1 }, binding: { ...binding, after: 'price' } }).state, 'cannot-say');
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
  for (const entry of definitions) {
    assert.equal(entry.definition.predicates.disrupted.threshold.value, 5);
    assert.equal(entry.definition.proposition, 'Direct disruption increased by at least five percentage points of total population; native context alone cannot establish this.');
  }
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
  assert.equal('new_real_evolution_events' in result.summary, false);
  assert.equal('programme_real_evolution_events' in result.summary, false);
  assert.equal(result.latest.length, 50);
  assert.equal(result.latest.find(x => x.country === 'ARG').missing_series.includes('income-poverty-lineup.v1'), true);
  assert.equal(result.proxy_audit.length, 2980);
});

test('the checked-in storm review has exact commissioned consumer bindings', () => {
  const review = JSON.parse(readFileSync(new URL('../storm-review.v1.json', import.meta.url)));
  assert.equal(verifyStormBindings(review.definitions, review.consumer.bindings), true);
  for (const value of [1, 2, 4.999, 6]) {
    const changed = structuredClone(review);
    changed.definitions[0].definition.predicates.disrupted.threshold.value = value;
    changed.definitions[0].definition.definition_hash = computeConditionDefinitionHash(changed.definitions[0].definition);
    changed.consumer.bindings[0].definition_hash = changed.definitions[0].definition.definition_hash;
    assert.throws(() => verifyStormBindings(changed.definitions, changed.consumer.bindings), /BINDING/);
  }
  const stale = structuredClone(review);
  stale.consumer.bindings[0].definition_hash = 'sha256:' + 'f'.repeat(64);
  assert.throws(() => verifyStormBindings(stale.definitions, stale.consumer.bindings), /BINDING/);
});

test('measurement bytes and source vintage belong to context, not placeholder IF identity', () => {
  const original = createIncomeConditions(income, hash);
  const changed = createIncomeConditions({ ...income, families: income.families.map(f => ({ ...f, vintage: 'hypothetical later vintage' })) }, 'sha256:' + 'b'.repeat(64));
  for (let i = 0; i < original.length; i++) {
    assert.deepEqual(changed[i].signal, original[i].signal);
    assert.deepEqual(changed[i].definition, original[i].definition);
    assert.notEqual(changed[i].measurement_sha256, original[i].measurement_sha256);
    assert.notEqual(changed[i].source_vintage, original[i].source_vintage);
  }
});

test('six-decimal percentage arithmetic keeps every exact two-decimal five-point boundary inclusive', () => {
  for (let hundredths = 0; hundredths <= 9500; hundredths++) {
    const result = evaluateStorm({ ...base, disruption: { ...share, before: hundredths / 100, after: (hundredths + 500) / 100 } });
    assert.equal(result.direct_share.change_pp, 5, `boundary at ${hundredths / 100}`);
    assert.equal(result.state, 'candidate');
    assert.equal(result.direct_share.arithmetic_decimal_places, 6);
  }
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, before: 3.04, after: 8.039999 } }).state, 'cannot-say');
});

test('beneficial five-point shifts leave the direct arm unassessed without vetoing binding evidence', () => {
  for (const [before, after] of [[10, 5], [10, 1], [8.04, 3.04]]) {
    const disruption = { ...share, before, after };
    const unresolved = evaluateStorm({ ...base, disruption, binding: { ...binding, after: binding.before } });
    assert.equal(unresolved.beneficial_shift_unassessed, true);
    assert.equal(unresolved.state, 'cannot-say');
    const bindingCandidate = evaluateStorm({ ...base, disruption, binding });
    assert.equal(bindingCandidate.state, 'candidate');
    assert.deepEqual(bindingCandidate.triggered_arms, ['binding-category']);
  }
  assert.equal(evaluateStorm({ ...base, disruption: { ...share, before: 5, after: 1 }, binding: { ...binding, after: binding.before } }).state, 'no-candidate');
});

test('period length stays caller-defined and tied binding categories fail with a precise message', () => {
  const period = { from: 2024, to: 2026 };
  assert.equal(evaluateStorm({ ...base, period, disruption: { ...share, period } }).state, 'candidate');
  for (const field of ['before', 'after']) assert.throws(() => evaluateStorm({ ...base, binding: { ...binding, [field]: ['price', 'availability'] } }), /Tied or multiple binding categories are not representable in v1/);
});

test('native beneficial movements stay visible without being admitted as storms', () => {
  const review = buildStormReview(income, hash);
  const beneficial = review.proxy_audit.filter(r => r.naive_five_point_beneficial_movement);
  assert.equal(beneficial.length, 11);
  assert.deepEqual(beneficial.filter(r => r.family_id === income.families[0].id).map(r => `${r.country}:${r.year}`).sort(), ['ARG:2021', 'PHL:2022']);
  assert.equal(beneficial.filter(r => r.family_id === income.families[2].id).length, 9);
  assert.deepEqual(beneficial.filter(r => r.family_id === income.families[2].id).map(r => [r.country, r.year, r.native_change_pp]).sort(), [
    ['CHN', 2011, -5.29], ['CHN', 2013, -6.83], ['IDN', 2007, -5.75],
    ['ZAF', 2010, -7.5], ['VNM', 2009, -7.39], ['ROU', 2016, -7.6],
    ['PAK', 2008, -5.99], ['KAZ', 2006, -12.18], ['PER', 2021, -5.12],
  ].sort());
  assert.equal(beneficial.every(r => r.is_storm_fire === false && r.population_disruption_change_pp === null), true);
  assert.equal(review.proxy_audit.filter(r => r.naive_five_point_crossing).length, 9);
});

test('PIP null comparability is explicit and the publisher reporting denominator stays distinct', () => {
  const family = income.families[2];
  const fields = ['survey_year', 'survey_acronym', 'survey_comparability', 'comparable_spell'];
  const raw = JSON.parse(readFileSync(new URL('../sources/income-2026-09-10/pip-lineup.body', import.meta.url)));
  assert.equal(raw.length, 9981);
  assert.equal(family.observations.length, 1029);
  for (const row of raw) for (const key of fields) assert.equal(row[key], null);
  for (const row of family.observations) for (const key of fields) assert.equal(row[key], null);
  const before = family.observations.find(r => r.iso3 === 'IDN' && r.year === 2024);
  const after = family.observations.find(r => r.iso3 === 'IDN' && r.year === 2025);
  const result = nativeMovement(family, before, after);
  assert.equal(result.comparability_limits.includes('denominator-publisher-reporting-population'), true);
  assert.equal(result.comparability_limits.includes('comparable-spell-check-inert-null-endpoint'), true);
  assert.equal(result.comparability_limits.includes('survey-comparability-unestablished'), true);
});

test('source-audit status disclosures reproduce without reconciling distinct publisher fields', () => {
  const [epop, unemployment, pip] = income.families;
  assert.equal(epop.observations.filter(r => r.flags.obs_status === null).length, 1050);
  assert.equal(unemployment.observations.filter(r => r.flags.obs_status === 'R').length, 908);
  assert.equal(unemployment.observations.filter(r => r.flags.obs_status === '').length, 142);
  assert.equal(pip.observations.filter(r => r.estimation_type === 'survey').length, 645);
  const indonesia = pip.observations.find(r => r.iso3 === 'IDN' && r.year === 2025);
  assert.equal(indonesia.estimation_type, 'survey');
  assert.equal(indonesia.estimate_type, 'nowcast');
  const countries = [...new Set(pip.observations.map(r => r.iso3))];
  assert.deepEqual(countries.filter(iso3 => !pip.observations.some(r => r.iso3 === iso3 && r.estimation_type === 'survey')).sort(), ['HKG', 'IND', 'IRN', 'PAK', 'SAU', 'SGP']);
});

test('criterion disclosures bound placeholders and validation, rather than promising operational admission', () => {
  const criterion = readFileSync(new URL('../storm-criterion.v1.md', import.meta.url), 'utf8');
  assert.match(criterion, /direct-share arm only/);
  assert.match(criterion, /family-level placeholders to be superseded, not admitted against/);
  assert.match(criterion, /whole-file byte replay in CI/);
  assert.match(criterion, /period length is caller-defined/);
  const audit = readFileSync(new URL('../income-source-audit.md', import.meta.url), 'utf8');
  assert.match(audit, /9,981 raw rows and all 1,029 retained rows/);
  assert.match(audit, /comparable-spell check is inert/);
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
