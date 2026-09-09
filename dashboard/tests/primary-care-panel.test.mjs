import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformPrimaryCare } from '../tools/primary-care-panel.mts';
import { validateTimingRule, assessPointTiming } from '../timing/validation.mjs';

test('financial-year timing uses June end rather than December end', () => {
  const rule = { kind: 'external_dataset', reference_period_kind: 'australian_financial_year_ending', max_reference_lag_days: 366, release_cadence: { kind: 'unknown', reason: 'Annual source, exact next release unknown' } };
  assert.equal(validateTimingRule(rule).valid, true);
  assert.equal(assessPointTiming({ point: { year: 2025, epistemic_class: 'published_estimate' }, timing: {}, rule, asOf: '2026-09-09T10:00:00Z' }).reference_coverage, 'outside_policy_window');
});
test('changed health estimate is rejected even with legacy globally unpinned macro inputs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'primary-care-panel-'));
  try {
    const snapshot = JSON.parse(readFileSync(new URL('../snapshots/2026-09-09.r1.json', import.meta.url)));
    const signal = snapshot.signals.find(s => s.id === 'au-gp-cost-delay');
    signal.series.find(s => s.entity === 'NSW').points.at(-1)[1] = 0;
    signal.latest.value = 0;
    const path = join(dir, 'changed.json'); writeFileSync(path, JSON.stringify(snapshot));
    assert.throws(() => execFileSync(process.execPath, ['dashboard/tools/build.mjs', path, join(dir, 'output.html')], { encoding: 'utf8', stdio: 'pipe' }), /retained primary-care transform/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('primary care extraction separates NSW from Australia and rejects unknown series', () => {
  const result = transformPrimaryCare('au-gp-cost-delay');
  assert.equal(result.find(s => s.entity === 'NSW').points.at(-1)[1], 7.2);
  assert.equal(result.find(s => s.entity === 'AUS').points.at(-1)[1], 7.7);
  assert.throws(() => transformPrimaryCare('concentration'), /unsupported/);
});
