import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertIssuanceClock, deriveSealClocks, verifyProviderReceipt, writeOnceBundle, verifyCapture, digest } from '../round-10-canada/issuance-workflow.mjs';
import { execFileSync } from 'node:child_process';

const seal={sealAt:'2026-09-10T08:00:00Z',issueOpensAt:'2026-09-10T08:10:00Z',sourceCommit:'a'.repeat(40)};
const request={body:'Ren research registration\nsha256:'+ 'b'.repeat(64)};
const provider={id:123,html_url:'https://github.com/ferborva/mind-flow/pull/42#issuecomment-123',url:'https://api.github.com/repos/ferborva/mind-flow/issues/comments/123',issue_url:'https://api.github.com/repos/ferborva/mind-flow/issues/42',body:request.body,created_at:'2026-09-10T08:01:00Z',updated_at:'2026-09-10T08:01:00Z',user:{id:1,login:'test-only'}};
const response=(status,body)=>Buffer.from(`HTTP/2.0 ${status} OK\r\ncontent-type: application/json\r\n\r\n${JSON.stringify(body)}`);
test('actual-clock guards reject early, late, nonexact and backdated operations',()=>{
  assert.equal(deriveSealClocks(new Date('2026-09-10T08:00:00.123Z'),'a'.repeat(40)).issueOpensAt,seal.issueOpensAt);
  assert.throws(()=>deriveSealClocks(new Date('2026-09-29T23:55:00Z'),'a'.repeat(40)),/window/);
  assert.throws(()=>deriveSealClocks(new Date('2026-09-10T08:00:00Z'),'short'),/commit/);
  assert.throws(()=>assertIssuanceClock('register',seal,new Date('2026-09-10T08:00:00Z')),/after seal/);
  assert.throws(()=>assertIssuanceClock('register',seal,new Date(seal.issueOpensAt)),/before issue/);
  assert.throws(()=>assertIssuanceClock('issue',seal,new Date('2026-09-10T08:09:59.999Z')),/not open/);
  assert.doesNotThrow(()=>assertIssuanceClock('issue',seal,new Date(seal.issueOpensAt)));
  assert.throws(()=>assertIssuanceClock('issue',seal,new Date('2026-09-30T00:00:00Z')),/closed/);
  assert.throws(()=>assertIssuanceClock('issue',{...seal,sealAt:'2026-09-10'},new Date()),/exact/);
});
test('provider receipt requires exact response/readback identity, body and prospective timestamps',()=>{
  const args={postBytes:response(201,provider),readbackBytes:response(200,provider),request,clocks:seal,protocolContentSha256:'sha256:'+'b'.repeat(64),now:new Date('2026-09-10T08:02:00Z')};
  const receipt=verifyProviderReceipt(args);assert.equal(receipt.registered_at,provider.created_at);
  for(const mutate of [p=>p.body+='edited',p=>p.updated_at='2026-09-10T08:01:01Z',p=>p.issue_url=p.issue_url.replace('/42','/43'),p=>p.created_at=p.updated_at='2026-09-10T08:10:00Z',p=>p.id=124]){
    const changed=structuredClone(provider);mutate(changed);
    assert.throws(()=>verifyProviderReceipt({...args,readbackBytes:response(200,changed)}));
  }
  assert.throws(()=>verifyProviderReceipt({...args,postBytes:response(200,provider)}),/status/);
  assert.throws(()=>verifyProviderReceipt({...args,now:new Date('2026-09-10T08:00:59Z')}),/future/);
});
test('write-once bundles reject overwrite and path escape',()=>{
  const temp=mkdtempSync(join(tmpdir(),'canada-issue-test-'));
  try{
    const path=join(temp,'bundle');writeOnceBundle(path,{'issued.json':Buffer.from('first')});
    assert.throws(()=>writeOnceBundle(path,{'issued.json':Buffer.from('second')}));
    assert.equal(readFileSync(join(path,'issued.json'),'utf8'),'first');
    assert.throws(()=>writeOnceBundle(join(temp,'escape'),{'../outside':Buffer.from('bad')}),/filename/);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
test('capture metadata must reproduce bytes, endpoint, method and actual chronology',()=>{
  const bytes=response(200,provider),metadata={started_at:'2026-09-10T08:01:01.000Z',ended_at:'2026-09-10T08:01:02.500Z',sha256:digest(bytes),byte_length:bytes.length,method:'GET',endpoint:'repos/ferborva/mind-flow/issues/comments/123'};
  const options={method:'GET',endpoint:metadata.endpoint,status:200,notBefore:seal.sealAt,notAfter:seal.issueOpensAt,now:new Date('2026-09-10T08:02:00Z')};
  assert.doesNotThrow(()=>verifyCapture(bytes,metadata,options));
  for(const change of [{sha256:'sha256:'+'0'.repeat(64)},{method:'POST'},{endpoint:'elsewhere'},{ended_at:'2026-09-10T08:11:00.000Z'},{started_at:'2026-09-10T08:01:03.000Z'}])assert.throws(()=>verifyCapture(bytes,{...metadata,...change},options));
});
test('CLI exposes only bounded commands and never accepts a clock override',()=>{
  const cli=new URL('../round-10-canada/issuance.mts',import.meta.url).pathname;
  assert.match(execFileSync(process.execPath,[cli,'--help'],{encoding:'utf8'}),/--check/);
  for(const args of [['register'],['issue'],['seal','--now=2026-09-10T08:00:00Z'],['--garbage']])assert.throws(()=>execFileSync(process.execPath,[cli,...args],{stdio:'pipe'}));
});
