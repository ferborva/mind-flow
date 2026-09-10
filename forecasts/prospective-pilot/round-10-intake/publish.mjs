import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Publish through GitHub's data API. No checkout, shell interpolation or source execution.
// A stable ref reserves first retained presence even while its PR remains unmerged.
export function publish({directory,repository,expectedBase,request}) {
const observationPath=join(directory,'observation.json');
if(!existsSync(observationPath)) return;
const observation=JSON.parse(readFileSync(observationPath));
if(observation.state!=='retained') return;
if(repository!=='ferborva/mind-flow') throw new Error('publisher restricted to commissioned repository');
const branch='ren/nero-october-2026-evidence';
const prefix='forecasts/prospective-pilot/round-10-intake/evidence/';
const api=request;
const allowed=new Set(['attempt.json','nero-landing.html','nero-landing.html.headers.txt','nero-landing.html.receipt.json','2026-10_nero.zip','2026-10_nero.zip.headers.txt','2026-10_nero.zip.receipt.json','observation.json',...['round-08-nero','round-09-nero-corrected'].flatMap(c=>['first-presence','chronology','tip'].map(s=>`${c}.${s}.json`))]);
const files=readdirSync(directory);
if(files.length!==allowed.size || files.some(f=>!allowed.has(f))) throw new Error('evidence-only allowlist mismatch');
const hash='sha256:'+createHash('sha256').update(readFileSync(join(directory,'2026-10_nero.zip'))).digest('hex');
if(hash!==observation.archive_sha256) throw new Error('archive bytes changed before publication');
const refs=api(`git/matching-refs/heads/${branch}`);
let head=refs.find(r=>r.ref===`refs/heads/${branch}`)?.object.sha;
if(head) {
  const existing=api(`contents/${prefix}observation.json?ref=${head}`);
  const retained=JSON.parse(Buffer.from(existing.content,'base64'));
  if(retained.archive_sha256!==hash) throw new Error('October revision observed; preserve attempt artifact and request human review, never replace first presence');
} else {
  const base=api('git/ref/heads/main').object.sha;
  if(base!==expectedBase) throw new Error('default branch advanced; rerun from current trusted default branch');
  const tree=api(`git/commits/${base}`).tree.sha;
  const entries=files.map(name=>({path:prefix+name,mode:'100644',type:'blob',sha:api('git/blobs',{content:readFileSync(join(directory,name)).toString('base64'),encoding:'base64'}).sha}));
  const nextTree=api('git/trees',{base_tree:tree,tree:entries}).sha;
  head=api('git/commits',{message:'Retain first observed October NERO evidence\n\nAgent: Ren',tree:nextTree,parents:[base],author:{name:'Ren',email:'ren-agent@users.noreply.github.com'}}).sha;
  api('git/refs',{ref:`refs/heads/${branch}`,sha:head});
}
const prs=api(`pulls?state=all&head=ferborva:${branch}`);
if(!prs.length) api('pulls',{title:'Retain first observed October NERO archive',head:branch,base:'main',draft:true,body:'Evidence intake only. First retained observation is not first publication. No resolution or score. Review exact bytes and chronology, obtain publication evidence and authority, then use reviews/round-09-scheduled-resolution.md. Approve workflows to run if GitHub holds token-created PR checks for approval.'});
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const repository=process.env.GITHUB_REPOSITORY;
  publish({directory:process.argv[2],repository,expectedBase:process.env.GITHUB_SHA,request:(endpoint,input)=>JSON.parse(execFileSync('gh',['api',`repos/${repository}/${endpoint}`,...(input?['--input','-']:[])],{input:input?JSON.stringify(input):undefined,encoding:'utf8',maxBuffer:200*1024*1024}))});
}
