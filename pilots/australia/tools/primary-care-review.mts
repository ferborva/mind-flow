import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMeasurements, digest, verifyCapture } from './primary-care.mts';
import { readWorkbookTables } from './primary-care-workbook.mts';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path));
const output = 'pilots/australia/data/primary-care-2026-09-10.json';
const workbookPath = 'pilots/australia/sources/primary-care/2026-09-10/pc-primary-care-tables.xlsx';
const headersPath = workbookPath.replace('.xlsx', '.response-headers.txt');
const workbookHash = 'sha256:99c6ff08e0a48026b780370aa4d02a8edb36b1b11049dd6ce92087005481a36c';
const headersHash = 'sha256:6278b4551a3efdf9e733615a1e1ddb3913c8610226d599a0e4e83b76d55be2d2';
const workbookUrl = 'https://assets.pc.gov.au/2026-01/rogs-2026-parte-section10-primary-and-community-health-data-tables_0.xlsx?VersionId=dhbsbDjTKGQMTdhUt6hXYhyRTwePk28I';

export function deriveReviewedMeasurements(): any {
  const previousPath = 'pilots/australia/data/primary-care-2026-09-09.json';
  const historical = deriveMeasurements();
  if (JSON.stringify(historical, null, 2) + '\n' !== read(previousPath).toString()) throw new Error('Historical measurement replay drift');
  const bytes = read(workbookPath), headers = read(headersPath);
  if (digest(bytes) !== workbookHash || digest(headers) !== headersHash || !/^HTTP\/2 200\b/m.test(headers.toString())) throw new Error('Reviewed workbook capture drift; hydrate the exact Git LFS object');
  const tables = readWorkbookTables(bytes, [19, 26, 31, 32, 33, 43, 44]);
  const capture = verifyCapture();
  const workbook = { id: 'pc-primary-care-tables', path: workbookPath, source_url: workbookUrl, publisher: 'Productivity Commission', publication_date: '2026-02-05', byte_length: bytes.length, sha256: workbookHash, headers_path: headersPath, headers_sha256: headersHash, http_date: 'Wed, 09 Sep 2026 22:16:28 GMT', acquisition_method: 'One curl HTTPS request with --location --dump-header and --output; exact body bytes retained in Git LFS' };
  const source_reviews = [...capture.artifacts, workbook].map((source: any) => ({
    ...source,
    licence_claim: null,
    licence_review_status: 'unreviewed',
    licence_review_reason: 'Source-specific licence coverage, exceptions and redistribution permissions have not been verified. Official-host capture and attribution are not a licence grant. No blanket open-licence assertion.',
    measurement_role: source.id === 'mbs-referrals' ? 'rule-context-only' : source.id === 'aihw-medicines' ? 'basket-selection-context-only' : source.id === 'pc-primary-care' ? 'publisher-methodology-context' : source.id === 'pc-primary-care-tables' ? 'definitions-footnotes-and-cell-corroboration' : 'derived-series-source',
    derived_series_ids: historical.series.filter((s: any) => s.source_id === source.id).map((s: any) => s.id),
  }));
  const series = structuredClone(historical.series).map((s: any) => ({ ...s, published_value_extraction_reproduced: true, owner_verification_status: 'role-description-not-verified-control' }));
  const find = (id: string) => { const s = series.find((s: any) => s.id === id); if (!s) throw new Error(`Missing series ${id}`); return s; };
  const proximity = find('gp-fte-remoteness');
  proximity.reproducible_from_retained_bytes = false;
  proximity.geography_classification = 'ASGS Remoteness Areas, not MMM and not SA4';
  proximity.evidence_ceiling += ' Published rate cells are extracted exactly, but the underlying ERP denominator is not retained: rates cannot be recomputed from retained bytes. Do not invert these rounded rates into population or personal access. Footnotes 10A.19 C80-C88 distinguish FTE workload, remoteness and regional counting.';
  proximity.rate_denominator_definition = 'ERP by remoteness at 30 June of the relevant calendar year; workbook 10A.19 C88, source vintage E90. Actual denominator values are not retained.';
  proximity.fte_definition = 'Medicare-claims-based workload adjusted for patient and doctor factors; one GP FTE represents 40 hours per week for 46 weeks, not GP headcount or FSE (10A.19 C83,C86). Rounded FTEs and cross-region working prevent naive sums (C81,C85).';
  for (const id of ['gp-cost-delay', 'prescription-cost-delay', 'gp-urgent-under-four-hours', 'gp-unacceptable-wait']) {
    const s = find(id);
    s.population_exclusion = 'Very remote residents excluded in 2024-25; collection phased out during 2023-24. Survey geography uses ASGS 2016 state/territory classifications. Different annual survey scopes cannot be assumed to form a same-population trend.';
    s.population += '; 2024-25 excludes residents of very remote areas';
    s.evidence_ceiling += ' ' + s.population_exclusion;
  }
  const permission = find('telehealth-relationship-lookback');
  permission.period_semantics = '2026-09-09 is the retrieval observation date of the rule parameter, not a verified effective date or change date; effective date unverified.';
  permission.evidence_ceiling += ' ' + permission.period_semantics;
  const baselinePath = 'pilots/australia/data/nero-clerical-2026-08.r2.json';
  const baseline = JSON.parse(read(baselinePath).toString());
  const longer_window_context = [['gp-fully-bulk-billed', '2021-22'], ['gp-cost-delay', '2020-21'], ['prescription-cost-delay', '2020-21']].map(([id, earlierPeriod]) => {
    const s = find(id);
    const points = s.points.filter((p: any) => p.geography === 'NSW');
    const earlier = points.find((p: any) => p.period === earlierPeriod), latest = points.find((p: any) => p.period === '2024-25');
    if (!earlier || !latest) throw new Error(`Missing longer-window point: ${id}`);
    return { series_id: id, geography: 'NSW', earlier, latest, difference_percentage_points: Number((latest.value - earlier.value).toFixed(1)), all_retained_annual_points: points, selection: 'Post-hoc favourable 2023-24 to 2024-25 direction does not describe the full retained history. These earlier comparisons are context, not preregistered endpoints.', comparability: id === 'gp-fully-bulk-billed' ? 'Patient-year measure; workbook footnotes specify claim-processing date and patient geocoded residence. No methodology-break explanation for the 2021-22 to 2022-23 decline is established by these footnotes.' : 'Very-remote scope changed in 2023-24 and 2024-25. Do not label this as a same-population trend or causal improvement.', significance_assessed: false, agency_measured: false };
  });
  const tableFootnotes = Object.fromEntries(Object.entries(tables).map(([name, cells]: [string, any]) => [name, cells.filter((c: any) => c.kind === 'text' && c.text.length > 80).map((c: any) => ({ address: c.address, text_sha256: digest(c.text), character_count: c.text.length }))]));
  const gpCells = tables['10A.26'];
  const cell = (address: string) => { const c = gpCells.find((c: any) => c.address === address); if (!c) throw new Error(`Missing 10A.26 ${address}`); return c; };
  if (cell('M2').text !== 'NSW' || !cell('A3').text.startsWith('2024-25') || cell('A4').text !== '2023-24' || Number(cell('M3').text) !== 7.2 || Number(cell('M4').text) !== 9.3) throw new Error('Workbook GP cells disagree with retained CSV');
  return { ...historical, id: 'australia-primary-care-2026-09-10', as_of: '2026-09-10',
    correction: { supersedes_path: previousPath, supersedes_sha256: digest(read(previousPath)), reason: 'PR15 Track8 review: expose reported-rate recomputation ceiling, workbook definitions and survey exclusion, source-specific licence/role status, current NERO metadata and longer-window context. No historical source values or observation dates rewritten.', source_values_changed: false },
    series, source_reviews,
    workbook_footnotes: { workbook, tables: tableFootnotes, retention: 'Complete original workbook retains exact footnote text; table/cell selectors and decoded-text hashes above locate it without duplicating the workbook.', gp_cost_cells: ['M2', 'A3', 'M3', 'A4', 'M4'].map(address => cell(address)), findings: { '10A.19': proximity.fte_definition + ' ' + proximity.rate_denominator_definition, '10A.26': find('gp-cost-delay').population_exclusion, '10A.31': 'All non-referred patient GP services bulk-billed; reference period and geocoded residence are determined at claim processing. No causal or methodology-break explanation of the 2021-22 to 2022-23 decline is supplied.' } },
    ecological_join: { ...historical.ecological_join, source_baseline_path: baselinePath, source_baseline_hash: digest(read(baselinePath)), source_bytes_status: baseline.source_bytes_status, publication_status: baseline.publication_status, occupation_classification: baseline.scope.occupation_classification, occupation_classification_verification_status: baseline.scope.occupation_classification_verification_status, evidence_ceiling: historical.ecological_join.evidence_ceiling + ' NERO source bytes remain unverified for this baseline; occupation classification is explicitly unverified. NSW survey context excludes very remote residents in 2024-25, so it does not represent every resident of every attached SA4.' },
    binding_diagnosis: { ...historical.binding_diagnosis, diagnosis_as_of: '2026-09-10', population_exclusion: find('gp-cost-delay').population_exclusion, public_summary: 'Binding category is unknown today. Cost was a reported barrier for a survey-estimated NSW subset in 2024-25, not a diagnosis of a rural clerical worker today.' },
    longer_window_context,
    coverage_ceiling: 'One selected cell out of one required cell is extraction coverage only, not survey representativeness, response coverage or individual access coverage.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = JSON.stringify(deriveReviewedMeasurements(), null, 2) + '\n';
    if (process.argv.includes('--check')) { if (read(output).toString() !== result) throw new Error('Reviewed measurement drift'); console.log('Reviewed measurement correction matches retained inputs'); }
    else { writeFileSync(resolve(root, output), result); console.log(output); }
  } catch (error) { console.error(error); process.exitCode = 1; }
}
