import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caseFor } from '../cases.mjs';

const income = JSON.parse(readFileSync(new URL('../../../signals/countries/income-measurements.v1.json', import.meta.url)));
const review = JSON.parse(readFileSync(new URL('../../../signals/countries/storm-review.v1.json', import.meta.url)));
const fixture = () => ({
  families: income.families.map(f => ({ id: f.id, fullLabel: f.label, denominator: f.denominator, vintage: f.vintage })),
  countries: ['PER', 'IRL', 'KAZ', 'ARG'].map(code => ({ code,
    series: Object.fromEntries(income.families.map(f => [f.id, f.observations.filter(o => o.iso3 === code).map(o => ({ year: o.year, value: o.value, estimateType: o.estimate_type, estimationType: o.estimation_type }))])),
    assessments: review.country_periods.filter(a => a.country === code).map(a => ({ year: a.period.to, state: a.state, missingSeries: a.missing_series, native: a.native_context.map(n => ({ family: n.family_id, change: n.native_change_pp })) })),
  })),
});
const E = 'income-employment-population.v1', U = 'income-unemployment.v1', P = 'income-poverty-lineup.v1';

test('only four exact retained case selections have a narrative', () => {
  const s = fixture();
  for (const selection of [['PER', E, 2020], ['IRL', U, 2009], ['KAZ', P, 2006], ['ARG', P, 2025]]) {
    const story = caseFor(s, ...selection);
    assert.deepEqual(Object.keys(story), ['heading', 'changeExplanation', 'claimLimit', 'nextQuestion']);
    assert.ok(Object.values(story).every(v => typeof v === 'string' && v.length > 20));
  }
  for (const selection of [['PER', U, 2020], ['PER', E, 2019], ['USA', E, 2020], ['ARG', P, '2025']]) assert.equal(caseFor(s, ...selection), null);
});

test('Peru reports the exact native movement without counting disrupted people or asserting cause', () => {
  const c = caseFor(fixture(), 'PER', E, 2020);
  assert.match(c.changeExplanation, /74\.748%.*2019.*63\.976%.*2020.*10\.772 percentage points/);
  assert.match(c.changeExplanation, /15 and over/);
  assert.match(c.claimLimit, /not.*people.*lost/i);
  assert.match(c.claimLimit, /not.*cause/i);
  assert.match(c.nextQuestion, /routes.*alternatives/i);
});

test('Ireland preserves labour-force denominator and forbids adding correlated indicators', () => {
  const c = caseFor(fixture(), 'IRL', U, 2009);
  assert.match(c.changeExplanation, /6\.774%.*2008.*12\.609%.*2009.*5\.835 percentage points/);
  assert.match(c.changeExplanation, /labour force aged 15 and over/);
  assert.match(c.claimLimit, /cannot add/i);
  assert.match(c.claimLimit, /different denominators/i);
});

test('Kazakhstan shows a favourable native direction without inventing improved access or paired surveys', () => {
  const c = caseFor(fixture(), 'KAZ', P, 2006);
  assert.match(c.changeExplanation, /14\.56%.*2005.*2\.38%.*2006.*12\.18 percentage points/);
  assert.match(c.changeExplanation, /\$3 per day.*2021 purchasing-power-parity/);
  assert.match(c.claimLimit, /survey-typed.*not.*comparable/i);
  assert.match(c.claimLimit, /not.*income routes|not.*agency/i);
  assert.doesNotMatch(c.changeExplanation, /nowcast/i);
});

test('Argentina retains a national-series gap rather than zero or a substitute', () => {
  const c = caseFor(fixture(), 'ARG', P, 2025);
  assert.match(c.changeExplanation, /No retained national.*2024.*2025/);
  assert.match(c.changeExplanation, /\$3 per day.*2021 purchasing-power-parity/);
  assert.match(c.claimLimit, /not zero/i);
  assert.match(c.nextQuestion, /national.*scope/i);
});

for (const [name, country, family, year, mutate] of [
  ['changed value', 'PER', E, 2020, c => { c.series[E].find(p => p.year === 2020).value = 65; }],
  ['coherent changed values and movement', 'PER', E, 2020, c => { c.series[E].find(p => p.year === 2020).value = 65; c.assessments.find(a => a.year === 2020).native.find(n => n.family === E).change = -9.748; }],
  ['changed model status', 'IRL', U, 2009, c => { c.series[U].find(p => p.year === 2009).estimateType = 'actual'; }],
  ['survey switched to nowcast', 'KAZ', P, 2006, c => { c.series[P].find(p => p.year === 2006).estimationType = 'nowcast'; }],
  ['nowcast status with survey method retained', 'KAZ', P, 2006, c => { const point = c.series[P].find(p => p.year === 2006); assert.equal(point.estimationType, 'survey'); point.estimateType = 'nowcast'; }],
  ['invented storm confirmation', 'PER', E, 2020, c => { c.assessments.find(a => a.year === 2020).state = 'candidate'; }],
  ['gap backfill', 'ARG', P, 2025, c => { c.series[P].push({ year: 2025, value: 0 }); }],
  ['gap reclassified', 'ARG', P, 2025, c => { c.assessments.find(a => a.year === 2025).missingSeries = []; }],
]) {
  test(`semantic guard rejects ${name} instead of showing canned interpretation`, () => {
    const s = fixture(); mutate(s.countries.find(c => c.code === country));
    assert.throws(() => caseFor(s, country, family, year), /Case semantics changed/);
  });
}

test('changed poverty threshold or denominator requires a new reviewed story', () => {
  for (const mutate of [f => { f.fullLabel = 'Poverty headcount at $5 per day'; }, f => { f.denominator = 'Working age population'; }, f => { f.vintage = 'future-vintage'; }]) {
    const s = fixture(); mutate(s.families.find(f => f.id === P));
    assert.throws(() => caseFor(s, 'KAZ', P, 2006), /Case semantics changed/);
  }
});

test('stories do not mutate source objects or claim approvals, skill or causal effects', () => {
  const s = fixture(), before = JSON.stringify(s);
  for (const selection of [['PER', E, 2020], ['IRL', U, 2009], ['KAZ', P, 2006], ['ARG', P, 2025]]) {
    const c = caseFor(s, ...selection);
    assert.match(c.claimLimit, /cannot assess.*storm/i);
    assert.doesNotMatch(JSON.stringify(c), /pandemic caused|crisis caused|AI caused|action is authorised/i);
  }
  assert.equal(JSON.stringify(s), before);
});
