import assert from 'node:assert/strict';
import test from 'node:test';
import { retainResponse } from './tools/permission-retain.mjs';
import { extractPermission, buildPermissionCandidate, verifyPermissionArtifact } from './tools/permission-candidate.mjs';
import { readFileSync } from 'node:fs';
import { sha256 } from './tools/measure.mjs';

const ids=Array.from({length:50},(_,i)=>`X${String(i).padStart(2,'0')}`);
const fixture=()=>[{page:1,pages:1,total:50,sourceid:'2',lastupdated:'2026-07-13'},ids.map(country=>({indicator:{id:'GD_WBL_OVL_LAW'},date:'2025',countryiso3code:country,value:80,obs_status:''}))];
test('native permission index has one exact common vintage, 0–100 score and no proxy substitution',()=>{
  const data=fixture();data[1][49].value=null;
  const result=extractPermission(data,ids);
  assert.equal(result.coverage,49);assert.equal(result.year,2025);assert.deepEqual(result.missing,[ids[49]]);
  for(const mutate of [d=>d[0].pages=2,d=>d[0].lastupdated='2024-01-01',d=>d[1][0].indicator.id='SG.LAW.INDX',
    d=>d[1][0].value=101,d=>d[1][0].value=-1,d=>d[1][0].value='80',d=>d[1][0].date='2024']){
    const bad=fixture();mutate(bad);assert.throws(()=>extractPermission(bad,ids));
  }
  const duplicate=fixture();duplicate[1][1].countryiso3code=ids[0];assert.throws(()=>extractPermission(duplicate,ids));
});

test('permission retention keeps unsuccessful response bodies and exact headers without admission', async()=>{
  const capture=await retainResponse('test','https://example.invalid',new Response('temporarily unavailable',{status:503,headers:{'content-type':'text/plain'}}),'2026-09-10T00:00:00.000Z');
  assert.equal(capture.receipt.status,503);
  assert.equal(capture.receipt.usable_http_response,false);
  assert.equal(capture.body.toString(),'temporarily unavailable');
  assert.match(capture.headers.toString(),/content-type: text\/plain/);
  assert.equal(capture.receipt.body_byte_length,capture.body.length);
});

test('pinned source admission rejects corrected local hashes and failed HTTP status',()=>{
  const path=new URL('./sources/permission-2026-09-10/wbl-indicator',import.meta.url);
  const body=readFileSync(new URL(path+'.body')),headers=readFileSync(new URL(path+'.headers.txt')),receipt=JSON.parse(readFileSync(new URL(path+'.receipt.json')));
  assert.doesNotThrow(()=>verifyPermissionArtifact('wbl-indicator',body,headers,receipt));
  const modified=Buffer.from(body.toString().replace('Legal Framework','Enforcement'));
  assert.throws(()=>verifyPermissionArtifact('wbl-indicator',modified,headers,{...receipt,body_sha256:sha256(modified),body_byte_length:modified.length}),/pin/);
  assert.throws(()=>verifyPermissionArtifact('wbl-indicator',body,headers,{...receipt,status:503}),/status/);
});

test('retained permission measurement reproduces49 countries without enforcement or current-access claims',async()=>{
  const actual=await buildPermissionCandidate();
  const retained=JSON.parse(readFileSync(new URL('./permission-candidate.v1.json',import.meta.url)));
  assert.deepEqual(actual,retained);
  assert.equal(actual.coverage,49);assert.deepEqual(actual.missing_countries,['TWN']);
  assert.equal(actual.reference_year,2025);assert.equal(actual.licence.status,'CC BY 3.0 IGO');
  assert.equal(actual.binding_category,null);assert.equal(actual.storm_detected,null);
  assert.match(actual.evidence_ceiling,/Not a percentage of women/);
  assert.equal(actual.observations.find(r=>r.country==='AUS').value,91.88);
});
