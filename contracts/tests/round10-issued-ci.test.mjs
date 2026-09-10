import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/integrity.yml', import.meta.url), 'utf8');
const name = 'Verify the issued Canadian forecast without network or scoring';
const command = 'node forecasts/prospective-pilot/round-10-canada/issuance.mts --check';
function assertIssuedReplay(text) {
  const parts = text.split(`      - name: ${name}\n`);
  assert.equal(parts.length, 2, 'exactly one issued-record replay is required');
  assert.equal(parts[1].split('\n      - name:')[0].trim(), `run: ${command}`);
}
test('CI requires exact offline replay of the actual Canadian issued bundle', () => assertIssuedReplay(workflow));
test('Canadian issued replay rejects omission, duplication, skips and weaker commands', () => {
  assertIssuedReplay(workflow);
  for (const value of ['', `${command} || true`, command.replace('--check', '--help')]) {
    assert.throws(() => assertIssuedReplay(workflow.replace(command, value)));
  }
  for (const field of ['        if: false\n', '        continue-on-error: true\n']) {
    assert.throws(() => assertIssuedReplay(workflow.replace(`${name}\n`, `${name}\n${field}`)));
  }
  assert.throws(() => assertIssuedReplay(workflow.replace(name, 'Omitted')));
  assert.throws(() => assertIssuedReplay(workflow + `\n      - name: ${name}\n        run: ${command}\n`));
});
