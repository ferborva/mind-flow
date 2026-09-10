import { isDeepStrictEqual } from 'node:util';
import { CANADA_SELECTOR } from '../issuance-binding/country-baseline-execution.mjs';

const target=Object.freeze({...CANADA_SELECTOR,time:'2026M10',operator:'gte',native_threshold:'7.302',note_indicator:'I12:422',note_source:'R1:3513',obs_status:'',note_classif:''});
const question='Will the first eligible retained ILO Canadian October 2026 unemployment rate be at least 7.302 percent?';
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
  for(const key of ['note_indicator','note_source','obs_status','note_classif'])if(row[key]!==target[key])throw new Error('native metadata changed; unresolved');
  if(typeof row.obs_value!=='string'||!/^\d{1,3}(?:\.\d{1,3})?$/.test(row.obs_value))throw new Error('native percent missing or malformed; unresolved');
  const [whole,fraction='']=row.obs_value.split('.');const value=Number(whole)*1000+Number(fraction.padEnd(3,'0'));
  if(value>100000)throw new Error('native percent outside valid range; unresolved');
  return value>=7302?1:0;
}
