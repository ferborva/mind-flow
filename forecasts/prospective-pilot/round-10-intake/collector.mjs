import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceChronologyEventSha256 } from '../validate.mjs';

export const landing = 'https://www.jobsandskills.gov.au/data/nero';
const campaigns = ['round-08-nero', 'round-09-nero-corrected'];
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export function inWindow(instant) {
  const time = Date.parse(instant);
  return time >= Date.parse('2026-11-01T00:00:00Z') && time < Date.parse('2026-12-07T00:00:00Z');
}
export function approvedUrl(value, kind) {
  const u = new URL(value, landing);
  const path = kind === 'archive' ? /^\/sites\/default\/files\/\d{4}-\d{2}\/2026-10_nero\.zip$/ : /^\/data\/nero$/;
  if (u.origin !== 'https://www.jobsandskills.gov.au' || u.username || u.password || u.search || u.hash || !path.test(u.pathname) || value.includes('..') || value.includes('%')) throw new Error('URL outside approved source constraint');
  return u.href;
}
export function discoverArchive(html) {
  const urls = new Set();
  // Read href attributes only. Provider markup is data and is never executed.
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2].includes('2026-10_nero.zip')) urls.add(approvedUrl(match[2], 'archive'));
  }
  if (urls.size > 1) throw new Error('multiple October archives require human source review');
  return [...urls][0] ?? null;
}
export async function collect({destination, fetcher=fetch, clock=()=>new Date(), pageCap=4*1024*1024, archiveCap=90*1024*1024}) {
  if (!inWindow(clock().toISOString())) return {state:'outside-window'};
  await mkdir(destination); // Never overwrite or clean up an existing attempt.
  const save=(name,value)=>writeFile(join(destination,name),value,{flag:'wx'});
  const json=(name,value)=>save(name,JSON.stringify(value,null,2)+'\n');
  async function capture(url, name, cap) {
    const started_at=clock().toISOString();
    const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(120000)});
    if(response.url && response.url!==url) throw new Error('unexpected response URL');
    const headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(''));
    await save(name+'.headers.txt',headers);
    const chunks=[]; let length=0;
    try {
      for await(const chunk of response.body) {
        length+=chunk.length;
        if(length>cap) { chunks.push(Buffer.from(chunk).subarray(0,Math.max(0,cap-(length-chunk.length)))); throw new Error('response exceeds byte cap'); }
        chunks.push(Buffer.from(chunk));
      }
    } catch(error) {
      await save(name+'.partial',Buffer.concat(chunks));
      throw error;
    }
    const bytes=Buffer.concat(chunks);
    await save(name,bytes);
    const receipt={url,started_at,ended_at:clock().toISOString(),status:response.status,body_sha256:digest(bytes),body_byte_length:bytes.length,headers_sha256:digest(headers),headers_representation:'fetch response headers serialised as name: value; body after HTTP content decoding'};
    await json(name+'.receipt.json',receipt);
    if(!response.ok) throw new Error(`source HTTP ${response.status}`);
    return {bytes,receipt};
  }
  try {
    await json('attempt.json',{started_at:clock().toISOString(),source:landing});
    const page=await capture(approvedUrl(landing,'landing'),'nero-landing.html',pageCap);
    const source=discoverArchive(page.bytes.toString('utf8'));
    if(!source) { await json('observation.json',{state:'not-listed',observed_at:page.receipt.ended_at,global_absence_verified:false}); return {state:'not-listed'}; }
    const archive=await capture(source,'2026-10_nero.zip',archiveCap);
    if(archive.bytes.length<4||archive.bytes.readUInt32LE(0)!==0x04034b50||/content-type:\s*(text\/html|application\/(?:json|xml))/i.test(await readFile(join(destination,'2026-10_nero.zip.headers.txt'),'utf8'))) throw new Error('not a native ZIP response');
    const observed_at=archive.receipt.ended_at;
    if(!inWindow(observed_at)) throw new Error('download completed outside admission window');
    for(const campaign of campaigns) {
      const protocol=JSON.parse(await readFile(new URL(`../${campaign}/preregistration.json`,import.meta.url)));
      const events=structuredClone(protocol.source_chronology.events);
      const event={sequence:events.length+1,source_id:'source.jsa.nero',state:'reported_present_checksum_only',observed_at,artifact_sha256:archive.receipt.body_sha256,previous_event_sha256:events.at(-1).event_sha256,verification_status:'unverified_external_review_required'};
      event.event_sha256=sourceChronologyEventSha256(event);
      events.push(event);
      await json(campaign+'.first-presence.json',event);
      await json(campaign+'.chronology.json',events);
      await json(campaign+'.tip.json',{event_count:events.length,tip_sha256:event.event_sha256});
    }
    const result={state:'retained',source,archive_sha256:archive.receipt.body_sha256,observed_at,first_publication_verified:false,published_at:null,publication_evidence:'required-before-human-admission',listing_surface:'Downloads section of the retained landing page',publisher_identity_verified:false};
    await json('observation.json',result);
    return result;
  } catch(error) {
    await json('failure.json',{failed_at:clock().toISOString(),message:error.message});
    throw error;
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const destination=process.argv[2];
  if(!destination||process.argv.length!==3||destination.startsWith('-')) throw new Error('exactly one new destination required');
  console.log(JSON.stringify(await collect({destination:resolve(destination)})));
}
