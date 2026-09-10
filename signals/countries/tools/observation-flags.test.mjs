import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMeasurements, loadSources } from './build-measurements.mjs';
import { extractIlo } from './measure.mjs';

test('ILO model status comes from source mapping, never an unretained flag legend',async()=>{
  const frame=readFileSync(new URL('../country-set.v1.json',import.meta.url));
  const signal=buildMeasurements(frame,await loadSources()).signals.find(s=>s.id==='labour-income-share');
  assert.equal(signal.observation_status_interpretation,'native-flag-retained-meaning-not-verified');
  assert.equal(signal.observation_status_legend,null);
  assert.doesNotMatch(signal.model_status,/imputation flags/);
  assert.deepEqual(Object.fromEntries(['M','I'].map(flag=>[flag,signal.observations.filter(row=>row.observation_status===flag).length])),{M:32,I:18});
  const dictionary=[{ref_area:'USA',source:'XA:2174','source.label':'ILO - Modelled Estimates'}];
  for(const flag of ['M','I','', 'A', 'not-modelled']){
    const [row]=extractIlo([{ref_area:'USA',source:'XA:2174',indicator:'LAP_2GDP_NOC_RT',time:'2025',obs_value:'55.807',obs_status:flag}],dictionary);
    assert.equal(row.observation_status,flag);
    assert.equal(row.modelled,true,`native flag ${flag} cannot override the verified model source`);
  }
});
