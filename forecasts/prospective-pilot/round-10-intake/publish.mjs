import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateDirectory, validateEvidence, names, prefix } from './validate-evidence.mjs';
import { uploadVerifiedLfs, downloadLfs, pointerFor } from './lfs.mjs';
const branch='ren/nero-october-2026-evidence';
export function publish({directory,repository,expectedBase,request:api,now=new Date(),upload=uploadVerifiedLfs,download=downloadLfs}) {
  if(!existsSync(join(directory,'observation.json')))return;
  const {files,observation}=validateDirectory(directory,{now});
  if(repository!=='ferborva/mind-flow')throw new Error('publisher restricted to commissioned repository');
  const base=api('git/ref/heads/main').object.sha;
  if(base!==expectedBase)throw new Error('default branch advanced; rerun trusted default branch');
  const refs=api(`git/matching-refs/heads/${branch}`);
  let head=refs.find(r=>r.ref===`refs/heads/${branch}`)?.object.sha;
  if(head){
    const commit=api(`git/commits/${head}`);
    if(commit.parents.length!==1)throw new Error('unexpected evidence branch history');
    if(!['ahead','identical'].includes(api(`compare/${commit.parents[0].sha}...${base}`).status))throw new Error('existing evidence parent is not trusted main history');
    const comparison=api(`compare/${commit.parents[0].sha}...${head}`);
    if(comparison.files?.length!==names.length||comparison.files.some(f=>f.status!=='added'||!f.filename.startsWith(prefix)||!names.includes(f.filename.slice(prefix.length))))throw new Error('existing branch diff is not evidence-only');
    const tree=api(`git/trees/${commit.tree.sha}?recursive=1`);
    if(tree.truncated)throw new Error('existing evidence tree truncated');
    const retained={};
    for(const name of names){
      const entry=tree.tree.find(e=>e.path===prefix+name);
      if(entry?.type!=='blob'||entry.mode!=='100644')throw new Error('existing evidence is not regular file');
      retained[name]=Buffer.from(api(`git/blobs/${entry.sha}`).content,'base64');
    }
    const pointer=retained['2026-10_nero.zip'];
    retained['2026-10_nero.zip']=download(pointer);
    if(!pointer.equals(pointerFor(retained['2026-10_nero.zip'])))throw new Error('existing LFS pointer mismatch');
    const existing=validateEvidence(retained,{now});
    if(existing.observation.archive_sha256!==observation.archive_sha256)throw new Error('October revision observed; preserve attempt and require human review');
  }else{
    const tree=api(`git/commits/${base}`).tree.sha;
    const attributes=api(`contents/.gitattributes?ref=${base}`);
    if(!Buffer.from(attributes.content,'base64').toString().split('\n').includes(prefix+'2026-10_nero.zip filter=lfs diff=lfs merge=lfs -text'))throw new Error('exact LFS attribute missing from trusted base');
    const pointer=upload(files['2026-10_nero.zip']);
    if(!pointer.equals(pointerFor(files['2026-10_nero.zip'])))throw new Error('verified LFS pointer mismatch');
    const entries=names.map(name=>({path:prefix+name,mode:'100644',type:'blob',sha:api('git/blobs',{content:(name.endsWith('.zip')?pointer:files[name]).toString('base64'),encoding:'base64'}).sha}));
    const next=api('git/trees',{base_tree:tree,tree:entries}).sha;
    head=api('git/commits',{message:'Retain first observed October NERO evidence\n\nAgent: Ren',tree:next,parents:[base],author:{name:'Ren',email:'ren-agent@users.noreply.github.com'}}).sha;
    api('git/refs',{ref:`refs/heads/${branch}`,sha:head});
  }
  const prs=api(`pulls?state=all&head=ferborva:${branch}`);
  if(!prs.length)api('pulls',{title:'Retain first observed October NERO archive',head:branch,base:'main',draft:true,body:'Evidence only. First retained observation is not first publication. No resolution or score. Review bytes and chronology, obtain publication evidence and authority, then use reviews/round-09-scheduled-resolution.md. Approve workflows to run if checks await approval.'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3||process.argv[2].startsWith('-'))throw new Error('exactly one evidence directory required');
  if(process.env.GITHUB_REF!=='refs/heads/main')throw new Error('publisher requires trusted default branch');
  const repository=process.env.GITHUB_REPOSITORY;
  publish({directory:process.argv[2],repository,expectedBase:process.env.GITHUB_SHA,request:(endpoint,input)=>JSON.parse(execFileSync('gh',['api',`repos/${repository}/${endpoint}`,...(input?['--input','-']:[])],{input:input?JSON.stringify(input):undefined,encoding:'utf8',maxBuffer:150*1024*1024}))});
}
