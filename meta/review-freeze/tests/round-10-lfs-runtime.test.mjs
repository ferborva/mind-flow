import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createReviewFreeze, verifyReviewFreeze, canonicalHash, reviewPolicyFor } from '../review-freeze.mjs';

test('Round 10 records Git LFS and executes its real clean/smudge roundtrip under the fixed narrow PATH', () => {
  // The desktop proxy shim emits a PID-bearing experimental warning from npm.
  // Suppress that host-only warning for exact version parity in this fixture.
  const warnings = process.env.NODE_NO_WARNINGS;
  process.env.NODE_NO_WARNINGS = '1';
  const root = mkdtempSync(join(tmpdir(), 'round10-lfs-runtime-'));
  const git = (...args) => execFileSync('git', args, { cwd: root });
  try {
    git('init', '--quiet');
    writeFileSync(join(root, 'package-lock.json'), '{}\n');
    writeFileSync(join(root, 'probe.mjs'), `import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import assert from 'node:assert/strict';
assert.equal(process.env.PATH.split(':').length, 1);
const storage=mkdtempSync(join(tmpdir(),'round10-lfs-objects-')); const bytes=Buffer.from('retained local LFS fixture');
try { const args=['-c','lfs.storage='+storage,'lfs']; const pointer=execFileSync('git',[...args,'clean','fixture.bin'],{input:bytes}); assert.match(pointer.toString(),/oid sha256:/); assert.deepEqual(execFileSync('git',[...args,'smudge','fixture.bin'],{input:pointer,env:{...process.env,GIT_LFS_SKIP_SMUDGE:'0'}}),bytes); console.log('real LFS roundtrip passed'); } finally { rmSync(storage,{recursive:true,force:true}); }
`);
    git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture');
    const policy = { ...reviewPolicyFor('round-10'), required_files: [{ path: 'probe.mjs', role: 'real LFS probe' }], generated_outputs: [], build_commands: [{ command_id: 'real-lfs', argv: ['node', 'probe.mjs'], cwd: '.' }] };
    const manifest = createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true });
    assert.equal(manifest.reproduction.status, 'passed', JSON.stringify(manifest.reproduction.command_runs));
    assert.equal(manifest.schema_version, '1.1.0');
    assert.match(manifest.runtime_inputs.git_lfs.version, /git-lfs/);
    assert.match(manifest.runtime_inputs.git_lfs.executable_sha256, /^sha256:[a-f0-9]{64}$/);
    assert.equal(manifest.generator.schema_path, 'meta/review-freeze/review-freeze.v1.1.schema.json');
    const verified = verifyReviewFreeze(manifest, { repositoryRoot: root, policy, requireRuntimeParity: true });
    assert.equal(verified.valid, true, JSON.stringify(verified.errors));
    const missing = structuredClone(manifest); delete missing.runtime_inputs.git_lfs;
    missing.freeze_hash = canonicalHash(Object.fromEntries(Object.entries(missing).filter(([key]) => key !== 'freeze_hash')));
    assert.ok(verifyReviewFreeze(missing, { repositoryRoot: root, policy }).errors.some(x => x.code === 'FREEZE_SCHEMA_INVALID'));
    const wrong = structuredClone(manifest); wrong.runtime_inputs.git_lfs.executable_sha256 = 'sha256:' + '0'.repeat(64);
    wrong.freeze_hash = canonicalHash(Object.fromEntries(Object.entries(wrong).filter(([key]) => key !== 'freeze_hash')));
    assert.ok(verifyReviewFreeze(wrong, { repositoryRoot: root, policy, requireRuntimeParity: true }).errors.some(x => x.code === 'RUNTIME_INPUT_DRIFT'));
    const removedLink = createReviewFreeze({ repositoryRoot: root, policy: { ...policy, build_commands: [{ command_id: 'remove-lfs-link', argv: ['node', '-e', "require('node:fs').unlinkSync(require('node:path').join(process.env.PATH, 'git-lfs'))"], cwd: '.' }] }, executeCommands: true });
    assert.equal(removedLink.reproduction.status, 'failed');
    assert.equal(removedLink.reproduction.command_runs[0].runtime_controls_unchanged, false);
  } finally { rmSync(root, { recursive: true, force: true }); if (warnings === undefined) delete process.env.NODE_NO_WARNINGS; else process.env.NODE_NO_WARNINGS = warnings; }
});
