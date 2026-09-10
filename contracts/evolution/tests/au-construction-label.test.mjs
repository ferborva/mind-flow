import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { projectExecutableIfEvolution, validateExecutableIfEvolution } from '../project-executable-if.mjs';

const bytes = readFileSync(new URL('../../../pilots/australia/basket/primary-care.kernel.current.json', import.meta.url));
const kernel = JSON.parse(bytes);
const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');

test('AU ledger exposes its exact construction prefix, not twelve empirical changes', () => {
  const ledger = projectExecutableIfEvolution(kernel, {
    artifact_path: 'pilots/australia/basket/primary-care.kernel.current.json',
    artifact_sha256: digest, generated_at: kernel.events.at(-1).recorded_at,
    ledger_id: 'ledger.au.primary-care.current',
  });
  assert.match(ledger.public_projection.history.notice, /Events 1 to 11 are construction replay/);
  assert.match(ledger.public_projection.history.notice, /not eleven observed changes/);
  assert.equal(validateExecutableIfEvolution(ledger, { sourceKernel: kernel, sourceKernelArtifactSha256: digest }).ledger_valid, true);
  const retained = JSON.parse(readFileSync(new URL('../fixtures/australia-primary-care.current.json', import.meta.url)));
  assert.match(retained.public_projection.history.notice, /Events 1 to 11 are construction replay/);
  const readme = readFileSync(new URL('../../../pilots/australia/basket/README.md', import.meta.url), 'utf8');
  assert.match(readme, /Events 1 to 11 are construction replay/);
  const other = projectExecutableIfEvolution(kernel, {
    artifact_path: 'pilots/australia/basket/primary-care.kernel.current.json',
    artifact_sha256: digest, generated_at: kernel.events.at(-1).recorded_at,
    ledger_id: 'ledger.other',
  });
  assert.doesNotMatch(other.public_projection.history.notice, /Events 1 to 11/);
});
