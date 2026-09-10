import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const root = new URL('../../', import.meta.url);
const path = 'signals/countries/sources/imf-weo/2026-04/WEOApr2026all.xlsx';

test('the IMF workbook uses LFS while retaining the independently reviewed bytes', () => {
  const attributes = execFileSync('git', ['check-attr', 'filter', 'diff', 'merge', 'text', '--', path], { cwd: root, encoding: 'utf8' });
  for (const attribute of ['filter', 'diff', 'merge']) assert.ok(attributes.includes(`${path}: ${attribute}: lfs`), attributes);
  assert.ok(attributes.includes(`${path}: text: unset`));
  const bytes = readFileSync(new URL(path, root));
  assert.equal(bytes.length, 5585205);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b29239cb48f8b895d1e526070c4fde01147bc8f6bd3b86f636363bb6bd87fe7a');
});
