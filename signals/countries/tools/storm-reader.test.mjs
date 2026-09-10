import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIncomeContext } from './render-country-view.mjs';
import { loadStormReview } from './storm-criterion.mts';
import * as reader from './render-country-view.mjs';

test('existing Markdown reader exposes fifty dated diagnoses without inventing people or bindings', () => {
  const text = renderIncomeContext(loadStormReview());
  assert.equal((text.match(/\| cannot-say \|/g) ?? []).length, 50);
  assert.match(text, /49.*nowcast/);
  assert.match(text, /not a measured storm panel/);
  assert.match(text, /ARG.*No national PIP observation/);
  assert.match(text, /Direct disruption.*Household exposure/);
  assert.doesNotMatch(text, /storm detected|zero storms|all clear/i);
});
test('public state definitions distinguish missing measurement from stability and name the denominator', () => {
  const text = renderIncomeContext(loadStormReview());
  assert.match(text, /\*\*candidate:\*\*.*at least one/);
  assert.match(text, /\*\*no-candidate:\*\*.*both.*measured/);
  assert.match(text, /\*\*cannot-say:\*\*.*missing measurement.*not evidence of stability/);
  assert.match(text, /five percentage points of total population/);
  assert.match(text, /Direct disruption change \(pp of total population\)/);
  assert.match(text, /Household exposure change \(pp of total population\)/);
  assert.match(text, /percentage points.*1% to 6%/);
});
test('native comparisons show both dated values and signed native changes without pretending they are disrupted people', () => {
  const text = renderIncomeContext(loadStormReview());
  assert.equal((text.match(/\| 2024 \(%\) \| 2025 \(%\) \| Native change 2024 to 2025 \(pp; not disruption\) \|/g) ?? []).length, 3);
  assert.match(text, /\| USA \| 59\.467 \| 59\.114 \| -0\.353 \|/);
  for (const change of ['-0.052', '+0.112', '+0.08']) {
    assert.ok(text.split('\n').some(line => line.startsWith('| ZAF |') && line.includes(`| ${change} |`)));
  }
  assert.match(text, /50\/50.*50\/50.*49\/50/);
  assert.match(text, /distinct from the original CPI, electricity and labour-income-share series/);
  assert.match(text, /2025 values are model outputs whose estimate-versus-projection status is not carried at row level/);
});
test('public reader offers a bounded correction route and legible source tracing', () => {
  const text = renderIncomeContext(loadStormReview());
  assert.match(text, /question or correct a row.*https:\/\/github.com\/ferborva\/mind-flow\/issues\/new/);
  assert.match(text, /No response time.*promised/);
  assert.match(text, /not.*consultation/);
  assert.match(text, /CSV record N.*1-based.*\$\[N\].*0-based/);
  assert.match(text, /nowcast.*model estimate/);
  assert.match(text, /PPP.*purchasing power/);
  assert.doesNotMatch(text, /modelled-vintage-no-row-actual-status/);
  assert.equal((text.match(/Comparable direct income-route disruption shares of total population/g) ?? []).length, 1);
  assert.ok(Math.max(...text.split('\n').filter(line => /^\| [A-Z]{3} \|/.test(line)).map(line => line.length)) < 240);
});
test('presentation projection derives changing summaries, missing families and zero-valued measured readings', () => {
  assert.equal(typeof reader.projectIncomeReaderRows, 'function');
  const fixture = structuredClone(loadStormReview());
  fixture.latest = fixture.latest.slice(0, 2);
  fixture.latest[0].state = 'candidate';
  fixture.latest[0].direct_share = { change_pp: 5 };
  fixture.latest[0].household_share = { change_pp: 0 };
  fixture.latest[0].binding_category = 'price';
  fixture.latest[0].missing_evidence = [];
  fixture.latest[0].native_context = fixture.latest[0].native_context.filter(row => row.family_id !== 'income-unemployment.v1');
  fixture.latest[0].missing_series = ['income-unemployment.v1'];
  fixture.latest[1].native_context.find(row => row.family_id === 'income-poverty-lineup.v1').estimate_type = 'actual';
  const projection = reader.projectIncomeReaderRows(fixture);
  assert.equal(projection.count, 2);
  assert.equal(projection.stateSummary, '1 candidate; 1 cannot-say');
  assert.deepEqual(projection.coverage, [2, 1, 2]);
  assert.equal(projection.pipNowcasts, 1);
  assert.equal(projection.rows[0].direct, '+5');
  assert.equal(projection.rows[0].household, '0');
  assert.equal(projection.rows[0].binding, 'price');
  assert.match(projection.rows[0].additionalGaps, /No retained unemployment observation/);
  assert.doesNotMatch(projection.rows[0].additionalGaps, /PIP/);
  assert.equal(projection.rows[1].direct, 'Unavailable');
  assert.throws(() => renderIncomeContext(fixture), /replay/);
});
test('coherent-looking verdict and native value mutations cannot enter the reader', () => {
  const review = loadStormReview();
  review.latest[0].state = 'candidate';
  assert.throws(() => renderIncomeContext(review), /replay/);
  const changed = loadStormReview();
  changed.latest[0].native_context[0].value = 99;
  assert.throws(() => renderIncomeContext(changed), /replay/);
});
