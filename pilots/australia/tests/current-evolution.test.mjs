import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as current from '../tools/current-primary-care.mts';
const { appendCorroborationRequirement, rebindPositiveConsumer, assessPositiveBinding } = current;
import { computeConditionDefinitionHash, computeObservationHash, evaluateCondition, evaluateKernelCondition } from '../../../contracts/executable-if/validate.mjs';

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const before = read('../basket/primary-care.kernel.r3.json');
const consumer = read('../data/positive-signals-2026-09-09.r3.json');

test('the revised overlay dates its presentation update without redating the underlying event', () => {
  const kernel = read('../basket/primary-care.kernel.current.json');
  const overlay = read('../../../contracts/evolution/fixtures/australia-primary-care.current.json');
  assert.equal(kernel.events.at(-1).recorded_at, '2026-09-09T22:33:29Z');
  assert.ok(Date.parse(overlay.generated_at) > Date.parse(kernel.events.at(-1).recorded_at));
  assert.equal(overlay.publication_anchor.checkpoint_uri, 'https://github.com/ferborva/mind-flow/pull/16');
});

test('a persisted pre-event positive consumer fails after an appended definition event until explicitly rebound', () => {
  assert.equal(assessPositiveBinding(consumer, before).valid, true);
  const after = appendCorroborationRequirement(before, '2026-09-10T00:00:00Z');
  assert.deepEqual(after.events.slice(0, before.events.length), before.events);
  assert.deepEqual(after.evidence_events, before.evidence_events);
  assert.equal(after.kernel_id, before.kernel_id);
  assert.equal(after.events.length, before.events.length + 1);
  assert.equal(assessPositiveBinding(consumer, after).valid, false);
  const rebound = rebindPositiveConsumer(consumer, after);
  assert.equal(assessPositiveBinding(rebound, after).valid, true);
  const audit = assessPositiveBinding(rebound, after).threshold_audit;
  assert.equal(audit.status, 'flagged');
  assert.equal(audit.kernel_manifest_hash, after.manifest_hash);
  assert.equal(audit.empirical_plausibility_established, false);
  assert.deepEqual(rebound.signals.map(x => x.observations), consumer.signals.map(x => x.observations));
  assert.equal(rebound.current_condition_truth_established, false);
  const falselyGreen = structuredClone(rebound);
  falselyGreen.current_condition_truth_established = true;
  assert.equal(current.assessPositiveParity(JSON.stringify(falselyGreen, null, 2) + '\n', after).valid, false);
});

test('definition binding and retained byte parity report different failures', () => {
  const after = appendCorroborationRequirement(before, '2026-09-10T00:00:00Z');
  const rebound = rebindPositiveConsumer(consumer, after);
  const serialise = value => JSON.stringify(value, null, 2) + '\n';
  const prose = structuredClone(rebound);
  prose.scope_and_comparison_limit += ' Additional editorial context.';
  assert.equal(assessPositiveBinding(prose, after).valid, true);
  assert.equal(current.assessPositiveParity(serialise(rebound), after).valid, true);
  assert.equal(current.assessPositiveParity(serialise(prose), after).code, 'CONSUMER_BYTE_PARITY_MISMATCH');
  assert.equal(current.assessPositiveParity(JSON.stringify(rebound), after).valid, false);
  const old = structuredClone(rebound);
  old.signals[1].condition_definition_ref = consumer.signals[1].condition_definition_ref;
  assert.equal(assessPositiveBinding(old, after).code, 'CONSUMER_DEFINITION_BINDING_MISMATCH');
  const empty = structuredClone(rebound);
  empty.signals = [];
  assert.equal(assessPositiveBinding(empty, after).valid, false);
  const duplicate = structuredClone(rebound);
  duplicate.signals[0] = structuredClone(duplicate.signals[1]);
  assert.equal(assessPositiveBinding(duplicate, after).valid, false);
});

test('repeated append and a consumer retaining the old definition are refused', () => {
  const after = appendCorroborationRequirement(before, '2026-09-10T00:00:00Z');
  assert.throws(() => appendCorroborationRequirement(after, '2026-09-10T00:00:01Z'), /already appended/);
  const rebound = rebindPositiveConsumer(consumer, after);
  rebound.signals[1].condition_definition_ref = consumer.signals[1].condition_definition_ref;
  assert.equal(assessPositiveBinding(rebound, after).valid, false);
});

test('test-only fresh synthetic observations isolate the two-artifact rule, not a historical truth transition', () => {
  const after = read('../basket/primary-care.kernel.current.json');
  const time = after.events.at(-1).recorded_at;
  const id = 'condition.au.gp.cost';
  // The real retained observation was already stale. The new definition has no
  // rebound observations: do not misdescribe that as newly losing eligible data.
  const actualBefore = evaluateKernelCondition(before, id, { evaluatedAt: time });
  const actualAfter = evaluateKernelCondition(after, id, { evaluatedAt: time });
  assert.equal(actualBefore.computed_rule_state.state, 'stale');
  assert.equal(actualBefore.predicate_results.measure.eligible_periods, 0);
  assert.equal(actualAfter.computed_rule_state.state, 'unknown');
  assert.equal(actualAfter.observation_hashes.length, 0);

  const minimumTwo = structuredClone(after.events.at(-1).introduced_definitions[0]);
  const minimumOne = structuredClone(minimumTwo);
  minimumOne.predicates.measure.source_policy.minimum_distinct_artifact_hashes = 1;
  minimumOne.definition_hash = computeConditionDefinitionHash(minimumOne);
  function syntheticProbe(definition, artifactCount) {
    const observations = Array.from({ length: artifactCount }, (_, index) => {
      const observation = structuredClone(before.observations.find(o => o.condition_definition_ref.condition_id === id));
      observation.classification = 'synthetic-observation';
      observation.observation_id = `observation.synthetic.artifact-policy-${index}`;
      observation.source_id = `source.synthetic.artifact-policy-${index}`;
      observation.source_artifact_hash = `sha256:${String(index + 1).repeat(64)}`;
      observation.condition_definition_ref = {
        condition_id: definition.condition_id,
        definition_version: definition.definition_version,
        definition_hash: definition.definition_hash,
      };
      observation.period = { start: time, end: time };
      observation.recorded_at = time;
      observation.uncertainty = { status: 'not-quantified', reason: 'Test-only policy probe; not a retained empirical observation.' };
      observation.observation_hash = computeObservationHash(observation);
      return observation;
    });
    return evaluateCondition(definition, after.signals, observations, { evaluatedAt: time });
  }
  const one = syntheticProbe(minimumOne, 1), two = syntheticProbe(minimumTwo, 1);
  assert.equal(one.mechanically_valid_for_evaluation, true);
  assert.equal(two.mechanically_valid_for_evaluation, true);
  assert.equal(one.predicate_results.measure.eligible_periods, 1);
  assert.equal(one.computed_rule_state.state, 'false');
  assert.equal(two.predicate_results.measure.eligible_periods, 0);
  assert.equal(two.computed_rule_state.state, 'unknown');
  assert.deepEqual(two.predicate_results.measure.excluded_periods[0].reasons, ['insufficient-distinct-artifacts']);
  const corroborated = syntheticProbe(minimumTwo, 2);
  assert.equal(corroborated.predicate_results.measure.eligible_periods, 1);
  assert.equal(corroborated.computed_rule_state.state, 'false');
  for (const result of [actualBefore, actualAfter, one, two, corroborated]) {
    assert.equal(result.empirical_truth_established, false);
    assert.equal(result.action_authorised, false);
  }
});
