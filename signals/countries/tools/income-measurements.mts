import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCsv, sha256, verifyReceipt } from './measure.mjs';

type Native = Record<string, any>;
const directory=new URL('../',import.meta.url);
const sourceDirectory=new URL('sources/income-2026-09-10/',directory);
const years=Array.from({length:20},(_,i)=>2006+i);
// Forward-only staged repair: compact one family per reviewable commit.
const compactFamilyCount=1;
export function serializeIncomeMeasurements(value: Native) {
  function render(item:any,depth:number,path:(string|number)[]):string {
    const indent='  '.repeat(depth),child='  '.repeat(depth+1);
    if(item===null||typeof item!=='object')return JSON.stringify(item);
    if(Array.isArray(item)) {
      if(!item.length)return '[]';
      const compact=path[0]==='families'&&Number(path[1])<compactFamilyCount&&path[2]==='observations';
      return '[\n'+item.map((entry,index)=>child+(compact?JSON.stringify(entry):render(entry,depth+1,[...path,index]))).join(',\n')+'\n'+indent+']';
    }
    const entries=Object.entries(item).filter(([,v])=>v!==undefined);
    if(!entries.length)return '{}';
    return '{\n'+entries.map(([key,v])=>child+JSON.stringify(key)+': '+render(v,depth+1,[...path,key])).join(',\n')+'\n'+indent+'}';
  }
  return render(value,0,[])+'\n';
}
function unique(rows: Native[]) {
  const seen=new Set<string>();
  for(const row of rows){const key=`${row.iso3}/${row.year}`;if(seen.has(key))throw new Error(`duplicate income observation ${key}`);seen.add(key);}
  return rows.sort((a,b)=>a.iso3.localeCompare(b.iso3,'en')||a.year-b.year);
}
export function extractIncomeIlo(rows: Native[],indicator: string,countries: string[],dictionary: Native[]) {
  const sources=new Set(dictionary.filter(r=>r['source.label']==='ILO - Modelled Estimates').map(r=>`${r.ref_area}/${r.source}`));
  return unique(rows.flatMap((r,index)=>{
    if(!countries.includes(r.ref_area)||r.sex!=='SEX_T'||r.classif1!=='AGE_YTHADULT_YGE15'||!years.includes(Number(r.time)))return [];
    if(r.indicator!==indicator||!sources.has(`${r.ref_area}/${r.source}`))throw new Error('ILO series or country-specific modelled source mismatch');
    if(!/^\d+(?:\.\d+)?$/.test(r.obs_value)||Number(r.obs_value)>100)throw new Error('invalid ILO numeric percentage');
    return [{iso3:r.ref_area,year:Number(r.time),value:Number(r.obs_value),source_value:r.obs_value,source_selector:`CSV record ${index+2}`,native_source:r.source,native_indicator:r.indicator,sex:r.sex,age:r.classif1,estimation_type:'ILO-modelled',estimate_type:'modelled-vintage-no-row-actual-status',flags:{obs_status:r.obs_status??null,note_indicator:r.note_indicator??null,note_source:r.note_source??null}}];
  }));
}
export function extractIncomePip(rows: Native[],countries: string[]) {
  return unique(rows.flatMap((r,index)=>{
    if(!countries.includes(r.country_code)||r.reporting_level!=='national'||!years.includes(r.reporting_year)||r.headcount===null)return [];
    if(r.poverty_line!==3)throw new Error('PIP threshold mismatch');
    if(typeof r.headcount!=='number'||!Number.isFinite(r.headcount)||r.headcount<0||r.headcount>1)throw new Error('invalid PIP fraction');
    if(!['survey','interpolation','extrapolation','CMD estimation'].includes(r.estimation_type))throw new Error('unknown PIP estimation type');
    if(!['income','consumption'].includes(r.welfare_type))throw new Error('unknown PIP welfare type');
    return [{iso3:r.country_code,year:r.reporting_year,value:r.headcount*100,source_value:r.headcount,source_selector:`$[${index}]`,estimation_type:r.estimation_type,estimate_type:r.estimate_type??null,welfare_type:r.welfare_type,reporting_population:r.reporting_pop,survey_year:r.survey_year,survey_acronym:r.survey_acronym??null,comparable_spell:r.comparable_spell,survey_comparability:r.survey_comparability??null,flags:{is_interpolated:r.is_interpolated,distribution_type:r.distribution_type,survey_coverage:r.survey_coverage}}];
  }));
}
function readSource(id:string,allowFailed=false) {
  const body=readFileSync(new URL(`${id}.body`,sourceDirectory));
  const headers=readFileSync(new URL(`${id}.headers.txt`,sourceDirectory));
  const receipt=JSON.parse(readFileSync(new URL(`${id}.receipt.json`,sourceDirectory),'utf8'));
  verifyReceipt(body,headers,receipt);
  if(receipt.status!==200&&!allowFailed)throw new Error(`unusable income source ${id}: HTTP ${receipt.status}`);
  return {body,receipt};
}
export function deriveIncomeMeasurements() {
  const countryBytes=readFileSync(new URL('country-set.v1.json',directory));
  const countries=JSON.parse(countryBytes.toString()).countries.map((c:Native)=>c.iso3);
  if(countries.length!==50||new Set(countries).size!==50)throw new Error('income universe must contain 50 unique retained IMF economies');
  const receipts=readdirSync(sourceDirectory).filter(f=>f.endsWith('.receipt.json')).sort().map(f=>{
    const id=f.replace('.receipt.json','');const {receipt}=readSource(id,true);return receipt;
  });
  if(sha256(JSON.stringify(receipts))!=='sha256:bf7aa6edc0398c3590cc0a086c9d84ebec5a4f98a69e57acdea1a0e1da8b5ed9')throw new Error('income receipt collection differs from commissioned capture');
  const dictionary=parseCsv(readSource('ilo-sources').body.toString());
  const toc=parseCsv(readSource('ilo-toc').body.toString());
  const configs=[
    {id:'income-employment-population.v1',source_id:'ilo-epop',native:'EMP_2WAP_SEX_AGE_RT',label:'Employment-to-population ratio, ages 15+, ILO modelled',condition_category:'availability',denominator:'Population aged 15 years and over, not total population',relationship:'Commissioned: the stock of employment is related to availability of paid work; it does not identify which condition binds access.',limitation:'A lower employment stock share does not count people who lost income routes: entry, exit, population change and job retention offset; hours, earnings and dependants are unmeasured.'},
    {id:'income-unemployment.v1',source_id:'ilo-unemployment',native:'UNE_2EAP_SEX_AGE_RT',label:'Unemployment rate, ages 15+, ILO modelled',condition_category:'availability',denominator:'Labour force aged 15 years and over, employed plus unemployed',relationship:'Commissioned: unsuccessful access to employment relates to availability of paid work; unemployment alone cannot establish its binding cause.',limitation:'The unemployed are not the total population and may never have held a job. Unemployment excludes many people outside the labour force and does not measure income lost, informal-work quality or dependants.'},
  ];
  const base=configs.map(config=>{
    const metadata=toc.find((r:Native)=>r.id===`${config.native}_A`);
    if(!metadata?.['indicator.label']?.includes('Nov. 2025')||metadata.database!=='ILOEST')throw new Error('ILO publication vintage mismatch');
    return {...config,vintage:'ILO modelled estimates, November 2025',source_metadata:metadata,observations:extractIncomeIlo(parseCsv(readSource(config.source_id).body.toString()),config.native,countries,dictionary),licence:{status:'CC-BY-4.0',source_id:'ilo-licence',scope:'ILO datasets and referential metadata published from 3 May 2023; historical observations in this November 2025 dataset are not a claim to license restricted microdata.'}};
  });
  const parameters=JSON.parse(readSource('pip-parameters').body.toString());
  readSource('pip-methodology-current');
  if(!parameters.some((r:Native)=>r.param_names==='version'&&r.param_values==='20260324_2021_01_02_PROD'))throw new Error('PIP version not in publisher parameter metadata');
  const pipReceipt=readSource('pip-lineup').receipt;
  const pipUrl=new URL(pipReceipt.url);
  if(pipUrl.searchParams.get('version')!=='20260324_2021_01_02_PROD'||pipUrl.searchParams.get('fill_gaps')!=='TRUE'||pipUrl.searchParams.get('povline')!=='3'||pipUrl.searchParams.get('reporting_level')!=='national')throw new Error('PIP vintage or publisher-lineup request mismatch');
  const pip={id:'income-poverty-lineup.v1',source_id:'pip-lineup',native:'PIP headcount, poverty_line=3, 2021 PPP',label:'Poverty headcount at $3 per day, 2021 PPP, publisher lineup',condition_category:'price',denominator:'Persons in the national reporting population; household income or consumption is assigned per person',relationship:'Commissioned: resources below a fixed purchasing-power threshold relate to affordability; poverty does not identify why access to income is constrained.',limitation:'A poverty-stock change is not a count of newly disrupted income routes. Welfare includes consumption or income and can reflect transfers and prices. Publisher lineup, nowcast and CMD values are not surveys or independent observations. No affected-household mapping is supplied.',vintage:'20260324_2021_01_02_PROD',source_metadata:{fill_gaps:true,reporting_level:'national',poverty_line:3,ppp_reference_year:2021,conversion:'value = native headcount fraction * 100',methodology_source:'pip-methodology'},observations:extractIncomePip(JSON.parse(readSource('pip-lineup').body.toString()),countries),licence:{status:'World-Bank-default-CC-BY-4.0-subject-to-third-party-exceptions',source_id:'worldbank-licence',scope:'Published aggregate data only, not underlying household microdata; retained indicator metadata credits PIP and national surveys.'}};
  pip.source_metadata.methodology_source='pip-methodology-current';
  const families=[...base,pip].map(f=>{
    const available=new Set(f.observations.map(r=>r.iso3));
    const coverage_by_year=years.map(year=>({year,count:f.observations.filter(r=>r.year===year).length}));
    const complete_history_count=countries.filter((iso3:string)=>years.every(year=>f.observations.some(r=>r.iso3===iso3&&r.year===year))).length;
    return {...f,unit:'percent',provenance:'commissioned-proposal',disruption_measurement:'not-measured',household_mapping:'not-available',evidence_ceiling:'Native income-related stock indicator only. No measured disruption share, gross route-loss count, affected dependants or binding-condition diagnosis.',coverage:{eligible:coverage_by_year.every(r=>r.count>=40),complete_history_count,coverage_by_year,missing_countries:countries.filter((c:string)=>!available.has(c))}};
  });
  return {id:'income-measurements.v1',author:'Ren',provenance:'commissioned-proposal',country_set_sha256:sha256(countryBytes),history:{first_year:2006,last_year:2025,interpretation:'Twenty annual observations from one publisher vintage per family; neither a preregistered forecast nor independent annual survey evidence.'},source_directory:'signals/countries/sources/income-2026-09-10',receipts,families};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const bytes=serializeIncomeMeasurements(deriveIncomeMeasurements());const target=new URL('income-measurements.v1.json',directory);
    if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==bytes)throw new Error('income measurement replay differs');console.log('income measurement retained-source replay passed');}
    else if(process.argv.includes('--write'))writeFileSync(target,bytes,{flag:'wx'});
    else throw new Error('use --check or --write (new output only)');
  }catch(error){throw new Error('Income producer failed; preserve source receipts and inspect the cause',{cause:error});}
}
