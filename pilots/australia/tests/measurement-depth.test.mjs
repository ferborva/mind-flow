import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import * as workbook from '../tools/primary-care-workbook.mts';
import * as depth from '../tools/measurement-depth.mts';

test('ABS sheet names resolve exact retained table without substituting RoGS naming', () => {
  assert.equal(typeof workbook.readNamedWorkbookTables, 'function');
  const bytes = readFileSync(resolve(import.meta.dirname, '../sources/primary-care/2026-09-10-depth/abs-after-hours.xlsx'));
  const tables = workbook.readNamedWorkbookTables(bytes, ['Table 7']);
  assert.ok(tables['Table 7'].some(c => c.text.includes('2024')));
  assert.throws(() => workbook.readNamedWorkbookTables(bytes, ['Table 700']), /relationship/);
});

test('interval assessment distinguishes change uncertainty, absent intervals and scope changes', () => {
  assert.equal(typeof depth.assessChange, 'function');
  const p = (value, width) => ({ value, unit: 'percent', published_95ci_half_width: width });
  assert.throws(() => depth.assessChange(p(NaN, 1), p(2, 1), true), /percentage/);
  const within = depth.assessChange(p(44.8, 4.9), p(45.9, 6), true);
  assert.equal(within.approximate_significant, false);
  assert.ok(within.change_95ci[0] < 0 && within.change_95ci[1] > 0);
  assert.equal(depth.assessChange(p(9.3, 0.9), p(7.2, 0.7), false).same_population_change_established, false);
  assert.equal(depth.assessChange(p(9.3, 0.9), p(7.2, 0.7), true).approximate_significant, true);
  assert.equal(depth.assessChange(p(55.2, null), p(56.1, null), true).approximate_significant, null);
  assert.throws(() => depth.assessChange(p(1, -1), p(2, 1), true), /interval/);
  for (const value of [undefined, NaN, Infinity, -1, 101]) assert.throws(() => depth.assessChange(p(value, 1), p(2, 1), true), /percentage/);
  assert.throws(() => depth.assessChange({ ...p(1, 1), unit: 'months' }, p(2, 1), true), /percentage/);
  assert.throws(() => depth.assessChange(p(1, 1), { ...p(2, 1), unit: undefined }, true), /percentage/);
  assert.equal(depth.assessChange(p(40, 1), p(50, 1), true).same_population_change_established, true);
});

test('retained after-hours estimates are extracted, never reconstructed by subtracting perturbed totals', () => {
  const data = depth.deriveMeasurementDepth();
  const previous = JSON.parse(readFileSync(resolve(import.meta.dirname, '../data/primary-care-depth-2026-09-10.json')));
  assert.equal(data.correction.source_values_changed, false);
  assert.deepEqual(data.policy, previous.policy);
  assert.deepEqual(data.after_hours_series.map(s => s.points), previous.after_hours_series.map(s => s.points));
  assert.deepEqual(data.histories.map(s => s.points), previous.histories.map(s => s.points));
  const series = id => data.after_hours_series.find(s => s.id === id);
  const latest = id => series(id).points.at(-1);
  assert.equal(latest('after-hours-cost-main-reason').value, 6);
  assert.equal(latest('after-hours-cost-main-reason').published_95ci_half_width, 1.3);
  assert.notEqual(latest('after-hours-cost-main-reason').value, Number((latest('after-hours-delay').value - latest('after-hours-noncost-main-reason').value).toFixed(1)));
  assert.match(series('after-hours-cost-main-reason').evidence_ceiling, /Random confidentiality adjustment/);
  assert.equal(series('after-hours-delay').points.length, 12);
  assert.deepEqual(data.policy.general_copayment, 25);
  assert.equal(data.policy.general_safety_net, 1748.20);
  assert.equal(data.policy.concessional_safety_net, 277.20);
  assert.match(data.policy.evidence_ceiling, /not an atorvastatin transaction/);
  for (const item of data.items) {
    assert.equal(item.binding_category, null);
    assert.equal(item.five_categories_direct_current_measurements, false);
    assert.deepEqual(item.conditions.map(c => c.condition_category), ['price', 'permission', 'proximity', 'availability', 'capability']);
    for (const c of item.conditions) {
      assert.ok(c.missing_series.length > 70 && c.why_missing.length > 50);
      assert.match(c.source_artifact_hash, /^sha256:[a-f0-9]{64}$/);
    }
  }
  assert.equal(data.items[0].conditions[0].source_refs.length, 3);
  assert.match(data.after_hours_series[0].population, /Indigenous Community Strata and non-private dwellings/);
  const urgent = data.histories.find(h => h.series_id === 'gp-urgent-under-four-hours');
  assert.equal(urgent.latest_change.approximate_significant, false);
  assert.equal(urgent.points[0].period, '2015-16');
  const gp = data.histories.find(h => h.series_id === 'gp-cost-delay');
  assert.equal(gp.latest_change.approximate_significant, true);
  assert.equal(gp.latest_change.same_population_change_established, false);
  assert.equal(data.histories.find(h => h.series_id === 'gp-fully-bulk-billed').latest_change.approximate_significant, null);
});
