import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256 } from "./measure.mjs";

// Explicit acquisition only. Never overwrites an existing receipt directory.
const sources = {
  "wdi-cpi": "https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG?source=2&format=json&per_page=30000",
  "wdi-electricity": "https://api.worldbank.org/v2/country/all/indicator/EG.ELC.ACCS.ZS?source=2&format=json&per_page=30000",
  "wdi-cpi-metadata": "https://api.worldbank.org/v2/sources/2/series/FP.CPI.TOTL.ZG/metadata?format=json",
  "wdi-electricity-metadata": "https://api.worldbank.org/v2/sources/2/series/EG.ELC.ACCS.ZS/metadata?format=json",
  "ilo-labour-share": "https://rplumber.ilo.org/data/indicator/?id=LAP_2GDP_NOC_RT_A&format=.csv",
  "ilo-toc": "https://rplumber.ilo.org/metadata/toc/indicator/",
  "ilo-source-dictionary": "https://rplumber.ilo.org/metadata/dic/?id=source",
  "ilo-licence": "https://www.ilo.org/rights-and-permissions",
  "electricity-definition-limit": "https://www.worldbank.org/en/topic/energy/publication/energy-access-redefined"
};
const destination=process.argv[2];
if(!destination)throw new Error("provide a new retention directory");
await mkdir(resolve(destination));
for(const [id,url] of Object.entries(sources)) {
  const started_at=new Date().toISOString();
  try {
    const response=await fetch(url,{redirect:"follow"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const body=Buffer.from(await response.arrayBuffer());
    const headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(""));
    const ended_at=new Date().toISOString();
    await writeFile(resolve(destination,`${id}.body`),body,{flag:"wx"});
    await writeFile(resolve(destination,`${id}.headers.txt`),headers,{flag:"wx"});
    const receipt={id,url,final_url:response.url,started_at,ended_at,status:response.status,body_sha256:sha256(body),body_byte_length:body.length,headers_sha256:sha256(headers),headers_representation:"fetch response headers serialised as name: value; exact complete response body after HTTP content decoding",publisher_identity_verified:false};
    await writeFile(resolve(destination,`${id}.receipt.json`),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
    console.log(JSON.stringify(receipt));
  }catch(error){throw new Error(`Acquisition failed for ${id}; preserve partial receipt and use a new directory`,{cause:error});}
}
