import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPackage, evaluateReadiness, assertMaterialParity, assertRehearsalSemantics, renderMaterial, REQUIREMENTS } from './readiness.mts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = () => JSON.parse(readFileSync(new URL('./proposal.json', import.meta.url)));

test('retained facts are projected with exact scope and source pointers', () => {
  const p = buildPackage(root, config());
  assert.equal(p.taskPack.observations[0].value, 59.467);
  assert.equal(p.taskPack.observations[1].value, 59.114);
  assert.equal(p.taskPack.native_change_pp, -0.353);
  assert.equal(p.taskPack.storm_assessment, 'cannot-say');
  assert.match(p.taskPack.observations[0].source_ref.pointer, /^\/families\/0\/observations\/\d+$/);
  assert.match(p.taskPack.materials.find(x => x.id === 'denominator').value, /15 years/);
  assert.equal(p.taskPack.source_authentication_established, false);
});

test('all missing approvals and analysis decisions fail closed', () => {
  const r = evaluateReadiness(config());
  assert.equal(r.status, 'blocked');
  assert.equal(r.recruitment_allowed, false);
  assert.equal(r.participant_data_collection, 'disabled');
  for (const id of REQUIREMENTS) assert.ok(r.blockers.some(b => b.id === id), id);
  assert.ok(r.blockers.some(b => b.id === 'external-authority-verifier'));
});

test('even complete self-asserted approval metadata never grants authority', () => {
  const c = config();
  for (const key of REQUIREMENTS) c.requirements[key] = { status: 'independently-reviewed', reference: 'claim-only', owner_role: 'claimed human' };
  c.analysis = { power_plan: 'claimed', smallest_worthwhile_effect: 0.1 };
  const r = evaluateReadiness(c);
  assert.equal(r.recruitment_allowed, false);
  assert.equal(r.prerequisites_complete, false);
  assert.equal(r.statistical_power_established, false);
  assert.ok(r.blockers.some(b => b.id === 'external-authority-verifier'));
});

for (const value of [null, {}, { schema_version: '99' }, { requirements: [] }]) {
  test(`malformed readiness input blocks: ${JSON.stringify(value)}`, () => {
    const r = evaluateReadiness(value);
    assert.equal(r.status, 'blocked');
    assert.equal(r.recruitment_allowed, false);
    assert.ok(r.blockers.some(b => b.id === 'invalid-proposal'));
  });
}

test('a changed source digest rejects the package rather than refreshing it silently', () => {
  const c = config(); c.sources.measurements.sha256 = `sha256:${'0'.repeat(64)}`;
  assert.throws(() => buildPackage(root, c), /Source digest mismatch/);
});

test('source path traversal is rejected', () => {
  const c = config(); c.sources.measurements.path = '../outside.json';
  assert.throws(() => buildPackage(root, c), /Unsafe source path/);
});

test('four proposed arms reuse precisely one fact pack and neutral script', () => {
  const p = buildPackage(root, config());
  assert.equal(p.taskPack.arms.length, 4);
  assert.equal(new Set(p.taskPack.arms.map(x => x.material_digest)).size, 1);
  assert.equal(new Set(p.taskPack.arms.filter(x => x.facilitated).map(x => x.script_digest)).size, 1);
  assert.deepEqual(p.taskPack.arms.map(x => x.allocation_weight), [1, 1, 1, 1]);
  assert.equal(p.readiness.parity.exact_material_match, true);
  assert.equal(p.readiness.parity.browser_visibility_verified, false);
});

test('HTML parity rejects missing facts, altered values, extra advice and hidden content', () => {
  const p = buildPackage(root, config());
  const original = p.rendered.conventional;
  assertMaterialParity(original, p.taskPack, 'conventional');
  for (const html of [original.replace('59.467', '60.000'), original.replace('</main>', '<p>Quit your job.</p></main>'), original.replace('data-material-id=', 'hidden data-material-id='), original.replace('<main>', '<main style="display:none">')]) {
    assert.throws(() => assertMaterialParity(html, p.taskPack, 'conventional'), /Material template differs/);
  }
});

test('rehearsals permit competing bounded choices, not agreement with the thesis', () => {
  const { taskPack: p } = buildPackage(root, config());
  const task = p.tasks.find(x => x.id === 'choose-next-step');
  assert.equal(task.options.filter(x => x.assessment === 'defensible-with-conditions').length, 2);
  assert.ok(task.options.some(x => x.assessment === 'unsupported-inference'));
  assert.match(p.outcome_boundary, /not.*thesis agreement/i);
  assert.equal(p.feedback_role, 'author-proposed-rehearsal-not-validated-rubric');
});

