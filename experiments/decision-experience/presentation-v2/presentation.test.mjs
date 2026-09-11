import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPresentation, renderPresentation, verifyPresentation, SOURCE_REF } from './presentation.mts';

// Resolve the inherited package directly, without creating another data source.
const source = () => readFileSync(new URL('../task-pack.json', import.meta.url));
const build = () => buildPresentation(source());

test('new edition preserves 14 facts and three tasks with feedback absent from both presentations', () => {
  const p = build();
  assert.equal(p.manifest.edition, 'decision-experience.static-reasoning-slice/2.0.0');
  assert.equal(p.manifest.material_ids.length, 14);
  assert.equal(new Set(p.manifest.material_ids).size, 14);
  assert.equal(p.manifest.task_ids.length, 3);
  for (const html of [p.conventional, p.station]) {
    assert.doesNotMatch(html, /Proposed feedback:|supported-context|unsupported-inference|defensible-with-conditions/);
    assert.equal((html.match(/data-task-id=/g) || []).length, 3);
    assert.equal((html.match(/data-material-id="/g) || []).length, 14);
  }
  assert.match(p.reviewer, /Correct for this retained indicator/);
  assert.match(p.reviewer, /Not a validated coding rubric/);
});

test('comparison layouts are materially different but use the same declared grouping and order', () => {
  const p = build();
  assert.match(p.conventional, /<table/);
  assert.doesNotMatch(p.station, /<table/);
  assert.match(p.station, /reading-workspace/);
  const ids = html => [...html.matchAll(/data-material-id="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(ids(p.station), ids(p.conventional));
  assert.deepEqual(ids(p.station), p.manifest.material_ids);
  const sections = html => [...html.matchAll(/data-section-id="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(sections(p.station), sections(p.conventional));
});

test('denominator, vintage, assessment and authority are always visible near the readings', () => {
  const p = build();
  for (const html of [p.conventional, p.station]) {
    const reading = html.slice(html.indexOf('data-section-id="reading"'), html.indexOf('data-section-id="limits"'));
    for (const id of ['before', 'after', 'denominator', 'vintage', 'storm', 'authority']) assert.match(reading, new RegExp(`data-material-id="${id}"`));
    assert.doesNotMatch(reading, /<details|hidden|display:\s*none|aria-hidden/);
    assert.match(reading, /cannot-say/);
  }
});

test('all source values, labels, question text and options remain exact', () => {
  const p = build(), original = JSON.parse(source());
  for (const kind of ['conventional', 'station']) assert.equal(verifyPresentation(p[kind], p.pack, kind), true);
  assert.deepEqual(p.pack.materials, original.materials);
  assert.deepEqual(p.pack.tasks.map(t => ({ ...t, options: t.options.map(({ label, id }) => ({ label, id })) })), original.tasks.map(t => ({ ...t, options: t.options.map(({ label, id }) => ({ label, id })) })));
});

test('materials are a static slice, not an implemented study or the full station treatment', () => {
  const p = build();
  assert.equal(p.manifest.assignment_implemented, false);
  assert.equal(p.manifest.recruitment_allowed, false);
  assert.equal(p.manifest.human_testing_completed, false);
  assert.equal(p.manifest.participant_data_collection, 'disabled');
  assert.equal(p.manifest.visible_parity_verified, false);
  assert.equal(p.manifest.actual_station_equivalence_established, false);
  assert.equal(p.manifest.presentation_layout_count, 2);
  assert.equal(p.manifest.experimental_arms_delivered, 0);
  assert.match(p.manifest.estimand_boundary, /static.*single-country/i);
  assert.ok(p.manifest.omitted_capabilities.includes('country-lens-year-interaction'));
});

test('no scripts, forms, response controls, tracking or hidden facts', () => {
  const p = build();
  for (const html of [p.conventional, p.station, p.reviewer]) {
    assert.doesNotMatch(html, /<script|<form|<input|<button|<select|fetch\(|localStorage|analytics|display:\s*none|aria-hidden="true"/i);
    assert.match(html, /No responses are collected/);
  }
});

test('reviewer answer sheet is separate and not linked from comparison materials', () => {
  const p = build();
  assert.match(p.reviewer, /REVIEWER ANSWER SHEET/);
  for (const html of [p.conventional, p.station]) assert.doesNotMatch(html, /href="reviewer/);
  assert.match(p.station, /Return to the research station/);
  assert.match(p.station, /outside the proposed comparison/);
});

test('coherently changed source bytes require a new explicit source binding', () => {
  const original = JSON.parse(source());
  original.materials.find(m => m.id === 'after').value = '60%';
  assert.throws(() => buildPresentation(Buffer.from(JSON.stringify(original))), /Source package mismatch/);
  assert.match(SOURCE_REF.sha256, /^sha256:[a-f0-9]{64}$/);
});

for (const [name, transform] of [
  ['number substitution', html => html.replace('59.467', '60.000')],
  ['hidden authority', html => html.replace('data-material-id="authority"', 'hidden data-material-id="authority"')],
  ['omitted material', html => html.replace('data-material-id="denominator"', 'data-omitted="denominator"')],
  ['extra recommendation', html => html.replace('</main>', '<p>Leave your job now.</p></main>')],
  ['hidden feedback', html => html.replace('</main>', '<p hidden>Proposed feedback: correct.</p></main>')],
]) test(`exact presentation verification rejects ${name}`, () => {
  const p = build();
  assert.throws(() => verifyPresentation(transform(p.station), p.pack, 'station'), /Presentation differs/);
});

test('unsafe labels are escaped by rendering rather than interpreted as markup', () => {
  const p = build(); p.pack.materials[0].value = '<script>alert(1)</script>';
  const html = renderPresentation(p.pack, 'station');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('coherently changed pack and matching HTML cannot pass source-bound verification', () => {
  const p = build();
  p.pack.materials.find(m => m.id === 'after').value = '60%';
  const changed = renderPresentation(p.pack, 'station');
  assert.throws(() => verifyPresentation(changed, p.pack, 'station'), /Source package mismatch/);
});

test('wrong layout fails rather than becoming another experimental arm', () => {
  assert.throws(() => renderPresentation(build().pack, 'live'), /Unsupported layout/);
});

test('all four generated outputs reproduce exactly', () => {
  const p = build();
  for (const [name, expected] of [['conventional.html', p.conventional], ['station.html', p.station], ['reviewer.html', p.reviewer], ['manifest.json', JSON.stringify(p.manifest, null, 2) + '\n']]) {
    assert.equal(readFileSync(new URL(name, import.meta.url), 'utf8'), expected);
  }
});
