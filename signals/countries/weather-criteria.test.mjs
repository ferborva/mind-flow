import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDefinition, inspectHistory, rankMagnitude, validateCriteria, verifyMeasurementBytes } from './weather-criteria.mjs';
import { computeConditionDefinitionHash, evaluateCondition } from '../../contracts/executable-if/validate.mjs';

const hash = `sha256:${'1'.repeat(64)}`;
const example = () => ({ id: 'electricity-access', native_series: 'EG.ELC.ACCS.ZS',
  unit: 'percent-of-population', vintage: 'Synthetic test vintage', reference_year: 2024,
  definition: 'Synthetic population electricity-connection coverage', evidence_ceiling: 'Not reliable power.',
  source_file: 'synthetic-only.body', source_sha256: hash,
  retained_history: Array.from({length: 12}, (_, i) => ({country:'AUS',year:2013+i,value:70+i,source_selector:`test[${i}]`,modelled:null})) });

test('source-derived byte replay rejects absent, fabricated or stale measurement inputs', () => {
  assert.doesNotThrow(()=>verifyMeasurementBytes('{"value":1}\n','{"value":1}\n'));
  assert.throws(()=>verifyMeasurementBytes('{"value":2}\n','{"value":1}\n'),/replay/);
  assert.throws(()=>verifyMeasurementBytes('', '{"value":1}\n'),/replay/);
});

test('ten prior movements, midrank ties and latest exclusion are explicit', () => {
  assert.equal(rankMagnitude(5, Array(10).fill(5)), 0.5);
  assert.equal(rankMagnitude(11, Array.from({length:10},(_,i)=>i)), 1);
  assert.equal(rankMagnitude(-11, Array.from({length:10},(_,i)=>i)), 1);
  assert.throws(()=>rankMagnitude(1,[1,2]), /ten/);
  assert.throws(()=>rankMagnitude(NaN,Array(10).fill(1)), /finite/);
});

test('retained numeric history never certifies comparability or detects a storm', () => {
  const result = inspectHistory(example());
  assert.equal(result.numeric_history_complete, true);
  assert.equal(result.rank, null);
  assert.equal(result.comparability, 'unassessed');
  assert.equal(result.storm_detection_performed, false);
  assert.equal(result.storm_detected, null);
  assert.equal(result.prior_movement_years.length, 10);
  assert.ok(!result.prior_movement_years.includes(2024));
});

test('missing history, nulls, duplicates, selectors and impossible values never become eligible', () => {
  for (const mutate of [s=>s.retained_history.pop(), s=>s.retained_history[0].value=null,
    s=>s.retained_history.push(s.retained_history[0]), s=>delete s.retained_history[0].source_selector,
    s=>s.retained_history[0].value=101]) {
    const series=example(); mutate(series);
    assert.equal(inspectHistory(series).numeric_history_complete,false);
  }
  const cpi={...example(),id:'cpi-annual-change',unit:'annual-percent-change'};
  cpi.retained_history.at(-1).value=-100;
  assert.equal(inspectHistory(cpi).numeric_history_complete,false);
});

test('existing IF definitions bind threshold, unit, domain, source and no-authority semantics', () => {
  const entry=createDefinition(example(),hash);
  assert.deepEqual(validateCriteria(entry), []);
  assert.equal(entry.definition.predicates.tail.threshold.value,0.9);
  const evaluated=evaluateCondition(entry.definition,[entry.signal],[],{evaluatedAt:'2026-09-10T01:23:27Z'});
  assert.equal(evaluated.computed_rule_state.state,'unknown');
  assert.equal(evaluated.mechanically_valid_for_evaluation,true);
  assert.deepEqual(evaluated.errors,[]);
  for (const change of [e=>e.definition.predicates.tail.threshold.value=1.1,
    e=>e.signal.value_range.maximum=2,e=>e.definition.action_authorised=true,
    e=>e.definition.empirical_truth_established=true,e=>e.source_sha256=null]) {
    const bad=structuredClone(entry);change(bad);assert.ok(validateCriteria(bad).length);
  }
  const altered=structuredClone(entry);altered.definition.predicates.tail.threshold.value=0.8;
  altered.definition.definition_hash=computeConditionDefinitionHash(altered.definition);
  assert.ok(validateCriteria(altered).length,'a recomputed hash does not adopt an unreviewed threshold');
  for(const change of [e=>e.definition.truth_expression={not:{predicate_ref:'tail'}},
    e=>e.definition.scope.geographies=['Canada'],e=>e.definition.predicates.tail.window.maximum_age_days=9999]){
    const bad=structuredClone(entry);change(bad);bad.definition.definition_hash=computeConditionDefinitionHash(bad.definition);
    assert.ok(validateCriteria(bad).length,'a rehash cannot change the proposed truth rule, country or age window');
  }
  const changed=createDefinition({...example(),source_sha256:`sha256:${'2'.repeat(64)}`},hash);
  assert.notEqual(changed.definition.definition_hash,entry.definition.definition_hash);
  assert.throws(()=>createDefinition({...example(),source_sha256:null},hash),/source/);
});

test('retained proposed bindings contain no real rank, observation, event or detection claim', () => {
  const output=JSON.parse(readFileSync(new URL('./weather-criteria.v1.json',import.meta.url)));
  assert.equal(output.entries.length,3);
  assert.equal(output.adopted,false);
  assert.equal(output.storm_detection_performed,false);
  assert.equal(output.storm_detected,null);
  assert.equal(output.real_evolution_events_added,0);
  assert.deepEqual(output.registered_observations,[]);
  assert.equal(output.method_sha256,`sha256:${createHash('sha256').update(readFileSync(new URL('./weather-criteria.v1.md',import.meta.url))).digest('hex')}`);
  for(const entry of output.entries){
    assert.deepEqual(validateCriteria(entry),[]);
    assert.equal(entry.history_eligibility.rank,null);
    assert.equal(entry.history_eligibility.comparability,'unassessed');
    assert.deepEqual(entry.definition.scope.geographies,['Australia']);
  }
});
