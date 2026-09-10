import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const hash=b=>"sha256:"+createHash("sha256").update(b).digest("hex");
const base=new URL("./",import.meta.url),dir=new URL("sources/proximity-2026-09-10/",base);
export const sourceHash="sha256:8c315ae3e0eb72ffa1710b91227d8ff48302f849b0c011e058b165773b152131";
export const readerIntegrity="sha512-dmg3LCjBPHZnQp5/F/+nnTa+miPJxUXB6vtk42YjBBKayDNagxGEeIdWApkYPOf3Z3pm3k62Knjzp7lMeTEtFQ==";
export function assessProximityCoverage(rows,countries){
  if(countries.length!==50||new Set(countries).size!==50)throw new Error("exact50 unique country keys required");
  const seen=new Set();
  for(const r of rows){const key=`${r.country}/${r.year}`;if(seen.has(key))throw new Error("duplicate native country/year");seen.add(key);if(!Number.isInteger(r.year)||typeof r.value!=="number"||!Number.isFinite(r.value)||r.value<0||r.value>100)throw new Error("invalid native year or percentage range");}
  const selected=rows.filter(r=>countries.includes(r.country));
  const coverage_by_year=[...new Set(rows.map(r=>r.year))].sort((a,b)=>a-b).map(year=>({year,coverage:selected.filter(r=>r.year===year).length}));
  const maximum_common_year_coverage=Math.max(0,...coverage_by_year.map(r=>r.coverage));
  return {maximum_common_year_coverage,coverage_denominator:50,panel_eligible:maximum_common_year_coverage>=40,coverage_by_year,any_year_country_count:new Set(selected.map(r=>r.country)).size,selected_observations:selected,missing_all_years:countries.filter(c=>!selected.some(r=>r.country===c))};
}
export function verifyProximitySources(){
  for(const [id,pin]of Object.entries({data:sourceHash,catalogue:"sha256:7e6004d4ffbbe6d23f7d45b361dcc6db4d7631c8fcd8c1d4ff43cc0c7fef9fac",metadata:"sha256:8f00a4dab5cbafc31bb16e7261a7cf51b65e0038a46698036836df82e9419d67"})){
    const bytes=readFileSync(new URL(id+".body",dir)),headers=readFileSync(new URL(id+".headers.txt",dir)),receipt=JSON.parse(readFileSync(new URL(id+".receipt.json",dir)));
    if(hash(bytes)!==pin||hash(bytes)!==receipt.body_sha256||hash(headers)!==receipt.headers_sha256||bytes.length!==receipt.body_byte_length||receipt.status!==200)throw new Error(`retained RAI source mismatch: ${id}`);
  }
}
export function extractProximity(readerRoot){
  verifyProximitySources();
  if(!readerRoot)throw new Error("native XLS reevaluation requires explicit --reader-root with pinned xlsx0.18.5; not a pristine built-in dependency");
  const lock=JSON.parse(readFileSync(resolve(readerRoot,"package-lock.json")));
  if(lock.packages?.["node_modules/xlsx"]?.integrity!==readerIntegrity)throw new Error("XLS reader package integrity differs");
  const XLSX=createRequire(resolve(readerRoot,"package.json"))("xlsx");
  if(XLSX.version!=="0.18.5")throw new Error("XLS reader version differs");
  const book=XLSX.read(readFileSync(new URL("data.body",dir)),{type:"buffer",cellFormula:true});
  const sheet=book.Sheets["RAI Data"];
  if(!sheet||sheet["!ref"]!=="A1:E34")throw new Error("native sheet/range changed");
  const expected=["Country","World Bank Region","Year","RAI Value","Source"];
  for(let c=0;c<5;c++)if(sheet[XLSX.utils.encode_cell({r:2,c})]?.v!==expected[c])throw new Error("native column selectors changed");
  const crosswalk={"South Africa":"ZAF","Peru":"PER","United Arab Emirates":"ARE","Saudi Arabia":"SAU","Bangladesh":"BGD"};
  const observations=[];
  for(let row=4;row<=34;row++){
    const values=["A","B","C","D","E"].map(col=>{const cell=sheet[col+row];if(!cell||cell.f)throw new Error("missing/formula native data cell");return cell.v;});
    const [native_country,region,year,value,source_note]=values;
    observations.push({country:crosswalk[native_country]??`native:${native_country}`,native_country,region,year,value,source_note,source_sheet:"RAI Data",source_cell:`D${row}`,selectors:{country:`A${row}`,year:`C${row}`,source_note:`E${row}`},observation_status:"not supplied by this workbook; no actual-only or modelling-status certification"});
  }
  const frameBytes=readFileSync(new URL("country-set.v1.json",base)),frame=JSON.parse(frameBytes);
  const coverage=assessProximityCoverage(observations,frame.countries.map(c=>c.iso3));
  return {id:"proximity-candidate.rai.v1",provenance:"commissioned-proposal",author:"Ren",created:"2026-09-10",status:"research-only-below-breadth-gate",publisher:"World Bank Data Catalog",native_series:"SDG9.1.1 Rural Access Index Official Data",unit:"percent-of-rural-population",definition:"Rural population living within2km of an all-season road as a percentage of all rural population.",evidence_ceiling:"Road-distance proximity proxy, not actual journey time, transport affordability, service destination access, urban access or a binding diagnosis.",publisher_vintage:{file_updated:"2024-04-08",catalogue_updated:"2024-04-09",reference_years:[2009,2022],catalogue_temporal_coverage:"2006 - 2019",discrepancy:"Catalogue temporal text is stale relative to native rows through2022; retain rather than overwrite it.",cadence:"not specified in retained catalogue temporal_resolution.periodicity (null); annual reference years do not establish annual refresh cadence"},licence:{status:"Creative Commons Attribution4.0",evidence:"sources/proximity-2026-09-10/catalogue.body",selector:"Data Access and Licensing; licence Creative Commons Attribution4.0"},source:{file:"sources/proximity-2026-09-10/data.body",original_filename:"rural-access-index-data.xls",sha256:sourceHash},country_set_sha256:hash(frameBytes),reader:{package:"xlsx",version:"0.18.5",integrity:readerIntegrity,runtime_dependency:"Explicit temporary installation; not available in pristine repository. Ordinary offline tests check retained extraction/coverage, not native XLS reevaluation.",macros_or_external_links_executed:false},native_country_count:new Set(observations.map(r=>r.native_country)).size,native_observation_count:observations.length,crosswalk_note:"Explicit exact-name mapping only for five overlapping IMF economies. Other native names preserved with native: prefix, never forced into ISO codes.",coverage,observations};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const readerRoot=process.argv.find(x=>x.startsWith("--reader-root="))?.slice(14);
  const bytes=JSON.stringify(extractProximity(readerRoot),null,2)+"\n";
  const path=new URL("proximity-candidate.v1.json",base);
  if(process.argv.includes("--check")){if(readFileSync(path,"utf8")!==bytes)throw new Error("native RAI reevaluation mismatch");}else writeFileSync(path,bytes);
  console.log("native RAI extraction reproduced; research-only coverage assessed");
}
