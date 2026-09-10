import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import { renderPrimaryCare, escapeHtml } from '../tools/render-primary-care.mjs';
import * as renderer from '../tools/render-primary-care.mjs';
const root = resolve(import.meta.dirname, '../..');

test('prescription and after-hours each render five categories, exact gaps and interval assessments', () => {
  const html = renderPrimaryCare(root);
  for (const item of ['atorvastatin-prescription', 'after-hours-gp']) {
    const table = html.match(new RegExp(`<table id="${item}-condition-table"[\\s\\S]*?</table>`))?.[0];
    assert.ok(table, `Missing public item ${item}`);
    for (const category of ['price', 'permission', 'proximity', 'availability', 'capability']) assert.match(table, new RegExp(`data-condition-category="${category}"`));
    assert.equal((table.match(/<th scope="row">/g) ?? []).length, 5);
    assert.equal((table.match(/Missing series:/g) ?? []).length, 5);
  }
  assert.match(html, /within the approximate 95% interval/);
  assert.match(html, /2013-14/);
  assert.match(html, /2015-16/);
  assert.match(html, /Indigenous Community Strata/);
  assert.match(html, /non-private dwellings/);
  assert.match(html, /dispensing permission and subsidy eligibility are separate/i);
  assert.match(html, /href="https:\/\/www.pbs.gov.au\/info\/healthpro\/explanatory-notes\/section1\/Section_1_5_Explanatory_Notes"/);
  assert.doesNotMatch(html, /other three basket items still lack|significance and agency effects are not established/);
});

test('small numerators are flagged before the observation, including zero and non-proximity cells', () => {
  assert.match(renderPrimaryCare(root), /Very remote: Small base \(9 FTE; below 10\): 131\.7/);
  assert.equal(typeof renderer.formatObservation, 'function');
  for (const numerator of [0, 1, 9, 9.9]) {
    assert.match(renderer.formatObservation({ value: 6.2, unit: 'percent', numerator, numerator_unit: 'respondents' }), /^Small base .*: 6\.2%/);
  }
  assert.doesNotMatch(renderer.formatObservation({ value: 6.2, unit: 'percent', numerator: 10 }), /Small base/);
  assert.doesNotMatch(renderer.formatObservation({ value: 6.2, unit: 'percent' }), /Small base/);
  assert.throws(() => renderer.formatObservation({ value: 6.2, unit: 'percent', numerator: -1 }), /numerator/);
});

test('actual generated Australia page exposes five GP conditions, source periods, owners and unknown binding', () => {
  const out = resolve(mkdtempSync(resolve(tmpdir(), 'gp-public-review-')), 'index.html');
  execFileSync(process.execPath, [resolve(root, 'dashboard/tools/build-australia-pilot.mjs'), resolve(root, 'pilots/australia/data/nero-clerical-2026-08.r2.json'), out]);
  const html = readFileSync(out, 'utf8');
  const section = html.match(/<section[^>]+id="primary-care"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'GP evidence must be visible HTML, not hidden JSON or README only');
  for (const category of ['price', 'permission', 'proximity', 'availability', 'capability']) assert.match(section, new RegExp(`data-condition-category="${category}"`));
  for (const phrase of ['7.2%', '45.9%', '14%', '12 months', 'Binding category is unknown today', 'ASGS', 'ERP', '2018', '18 years', 'rule parameter', 'retrieval', 'Owner role', 'not verified', '2024-25']) assert.ok(section.includes(phrase), `Missing ${phrase}`);
  assert.match(section, /href="https:\/\/assets\.pc\.gov\.au/);
  assert.match(section, /href="https:\/\/www9\.health\.gov\.au/);
  assert.match(section, /href="https:\/\/www\.abs\.gov\.au/);
  assert.doesNotMatch(section, /__PRIMARY_CARE/);
  assert.match(section, /href="\.\.\/data\/positive-signals-current\.json"/);
  assert.match(section, /broad historical kernel scope/);
});

test('public GP output rejects changed data and missing or mismatched category bindings', () => {
  const isolated = mkdtempSync(resolve(tmpdir(), 'gp-display-inputs-'));
  const data = 'pilots/australia/data/primary-care-2026-09-10.json';
  const basket = 'pilots/australia/basket/primary-care.r3.json';
  for (const path of [data, basket]) { mkdirSync(dirname(resolve(isolated, path)), { recursive: true }); cpSync(resolve(root, path), resolve(isolated, path)); }
  const original = JSON.parse(readFileSync(resolve(isolated, data)));
  const forged = structuredClone(original); forged.series[0].points[0].value = 0;
  writeFileSync(resolve(isolated, data), JSON.stringify(forged, null, 2) + '\n');
  assert.throws(() => renderPrimaryCare(isolated), /does not reproduce/);
  cpSync(resolve(root, data), resolve(isolated, data));
  const mapping = JSON.parse(readFileSync(resolve(isolated, basket)));
  mapping.items[0].conditions[0].series_id = 'gp-fte-remoteness';
  writeFileSync(resolve(isolated, basket), JSON.stringify(mapping));
  assert.throws(() => renderPrimaryCare(isolated), /basket mapping/);
  mapping.items[0].conditions[0].series_id = 'gp-gap';
  writeFileSync(resolve(isolated, basket), JSON.stringify(mapping));
  assert.throws(() => renderPrimaryCare(isolated), /basket mapping/);
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
