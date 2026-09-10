import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const ISSUE_CLOSE='2026-09-30T00:00:00Z';
export const REGISTRATION_ENDPOINT='repos/ferborva/mind-flow/issues/42/comments';
export const digest=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
export const actualUtcSecond=(now=new Date())=>now.toISOString().replace(/\.\d{3}Z$/,'Z');
function instant(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().replace('.000Z','Z')!==value)throw new Error('exact valid UTC second required');
  return Date.parse(value);
}
export function deriveSealClocks(now,sourceCommit){
  if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw new Error('full source commit required');
  const sealAt=actualUtcSecond(now),issueOpensAt=actualUtcSecond(new Date(instant(sealAt)+600000));
  if(instant(issueOpensAt)>=instant(ISSUE_CLOSE))throw new Error('ten-minute receipt window would cross issue close');
  return {sealAt,issueOpensAt,sourceCommit};
}
export function assertIssuanceClock(operation,clocks,now=new Date()){
  const seal=instant(clocks.sealAt),open=instant(clocks.issueOpensAt),current=now.getTime();
  if(!Number.isFinite(current)||open!==seal+600000||open>=instant(ISSUE_CLOSE))throw new Error('invalid fixed issuance window');
  if(current<seal)throw new Error('seal is in the future');
  if(operation==='register'){
    if(current<=seal)throw new Error('register strictly after seal');
    if(current>=open)throw new Error('registration must complete before issue opens');
  }else if(operation==='issue'){
    if(current<open)throw new Error('issue window not open');
    if(current>=instant(ISSUE_CLOSE))throw new Error('issue window closed');
  }else throw new Error('unknown issuance operation');
}
export function parseProviderResponse(bytes,expectedStatus){
  if(!(bytes instanceof Uint8Array)||bytes.length>1000000)throw new Error('bounded provider response bytes required');
  const text=Buffer.from(bytes).toString('utf8'),separator=text.search(/\r?\n\r?\n/);
  if(separator<0)throw new Error('complete HTTP headers and body required');
  const match=/^HTTP\/\S+ (\d{3})\b/.exec(text);
  if(Number(match?.[1])!==expectedStatus)throw new Error('unexpected provider HTTP status');
  const body=text.slice(separator).replace(/^\r?\n\r?\n/,'');
  return JSON.parse(body);
}
export function verifyProviderReceipt({postBytes,readbackBytes,request,clocks,protocolContentSha256,now=new Date()}){
  const post=parseProviderResponse(postBytes,201),readback=parseProviderResponse(readbackBytes,200);
  if(!/^sha256:[a-f0-9]{64}$/.test(protocolContentSha256)||!request?.body?.includes(protocolContentSha256))throw new Error('exact sealed digest missing from request');
  if(!Number.isSafeInteger(post.id)||post.id<=0)throw new Error('provider comment id required');
  const url=`https://api.github.com/repos/ferborva/mind-flow/issues/comments/${post.id}`;
  for(const response of [post,readback]){
    if(response.id!==post.id||response.url!==url||response.html_url!==`https://github.com/ferborva/mind-flow/pull/42#issuecomment-${post.id}`||response.issue_url!=='https://api.github.com/repos/ferborva/mind-flow/issues/42'||response.body!==request.body)throw new Error('provider response/readback identity or body mismatch');
    if(response.created_at!==response.updated_at||response.created_at!==post.created_at||response.user?.id!==post.user?.id||response.user?.login!==post.user?.login)throw new Error('provider comment was edited or identity changed');
    const created=instant(response.created_at);
    if(created<=instant(clocks.sealAt)||created>=instant(clocks.issueOpensAt))throw new Error('provider creation outside prospective registration window');
    if(created>now.getTime())throw new Error('provider creation is in the future relative to actual local clock');
  }
  return {source:post.html_url,checksum:digest(postBytes),registered_content_sha256:protocolContentSha256,registered_at:post.created_at,checksum_scope:'external-receipt-bytes-not-this-protocol-record',verification_status:'unverified_external_review_required'};
}
export function verifyCapture(bytes,metadata,{method,endpoint,status,notBefore,notAfter,now=new Date()}){
  const start=Date.parse(metadata?.started_at),end=Date.parse(metadata?.ended_at);
  if(!Number.isFinite(Date.parse(notBefore))||!Number.isFinite(Date.parse(notAfter))||!Number.isFinite(now.getTime()))throw new Error('explicit capture bounds required');
  if(!Number.isFinite(start)||!Number.isFinite(end)||new Date(start).toISOString()!==metadata.started_at||new Date(end).toISOString()!==metadata.ended_at||end<start||end>now.getTime())throw new Error('invalid or future capture chronology');
  if(start<Date.parse(notBefore)||end>Date.parse(notAfter))throw new Error('capture outside fixed chronological bounds');
  if(metadata.method!==method||metadata.endpoint!==endpoint||metadata.sha256!==digest(bytes)||metadata.byte_length!==bytes.length)throw new Error('capture metadata differs from retained bytes or expected operation');
  return parseProviderResponse(bytes,status);
}
export function writeOnceBundle(directory,files){
  for(const name of Object.keys(files))if(!/^[a-z0-9][a-z0-9.-]*$/.test(name)||name==='.'||name==='..')throw new Error('safe bundle filename required');
  mkdirSync(directory);
  for(const [name,bytes] of Object.entries(files))writeFileSync(join(directory,name),bytes,{flag:'wx'});
}
