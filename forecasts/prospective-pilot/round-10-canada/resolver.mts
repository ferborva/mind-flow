import { parseCsv } from '../../../signals/countries/tools/measure.mjs';
import { resolveCanadaNativeCell, canadaTargetProse } from './target-policy.mjs';
import { CANADA_SELECTOR } from '../issuance-binding/country-baseline-execution.mjs';

// Prepares the existing resolution payload only. External retained bytes,
// first-presence chronology and receipt verification remain separate gates.
export function canadaOutcomePayload(rows:Record<string,string>[],forecast:any){
  const target=forecast?.target;
  if(target?.resolution_rule!==canadaTargetProse().resolution_rule||target?.observation_window_start!=='2026-10-01T00:00:00Z'||target.observation_window_end!=='2026-10-31T23:59:59Z'||target.resolver.operator!=='gte'||target.resolver.threshold!==0.07302||target.signal_id!=='signal.canada.unemployment.bounded-rate'||target.condition_id!=='condition.canada.unemployment.stock')throw new Error('fixed Canadian October target required');
  const binary=resolveCanadaNativeCell(rows);
  const row=rows.find(row=>Object.entries(CANADA_SELECTOR).every(([k,v])=>row[k]===v)&&row.time==='2026M10')!;
  const value=Number(row.obs_value)/100;
  if(Number(value>=0.07302)!==binary)throw new Error('native decimal and fraction comparator disagree');
  return {schema_version:'1.1.0',resolution_event_id:target.resolution_event_id,signal_id:target.signal_id,metric_id:target.metric_id,metric_checksum:target.metric_checksum,condition_id:target.condition_id,scope_hash:target.scope_hash,measure:target.resolver.measure,unit:target.resolver.observation_unit,scope:target.scope,observation_window_start:target.observation_window_start,observation_window_end:target.observation_window_end,value};
}
export function extractCanadaResolution(csv:string,forecast:any){return canadaOutcomePayload(parseCsv(csv),forecast);}
