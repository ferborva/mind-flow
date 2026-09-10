import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { reviewPolicyFor } from '../review-freeze.mjs';

test('freeze CLI documents the new policy and retains the shock-source replay', () => {
  const result = spawnSync(process.execPath, [new URL('../review-freeze.mjs', import.meta.url).pathname, '--help'], { encoding: 'utf8' });
  assert.match(result.stdout + result.stderr, /round-09\.1\|round-10/);
  assert.deepEqual(reviewPolicyFor('round-10').build_commands.find(x => x.command_id === 'round-10-shock-context-check')?.argv,
    ['node', 'signals/countries/tools/shock-context.mts', '--check']);
});

test('commissioned receipt decision expires and does not substitute a sampled rerun for full review', () => {
  const decision = readFileSync(new URL('../../../reviews/round-10-receipt-trust-decision.md', import.meta.url), 'utf8');
  assert.match(decision, /commissioned-proposal/);
  assert.match(decision, /2026-09-16 review/);
  assert.match(decision, /not Fernando's formal approval/);
  assert.match(decision, /Before merge,[\s\S]*independent[\s\S]*rerun \*\*all\*\*/);
  assert.match(decision, /single-command rerun[\s\S]*cannot prove the rest of the transcript/);
  assert.match(decision, /Literal request remains unmet pending Fernando/);
});

test('Round 10 adds a distinct policy without changing prior command contracts', () => {
  const historical = ['round-04', 'round-06', 'round-07', 'round-08', 'round-09-initial', 'round-09', 'round-09.1'];
  const before = historical.map(id => JSON.stringify(reviewPolicyFor(id)));
  const policy = reviewPolicyFor('round-10');
  assert.equal(policy.policy_id, 'review-freeze.round-10');
  assert.equal(policy.review_round, 'round-10');
  assert.equal(policy.reviewed_ref, 'ren/round-10');
  assert.equal(policy.policy_version, '1.0.0');
  assert.deepEqual(historical.map(id => JSON.stringify(reviewPolicyFor(id))), before);
  assert.deepEqual(policy.build_commands.slice(0, reviewPolicyFor('round-09.1').build_commands.length), reviewPolicyFor('round-09.1').build_commands);
  assert.equal(new Set(policy.required_files.map(item => item.path)).size, policy.required_files.length);
  assert.equal(new Set(policy.build_commands.map(item => item.command_id)).size, policy.build_commands.length);
});

test('Round 10 binds exact independent replay commands and cannot substitute a weaker command', () => {
  const policy = reviewPolicyFor('round-10');
  const expected = new Map([
    ['round-10-income-check', ['node', 'signals/countries/tools/income-measurements.mts', '--check']],
    ['round-10-storm-check', ['node', 'signals/countries/tools/storm-criterion.mts', '--check']],
    ['round-10-depth-check', ['node', 'pilots/australia/tools/round-10-nero-retrospective.mts', '--check']],
    ['round-10-receipt-boundary-check', ['node', '--test', 'meta/review-freeze/tests/round-10-policy.test.mjs']],
    ['round-09.1-receipt-check', ['node', 'meta/review-freeze/review-freeze.mjs', 'verify', '--policy=round-09.1', '--manifest=meta/review-freeze/round-09.1.review-freeze.json']],
  ]);
  const check = candidate => {
    for (const [id, argv] of expected) {
      const command = candidate.build_commands.find(item => item.command_id === id);
      assert.deepEqual(command?.argv, argv);
      assert.equal(command.cwd, '.');
      assert.equal(command.timeout_ms, 900_000);
    }
  };
  check(policy);
  for (const id of expected.keys()) {
    const changed = structuredClone(policy);
    changed.build_commands.find(item => item.command_id === id).argv.pop();
    assert.throws(() => check(changed));
  }
  const paths = new Set(policy.required_files.map(item => item.path));
  for (const path of ['meta/round-10-external-review-brief.md', 'reviews/round-10-receipt-trust-decision.md',
    'signals/countries/income-measurements.v1.json', 'signals/countries/storm-criterion.v1.md',
    'signals/countries/tools/storm-criterion.mts', 'pilots/australia/data/round-10-nero-retrospective.json',
    'reviews/round-10-australia-depth.md', 'reviews/name-the-if-sign-off.md',
    'reviews/round-10-narrative-provenance.md', 'reviews/round-10-hygiene.md']) assert.ok(paths.has(path), path);
});
