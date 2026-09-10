import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractWdi, selectCommonYear, sha256, verifyReceipt } from './measure.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const directory='signals/countries/sources/permission-2026-09-10';
const pins={
  'wbl-values':'833e330188677593aa88e686b185ff1b06de9447a5b41719dad05d35a5a064d3',
  'wbl-indicator':'f3f21c10ae9b83ff7f969b3158bdeacbe1685c3c6aab4c3f15f77c7df37427ba',
  'wbl-metadata':'949a77040a9fabce7a81a998696e5148edc5809d967b789ed974a2b0682671c5',
  'wbl-methodology':'95bc873988963f5e458f103ea886d2b6ce8f0a0e64c1275f659167ac8857afbd',
  'wbl-downloads':'2e0e89878ae44045933e8ba932ae39530c136be0d5f061d0df8d45877e4627ea',
  'wbl-faq':'4bc414857ea76fa0bacfc2a85623b34edd384cf0655c88a3d134d1a0ea4e497f',
};

export function extractPermission(payload,countries){
  const rows=extractWdi(payload,'GD_WBL_OVL_LAW','2026-07-13');
  for(const row of rows)if(row.value!==null&&(row.value<0||row.value>100||row.year!==2025))throw new Error('Permission score domain or 2026-method reference year mismatch');
  const selected=selectCommonYear(rows,countries,2025);
  if(selected.year!==2025)throw new Error('No substitution of a previous methodology/year');
  return selected;
}

export function verifyPermissionArtifact(id,body,headers,receipt){
  verifyReceipt(body,headers,receipt);
  if(receipt.status!==200||!receipt.usable_http_response||sha256(body)!==`sha256:${pins[id]}`)throw new Error(`Permission source status or pin mismatch: ${id}`);
}

export async function readPermissionSources(){
  const sources={};
  for(const id of Object.keys(pins)){
    const path=resolve(root,directory,id),body=await readFile(path+'.body'),headers=await readFile(path+'.headers.txt'),receipt=JSON.parse(await readFile(path+'.receipt.json','utf8'));
    verifyPermissionArtifact(id,body,headers,receipt);
    sources[id]={body,receipt};
  }
  return sources;
}

export async function buildPermissionCandidate(){
  const sources=await readPermissionSources();
  const countryBytes=await readFile(resolve(root,'signals/countries/country-set.v1.json'));
  const countries=JSON.parse(countryBytes).countries.map(country=>country.iso3);
  const selected=extractPermission(JSON.parse(sources['wbl-values'].body),countries);
  const metadata=JSON.parse(sources['wbl-metadata'].body),source=metadata.source;
  if(metadata.pages!==1||source.length!==1||source[0].id!=='2')throw new Error('Permission metadata source mismatch');
  const variables=source[0].concept.find(c=>c.id==='Series')?.variable;
  if(variables?.length!==1||variables[0].id!=='GD_WBL_OVL_LAW')throw new Error('Permission metadata series mismatch');
  const fields=Object.fromEntries(variables[0].metatype.map(item=>[item.id,item.value]));
  if(fields.License_Type!=='CC BY 3.0 IGO'||fields.Unitofmeasure!=='Score'||fields.Referenceperiod!=='2025-2025'||!fields.Othernotes.includes('WBL 2.0')||!fields.Longdefinition.includes('unweighted average'))throw new Error('Permission methodology, licence or unit requires renewed review');
  return {id:'permission-candidate.v1',provenance:'commissioned-proposal',author:'Ren',created:'2026-09-10',
    native_series:'GD_WBL_OVL_LAW',publisher:'World Bank Women, Business and the Law, distributed in WDI',
    category:'permission',measurement_role:'de-jure-womens-economic-rights-context-proxy',
    country_set:{path:'signals/countries/country-set.v1.json',sha256:sha256(countryBytes)},
    vintage:'WDI lastupdated 2026-07-13; WBL 2026 report, revised WBL 2.0 methodology',
    reference_year:2025,reference_period:'Laws and policies in force through 2025-10-01, not the 2026 retrieval date',
    unit:'index-points-0-to-100',domain:{minimum:0,maximum:100},
    population:'Source-defined legal situations of women employees and entrepreneurs; standardised adult lawful-citizen/main-business-city assumptions, not a sample of every resident.',
    aggregation:'Publisher unweighted average of ten topic scores; retained native score, no recomputation or rounding by this producer.',
    definition:fields.Longdefinition,source_metadata:fields,
    licence:{status:fields.License_Type,native_url:fields.License_URL,url_status:'Publisher metadata URL contains spaces; retained verbatim, not silently repaired.',scope:'Data-series licence only; no blanket licence asserted for the accompanying website HTML.'},
    cadence:'Annual WBL reporting programme; next report planned for 2027 according to retained FAQ.',
    coverage:selected.coverage,coverage_denominator:50,breadth_eligible:selected.eligible,
    observations:selected.observations,missing_countries:selected.missing,
    missing_policy:'No Taiwan-to-China substitution; no previous year, old WBL 1.0 series or modelled fill.',
    history_status:'Only 2025 non-null values in the retained native series; no trend or own-history storm rule.',
    evidence_ceiling:'Formal legal-rights context only. Not a percentage of women with effective rights, enforcement, all-person permission, a specific essential-service route, affordability, agency or a detected storm.',
    binding_category:null,binding_gap:'For a named essential, economy, population and current period: exact legal eligibility, successful and refused attempts, appeal/enforcement outcomes and the other four conditions linked for the same people and feasible alternative routes.',
    panel_admission:'candidate-for-coordinator-review; no shared catalogue or rendered surface changed',
    source_artifacts:Object.entries(sources).map(([id,s])=>({id,file:`${directory}/${id}.body`,sha256:s.receipt.body_sha256,headers_file:`${directory}/${id}.headers.txt`,headers_sha256:s.receipt.headers_sha256,receipt_file:`${directory}/${id}.receipt.json`,source_url:s.receipt.url})),
    storm_detection_performed:false,storm_detected:null,authority_effect:'none',action_authorised:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);if(args.some(a=>a!=='--check'))throw new Error('Only --check is supported');
    const bytes=JSON.stringify(await buildPermissionCandidate(),null,2)+'\n',output=resolve(root,'signals/countries/permission-candidate.v1.json');
    if(args.includes('--check')){if(await readFile(output,'utf8')!==bytes)throw new Error('Permission candidate reproduction mismatch');}
    else await writeFile(output,bytes);
    console.log('Permission candidate reproduced from retained WBL 2026-method source; no binding diagnosis.');
  }catch(error){throw new Error('Permission candidate build failed; do not replace missing evidence',{cause:error});}
}
