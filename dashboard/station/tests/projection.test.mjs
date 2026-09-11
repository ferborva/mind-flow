import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildStation, verifyInputs, selectSeries, describeChange, preparationFor } from '../projection.mjs';

const station = buildStation();
test('station projects the exact retained income history, not the synthetic Observatory', () => {
  assert.equal(station.countries.length, 50);
  assert.equal(station.observationCount, 3129);
  assert.deepEqual(station.families.map(x => x.coverage), [50, 50, 49]);
  assert.equal(station.mode, 'research');
  assert.equal(station.authority, 'none');
  assert.equal(station.stormAssessmentCount, 1000);
  assert.equal(station.assessableStormPeriods, 0);
  assert.equal(station.forecastSkillEstablished, false);
  assert.equal(station.publicReleaseApproved, false);
  assert.ok(station.inputs.every(x => /^[a-f0-9]{64}$/.test(x.sha256)));
});
test('country and year selection preserve exact native measurements and never backfill', () => {
  const usa = selectSeries(station, 'USA', 'income-employment-population.v1');
  assert.equal(usa.find(x => x.year === 2025).value, 59.114);
  assert.equal(usa.find(x => x.year === 2024).value, 59.467);
  assert.equal(describeChange(station, 'USA', 'income-employment-population.v1', 2025).change, -0.353);
  assert.equal(describeChange(station, 'ARG', 'income-poverty-lineup.v1', 2025).change, null);
  assert.equal(describeChange(station, 'USA', 'income-employment-population.v1', 2005).change, null);
  assert.throws(() => selectSeries(station, 'WORLD', station.families[0].id), /Unknown economy/);
  assert.throws(() => selectSeries(station, 'USA', 'invented'), /Unknown family/);
  assert.throws(() => describeChange(station, 'USA', station.families[0].id, 2026), /retained year/);
});
test('source selection and model labels survive projection for every point', () => {
  const income = JSON.parse(readFileSync(new URL('../../../signals/countries/income-measurements.v1.json', import.meta.url)));
  for (const family of income.families) for (const row of family.observations) {
    const actual = selectSeries(station, row.iso3, family.id).find(x => x.year === row.year);
    assert.equal(actual.value, row.value);
    assert.equal(actual.selector, row.source_selector);
    assert.equal(actual.estimateType, row.estimate_type);
  }
});
test('native movement is never promoted to affected-person share or permission', () => {
  const peru = describeChange(station, 'PER', station.families[0].id, 2020);
  assert.equal(peru.change, -10.772);
  assert.equal(peru.stormState, 'cannot-say');
  assert.equal(peru.disruptedPopulationShare, null);
  assert.equal(peru.actionAuthorised, false);
  const preparation = preparationFor(station, 'PER', 2020);
  assert.equal(preparation.status, 'research-options-only');
  assert.equal(preparation.authority, 'none');
  assert.ok(preparation.options.every(x => x.startIf && x.stopIf && x.ownerRole));
});
test('retained source and review tampering are rejected before display', () => {
  const load = path => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');
  assert.throws(() => verifyInputs(path => path.endsWith('storm-review.v1.json') ? load(path).replace('"cannot-say"', '"candidate"') : load(path)), /replay|differs/);
  assert.throws(() => verifyInputs(path => path.endsWith('income-measurements.v1.json') ? load(path).replace('74.315', '74.316') : load(path)), /replay|differs/);
});
test('all issued records are visible, including the blocked defective predecessor', () => {
  assert.equal(station.forecasts.length, 4);
  assert.equal(station.forecasts.filter(x => x.operationalStatus === 'blocked-defect').length, 1);
  assert.equal(station.forecasts.filter(x => x.resolutionStatus === 'pending').length, 4);
  const canada = station.forecasts.find(x => x.country === 'CAN');
  assert.equal(canada.probability, 0.090909);
  assert.equal(canada.isStormForecast, false);
});
test('integrated research gates never present a pilot, migration or study as completed', () => {
  assert.equal(station.pilot.evidenceAdmission.admittedMeasurements, 0);
  assert.equal(station.migrations.applied_corrections, 0);
  assert.equal(station.study.recruitment_allowed, false);
  assert.equal(station.study.human_testing_completed, false);
  assert.equal(station.rehearsal.tasks.length, 3);
});
test('reader adoptions and metadata depth remain distinct from measurements and kernel corrections', () => {
  assert.equal(station.readerEdition.applied_reader_metadata_adoptions, 3);
  assert.equal(station.readerEdition.completed_kernel_corrections, 0);
  assert.equal(station.readerEdition.observations_transferred, 0);
  assert.equal(station.sippMetadata.variables.length, 16);
  assert.equal(station.sippMetadata.recordsAcquired, 0);
  assert.equal(station.sippMetadata.admittedMeasurements, 0);
  assert.equal(station.sippMetadata.annotationEdition, '1.0.1');
});
test('station rejects altered research-reader summary or metadata annotations', () => {
  const load = path => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');
  assert.throws(() => buildStation(path => path.endsWith('round-11-research-reader.summary.json') ? load(path).replace('"completed_kernel_corrections": 0', '"completed_kernel_corrections": 3') : load(path)), /Reader edition replay differs/);
  assert.throws(() => buildStation(path => path.endsWith('sipp-crosswalk.v1.json') ? load(path).replace('"recordsAcquired": 0', '"recordsAcquired": 1') : load(path)), /SIPP metadata replay differs/);
});
test('task-pack replay rejects a rehashed unreviewed prompt', () => {
  const load = path => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');
  assert.throws(() => buildStation(path => {
    const bytes = load(path);
    if (!path.endsWith('/task-pack.json')) return bytes;
    const value = JSON.parse(bytes); value.tasks[0].prompt = 'Unreviewed replacement';
    return JSON.stringify(value);
  }), /Task pack replay differs/);
});
test('source capture reads each projected input once', () => {
  const counts = new Map();
  buildStation(path => {
    counts.set(path, (counts.get(path) || 0) + 1);
    return readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');
  });
  assert.ok(counts.size > 10);
  assert.ok([...counts.values()].every(x => x === 1));
});
test('inquiry can begin before source adequacy is established, without authorising acquisition', () => {
  const option = preparationFor(station, 'USA', 2025).options.find(x => x.id === 'investigate');
  assert.match(option.startIf, /metadata/);
  assert.doesNotMatch(option.startIf, /source can measure/);
  assert.match(option.stopIf, /personal data|paid access/);
  assert.match(option.next, /admission/);
});
test('review desk binds protocol clocks, the disclosed defect and separate date-only trust decision', () => {
  assert.equal(station.trustReview.reviewDate, '2026-09-16');
  assert.equal(station.trustReview.sourceTimeZone, null);
  for (const f of station.forecasts) {
    const original = JSON.parse(readFileSync(new URL('../../../' + f.path, import.meta.url)));
    assert.equal('sha256:' + f.reviewProtocol.sha256, original.prospective_registration.preregistration_sha256);
    assert.equal(f.recordedIssueClock.trusted, false);
    assert.equal(f.terminalRecordsLoaded, false);
    assert.equal(f.forecastUse, 'research_only');
    assert.equal(f.observationStartsAt, original.target.observation_window_start);
    assert.equal(f.observationEndsAt, original.target.observation_window_end);
    assert.equal(f.outcomePublicationNotBefore, original.target.outcome_publication_not_before);
    assert.ok(station.inputs.some(x => x.path === f.reviewProtocol.path && x.sha256 === f.reviewProtocol.sha256));
  }
  assert.match(station.forecasts.find(f => f.operationalStatus === 'blocked-defect').disclosureSource.path, /error-disclosure.json$/);
  assert.ok(station.inputs.some(x => x.path === station.trustReview.path));
});
test('changed protocol, disclosure or time-bounded trust decision cannot retain stale review annotations', () => {
  const load = path => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');
  for (const suffix of ['round-08-nero/preregistration.json', 'round-09-nero/error-disclosure.json', 'round-10-receipt-trust-decision.md']) {
    assert.throws(() => buildStation(path => path.endsWith(suffix) ? load(path) + '\n' : load(path)), /Review source differs/);
  }
});
