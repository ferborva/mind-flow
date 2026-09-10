import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDefinition, inspectHistory, validateCriteria, verifyMeasurementBytes, PROPOSED_AT } from './weather-criteria.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=bytes=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;

export async function buildWeatherCriteria(sourceRoot=root,countrySetRoot=sourceRoot){
  // Explicit local integration roots select trusted project code, not remote inputs.
  // Its existing extractor verifies pinned raw bytes, headers and source receipts.
  const producer=await import(pathToFileURL(resolve(sourceRoot,'signals/countries/tools/build-measurements.mjs')));
  const countrySet=await readFile(resolve(countrySetRoot,'signals/countries/country-set.v1.json'));
  const measurements=await readFile(resolve(sourceRoot,'signals/countries/measurements.v1.json'),'utf8');
  const reproduced=JSON.stringify(producer.buildMeasurements(countrySet,await producer.loadSources()),null,2)+'\n';
  verifyMeasurementBytes(measurements,reproduced);
  const parsed=JSON.parse(measurements),entries=[];
  for(const id of ['cpi-annual-change','electricity-access','labour-income-share']){
    const selected=parsed.signals.filter(s=>s.id===id);
    if(selected.length!==1)throw new Error(`Missing or duplicate measured series ${id}`);
    const series=selected[0];
    if(series.coverage<40||series.coverage_denominator!==50||!series.breadth_eligible)throw new Error(`Breadth prerequisite absent for ${id}`);
    const latest=series.observations.filter(row=>row.country==='AUS'&&row.year===series.reference_year);
    if(latest.length!==1||!Number.isFinite(latest[0].value))throw new Error(`Australia is not measured for ${id}`);
    const entry=createDefinition(series,hash(measurements));
    const errors=validateCriteria(entry);if(errors.length)throw new Error(errors.join('; '));
    entries.push({...entry,source_series:id,vintage:series.vintage,history_eligibility:inspectHistory(series)});
  }
  return {id:'country-weather-criteria.v1',provenance:'commissioned-proposal',author:'Ren',proposed_at:PROPOSED_AT,
    measurement_file:'signals/countries/measurements.v1.json',measurement_sha256:hash(measurements),
    country_set_sha256:hash(countrySet),method_file:'signals/countries/weather-criteria.v1.md',
    method_sha256:hash(await readFile(resolve(root,'signals/countries/weather-criteria.v1.md'))),
    status:'proposed-unassessed-comparability',adopted:false,storm_detection_performed:false,storm_detected:null,
    authority_effect:'none',action_authorised:false,publication_approved:false,
    real_evolution_events_added:0,registered_observations:[],entries};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.some(arg=>arg!=='--check'&&!arg.startsWith('--source-root=')&&!arg.startsWith('--country-set-root=')))throw new Error('Unknown weather-criteria argument');
    const sourceRoot=args.find(arg=>arg.startsWith('--source-root='))?.slice(14)??root;
    const countryRoot=args.find(arg=>arg.startsWith('--country-set-root='))?.slice(19)??sourceRoot;
    const bytes=JSON.stringify(await buildWeatherCriteria(sourceRoot,countryRoot),null,2)+'\n';
    const output=resolve(root,'signals/countries/weather-criteria.v1.json');
    if(args.includes('--check')){if(await readFile(output,'utf8')!==bytes)throw new Error('Weather criteria reproduction mismatch');}
    else await writeFile(output,bytes);
    console.log('Proposed weather criteria reproduced; no rank or storm detection performed.');
  }catch(error){throw new Error('Weather criteria build failed; source, history and comparability must not be invented',{cause:error});}
}
