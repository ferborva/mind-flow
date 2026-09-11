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
  assert.match(app, /nativeSeries: f.fullLabel/);
  assert.match(app, /study.blockers.map/);
  assert.match(app, /Download requested/);
  assert.doesNotMatch(app, /Saved locally/);
});
