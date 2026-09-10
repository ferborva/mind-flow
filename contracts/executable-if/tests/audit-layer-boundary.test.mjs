import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCondition, computeConditionDefinitionHash, computeSignalDefinitionHash } from '../validate.mjs';
import { auditSignalThreshold } from '../source-aware-audit.mjs';

test('count nonnegativity remains a disclosed audit-layer control, not retroactive sealed semantics', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /Count nonnegativity is an audit-layer control/);
  assert.match(readme, /sealed evaluator.*unchanged/s);
  const kernel = JSON.parse(readFileSync(new URL('../../../pilots/australia/basket/primary-care.kernel.r3.json', import.meta.url)));
  const definition = structuredClone(kernel.events.flatMap(e => e.introduced_definitions).find(d => d.condition_id === 'condition.au.prescription.cost'));
  const predicate = definition.predicates.measure;
  const signal = structuredClone(kernel.signals.find(s => s.signal_definition_hash === predicate.signal_ref.signal_definition_hash));
  // Test-only cardinal-count domain with impossible negative cardinalities.
  signal.unit = 'count';
  signal.value_range = { minimum: -10, maximum: 10 };
  signal.signal_definition_hash = computeSignalDefinitionHash(signal);
  predicate.signal_ref.signal_definition_hash = signal.signal_definition_hash;
  predicate.operator = 'gte';
  predicate.threshold = { value: 0, unit: 'count' };
  definition.definition_hash = computeConditionDefinitionHash(definition);
  const result = evaluateCondition(definition, [signal], [], { evaluatedAt: '2026-09-10T00:00:00Z' });
  assert.equal(result.mechanically_valid_for_evaluation, true, JSON.stringify(result.errors));
  const audit = auditSignalThreshold({ signal, predicate, observations: [], domainProvenance: [], retainedSources: new Map() });
  assert.equal(audit.intrinsic_domain_vacuity, 'always_true');
  assert.ok(audit.issues.some(i => i.code === 'DOMAIN_CONTRADICTS_INTRINSIC_UNIT'));
  assert.equal(audit.status, 'flagged');
});
