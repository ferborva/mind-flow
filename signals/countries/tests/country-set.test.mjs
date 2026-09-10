import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readWeoCountries, rankCountries, deriveCountrySet } from '../tools/country-set.mts';

test('retained April 2026 countries sheet ranks nominal USD GDP in 2025 only', () => {
  const rows = readWeoCountries();
  const ranked = rankCountries(rows);
  assert.equal(ranked.countries.length, 50);
  assert.equal(ranked.countries[0].iso3, 'USA');
  assert.equal(ranked.countries[1].iso3, 'CHN');
  assert.ok(ranked.countries.every(c => c.year === 2025 && c.source_cell.startsWith('BW')));
  assert.equal(new Set(ranked.countries.map(c => c.iso3)).size, 50);
  assert.ok(ranked.countries.every((c, i, a) => i === 0 || a[i - 1].gdp_current_usd_billions >= c.gdp_current_usd_billions));
});

test('ranking rejects duplicate native cells, wrong units and malformed values', () => {
  const rows = readWeoCountries().filter(r => r['INDICATOR.ID'] === 'NGDPD');
  assert.throws(() => rankCountries([...rows, rows[0]]), /duplicate/);
  for (const patch of [{ UNIT: 'Domestic currency' }, { SCALE: 'Millions' }, { '2025': 'Infinity' }, { '2025': '-1' }]) {
    assert.throws(() => rankCountries([{ ...rows[0], ...patch }, ...rows.slice(1)]), /unit|value/);
  }
});

test('missing country values are not zero or silently backfilled; ties use ISO3', () => {
  const rows = readWeoCountries().filter(r => r['INDICATOR.ID'] === 'NGDPD');
  const source = rows[0];
  const result = rankCountries(rows.map(r => r === source ? { ...r, '2025': '' } : r));
  assert.ok(result.excluded.some(c => c.iso3 === source['COUNTRY.ID'] && c.reason === 'missing-2025-NGDPD'));
  const tied = rows.map(r => ({ ...r, '2025': '1' }));
  const ids = rankCountries(tied).countries.map(c => c.iso3);
  assert.deepEqual(ids, rows.map(r => r['COUNTRY.ID']).sort().slice(0, 50));
});

test('checked-in commissioned proposal reproduces from retained source bytes', () => {
  const actual = JSON.parse(readFileSync(new URL('../country-set.v1.json', import.meta.url)));
  assert.deepEqual(actual, deriveCountrySet());
  assert.equal(actual.provenance, 'commissioned-proposal');
  assert.equal(actual.fernando_chose_ranking, false);
  assert.equal(actual.panel_admission, false);
  assert.equal(actual.ranking.reference_year, 2025);
  assert.ok(actual.ranking.estimate_warning.includes('estimates'));
});
