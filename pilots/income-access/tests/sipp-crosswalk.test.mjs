import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadRetained, replayCrosswalk, validateCrosswalk } from '../tools/sipp-crosswalk.mts';

test('offline replay checks original metadata and reproduces retained crosswalk, never measurements', async () => {
  const inputs = await loadRetained();
  const actual = replayCrosswalk(inputs);
  const retained = JSON.parse(await readFile(new URL('../sipp-crosswalk.v1.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual, retained);
  assert.equal(actual.recordsAcquired, 0);
  assert.equal(actual.admittedMeasurements, 0);
  assert.equal(actual.nationalStormInference, false);
  assert.equal(actual.variables.length, 16);
  assert.equal(actual.schemaEntries, 5203);
  assert.equal(actual.variables.find(v => v.name === 'EJB7_JOBID').label, 'Suppressed');
  assert.equal(actual.variables.find(v => v.name === 'TPEARN').annotation.zeroFillOutsideUniverse, false);
  assert.equal(actual.timing.independentMonthlyMeasurement, false);
  assert.equal(actual.weights.joinApproved, false);
  assert.deepEqual(actual.weights.documentedMonthlyReplicateJoin, ['SSUID', 'PNUM', 'MONTHCODE']);
  assert.deepEqual(actual.weights.documentedLongitudinalJoin, ['SSUID', 'PNUM']);
  assert.deepEqual(actual.weights.panelRanges, { primary: [2022, 2023, 2024, 2025], replicateText: [2021, 2022, 2023, 2024], longitudinalText: [2022, 2023, 2024] });
});

test('source mutations cannot self-certify by changing the receipt hash', async () => {
  const original = await loadRetained();
  for (const id of Object.keys(original.bytes)) {
    const input = structuredClone(original);
    input.bytes[id] = Buffer.concat([Buffer.from(input.bytes[id]), Buffer.from(' ')]);
    const receipt = input.capture.sources.find(s => s.id === id);
    receipt.bytes = input.bytes[id].length;
    receipt.sha256 = createHash('sha256').update(input.bytes[id]).digest('hex');
    assert.throws(() => replayCrosswalk(input), /pinned|receipt/);
  }
});

test('missing, substituted and authority-inflated receipts fail closed', async () => {
  const original = await loadRetained();
  for (const mutate of [
    x => x.capture.sources.pop(),
    x => x.capture.sources[0].url += '?new=1',
    x => x.capture.sources[0].publisherAuthenticated = true,
    x => x.capture.recordsAcquired = 1,
    x => x.capture.sources[0].endedAt = '2100-01-01T00:00:00.000Z',
  ]) { const x = structuredClone(original); mutate(x); assert.throws(() => replayCrosswalk(x), /receipt/); }
});

test('semantic and authority mutations cannot pass golden replay validation', async () => {
  const inputs = await loadRetained();
  const good = replayCrosswalk(inputs);
  assert.equal(validateCrosswalk(good, inputs), true);
  for (const mutate of [
    x => x.variables[0].label = 'National denominator',
    x => x.variables.find(v => v.name === 'TPEARN').annotation.universe = 'All persons',
    x => x.variables.find(v => v.name === 'EJB7_JOBID').annotation.universe = 'All jobs',
    x => x.timing.independentMonthlyMeasurement = true,
    x => x.weights.joinApproved = true,
    x => x.admittedMeasurements = 1,
    x => x.nextGate.status = 'approved',
    x => x.unknowns = [],
    x => x.variables = [],
  ]) { const bad = structuredClone(good); mutate(bad); assert.throws(() => validateCrosswalk(bad, inputs), /crosswalk differs/); }
});
