import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const sha256 = (bytes: Uint8Array) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const sourcePath = 'signals/countries/sources/capability-2026-09-10-r2';
const base = new URL('./sources/capability-2026-09-10-r2/', import.meta.url);
type Observation = { country: string; year: number; value: number | null; source_selector: string; observation_status: string };
function unique(rows: Observation[]) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.country}/${row.year}`;
    if (seen.has(key)) throw new Error('duplicate country-year');
    seen.add(key);
  }
  return rows;
}
export function extractInternet(payload: any): Observation[] {
  const [meta, rows] = payload;
  if (meta?.page !== 1 || meta.pages !== 1 || meta.total !== rows?.length || meta.sourceid !== '2' || meta.lastupdated !== '2026-07-13') throw new Error('WDI pagination or vintage mismatch');
  return unique(rows.map((row: any, index: number) => {
    if (row.indicator?.id !== 'IT.NET.USER.ZS' || !/^\d{4}$/.test(row.date) || typeof row.countryiso3code !== 'string') throw new Error('native selector mismatch');
    if (row.value !== null && (typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value < 0 || row.value > 100)) throw new Error('native value outside percent domain');
    return { country: row.countryiso3code, year: Number(row.date), value: row.value, observation_status: row.obs_status,
      source_selector: `$[1][${index}]; indicator=IT.NET.USER.ZS; countryiso3code=${row.countryiso3code}; date=${row.date}` };
  }).filter((row: Observation) => row.country));
}
export function selectYear(rows: Observation[], countries: string[]) {
  if (countries.length !== 50 || new Set(countries).size !== 50) throw new Error('exact fifty unique country keys required');
  unique(rows);
  const years = [...new Set(rows.filter(row => row.year <= 2025).map(row => row.year))].sort((a, b) => b - a);
  const candidates = years.map(year => {
    const observations = rows.filter(row => row.year === year && row.value !== null && countries.includes(row.country));
    return { year, observations, coverage: observations.length };
  });
  const selected = candidates.find(year => year.coverage >= 40) ?? candidates[0] ?? { year: null, observations: [], coverage: 0 };
  return { ...selected, eligible: selected.coverage >= 40, missing: countries.filter(country => !selected.observations.some(row => row.country === country)),
    coverage_by_year: candidates.map(({ year, coverage }) => ({ year, coverage })) };
}
function retained(id: string, pin: string) {
  const body = readFileSync(new URL(`${id}.body`, base)), headers = readFileSync(new URL(`${id}.headers.txt`, base));
  const receipt = JSON.parse(readFileSync(new URL(`${id}.receipt.json`, base), 'utf8'));
  if (sha256(body) !== pin || sha256(body) !== receipt.body_sha256 || body.length !== receipt.body_byte_length || sha256(headers) !== receipt.headers_sha256) throw new Error('source bytes/headers changed');
  return { value: JSON.parse(body.toString('utf8')), receipt };
}
export function buildCandidate(countrySetBytes: Buffer) {
  const frame = JSON.parse(countrySetBytes.toString('utf8'));
  const countries = frame.countries.map((country: any) => country.iso3);
  const data = retained('internet', 'sha256:a99053f14f324e22f3276da1a846758d151c928acea355d665feab5d7a021b27');
  const metadata = retained('metadata', 'sha256:966c74f1028cd0550450edf2d59d76307fd97fc63b0fbd6c14a3eac4cd1989b5');
  const variables = metadata.value.source[0].concept[0].variable;
  if (metadata.value.source[0].id !== '2' || variables.length !== 1 || variables[0].id !== 'IT.NET.USER.ZS') throw new Error('metadata selector mismatch');
  const notes = Object.fromEntries(variables[0].metatype.map((entry: any) => [entry.id, entry.value]));
  if (notes.License_Type !== 'CC BY-4.0' || notes.Periodicity !== 'Annual' || notes.Unitofmeasure !== '% of population') throw new Error('licence/cadence/unit changed');
  const rows = extractInternet(data.value), selected = selectYear(rows, countries);
  return { id: 'capability-candidate.v1', provenance: 'commissioned-proposal', author: 'Ren', created: '2026-09-10',
    panel_admission: false, additional_breadth_gate_claimed: false,
    category_lens: 'capability', native_series: 'IT.NET.USER.ZS', publisher: 'World Bank WDI, underlying International Telecommunication Union (ITU)',
    vintage: 'WDI source 2 lastupdated 2026-07-13', cadence: 'Annual', unit: '% of population', domain: { minimum: 0, maximum: 100 },
    country_set: { file: 'signals/countries/country-set.v1.json', sha256: sha256(countrySetBytes) },
    selection_rule: 'Latest completed reference year <=2025 with at least40 of the proposed50 native economy codes, from this single retained WDI vintage; no per-country fallback or estimation by this producer.',
    evidence_ceiling: 'Recent internet-use participation proxy for capability context; not digital skill, disability-accessible use, reliable/affordable connectivity, compute availability, effective access to essential services, AI exposure or a binding-category diagnosis.',
    status_limit: 'Native observation flags retained. Empty flags do not prove actual-only data or exclude publisher estimates; cross-country quality and reporting periods vary.',
    missing_binding_series: 'Task-specific ability to obtain and use essential digital services, including device/connectivity affordability, literacy, disability accommodations and assisted access, matched to unmet need by household and region.',
    licence: { status: notes.License_Type, url: notes.License_URL, retained_evidence: `${sourcePath}/metadata.body`, required_attribution: notes.Othernotes },
    source: { file: `${sourcePath}/internet.body`, sha256: data.receipt.body_sha256, receipt: `${sourcePath}/internet.receipt.json`, metadata_receipt: `${sourcePath}/metadata.receipt.json` },
    source_metadata: notes, reference_year: selected.year, coverage: selected.coverage, coverage_denominator: 50,
    common_year_coverage_eligible: selected.eligible, missing_countries: selected.missing,
    coverage_by_year: selected.coverage_by_year, observations: selected.observations,
    retained_history: rows.filter(row => countries.includes(row.country) && row.year <= 2025),
    future_rows_retained_not_selected: rows.filter(row => countries.includes(row.country) && row.year > 2025).length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const countryPath = process.argv.find(arg => arg.startsWith('--country-set='))?.slice(14) ?? new URL('./country-set.v1.json', import.meta.url);
    const bytes = `${JSON.stringify(buildCandidate(readFileSync(countryPath)), null, 2)}\n`;
    const output = new URL('./capability-candidate.v1.json', import.meta.url);
    if (process.argv.includes('--check')) { if (readFileSync(output, 'utf8') !== bytes) throw new Error('candidate reproduction mismatch'); }
    else if (process.argv.includes('--write')) writeFileSync(output, bytes, { flag: 'wx' });
    else throw new Error('use --write for new output or --check');
    console.log('capability candidate retained-source reproduction passed');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
