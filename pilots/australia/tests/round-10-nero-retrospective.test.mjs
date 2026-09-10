import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { analyseNativeSeries, assessGpJoin } from '../tools/round-10-nero-retrospective.mts';

const row = (date, value, sa4_code = '102') => ({ occupation_code: '5311', occupation_name: 'General Clerks', state_name: 'NSW', sa4_code, sa4_name: sa4_code === '102' ? 'Central Coast' : 'Capital Region', date, value, source_row: 1 });

test('stock losses remain native net changes, never a disrupted-person or household count', () => {
  for (const values of [[100, 95], [100, 0], [100, 100], [0, 100]]) {
    const [series] = analyseNativeSeries([row('2020-01-15', values[0]), row('2020-02-15', values[1])]);
    assert.equal(series.monthly_changes[0].net_employment_change, values[1] - values[0]);
    assert.equal(series.storm_assessment.state, 'cannot-say');
    assert.equal(series.storm_assessment.disrupted_people, null);
    assert.equal(series.storm_assessment.dependent_household_members, null);
    assert.equal(series.storm_assessment.binding_category_change, null);
    if (values[1] >= values[0]) assert.equal(series.largest_monthly_net_decline, null);
  }
});

test('the same stock change is compatible with offsetting gross flows, so no zero-disruption conclusion follows', () => {
  const [series] = analyseNativeSeries([row('2020-01-15', 100), row('2020-02-15', 100)]);
  // Zero exits/entries and 80 exits plus 80 entries have identical stocks.
  assert.equal(100 - 80 + 80, 100);
  assert.equal(series.monthly_changes[0].net_employment_change, 0);
  assert.equal(series.storm_assessment.state, 'cannot-say');
});

test('native identity, value and calendar corruption fail rather than silently changing the window', () => {
  const valid = [row('2020-01-15', 100), row('2020-02-15', 90)];
  for (const corrupt of [
    [valid[0], valid[0]],
    [valid[0], row('2020-03-15', 90)],
    [valid[0], { ...valid[1], value: null }],
    [valid[0], { ...valid[1], value: -1 }],
    [valid[0], { ...valid[1], date: '2020-13-15' }],
    [valid[0], { ...valid[1], sa4_name: 'Capital Region' }],
    [valid[0], { ...valid[1], state_name: 'VIC' }],
  ]) assert.throws(() => analyseNativeSeries(corrupt), /NERO_/);
});

test('NSW SA4 occupations stay separate and arbitrary input order does not change the result', () => {
  const rows = [row('2020-01-15', 100), row('2020-02-15', 90), row('2020-01-15', 1000, '101'), row('2020-02-15', 1010, '101')];
  const result = analyseNativeSeries(rows);
  assert.equal(result.length, 2);
  assert.deepEqual(result, analyseNativeSeries([...rows].reverse()));
  assert.deepEqual(result.map(s => s.monthly_changes[0].net_employment_change), [10, -10]);
  assert.ok(result.every(s => s.storm_assessment.state === 'cannot-say'));
});

test('national income context cannot become Central Coast GP evidence, even with extreme values', () => {
  const family = { id: 'income-unemployment.v1', source_id: 'ilo-unemployment', denominator: 'Labour force aged 15+', condition_category: 'availability', vintage: 'one vintage', observations: [{ iso3: 'AUS', year: 2025, value: 100, source_selector: 'CSV record 1', estimation_type: 'ILO-modelled', estimate_type: 'modelled' }] };
  const result = assessGpJoin({ families: [family] });
  assert.equal(result.state, 'cannot-say');
  assert.equal(result.binding_category, null);
  assert.equal(result.rows[0].geography_join, 'not-joinable');
  assert.ok(result.rows[0].missing.includes('SA4-specific GP access and income observations for the same people'));
  assert.throws(() => assessGpJoin({ families: [{ ...family, observations: [...family.observations, ...family.observations] }] }), /DUPLICATE/);
});

test('CI replays the retained NERO depth producer and cannot skip or tolerate failure', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/integrity.yml', import.meta.url), 'utf8');
  const name = 'Reproduce Round 10 NERO depth and GP join';
  const command = 'run: node pilots/australia/tools/round-10-nero-retrospective.mts --check';
  const validate = (text) => {
    const split = text.split(`      - name: ${name}\n`);
    assert.equal(split.length, 2);
    assert.equal(split[1].split('\n      - name:')[0].trim(), command);
  };
  validate(workflow);
  assert.throws(() => validate(workflow.replace(command, `${command} || true`)));
  assert.throws(() => validate(workflow.replace(name, 'Omitted depth replay')));
});
