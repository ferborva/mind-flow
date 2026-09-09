import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMeasurements, digest, verifyCapture } from '../../pilots/australia/tools/primary-care.mts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const clock = '2026-09-09T10:51:23Z';
export const panelIds = ['au-gp-cost-delay', 'au-gp-fully-bulk-billed', 'au-prescription-cost-delay', 'au-gp-urgent-under-four-hours'];
const panelJustifications: Record<string, string> = {
  'au-gp-cost-delay': 'Retained because reported cost-related delay or non-use observes a price barrier to the GP pathway, including people who needed care but did not obtain it. It adds an access outcome that a fee schedule alone cannot show. The annual NSW survey estimate is not household affordability, an individual diagnosis or evidence that price dominates other barriers.',
  'au-gp-fully-bulk-billed': 'Retained as a separate administrative view of the payment condition among patients with Medicare GP attendances. It tests whether a patient incurred any GP gap over the year, complementing rather than replicating self-reported cost delay. People with no claimed attendance are absent, so a rising share cannot establish access among non-users.',
  'au-prescription-cost-delay': 'Retained because obtaining a consultation does not establish access to the prescribed medicine. Reported prescription delay or non-use due to cost measures a distinct downstream price barrier among survey-scope people needing medicines. The aggregate covers prescriptions generally, not atorvastatin-specific availability or adherence.',
  'au-gp-urgent-under-four-hours': 'Retained to test timeliness alongside the price indicators, so lower cost is not treated as sufficient access. It measures the reported wait of urgent GP users, with published uncertainty, rather than inferring capacity from workforce totals. Unmet urgent need is excluded; four hours is a reported time category, not a universal clinical standard.'
};
export function transformPrimaryCare(id: string, measurements: any = deriveMeasurements()) {
  if (!panelIds.includes(id)) throw new Error(`unsupported primary-care panel series ${id}`);
  const source = measurements.series.find((s: any) => `au-${s.id}` === id);
  return ['AUS', 'NSW'].map(entity => ({ entity, points: source.points.filter((p: any) => p.geography === (entity === 'AUS' ? 'Aust' : 'NSW')).map((p: any) => [Number(p.period.slice(0, 4)) + 1, p.value, id === 'au-gp-fully-bulk-billed' ? 'published_statistic' : 'published_estimate']).sort((a: any, b: any) => a[0] - b[0]) }));
}
function displayContract(s: any) {
  return { id: s.id, name: s.name, family: s.family, unit: s.unit, precision: s.precision, direction: s.direction, question: s.question, why_it_matters: s.why_it_matters, trouble_reading: s.trouble_reading, method: s.method ?? null, caveats: s.caveats ?? [], source: { name: s.source.name ?? null, url: s.source.url ?? null, note: s.source.note ?? null, adapter: s.source.adapter ?? null } };
}
export function buildPrimaryCarePanel() {
  const snapshot = JSON.parse(read('dashboard/snapshots/2026-09-08.r3.json'));
  const policy = JSON.parse(read('dashboard/evidence/adapter-classification-policy.json'));
  const measurements = deriveMeasurements(), capture = verifyCapture();
  const originalIds = snapshot.signals.map((s: any) => s.id);
  const deleted = snapshot.signals.filter((s: any) => s.status === 'not_measured').map((s: any) => s.id);
  snapshot.signals = snapshot.signals.filter((s: any) => s.status !== 'not_measured');
  for (const id of deleted) { delete policy.signals[id]; delete policy.freshness_policy.signal_rules[id]; }
  for (const id of panelIds) {
    const s = measurements.series.find((s: any) => `au-${s.id}` === id);
    const klass = id === 'au-gp-fully-bulk-billed' ? 'published_statistic' : 'published_estimate';
    const adapter = { id: 'pc-primary-care-retained', version: '1.0.0', dataset_id: 'rogs-2026-section10', selected_fields: ['Table_Number', 'Year', 'Description1', 'Description4', 'Uncertainty', 'Unit', 'NSW', 'Aust'], epistemic_rules: [{ epistemic_class: klass, source_vintage: 'Report on Government Services2026, section10; exact capture2026-09-09', uncertainty: s.evidence_ceiling, resolution_rule: 'New publication is a new retained vintage; existing record is immutable.' }] };
    const series = transformPrimaryCare(id, measurements), last = series.find(s => s.entity === 'NSW')!.points.at(-1)!;
    const signal = { id, name: s.id.replaceAll('-', ' '), family: s.condition_category, status: 'available', unit: 'percent', precision: 1, direction: id.includes('cost-delay') ? 'down_is_good' : 'up_is_good', question: `What does ${s.id} measure for the published population?`, why_it_matters: `Category: ${s.condition_category}. Population: ${s.population}. Owner: ${s.owner}.`, trouble_reading: s.evidence_ceiling, method: 'Reproduce exact selected RoGS CSV cells with pilots/australia/tools/primary-care.mts; financial-year labels use the ending year, so2025 means2024-25.', caveats: [s.evidence_ceiling, 'Historical population measurement; no personal eligibility, clinical direction or current appointment claim. Full uncertainty and source selectors are retained in the linked pilot measurement.'], source: { name: 'Productivity Commission, with original ABS or Medicare attribution', url: s.source_url, note: `Retained ${s.source_artifact_hash}; see pilots/australia/sources/primary-care/2026-09-09/capture.json and data/primary-care-2026-09-09.json. Whole-snapshot raw status remains not_pinned because inherited macro inputs were not retained.`, adapter, raw_input_ids: [], timing: { kind: 'external_dataset', publisher_vintage: { status: 'unknown', reason: 'RoGS2026 named in retained capture; source timing adapter does not independently extract an edition field.' }, publisher_release: { kind: 'unknown', reason: 'Landing page states5February2026; exact UTC publisher time is not established in source-timing contract.' }, retrieval: { kind: 'calendar_date', on: '2026-09-09', timezone: 'UTC', basis: 'Paired public HTTP response and capture manifest retained outside legacy whole-snapshot raw registry.' } } }, series, latest: { entity: 'NSW', year: last[0], value: last[1], epistemic_class: last[2] } };
    signal.source.timing.retrieval = { kind: 'unknown', reason: 'Exact paired acquisition is retained in the pilot capture; legacy whole-snapshot raw registry cannot represent partial retained coverage.' } as any;
    snapshot.signals.push(signal);
    policy.signals[id] = { source_url: s.source_url, adapter_id: adapter.id, adapter_version: adapter.version, dataset_id: adapter.dataset_id, selected_fields: adapter.selected_fields, classification_rules: [{ epistemic_class: klass }], display_contract_sha256: digest(JSON.stringify(displayContract(signal))) };
    policy.freshness_policy.signal_rules[id] = { kind: 'external_dataset', reference_period_kind: 'australian_financial_year_ending', max_reference_lag_days: 366, release_cadence: { kind: 'unknown', reason: 'No exact next publication deadline authenticated; financial-year endpoints retained.' } };
  }
  const entity = { code: 'NSW', name: 'New South Wales', kind: 'region' };
  snapshot.entities.push(entity); policy.entity_contracts.push(entity); policy.policy_version = '2.1.0';
  snapshot.snapshot_id = '2026-09-09'; snapshot.record_id = '2026-09-09.r1'; snapshot.as_of = clock; snapshot.generated_at = clock;
  snapshot.generator = 'dashboard/tools/primary-care-panel.mts'; delete snapshot.correction;
  snapshot.notes = 'New Australian primary-care measurements are retained and reproduced. Eight unsupported proposed measures are removed, without claiming their conditions are satisfied. The eight inherited macro series remain context with unchanged values and original source limitations. See pilots/australia/basket/primary-care.v1.json for basket definitions and scope.';
  snapshot.reproducibility.residual_gap = 'Whole-snapshot upstream-byte reconstruction remains unavailable for inherited macro series. New PC series independently rederive from exact CSV and paired headers in pilots/australia/sources/primary-care/2026-09-09; builder verifies capture hashes and derived values regardless of this global legacy flag.';
  snapshot.public_update.update_id = snapshot.public_update.update_id.replace('2026-09-08.r3', snapshot.record_id);
  snapshot.public_update.observed.record_id = snapshot.record_id;
  snapshot.evidence_policy = { id: 'adapter-classification-policy', version: '2.1.0', sha256: digest(JSON.stringify(policy, null, 2) + '\n') };
  const dispositions = { id: 'round-08-signal-panel-dispositions', original_signal_count: 16, retained_macro_context: originalIds.filter((id: string) => !deleted.includes(id)), deleted: deleted.map((id: string) => ({ id, reason: ({ 'zero-cost-count': 'No exhaustive end-to-end zero-cost basket count; bulk billing does not measure zero production cost.', 'baumol-gap': 'Human-required versus automatable baskets and weights remain unjustified.', 'access-margin': 'Service cost barriers do not measure household resources minus a local living basket.', 'transition-speed': 'NERO nowcasts are not linked displaced-worker recovery durations.', concentration: 'Spatial GP FTE distribution does not measure corporate ownership or productive-power control.', preparedness: 'Health literacy and GP waits do not measure social-protection delivery readiness.', 'trust-consent': 'Patient experience cannot stand in for repeated technology-transition consent.', 'cross-border-access': 'One-country basket does not measure cross-border eligibility differences.' } as any)[id] })), added: panelIds.map(id => { const s = measurements.series.find((s: any) => `au-${s.id}` === id); return { id, condition_category: s.condition_category, population: s.population, owner: s.owner, source_hash: s.source_artifact_hash }; }), not_measured_count: 0, measurements_capture_id: capture.capture_id };
  dispositions.added = dispositions.added.map(({ id, ...entry }) => ({ id, justification: panelJustifications[id], ...entry }));
  return { snapshot, policy, dispositions };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const { snapshot, policy, dispositions } = buildPrimaryCarePanel();
    const checking = process.argv.includes('--check');
    for (const [path, value] of [['dashboard/snapshots/2026-09-09.r1.json', snapshot], ['dashboard/evidence/adapter-classification-policy-primary-care-2.1.json', policy], ['pilots/australia/basket/panel-dispositions.json', dispositions]]) {
      const target = resolve(root, path as string), expected = JSON.stringify(value, null, 2) + '\n';
      if (checking || existsSync(target)) {
        if (readFileSync(target, 'utf8') !== expected) throw new Error(`Retained artifact differs: ${path}; create a new revision instead of overwriting it`);
      } else writeFileSync(target, expected);
    }
    const indexPath = resolve(root, 'dashboard/snapshots/index.json'), index = JSON.parse(readFileSync(indexPath, 'utf8'));
    if (!index.snapshots.some((s: any) => s.id === snapshot.record_id)) index.snapshots.push({ id: snapshot.record_id, snapshot_id: snapshot.snapshot_id, schema_version: snapshot.schema_version, path: '2026-09-09.r1.json', sha256: digest(JSON.stringify(snapshot, null, 2) + '\n') });
    index.snapshots.find((s: any) => s.id === snapshot.record_id).sha256 = digest(JSON.stringify(snapshot, null, 2) + '\n');
    index.latest = snapshot.record_id;
    const indexBytes = JSON.stringify(index, null, 1) + '\n';
    if (checking) {
      if (readFileSync(indexPath, 'utf8') !== indexBytes) throw new Error('Primary-care snapshot index does not match');
    } else writeFileSync(indexPath, indexBytes);
    console.log(snapshot.evidence_policy.sha256);
  } catch (error) { console.error(error); process.exitCode = 1; }
}
