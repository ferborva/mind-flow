import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, numericCell, selectRow, deriveMeasurements, verifyCapture } from '../tools/primary-care.mts';
import { buildBasket } from '../tools/primary-care-basket.mts';
import { validateExecutableIfKernel, evaluateKernelCondition } from '../../../contracts/executable-if/validate.mjs';

test('CSV preserves quoted commas, escaped quotes and line breaks', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","a""b\nc"\r\n'), [{ a: 'x, y', b: 'a"b\nc' }]);
  assert.throws(() => parseCsv('a,b\n"unfinished,b'), /quote/);
  assert.throws(() => parseCsv('a,b\n1,2,3'), /width/);
});
test('basket binds four pathways, five categories and three source-driven evolutions', () => {
  const { kernel, basket } = buildBasket();
  const valid = validateExecutableIfKernel(kernel);
  assert.equal(valid.machine_valid, true, JSON.stringify(valid.errors));
  assert.equal(basket.items.length, 4);
  assert.deepEqual(new Set(basket.items[0].conditions.map(c => c.condition_category)), new Set(['price', 'permission', 'proximity', 'availability', 'capability']));
  assert.deepEqual(kernel.events.filter(e => e.operation !== 'added').map(e => e.operation), ['narrowed', 'definition-revised', 'split']);
  const evaluatedAt = kernel.evidence_events.at(-1).recorded_at;
  const result = evaluateKernelCondition(kernel, 'condition.au.gp.telehealth-context', { evaluatedAt });
  assert.equal(result.computed_rule_state.state, 'unknown');
  assert.equal(result.mechanically_valid_for_evaluation, false);
  const oldCost = kernel.events[0].introduced_definitions[0];
  assert.notEqual(kernel.current_state.find(s => s.condition_id === oldCost.condition_id).condition_definition_ref.definition_hash, oldCost.definition_hash);
  assert.ok(kernel.observations.length > 0);
  const annual = kernel.observations.find(o => o.observation_id === 'observation.au.gp-cost-delay');
  assert.equal(annual.period.start, '2024-07-01T00:00:00Z');
  assert.equal(evaluateKernelCondition(kernel, 'condition.au.gp.cost', { evaluatedAt }).computed_rule_state.state, 'stale');
});
test('suppression and absent observations cannot become zero; zero remains zero', () => {
  for (const value of ['', '..', 'np', 'na', '*3.5']) assert.throws(() => numericCell(value), /numeric/);
  assert.equal(numericCell('0'), 0);
});
test('selection refuses ambiguous estimates and confidence intervals', () => {
  const rows = [{ Year: '2024', Uncertainty: '', NSW: '7' }, { Year: '2024', Uncertainty: '95%CI', NSW: '1' }];
  assert.throws(() => selectRow(rows, { Year: '2024' }), /exactly one/);
  assert.equal(selectRow(rows, { Year: '2024', Uncertainty: '' }).NSW, '7');
});
test('retained bytes reproduce distinct populations, uncertainty and NSW ecological ceiling', () => {
  verifyCapture();
  const data = deriveMeasurements();
  const cost = data.series.find(x => x.id === 'gp-cost-delay');
  const nsw = cost.points.find(x => x.geography === 'NSW' && x.period === '2024-25');
  assert.equal(nsw.value, 7.2);
  assert.equal(nsw.published_95ci_half_width, 0.7);
  assert.equal(cost.population.includes('15 years'), true);
  assert.equal(data.ecological_join.individual_linkage, false);
  assert.equal(data.ecological_join.occupation_estimates_summed, false);
  assert.equal(data.binding_diagnosis.individual_binding_category, null);
  assert.equal(data.binding_diagnosis.observed_category, 'price');
  assert.equal(data.series.find(x => x.id === 'gp-fte-remoteness').measurement_role, 'spatial-supply-proxy');
});
