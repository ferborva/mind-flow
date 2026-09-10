import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const dir=process.argv[2];if(!dir)throw new Error("new directory required");
await mkdir(resolve(dir));
const sources={catalogue:"https://datacatalog.worldbank.org/infrastructure-data/search/dataset/0038250/rural-access-index-rai",data:"https://datacatalogfiles.worldbank.org/ddh-published/0038250/4/DR0085889/rural-access-index-data.xls",metadata:"https://unstats.un.org/sdgs/metadata/files/Metadata-09-01-01.pdf"};
const sha=(b:Uint8Array)=>"sha256:"+createHash("sha256").update(b).digest("hex");
for(const[id,url]of Object.entries(sources)){
  const started_at=new Date().toISOString();
  try{
    const r=await fetch(url);const body=Buffer.from(await r.arrayBuffer()),headers=Buffer.from([...r.headers].map(([k,v])=>`${k}: ${v}\n`).join(""));
    await writeFile(resolve(dir,id+".body"),body,{flag:"wx"});await writeFile(resolve(dir,id+".headers.txt"),headers,{flag:"wx"});
    const receipt={url,final_url:r.url,status:r.status,started_at,ended_at:new Date().toISOString(),body_byte_length:body.length,body_sha256:sha(body),headers_sha256:sha(headers),representation:"complete HTTP body after content decoding; actual Fetch headers serialised name: value",publisher_identity_verified:false};
    await writeFile(resolve(dir,id+".receipt.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify(receipt));
  }catch(error){await writeFile(resolve(dir,id+".failure.json"),JSON.stringify({url,started_at,ended_at:new Date().toISOString(),error:String(error)},null,2)+"\n",{flag:"wx"});console.error(id,error);}
}
