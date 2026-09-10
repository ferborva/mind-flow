import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessProximityCoverage, verifyProximitySources } from "../countries/proximity-candidate.mjs";
test("proximity breadth never combines different years or replaces official observations",()=>{
  const countries=Array.from({length:50},(_,i)=>`C${i}`);
  const rows=countries.map((country,i)=>({country,year:i<25?2019:2020,value:50,source_cell:`C${i+2}`}));
  const result=assessProximityCoverage(rows,countries);
  assert.equal(result.maximum_common_year_coverage,25);assert.equal(result.panel_eligible,false);
  assert.throws(()=>assessProximityCoverage([...rows,rows[0]],countries),/duplicate/);
  assert.throws(()=>assessProximityCoverage([{...rows[0],value:101}],countries),/range/);
});
test("retained official workbook has five top50 economies but at most one in any common year",()=>{
  verifyProximitySources();
  const result=JSON.parse(readFileSync(new URL("../countries/proximity-candidate.v1.json",import.meta.url)));
  const frame=JSON.parse(readFileSync(new URL("../countries/country-set.v1.json",import.meta.url)));
  assert.deepEqual(assessProximityCoverage(result.observations,frame.countries.map(c=>c.iso3)),result.coverage);
  assert.equal(result.native_country_count,29);assert.equal(result.native_observation_count,31);
  assert.equal(result.coverage.any_year_country_count,5);assert.equal(result.coverage.maximum_common_year_coverage,1);
  assert.equal(result.coverage.panel_eligible,false);assert.equal(result.coverage.missing_all_years.length,45);
  assert.deepEqual(result.coverage.selected_observations.map(({country,year,value,source_cell})=>[country,year,value,source_cell]),[["ZAF",2020,57.5,"D20"],["PER",2016,37.2,"D26"],["ARE",2019,95.1,"D30"],["ARE",2021,99.5,"D31"],["SAU",2022,91.77,"D32"],["BGD",2015,86.7,"D33"]]);
});
