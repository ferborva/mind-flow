import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
const workflow = readFileSync(new URL('../../.github/workflows/integrity.yml', import.meta.url), 'utf8');
const name = 'Verify the retained Round 9.1 repair receipt';
const expected = [
  'run: >-',
  '          node meta/review-freeze/review-freeze.mjs verify',
  '          --policy=round-09.1',
  '          --manifest=meta/review-freeze/round-09.1.review-freeze.json',
].join('\n');
function assertRepairReceipt(text) {
  const step = text.split(`      - name: ${name}\n`)[1]?.split('\n      - name:')[0];
  assert.ok(step, 'Round 09.1 receipt verification is required');
  assert.equal(step.trim(), expected, 'use exact unconditional normal verification');
}
test('the Round 09.1 seal verifies its distinct receipt without weakening old checks', () => assertRepairReceipt(workflow));
function assertCanonicalReceipt(receipt) {
  assert.equal(receipt.freeze_hash, 'sha256:489204811340cbc49466ac6b198a509550cffaf8e1eb4dee71db47561b8cf024');
  assert.equal(receipt.review_target.commit, '84456bbb2a2355a93e98db69e661928dd6593801');
  assert.equal(receipt.reproduction.status, 'passed');
}
test('the canonical Round 09.1 seal pins the accepted freeze hash directly', () => {
  const receipt = JSON.parse(readFileSync(new URL('../../meta/review-freeze/round-09.1.review-freeze.json', import.meta.url)));
  assertCanonicalReceipt(receipt);
  assert.throws(() => assertCanonicalReceipt({ ...receipt, freeze_hash: 'sha256:f48fe292c080e34b28cd691cce14047016339df4cc9f434ea3b8ff6b091d6b9a' }));
  assert.throws(() => assertCanonicalReceipt({ ...receipt, reproduction: { status: 'failed' } }));
});
test('Round 09.1 seal rejects skipped, substituted and failure-tolerant receipt verification', () => {
  assertRepairReceipt(workflow);
  for (const replacement of ['--policy=round-09', '--policy=round-09.1 || true',
    '--policy=round-09.1 --allow-failed-reproduction']) {
    assert.throws(() => assertRepairReceipt(workflow.replace('--policy=round-09.1', replacement)));
  }
  for (const field of ['        if: false\n', '        continue-on-error: true\n']) {
    assert.throws(() => assertRepairReceipt(workflow.replace(`      - name: ${name}\n`, `      - name: ${name}\n${field}`)));
  }
  assert.throws(() => assertRepairReceipt(workflow.replace(name, 'Omitted receipt')));
  assert.throws(() => assertRepairReceipt(workflow.replace(
    '--manifest=meta/review-freeze/round-09.1.review-freeze.json',
    '--manifest=meta/review-freeze/round-09.review-freeze.json')));
});

test('the blocked network attempt stays disclosed and normal verification refuses to admit it', () => {
  const root = new URL('../../', import.meta.url);
  const path = 'meta/review-freeze/round-09.1.network-blocked.review-freeze.json';
  const receipt = JSON.parse(readFileSync(new URL(path, root)));
  assert.equal(receipt.freeze_hash, 'sha256:f48fe292c080e34b28cd691cce14047016339df4cc9f434ea3b8ff6b091d6b9a');
  assert.equal(receipt.review_target.commit, '84456bbb2a2355a93e98db69e661928dd6593801');
  assert.equal(receipt.reproduction.status, 'failed');
  assert.equal(receipt.creator_reported_local_reproduction_passed, false);
  assert.match(readFileSync(new URL('reviews/round-09.1-handoff.md', root), 'utf8'), new RegExp(receipt.freeze_hash));
  const result = spawnSync(process.execPath, ['meta/review-freeze/review-freeze.mjs', 'verify',
    '--policy=round-09.1', `--manifest=${path}`], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /integrity verified, but reproduction did not pass: failed/);
});
