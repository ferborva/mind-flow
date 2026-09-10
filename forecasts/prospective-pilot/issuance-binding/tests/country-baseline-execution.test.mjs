import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCanadaCompanion, runCountryBaseline, CANADA_SELECTOR } from '../country-baseline-execution.mjs';

const parameters={first_month:'2026-01',last_month:'2026-04',horizon_months:2};
const document={selector:CANADA_SELECTOR,observations:[
  {month:'2026-01',value:'7.1'},{month:'2026-02',value:'7.100'},
  {month:'2026-03',value:'7.100'},{month:'2026-04',value:'7.099'},
]};
test('native decimal rates compare exactly, ties count, Laplace smoothing',()=>{
  assert.equal(runCountryBaseline('mind-flow.country-two-month-direction',document,parameters),0.5);
  assert.equal(runCountryBaseline('mind-flow.equal-probability',document,parameters),0.5);
});
test('both baselines reject missing, duplicate, malformed or nonnative inputs',()=>{
  for(const id of ['mind-flow.country-two-month-direction','mind-flow.equal-probability']){
    for(const mutate of [d=>d.observations.pop(),d=>d.observations.push(d.observations[0]),d=>d.observations[0].value='7.1001',d=>d.selector={...d.selector,source:'MODEL'}]){
      const d=structuredClone(document);mutate(d);assert.throws(()=>runCountryBaseline(id,d,parameters));
    }
  }
  assert.throws(()=>runCountryBaseline('unknown',document,parameters));
  assert.throws(()=>runCountryBaseline('mind-flow.equal-probability',document,{...parameters,extra:true}));
});
test('extractor preserves native values and rejects target contamination, note changes and duplicates',()=>{
  const row={...CANADA_SELECTOR,time:'2026M08',obs_value:'7.302',obs_status:'',note_classif:'',note_indicator:'I12:422',note_source:'R1:3513'};
  const header=Object.keys(row);const csv=rows=>[header.join(','),...rows.map(r=>header.map(k=>r[k]).join(','))].join('\n');
  assert.deepEqual(extractCanadaCompanion(csv([row])).observations,[{month:'2026-08',value:'7.302'}]);
  assert.throws(()=>extractCanadaCompanion(csv([row,row])),/duplicate/);
  assert.throws(()=>extractCanadaCompanion(csv([{...row,time:'2026M10'}])),/future/);
  assert.throws(()=>extractCanadaCompanion(csv([{...row,note_source:'R1:other'}])),/metadata/);
  assert.throws(()=>extractCanadaCompanion(csv([{...row,source:'SA:other'}])),/selector/);
});
