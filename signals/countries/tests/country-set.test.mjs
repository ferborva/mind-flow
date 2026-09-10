import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readWeoCountries, rankCountries, deriveCountrySet, sha256 } from '../tools/country-set.mts';

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

test('a valid country code cannot borrow another native series or non-GDP description', () => {
  const rows = readWeoCountries().filter(r => r['INDICATOR.ID'] === 'NGDPD');
  for (const patch of [{ SERIES_CODE: 'USA.NGDPD.A' }, { INDICATOR: 'GDP per capita' }]) {
    assert.throws(() => rankCountries([{ ...rows[0], ...patch }, ...rows.slice(1)]), /series|indicator/);
  }
});

test('published cell checks anchor the inclusion boundary and named missing values', () => {
  const result = rankCountries(readWeoCountries());
  assert.equal(result.eligible_count, 193);
  assert.deepEqual(result.cutoff_comparison.map(c => [c.rank, c.iso3, c.source_cell, c.source_value]), [
    [50, 'KAZ', 'BW5769', '302.74599999999998'],
    [51, 'NGA', 'BW8101', '290.49099999999999'],
    [52, 'DZA', 'BW5329', '285.72399999999999'],
  ]);
  assert.deepEqual(result.excluded.map(c => c.iso3).sort(), ['ERI', 'LKA', 'SYR', 'WBG']);
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

test('failed licence acquisitions remain hashed evidence, not an open licence', () => {
  const base = new URL('../sources/imf-weo/2026-04/', import.meta.url);
  const review = JSON.parse(readFileSync(new URL('licence-review.json', base)));
  assert.equal(review.retained_terms_body, false);
  for (const failure of review.failed_acquisitions) {
    const headers = readFileSync(new URL(failure.headers_file, base));
    assert.equal(sha256(headers), failure.headers_sha256);
    assert.match(headers.toString('utf8'), /HTTP\/2 403/);
    assert.equal(failure.body_retained, false);
  }
});
