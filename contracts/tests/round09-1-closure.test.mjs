import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const workflow = read('.github/workflows/integrity.yml');
const stepName = 'Check the current Round 09 forecast error disclosure';
const command = 'node forecasts/prospective-pilot/round-09-nero/check-error-disclosure.mjs';
function assertDisclosureStep(text) {
  const parts = text.split(`      - name: ${stepName}\n`);
  assert.equal(parts.length, 2, 'exactly one disclosure step is required');
  assert.equal(parts[1].split('\n      - name:')[0].trim(), `run: ${command}`);
}

test('CI directly runs the read-only disclosure checker without overrides', () => assertDisclosureStep(workflow));
test('disclosure CI gate rejects omission, duplication, skips and failure tolerance', () => {
  assertDisclosureStep(workflow);
  for (const replacement of ['', `${command} || true`, `${command} --override`]) {
    assert.throws(() => assertDisclosureStep(workflow.replace(command, replacement)));
  }
  for (const field of ['        if: false\n', '        continue-on-error: true\n']) {
    assert.throws(() => assertDisclosureStep(workflow.replace(`${stepName}\n`, `${stepName}\n${field}`)));
  }
  assert.throws(() => assertDisclosureStep(workflow.replace(stepName, 'Omitted')));
  assert.throws(() => assertDisclosureStep(workflow + `\n      - name: ${stepName}\n        run: ${command}\n`));
});

const pins = [
  ['round-09.1.attempt.network-blocked', 'meta/review-freeze/round-09.1.network-blocked.review-freeze.json', 'failed',
    'sha256:f48fe292c080e34b28cd691cce14047016339df4cc9f434ea3b8ff6b091d6b9a',
    'sha256:2540bf8b428b14f246eb712c3478e43155f446a373f468e94d4c36b56e5cb0cb'],
  ['round-09.1.attempt.network-authorised', 'meta/review-freeze/round-09.1.review-freeze.json', 'passed',
    'sha256:489204811340cbc49466ac6b198a509550cffaf8e1eb4dee71db47561b8cf024',
    'sha256:319f46de4535c79609330c8d1da3a53d79e576c4824bd090eb7f7664b43f0a97'],
];
function assertAttemptIndex(index) {
  assert.deepEqual(index, {
    schema_version: '1.0.0',
    input_freeze_id: 'round-09.1.review-inputs',
    accepted_attempt_id: 'round-09.1.attempt.network-authorised',
    attempts: pins.map(([attempt_id, manifest, reproduction_status, freeze_hash, receipt_sha256]) =>
      ({ attempt_id, manifest, reproduction_status, freeze_hash, receipt_sha256 })),
  });
}
test('attempt identities distinguish executions and pin both original receipts, including the accepted freeze hash', () => {
  const index = JSON.parse(read('meta/review-freeze/round-09.1.attempts.json'));
  assertAttemptIndex(index);
  for (const [, path, status, freezeHash, byteHash] of pins) {
    const bytes = read(path);
    assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, byteHash);
    const receipt = JSON.parse(bytes);
    assert.equal(receipt.freeze_hash, freezeHash);
    assert.equal(receipt.freeze_id, index.input_freeze_id);
    assert.equal(receipt.reproduction.status, status);
    assert.equal(receipt.review_target.commit, '84456bbb2a2355a93e98db69e661928dd6593801');
  }
});
test('attempt index rejects relabelled success, hash substitution and duplicate identity', () => {
  const index = JSON.parse(read('meta/review-freeze/round-09.1.attempts.json'));
  assertAttemptIndex(index);
  for (const field of ['attempt_id', 'manifest', 'reproduction_status', 'freeze_hash', 'receipt_sha256']) {
    const changed = structuredClone(index);
    changed.attempts[1][field] = changed.attempts[0][field];
    assert.throws(() => assertAttemptIndex(changed));
  }
  assert.throws(() => assertAttemptIndex({ ...index, accepted_attempt_id: index.attempts[0].attempt_id }));
});

test('Round 06 workflow label agrees with its retained policy identity', () => {
  assert.match(workflow, /name: Verify the retained Round 06 review receipt\n/);
  assert.doesNotMatch(workflow, /name: Verify the retained Round 6 review receipt\n/);
});
