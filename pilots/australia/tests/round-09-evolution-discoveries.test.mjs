import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeConditionDefinitionHash, computeEventHash, computeManifestHash, validateExecutableIfKernel } from '../../../contracts/executable-if/validate.mjs';
import { deriveEvolutionDiscoveries } from '../tools/evolution-discoveries.mts';

const kernel = JSON.parse(readFileSync(new URL('../basket/primary-care.kernel.current.json', import.meta.url)));

function attempt(conditionId, operation, mutate) {
  const after = structuredClone(kernel);
  const old = after.current_state.find(s => s.condition_id === conditionId);
  const definition = structuredClone(after.events.flatMap(e => e.introduced_definitions).find(d => d.definition_hash === old.condition_definition_ref.definition_hash));
  definition.definition_version = '1.1.0';
  definition.effective_from = '2026-09-10T00:09:00Z';
  mutate(definition);
  definition.definition_hash = computeConditionDefinitionHash(definition);
  const next = { ...old, state_version: old.state_version + 1, condition_definition_ref: {
    condition_id: conditionId, definition_version: definition.definition_version, definition_hash: definition.definition_hash,
  } };
  const event = {
    sequence: 13, event_id: 'event.au.primary-care.13', operation, recorded_at: definition.effective_from,
    recorded_by: 'Ren (AI agent)', reason: 'Test-only attempted source-scope correction; never persisted.',
    previous_states: [old], new_states: [next], introduced_definitions: [definition], identity_change: { kind: 'none' },
    authority_effect: 'none', action_authorised: false, previous_event_hash: after.events.at(-1).event_hash, event_hash: '',
  };
  event.event_hash = computeEventHash(event);
  after.events.push(event);
  after.current_state = after.current_state.map(s => s.condition_id === conditionId ? next : s);
  after.manifest_hash = computeManifestHash(after);
  return validateExecutableIfKernel(after);
}

test('two retained discoveries remain discoveries, not fabricated appended events', () => {
  const beforeBytes = JSON.stringify(kernel);
  const report = deriveEvolutionDiscoveries();
  assert.equal(report.discoveries.length, 2);
  assert.equal(report.actual_appended_events, 1);
  assert.equal(report.new_events_appended, 0);
  assert.equal(report.gate_met, false);
  assert.deepEqual(report.discoveries.map(d => d.source_cells), [['10A.43!C54', '10A.43!C55'], ['10A.33!C17', '10A.33!C20', '10A.33!C24']]);
  assert.equal(JSON.stringify(kernel), beforeBytes);
  for (const d of report.discoveries) assert.match(d.blocker, /identity|scope|signal/);
});

test('changing the urgent wait clock is a meaning change, not an ordinary revision', () => {
  const result = attempt('condition.au.gp.timely', 'definition-revised', definition => {
    definition.claim.standard += '; from appointment-making only, excluding earlier attempts';
  });
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(e => e.code === 'CONDITION_MEANING_CHANGED'), JSON.stringify(result.errors));
});

test('a prescription denominator correction is not a literal subset of the existing scope label', () => {
  const result = attempt('condition.au.prescription.cost', 'narrowed', definition => {
    definition.scope.cohorts = ['Survey-scope people aged 15+ who received a GP prescription or needed prescribed medication'];
  });
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(e => e.code === 'NARROWING_NOT_STRICT_SUBSET'), JSON.stringify(result.errors));
});
