import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyseNativeSeries, assessGpJoin, parseRetrospectiveArgs } from '../tools/round-10-nero-retrospective.mts';
import { evaluateStorm } from '../../../signals/countries/tools/storm-criterion.mts';

test('retained annual results bind the current criterion code, prose and definition artifact', () => {
  const retained = JSON.parse(readFileSync(new URL('../data/round-10-nero-retrospective.json', import.meta.url)));
  const paths = ['signals/countries/tools/storm-criterion.mts', 'signals/countries/storm-criterion.v1.md', 'signals/countries/storm-review.v1.json'];
  assert.deepEqual(retained.criterion_binding.map(x => x.path), paths);
  const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  for (const binding of retained.criterion_binding) {
    const bytes = readFileSync(new URL('../../../' + binding.path, import.meta.url));
    assert.equal(binding.sha256, hash(bytes));
    assert.notEqual(binding.sha256, hash(Buffer.concat([bytes, Buffer.from('changed criterion')])));
  }
  const results = new Map(retained.annual_criterion_results.map(x => [x.id, x.result]));
  assert.equal(results.size, 10);
  for (const result of results.values()) assert.deepEqual(result, evaluateStorm({ country: 'AUS', period: result.period, disruption: null, binding: null, household: null }));
  assert.equal(retained.series.flatMap(x => x.annual_criterion).length, 1400);
  for (const window of retained.series.flatMap(x => x.annual_criterion)) {
    assert.equal(window.state, results.get(window.result_ref).state);
    assert.equal(window.native_context_admitted, false);
  }
});

test('annual native windows call the shared criterion with no invented disruption measurements', () => {
  const points = Array.from({ length: 13 }, (_, i) => row(`${2019 + Math.floor((11 + i) / 12)}-${String((11 + i) % 12 + 1).padStart(2, '0')}-15`, 100 - i));
  const [series] = analyseNativeSeries(points);
  assert.equal(series.annual_criterion.length, 1);
  assert.deepEqual(series.annual_criterion[0].result, evaluateStorm({ country: 'AUS', period: { from: 2019, to: 2020 }, disruption: null, binding: null, household: null }));
  assert.equal(series.annual_criterion[0].native_context.net_employment_change, -12);
  assert.equal(series.annual_criterion[0].native_context_admitted, false);
});

test('CLI rejects duplicates, contradictory modes, empty roots and unknown arguments before source work', () => {
  for (const args of [[], ['--check', '--check'], ['--print', '--print'], ['--check', '--print'], ['--check', '--income-root='], ['--check', '--income-root=  '], ['--check', '--income-root=a', '--income-root=b'], ['--check', '--unknown']]) assert.throws(() => parseRetrospectiveArgs(args), /NERO_CLI/);
  assert.deepEqual(parseRetrospectiveArgs(['--check']), { mode: '--check', incomeRoot: undefined });
  assert.deepEqual(parseRetrospectiveArgs(['--income-root=peer', '--print']), { mode: '--print', incomeRoot: 'peer' });
});

const row = (date, value, sa4_code = '102') => ({ occupation_code: '5311', occupation_name: 'General Clerks', state_name: 'NSW', sa4_code, sa4_name: sa4_code === '102' ? 'Central Coast' : 'Capital Region', date, value, source_row: 1 });

test('retained-range summary is explicitly not an annual or local measurement', () => {
  const [series] = analyseNativeSeries([row('2020-01-15', 100), row('2020-02-15', 95)]);
  assert.equal(series.storm_assessment.period_kind, 'retained-range-summary-not-an-annual-window');
  assert.equal(series.storm_assessment.geography_limit, 'Country-only criterion; no subnational diagnosis');
  const producer = readFileSync(new URL('../tools/round-10-nero-retrospective.mts', import.meta.url), 'utf8');
  assert.doesNotMatch(producer, /csv_crc_and_length_verified:\s*true/);
  assert.match(producer, /csv_validation_method: 'Full stream checked against SHA-bound archive CRC and declared length'/);
});

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
