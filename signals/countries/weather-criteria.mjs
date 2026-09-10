import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { FIXED_EVALUATOR_REF, computeConditionDefinitionHash, computeSignalDefinitionHash } from '../../contracts/executable-if/validate.mjs';

const schema=JSON.parse(readFileSync(new URL('../../contracts/executable-if/schema/executable-if-kernel.schema.json',import.meta.url)));
const ajv=new Ajv({allErrors:true,strict:true});addFormats(ajv);ajv.addSchema(schema);
const validateDefinition=ajv.compile({$ref:`${schema.$id}#/$defs/conditionDefinition`});
const validateSignal=ajv.compile({$ref:`${schema.$id}#/$defs/signalDefinition`});
const hashPattern=/^sha256:[a-f0-9]{64}$/;
export const PROPOSED_AT='2026-09-10T01:23:27Z';
const specs={
  'cpi-annual-change':{unit:'annual-percent-change',category:'price',difference:false},
  'electricity-access':{unit:'percent-of-population',category:'availability',difference:true},
  'labour-income-share':{unit:'percent-of-gdp',category:'price',difference:true},
};
export function verifyMeasurementBytes(retained,reproduced){
  if(!retained||retained!==reproduced)throw new Error('Retained measurements failed exact source-derived replay');
}
function specification(series){const spec=specs[series.id];if(!spec||spec.unit!==series.unit)throw new Error('Unsupported series or unit');return spec;}

// Arithmetic demonstration only. No real-history admission or storm classifier.
export function rankMagnitude(latest,prior){
  if(!Array.isArray(prior)||prior.length!==10)throw new Error('Exactly ten prior movements required');
  if(![latest,...prior].every(Number.isFinite))throw new Error('Movements must be finite');
  const value=Math.abs(latest);
  return prior.reduce((sum,p)=>sum+(Math.abs(p)<value?1:Math.abs(p)===value?0.5:0),0)/10;
}

export function inspectHistory(series){
  const spec=specification(series),year=series.reference_year;
  if(!Number.isInteger(year))throw new Error('Invalid reference year');
  const first=year-10-(spec.difference?1:0),rows=[],gaps=[];
  for(let y=first;y<=year;y++){
    const matches=series.retained_history.filter(row=>row.country==='AUS'&&row.year===y);
    if(matches.length!==1){gaps.push(`${y}: expected one exact country-year row, got ${matches.length}`);continue;}
    const row=matches[0];
    if(!Number.isFinite(row.value)||typeof row.source_selector!=='string'||!row.source_selector.trim()||
      (spec.difference?(row.value<0||row.value>100):row.value<=-100)){
      gaps.push(`${y}: missing selector, value or valid numeric domain`);continue;
    }
    rows.push(structuredClone(row));
  }
  return {country:'AUS',reference_year:year,prior_movement_years:Array.from({length:10},(_,i)=>year-10+i),
    numeric_history_complete:gaps.length===0,rows,gaps,comparability:'unassessed',
    comparability_required:'Country-specific basket, population, survey/model, boundary and definition continuity review across the entire retained interval.',
    rank:null,storm_detection_performed:false,storm_detected:null,authority_effect:'none',action_authorised:false};
}

