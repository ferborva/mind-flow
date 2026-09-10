import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
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
export async function retainSourceAttempt(destination:string,id:string,url:string,options:{fetcher?:typeof fetch,maxBytes?:number,timeoutMs?:number}={}) {
  const maxBytes=options.maxBytes??40_000_000;
  if(!Number.isInteger(maxBytes)||maxBytes<1)throw new Error('positive integer acquisition cap required');
  const started_at=new Date().toISOString();
  let response:Response|undefined;
  let headers=Buffer.alloc(0);
  const chunks:Uint8Array[]=[];let size=0;
  try {
    response=await (options.fetcher??fetch)(url,{redirect:'follow',signal:AbortSignal.timeout(options.timeoutMs??90000)});
    headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(''));
    if(!response.body)throw new Error('missing response body');
    for await(const chunk of response.body){
      const available=maxBytes-size;
      if(chunk.length>available){chunks.push(chunk.subarray(0,available));size+=available;throw new Error(`${maxBytes} byte acquisition limit`);}
      size+=chunk.length;chunks.push(chunk);
    }
  }catch(error){
    const failedDirectory=resolve(destination,'failed-attempts');
    const attemptId=`${id}-${randomUUID()}`;
    const body=Buffer.concat(chunks);
    const failure={id,url,final_url:response?.url??null,started_at,ended_at:new Date().toISOString(),status:response?.status??null,response_received:response!==undefined,body_complete:false,partial_body_file:`${attemptId}.partial.body`,partial_body_byte_length:body.length,partial_body_sha256:sha256(body),headers_file:`${attemptId}.headers.txt`,headers_sha256:sha256(headers),error:error instanceof Error?error.message:String(error)};
    try {
      await mkdir(failedDirectory,{recursive:true});
      await writeFile(resolve(failedDirectory,failure.partial_body_file),body,{flag:'wx'});
      await writeFile(resolve(failedDirectory,failure.headers_file),headers,{flag:'wx'});
      await writeFile(resolve(failedDirectory,`${attemptId}.json`),JSON.stringify(failure,null,2)+'\n',{flag:'wx'});
    }catch(retentionError){throw new AggregateError([error,retentionError],`Acquisition and failed-attempt retention both failed for ${id}`);}
    throw new Error(`Acquisition failed for ${id}; failed attempt retained separately in ${failedDirectory}`,{cause:error});
  }
  const body=Buffer.concat(chunks);
  const receipt={id,url,final_url:response.url,started_at,ended_at:new Date().toISOString(),status:response.status,body_sha256:sha256(body),body_byte_length:body.length,headers_sha256:sha256(headers),headers_representation:'fetch response headers serialised as name: value; exact complete response body after HTTP content decoding',publisher_identity_verified:false};
  try {
    await writeFile(resolve(destination,`${id}.body`),body,{flag:'wx'});
    await writeFile(resolve(destination,`${id}.headers.txt`),headers,{flag:'wx'});
    await writeFile(resolve(destination,`${id}.receipt.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  }catch(error){throw new Error(`Completed response retention failed for ${id}; preserve existing files`,{cause:error});}
  return receipt;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const [destination,...options]=process.argv.slice(2);
  if(!destination||options.length>1||(options.length===1&&options[0]!=='--supplement'))throw new Error('provide a new retention directory and optionally --supplement');
  if(!options.length)await mkdir(resolve(destination));
  for(const [id,url] of Object.entries(options.length?supplement:sources)) {
    const receipt=await retainSourceAttempt(destination,id,url);
    console.log(JSON.stringify(receipt));
    if(receipt.status!==200)console.error(`Retained HTTP ${receipt.status} for ${id}; not usable evidence`);
  }
}
