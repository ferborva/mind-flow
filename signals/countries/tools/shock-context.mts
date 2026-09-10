import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sha256,verifyReceipt } from './measure.mjs';
const directory=new URL('../sources/round-10-shock-context/',import.meta.url);
const sources=[
  {id:'financial-crisis',url:'https://www.worldbank.org/en/archive/history/past-presidents/robert-bruce-zoellick',selector:'global financial crisis of 2008-2009',claim:'World Bank institutional history identifies the 2008-2009 global financial crisis.'},
  {id:'pandemic',url:'https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020',selector:'COVID-19 can be characterized as a pandemic',claim:'WHO characterised COVID-19 as a pandemic on 11 March 2020.'},
];
export function verifyShockContext(){
  return sources.map(source=>{
    const body=readFileSync(new URL(source.id+'.body',directory));
    const headers=readFileSync(new URL(source.id+'.headers.txt',directory));
    const receiptBytes=readFileSync(new URL(source.id+'.receipt.json',directory));
    const pins:Record<string,string>={'financial-crisis':'f49bee71ead84582011f337aa99f086e6ab9e26c0310dbfc1ad11daf8f5cf293','pandemic':'dc2c51acdee36995c5ad3196db7d817a8a1fd2a20cb9bb67a70ee8579becf8ed'};
    if(sha256(receiptBytes)!=='sha256:'+pins[source.id])throw new Error('Shock receipt differs from retained acquisition');
    const receipt=JSON.parse(receiptBytes.toString());
    verifyReceipt(body,headers,receipt);
    if(receipt.url!==source.url||receipt.final_url!==source.url||receipt.status!==200||!body.toString().includes(source.selector))throw new Error('Shock source identity, status or exact selector mismatch');
    return {...source,body_sha256:receipt.body_sha256,selector_byte_offset:body.indexOf(Buffer.from(source.selector)),claim_ceiling:'Historical shock context only; not country-level storm ground truth',licence_ceiling:'Public institutional webpage, no open redistribution licence established; retained for attributed research verification, no microdata or re-licensing claim'};
  });
}
async function capture(){
  mkdirSync(directory,{recursive:true}); // Existing response files remain create-only.
  for(const source of sources){
    const started_at=new Date().toISOString();const response=await fetch(source.url,{redirect:'error',signal:AbortSignal.timeout(90000)});
    const headers=Buffer.from([...response.headers].map(([k,v])=>`${k}: ${v}\n`).join(''));writeFileSync(new URL(source.id+'.headers.txt',directory),headers,{flag:'wx'});
    const chunks:Uint8Array[]=[];let size=0;
    try{for await(const chunk of response.body!){if(size+chunk.length>4*1024*1024){chunks.push(chunk.subarray(0,4*1024*1024-size));throw new Error('source cap');}chunks.push(chunk);size+=chunk.length;}}
    catch(error){writeFileSync(new URL(source.id+'.partial',directory),Buffer.concat(chunks),{flag:'wx'});throw error;}
    const body=Buffer.concat(chunks);writeFileSync(new URL(source.id+'.body',directory),body,{flag:'wx'});
    const receipt={id:source.id,url:source.url,final_url:response.url,started_at,ended_at:new Date().toISOString(),status:response.status,body_sha256:sha256(body),body_byte_length:body.length,headers_sha256:sha256(headers),headers_representation:'Fetch headers serialised as name: value; complete body after HTTP content decoding',publisher_identity_verified:false};
    writeFileSync(new URL(source.id+'.receipt.json',directory),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    if(!response.ok)throw new Error('Retained failed source HTTP '+response.status);
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||!['--capture','--check'].includes(process.argv[2]))throw new Error('Exactly --capture or --check required');
  if(process.argv[2]==='--capture')await capture();
  console.log(JSON.stringify(verifyShockContext(),null,2));
}
