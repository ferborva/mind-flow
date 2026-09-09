import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appendCorroborationRequirement, rebindPositiveConsumer, assessPositiveBinding } from '../tools/current-primary-care.mts';

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const before = read('../basket/primary-care.kernel.r3.json');
const consumer = read('../data/positive-signals-2026-09-09.r3.json');

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
  assert.equal(assessPositiveBinding(falselyGreen, after).valid, false);
});

test('repeated append and a consumer retaining the old definition are refused', () => {
  const after = appendCorroborationRequirement(before, '2026-09-10T00:00:00Z');
  assert.throws(() => appendCorroborationRequirement(after, '2026-09-10T00:00:01Z'), /already appended/);
  const rebound = rebindPositiveConsumer(consumer, after);
  rebound.signals[1].condition_definition_ref = consumer.signals[1].condition_definition_ref;
  assert.equal(assessPositiveBinding(rebound, after).valid, false);
});
