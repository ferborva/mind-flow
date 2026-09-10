import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256 } from '../tools/measure.mjs';
import { extractIncomeIlo, extractIncomePip, deriveIncomeMeasurements, serializeIncomeMeasurements } from '../tools/income-measurements.mts';

test('compact observation serialization is valid JSON with unchanged values and bounded lines',()=>{
  const result=deriveIncomeMeasurements();
  const text=serializeIncomeMeasurements(result);
  assert.deepEqual(JSON.parse(text),result);
  assert.ok(text.split('\n').length<5000);
  assert.ok(text.split('\n').some(line=>line.includes('"iso3":"AUS"')));
  const existing=JSON.parse(readFileSync(new URL('../income-measurements.v1.json',import.meta.url),'utf8'));
  assert.deepEqual(JSON.parse(text),existing);
});

const ilo = { ref_area: 'AUS', source: 'XA:1', indicator: 'EMP_2WAP_SEX_AGE_RT', sex: 'SEX_T', classif1: 'AGE_YTHADULT_YGE15', time: '2020', obs_value: '60.1' };
const dictionary = [{ref_area:'AUS',source:'XA:1','source.label':'ILO - Modelled Estimates'}];
test('ILO keeps its working-age denominator and exact native selector, never a disrupted count', () => {
  const [row] = extractIncomeIlo([ilo], 'EMP_2WAP_SEX_AGE_RT', ['AUS'], dictionary);
  assert.equal(row.value,60.1); assert.equal(row.estimation_type,'ILO-modelled');
  assert.equal(row.source_selector,'CSV record 2'); assert.equal(row.disrupted_persons,undefined);
  assert.equal(row.native_source,'XA:1');
});
test('ILO rejects duplicate native observations, wrong sources and invalid numerics', () => {
  assert.throws(()=>extractIncomeIlo([ilo,ilo],ilo.indicator,['AUS'],dictionary),/duplicate/);
  assert.throws(()=>extractIncomeIlo([{...ilo,source:'BA:1'}],ilo.indicator,['AUS'],dictionary),/source/);
  assert.throws(()=>extractIncomeIlo([{...ilo,obs_value:''}],ilo.indicator,['AUS'],dictionary),/numeric/);
});
const pip = {country_code:'AUS',reporting_year:2020,reporting_level:'national',poverty_line:3,headcount:0.06,welfare_type:'income',estimation_type:'extrapolation',estimate_type:'nowcast',is_interpolated:true,distribution_type:'micro',reporting_pop:25000000,survey_year:null,comparable_spell:null};
test('PIP explicitly scales fractions and preserves nowcast, population and missing survey mapping', () => {
  const [row]=extractIncomePip([pip],['AUS']);
  assert.equal(row.value,6); assert.equal(row.source_value,0.06);
  assert.equal(row.estimate_type,'nowcast'); assert.equal(row.estimation_type,'extrapolation');
  assert.equal(row.reporting_population,25000000); assert.equal(row.survey_year,null);
  assert.equal(row.household_affected_persons,undefined);
});
test('PIP excludes non-national rows and missing headcounts; rejects duplicates, threshold drift and unknown estimation types', () => {
  assert.deepEqual(extractIncomePip([{...pip,reporting_level:'urban'},{...pip,headcount:null}],['AUS']),[]);
  assert.throws(()=>extractIncomePip([pip,pip],['AUS']),/duplicate/);
  assert.throws(()=>extractIncomePip([{...pip,poverty_line:2.15}],['AUS']),/threshold/);
  assert.throws(()=>extractIncomePip([{...pip,estimation_type:'agent-fill'}],['AUS']),/estimation/);
});
test('retained producer replays three families with complete 20-year histories and no disruption claims', () => {
  const result=deriveIncomeMeasurements();
  assert.deepEqual(result.families.map(f=>f.coverage.complete_history_count),[50,50,49]);
  assert.deepEqual(result.families.map(f=>f.observations.length),[1000,1000,980]);
  assert.ok(result.families.every(f=>f.disruption_measurement==='not-measured'));
  assert.equal(result.families[2].coverage.missing_countries[0],'ARG');
});
test('the three original publisher bodies are independently pinned, including BOM bytes',()=>{
  for(const [name,hash] of Object.entries({
    'ilo-epop':'af1cc2b1744cf7075afc39f7c6cc577b98ee5e28790651f589b65a3aaee7d000',
    'ilo-unemployment':'0c5640e14a3ca406e855f3ee5f71e4016dce54059493c930d95f326fa1550d7d',
    'pip-lineup':'c684401218f7599ff518140b9b89657315aecd977b33d5e18db9e0aa4656c04e',
  })) assert.equal(sha256(readFileSync(new URL(`../sources/income-2026-09-10/${name}.body`,import.meta.url))),`sha256:${hash}`);
});
test('income producer runs in CI and retained licence/methodology text supports the declared evidence',()=>{
  assert.match(readFileSync(new URL('../../../.github/workflows/integrity.yml',import.meta.url),'utf8'),/node signals\/countries\/tools\/income-measurements\.mts --check/);
  const read=name=>readFileSync(new URL(`../sources/income-2026-09-10/${name}.body`,import.meta.url),'utf8');
  assert.match(read('ilo-licence'),/datasets together with the accompanying referential metadata/);
  assert.match(read('worldbank-licence'),/default license for all Datasets produced by the World Bank/);
  assert.match(read('pip-methodology-current'),/distribution-neutral growth/);
});
