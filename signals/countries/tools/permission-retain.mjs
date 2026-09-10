import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './measure.mjs';

export async function retainResponse(id,url,response,started_at){
  const body=Buffer.from(await response.arrayBuffer());
  const headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(''));
  return {body,headers,receipt:{id,url,final_url:response.url,started_at,ended_at:new Date().toISOString(),
    status:response.status,usable_http_response:response.ok,body_sha256:sha256(body),body_byte_length:body.length,headers_sha256:sha256(headers),
    headers_representation:'Fetch response headers serialised as name: value; retained body after HTTP content decoding',publisher_identity_verified:false}};
}

const sources={
  'wbl-values':'https://api.worldbank.org/v2/country/all/indicator/GD_WBL_OVL_LAW?source=2&format=json&per_page=30000',
  'wbl-indicator':'https://api.worldbank.org/v2/indicator/GD_WBL_OVL_LAW?format=json',
  'wbl-metadata':'https://api.worldbank.org/v2/sources/2/series/GD_WBL_OVL_LAW/metadata?format=json',
  'wbl-methodology':'https://wbl.worldbank.org/en/data/methodology',
  'wbl-downloads':'https://wbl.worldbank.org/en/data/download-data',
  'wbl-faq':'https://wbl.worldbank.org/en/aboutus/faq',
};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const destination=process.argv[2];if(!destination)throw new Error('Provide a new permission retention directory');
  await mkdir(resolve(destination));
  for(const[id,url]of Object.entries(sources)){
    const started_at=new Date().toISOString();
    try{
      const capture=await retainResponse(id,url,await fetch(url,{redirect:'follow'}),started_at);
      await writeFile(resolve(destination,`${id}.body`),capture.body,{flag:'wx'});
      await writeFile(resolve(destination,`${id}.headers.txt`),capture.headers,{flag:'wx'});
      await writeFile(resolve(destination,`${id}.receipt.json`),JSON.stringify(capture.receipt,null,2)+'\n',{flag:'wx'});
      console.log(JSON.stringify(capture.receipt));
    }catch(error){
      await writeFile(resolve(destination,`${id}.failure.json`),JSON.stringify({id,url,started_at,ended_at:new Date().toISOString(),error:String(error),source_retained:false},null,2)+'\n',{flag:'wx'});
      throw new Error(`Permission acquisition failed for ${id}; partial evidence retained, never overwrite it`,{cause:error});
    }
  }
}
