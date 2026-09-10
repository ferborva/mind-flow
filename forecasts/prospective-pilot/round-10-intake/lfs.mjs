import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest, prefix } from './validate-evidence.mjs';
export function pointerFor(bytes){return Buffer.from(`version https://git-lfs.github.com/spec/v1\noid sha256:${digest(bytes).slice(7)}\nsize ${bytes.length}\n`);}
function git(args,input,env=process.env){return execFileSync('git',args,{input,env,maxBuffer:100*1024*1024,stdio:['pipe','pipe','pipe']});}
function credentials(){
  if(!/^https:\/\/github\.com\/ferborva\/mind-flow(?:\.git)?$/.test(git(['remote','get-url','origin']).toString().trim()))throw new Error('LFS origin must be commissioned HTTPS repository');
  if(!process.env.GH_TOKEN)throw new Error('repository token required');
  return {...process.env,GIT_LFS_SKIP_SMUDGE:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.https://github.com/.extraheader',GIT_CONFIG_VALUE_0:'AUTHORIZATION: basic '+Buffer.from('x-access-token:'+process.env.GH_TOKEN).toString('base64'),GIT_TERMINAL_PROMPT:'0'};
}
export function downloadLfs(pointer){
  if(!/^version https:\/\/git-lfs.github.com\/spec\/v1\noid sha256:[a-f0-9]{64}\nsize [1-9][0-9]*\n$/.test(pointer.toString())||Number(pointer.toString().match(/size (\d+)/)[1])>90*1024*1024)throw new Error('invalid bounded LFS pointer');
  const storage=mkdtempSync(join(tmpdir(),'nero-lfs-verify-'));
  return git(['-c',`lfs.storage=${storage}`,'lfs','smudge',`--filename=${prefix}2026-10_nero.zip`],pointer,credentials());
}
export function uploadVerifiedLfs(bytes,{run=git,environment=credentials,download=downloadLfs}={}){
  const pointer=pointerFor(bytes),env=environment();
  if(!run(['lfs','clean',`--filename=${prefix}2026-10_nero.zip`],bytes,env).equals(pointer))throw new Error('LFS clean pointer mismatch');
  run(['lfs','push','--object-id','origin',digest(bytes).slice(7)],undefined,env);
  if(!download(pointer).equals(bytes))throw new Error('LFS independent download verification failed');
  return pointer;
}
