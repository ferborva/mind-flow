import { isDeepStrictEqual } from 'node:util';
import { CANADA_SELECTOR, assertCanadaNativeRow } from '../issuance-binding/country-baseline-execution.mjs';

const target=Object.freeze({...CANADA_SELECTOR,time:'2026M10',operator:'gte',native_threshold:'7.302',note_indicator:'I12:422',note_source:'R1:3513',obs_status:'',note_classif:''});
const question='Will the first eligible retained ILO Canadian October 2026 unemployment rate be at least 7.302 percent?';
export const CANADA_TARGET=target;
export function canadaTargetProse(){
  return {title:'October 2026 Canadian reported unemployment versus frozen August 7.302 percent',question,
    event:'The first eligible retained ILO October 2026 CAN/BA:147/UNE_DEAP_SEX_AGE_RT/SEX_T/AGE_YTHADULT_YGE15 value is at least 7.302 percent.',
    resolution_rule:'Retain the first eligible complete ILO response after the operational eligibility lower bound 6 November 2026; this is not a guaranteed ILO publication date. Select exactly one CAN/BA:147/UNE_DEAP_SEX_AGE_RT/SEX_T/AGE_YTHADULT_YGE15/2026M10 cell with all frozen native labels and flags unchanged. Transform percent x to x/100; resolve 1 iff x/100 >=0.07302, equivalently native x>=7.302. No headline substitution, revised August threshold, later-vintage shopping or zero imputation. Missing or changed cells follow the prewritten void procedure.'};
}
export function assertCanadaTargetConsistency(forecast,protocol,resolverParameters,baselineParameters){
  const prose=canadaTargetProse();const require=(v,m)=>{if(!v)throw new Error('Canadian native target/prose conflict: '+m);};
  require(forecast?.title===prose.title&&forecast?.question===prose.question&&protocol?.target?.question===prose.question,'prose');
  require(forecast?.target?.event===prose.event&&protocol?.target?.event_definition===prose.event,'event');
  require(forecast?.target?.resolution_rule===prose.resolution_rule&&protocol?.target?.resolution_rule===prose.resolution_rule,'resolution rule');
  for(const [key,value] of Object.entries(target))require(resolverParameters?.[key]===value,'native '+key);
  require(isDeepStrictEqual(Object.keys(resolverParameters).sort(),[...Object.keys(target),'dependencies'].sort()),'no unreviewed resolver parameter');
  const sourceUri='https://rplumber.ilo.org/data/indicator?id=UNE_DEAP_SEX_AGE_RT_M&ref_area=CAN&source=BA%3A147&sex=SEX_T&classif1=AGE_YTHADULT_YGE15&timefrom=2016&format=.csv&type=both';
  require(forecast?.target?.resolution_source===sourceUri&&protocol?.target?.resolution_source_uri===sourceUri,'native endpoint');
  const scope={geographies:['Canada'],cohorts:['Both sexes, labour force aged 15 and older'],services:['Reported unemployment rate, exposure context only']};
  require(isDeepStrictEqual(forecast?.target?.scope,scope)&&isDeepStrictEqual(protocol?.target?.scope,scope),'scope');
  require(forecast?.target?.resolver?.operator==='gte'&&forecast.target.resolver.threshold===0.07302,'threshold');
  for(const [key,value] of Object.entries({signal_id:'signal.canada.unemployment.bounded-rate',metric_id:'metric.canada.unemployment.bounded-rate',condition_id:'condition.canada.unemployment.stock'}))require(forecast?.target?.[key]===value,key);
  require(baselineParameters?.length===2&&baselineParameters.every(p=>isDeepStrictEqual(p,{first_month:'2016-09',last_month:'2026-08',horizon_months:2})),'baseline window');
  require(forecast?.target?.observation_window_start==='2026-10-01T00:00:00Z'&&forecast.target.observation_window_end==='2026-10-31T23:59:59Z','future observation month');
  require(forecast?.target?.outcome_publication_not_before==='2026-11-06T00:00:00Z'&&forecast.resolve_after==='2026-11-06T00:00:00Z'&&forecast.resolve_by==='2026-12-31T23:59:59Z','resolution clock');
  require(forecast?.probability===0.090909&&forecast?.baseline?.probability===0.483333&&forecast?.naive_baseline?.probability===0.5,'fixed probabilities');
  require(isDeepStrictEqual(forecast?.method,{kind:'model',description:'Use all nine August-to-October pairs in the fixed baseline window with Laplace smoothing, 1/11. Method chosen after inspecting historical seasonality; retain all-month 0.483333 and naive 0.5 comparators. Nine potentially dependent pairs do not establish calibration, skill or validated binomial uncertainty.',version:'1.0.0'}),'fixed disclosed forecaster method');
  return true;
}
export function assertCanadaDraftTarget(draft){
  const fail=message=>{throw new Error('Canadian native target conflict: '+message);};
  if(!isDeepStrictEqual(draft?.target,target))fail('exact source-native tuple and frozen threshold required');
  if(draft.question!==question)fail('question must describe the fixed native target');
  if(draft.status!=='draft-not-issued'||draft.issuance_authorised!==false)fail('this preparation policy cannot authorise issuance');
  if(!isDeepStrictEqual(draft.clocks?.observation_window,{starts_at:'2026-10-01T00:00:00Z',ends_at:'2026-10-31T23:59:59Z'}))fail('future October reference month required');
  if(draft.clocks.outcome_publication_not_before!=='2026-11-06T00:00:00Z'||draft.clocks.resolve_after!=='2026-11-06T00:00:00Z'||draft.clocks.resolution_window_closes_at!=='2026-12-31T23:59:59Z')fail('reviewed future resolution window required');
  if(!isDeepStrictEqual(draft.baselines?.parameters,{first_month:'2016-09',last_month:'2026-08',horizon_months:2}))fail('fixed baseline window required');
  if(draft.companion?.storm_panel_admitted!==false||draft.companion?.disruption_measurement!=='not-measured')fail('reported companion must not be promoted to storm disruption');
  return true;
}
// Native comparison only. The issuance/resolution adapter must separately enforce
// receipt identity, chronology, first-presence and immutable source integrity.
// This function intentionally cannot create a resolution event.
export function resolveCanadaNativeCell(rows){
  if(!Array.isArray(rows))throw new TypeError('native rows required');
  const selected=rows.filter(row=>Object.entries(CANADA_SELECTOR).every(([k,v])=>row[k]===v)&&row.time===target.time);
  if(selected.length!==1)throw new Error('exactly one native October cell required; unresolved');
  const row=selected[0];
  assertCanadaNativeRow(row);
  for(const key of ['note_indicator','note_source','obs_status','note_classif'])if(row[key]!==target[key])throw new Error('native metadata changed; unresolved');
  if(typeof row.obs_value!=='string'||!/^\d{1,3}(?:\.\d{1,3})?$/.test(row.obs_value))throw new Error('native percent missing or malformed; unresolved');
  const [whole,fraction='']=row.obs_value.split('.');const value=Number(whole)*1000+Number(fraction.padEnd(3,'0'));
  if(value>100000)throw new Error('native percent outside valid range; unresolved');
  return value>=7302?1:0;
}
