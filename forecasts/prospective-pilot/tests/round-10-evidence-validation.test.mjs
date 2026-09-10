import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from '../round-10-intake/collector.mjs';
import { validateDirectory } from '../round-10-intake/validate-evidence.mjs';
import { uploadVerifiedLfs, pointerFor } from '../round-10-intake/lfs.mjs';
const html='<a href="/sites/default/files/2026-11/2026-10_nero.zip">Download</a>';
const options={now:new Date('2026-11-04T00:00:00Z')};
async function fixture(){const root=await mkdtemp(join(tmpdir(),'nero-validate-'));const directory=join(root,'attempt');await collect({destination:directory,clock:()=>new Date('2026-11-04T00:00:00Z'),fetcher:async url=>new Response(url.endsWith('.zip')?Buffer.from([80,75,3,4,0,0,0,0]):html,{headers:{'content-type':url.endsWith('.zip')?'application/zip':'text/html'}})});return directory;}
test('independent evidence validation rejects tampered headers and chronology',async()=>{
  const directory=await fixture();
  assert.equal(validateDirectory(directory,options).observation.state,'retained');
  await writeFile(join(directory,'nero-landing.html.headers.txt'),'changed');
  assert.throws(()=>validateDirectory(directory,options),/header/);
  const second=await fixture();const path=join(second,'round-08-nero.tip.json');const tip=JSON.parse(await readFile(path));tip.event_count++;
  await writeFile(path,JSON.stringify(tip));assert.throws(()=>validateDirectory(second,options),/tip/);
});
test('foreign entries and symlink files cannot enter publication',async()=>{
  const directory=await fixture();await symlink('observation.json',join(directory,'foreign'));
  assert.throws(()=>validateDirectory(directory),/allowlist|regular/);
});
test('HTML served as an archive is retained as failure, not presence',async()=>{
  const directory=join(await mkdtemp(join(tmpdir(),'nero-html-')),'attempt');
  await assert.rejects(collect({destination:directory,clock:()=>new Date('2026-11-04T00:00:00Z'),fetcher:async url=>new Response(url.endsWith('.zip')?'<html>error</html>':html,{headers:{'content-type':'text/html'}})}),/ZIP/);
});
test('LFS upload success is insufficient without independently downloaded byte equality',()=>{
  const bytes=Buffer.from([80,75,3,4]);const calls=[];
  const run=(args)=>{calls.push(args);return args.includes('clean')?pointerFor(bytes):Buffer.alloc(0);};
  assert.throws(()=>uploadVerifiedLfs(bytes,{run,environment:()=>({}),download:()=>Buffer.from('wrong')}),/download verification/);
  assert.ok(calls.some(args=>args.includes('--object-id')));
  assert.deepEqual(uploadVerifiedLfs(bytes,{run,environment:()=>({}),download:()=>bytes}),pointerFor(bytes));
});
