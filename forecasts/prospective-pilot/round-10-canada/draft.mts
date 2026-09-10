import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCanadaCompanion, runCountryBaseline, CANADA_SELECTOR } from '../issuance-binding/country-baseline-execution.mjs';
import { assertCanadaDraftTarget } from './target-policy.mjs';

const directory=import.meta.dirname;
const sha=(bytes:Buffer|string)=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const expected={
  'ilo-canada-reported':'sha256:0c1a707f99b482fea3da936c45c3bfa565dce6184a542e9b96a7e4f9bd5fd52b',
  'ilo-api-schema':'sha256:6e5b008e2820d0f61c6729e6cb3ad1e3f67248718d5a46037b8737390dc76926',
};
function retained(id:keyof typeof expected){
  const base=resolve(directory,'sources-2026-09-10',id);
  const body=readFileSync(base+'.body'),headers=readFileSync(base+'.headers.txt'),receipt=JSON.parse(readFileSync(base+'.receipt.json','utf8'));
  if(sha(body)!==expected[id]||receipt.body_sha256!==expected[id]||receipt.body_byte_length!==body.length||receipt.headers_sha256!==sha(headers)||receipt.status!==200)throw new Error('retained source integrity failed: '+id);
  return {body,receipt};
}
export function deriveCanadaDraft(){
  const source=retained('ilo-canada-reported');retained('ilo-api-schema');
  const history=extractCanadaCompanion(source.body.toString('utf8'));
  const reference=history.observations.find(x=>x.month==='2026-08');
  if(reference?.value!=='7.302')throw new Error('frozen reference changed');
  const parameters={first_month:'2016-09',last_month:'2026-08',horizon_months:2};
  const document={
    status:'draft-not-issued',issuance_authorised:false,
    question:'Will the first eligible retained ILO Canadian October 2026 unemployment rate be at least 7.302 percent?',
    companion:{family:'income-unemployment.v1',storm_panel_admitted:false,breadth:'single-country companion only',estimation:'ILO microdata-processed reported LFS series; not ILO modelled estimates',denominator:'Canadian labour force aged 15 and older, both sexes',unit:'percent',disruption_measurement:'not-measured',seasonal_adjustment:'not asserted; no StatCan headline substitution'},
    target:{...CANADA_SELECTOR,time:'2026M10',operator:'gte',native_threshold:'7.302',note_indicator:'I12:422',note_source:'R1:3513',obs_status:'',note_classif:''},
    reference,history,
    baselines:{algorithm_id:'mind-flow.country-two-month-direction',algorithm_version:'1.0.0',parameters,direction:runCountryBaseline('mind-flow.country-two-month-direction',history,parameters),naive:runCountryBaseline('mind-flow.equal-probability',history,parameters),method:'118 two-month endpoint comparisons over 120 complete months; nonnegative changes count; Laplace smoothing (successes+1)/(comparisons+2); six-decimal half-even rounding; no parameter tuning'},
    clocks:{observation_window:{starts_at:'2026-10-01T00:00:00Z',ends_at:'2026-10-31T23:59:59Z'},outcome_publication_not_before:'2026-11-06T00:00:00Z',resolve_after:'2026-11-06T00:00:00Z',resolution_window_closes_at:'2026-12-31T23:59:59Z',issue_window:'UNSET: requires review, source absence, sealing and external receipt before October'},
    resolution_design:{authority:'ILOSTAT filtered endpoint, not direct Statistics Canada cell',first_eligible:'first complete retained HTTP 200 response after observation end and publication lower bound with exactly one matching native tuple and unchanged flags',comparison:'decimal native percent >= frozen 7.302; August revisions do not move threshold',void_if:'missing target by close, duplicate/conflicting cell, changed native definition/flags, source unavailable, or capture fails integrity; never impute zero or substitute another series',calendar_limit:'Statistics Canada calendar schedules upstream October LFS for 6 November; dates may change and ILO ingestion has no guaranteed lag'},
    source:{url:source.receipt.url,body_sha256:expected['ilo-canada-reported'],retrieved_at:source.receipt.ended_at,receipt_sha256:sha(readFileSync(resolve(directory,'sources-2026-09-10/ilo-canada-reported.receipt.json')))},
    remaining_gates:['independent baseline and native selector review','fixed country adapter target/prose/clock binding and conformance tests','source-absence acquisition immediately before sealing','existing kernel and protocol validation','external immutable timestamp receipt before issue window','root approval to issue'],
  };
  assertCanadaDraftTarget(document);return document;
}
export const serializeCanadaDraft=(document:ReturnType<typeof deriveCanadaDraft>)=>JSON.stringify(document,null,2)+'\n';
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length>1||args.some(a=>a!=='--check'))throw new Error('usage: draft.mts [--check]');
  const output=resolve(directory,'preregistration-draft.json'),bytes=serializeCanadaDraft(deriveCanadaDraft());
  if(args[0]==='--check'){if(readFileSync(output,'utf8')!==bytes)throw new Error('Canadian draft replay drift');}
  else writeFileSync(output,bytes);
}
