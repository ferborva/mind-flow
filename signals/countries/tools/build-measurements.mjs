import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, extractWdi, extractIlo, selectCommonYear, verifyReceipt, sha256 } from "./measure.mjs";

const root=fileURLToPath(new URL("../../../",import.meta.url));
export const sourceDirectory="signals/countries/sources/international-2026-09-10";
const pins={
  "wdi-cpi":"28813d8e4499cf3941cb24f4e1a662590b0f3c5d9bbb1ea0f3ed22041161ea5a",
  "wdi-electricity":"9b78c10ee45b8e8da6624f8d47e47d43045262aaf2c759d3c9e8655da635374f",
  "wdi-cpi-metadata":"7daadb93caea636586d673be866d4468bcbbb90d6618d5fedd4166b72ad74d70",
  "wdi-electricity-metadata":"da726072611229156212b3b2e78e8db6fe28059c9e21037121dc09b0029caa8d",
  "ilo-labour-share":"0a9f3339226b6fa2073ad50552ed57613d630795a5b593d6d60f728770fbf48b",
  "ilo-toc":"41e687edb087a14f4701a6508c3280ec21d745d78f47441b9e735a663ede1db7",
  "ilo-source-dictionary":"e4f44e35508bbe2690074f45def1d0a5de70afc7a20d20d696c4d087c7095087",
  "ilo-licence":"44a9fd6d5eb8fa86a810b88f2c88828ed3962ca09b84d719b821feeb158e859d",
  "electricity-definition-limit":"eee603893f8eea8d355dd946ec024c17e021094ee0ca729186bea33ab0508ab1"
};
export async function loadSources() {
  const sources={};
  for(const [id,pin]of Object.entries(pins)){
    const path=resolve(root,sourceDirectory,id);
    const body=await readFile(path+".body"),headers=await readFile(path+".headers.txt"),receipt=JSON.parse(await readFile(path+".receipt.json"));
    verifyReceipt(body,headers,receipt);
    if(sha256(body)!==`sha256:${pin}`)throw new Error(`pinned source changed: ${id}`);
    sources[id]={body,receipt};
  }
  return sources;
}
export function buildMeasurements(countrySetBytes,sources) {
  const frame=JSON.parse(countrySetBytes),countries=frame.countries.map(c=>c.iso3);
  if(countries.length!==50||new Set(countries).size!==50)throw new Error("exact proposed top50 required");
  const json=id=>JSON.parse(sources[id].body);
  const csv=id=>parseCsv(sources[id].body.toString("utf8"));
  const toc=csv("ilo-toc").filter(r=>r.id==="LAP_2GDP_NOC_RT_A");
  if(toc.length!==1||toc[0]["last.update"]!=="20/03/2026 12:54:04"||!toc[0]["indicator.label"].includes("Nov. 2025"))throw new Error("ILO edition or update changed");
  const iloRows=csv("ilo-labour-share");
  if(iloRows.length!==Number(toc[0]["n.records.all"]))throw new Error("ILO full native row count mismatch");
  const definitions=[
    {id:"cpi-annual-change",source:"wdi-cpi",metadata:"wdi-cpi-metadata",native_series:"FP.CPI.TOTL.ZG",publisher:"World Bank WDI; underlying IMF International Financial Statistics",vintage:"WDI lastupdated 2026-07-13",unit:"annual-percent-change",domain:{minimum:-100,minimum_exclusive:true,maximum:null},proxy_for:["price"],evidence_ceiling:"Headline typical-consumer basket price change, not an essentials basket price level, household affordability, local prices or AI effects.",model_status:"Native WDI observation status retained; empty status does not certify actual-only data.",rows:extractWdi(json("wdi-cpi"),"FP.CPI.TOTL.ZG","2026-07-13")},
    {id:"electricity-access",source:"wdi-electricity",metadata:"wdi-electricity-metadata",native_series:"EG.ELC.ACCS.ZS",publisher:"World Bank WDI; underlying SDG 7.1.1 Electrification Dataset",vintage:"WDI lastupdated 2026-07-13",unit:"percent-of-population",domain:{minimum:0,minimum_exclusive:false,maximum:100},proxy_for:["availability"],evidence_ceiling:"Population electricity-access share, not continuous/reliable/affordable usable service, compute capacity or a diagnosed binding condition.",model_status:"Survey/census/industry/international compilation; estimation or modelling cannot be excluded from empty WDI row flags. No actual-only claim.",rows:extractWdi(json("wdi-electricity"),"EG.ELC.ACCS.ZS","2026-07-13")},
    {id:"labour-income-share",source:"ilo-labour-share",metadata:"ilo-toc",native_series:"LAP_2GDP_NOC_RT_A",publisher:"International Labour Organization, ILOSTAT",vintage:"ILO modelled estimates Nov. 2025; TOC last.update 20/03/2026 12:54:04 (publisher supplies no timezone)",unit:"percent-of-gdp",domain:{minimum:0,minimum_exclusive:false,maximum:100},proxy_for:["price"],evidence_ceiling:"Aggregate labour-income distribution context only, not earnings of a particular household, affordability, AI occupation exposure or causal AI effects.",model_status:"Publisher modelled estimates. Native flags are retained; their meaning is not verified because no observation-status legend is retained. Completed reference years remain modelled, not certified observations.",observation_status_interpretation:"native-flag-retained-meaning-not-verified",observation_status_legend:null,rows:extractIlo(iloRows,csv("ilo-source-dictionary"))}
  ];
  const signals=definitions.map(({rows,...d})=>{
    const chosen=selectCommonYear(rows,countries,2025);
    for(const r of rows){if(r.value!==null&&(r.value<d.domain.minimum||(d.domain.minimum_exclusive&&r.value===d.domain.minimum)||(d.domain.maximum!==null&&r.value>d.domain.maximum)))throw new Error(`native value outside declared domain: ${d.id}/${r.country}/${r.year}`);}
    let metadata;
    if(d.source.startsWith("wdi")){
      const vars=json(d.metadata).source[0].concept[0].variable;
      if(vars.length!==1||vars[0].id!==d.native_series)throw new Error("WDI metadata selector mismatch");
      metadata=Object.fromEntries(vars[0].metatype.map(x=>[x.id,x.value]));
      if(metadata.License_Type!=="CC BY-4.0"||metadata.Periodicity!=="Annual")throw new Error("WDI licence or cadence changed");
    }else{
      if(!sources["ilo-licence"].body.toString().includes("databases and datasets together with the accompanying referential metadata"))throw new Error("ILO data licence evidence missing");
      metadata={IndicatorName:toc[0]["indicator.label"],Periodicity:"Annual",License_Type:"CC BY-4.0",License_URL:"https://www.ilo.org/rights-and-permissions#data"};
    }
    return {...d,cadence:metadata.Periodicity,licence:{status:metadata.License_Type,url:metadata.License_URL,retained_evidence:d.source.startsWith("wdi")?d.metadata:"ilo-licence"},definition:metadata.Longdefinition??metadata.IndicatorName,source_metadata:metadata,source_file:`${sourceDirectory}/${d.source}.body`,source_sha256:sources[d.source].receipt.body_sha256,source_receipt:`${sourceDirectory}/${d.source}.receipt.json`,reference_year:chosen.year,coverage:chosen.coverage,coverage_denominator:50,breadth_eligible:chosen.eligible,missing_countries:chosen.missing,coverage_by_year:chosen.coverage_by_year,observations:chosen.observations,retained_history:rows.filter(r=>countries.includes(r.country)&&r.year<=2025),future_rows_retained_but_not_selected:rows.filter(r=>countries.includes(r.country)&&r.year>2025).length};
  });
  const countriesOut=frame.countries.map(c=>({iso3:c.iso3,name:c.name,rank:c.rank,measured_signals:signals.filter(s=>s.breadth_eligible&&s.observations.some(o=>o.country===c.iso3)).map(s=>s.id),binding_category:"unknown",essentials_scope:"typical household basket and electricity service only; no country-wide essentials claim",missing_binding_series:{
    price:`${c.iso3}: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.`,
    permission:`${c.iso3}: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.`,
    proximity:`${c.iso3}: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.`,
    availability:`${c.iso3}: hours of usable electricity, outage frequency/duration (SAIFI/SAIDI), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.`,
    capability:`${c.iso3}: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.`
  },missing_signal_observations:signals.filter(s=>!s.observations.some(o=>o.country===c.iso3)).map(s=>({series:s.native_series,year:s.reference_year,vintage:s.vintage,reason:"No retained non-null native observation at the selected common year; no substitute used."}))}));
  return {id:"country-measurements.v1",provenance:"commissioned-proposal",author:"Ren",created:"2026-09-10",country_set:{file:"signals/countries/country-set.v1.json",sha256:sha256(countrySetBytes)},selection_rule:"For each retained publisher vintage, latest completed year <=2025 with at least40 of the exact50 proposed economies. No per-country fallback, estimation by this producer, neighbour or sovereignty substitution.",binding_assessment:"Unknown for every measured economy; each missing series is a requested measurement specification, not an assertion that a maintained series exists. No storm detected or forecast made.",signals,countries:countriesOut};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const countryPath=process.argv.find(x=>x.startsWith("--country-set="))?.slice(14)??resolve(root,"signals/countries/country-set.v1.json");
    const output=resolve(root,"signals/countries/measurements.v1.json");
    const bytes=JSON.stringify(buildMeasurements(await readFile(countryPath),await loadSources()),null,2)+"\n";
    if(process.argv.includes("--check")){if(await readFile(output,"utf8")!==bytes)throw new Error("country measurement reproduction mismatch");}
    else await writeFile(output,bytes);
    console.log("country measurements reproduced");
  }catch(error){throw new Error("country measurement build failed",{cause:error});}
}
