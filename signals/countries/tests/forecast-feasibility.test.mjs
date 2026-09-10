import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, verifyReceipt } from '../tools/measure.mjs';
import { assessForecastObservationClock } from '../forecast-feasibility.mts';
test('official calendar and methodology captures remain pinned and byte-verifiable',()=>{
  for(const [id,hash] of Object.entries({
    'pip-update-calendar':'046971c697ca2fe69190a1f266472efbd3580638026f0de38297bfcec23a349a',
    'pip-data360-metadata':'d6cb9d4e3f9bbeed7e93d1976276cc09651dc24da192bb791ba245cafed6de82',
    'statcan-release-calendar':'f7af7f426ab9755ef209e8916f2ca03f93162a58dff7a0b3c4e61b084b964875',
  })){
    const read=suffix=>readFileSync(new URL(`../sources/forecast-feasibility-2026-09-10/${id}.${suffix}`,import.meta.url));
    const body=read('body'),receipt=JSON.parse(read('receipt.json').toString());
    verifyReceipt(body,read('headers.txt'),receipt);assert.equal(sha256(body),`sha256:${hash}`);assert.equal(receipt.status,200);
  }
});

test('a future publisher-estimate revision cannot turn the 2025 reference period into a future observation',()=>{
  const result=assessForecastObservationClock({issueClosesAt:'2026-09-11T00:00:00Z',referencePeriodStart:'2025-01-01T00:00:00Z',referencePeriodEnd:'2025-12-31T23:59:59Z',publicationNotBefore:'2026-10-01T00:00:00Z',sourceKind:'publisher-estimate'});
  assert.equal(result.clock_eligible,false);assert.ok(result.blockers.includes('REFERENCE_PERIOD_ALREADY_STARTED'));
  assert.equal(result.issuance_authorised,false);assert.match(result.public_conclusion,/cannot turn a past reference period into a future observation/);
});
test('a future reported October observation can fit November publication without claiming full issuance eligibility',()=>{
  const result=assessForecastObservationClock({issueClosesAt:'2026-09-11T00:00:00Z',referencePeriodStart:'2026-10-01T00:00:00Z',referencePeriodEnd:'2026-10-31T23:59:59Z',publicationNotBefore:'2026-11-06T00:00:00Z',sourceKind:'reported'});
  assert.equal(result.clock_eligible,true);assert.equal(result.issuance_authorised,false);
});
test('clock assessment rejects malformed instants and publication before the observation ends',()=>{
  assert.throws(()=>assessForecastObservationClock({issueClosesAt:'garbage'}),/exact UTC/);
  const result=assessForecastObservationClock({issueClosesAt:'2026-09-11T00:00:00Z',referencePeriodStart:'2026-10-01T00:00:00Z',referencePeriodEnd:'2026-10-31T23:59:59Z',publicationNotBefore:'2026-10-06T00:00:00Z',sourceKind:'reported'});
  assert.ok(result.blockers.includes('PUBLICATION_PRECEDES_REFERENCE_PERIOD_END'));
});
