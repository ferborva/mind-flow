import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { prepareCanadaCandidate } from './candidate.mts';
import { root, directory, jsonBytes, baselinePath } from './basis.mts';
import { assessFutureIssuanceBinding } from '../issuance-binding/round-10-country-validate.mjs';
import { actualUtcSecond, deriveSealClocks, assertIssuanceClock, digest, parseProviderResponse, verifyProviderReceipt, verifyCapture, writeOnceBundle, REGISTRATION_ENDPOINT } from './issuance-workflow.mjs';

const base=resolve(root,directory,'issuance'),sealDir=resolve(base,'seal'),registrationDir=resolve(base,'registration'),issuedDir=resolve(base,'issued');
const read=(dir:string,name:string)=>readFileSync(resolve(dir,name));
const json=(dir:string,name:string)=>JSON.parse(read(dir,name).toString('utf8'));
const git=(args:string[])=>execFileSync('git',args,{cwd:root,maxBuffer:3000000,timeout:30000});
const closure=(candidate:any)=>{
  const paths=new Set<string>([...Object.keys(candidate.resolverParameters.dependencies),baselinePath,`${directory}/README.md`,`${directory}/issuance.mts`,`${directory}/issuance-workflow.mjs`,`${directory}/issuance-runbook.md`,'forecasts/prospective-pilot/tests/canada-issuance-workflow.test.mjs',`${directory}/kernel.json`,`${directory}/registry.json`,`${directory}/evolution.json`]);
  for(const id of ['ilo-canada-reported','ilo-api-schema'])for(const suffix of ['.body','.headers.txt','.receipt.json'])paths.add(`${directory}/sources-2026-09-10/${id}${suffix}`);
  return Object.fromEntries([...paths].sort().map(path=>[path,digest(readFileSync(resolve(root,path)))]));
};
function assertSourceCommit(commit:string,files:Record<string,string>){
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('full immutable source commit required');
  git(['merge-base','--is-ancestor',commit,'HEAD']);
  for(const [path,hash] of Object.entries(files))if(digest(git(['show',`${commit}:${path}`]))!==hash||digest(readFileSync(resolve(root,path)))!==hash)throw new Error('source checkout differs from frozen dependency: '+path);
}
function loadSeal(){
  const clocks=json(sealDir,'registration-clocks.json');
  const candidate=prepareCanadaCandidate({...clocks,issuedAt:clocks.issueOpensAt});
  const protocol=read(sealDir,'protocol-sealed-awaiting-receipt.json'),request=json(sealDir,'registration-request.json'),anchors=json(sealDir,'seal-anchors.json'),files=json(sealDir,'source-closure.json');
  if(!protocol.equals(candidate.input.preregistrationBytes)||digest(protocol)!==anchors.protocol_sha256||digest(read(sealDir,'registration-request.json'))!==anchors.request_sha256||candidate.protocol.registration.protocol_content_sha256!==anchors.protocol_content_sha256||!isDeepStrictEqual(files,closure(candidate)))throw new Error('sealed protocol, request, closure or anchors changed');
  assertSourceCommit(clocks.sourceCommit,files);
  for(const name of ['registration-clocks.json','protocol-sealed-awaiting-receipt.json','registration-request.json','seal-anchors.json','source-closure.json']){
    const path=relative(root,resolve(sealDir,name));
    if(!git(['show',`HEAD:${path}`]).equals(read(sealDir,name)))throw new Error('seal files must be committed unchanged before registration or issuance');
  }
  return {clocks,candidate,request,anchors,files};
}
function captureGh(args:string[],destination:string,stem:string,input?:Buffer){
  const started_at=new Date().toISOString();
  try{
    const bytes=execFileSync('gh',['api','--include','-H','Accept: application/vnd.github+json','-H','X-GitHub-Api-Version: 2026-03-10',...args],{cwd:root,input,maxBuffer:1000000,timeout:30000,stdio:['pipe','pipe','pipe']});
    writeFileSync(resolve(destination,stem+'.http'),bytes,{flag:'wx'});
    writeFileSync(resolve(destination,stem+'.capture.json'),jsonBytes({started_at,ended_at:new Date().toISOString(),sha256:digest(bytes),byte_length:bytes.length,method:args.includes('--method')?args[args.indexOf('--method')+1]:'GET',endpoint:args.at(-1)}),{flag:'wx'});
    return bytes;
  }catch(error:any){
    const partial=Buffer.isBuffer(error.stdout)?error.stdout:Buffer.from(error.stdout??'');
    if(!existsSync(resolve(destination,stem+'.partial.http')))writeFileSync(resolve(destination,stem+'.partial.http'),partial,{flag:'wx'});
    if(!existsSync(resolve(destination,'failed-attempt.json')))writeFileSync(resolve(destination,'failed-attempt.json'),jsonBytes({started_at,ended_at:new Date().toISOString(),operation:stem,status:'ambiguous-failure-do-not-retry',partial_sha256:digest(partial),partial_byte_length:partial.length,next:'Manually reconcile the exact sealed digest against PR42 comments before any separately approved retry. Do not delete or overwrite this attempt.'}),{flag:'wx'});
    throw new Error('provider operation failed; retained partial bytes; manual reconciliation required, no blind retry');
  }
}
function receiptFrom(seal:any,readback:Buffer,now=new Date()){
  return verifyProviderReceipt({postBytes:read(registrationDir,'provider-post.http'),readbackBytes:readback,request:seal.request,clocks:seal.clocks,protocolContentSha256:seal.anchors.protocol_content_sha256,now});
}
function verifyRegistrationCaptures(seal:any,now=new Date()){
  const postBytes=read(registrationDir,'provider-post.http'),postCapture=json(registrationDir,'provider-post.capture.json'),readCapture=json(registrationDir,'provider-readback.capture.json');
  const post=verifyCapture(postBytes,postCapture,{method:'POST',endpoint:REGISTRATION_ENDPOINT,status:201,notBefore:seal.clocks.sealAt,notAfter:readCapture.started_at,now});
  verifyCapture(read(registrationDir,'provider-readback.http'),readCapture,{method:'GET',endpoint:`repos/ferborva/mind-flow/issues/comments/${post.id}`,status:200,notBefore:postCapture.ended_at,notAfter:seal.clocks.issueOpensAt,now});
  if(Date.parse(post.created_at)+1000<Date.parse(postCapture.started_at)||Date.parse(post.created_at)>Date.parse(postCapture.ended_at))throw new Error('provider creation does not overlap the retained POST capture interval');
  return post;
}
function assertCandidate(candidate:any){
  const report=assessFutureIssuanceBinding(candidate.input);
  if(!report.binding_complete)throw new Error('issuance binding failed: '+JSON.stringify(report.issues));
  return report;
}
function issueFiles(candidate:any,report:any){
  const files:Record<string,Buffer>={
    'issued.json':candidate.input.matureForecastBytes,'preregistration.json':candidate.input.preregistrationBytes,
    'byte-anchors.json':jsonBytes(candidate.input.byteAnchors),'issuance-binding-report.json':jsonBytes(report),
    'baseline-parameters.json':jsonBytes(candidate.parameters),'resolver-parameters.json':jsonBytes(candidate.resolverParameters),
  };
  for(const role of ['reference','naive']){
    files[`${role}-baseline-calculation.json`]=candidate.retainedArtifacts[`${role}BaselineCalculation`].bytes;
    files[`${role}-input-manifest.json`]=candidate.retainedArtifacts[`${role}BaselineArtifacts`].inputManifest.bytes;
  }
  return files;
}
function verifyIssued(){
  const seal=loadSeal(),issued=json(issuedDir,'issued.json');
  const post=verifyRegistrationCaptures(seal);
  verifyCapture(read(issuedDir,'provider-preissue-readback.http'),json(issuedDir,'provider-preissue-readback.capture.json'),{method:'GET',endpoint:`repos/ferborva/mind-flow/issues/comments/${post.id}`,status:200,notBefore:seal.clocks.issueOpensAt,notAfter:issued.issued_at,now:new Date()});
  const receipt=receiptFrom(seal,read(issuedDir,'provider-preissue-readback.http'));
  if(!isDeepStrictEqual(receipt,json(registrationDir,'registration-receipt.json')))throw new Error('receipt changed');
  const candidate=prepareCanadaCandidate({...seal.clocks,issuedAt:issued.issued_at,externalReceipt:receipt});
  const report=assertCandidate(candidate);
  if(candidate.protocol.registration.protocol_content_sha256!==seal.anchors.protocol_content_sha256)throw new Error('issued protocol changed from externally registered content');
  for(const [name,bytes] of Object.entries(issueFiles(candidate,report)))if(!read(issuedDir,name).equals(bytes))throw new Error('write-once issued bundle changed: '+name);
  assertIssuanceClock('issue',seal.clocks,new Date(issued.issued_at));
  if(Date.parse(issued.issued_at)>Date.now())throw new Error('issued time is in the future');
  return {status:'verified-local-issued-bytes',issued_sha256:digest(read(issuedDir,'issued.json')),preregistration_sha256:digest(read(issuedDir,'preregistration.json')),provider_comment_current_state:'not-queried-by-offline-check',scoring_performed:false};
}

