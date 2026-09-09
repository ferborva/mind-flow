import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = 'pilots/australia/sources/primary-care/2026-09-09';
const output = 'pilots/australia/data/primary-care-2026-09-09.json';
type Row = Record<string, string>;
export const digest = (bytes: string | Buffer) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const read = (path: string) => readFileSync(resolve(root, path));
const specifications = [
  ['abs-patient-experiences', 'source.txt', 'https://www.abs.gov.au/statistics/health/health-services/patient-experiences/2024-25', 'Australian Bureau of Statistics', '2025-11-18'],
  ['abs-health-literacy', 'source.txt', 'https://www.abs.gov.au/statistics/health/health-conditions-and-risks/national-health-survey-health-literacy/latest-release', 'Australian Bureau of Statistics', '2019-04-29'],
  ['pc-primary-care', 'source.txt', 'https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/', 'Productivity Commission', '2026-02-05'],
  ['pc-primary-care-dataset', 'csv', 'https://assets.pc.gov.au/2026-01/rogs-2026-parte-section10-primary-and-community-health-dataset_0.csv?VersionId=skSVcIjTxjuNWGWtKhp75L9zKdEohB9W', 'Productivity Commission', '2026-02-05'],
  ['mbs-telehealth', 'source.txt', 'https://www9.health.gov.au/mbs/fullDisplay.cfm?type=note&q=AN.1.1', 'Australian Government Department of Health, Disability and Ageing', null],
  ['mbs-referrals', 'source.txt', 'https://www9.health.gov.au/mbs/fullDisplay.cfm?type=note&q=GN.6.16', 'Australian Government Department of Health, Disability and Ageing', null],
  ['aihw-medicines', 'source.txt', 'https://www.aihw.gov.au/reports/medicines/medicines-in-the-health-system', 'Australian Institute of Health and Welfare', null],
];

export function captureSources() {
  return {
    capture_id: 'australia-primary-care-2026-09-09', captured_at_utc: new Date().toISOString(),
    acquisition_method: 'curl --fail --silent --show-error --location --dump-header HEADER --output BODY URL; each body and header pair comes from one invocation',
    publisher_authentication: 'HTTPS official host; no independent signature or witness',
    artifacts: specifications.map(([id, extension, source_url, publisher, publication_date]) => {
      const path = `${sourceDir}/${id}.${extension}`;
      const headers_path = `${sourceDir}/${id}.response-headers.txt`;
      const body = read(path), headers = read(headers_path);
      if (!/HTTP\/[\d.]+ 200\b/.test(headers.toString())) throw new Error(`No successful response: ${id}`);
      return { id, path, source_url, publisher, publication_date, byte_length: body.length, sha256: digest(body), headers_path, headers_sha256: digest(headers), http_date: headers.toString().match(/^date:\s*(.+)$/mi)?.[1].trim() ?? null };
    }),
    failed_acquisitions: [{ url: 'https://www.servicesaustralia.gov.au/who-can-claim-telehealth-services-under-mbs-or-dva?context=20', http_status: 403, headers_path: `${sourceDir}/sa-telehealth.response-headers.txt`, replacement: 'mbs-telehealth' }],
    evidence_ceiling: 'A reproducible extraction of what these retained official-host responses reported; no publisher signature, individual linkage, causal attribution or current appointment availability.',
  };
}
export function verifyCapture() {
  const capture = JSON.parse(read(`${sourceDir}/capture.json`).toString());
  for (const item of capture.artifacts) {
    const body = read(item.path);
    if (body.length !== item.byte_length || digest(body) !== item.sha256 || digest(read(item.headers_path)) !== item.headers_sha256) throw new Error(`Capture byte drift: ${item.id}`);
    if (!/HTTP\/[\d.]+ 200\b/.test(read(item.headers_path).toString())) throw new Error(`Capture HTTP failure: ${item.id}`);
  }
  return capture;
}
export function parseCsv(text: string): Row[] {
  const records: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); records.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) { row.push(cell); records.push(row); }
  const header = records.shift(); if (!header || new Set(header).size !== header.length) throw new Error('Invalid CSV header');
  return records.map((values, i) => { if (values.length !== header.length) throw new Error(`CSV width mismatch at record ${i + 2}`); return Object.fromEntries(header.map((key, j) => [key, values[j]])); });
}
export function numericCell(value: string) {
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`Non-numeric or suppressed cell: ${value}`);
  const number = Number(value); if (!Number.isFinite(number)) throw new Error('Non-finite numeric cell'); return number;
}
export function selectRow(rows: Row[], selectors: Row) {
  const matches = rows.filter(row => Object.entries(selectors).every(([k, v]) => row[k] === v));
  if (matches.length !== 1) throw new Error(`Expected exactly one row for ${JSON.stringify(selectors)}, got ${matches.length}`);
  return matches[0];
}
function plain(text: string) { return text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }

