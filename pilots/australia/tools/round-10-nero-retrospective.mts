import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowsFromZip } from '../../../dashboard/tools/build-nero-baseline.mjs';

type Row = { occupation_code: string; occupation_name: string; state_name: string; sa4_code: string; sa4_name: string; date: string; value: number; source_row: number };
type Observation = { iso3: string; year: number; value: number; source_selector: string; estimation_type: string; estimate_type: string };
type Family = { id: string; source_id: string; denominator: string; condition_category: string; vintage: string; observations: Observation[] };
const root = resolve(import.meta.dirname, '../../..');
const occupations = ['5311', '5411', '5511', '5512', '5513'];
const archivePath = 'pilots/australia/sources/nero/2026-08/2026-08_nero.zip';
const capturePath = 'pilots/australia/sources/nero/2026-08/capture.json';
const incomePath = 'signals/countries/income-measurements.v1.json';
const gpPath = 'pilots/australia/data/primary-care-2026-09-10.json';
const outputPath = 'pilots/australia/data/round-10-nero-retrospective.json';
const sha = (bytes: string | Buffer) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const rounded = (value: number) => Math.round(value * 1e6) / 1e6;
function month(date: string) {
  const match = /^(\d{4})-(\d{2})-15$/.exec(date);
  if (!match || +match[2] < 1 || +match[2] > 12) throw Error('NERO_INVALID_DATE');
  return +match[1] * 12 + +match[2] - 1;
}
function change(before: Row, after: Row) {
  return { from: before.date, to: after.date, before: before.value, after: after.value,
    net_employment_change: after.value - before.value,
    native_stock_percent_change: before.value === 0 ? null : rounded(100 * (after.value - before.value) / before.value),
    source_rows: [before.source_row, after.source_row] };
}
function cannotAssessStorm() {
  return { state: 'cannot-say', disrupted_people: null, dependent_household_members: null,
    disrupted_share_change_percentage_points: null, binding_category_change: null,
    reasons: ['Native modelled employment stocks do not identify gross disruption of income routes.',
      'No matched total-population denominator or dependent-household mapping.',
      'No observation establishes a change in which condition category binds income access.'] };
}

export function analyseNativeSeries(rows: Row[]) {
  if (!rows.length) throw Error('NERO_NO_SELECTED_ROWS');
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    month(row.date);
    if (!occupations.includes(row.occupation_code) || row.state_name !== 'NSW' || !/^1\d\d$/.test(row.sa4_code) ||
      typeof row.value !== 'number' || !Number.isFinite(row.value) || row.value < 0 || !row.occupation_name || !row.sa4_name) throw Error('NERO_INVALID_SCOPE_OR_VALUE');
    const key = `${row.occupation_code}:${row.sa4_code}`;
    const group = groups.get(key) ?? [];
    if (group.length && (group[0].occupation_name !== row.occupation_name || group[0].sa4_name !== row.sa4_name)) throw Error('NERO_IDENTITY_DRIFT');
    group.push({ ...row }); groups.set(key, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, points]) => {
    points.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < points.length; i++) if (month(points[i].date) !== month(points[i - 1].date) + 1) throw Error(`NERO_NONCONTIGUOUS_OR_DUPLICATE:${key}`);
    const monthly = points.slice(1).map((point, i) => change(points[i], point));
    const annual = points.slice(12).map((point, i) => change(points[i], point));
    const fixed = (from: string, to: string) => {
      const a = points.find(point => point.date === from), b = points.find(point => point.date === to);
      return a && b ? change(a, b) : null;
    };
    const minimum = (changes: ReturnType<typeof change>[]) => changes.filter(point => point.net_employment_change < 0).sort((a, b) => a.net_employment_change - b.net_employment_change || a.to.localeCompare(b.to))[0] ?? null;
    return { occupation_code: points[0].occupation_code, occupation_name: points[0].occupation_name,
      sa4_code: points[0].sa4_code, sa4_name: points[0].sa4_name, state_name: 'NSW',
      observation_count: points.length, first: points[0].date, last: points.at(-1)!.date,
      monthly_changes: monthly, negative_months: monthly.filter(point => point.net_employment_change < 0).length,
      largest_monthly_net_decline: minimum(monthly), largest_annual_net_decline: minimum(annual),
      calendar_2020: fixed('2019-12-15', '2020-12-15'), early_2020: fixed('2020-02-15', '2020-05-15'),
      storm_assessment: cannotAssessStorm() };
  });
}

export function assessGpJoin(income: { families: Family[] }) {
  if (!Array.isArray(income.families) || !income.families.length) throw Error('INCOME_FAMILIES_REQUIRED');
  return { geography: 'Central Coast, NSW, SA4 102', service: 'GP consultation', state: 'cannot-say', binding_category: null,
    rows: income.families.map(family => {
      const points = family.observations.filter(point => point.iso3 === 'AUS').sort((a, b) => a.year - b.year);
      if (new Set(points.map(point => point.year)).size !== points.length) throw Error('INCOME_DUPLICATE_COUNTRY_YEAR');
      if (points.some(point => !Number.isInteger(point.year) || !Number.isFinite(point.value))) throw Error('INCOME_INVALID_OBSERVATION');
      return { family_id: family.id, source_id: family.source_id, proposed_category: family.condition_category,
        source_vintage: family.vintage, denominator: family.denominator, national_observations: points.length,
        latest_national: points.at(-1) ?? null, geography_join: 'not-joinable',
        missing: ['SA4-specific GP access and income observations for the same people',
          'Matched current consultation, eligibility, full cost, travel, bookable capacity and navigation support',
          'Monthly or aligned observation period; annual national values cannot identify the August 2026 SA4 route',
          'Gross income-route disruption and household-dependant mapping; national stock/rate does not supply either'],
        income_route_disrupted_people: null, dependent_household_members: null, binding_category: null };
    }) };
}

