import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { sourceChronologyEventSha256 } from '../validate.mjs';
import { approvedUrl, discoverArchive, inWindow } from './collector.mjs';
export const campaigns=['round-08-nero','round-09-nero-corrected'];
export const prefix='forecasts/prospective-pilot/round-10-intake/evidence/';
export const names=['attempt.json','nero-landing.html','nero-landing.html.headers.txt','nero-landing.html.receipt.json','2026-10_nero.zip','2026-10_nero.zip.headers.txt','2026-10_nero.zip.receipt.json','observation.json',...campaigns.flatMap(c=>['first-presence','chronology','tip'].map(s=>`${c}.${s}.json`))];
export const digest=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const cap=name=>name.endsWith('.zip')?90*1024*1024:name.endsWith('.html')?4*1024*1024:1024*1024;
export function validateEvidence(files,{now=new Date()}={}) {
  if(Object.keys(files).length!==names.length||names.some(n=>!Buffer.isBuffer(files[n])))throw new Error('evidence allowlist mismatch');
  if(names.some(n=>files[n].length>cap(n)))throw new Error('evidence byte cap exceeded');
  const json=n=>JSON.parse(files[n]);
  const instant=s=>{const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s||n>now.getTime())throw new Error('invalid or future evidence clock');return n;};
  const attempt=json('attempt.json');const started=instant(attempt.started_at);
  const observation=json('observation.json');
  if(observation.state!=='retained'||observation.published_at!==null||observation.first_publication_verified!==false||observation.publisher_identity_verified!==false)throw new Error('unsupported observation claim');
  let previousEnd=started;
  for(const name of ['nero-landing.html','2026-10_nero.zip']) {
    const r=json(name+'.receipt.json');
    if(r.status!==200||r.body_sha256!==digest(files[name])||r.body_byte_length!==files[name].length)throw new Error('body receipt mismatch');
    if(r.headers_sha256!==digest(files[name+'.headers.txt']))throw new Error('header receipt mismatch');
    if(r.headers_representation!=='fetch response headers serialised as name: value; body after HTTP content decoding')throw new Error('header representation mismatch');
    const start=instant(r.started_at),end=instant(r.ended_at);
    if(start<previousEnd||end<start||!inWindow(r.started_at)||!inWindow(r.ended_at))throw new Error('receipt timing mismatch');
    previousEnd=end;
    approvedUrl(r.url,name.endsWith('.zip')?'archive':'landing');
  }
  const page=json('nero-landing.html.receipt.json'),archive=json('2026-10_nero.zip.receipt.json');
  if(attempt.source!==page.url||discoverArchive(files['nero-landing.html'].toString())!==archive.url||observation.source!==archive.url||observation.archive_sha256!==archive.body_sha256||observation.observed_at!==archive.ended_at)throw new Error('observation/source mismatch');
  if(files['2026-10_nero.zip'].length<4||files['2026-10_nero.zip'].readUInt32LE(0)!==0x04034b50||/content-type:\s*(text\/html|application\/(?:json|xml))/i.test(files['2026-10_nero.zip.headers.txt'].toString()))throw new Error('not a native ZIP response');
  for(const c of campaigns) {
    const protocol=JSON.parse(readFileSync(new URL(`../${c}/preregistration.json`,import.meta.url)));
    const issued=JSON.parse(readFileSync(new URL(`../${c}/issued.json`,import.meta.url)));
    if(digest(readFileSync(new URL(`../${c}/preregistration.json`,import.meta.url)))!==issued.prospective_registration.preregistration_sha256)throw new Error('immutable preregistration mismatch');
    const base=protocol.source_chronology.events;
    const event={sequence:base.length+1,source_id:'source.jsa.nero',state:'reported_present_checksum_only',observed_at:observation.observed_at,artifact_sha256:archive.body_sha256,previous_event_sha256:base.at(-1).event_sha256,verification_status:'unverified_external_review_required'};
    event.event_sha256=sourceChronologyEventSha256(event);
    if(!isDeepStrictEqual(json(c+'.first-presence.json'),event)||!isDeepStrictEqual(json(c+'.chronology.json'),[...base,event]))throw new Error('chronology or immutable prefix mismatch');
    if(!isDeepStrictEqual(json(c+'.tip.json'),{event_count:base.length+1,tip_sha256:event.event_sha256}))throw new Error('chronology tip mismatch');
  }
  return {files,observation};
}
export function validateDirectory(directory,options) {
  if(!lstatSync(directory).isDirectory()||lstatSync(directory).isSymbolicLink())throw new Error('regular evidence directory required');
  const actual=readdirSync(directory);
  if(actual.length!==names.length||actual.some(n=>!names.includes(n)))throw new Error('evidence allowlist mismatch');
  const files=Object.fromEntries(actual.map(n=>{const stat=lstatSync(join(directory,n));if(!stat.isFile()||stat.isSymbolicLink())throw new Error('regular evidence file required');if(stat.size>cap(n))throw new Error('evidence byte cap exceeded');return[n,readFileSync(join(directory,n))];}));
  return validateEvidence(files,options);
}
