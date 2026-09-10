import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMeasurements, loadSources } from './build-measurements.mjs';

const sha256=bytes=>`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const escape=text=>String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/[\r\n\t]+/g,' ').replace(/([\\`*_{}\[\]()#!|])/g,'\\$1');
const labels={
  'cpi-annual-change':{title:'Headline CPI change',unit:'% annual change'},
  'electricity-access':{title:'Electricity access',unit:'% of population'},
  'labour-income-share':{title:'Labour income share',unit:'% of GDP, publisher-modelled'},
};
const categories=['price','permission','proximity','availability','capability'];
function sourceHref(path){
  if(typeof path!=='string'||!/^signals\/countries\/sources\/[A-Za-z0-9_./-]+\.body$/.test(path)||path.split('/').includes('..'))throw new Error('invalid retained source path');
  return path.slice('signals/countries/'.length);
}

// Text-only projection of retained measurements. This never assigns a binding
// category, computes a weather rank or admits another candidate series.
export function renderCountryView(measurements,{measurementSha256}={}){
  if(!/^sha256:[a-f0-9]{64}$/.test(measurementSha256??''))throw new Error('measurement hash required');
  const signals=Object.keys(labels).map(id=>{
    const matches=measurements.signals.filter(signal=>signal.id===id);
    if(matches.length!==1)throw new Error('missing or duplicate reader signal');
    const signal=matches[0];
    if(!signal.breadth_eligible||signal.coverage<40||signal.coverage_denominator!==50)throw new Error('reader breadth prerequisite absent');
    sourceHref(signal.source_file);
    const seen=new Set();
    for(const row of signal.observations){
      if(seen.has(row.country)||!Number.isFinite(row.value)||row.year!==signal.reference_year||!row.source_selector)throw new Error('invalid, duplicate or mismatched reader observation');
      seen.add(row.country);
    }
    if([...seen].filter(code=>measurements.countries.some(country=>country.iso3===code)).length<40)throw new Error('measured reader coverage below forty');
    return signal;
  });
  const visible=measurements.countries.filter(country=>signals.some(signal=>signal.observations.some(row=>row.country===country.iso3)));
  if(new Set(visible.map(country=>country.iso3)).size!==visible.length)throw new Error('duplicate reader economy');
  const count=signals.reduce((sum,signal)=>sum+signal.observations.filter(row=>visible.some(country=>country.iso3===row.country)).length,0);
  const lines=[
    '---','id: country-measurement-view','title: Country measurement snapshot','type: research-synthesis','status: commissioned-proposal',
    'provenance: commissioned-proposal','author: Ren','created: 2026-09-10','---','',
    '# Country measurement snapshot','',
    `**${visible.length} measured economies, ${count} retained signal observations.** These are dated national statistics, not live conditions or a warning result. Binding categories remain unknown; the evidence needed to assess them is named below.`,
    '',
    'The proposed sampling frame uses 2025 nominal GDP in the April 2026 IMF WEO. Fernando has not chosen the ranking or signals. IMF economies include Hong Kong and Taiwan separately; the labels make no sovereignty decision. GDP estimates may be present even for a completed year.',
    '',
    `Measurement snapshot: [retained data](measurements.v1.json), ${measurementSha256}. Country-frame hash: ${escape(measurements.country_set.sha256)}.`,
    '',
    'Values display at most three decimal places; original precision remains in the linked bytes. Each series uses one common reference year and one retained publisher vintage. Missing entries are not backfilled. Empty native observation flags do not certify actual-only data. ILO labour-income shares are publisher-modelled, including imputation; national averages do not establish household access.',
    '',
    '### Series and interpretation','',
  ];
  for(const signal of signals){
    lines.push(`- **${labels[signal.id].title}:** ${escape(signal.vintage)}. ${escape(signal.evidence_ceiling)} Source: ${escape(signal.publisher)}. Licence: ${escape(signal.licence.status)}. [Original response](${sourceHref(signal.source_file)}), ${escape(signal.source_sha256)}.`, '');
  }
  lines.push('The proposed weather criteria remain unadopted and history comparability unassessed. No rank is computed in this reader. [Method proposal](weather-criteria.v1.md).', '');
  for(const country of visible){
    if(country.binding_category!=='unknown')throw new Error('reader cannot invent or adopt a binding diagnosis');
    lines.push(`## ${country.rank}. ${escape(country.name)} (${escape(country.iso3)})`,'',
      '**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.', '',
      '| Indicator | Value | Reference year | Unit | Retained source and native selector |',
      '| --- | ---: | ---: | --- | --- |');
    for(const signal of signals){
      const row=signal.observations.find(observation=>observation.country===country.iso3);
      const value=row?Number(row.value.toFixed(3)).toString():'No retained observation';
      const source=row?`[Source](${sourceHref(signal.source_file)}); ${escape(row.source_selector)}; native flag ${row.observation_status?escape(row.observation_status):'empty'}`:
        `No non-null ${escape(signal.native_series)} observation for ${escape(country.iso3)} in this common year; no substitute used.`;
      lines.push(`| ${labels[signal.id].title} | ${value} | ${signal.reference_year} | ${labels[signal.id].unit} | ${source} |`);
    }
    lines.push('', 'Evidence needed to assess the five conditions:', '');
    for(const category of categories){
      const gap=country.missing_binding_series?.[category];
      if(typeof gap!=='string'||!gap.trim())throw new Error(`missing ${category} evidence specification`);
      lines.push(`- **${category[0].toUpperCase()+category.slice(1)}:** ${escape(gap)}`,'');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.slice(2).some(arg=>!['--write','--check'].includes(arg)))throw new Error('use --write or --check');
    const base=new URL('../',import.meta.url);
    const countrySet=await readFile(new URL('country-set.v1.json',base));
    const retained=await readFile(new URL('measurements.v1.json',base));
    const reproduced=`${JSON.stringify(buildMeasurements(countrySet,await loadSources()),null,2)}\n`;
    if(retained.toString('utf8')!==reproduced)throw new Error('measurement source replay failed before reader generation');
    const text=renderCountryView(JSON.parse(retained),{measurementSha256:sha256(retained)});
    const target=new URL('measurement-view.md',base);
    if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==text)throw new Error('country reader reproduction mismatch');}
    else if(process.argv.includes('--write'))await writeFile(target,text,{flag:'wx'});
    else throw new Error('use --write for a new reader or --check');
    console.log('country reader reproduced from verified measurement sources');
  }catch(error){throw new Error('country reader failed; missing evidence cannot become a panel entry',{cause:error});}
}
