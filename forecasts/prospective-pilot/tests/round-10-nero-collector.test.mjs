import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect, discoverArchive, inWindow, approvedUrl } from '../round-10-intake/collector.mjs';
import { publish } from '../round-10-intake/publish.mjs';
import { names,prefix,validateDirectory } from '../round-10-intake/validate-evidence.mjs';
import { pointerFor } from '../round-10-intake/lfs.mjs';
const now=new Date('2026-11-04T00:00:00Z');
const zip=Buffer.from([80,75,3,4,0,0,0,0]);
const archive='https://www.jobsandskills.gov.au/sites/default/files/2026-11/2026-10_nero.zip';
const fixture='<a href="/sites/default/files/2026-11/2026-10_nero_for_regional_and_northern_australia.zip">subset</a><a href="/sites/default/files/2026-11/2026-10_nero.zip">Download</a>';
async function capture(){const directory=join(await mkdtemp(join(tmpdir(),'nero-test-')),'attempt');await collect({destination:directory,clock:()=>now,fetcher:async url=>new Response(url.endsWith('.zip')?zip:fixture)});return directory;}
test('exact year and resolution window, hostile URLs, subset and ambiguity',()=>{
  assert.equal(inWindow('2026-11-01T00:00:00Z'),true);
  for(const s of ['2026-10-31T23:59:59Z','2026-12-07T00:00:00Z','2027-11-01T00:00:00Z'])assert.equal(inWindow(s),false);
  assert.equal(discoverArchive(fixture),archive);assert.equal(discoverArchive('<a href="other.zip">x</a>'),null);
  assert.throws(()=>discoverArchive(fixture+'<a href="/sites/default/files/2026-12/2026-10_nero.zip">other</a>'),/multiple/);
  for(const url of [archive+'?x=1',archive.replace('www.jobsandskills.gov.au','evil.test'),archive.replace('https:','http:')])assert.throws(()=>approvedUrl(url,'archive'));
});
test('exact bytes, chronology and create-only attempts',async()=>{
  const directory=await capture();assert.deepEqual(await readFile(join(directory,'2026-10_nero.zip')),zip);
  assert.equal(validateDirectory(directory,{now}).observation.first_publication_verified,false);
  await assert.rejects(collect({destination:directory,clock:()=>now}),/EEXIST/);
});
test('cap retains bounded prefix and HTTP failure retains complete response',async()=>{
  const root=await mkdtemp(join(tmpdir(),'nero-failure-'));const directory=join(root,'cap');
  await assert.rejects(collect({destination:directory,clock:()=>now,fetcher:async()=>new Response('abcdef'),pageCap:3}),/cap/);
  assert.equal(await readFile(join(directory,'nero-landing.html.partial'),'utf8'),'abc');
  assert.ok(!(await readdir(directory)).some(n=>n.includes('first-presence')));
  const failed=join(root,'http');await assert.rejects(collect({destination:failed,clock:()=>now,fetcher:async()=>new Response('unavailable',{status:503})}),/503/);
  assert.equal(await readFile(join(failed,'nero-landing.html'),'utf8'),'unavailable');
});
test('publication validates all files first, publishes pointer and never reopens closed PR',async()=>{
  const directory=await capture();const files=validateDirectory(directory,{now}).files;const writes=[];let existing=false,closed=false,badDiff=false;
  const api=(endpoint,input)=>{
    if(input)writes.push({endpoint,input});
    if(endpoint==='git/ref/heads/main')return {object:{sha:'base'}};
    if(endpoint.startsWith('git/matching'))return existing?[{ref:'refs/heads/ren/nero-october-2026-evidence',object:{sha:'head'}}]:[];
    if(endpoint==='git/commits/base')return {tree:{sha:'tree'}};
    if(endpoint==='git/commits/head')return {tree:{sha:'tree'},parents:[{sha:'base'}]};
    if(endpoint==='compare/base...base')return {status:'identical'};
    if(endpoint.startsWith('compare/'))return {files:names.map(n=>({filename:badDiff?'foreign':prefix+n,status:'added'}))};
    if(endpoint.startsWith('git/trees/tree?'))return {tree:names.map(n=>({path:prefix+n,type:'blob',mode:'100644',sha:n}))};
    if(endpoint.startsWith('git/blobs/')){const n=endpoint.slice(10);return {content:(n.endsWith('.zip')?pointerFor(zip):files[n]).toString('base64')};}
    if(endpoint.startsWith('contents/.gitattributes'))return {content:Buffer.from(prefix+'2026-10_nero.zip filter=lfs diff=lfs merge=lfs -text\n').toString('base64')};
    if(['git/blobs','git/trees','git/commits'].includes(endpoint))return {sha:'object'};
    if(endpoint==='git/refs')return {};
    if(endpoint.startsWith('pulls?'))return closed?[{state:'closed'}]:[];
    if(endpoint==='pulls')return {number:1};
    throw new Error('unexpected '+endpoint);
  };
  const options={directory,repository:'ferborva/mind-flow',expectedBase:'base',request:api,now,upload:bytes=>{assert.deepEqual(bytes,zip);return pointerFor(bytes);},download:pointer=>{assert.deepEqual(pointer,pointerFor(zip));return zip;}};
  publish(options);
  const tree=writes.find(w=>w.endpoint==='git/trees').input;assert.equal(tree.tree.length,14);assert.ok(tree.tree.every(e=>e.path.startsWith(prefix)));
  const blobs=writes.filter(w=>w.endpoint==='git/blobs').map(w=>Buffer.from(w.input.content,'base64'));
  assert.ok(blobs.some(b=>b.equals(pointerFor(zip))));assert.ok(!blobs.some(b=>b.equals(zip)));
  existing=true;closed=true;writes.length=0;publish(options);assert.equal(writes.length,0);
  badDiff=true;assert.throws(()=>publish(options),/diff/);assert.equal(writes.length,0);
  assert.throws(()=>publish({...options,expectedBase:'stale'}),/advanced/);
});
