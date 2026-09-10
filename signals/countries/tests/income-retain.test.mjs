import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainSourceAttempt } from '../tools/income-retain.mts';
import { sha256 } from '../tools/measure.mjs';

async function attempt(t,fetcher,options={}) {
  const directory=await mkdtemp(join(tmpdir(),'income-retain-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await assert.rejects(retainSourceAttempt(directory,'fixture','https://example.invalid/source',{fetcher,...options}),/failed attempt retained/);
  assert.ok(!(await readdir(directory)).some(f=>f.endsWith('.receipt.json')));
  const failed=join(directory,'failed-attempts');
  const file=(await readdir(failed)).find(f=>f.endsWith('.json'));
  const metadata=JSON.parse(await readFile(join(failed,file),'utf8'));
  const body=await readFile(join(failed,metadata.partial_body_file));
  const headers=await readFile(join(failed,metadata.headers_file));
  assert.equal(metadata.partial_body_sha256,sha256(body));
  assert.equal(metadata.headers_sha256,sha256(headers));
  assert.equal(metadata.body_complete,false);
  return {metadata,body,headers};
}
const response=body=>({url:'https://example.invalid/source',status:200,ok:true,headers:new Headers({'content-type':'text/csv','x-source':'fixture'}),body});
test('stream failure retains received headers and partial bytes outside the successful collection',async t=>{
  const result=await attempt(t,async()=>response((async function*(){yield Buffer.from('partial');throw new Error('fixture stream failure');})()));
  assert.equal(result.body.toString(),'partial');assert.match(result.headers.toString(),/x-source: fixture/);
  assert.equal(result.metadata.status,200);assert.match(result.metadata.error,/stream failure/);
});
test('size cap retains only bounded partial bytes, including the allowed portion of the final chunk',async t=>{
  const result=await attempt(t,async()=>response((async function*(){yield Buffer.from('123456');})()),{maxBytes:4});
  assert.equal(result.body.toString(),'1234');assert.match(result.metadata.error,/acquisition limit/);
});
test('a failure before headers retains an explicit empty partial attempt, never an HTTP success',async t=>{
  const result=await attempt(t,async()=>{throw new Error('fixture timeout');});
  assert.equal(result.metadata.status,null);assert.equal(result.body.length,0);assert.equal(result.headers.length,0);
  assert.equal(result.metadata.response_received,false);
});
