import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePositiveSignals, validatePositiveSignals } from '../tools/positive-signals.mts';

test('three favorable observations preserve actual populations, owners and uncertainty', () => {
  const result = derivePositiveSignals();
  assert.equal(result.signals.length, 3);
  assert.deepEqual(result.signals.map(s => s.change_percentage_points), [0.9, -2.1, -2.6]);
  assert.equal(result.agency_measured, false);
  for (const signal of result.signals) {
    assert.equal(signal.status, 'measured');
    assert.equal(signal.favorable_observed_direction, true);
    assert.ok(signal.owner.length > 10);
    assert.ok(signal.for_whom.length > 10);
    assert.ok(signal.condition_definition_ref.definition_hash.startsWith('sha256:'));
    assert.equal(signal.significance_of_change, 'not_assessed');
  }
  assert.equal(result.signals[1].observations[1].published_95ci_half_width, 0.7);
  assert.equal(result.signals[0].condition_binding, 'related-price-context-not-executable-predicate');
  assert.equal(validatePositiveSignals(result).valid, true);
});
test('altered observations, owners and condition bindings fail retained-source replay', () => {
  for (const mutate of [
    x => { x.signals[0].observations[1].value = 100; },
    x => { x.signals[1].owner = 'the affected worker alone'; },
    x => { x.signals[0].condition_binding = 'executable-predicate'; },
    x => { x.agency_measured = true; },
  ]) {
    const result = derivePositiveSignals(); mutate(result);
    assert.equal(validatePositiveSignals(result).valid, false);
  }
});