export function deriveMeasurements() {
  const capture = verifyCapture();
  const csv = parseCsv(read(`${sourceDir}/pc-primary-care-dataset.csv`).toString());
  const source = (id: string) => { const item = capture.artifacts.find((a: any) => a.id === id); if (!item) throw new Error(`Missing source ${id}`); return { source_id: id, source_url: item.source_url, source_artifact_hash: item.sha256 }; };
  const series: any[] = [];
  const survey = 'Usual residents aged 15 years and over in private dwellings, within the survey scope, who needed the specified service in the preceding 12 months';
  function pc(id: string, category: string, selectors: Row, population: string, unit: string, role: string, owner: string, ceiling: string) {
    const selected = csv.filter(row => Object.entries(selectors).every(([k, v]) => row[k] === v) && row.Uncertainty === '');
    if (!selected.length) throw new Error(`No data for ${id}`);
    const points: any[] = [];
    for (const row of selected) for (const geography of ['NSW', 'Aust']) {
      if (!row[geography] || row[geography] === '..' || row[geography] === 'np') continue;
      const unique = { ...selectors, Year: row.Year, Remoteness: row.Remoteness, Uncertainty: '' };
      selectRow(csv, unique);
      const ci = csv.filter(r => Object.entries({ ...unique, Uncertainty: '95%CI' }).every(([k, v]) => r[k] === v));
      if (ci.length > 1) throw new Error(`Ambiguous uncertainty ${id}`);
      points.push({ geography, remoteness: row.Remoteness, period: row.Year, value: numericCell(row[geography]), unit, published_95ci_half_width: ci.length && /^\d/.test(ci[0][geography]) ? numericCell(ci[0][geography]) : null, source_selectors: unique, source_column: geography, data_source_label: row.Data_Source });
    }
    series.push({ id, condition_category: category, owner, population, measurement_role: role, evidence_ceiling: ceiling, ...source('pc-primary-care-dataset'), points });
  }
  const priceOwner = 'General practices set fees and bulk-billing choices; Australian Government sets Medicare benefits';
  pc('gp-cost-delay', 'price', { Table_Number: '10A.26', Unit: '%' }, survey, 'percent', 'self-reported-access-barrier', priceOwner, 'Reported cost-related delay or non-use; cost can coexist with other barriers. State estimate cannot identify an individual or establish the leading barrier.');
  pc('gp-fully-bulk-billed', 'price', { Table_Number: '10A.31', Unit: '%' }, 'Patients with Medicare GP non-referred attendances in the year', 'percent', 'observed-claims-coverage', priceOwner, 'Patient-year fully bulk-billed share, not share of services or clinics, and excludes people with no claimed attendance.');
  pc('gp-gap', 'price', { Table_Number: '10A.32', Description1: 'Non-referred GP attendances', Unit: '$' }, 'Patient-billed Medicare non-referred GP attendances', 'AUD-2024-25', 'administrative-average', priceOwner, 'Average gap for patient-billed services in 2024-25 dollars, not all consultations or household affordability.');
  pc('specialist-gap', 'price', { Table_Number: '10A.32', Description1: 'Specialist attendances', Unit: '$' }, 'Patient-billed Medicare specialist attendances', 'AUD-2024-25', 'administrative-average', 'Specialist practices and Australian Government Medicare benefit setters', 'Specialist-service average, not a specific specialty, referral completion or total pathway cost.');
  pc('prescription-cost-delay', 'price', { Table_Number: '10A.33', Unit: '%' }, survey, 'percent', 'self-reported-access-barrier', 'Australian Government PBS and pharmacies', 'All prescription medicines, not atorvastatin-specific access.');
  pc('gp-fte-remoteness', 'proximity', { Table_Number: '10A.19', Description2: 'per 100000 people', Unit: 'rate' }, 'GP FTE supply relative to resident population in each published state and remoteness stratum', 'FTE-per-100000', 'spatial-supply-proxy', 'Australian Government workforce policy, state governments, PHNs and general practices', 'Spatial supply intensity is not travel time, transport accessibility, opening hours or appointment availability. Remoteness strata are not SA4s.');
  pc('gp-urgent-under-four-hours', 'availability', { Table_Number: '10A.43', Description4: 'Less than four hours', Unit: '%' }, 'Survey-scope residents aged 15 years and over who saw a GP for urgent medical care', 'percent', 'self-reported-timeliness', 'General practices and PHNs, with government workforce and service funding', 'Includes people who obtained urgent GP care; excludes unmet urgent need and is not a real-time appointment feed.');
  pc('gp-unacceptable-wait', 'availability', { Table_Number: '10A.44', Unit: '%' }, 'Survey-scope residents aged 15 years and over who saw a GP in the previous 12 months', 'percent', 'self-reported-timeliness', 'General practices and PHNs, with government workforce and service funding', 'Patient-defined unacceptable wait among GP users, not a clinical safe-wait threshold; cannot rank against cost-delay with a different denominator.');
  const experience = plain(read(`${sourceDir}/abs-patient-experiences.source.txt`).toString());
  const after = experience.match(/after hours GPs \((\d+\.\d+)% compared to (\d+\.\d+)%\)/);
  if (!after) throw new Error('After-hours access series absent from retained ABS source');
  series.push({ id: 'after-hours-delay', condition_category: 'availability', owner: 'After-hours general practices, PHNs and government commissioners', population: survey, measurement_role: 'self-reported-combined-access-barrier', evidence_ceiling: 'All reasons for delay or non-use; not pure capacity, not urgent unsociable-hours telehealth specifically.', ...source('abs-patient-experiences'), points: [1, 2].map((i) => ({ geography: 'Aust', remoteness: 'All areas', period: i === 1 ? '2024-25' : '2023-24', value: numericCell(after[i]), unit: 'percent', published_95ci_half_width: null, source_selector: 'Barriers to health service use: delayed or did not use; after hours GPs' })) });
  const literacy = plain(read(`${sourceDir}/abs-health-literacy.source.txt`).toString());
  const navigation = literacy.match(/while (\d+)% of people reported finding it difficult to navigate the healthcare system/);
  if (!navigation) throw new Error('Health literacy result absent');
  series.push({ id: 'health-system-navigation-difficulty', condition_category: 'capability', owner: 'Health-service organisations and governments responsible for accessible information and navigation', population: 'Adults aged 18 years and over represented by ABS 2018 Health Literacy Survey; responding NHS follow-up sample', measurement_role: 'self-reported-capability-context', evidence_ceiling: '2018 broad health-system navigation, not GP-specific, not a current literacy diagnosis, and not a deficit assigned to a person. No comparable trend asserted.', ...source('abs-health-literacy'), points: [{ geography: 'Aust', remoteness: 'All areas', period: '2018', value: numericCell(navigation[1]), unit: 'percent', published_95ci_half_width: null, source_selector: 'Navigating the healthcare system (Domain 7): overall difficult' }] });
  const telehealth = plain(read(`${sourceDir}/mbs-telehealth.source.txt`).toString());
  const months = telehealth.match(/provided a face-to-face service to the patient in the last (\d+) months/);
  if (!months || !telehealth.includes('MyMedicare') || !telehealth.includes('An urgent after-hours service')) throw new Error('MBS scope or exceptions absent');
  series.push({ id: 'telehealth-relationship-lookback', condition_category: 'permission', owner: 'Australian Government MBS rule setters and Services Australia administrators', population: 'Non-referred MBS telehealth eligible-practitioner pathway, subject to MyMedicare alternative and listed exemptions', measurement_role: 'published-rule-parameter', evidence_ceiling: 'Measures a rule parameter observed at retrieval, not the proportion of people eligible, a rule-change trend or individual permission. Urgent unsociable-hours service exception retained.', ...source('mbs-telehealth'), points: [{ geography: 'Aust', remoteness: 'All areas', period: '2026-09-09', value: numericCell(months[1]), unit: 'months', source_selector: 'AN.1.1 eligible telehealth practitioner, first face-to-face pathway' }] });
  const baseline = JSON.parse(read('pilots/australia/data/nero-clerical-2026-08.json').toString());
  const nsw = baseline.series.filter((s: any) => s.state_name === 'NSW');
  return { id: 'australia-primary-care-2026-09-09', as_of: '2026-09-09', provenance: 'commissioned-proposal', agency_measured: false, series,
    ecological_join: { common_geography: 'New South Wales (state)', individual_linkage: false, occupation_estimates_summed: false, access_period: '2024-25', exposure_period: '2026-08', source_baseline_hash: digest(read('pilots/australia/data/nero-clerical-2026-08.json')), rows: nsw.map((s: any) => ({ occupation_code: s.occupation_code, sa4_code: s.sa4_code, sa4_name: s.sa4_name, exposure: s.latest, access_geography: 'NSW', access_series_id: 'gp-cost-delay' })), evidence_ceiling: 'State-context attachment to each separate NERO SA4 occupation series. No sum, weighted synthetic state exposure, remoteness crosswalk, household record linkage or causal relationship. State access is not an SA4 estimate.' },
    binding_diagnosis: { basket_item: 'gp-consultation', geography: 'NSW', observed_category: 'price', observation_period: '2024-25', diagnosis_as_of: '2026-09-09', scope: 'The survey-estimated subset reporting GP delay or non-use due to cost', estimate_percent: 7.2, individual_binding_category: null, dominant_category: null, evidence_ceiling: 'Price was an observed barrier for this subset during the survey reference period. Available annual evidence cannot establish which condition binds today for a rural clerical worker or which category dominates across different populations.', owner: priceOwner, what_would_have_to_change: 'A later comparable survey would need to show fewer cost-related delays; identifying the current personal bottleneck requires evidence on that person and local service conditions.' },
    gates: { five_categories_have_retained_indicators: true, five_categories_direct_current_gp_access_measures: false, current_individual_binding_condition: false },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--capture')) writeFileSync(resolve(root, sourceDir, 'capture.json'), JSON.stringify(captureSources(), null, 2) + '\n');
    else {
      const result = JSON.stringify(deriveMeasurements(), null, 2) + '\n';
      if (process.argv.includes('--check')) { if (read(output).toString() !== result) throw new Error('Derived primary-care artifact drift'); console.log('Primary-care retained inputs and derivation match'); }
      else { mkdirSync(dirname(resolve(root, output)), { recursive: true }); writeFileSync(resolve(root, output), result); console.log(output); }
    }
  } catch (error) { console.error(error); process.exitCode = 1; }
}
