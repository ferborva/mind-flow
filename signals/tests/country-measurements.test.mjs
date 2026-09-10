import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCsv, extractWdi, extractIlo, selectCommonYear, verifyReceipt } from "../countries/tools/measure.mjs";
import { buildMeasurements, loadSources } from "../countries/tools/build-measurements.mjs";

test("native CSV preserves quoted comma, newline and escaped quote; rejects malformed rows", () => {
  assert.deepEqual(parseCsv('\uFEFF"a","b"\n"1","2"\n'),[{a:"1",b:"2"}]);
  assert.deepEqual(parseCsv('a,b\n"one, two","line\n""quoted"""\n'), [{a:"one, two",b:'line\n"quoted"'}]);
  for (const bad of ['a,b\n1\n', 'a,b\n"unterminated,2', 'a,a\n1,2\n']) assert.throws(() => parseCsv(bad));
});
const row = (code, year, value) => ({indicator:{id:"CPI"}, countryiso3code:code,date:String(year),value,obs_status:""});
const pack = rows => [{page:1,pages:1,total:rows.length,sourceid:"2",lastupdated:"2026-07-13"},rows];
test("WDI fails closed on pagination, vintage, wrong series, duplicates and numeric strings", () => {
  assert.equal(extractWdi(pack([row("USA",2024,0)]), "CPI", "2026-07-13")[0].value,0);
  for (const bad of [ [{...pack([])[0],pages:2},[]],pack([row("USA",2024,"2")]),pack([row("USA",2024,2),row("USA",2024,3)])]) assert.throws(()=>extractWdi(bad,"CPI","2026-07-13"));
  assert.throws(()=>extractWdi(pack([row("USA",2024,2)]),"OTHER","2026-07-13"));
  assert.throws(()=>extractWdi(pack([]),"CPI","2025-01-01"));
});
test("ILO selectors require exact model source and retain native flag without interpreting its meaning", () => {
  const r={ref_area:"USA",source:"XA:2198",indicator:"LAP_2GDP_NOC_RT",time:"2024",obs_value:"60.2",obs_status:"I"};
  const dictionary=[{source:"XA:2198",ref_area:"USA","source.label":"ILO - Modelled Estimates"}];
  const out=extractIlo([r],dictionary); assert.equal(out[0].value,60.2); assert.equal(out[0].observation_status,"I"); assert.equal(out[0].modelled,true);
  assert.throws(()=>extractIlo([r,r],dictionary)); assert.throws(()=>extractIlo([{...r,obs_value:""}],dictionary));
  assert.throws(()=>extractIlo([{...r,source:"OTHER"}],dictionary));
  assert.throws(()=>extractIlo([r],[{...dictionary[0],ref_area:"AFG"}]));
});
test("breadth uses a single completed observation year, exact country keys, and never fills gaps", () => {
  const countries=Array.from({length:50},(_,i)=>`C${i}`);
  const rows=countries.slice(0,40).map(country=>({country,year:2024,value:0}));
  rows.push(...countries.slice(0,39).map(country=>({country,year:2025,value:1})),{country:"AGG",year:2025,value:1},{country:"C49",year:2026,value:9});
  const out=selectCommonYear(rows,countries,2025);
  assert.equal(out.year,2024); assert.equal(out.coverage,40); assert.equal(out.missing.length,10);
  assert.equal(out.observations[0].value,0);
  assert.equal(selectCommonYear(rows.slice(1,40),countries,2025).eligible,false);
  assert.throws(()=>selectCommonYear(rows,[...countries.slice(1),"C1"],2025));
  assert.throws(()=>selectCommonYear([...rows,rows[0]],countries,2025),/duplicate/);
});
test("retained bytes and headers are checked independently", () => {
  assert.throws(()=>verifyReceipt(Buffer.from("changed"),Buffer.from("headers"),{body_sha256:"sha256:bad",headers_sha256:"sha256:bad",body_byte_length:7}));
});

test("full retained vintages reproduce three non-substituted common-year series and fifty exact gaps", async () => {
  const retained=JSON.parse(await readFile(new URL("../countries/measurements.v1.json",import.meta.url)));
  const frame=Buffer.from(JSON.stringify({countries:retained.countries.map(({iso3,name,rank})=>({iso3,name,rank}))}));
  const result=buildMeasurements(frame,await loadSources());
  assert.deepEqual(result.signals,retained.signals); assert.deepEqual(result.countries,retained.countries);
  assert.deepEqual(result.signals.map(s=>[s.id,s.reference_year,s.coverage]),[["cpi-annual-change",2025,47],["electricity-access",2024,49],["labour-income-share",2025,50]]);
  assert.deepEqual(result.signals[0].missing_countries,["USA","TWN","ARG"]);
  assert.equal(result.countries.find(c=>c.iso3==="TWN").measured_signals.length,1);
  for(const c of result.countries){assert.equal(c.binding_category,"unknown");assert.equal(Object.keys(c.missing_binding_series).length,5);for(const gap of Object.values(c.missing_binding_series))assert.ok(gap.startsWith(c.iso3+":"));}
  for(const o of result.signals[2].observations){assert.equal(o.modelled,true);assert.equal(typeof o.observation_status,"string");}
  assert.ok(result.signals[2].future_rows_retained_but_not_selected>0);
});

test("CPI annual changes allow deflation and values over100; never treat change as a bounded share", async () => {
  const rows=extractWdi(pack([row("USA",2024,-2),row("ARG",2024,200)]),"CPI","2026-07-13");
  assert.deepEqual(rows.map(r=>r.value),[-2,200]);
  const retained=JSON.parse(await readFile(new URL("../countries/measurements.v1.json",import.meta.url)));
  assert.equal(retained.signals[0].domain.maximum,null);assert.equal(retained.signals[0].unit,"annual-percent-change");
});

test("metadata vintage or full record-count mutation cannot silently refresh a retained measure", async () => {
  const retained=JSON.parse(await readFile(new URL("../countries/measurements.v1.json",import.meta.url)));
  const frame=Buffer.from(JSON.stringify({countries:retained.countries}));
  const sources=await loadSources();
  sources["ilo-toc"].body=Buffer.from(sources["ilo-toc"].body.toString().replace('"20/03/2026 12:54:04"','"21/03/2026 12:54:04"'));
  assert.throws(()=>buildMeasurements(frame,sources),/edition or update changed/);
});
