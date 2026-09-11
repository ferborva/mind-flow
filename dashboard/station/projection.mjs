import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { deriveIncomeMeasurements, serializeIncomeMeasurements } from '../../signals/countries/tools/income-measurements.mts';
import { buildStormReview, serializeStormReview } from '../../signals/countries/tools/storm-criterion.mts';
import { buildRound11MigrationReview, buildMigrationSummary } from '../../contracts/construct-migration/review.mjs';
import { buildPackage } from '../../experiments/decision-experience/readiness.mts';
import { validateFeasibility } from '../../pilots/income-access/tools/feasibility.mjs';
export { selectSeries, describeChange, preparationFor } from './model.mjs';

const root = new URL('../../', import.meta.url);
const load = path => readFileSync(new URL(path, root), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const paths = {
  countries: 'signals/countries/country-set.v1.json',
  income: 'signals/countries/income-measurements.v1.json',
  review: 'signals/countries/storm-review.v1.json',
};
const forecastFiles = [
  ['round-08-nero/issued.json', 'bc230310d6edb9814ef350dd58f683ca26f7fd60a9a43cd48c1ed2aacf995053', 'AUS', 'Capital Region', false],
  ['round-09-nero/issued.json', 'b69cab97b86b7aa5b3c863201133de5a69053b5aa42ed95138b74af1b3a25969', 'AUS', 'Central Coast: defective predecessor', true],
  ['round-09-nero-corrected/issued.json', 'b4fa0511720b4964790e40417da5ccb12bce78e978cafa83530895abbce12ee1', 'AUS', 'Central Coast: corrected record', false],
  ['round-10-canada/issuance/issued/issued.json', 'fd35bf9998830c4ba3d9d42bcd94feefd1fce29c70b144042754239df2e01140', 'CAN', 'Canada: reported unemployment', false],
];

export function verifyInputs(reader = load) {
  const countryBytes = reader(paths.countries);
  const incomeBytes = reader(paths.income);
  if (incomeBytes !== serializeIncomeMeasurements(deriveIncomeMeasurements())) throw new Error('Income source replay differs');
  const income = JSON.parse(incomeBytes);
  if (income.country_set_sha256 !== 'sha256:' + hash(countryBytes)) throw new Error('Country frame differs from retained measurement');
  const reviewBytes = reader(paths.review);
  const review = buildStormReview(income, 'sha256:' + hash(incomeBytes));
  if (reviewBytes !== serializeStormReview(review)) throw new Error('Storm source replay differs');
  return { countries: JSON.parse(countryBytes), income, review,
    inputs: [[paths.countries, countryBytes], [paths.income, incomeBytes], [paths.review, reviewBytes]].map(([path, bytes]) => ({ path, sha256: hash(bytes) })) };
}

export function buildStation(reader = load) {
  const captured = new Map();
  const read = path => {
    if (!captured.has(path)) captured.set(path, reader(path));
    return captured.get(path);
  };
  const { countries, income, review, inputs } = verifyInputs(read);
  const pilotPath = 'pilots/income-access/feasibility.v1.json';
  const pilot = JSON.parse(read(pilotPath));
  validateFeasibility(pilot);
  const migrationPath = 'pilots/australia/basket/round-11-construct-migrations.summary.json';
  const migrations = buildMigrationSummary(buildRound11MigrationReview());
  if (JSON.stringify(JSON.parse(read(migrationPath))) !== JSON.stringify(migrations)) throw new Error('Migration summary replay differs');
  const proposalPath = 'experiments/decision-experience/proposal.json';
  const studyPath = 'experiments/decision-experience/readiness-summary.json';
  const taskPath = 'experiments/decision-experience/task-pack.json';
  const packageOutput = buildPackage(fileURLToPath(root), JSON.parse(read(proposalPath)));
  if (JSON.stringify(JSON.parse(read(studyPath))) !== JSON.stringify(packageOutput.readiness)) throw new Error('Study summary replay differs');
  const rehearsal = JSON.parse(read(taskPath));
  if (JSON.stringify(rehearsal) !== JSON.stringify(packageOutput.taskPack)) throw new Error('Task pack replay differs');
  for (const path of [pilotPath, migrationPath, proposalPath, studyPath, taskPath]) inputs.push({ path, sha256: hash(read(path)) });
  const shortLabels = ['Employment / population', 'Unemployment', 'Poverty headcount'];
  const families = income.families.map((f, i) => {
    const receipt = income.receipts.find(x => x.id === f.source_id);
    const observations = f.observations;
    return { id: f.id, label: shortLabels[i], fullLabel: f.label, denominator: f.denominator,
      vintage: f.vintage, limitation: f.limitation, relationship: f.relationship,
      coverage: new Set(observations.map(x => x.iso3)).size, observations: observations.length,
      nativeSource: `${income.source_directory}/${f.source_id}.body`, sourceUrl: receipt.url,
      sourceSha256: receipt.body_sha256, acquiredAt: receipt.ended_at,
      publisherIdentityVerified: false, licence: f.licence,
      increasingInterpretation: i === 0 ? 'more employment relative to population' : i === 1 ? 'more unemployment relative to labour force' : 'more poverty relative to reporting population',
    };
  });
  const forecasts = forecastFiles.map(([file, expected, country, place, defective]) => {
    const path = 'forecasts/prospective-pilot/' + file, bytes = read(path);
    if (hash(bytes) !== expected) throw new Error(`Issued forecast differs: ${path}`);
    inputs.push({ path, sha256: expected });
    const f = JSON.parse(bytes);
    return { id: f.id, path, country, place, question: f.question, probability: f.probability,
      targetScope: f.target.scope, targetEvent: f.target.event, resolutionRule: f.target.resolution_rule,
      referenceProbability: f.baseline.probability, naiveProbability: f.naive_baseline.probability,
      issuedAt: f.issued_at, resolveAfter: f.resolve_after, resolveBy: f.resolve_by,
      resolutionStatus: f.resolution.status, operationalStatus: defective ? 'blocked-defect' : 'issued-research',
      isStormForecast: false, registration: 'Self-posted registration, not independent authentication',
      defect: defective ? 'Resolution prose and native geography conflict. Admission blocked; not formally voided or excluded.' : null,
      sourceSha256: expected };
  });
  return {
    schemaVersion: '1.0.0', id: 'weather-station.round-11', mode: 'research', authority: 'none',
    evidenceCut: '2026-09-10', buildEdition: 'Round 11', years: Array.from({ length: 21 }, (_, i) => 2005 + i),
    observationCount: families.reduce((n, f) => n + f.observations, 0),
    stormAssessmentCount: review.country_periods.length, assessableStormPeriods: review.summary.assessable_storm_periods,
    forecastSkillEstablished: false, publicReleaseApproved: false,
    families, forecasts, inputs, pilot, migrations, study: packageOutput.readiness, rehearsal,
    countries: countries.countries.map(c => ({ code: c.iso3, name: c.name, rank: c.rank,
      series: Object.fromEntries(income.families.map(f => [f.id, f.observations.filter(x => x.iso3 === c.iso3).map(x => ({
        year: x.year, value: x.value, selector: x.source_selector, estimateType: x.estimate_type,
        estimationType: x.estimation_type, flags: x.flags,
      }))])),
      assessments: review.country_periods.filter(x => x.country === c.iso3).map(x => ({ year: x.period.to,
        state: x.state, missing: x.missing_evidence, missingSeries: x.missing_series,
        beneficialShiftUnassessed: x.beneficial_shift_unassessed,
        native: x.native_context.map(v => ({ family: v.family_id, change: v.native_change_pp })),
      })),
    })),
    crossings: review.proxy_audit.filter(x => x.naive_five_point_crossing || x.naive_five_point_beneficial_movement)
      .map(x => ({ country: x.country, year: x.year, family: x.family_id, change: x.native_change_pp,
        direction: x.naive_five_point_crossing ? 'adverse-native' : 'beneficial-native', limits: x.comparability_limits,
        isStormFire: false })),
  };
}