const args=process.argv.slice(2),command=args[0];
if(command==='--help'&&args.length===1){
  console.log('issuance.mts seal --approved-local-seal | register --approved-pr42-digest-comment | issue --approved-local-issue | --check');
}else if(command==='--check'&&args.length===1){
  console.log(JSON.stringify(verifyIssued()));
}else if(command==='seal'&&args.length===2&&args[1]==='--approved-local-seal'){
  const clocks=deriveSealClocks(new Date(),git(['rev-parse','HEAD']).toString('utf8').trim());
  const candidate=prepareCanadaCandidate({...clocks,issuedAt:clocks.issueOpensAt}),files=closure(candidate);
  assertSourceCommit(clocks.sourceCommit,files);
  const request={body:`Ren agent-authored research registration.\nProtocol: ${candidate.protocol.protocol_id}\nSealed content: ${candidate.protocol.registration.protocol_content_sha256}\nSource commit: ${clocks.sourceCommit}\nSelf-posted provider-timed receipt, not independent approval. The comment is editable; exact receipt bytes are retained locally.`};
  mkdirSync(base,{recursive:true});
  writeOnceBundle(sealDir,{'registration-clocks.json':jsonBytes(clocks),'protocol-sealed-awaiting-receipt.json':candidate.input.preregistrationBytes,'registration-request.json':jsonBytes(request),'source-closure.json':jsonBytes(files),'seal-anchors.json':jsonBytes({protocol_sha256:digest(candidate.input.preregistrationBytes),protocol_content_sha256:candidate.protocol.registration.protocol_content_sha256,request_sha256:digest(jsonBytes(request))})});
  console.log(JSON.stringify({status:'sealed-locally-not-issued',...clocks,external_operation:`POST ${REGISTRATION_ENDPOINT}`,next:'Commit the exact seal bundle, then obtain approval before register. Do not change dependencies.'}));
}else if(command==='register'&&args.length===2&&args[1]==='--approved-pr42-digest-comment'){
  const seal=loadSeal();assertIssuanceClock('register',seal.clocks);
  // Creating this directory before POST prevents a blind duplicate retry even
  // when the transport times out after the provider may have created a comment.
  writeOnceBundle(registrationDir,{'attempt-request.json':jsonBytes(seal.request)});
  const post=captureGh(['--method','POST','--input','-',REGISTRATION_ENDPOINT],registrationDir,'provider-post',jsonBytes(seal.request));
  const id=parseProviderResponse(post,201).id;
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('invalid returned comment id; reconcile manually');
  const readback=captureGh([`repos/ferborva/mind-flow/issues/comments/${id}`],registrationDir,'provider-readback');
  assertIssuanceClock('register',seal.clocks);
  verifyRegistrationCaptures(seal);
  const receipt=receiptFrom(seal,readback);
  writeFileSync(resolve(registrationDir,'registration-receipt.json'),jsonBytes(receipt),{flag:'wx'});
  console.log(JSON.stringify({status:'provider-receipt-retained-not-issued',source:receipt.source,created_at:receipt.registered_at,issue_opens_at:seal.clocks.issueOpensAt}));
}else if(command==='issue'&&args.length===2&&args[1]==='--approved-local-issue'){
  const seal=loadSeal();assertIssuanceClock('issue',seal.clocks);
  const receipt=json(registrationDir,'registration-receipt.json'),post=verifyRegistrationCaptures(seal);
  if(!isDeepStrictEqual(receipt,receiptFrom(seal,read(registrationDir,'provider-readback.http'))))throw new Error('registration receipt failed replay');
  writeOnceBundle(issuedDir,{'attempt.json':jsonBytes({started_at:new Date().toISOString(),status:'preissue-readback-required'})});
  const readback=captureGh([`repos/ferborva/mind-flow/issues/comments/${post.id}`],issuedDir,'provider-preissue-readback');
  if(!isDeepStrictEqual(receipt,receiptFrom(seal,readback)))throw new Error('live preissue receipt readback changed');
  const completed=Date.parse(json(issuedDir,'provider-preissue-readback.capture.json').ended_at),nextSecond=Math.ceil(completed/1000)*1000;
  if(nextSecond-Date.now()>1000)throw new Error('local clock moved backwards after readback');
  if(Date.now()<nextSecond)await new Promise(done=>setTimeout(done,nextSecond-Date.now()));
  const now=new Date();assertIssuanceClock('issue',seal.clocks,now);
  verifyCapture(readback,json(issuedDir,'provider-preissue-readback.capture.json'),{method:'GET',endpoint:`repos/ferborva/mind-flow/issues/comments/${post.id}`,status:200,notBefore:seal.clocks.issueOpensAt,notAfter:actualUtcSecond(now),now});
  const candidate=prepareCanadaCandidate({...seal.clocks,issuedAt:actualUtcSecond(now),externalReceipt:receipt}),report=assertCandidate(candidate);
  if(candidate.protocol.registration.protocol_content_sha256!==seal.anchors.protocol_content_sha256)throw new Error('sealed content changed before issue');
  for(const [name,bytes] of Object.entries(issueFiles(candidate,report)))writeFileSync(resolve(issuedDir,name),bytes,{flag:'wx'});
  console.log(JSON.stringify(verifyIssued()));
}else throw new Error('unknown or unapproved command; use --help. No timestamp override, arbitrary path, retry, score or void option exists.');