export async function deriveRetrospective(incomeRoot = root) {
  const captureBytes = readFileSync(resolve(root, capturePath));
  const capture = JSON.parse(captureBytes.toString());
  const archive = readFileSync(resolve(root, archivePath));
  const expected = 'sha256:a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446';
  if (sha(archive) !== expected || capture.artifacts.find((a: { role: string }) => a.role === 'archive')?.sha256 !== expected) throw Error('NERO_SOURCE_HASH_MISMATCH');
  const header = capture.artifacts.find((a: { role: string }) => a.role === 'archive-response-headers');
  if (!header || sha(readFileSync(resolve(root, 'pilots/australia', header.path))) !== header.sha256) throw Error('NERO_HEADERS_HASH_MISMATCH');
  const selected: Row[] = [];
  let readCount = 0;
  // Full stream consumption checks the retained CSV CRC and declared size.
  for await (const fields of await rowsFromZip(resolve(root, archivePath))) {
    readCount++;
    if (fields[1] !== 'NSW' || !occupations.includes(fields[4])) continue;
    if (!/^\d+(?:\.\d+)?$/.test(fields[7])) throw Error('NERO_INVALID_NATIVE_NUMBER');
    selected.push({ state_name: fields[1], sa4_code: fields[2], sa4_name: fields[3], occupation_code: fields[4],
      occupation_name: fields[5], date: fields[6], value: Number(fields[7]), source_row: readCount + 1 });
  }
  const series = analyseNativeSeries(selected);
  if (readCount !== 4123680 || series.length !== 140 || selected.length !== 18480 || series.some(s => s.observation_count !== 132 || s.first !== '2015-09-15' || s.last !== '2026-08-15')) throw Error('NERO_RETAINED_PANEL_SHAPE_CHANGED');
  const incomeBytes = readFileSync(resolve(incomeRoot, incomePath));
  const income = JSON.parse(incomeBytes.toString());
  const gpBytes = readFileSync(resolve(root, gpPath));
  const gp = JSON.parse(gpBytes.toString());
  const gpPrice = gp.series.find((s: { id: string }) => s.id === 'gp-cost-delay');
  return { id: 'round-10-nero-retrospective', provenance: 'commissioned-proposal', author: 'Ren', as_of: '2026-09-10',
    source: { capture_path: capturePath, capture_sha256: sha(captureBytes), archive_path: archivePath, archive_sha256: expected,
      headers_path: `pilots/australia/${header.path}`, headers_sha256: header.sha256,
      csv_member: '2026-08_nero/2026-08_shiny_df.csv',
      csv_rows_consumed: readCount, selector: { state_name: 'NSW', anzsco4_code: occupations, value: 'nsc_emp', date: 'date', identity: ['anzsco4_code', 'sa4_code'], source_row: 'one-based CSV line including header' },
      licence: capture.source.licence_claim, licence_review_status: capture.source.licence_review_status,
      scope: capture.source_native_scope, csv_crc_and_length_verified: true },
    interpretation: 'Native net stock changes in one August 2026 model vintage. No sums across occupations or regions, gross disrupted shares, historical as-published values or forecast skill.',
    selected_series: series.length, selected_observations: selected.length,
    storm_assessment: cannotAssessStorm(),
    historical_windows: { '2008-2009': 'outside retained NERO date range; cannot evaluate', '2020': 'fixed calendar-year and February-to-May stock comparisons only; not a storm label or skill check' },
    series: series.map(({ monthly_changes, ...summary }) => summary),
    central_coast_general_clerks_monthly: series.find(s => s.sa4_code === '102' && s.occupation_code === '5311')!.monthly_changes,
    gp_context: { path: gpPath, sha256: sha(gpBytes), population: gpPrice.population,
      nsw_cost_delay: gpPrice.points.find((p: { geography: string; period: string }) => p.geography === 'NSW' && p.period === '2024-25'),
      limitation: gpPrice.evidence_ceiling },
    income_context: { path: incomePath, sha256: sha(incomeBytes), source_directory: income.source_directory, history: income.history },
    gp_join: assessGpJoin(income) };
}

export const serializeRetrospective = (data: Awaited<ReturnType<typeof deriveRetrospective>>) => '{\n' + Object.entries(data).map(([key, value]) =>
  `  ${JSON.stringify(key)}: ` + (Array.isArray(value)
    ? '[\n' + value.map(row => '    ' + JSON.stringify(row)).join(',\n') + '\n  ]'
    : JSON.stringify(value, null, 2).replaceAll('\n', '\n  '))).join(',\n') + '\n}\n';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const incomeArg = args.find(arg => arg.startsWith('--income-root='));
    if (args.some(arg => !['--check', '--print'].includes(arg) && !arg.startsWith('--income-root=')) || args.includes('--check') === args.includes('--print')) throw Error('Use --check or --print, optionally --income-root=PATH');
    const result = serializeRetrospective(await deriveRetrospective(incomeArg?.slice('--income-root='.length)));
    if (args.includes('--check')) {
      if (readFileSync(resolve(root, outputPath), 'utf8') !== result) throw Error('NERO_RETROSPECTIVE_OUTPUT_DRIFT');
      process.stdout.write('Round 10 NERO retrospective and GP join reproduce exactly\n');
    } else process.stdout.write(result);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1;
  }
}
