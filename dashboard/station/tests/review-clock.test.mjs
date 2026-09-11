import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewDesk } from '../review-clock.mjs';

const forecast = {
  id: 'review-fixture', place: 'Synthetic clock fixture', path: 'fixture.json', sourceSha256: 'a'.repeat(64),
  issuedAt: '2026-09-09T11:43:39Z', resolveAfter: '2026-11-01T00:00:00Z', resolveBy: '2026-12-07T00:00:00Z',
  resolutionStatus: 'pending', operationalStatus: 'issued-research',
};
const trust = { reviewDate: '2026-09-16', path: 'trust-fixture.md', sourceSha256: 'b'.repeat(64) };
const inspect = (asOf, rows = [forecast]) => reviewDesk(rows, trust, asOf);

for (const [instant, phase] of [
  ['2026-09-09T11:43:38Z', 'before-recorded-issuance'],
  ['2026-09-09T11:43:39Z', 'not-open'],
  ['2026-10-31T23:59:59.999Z', 'not-open'],
  ['2026-11-01T00:00:00Z', 'window-open'],
  ['2026-12-06T23:59:59.999Z', 'window-open'],
  ['2026-12-07T00:00:00Z', 'window-open'],
  ['2026-12-07T00:00:00.001Z', 'deadline-passed'],
  ['2027-01-01T00:00:00Z', 'deadline-passed'],
]) test(`clock attention at ${instant} is ${phase}, not an outcome`, () => {
  const result = inspect(instant), row = result.forecasts[0];
  assert.equal(row.windowPhase, phase);
  assert.equal(row.resolutionStatus, 'pending');
  assert.equal(row.outcome, null);
  assert.equal(row.score, null);
  assert.equal(row.authority, 'none');
  assert.equal(result.clockAuthenticated, false);
  assert.equal(result.sourceAvailabilityChecked, false);
  assert.equal(result.mutatesRecords, false);
  assert.match(row.nextReview, /review|inspect/i);
});

test('defective predecessor stays admission-blocked across every clock phase', () => {
  for (const instant of ['2026-09-01T00:00:00Z', '2026-11-02T00:00:00Z', '2027-01-01T00:00:00Z']) {
    const row = inspect(instant, [{...forecast, operationalStatus:'blocked-defect'}]).forecasts[0];
    assert.equal(row.admissionBlocked, true);
    assert.equal(row.attention, 'blocked-defect');
    assert.equal(row.resolutionStatus, 'pending');
    assert.equal(row.outcome, null);
    assert.match(row.nextReview, /defect/i);
  }
});

test('date-only engineering trust review is not forecast expiry or an authenticated clock', () => {
  assert.equal(inspect('2026-09-15T23:59:59Z').trustReview.calendarPosition, 'before-review-date');
  assert.equal(inspect('2026-09-16T00:00:00Z').trustReview.calendarPosition, 'on-review-date');
  const overdue = inspect('2026-09-17T00:00:00Z');
  assert.equal(overdue.trustReview.calendarPosition, 'past-review-date');
  assert.equal(overdue.trustReview.sourceTimeZone, null);
  assert.equal(overdue.trustReview.acceptanceRenewed, false);
  assert.equal(overdue.forecasts[0].windowPhase, 'not-open');
  assert.equal(overdue.forecasts[0].resolutionStatus, 'pending');
});

test('independent windows retain exact source clocks and identities without mutating inputs', () => {
  const rows = [forecast, {...forecast, id:'canada-fixture', resolveAfter:'2026-11-06T00:00:00Z', resolveBy:'2026-12-31T23:59:59Z'}];
  const before = JSON.stringify({rows,trust});
  const result = inspect('2026-11-03T00:00:00Z', rows);
  assert.deepEqual(result.forecasts.map(x => x.windowPhase), ['window-open','not-open']);
  assert.equal(result.forecasts[1].source.path, 'fixture.json');
  assert.equal(result.forecasts[1].resolveAfter, rows[1].resolveAfter);
  assert.equal(JSON.stringify({rows,trust}), before);
});

for (const bad of ['2026-02-30T00:00:00Z','2026-11-01','2026-11-01T00:00:00+10:00','2026-11-01T00:00:00','not-a-clock',null,0]) {
  test(`reject ambiguous or invalid review instant ${bad}`, () => assert.throws(() => inspect(bad), /UTC instant/));
}
for (const change of [
  {resolveBy:'2026-10-01T00:00:00Z'}, {issuedAt:'2027-01-01T00:00:00Z'},
  {issuedAt:'2026-11-01T00:00:00Z'},
  {resolutionStatus:'resolved'}, {operationalStatus:'approved'}, {sourceSha256:''},
]) test(`changed clock contract requires review: ${JSON.stringify(change)}`, () => {
  assert.throws(() => inspect('2026-11-01T00:00:00Z', [{...forecast,...change}]), /Forecast review contract/);
});
test('malformed or duplicate inventories and rolled-over trust dates fail visibly', () => {
  assert.throws(() => inspect('2026-11-01T00:00:00Z', [forecast,forecast]), /duplicate/);
  assert.throws(() => reviewDesk([forecast], {...trust,reviewDate:'2026-02-30'}, '2026-11-01T00:00:00Z'), /Trust review contract/);
});
test('an open window asks whether evidence exists before asking to inspect it', () => {
  assert.match(inspect('2026-11-03T00:00:00Z').forecasts[0].nextReview, /Check whether qualifying independently retained source evidence is available/);
});
