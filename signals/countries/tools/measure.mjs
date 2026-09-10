import { createHash } from "node:crypto";

export const sha256 = bytes => "sha256:" + createHash("sha256").update(bytes).digest("hex");
export function verifyReceipt(body, headers, receipt) {
  if (sha256(body)!==receipt.body_sha256 || body.length!==receipt.body_byte_length || sha256(headers)!==receipt.headers_sha256) throw new Error("retained source byte or header parity failed");
}
export function parseCsv(text) {
  text=text.replace(/^\uFEFF/,""); // decoding only; the retained UTF-8 BOM bytes remain untouched
  const rows=[]; let row=[],field="",quoted=false,closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') { if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;} }else field+=c; }
    else if(c===','||c==='\n'||c==='\r') {
      row.push(field); field=""; closed=false;
      if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++; rows.push(row);row=[];}
    } else if(c==='"'&&!field&&!closed) quoted=true;
    else { if(closed||c==='"') throw new Error("malformed CSV quoting"); field+=c; }
  }
  if(quoted)throw new Error("unterminated CSV quote");
  if(field||row.length||closed){row.push(field);rows.push(row);}
  const header=rows.shift();
  if(!header?.length||new Set(header).size!==header.length)throw new Error("missing or duplicate CSV headers");
  return rows.map((r,i)=>{if(r.length!==header.length)throw new Error(`CSV row ${i+2} width mismatch`);return Object.fromEntries(header.map((h,j)=>[h,r[j]]));});
}
function uniqueRows(rows) {
  const keys=new Set();
  for(const r of rows){const key=`${r.country}/${r.year}`;if(keys.has(key))throw new Error(`duplicate native key ${key}`);keys.add(key);}
  return rows;
}
export function extractWdi(payload, indicator, vintage) {
  const [meta,rows]=payload;
  if(meta?.page!==1||meta.pages!==1||meta.total!==rows?.length||meta.sourceid!=="2"||meta.lastupdated!==vintage)throw new Error("WDI pagination, source or vintage mismatch");
  return uniqueRows(rows.map((r,index)=>{
    if(r.indicator?.id!==indicator||!/^\d{4}$/.test(r.date)||typeof r.countryiso3code!=="string")throw new Error("wrong WDI selector");
    if(r.value!==null&&(typeof r.value!=="number"||!Number.isFinite(r.value)))throw new Error("invalid WDI value");
    return {country:r.countryiso3code,year:Number(r.date),value:r.value,observation_status:r.obs_status,source_selector:`$[1][${index}]`,modelled: null};
  }).filter(r=>r.country));
}
export function extractIlo(rows,dictionary) {
  const sources=new Set(dictionary.filter(r=>r["source.label"]==="ILO - Modelled Estimates").map(r=>`${r.ref_area}/${r.source}`));
  return uniqueRows(rows.map((r,index)=>{
    if(!sources.has(`${r.ref_area}/${r.source}`)||r.indicator!=="LAP_2GDP_NOC_RT"||!/^\d{4}$/.test(r.time)||!/^\d+(\.\d+)?$/.test(r.obs_value))throw new Error("wrong ILO country-specific source, series or numeric value");
    const value=Number(r.obs_value); if(value<0||value>100)throw new Error("ILO percentage outside domain");
    return {country:r.ref_area,year:Number(r.time),value,observation_status:r.obs_status,modelled:true,native_source:r.source,source_selector:`CSV record ${index+2}; ref_area=${r.ref_area}; source=${r.source}; indicator=LAP_2GDP_NOC_RT; time=${r.time}`};
  }));
}
export function selectCommonYear(rows,countries,lastCompletedYear) {
  uniqueRows(rows);
  if(countries.length!==50||new Set(countries).size!==50)throw new Error("country set must contain exactly 50 unique native keys");
  const wanted=new Set(countries);
  const years=[...new Set(rows.filter(r=>r.year<=lastCompletedYear).map(r=>r.year))].sort((a,b)=>b-a);
  const candidates=years.map(year=>{const observations=rows.filter(r=>r.year===year&&r.value!==null&&wanted.has(r.country));return {year,observations,coverage:observations.length};});
  const selected=candidates.find(r=>r.coverage>=40)??candidates[0]??{year:null,observations:[],coverage:0};
  const covered=new Set(selected.observations.map(r=>r.country));
  return {...selected,eligible:selected.coverage>=40,missing:countries.filter(c=>!covered.has(c)),coverage_by_year:candidates.map(({year,coverage})=>({year,coverage}))};
}
