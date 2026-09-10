import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, selectRow, numericCell, verifyCapture, digest } from './primary-care.mts';
import { deriveReviewedMeasurements } from './primary-care-review.mts';
import { readNamedWorkbookTables } from './primary-care-workbook.mts';

const root = resolve(import.meta.dirname, '../../..');
const sourceDir = 'pilots/australia/sources/primary-care/2026-09-10-depth';
export const depthOutput = 'pilots/australia/data/primary-care-depth-2026-09-10.json';
const read = (path: string) => readFileSync(resolve(root, path));
const plain = (text: string) => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const specifications = [
  ['abs-methodology', 'source.txt', 'https://www.abs.gov.au/methodologies/patient-experiences-methodology/2024-25', 'Australian Bureau of Statistics'],
  ['abs-after-hours', 'xlsx', 'https://www.abs.gov.au/statistics/health/health-services/patient-experiences/2024-25/DC3_PEX_2425_AHM_T7_to_9.xlsx', 'Australian Bureau of Statistics'],
  ['pbs-patient-charges', 'source.txt', 'https://www.pbs.gov.au/info/healthpro/explanatory-notes/section1/Section_1_4_Explanatory_Notes', 'Australian Government PBS'],
  ['pbs-safety-net', 'source.txt', 'https://www.pbs.gov.au/info/healthpro/explanatory-notes/section1/Section_1_5_Explanatory_Notes', 'Australian Government PBS'],
];
export function captureDepthSources(): any {
  return { id: 'primary-care-depth-sources-2026-09-10', acquisition: 'Each original body and response-header pair retained by one curl HTTPS request; redirects retained in headers.', artifacts: specifications.map(([id, extension, source_url, publisher]) => {
    const path = `${sourceDir}/${id}.${extension}`, headers_path = `${sourceDir}/${id}.response-headers.txt`;
    const body = read(path), headers = read(headers_path);
    if (!/HTTP\/[\d.]+ 200\b/.test(headers.toString())) throw new Error(`Capture failed ${id}`);
    return { id, path, source_url, publisher, sha256: digest(body), byte_length: body.length, headers_path, headers_sha256: digest(headers), http_date: [...headers.toString().matchAll(/^date:\s*(.+)$/gmi)].at(-1)?.[1].trim() ?? null, publication_date: id.startsWith('abs-') ? '2025-11-18' : null, licence_review_status: 'unreviewed', licence_claim: null, licence_limit: 'Official source attribution is not a source-specific redistribution licence review.' };
  }) };
}
function depthSources(): any[] {
  const retained = JSON.parse(read(`${sourceDir}/capture.json`).toString());
  if (JSON.stringify(retained) !== JSON.stringify(captureDepthSources())) throw new Error('Depth capture byte or header drift');
  return retained.artifacts;
}

// Display caution only: not a suppression, clinical or significance threshold.
export const SMALL_BASE_THRESHOLD = 10;
export function assessChange(earlier: any, latest: any, comparable: boolean): any {
  const difference = Number((latest.value - earlier.value).toFixed(3));
  const widths = [earlier.published_95ci_half_width, latest.published_95ci_half_width];
  if (widths.some(w => w != null && (!Number.isFinite(w) || w < 0))) throw new Error('Invalid confidence interval');
  if (widths.some(w => w == null)) return { difference_percentage_points: difference, approximate_significant: null, change_95ci: null, same_population_improvement: false, explanation: 'No retained sampling intervals: significance cannot be assessed. Administrative coverage changes are descriptive.' };
  // ABS 2024-25 methodology: SE=MOE/1.96; SE(x-y) approximately
  // sqrt(SE(x)^2+SE(y)^2). Annual covariance is unavailable.
  const halfWidth = Math.hypot(...widths);
  const significant = Math.abs(difference) > halfWidth;
  return { difference_percentage_points: difference, change_95ci: [difference - halfWidth, difference + halfWidth].map(v => Number(v.toFixed(3))), approximate_significant: significant, same_population_improvement: comparable && significant && difference < 0, covariance_assumption: 'Zero covariance approximation; exact only for uncorrelated estimates. Source scope change is separate from sampling uncertainty.', explanation: significant ? `Change exceeds the approximate 95% interval around zero.${comparable ? '' : ' Survey scope changed, so a same-population improvement is not established.'}` : 'Change is within the approximate 95% interval around zero; a change beyond sampling variation is not established.' };
}
export function withRetainedNumerator(point: any): any {
  if (point.source_selectors?.Table_Number !== '10A.19') return point;
  const source = verifyCapture().artifacts.find((a: any) => a.id === 'pc-primary-care-dataset');
  const rows = parseCsv(readFileSync(resolve(import.meta.dirname, '../../..', source.path), 'utf8'));
  const selectors = { Table_Number: '10A.19', Year: point.period, Remoteness: point.remoteness, Description1: 'Full-time equivalent GPs', Description2: '', Unit: 'no.', Uncertainty: '' };
  const row = selectRow(rows, selectors);
  return { ...point, numerator: numericCell(row[point.geography]), numerator_unit: 'FTE', numerator_source_selectors: selectors };
}

