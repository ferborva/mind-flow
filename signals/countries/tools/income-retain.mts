import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sha256 } from './measure.mjs';

// Explicit acquisition, never run in CI. Exact complete decoded HTTP bodies,
// including publisher estimates and unselected rows, are retained unchanged.
const sources: Record<string,string> = {
  'ilo-epop':'https://rplumber.ilo.org/data/indicator/?id=EMP_2WAP_SEX_AGE_RT_A&format=.csv',
  'ilo-unemployment':'https://rplumber.ilo.org/data/indicator/?id=UNE_2EAP_SEX_AGE_RT_A&format=.csv',
  'pip-lineup':'https://api.worldbank.org/pip/v1/pip?country=ALL&year=all&povline=3&fill_gaps=TRUE&reporting_level=national&version=20260324_2021_01_02_PROD&format=json',
  'ilo-toc':'https://rplumber.ilo.org/metadata/toc/indicator/',
  'ilo-sources':'https://rplumber.ilo.org/metadata/dic/?id=source',
  'ilo-licence':'https://www.ilo.org/rights-and-permissions',
  'pip-parameters':'https://api.worldbank.org/pip/v1/valid-params?endpoint=pip',
  'pip-methodology':'https://worldbank.github.io/PIP-Methodology/lineupestimates.html',
  'pip-indicator-metadata':'https://api.worldbank.org/v2/sources/2/series/SI.POV.DDAY/metadata?format=json',
  'worldbank-licence':'https://datacatalog.worldbank.org/public-licenses',
  'ilo-lu4-rejected':'https://rplumber.ilo.org/data/indicator/?id=LUU_2LU4_SEX_RT_A&format=.csv',
  'ilo-informality-rejected':'https://rplumber.ilo.org/data/indicator/?id=EMP_NIFL_SEX_RT_A&format=.csv',
};
const supplement: Record<string,string> = {
  'pip-methodology-current':'https://datanalytics.worldbank.org/PIP-Methodology/lineupestimates.html',
  'pip-methodology-welfare':'https://datanalytics.worldbank.org/PIP-Methodology/welfareaggregate.html',
  'pip-methodology-acquiring':'https://datanalytics.worldbank.org/PIP-Methodology/acquiring.html',
};
const destination=process.argv[2];
if(!destination)throw new Error('provide a new retention directory');
if(!process.argv.includes('--supplement'))await mkdir(resolve(destination));
for(const [id,url] of Object.entries(process.argv.includes('--supplement')?supplement:sources)) {
  const started_at=new Date().toISOString();
  try {
    const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(90000)});
    const chunks: Uint8Array[]=[];let size=0;
    if(!response.body)throw new Error('missing response body');
    for await(const chunk of response.body){size+=chunk.length;if(size>40_000_000)throw new Error('40 MB acquisition limit');chunks.push(chunk);}
    const body=Buffer.concat(chunks);
    const headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(''));
    const receipt={id,url,final_url:response.url,started_at,ended_at:new Date().toISOString(),status:response.status,body_sha256:sha256(body),body_byte_length:body.length,headers_sha256:sha256(headers),headers_representation:'fetch response headers serialised as name: value; exact complete response body after HTTP content decoding',publisher_identity_verified:false};
    await writeFile(resolve(destination,`${id}.body`),body,{flag:'wx'});
    await writeFile(resolve(destination,`${id}.headers.txt`),headers,{flag:'wx'});
    await writeFile(resolve(destination,`${id}.receipt.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(receipt));
    if(!response.ok)console.error(`Retained HTTP ${response.status} for ${id}; not usable evidence`);
  } catch(error) {throw new Error(`Acquisition failed for ${id}; preserve partial capture and use a new directory`,{cause:error});}
}