test('no forms, scripts, storage or participant collection are in either material', () => {
  const p = buildPackage(root, config());
  for (const html of Object.values(p.rendered)) {
    assert.doesNotMatch(html, /<script|<form|<input|localStorage|fetch\(/i);
    assert.match(html, /No responses are collected/);
    assert.match(html, /Not a crisis warning/);
  }
});

test('render escapes strings rather than interpreting source content as markup', () => {
  const p = buildPackage(root, config()).taskPack;
  p.materials[0].value = '<script>alert(1)</script>';
  const html = renderMaterial(p, 'station');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('every safety stop is represented as a pending human procedure', () => {
  const p = buildPackage(root, config());
  assert.equal(p.taskPack.harm_stops.length, 6);
  assert.ok(p.taskPack.harm_stops.every(x => x.effect === 'pause-and-independent-review'));
  assert.equal(p.readiness.human_testing_completed, false);
});

test('all retained outputs reproduce exactly, not just a renderer compared to itself', () => {
  const p = buildPackage(root, config());
  for (const [file, result] of [['task-pack.json', p.taskPack], ['readiness-summary.json', p.readiness]]) {
    assert.equal(readFileSync(new URL(file, import.meta.url), 'utf8'), `${JSON.stringify(result, null, 2)}\n`);
  }
  for (const kind of ['conventional', 'station']) {
    assert.equal(readFileSync(new URL(`${kind}.html`, import.meta.url), 'utf8'), p.rendered[kind]);
  }
});

test('unknown layout cannot quietly become an unreviewed comparison arm', () => {
  const p = buildPackage(root, config()).taskPack;
  assert.throws(() => renderMaterial(p, 'warning'), /Unsupported layout/);
});

test('research inquiry can seek missing evidence while conclusion and admission stay gated', () => {
  const p = buildPackage(root, config()).taskPack;
  const boundary = p.materials.find(x => x.id === 'if').value;
  assert.match(boundary, /Investigate.*IF.*capacity.*information/i);
  assert.match(boundary, /Inquiry can seek missing evidence/i);
  assert.match(boundary, /Establish a disruption conclusion only IF.*direct evidence/i);
  assert.match(boundary, /Evidence admission.*separate review/i);
  assert.doesNotMatch(boundary, /Investigate[^.]*IF comparable direct evidence/i);
});

for (const [name, mutate] of [
  ['string requirements', p => { p.requirements = 'invalid'; }],
  ['array analysis', p => { p.analysis = []; }],
  ['array sources', p => { p.sources = []; }],
  ['missing requirement', p => { delete p.requirements['analysis-power-plan']; }],
  ['numeric role', p => { p.requirements['analysis-power-plan'].owner_role = 4; }],
  ['unknown status', p => { p.requirements['analysis-power-plan'].status = 'approved'; }],
  ['boxed status', p => { p.requirements['analysis-power-plan'].status = new String('pending'); }],
  ['missing source', p => { delete p.sources.storm; }],
  ['bad digest', p => { p.sources.storm.sha256 = 'x'; }],
  ['missing power field', p => { delete p.analysis.power_plan; }],
  ['nonfinite effect', p => { p.analysis.smallest_worthwhile_effect = Infinity; }],
  ['array requirement record', p => { p.requirements['analysis-power-plan'] = []; }],
]) {
  test(`strict preparation shape rejects ${name}`, () => {
    const p = config(); mutate(p);
    assert.ok(evaluateReadiness(p).blockers.some(x => x.id === 'invalid-proposal'));
    assert.equal(evaluateReadiness(p).recruitment_allowed, false);
  });
}

test('semantic repins cannot leave canned feedback describing different facts', () => {
  const measurements = JSON.parse(readFileSync(new URL('../../signals/countries/income-measurements.v1.json', import.meta.url)));
  const storm = JSON.parse(readFileSync(new URL('../../signals/countries/storm-review.v1.json', import.meta.url)));
  const family = measurements.families[0];
  const observations = family.observations.filter(x => x.iso3 === 'USA' && [2024, 2025].includes(x.year));
  const assessment = storm.latest.find(x => x.country === 'USA');
  const input = { family, observations, assessment, change: -0.353 };
  assert.doesNotThrow(() => assertRehearsalSemantics(input));
  for (const mutate of [
    x => { x.observations[1].value = 60; x.observations[1].source_value = '60'; x.change = 0.533; },
    x => { x.family.denominator = 'Total population'; },
    x => { x.observations[0].age = 'AGE_YGE25'; },
    x => { x.assessment.state = 'candidate'; },
    x => { x.assessment.missing_evidence = []; },
    x => { x.assessment.action_authorised = true; },
  ]) {
    const changed = structuredClone(input); mutate(changed);
    assert.throws(() => assertRehearsalSemantics(changed), /Rehearsal semantics changed/);
  }
});
