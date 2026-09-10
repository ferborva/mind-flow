import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildRegressionControl } from '../tools/primary-care-layout-control.mjs';

const template = readFileSync(new URL('../../pilots/australia/web/index.template.html', import.meta.url), 'utf8');
const header = 'thead th{position:sticky';
const body = 'tbody th{font-size:inherit;font-weight:inherit;color:inherit;letter-spacing:normal}';

test('browser regression control actually reverses both repaired CSS rules', () => {
  const control = buildRegressionControl(template);
  assert.notEqual(control, template);
  assert.ok(control.includes('th{position:sticky'));
  assert.ok(!control.includes(header));
  assert.ok(!control.includes(body));
  assert.equal(control, template.replace(header, 'th{position:sticky').replace(body, ''));
});

test('browser control fails visibly on missing, changed or ambiguous anchors', () => {
  for (const anchor of [header, body]) {
    for (const input of [template.replace(anchor, ''), template.replace(anchor, anchor.replace('{', ' {')), template + anchor]) {
      assert.throws(() => buildRegressionControl(input), /LAYOUT_CONTROL_ANCHOR_MISMATCH/);
    }
  }
});

test('browser check uses the guarded control builder before launching Chromium', () => {
  const runner = readFileSync(new URL('../tools/check-primary-care-layout.mjs', import.meta.url), 'utf8');
  const assertRunner = source => {
    assert.match(source, /import \{ buildRegressionControl \} from '\.\/primary-care-layout-control\.mjs'/);
    assert.match(source, /const regressionControl = buildRegressionControl\(html\);/);
    assert.match(source, /const content = version === 'repaired' \? html : regressionControl;/);
    assert.ok(source.indexOf('buildRegressionControl(html)') < source.indexOf('puppeteer.launch('));
    assert.doesNotMatch(source, /\.replace\('thead th/);
  };
  assertRunner(runner);
  assert.throws(() => assertRunner(runner.replace('buildRegressionControl(html)', 'html')));
  assert.throws(() => assertRunner(runner.replace('? html : regressionControl', '? html : html')));
});
