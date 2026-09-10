import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { renderCountryView } from './render-country-view.mjs';
import { buildMeasurements, loadSources } from './build-measurements.mjs';
import { loadStormReview } from './storm-criterion.mts';
const bytes=readFileSync(new URL('../measurements.v1.json',import.meta.url));
const data=()=>JSON.parse(bytes);
const options={measurementSha256:`sha256:${createHash('sha256').update(bytes).digest('hex')}`};
test('fifty measured economies show three common-year series or exact missing entries and five gaps',()=>{
  const text=renderCountryView(data(),options);
  assert.equal((text.match(/^## \d+\. /gm)||[]).length,50);
  assert.equal((text.match(/Binding category: unknown/g)||[]).length,50);
  assert.equal((text.match(/^- \*\*(?:Price|Permission|Proximity|Availability|Capability):\*\*/gm)||[]).length,250);
  assert.match(text,/United States/);
  assert.match(text,/Hong Kong/);
  assert.match(text,/Taiwan/);
  assert.match(text,/No retained observation/);
  assert.match(text,/CSV record/);
  assert.match(text,/2024/);
  assert.match(text,/2025/);
  assert.doesNotMatch(text,/storm detected|binding today|traffic.light|background:|<script/i);
});
test('stale coverage labels cannot render a series with fewer than forty measured economies',()=>{
  const changed=data();
  changed.signals[0].observations=changed.signals[0].observations.slice(0,39);
  assert.throws(()=>renderCountryView(changed,options),/coverage/);
});
test('a country with no measured retained observation is excluded despite stale membership labels',()=>{
  const changed=data();
  for(const signal of changed.signals)signal.observations=signal.observations.filter(o=>o.country!=='USA');
  const text=renderCountryView(changed,options);
  assert.equal((text.match(/^## \d+\. /gm)||[]).length,49);
  assert.doesNotMatch(text,/^## \d+\. United States/m);
});
test('publisher labels and selectors cannot inject Markdown or HTML; source paths stay in source directory',()=>{
  const changed=data();
  changed.countries[0].name='<script>alert(1)</script> [x](evil) |\n## fake';
  changed.signals[0].observations[0].source_selector='[click](javascript:x)<img>\n## fake';
  const text=renderCountryView(changed,options);
  assert.doesNotMatch(text,/<script|<img|^## fake|\[click\]\(javascript/m);
  assert.match(text,/&lt;script&gt;/);
  changed.signals[0].source_file='signals/countries/sources/../../evil.md';
  assert.throws(()=>renderCountryView(changed,options),/source path/);
});
test('generated Markdown reproduces exactly from the measurement snapshot',()=>{
  assert.equal(readFileSync(new URL('../measurement-view.md',import.meta.url),'utf8'),renderCountryView(data(),{...options,stormReview:loadStormReview()}));
});
test('headline counts the intersection, not missing cells or stale measured_signals labels',()=>{
  const original=data();
  assert.match(renderCountryView(original,options),/50 economies, 47 with all three series, 146 retained signal observations/);
  for(const country of original.countries)country.measured_signals=[];
  original.signals[0].observations=original.signals[0].observations.filter(row=>row.country!=='AUS');
  assert.match(renderCountryView(original,options),/50 economies, 46 with all three series, 145 retained signal observations/);
});
test('reader keeps different periods and uninterpreted native ILO flags explicit',()=>{
  const text=renderCountryView(data(),options);
  assert.match(text,/not a single-period snapshot/);
  assert.match(text,/ILO native flags are retained; their meaning is not verified/);
  assert.doesNotMatch(text,/including imputation|imputation flags/);
});
test('reader bytes replay from native retained sources, not merely the derived snapshot',async()=>{
  const frame=readFileSync(new URL('../country-set.v1.json',import.meta.url));
  const replay=Buffer.from(`${JSON.stringify(buildMeasurements(frame,await loadSources()),null,2)}\n`);
  assert.deepEqual(bytes,replay);
  assert.equal(readFileSync(new URL('../measurement-view.md',import.meta.url),'utf8'),
    renderCountryView(JSON.parse(replay),{measurementSha256:`sha256:${createHash('sha256').update(replay).digest('hex')}`,stormReview:loadStormReview()}));
});
