import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractInternet, selectYear, buildCandidate } from './capability-candidate.mts';
const keys = Array.from({ length: 50 }, (_, i) => `X${String(i).padStart(2, '0')}`);
const rows = keys.map(country => ({ country, year: 2024, value: 50, source_selector: 'fixture', observation_status: '' }));
test('same-year coverage is distinct countries, no mixed-year fallback or null-as-zero', () => {
  assert.equal(selectYear(rows, keys).coverage, 50);
  assert.throws(() => selectYear([...rows, rows[0]], keys), /duplicate/);
  const sparse = rows.map((r, i) => ({ ...r, year: i < 39 ? 2025 : 2024 }));
  assert.equal(selectYear(sparse, keys).eligible, false);
  assert.equal(selectYear(sparse, keys).coverage, 39);
  assert.equal(selectYear(rows.map((r, i) => ({ ...r, value: i < 11 ? null : 50 })), keys).eligible, false);
});
test('native extraction rejects vintage, pagination, indicator, domain and duplicate drift', () => {
  const meta = { page: 1, pages: 1, total: 1, sourceid: '2', lastupdated: '2026-07-13' };
  const native = { countryiso3code: 'USA', date: '2024', value: 95, indicator: { id: 'IT.NET.USER.ZS' }, obs_status: '' };
  assert.equal(extractInternet([meta, [native]])[0].value, 95);
  for (const value of [NaN, Infinity, -1, 101, '95']) assert.throws(() => extractInternet([meta, [{ ...native, value }]]));
  for (const patch of [{ pages: 2 }, { lastupdated: '2026-08-01' }, { sourceid: '1' }]) assert.throws(() => extractInternet([{ ...meta, ...patch }, [native]]));
  assert.throws(() => extractInternet([{ ...meta, total: 2 }, [native, native]]), /duplicate/);
  assert.throws(() => extractInternet([meta, [{ ...native, indicator: { id: 'EG.ELC.ACCS.ZS' } }]]));
});
test('retained candidate reconstructs and keeps capability evidence ceiling', () => {
  const path = process.env.COUNTRY_SET_PATH ?? new URL('./country-set.v1.json', import.meta.url);
  const output = buildCandidate(readFileSync(path));
  assert.deepEqual(output, JSON.parse(readFileSync(new URL('./capability-candidate.v1.json', import.meta.url))));
  assert.equal(output.provenance, 'commissioned-proposal');
  assert.equal(output.panel_admission, false);
  assert.match(output.evidence_ceiling, /not digital skill/);
  assert.equal(output.licence.status, 'CC BY-4.0');
  assert.equal(output.reference_year, 2024);
  assert.equal(output.coverage, 49);
  assert.deepEqual(output.missing_countries, ['TWN']);
  assert.deepEqual(output.coverage_by_year[0], { year: 2025, coverage: 6 });
  assert.equal(output.observations.find(row => row.country === 'AUS').value, 96.13140106);
  assert.equal(output.observations.find(row => row.country === 'IND').value, 64.9434967);
  assert.equal(output.observations.find(row => row.country === 'USA').value, 94.69380188);
});
