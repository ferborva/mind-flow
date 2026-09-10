import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/integrity.yml', import.meta.url), 'utf8');
const name = 'Verify the retained Round 10.1 repair receipt';
const expected = ['run: >-', '          node meta/review-freeze/review-freeze.mjs verify',
  '          --policy=round-10', '          --manifest=meta/review-freeze/round-10.1.review-freeze.json'].join('\n');
function assertStep(text) {
  const parts = text.split(`      - name: ${name}\n`);
  assert.equal(parts.length, 2, 'exactly one unconditional Round 10.1 receipt check');
  assert.equal(parts[1].split('\n      - name:')[0].trim(), expected);
}
const bytes = readFileSync(new URL('../../meta/review-freeze/round-10.1.review-freeze.json', import.meta.url));
const receipt = JSON.parse(bytes);
function assertReceipt(value) {
  assert.equal(value.freeze_hash, 'sha256:bcaf0729a5a5f0b4137ac4df37cfcac8c19d2c931aac5abd06e94ba273a3e318');
  assert.equal(value.freeze_id, 'round-10.review-inputs.6aa7a0c9-0376-424b-804d-a0836b7b4d4e');
  assert.equal(value.schema_version, '1.1.0');
  assert.equal(value.review_target.commit, '05073cdb80eb1d834aff9a06e35670a9c58af4e5');
  assert.equal(value.review_target.tree, 'e7d272c4ef64656dcad18d7a8ad165c388b49874');
  assert.equal(value.reproduction.status, 'passed');
  assert.equal(value.required_files.length, 243);
  assert.equal(value.reproduction.command_runs.length, 43);
  assert.deepEqual(value.reproduction.changed_tracked_paths, []);
  assert.deepEqual(value.reproduction.unexpected_paths, []);
}
test('Round 10.1 seal adds an exact unconditional receipt check', () => assertStep(workflow));
test('Round 10.1 seal pins exact candidate, execution identity and receipt bytes', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '3c4b41d660901c83f73802be9aaabf958c21f26857eaef5fcd7e85e907a6475e');
  assertReceipt(receipt);
  const full = receipt.reproduction.command_runs.find(x => x.command_id === 'full-test-suite');
  const output = Buffer.from(full.stdout.bytes_base64, 'base64').toString();
  const counts = [...output.matchAll(/^# tests (\d+)$/gm)].map(x => Number(x[1]));
  assert.equal(counts.length, 18);
  assert.equal(counts.reduce((a, b) => a + b, 0), 1171);
  assert.doesNotMatch(output, /^# (?:fail|skipped|cancelled|todo) [1-9]\d*$/m);
});
test('Round 10.1 seal rejects substituted receipt identity or target', () => {
  for (const mutate of [x => x.freeze_hash = 'sha256:' + '0'.repeat(64),
    x => x.freeze_id = 'round-10.review-inputs', x => x.schema_version = '1.0.0',
    x => x.review_target.commit = '0'.repeat(40), x => x.reproduction.status = 'failed']) {
    const changed = structuredClone(receipt); mutate(changed);
    assert.throws(() => assertReceipt(changed));
  }
});
test('Round 10.1 seal rejects omitted, duplicate, conditional and failure-tolerant checks', () => {
  assertStep(workflow);
  for (const value of ['--policy=round-09', '--policy=round-10 || true', '--policy=round-10 --allow-failed-reproduction']) {
    assert.throws(() => assertStep(workflow.replace(expected, expected.replace('--policy=round-10', value))));
  }
  for (const field of ['        if: false\n', '        continue-on-error: true\n']) {
    assert.throws(() => assertStep(workflow.replace(`${name}\n`, `${name}\n${field}`)));
  }
  assert.throws(() => assertStep(workflow.replace(name, 'Omitted')));
  assert.throws(() => assertStep(workflow + `\n      - name: ${name}\n        ${expected}\n`));
  assert.throws(() => assertStep(workflow.replace('--manifest=meta/review-freeze/round-10.1.review-freeze.json', '--manifest=meta/review-freeze/round-09.review-freeze.json')));
});
