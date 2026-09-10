import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanadaBasis } from '../round-10-canada/basis.mts';
import { prepareCanadaCandidate } from '../round-10-canada/candidate.mts';
import { assessFutureIssuanceBinding } from '../issuance-binding/round-10-country-validate.mjs';
import { canadaOutcomePayload } from '../round-10-canada/resolver.mts';
import { CANADA_SELECTOR, CANADA_LABELS } from '../issuance-binding/country-baseline-execution.mjs';
import { assertCanadaTargetConsistency } from '../round-10-canada/target-policy.mjs';
test('Canadian basis is a literal statistic with correlated-only research relationship',()=>{
  const {kernel,registry}=buildCanadaBasis();
  assert.equal(kernel.events[0].introduced_definitions[0].condition_category,'availability');
  assert.equal(registry.signals[0].condition_links[0].edge_type,'correlated-only');
  assert.equal(kernel.authority_effect,'none');
  assert.equal(kernel.empirical_truth_established,false);
});
test('Canadian pure preparation binds source-native target and executes both comparators',()=>{
  const clocks={sealAt:'2026-09-10T08:00:00Z',issueOpensAt:'2026-09-10T08:10:00Z',issuedAt:'2026-09-10T08:11:00Z',sourceCommit:'e518b66'};
  const first=prepareCanadaCandidate(clocks);
  const candidate=prepareCanadaCandidate({...clocks,externalReceipt:{source:'https://example.invalid/test-only',checksum:'sha256:'+'a'.repeat(64),registered_content_sha256:first.protocol.registration.protocol_content_sha256,registered_at:'2026-09-10T08:01:00Z',checksum_scope:'external-receipt-bytes-not-this-protocol-record',verification_status:'unverified_external_review_required'}});
  const result=assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.binding_complete,true,JSON.stringify(result.issues));
  assert.equal(candidate.forecast.probability,0.090909);
  assert.equal(candidate.forecast.baseline.probability,0.483333);
  assert.equal(candidate.forecast.naive_baseline.probability,0.5);
  assert.equal(candidate.protocol.source_chronology.events[0].observed_at,'2026-09-10T07:15:00Z');
  assert.equal(candidate.protocol.source_chronology.events[0].artifact_sha256,null,'future outcome is absent; inspection bytes are bound separately');
  assert.ok(candidate.input.matureForecastSources.resolverArtifacts.dependencies['forecasts/prospective-pilot/round-10-canada/absence-2026-09-10/ilo-canada-reported.body']);
  assert.throws(()=>prepareCanadaCandidate({...clocks,sourceAbsencePath:'/tmp/arbitrary'}));
  for(const mutate of [c=>c.resolverParameters.time='2026M11',c=>c.resolverParameters.native_threshold='7.3',c=>c.forecast.target.resolver.threshold=0.5,c=>c.parameters.horizon_months=1,c=>c.forecast.target.observation_window_start='2025-10-01T00:00:00Z',c=>c.forecast.method.description='A calibrated model']){
    const c=structuredClone({forecast:candidate.forecast,protocol:candidate.protocol,resolverParameters:candidate.resolverParameters,parameters:candidate.parameters});mutate(c);
    assert.throws(()=>assertCanadaTargetConsistency(c.forecast,c.protocol,c.resolverParameters,[c.parameters,c.parameters]));
  }
  const changedProtocol=structuredClone(candidate.protocol);changedProtocol.source_chronology.events[0].observed_at='2026-09-10T06:54:55Z';
  const changedInput={...candidate.input,preregistrationBytes:Buffer.from(JSON.stringify(changedProtocol))};
  assert.ok(assessFutureIssuanceBinding(changedInput).issues.some(x=>x.code==='CANADA_NATIVE_TARGET_PROSE_CONFLICT'&&/fresh retained absence/.test(x.message)));
  for(const path of Object.keys(candidate.input.matureForecastSources.resolverArtifacts.dependencies)){
    const dependencies=candidate.input.matureForecastSources.resolverArtifacts.dependencies,saved=dependencies[path];
    dependencies[path]={...saved,bytes:Buffer.from('changed')};
    assert.equal(assessFutureIssuanceBinding(candidate.input).binding_complete,false,path);
    dependencies[path]=saved;
  }
  for(const [value,outcome] of [['7.301',false],['7.302',true],['7.303',true]]){
    const row={...CANADA_SELECTOR,...CANADA_LABELS,time:'2026M10',obs_value:value,obs_status:'',note_classif:'',note_indicator:'I12:422',note_source:'R1:3513'};
    const payload=canadaOutcomePayload([row],candidate.forecast);
    assert.equal(payload.value>=candidate.forecast.target.resolver.threshold,outcome);
    assert.equal(payload.value,Number(value)/100);
  }
});
