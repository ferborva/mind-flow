import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { GENERATED_OUTPUTS } from '../../../meta/build-artifacts.mjs';
const root = new URL('../../../', import.meta.url);
test('canonical build and test contract includes every Round 11 research lane', () => {
  const pkg = JSON.parse(readFileSync(new URL('package.json', root)));
  assert.ok(GENERATED_OUTPUTS.includes('dashboard/station/data.js'));
  assert.match(pkg.scripts.test, /test:station/);
  assert.match(pkg.scripts['test:station'], /dashboard\/station\/tests/);
  assert.match(pkg.scripts['test:evolution'], /construct-migration/);
  assert.match(pkg.scripts['test:pilot'], /income-access/);
  assert.match(pkg.scripts['test:experience'], /decision-experience/);
  const builder = readFileSync(new URL('meta/build-artifacts.mjs', root), 'utf8');
  assert.match(builder, /sipp-crosswalk.mts/);
});