export function createDefinition(series,measurementHash){
  const spec=specification(series);
  if(!hashPattern.test(series.source_sha256)||!hashPattern.test(measurementHash)||!series.source_file||!series.vintage||!series.definition)throw new Error('Missing retained source identity');
  const id=`country-weather.aus.${series.id}`;
  const rule=`Proposed midrank: (count of ten preceding absolute annual movements below latest + 0.5 times exact ties)/10; latest excluded; consecutive years only; no rounding. ${spec.difference?'Movement is signed annual percentage-point difference of levels.':'Movement is the annual CPI percentage-change rate itself.'} Country-specific comparability review required and absent. Measurement bytes ${measurementHash}; vintage ${series.vintage}.`;
  const signal={signal_id:`signal.${id}`,definition_version:'1.0.0',label:`Proposed Australian ${series.id} own-history midrank`,
    construct:'Relative magnitude of annual movement, not a storm or agency measure',population:`Australia; source construct: ${series.definition}`,
    estimand:`Research-only tail position; ${series.evidence_ceiling}`,aggregation:rule,projection_policy:'exact-scope-only',
    source_schema_ref:`${series.source_file}#${series.source_sha256}`,value_kind:'number',unit:'ratio',value_range:{minimum:0,maximum:1},signal_definition_hash:''};
  signal.signal_definition_hash=computeSignalDefinitionHash(signal);
  const definition={condition_id:`condition.${id}`,condition_category:spec.category,definition_version:'1.0.0',
    proposition:'The scoped annual movement meets the proposed own-history investigation threshold, not a detected storm.',
    claim:{who:`Australia; ${series.definition}`,verb:'meet',object:'the proposed own-history movement investigation threshold',standard:'Midrank at least 0.90 against ten preceding comparable annual movements; not a warning or causal claim',polarity:'affirmative',period:{starts_at:PROPOSED_AT,ends_at:'2027-09-10T01:23:27Z'}},
    effective_from:PROPOSED_AT,scope:{jurisdictions:['Australia'],geographies:['Australia'],cohorts:[series.definition],services:[`Country-level ${series.id} context review`]},
    predicates:{tail:{signal_ref:{signal_id:signal.signal_id,definition_version:signal.definition_version,signal_definition_hash:signal.signal_definition_hash},operator:'gte',threshold:{value:0.9,unit:'ratio'},window:{lookback_days:365,minimum_observations:1,persistence:1,maximum_age_days:365},source_policy:{minimum_distinct_source_ids:1,minimum_distinct_artifact_hashes:1,minimum_coverage_ratio:1,agreement:'unanimous-per-period'},missing_result:'unknown',stale_result:'stale',conflict_result:'conflicted'}},
    truth_expression:{predicate_ref:'tail'},evaluator_ref:FIXED_EVALUATOR_REF,classification:'research-draft',empirical_truth_established:false,authority_effect:'none',action_authorised:false,definition_hash:''};
  definition.definition_hash=computeConditionDefinitionHash(definition);
  return {source_sha256:series.source_sha256,source_file:series.source_file,measurement_sha256:measurementHash,signal,definition};
}

export function validateCriteria(entry){
  const errors=[];
  if(!validateDefinition(entry.definition))errors.push('Existing condition-definition schema rejected proposal');
  if(!validateSignal(entry.signal))errors.push('Existing signal-definition schema rejected proposal');
  if(!hashPattern.test(entry.source_sha256)||!hashPattern.test(entry.measurement_sha256)||entry.signal.source_schema_ref!==`${entry.source_file}#${entry.source_sha256}`)errors.push('Retained source identity mismatch');
  if(entry.signal.signal_definition_hash!==computeSignalDefinitionHash(entry.signal)||entry.definition.definition_hash!==computeConditionDefinitionHash(entry.definition))errors.push('Definition content hash mismatch');
  if(entry.signal.value_range?.minimum!==0||entry.signal.value_range?.maximum!==1||entry.signal.unit!=='ratio')errors.push('Midrank domain must be [0,1] ratio');
  const predicate=entry.definition.predicates?.tail;
  if(predicate?.threshold.value!==0.9||predicate?.threshold.unit!=='ratio'||predicate?.operator!=='gte'||predicate?.signal_ref.signal_definition_hash!==entry.signal.signal_definition_hash)errors.push('Proposed threshold or signal binding changed');
  if(JSON.stringify(entry.definition.truth_expression)!==JSON.stringify({predicate_ref:'tail'})||
    JSON.stringify(entry.definition.scope.geographies)!==JSON.stringify(['Australia'])||
    JSON.stringify(entry.definition.scope.jurisdictions)!==JSON.stringify(['Australia'])||
    predicate?.window.lookback_days!==365||predicate?.window.maximum_age_days!==365||
    predicate?.window.minimum_observations!==1||predicate?.window.persistence!==1)errors.push('Proposed country, truth rule or annual review window changed');
  if(!entry.signal.aggregation.includes(`Measurement bytes ${entry.measurement_sha256};`))errors.push('Measurement binding missing');
  return errors;
}
