import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const text = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
test('station has a semantic, labelled real-data journey with an explicit demo boundary', () => {
  const html = text('index.html');
  for (const id of ['country-select', 'compare-select', 'year-control', 'family-select', 'evidence', 'forecast-ledger', 'if-evolution', 'preparation']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Research station/);
  assert.match(html, /Not a crisis-warning service/);
  assert.match(html, /Synthetic method demo/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<main/);
});
test('station supports reduced motion and keeps real-data rendering independent of synthetic fixture', () => {
  assert.match(text('styles.css'), /prefers-reduced-motion/);
  assert.match(text('styles.css'), /focus-visible/);
  assert.doesNotMatch(text('app.mjs'), /observatory\/data|0\.62|62%/);
  assert.match(text('app.mjs'), /textContent/);
  assert.match(text('app.mjs'), /describeChange/);
});
test('native scope and pending work remain visible rather than compressed away', () => {
  const app = text('app.mjs');
  assert.match(app, /chart-label'\).textContent = f.fullLabel/);
  assert.match(text('brief.mjs'), /nativeSeries:family.fullLabel/);
  assert.match(app, /study.blockers.map/);
  assert.match(app, /Download requested/);
  assert.doesNotMatch(app, /Saved locally/);
});
test('public copy does not turn indicator values or research forecasts into personal evidence or promises', () => {
  assert.match(text('app.mjs'), /retained indicator values/);
  assert.doesNotMatch(text('index.html'), /forecast is a promise|actual appended<br>/);
  assert.match(text('app.mjs'), /r.existing_appended_kernel_events/);
});
test('the linked static comparison is not presented as a test of the whole station', () => {
  const app = text('app.mjs');
  assert.match(app, /presentation-v2\/station.html/);
  assert.match(app, /presentation-v2\/conventional.html/);
  assert.match(app, /static reasoning slice/);
  assert.match(app, /not a test of the full interactive station/);
  assert.match(app, /decision-experience\/README.md/);
});
test('the visible handoff and downloaded brief share the source-bound producer', () => {
  assert.match(text('app.mjs'), /from '\.\/brief\.mjs'/);
  assert.match(text('app.mjs'), /const brief = researchBrief\(data, state\)/);
  assert.match(text('app.mjs'), /const inquiry = researchBrief\(data, state\)\.inquiry/);
  assert.match(text('index.html'), /id="brief-preview"/);
  assert.match(text('index.html'), /id="brief-handoff"/);
  assert.match(text('app.mjs'), /data-handoff-question/);
});
