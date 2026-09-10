import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, discoverArchive, inWindow, approvedUrl } from '../round-10-intake/collector.mjs';
import { publish } from '../round-10-intake/publish.mjs';
const archive = 'https://www.jobsandskills.gov.au/sites/default/files/2026-11/2026-10_nero.zip';
const fixture = '<h2>Downloads</h2><a href="/sites/default/files/2026-11/2026-10_nero_for_regional_and_northern_australia.zip">subset</a><a href="/sites/default/files/2026-11/2026-10_nero.zip">Download</a>';
test('daily window is specifically November 2026 through resolution close', () => {
  assert.equal(inWindow('2026-10-31T23:59:59Z'), false);
  assert.equal(inWindow('2026-11-01T00:00:00Z'), true);
  assert.equal(inWindow('2026-12-07T00:00:00Z'), false);
  assert.equal(inWindow('2027-11-01T00:00:00Z'), false);
});
test('fixture selects complete native October archive and rejects ambiguity', () => {
  assert.equal(discoverArchive(fixture), archive);
  assert.equal(discoverArchive('<a href="/other.zip">Download</a>'), null);
  assert.throws(() => discoverArchive(fixture + '<a href="/sites/default/files/2026-12/2026-10_nero.zip">revision</a>'), /multiple/);
  for (const url of ['http://www.jobsandskills.gov.au/data/nero', archive+'?x=1', archive.replace('www.jobsandskills.gov.au','evil.test'), archive.replace('/2026-11/','/../')]) assert.throws(() => approvedUrl(url, 'archive'));
  assert.throws(() => discoverArchive('<a href="https://evil.test/2026-10_nero.zip">Download</a>'), /approved/);
});
test('collector retains exact bytes and two independent first-presence prefixes without scoring', async () => {
  const dir=await mkdtemp(join(tmpdir(),'nero-intake-'));
  const clock=()=>new Date('2026-11-04T04:00:00Z');
  const fetcher=async url=>new Response(url.endsWith('.zip')?Buffer.from('PK fixture bytes'):fixture,{status:200,headers:{'content-type':url.endsWith('.zip')?'application/zip':'text/html'}});
  const result=await collect({destination:join(dir,'first'),fetcher,clock});
  assert.equal(result.state,'retained');
  assert.equal(await readFile(join(dir,'first','2026-10_nero.zip'),'utf8'),'PK fixture bytes');
  assert.equal(result.first_publication_verified,false);
  for(const campaign of ['round-08-nero','round-09-nero-corrected']) {
    const event=JSON.parse(await readFile(join(dir,'first',campaign+'.first-presence.json')));
    assert.equal(event.state,'reported_present_checksum_only');
    assert.equal(event.artifact_sha256,result.archive_sha256);
  }
  await assert.rejects(collect({destination:join(dir,'first'),fetcher,clock}), /EEXIST/);
});
test('failed or oversized fetch retains attempt evidence and cannot claim presence', async () => {
  const dir=await mkdtemp(join(tmpdir(),'nero-failure-'));
  await assert.rejects(collect({destination:join(dir,'attempt'),clock:()=>new Date('2026-11-04T00:00:00Z'),fetcher:async()=>new Response('too large'),pageCap:2}),/cap/);
  assert.ok((await readdir(join(dir,'attempt'))).includes('failure.json'));
  assert.ok(!(await readdir(join(dir,'attempt'))).some(x=>x.includes('first-presence')));
});
test('publisher retries never rewrite existing first presence and only creates missing PR', async () => {
  const dir=await mkdtemp(join(tmpdir(),'nero-publish-'));
  const destination=join(dir,'attempt');
  const observation=await collect({destination,clock:()=>new Date('2026-11-04T00:00:00Z'),fetcher:async url=>new Response(url.endsWith('.zip')?'PK fixture':fixture)});
  const calls=[];
  const request=(endpoint,input)=>{
    calls.push({endpoint,input});
    if(endpoint.startsWith('git/matching')) return [{ref:'refs/heads/ren/nero-october-2026-evidence',object:{sha:'retained'}}];
    if(endpoint.startsWith('contents/')) return {content:Buffer.from(JSON.stringify(observation)).toString('base64')};
    if(endpoint.startsWith('pulls?')) return [];
    if(endpoint==='pulls') return {number:1};
    throw new Error('unexpected mutation');
  };
  publish({directory:destination,repository:'ferborva/mind-flow',request});
  assert.deepEqual(calls.filter(c=>c.input).map(c=>c.endpoint),['pulls']);
  assert.equal(calls.at(-1).input.draft,true);
  observation.archive_sha256='sha256:revision';
  assert.throws(()=>publish({directory:destination,repository:'ferborva/mind-flow',request}),/revision observed/);
});
test('HTTP failure retains response body and status receipt', async () => {
  const dir=await mkdtemp(join(tmpdir(),'nero-http-failure-'));
  const destination=join(dir,'attempt');
  await assert.rejects(collect({destination,clock:()=>new Date('2026-11-04T00:00:00Z'),fetcher:async()=>new Response('publisher unavailable',{status:503})}),/503/);
  assert.equal(await readFile(join(destination,'nero-landing.html'),'utf8'),'publisher unavailable');
  assert.equal(JSON.parse(await readFile(join(destination,'nero-landing.html.receipt.json'))).status,503);
});