export function deriveMeasurementDepth(): any {
  const reviewed = deriveReviewedMeasurements(), sources = depthSources();
  const source = (id: string) => sources.find(s => s.id === id) ?? reviewed.source_reviews.find((s: any) => s.id === id);
  const text = (id: string) => plain(read(source(id).path).toString());
  const number = (id: string, pattern: RegExp) => { const match = text(id).match(pattern); if (!match) throw new Error(`Missing retained rule: ${id} ${pattern}`); return numericCell(match[1].replaceAll(',', '')); };
  const workbook = source('abs-after-hours');
  const tables = readNamedWorkbookTables(read(workbook.path), ['Table 7', 'Table 9.2']);
  const cell = (table: string, address: string) => { const found = tables[table].find((c: any) => c.address === address); if (!found) throw new Error(`Missing ${table} ${address}`); return found; };
  const afterSeries = [
    ['after-hours-delay', 'availability', 17, 'At least once did not see an after hours GP when needed'],
    ['after-hours-cost-main-reason', 'price', 18, 'At least once did not see an after hours GP when needed - cost main reason'],
    ['after-hours-noncost-main-reason', 'availability', 19, 'At least once did not see an after hours GP when needed - cost not main reason'],
  ].map(([id, category, row, label]) => {
    if (cell('Table 7', `A${row}`).text !== label || cell('Table 7', `A${Number(row) + 15}`).text !== label) throw new Error('After-hours row definition drift');
    return { id, condition_category: category, label, source_id: workbook.id, source_url: workbook.source_url, source_artifact_hash: workbook.sha256, population: 'Survey-scope persons aged 15 years and over who needed to see an after-hours GP in the preceding 12 months; Australia, excludes very remote areas in 2024-25.', evidence_ceiling: 'All after-hours GP modalities, not urgent unsociable-hours telehealth alone. Main reasons do not identify all concurrent barriers. Random confidentiality adjustment prevents exact subtraction or reconciliation of components.', points: [...'BCDEFGHIJKLM'].map(col => ({ geography: 'Aust', period: cell('Table 7', `${col}6`).text.replace('–', '-'), value: Number(numericCell(cell('Table 7', `${col}${row}`).text).toFixed(1)), unit: 'percent', published_95ci_half_width: numericCell(cell('Table 7', `${col}${Number(row) + 15}`).text), numerator: null, source_cells: { table: 'Table 7', period: `${col}6`, value: `${col}${row}`, interval: `${col}${Number(row) + 15}`, definition: `A${row}`, footnote: 'A37' } })) };
  });
  const selected = [...reviewed.series.filter((s: any) => ['gp-fully-bulk-billed', 'gp-cost-delay', 'prescription-cost-delay', 'gp-urgent-under-four-hours'].includes(s.id)), ...afterSeries];
  const histories = selected.map((s: any) => {
    const geography = s.id.startsWith('after-hours') ? 'Aust' : 'NSW';
    const points = s.points.filter((p: any) => p.geography === geography).sort((a: any, b: any) => a.period.localeCompare(b.period));
    const earlier = points.at(-2), latest = points.at(-1);
    return { series_id: s.id, label: s.label ?? s.id, geography, points, selection: 'Full retained annual window; favourable one-year signals were selected post hoc.', latest_change: assessChange(earlier, latest, s.id === 'gp-fully-bulk-billed'), full_window_change: assessChange(points[0], latest, s.id === 'gp-fully-bulk-billed'), source_url: s.source_url, source_artifact_hash: s.source_artifact_hash, comparability: s.id === 'gp-fully-bulk-billed' ? 'Claim-processing-year and geocoded residence measure; no retained sampling intervals.' : 'Very-remote coverage changed during 2023-24 and in 2024-25. Approximate sampling tests do not repair population comparability.', agency_measured: false };
  });
  const policy = {
    general_copayment: number('pbs-patient-charges', /maximum cost for a pharmaceutical benefit item at a pharmacy is \$([\d.]+) for general patients/),
    concessional_copayment: number('pbs-patient-charges', /for general patients and \$([\d.]+) for concession card holders/),
    general_safety_net: number('pbs-safety-net', /From 1 January 2026 the general patient Safety Net threshold is \$([\d,]+\.\d{2})/),
    concessional_safety_net: number('pbs-safety-net', /From 1 January 2026 the concessional Safety Net threshold remains at \$([\d,]+\.\d{2})/),
    effective_period: '2026', unit: 'AUD', evidence_ceiling: 'PBS schedule contributions, not an atorvastatin transaction price or household affordability. Premiums, applicable additional charges, entitlement and safety-net status matter.',
  };
  if (!text('aihw-medicines').includes('current Medicare card') || !text('mbs-telehealth').includes('An urgent after-hours service (in unsociable hours)')) throw new Error('Retained eligibility or exception definition missing');
  const condition = (category: string, status: string, observation: string, sourceId: string, missing: string, why: string) => ({ condition_category: category, status, observation, source_id: sourceId, source_url: source(sourceId).source_url, source_artifact_hash: source(sourceId).sha256, missing_series: missing, why_missing: why });
  const items = [
    { id: 'atorvastatin-prescription', label: 'Clinically prescribed atorvastatin, dispensed by a community pharmacy', geography: 'NSW', conditions: [
      condition('price', 'proxy-and-rule', 'NSW 2024-25 prescription cost-delay estimate covers all prescribed medicines. PBS 2026 contributions and safety-net thresholds are policy context.', 'pbs-patient-charges', 'For NSW residents needing their prescribed atorvastatin strength and quantity today: actual total dispensing charge after entitlement, premiums and safety-net status, available household funds, and cost-related failed fills.', 'RoGS 10A.33 combines all prescribed medicines; PBS schedules contain statutory contributions, not linked transactions and household resources.'),
      condition('permission', 'rule-context', 'AIHW describes PBS eligibility through a current Medicare card or reciprocal arrangements. This does not establish a particular prescription entitlement.', 'aihw-medicines', 'NSW atorvastatin needs matched to a valid prescription, PBS item restriction eligibility and approval or refusal on the date of attempted dispensing.', 'Retained AIHW overview describes eligibility categories; it publishes no person-by-prescription approval denominator.'),
      condition('proximity', 'missing', 'No retained travel-time measure for a pharmacy able to dispense the required atorvastatin.', 'aihw-medicines', 'NSW residential origins by remoteness linked to an open accessible dispensing pharmacy, transport mode and actual journey time for the required atorvastatin strength.', 'AIHW lists supply channels; it does not publish geocoded pharmacy opening hours or journeys. Pharmacy counts would not identify accessible stock.'),
      condition('availability', 'missing', 'Dispensing volumes do not measure unfilled prescriptions or stock today.', 'aihw-medicines', 'Dated NSW pharmacy-level required-strength stock and attempted atorvastatin fills, including failures, stockout duration and time to dispensing.', 'AIHW medicine totals count completed prescriptions nationally, with no attempted-fill denominator or local live stock.'),
      condition('capability', 'missing', 'The retained 2018 navigation survey is broad national context.', 'abs-health-literacy', 'NSW people needing atorvastatin assessed for accessible instructions, language or support needs and ability to obtain and use the prescribed medicine, with unmet support recorded today.', 'The national health-literacy domains have no drug-specific, NSW current-day or dispensing-outcome linkage.'),
    ] },
    { id: 'after-hours-gp', label: 'After-hours GP consultation, with urgent unsociable-hours telehealth separately scoped', geography: 'Australia (NSW-specific binding unavailable)', conditions: [
      condition('price', 'measured-historical-barrier', 'ABS Table 7 measures cost as the main reason for at least one missed after-hours GP need, among those needing the service.', 'abs-after-hours', 'NSW after-hours needs today linked to quoted total consultation charge, available funds and all concurrent reasons for failed care, distinguishing telehealth modality and urgent unsociable hours.', 'Annual national main-reason estimates cannot establish current NSW charges, all concurrent barriers or the narrower telehealth pathway.'),
      condition('permission', 'rule-context', 'MBS AN.1.1 exempts an urgent after-hours service in unsociable hours from its routine relationship requirement; this is not blanket after-hours eligibility.', 'mbs-telehealth', 'NSW attempted after-hours consultations today matched to modality, applicable MBS item, urgency and time criteria, entitlement and eligibility refusal.', 'The retained exception text is a rule, not a denominator of eligible and refused needs; detailed item-specific adjudications are absent.'),
      condition('proximity', 'missing', 'ABS remoteness groups describe patient experience, not distance to an open clinic.', 'abs-after-hours', 'NSW origins by remoteness linked to staffed open after-hours clinics accepting the patient, accessible transport and journey time; for telehealth, usable connectivity instead of physical distance.', 'Table 9.2 reports service experience by remoteness. It contains no clinic coordinates, opening hours, transport or connectivity series.'),
      condition('availability', 'measured-combined-barrier', 'ABS Table 7 measures at least one missed after-hours need for any reason and separately where cost was not the main reason.', 'abs-after-hours', 'All NSW after-hours needs today, including unsuccessful booking attempts, linked to bookable clinically suitable slots and elapsed time from first attempt to care, separately by modality.', 'An annual missed-care response combines availability with personal and other reasons. Noncost does not mean capacity; completed urgent-GP wait starts at appointment-making.'),
      condition('capability', 'missing', 'Broad national navigation difficulty cannot measure a person’s ability to obtain after-hours care.', 'abs-health-literacy', 'NSW after-hours needs today with accessible booking, language or carer support and device/connectivity ability for the offered modality, including unsuccessful attempts.', 'The 2018 national navigation survey does not isolate after-hours tasks, NSW today or excluded people needing supported responses.'),
    ] },
  ].map(item => ({ ...item, binding_category: null, binding_summary: 'Binding category is unknown today. Establishing it requires the five category-specific missing series below on the same needed-care episodes, including unsuccessful attempts and co-occurring barriers.', five_categories_direct_current_measurements: false }));
  return { id: 'australia-primary-care-depth-2026-09-10', as_of: '2026-09-10', provenance: 'commissioned-proposal', historical_inputs_preserved: true, small_base_threshold: SMALL_BASE_THRESHOLD, source_reviews: [...sources, ...reviewed.source_reviews], policy, after_hours_series: afterSeries, histories, items, significance_method: { source_url: source('abs-methodology').source_url, source_hash: source('abs-methodology').sha256, section: 'Calculating differences; Significance testing', formula: 'SE=95%MOE/1.96; approximate SE difference=sqrt(SE1^2+SE2^2); two-sided 95% interval=difference +/-1.96*SE difference', exact_covariance_available: false, multiple_comparison_adjustment: false }, workbook_footnotes: Object.fromEntries(Object.entries(tables).map(([name, cells]: [string, any]) => [name, cells.filter((c: any) => /^A/.test(c.address) && c.text.length > 80).map((c: any) => ({ address: c.address, text_sha256: digest(c.text), character_count: c.text.length }))])) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--capture')) writeFileSync(resolve(root, sourceDir, 'capture.json'), JSON.stringify(captureDepthSources(), null, 2) + '\n', { flag: 'wx' });
    else {
      const result = JSON.stringify(deriveMeasurementDepth(), null, 2) + '\n';
      if (process.argv.includes('--check')) { if (read(depthOutput).toString() !== result) throw new Error('Measurement depth drift'); console.log('Measurement depth reproduces from retained bytes'); }
      else writeFileSync(resolve(root, depthOutput), result);
    }
  } catch (error) { console.error(error); process.exitCode = 1; }
}
