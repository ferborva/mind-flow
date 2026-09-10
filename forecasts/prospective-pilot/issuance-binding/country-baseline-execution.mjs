import { parseCsv } from '../../../signals/countries/tools/measure.mjs';

export const CANADA_SELECTOR=Object.freeze({ref_area:'CAN',source:'BA:147',indicator:'UNE_DEAP_SEX_AGE_RT',sex:'SEX_T',classif1:'AGE_YTHADULT_YGE15'});
export const CANADA_LABELS=Object.freeze({'ref_area.label':'Canada','source.label':'LFS - Labour Force Survey','indicator.label':'Unemployment rate by sex and age (%)','sex.label':'Total','classif1.label':'Age (Youth, adults): 15+','obs_status.label':'','note_classif.label':'','note_indicator.label':'Frequency: Monthly','note_source.label':'Repository: ILO-STATISTICS - Micro data processing'});
export function assertCanadaNativeRow(row){
  const keys=[...Object.keys(CANADA_SELECTOR),...Object.keys(CANADA_LABELS),'time','obs_value','obs_status','note_classif','note_indicator','note_source'];
  if(JSON.stringify(Object.keys(row).sort())!==JSON.stringify(keys.sort()))throw new TypeError('exact native header dimensions required');
  assertSelector(Object.fromEntries(Object.keys(CANADA_SELECTOR).map(k=>[k,row[k]])));
  for(const [key,label] of Object.entries(CANADA_LABELS))if(row[key]!==label)throw new TypeError('native label changed');
  if(row.obs_status!==''||row.note_classif!==''||row.note_indicator!=='I12:422'||row.note_source!=='R1:3513')throw new TypeError('native metadata changed');
}
function monthIndex(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month??''))throw new TypeError('exact calendar month required');
  return Number(month.slice(0,4))*12+Number(month.slice(5))-1;
}
function nativeMilliPercent(value){
  if(typeof value!=='string'||!/^\d{1,3}(?:\.\d{1,3})?$/.test(value))throw new TypeError('native percent requires at most three decimal places');
  const [whole,fraction='']=value.split('.');const n=Number(whole)*1000+Number(fraction.padEnd(3,'0'));
  if(n>100000)throw new TypeError('percent outside 0 to 100');return n;
}
function assertSelector(selector){
  if(!selector||JSON.stringify(Object.keys(selector).sort())!==JSON.stringify(Object.keys(CANADA_SELECTOR).sort())||Object.entries(CANADA_SELECTOR).some(([k,v])=>selector[k]!==v))throw new TypeError('exact native Canadian selector required');
}
export function extractCanadaCompanion(csv){
  const rows=parseCsv(csv);const observations=[];const seen=new Set();
  for(const row of rows){
    assertCanadaNativeRow(row);
    if(!/^\d{4}M(0[1-9]|1[0-2])$/.test(row.time))throw new TypeError('native monthly time required');
    const month=row.time.replace('M','-');
    if(month>'2026-08')throw new TypeError('future information exceeds frozen baseline cutoff');
    if(seen.has(month))throw new TypeError('duplicate native month');seen.add(month);
    nativeMilliPercent(row.obs_value);observations.push({month,value:row.obs_value});
  }
  if(!observations.length)throw new TypeError('empty native companion');
  observations.sort((a,b)=>a.month.localeCompare(b.month));
  return {selector:CANADA_SELECTOR,observations};
}
export function runCountryBaseline(algorithmId,document,parameters){
  if(!['mind-flow.country-two-month-direction','mind-flow.equal-probability'].includes(algorithmId))throw new TypeError('unsupported baseline algorithm');
  if(!parameters||JSON.stringify(Object.keys(parameters).sort())!==JSON.stringify(['first_month','horizon_months','last_month'])||parameters.horizon_months!==2)throw new TypeError('invalid fixed baseline parameters');
  assertSelector(document?.selector);
  const first=monthIndex(parameters.first_month),last=monthIndex(parameters.last_month);
  if(last-first<2||last-first>120)throw new TypeError('baseline requires 3 to 121 months');
  if(!Array.isArray(document.observations))throw new TypeError('observations required');
  const values=new Map();
  for(const observation of document.observations){
    const month=monthIndex(observation.month);if(month<first||month>last)continue;
    if(values.has(month))throw new TypeError('duplicate month');values.set(month,nativeMilliPercent(observation.value));
  }
  if(values.size!==last-first+1)throw new TypeError('baseline months must be consecutive and complete');
  if(algorithmId==='mind-flow.equal-probability')return 0.5;
  let successes=0;for(let month=first+2;month<=last;month++)if(values.get(month)>=values.get(month-2))successes++;
  const divisor=BigInt(last-first+1),scaled=BigInt(successes+1)*1000000n;
  let q=scaled/divisor;const twice=2n*(scaled%divisor);if(twice>divisor||(twice===divisor&&q%2n===1n))q++;
  return Number(q)/1000000;
}
export function runCanadaSeasonalForecaster(document){
  // Validate the complete frozen window before selecting its calendar-matched pairs.
  runCountryBaseline('mind-flow.equal-probability',document,{first_month:'2016-09',last_month:'2026-08',horizon_months:2});
  const values=new Map(document.observations.map(x=>[x.month,x.value]));
  const pairs=[];
  for(let year=2017;year<=2025;year++){
    const august=values.get(`${year}-08`),october=values.get(`${year}-10`);
    pairs.push({year,august,october,nonnegative:nativeMilliPercent(october)>=nativeMilliPercent(august)});
  }
  const successes=pairs.filter(p=>p.nonnegative).length;
  return {algorithm_id:'mind-flow.canada-august-october-laplace',algorithm_version:'1.0.0',probability:Number(((successes+1)/(pairs.length+2)).toFixed(6)),successes,comparisons:pairs.length,pairs,
    method:'All nine August-to-October pairs wholly inside the fixed September 2016 to August 2026 baseline; (nonnegative pairs+1)/(pairs+2), six decimals',
    selection_disclosure:'Method chosen after examining historical seasonal pattern; target and source selected for future calendar and retained availability. Not a blind design or optimised threshold.',
    uncertainty:'Nine potentially dependent historical pairs; not calibrated, no skill claim, and binomial precision is not validated uncertainty.'};
}
