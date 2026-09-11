import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStation } from '../projection.mjs';
import { researchBrief } from '../brief.mjs';
import { caseFor } from '../cases.mjs';
const station = buildStation();
const E = 'income-employment-population.v1', U = 'income-unemployment.v1', P = 'income-poverty-lineup.v1';
const select = (country, family, year) => ({country,compare:'USA',family,year});

for (const [country,family,year,discriminator] of [
  ['PER',E,2020,/same people.*duration/i],
  ['IRL',U,2009,/overlap.*denominator/i],
  ['KAZ',P,2006,/survey.*comparability/i],
  ['ARG',P,2025,/national.*coverage/i],
]) test(`the ${country} handoff preserves the exact reviewed question and names discriminating evidence`, () => {
  const brief = researchBrief(station, select(country,family,year)), inquiry = brief.inquiry;
  const story = caseFor(station,country,family,year);
  assert.equal(inquiry.question, story.nextQuestion);
  assert.equal(inquiry.interpretationBoundary, story.claimLimit);
  assert.match(inquiry.discriminatingEvidence, discriminator);
  assert.equal(inquiry.edition, 'research-inquiry.v1');
  assert.equal(inquiry.author, 'Ren (AI agent)');
  assert.equal(inquiry.status, 'proposal-not-commissioned-action');
  assert.equal(inquiry.nextStep.verb, 'Review');
  assert.ok(inquiry.nextStep.object.length > 20);
  assert.ok(inquiry.nextStep.object.includes(String(year - 1)), 'the proposed step names its starting year');
  assert.ok(inquiry.nextStep.object.includes(String(year)), 'the proposed step names its ending year');
  assert.match(inquiry.nextStep.if, /capacity.*legitimate.*remit/i);
  assert.match(inquiry.nextStep.if, /inform or confirm/);
  assert.equal(inquiry.conditionsEvaluated, false);
  assert.equal(inquiry.owner.appointed, false);
  assert.match(inquiry.stopIf, /personal data.*paid access.*participant contact/i);
  assert.match(inquiry.deferIf, /opportunity cost/);
  assert.match(inquiry.reviseIf, /scope|meaning/);
  assert.match(inquiry.admitEvidenceOnlyIf, /separate.*review/i);
  assert.equal(inquiry.actionTaken, false);
  const assessment = station.countries.find(c => c.code===country).assessments.find(a => a.year===year);
  assert.deepEqual(inquiry.missingAccessEvidence, assessment.missing);
  assert.equal(inquiry.assessmentSource.selector.country, country);
  assert.equal(inquiry.assessmentSource.selector.periodTo, year);
  assert.ok(station.inputs.some(x => x.path===inquiry.assessmentSource.path && x.sha256===inquiry.assessmentSource.sha256));
});

test('missing Argentina observations and affected share remain null, not supplied by an inquiry', () => {
  const b = researchBrief(station,select('ARG',P,2025));
  assert.equal(b.selected.before,null); assert.equal(b.selected.after,null);
  assert.equal(b.selected.change,null); assert.equal(b.selected.disruptedPopulationShare,null);
  assert.match(b.nativeSeries,/3.*2021.*PPP/);
  assert.equal(b.authority,'none'); assert.equal(b.publicReleaseApproved,false);
  assert.equal(b.inquiry.nativeEvidence.before,null); assert.equal(b.inquiry.nativeEvidence.after,null);
});

test('available native endpoints retain exact selectors and one source vintage', () => {
  const b = researchBrief(station,select('PER',E,2020));
  assert.equal(b.inquiry.nativeEvidence.before.value,74.748);
  assert.equal(b.inquiry.nativeEvidence.after.value,63.976);
  assert.equal(b.inquiry.nativeEvidence.before.selector,b.selected.before.selector);
  assert.equal(b.inquiry.nativeEvidence.after.selector,b.selected.after.selector);
  assert.equal(b.inquiry.nativeEvidence.sourceSha256,b.sourceSha256);
  assert.match(b.inquiry.nativeEvidence.boundary,/not.*real.time/i);
});

test('a non-tour selection receives a clearly generic scope-bound question, not an invented story', () => {
  const b = researchBrief(station,select('USA',E,2025));
  assert.equal(b.inquiry.questionKind,'generic-scope-question');
  assert.match(b.inquiry.question,/United States.*2024.*2025/);
  assert.equal(b.inquiry.guidedCase,null);
  assert.doesNotMatch(b.inquiry.question,/Peru|Ireland|Kazakhstan/);
});
test('the baseline does not acquire an invented previous comparison or country-period assessment', () => {
  const b = researchBrief(station,select('USA',E,2005));
  assert.equal(b.selected.before,null); assert.equal(b.inquiry.assessmentSource,null);
  assert.deepEqual(b.inquiry.missingAccessEvidence,[]);
  assert.match(b.inquiry.assessmentBoundary,/baseline.*not.*assessment/i);
});
test('meaning-changing source refresh cannot export a stale guided question', () => {
  const changed = structuredClone(station);
  changed.countries.find(c=>c.code==='PER').series[E].find(p=>p.year===2020).value = 63;
  assert.throws(()=>researchBrief(changed,select('PER',E,2020)),/Case semantics changed/);
});
test('invalid selection and missing assessment lineage fail rather than exporting a partial claim', () => {
  assert.throws(()=>researchBrief(station,select('UNKNOWN',E,2025)),/Unknown economy/);
  assert.throws(()=>researchBrief(station,select('USA',E,2030)),/retained year/);
  const changed = structuredClone(station);
  changed.inputs = changed.inputs.filter(x=>x.path!=='signals/countries/storm-review.v1.json');
  assert.throws(()=>researchBrief(changed,select('PER',E,2020)),/assessment lineage/i);
});
test('building and editing a local handoff cannot mutate retained station inputs or confer authority', () => {
  const snapshot=JSON.stringify(station), selection=select('PER',E,2020);
  const b=researchBrief(station,selection);
  b.selection.year=2025; b.inquiry.missingAccessEvidence.push('local edit');
  b.selected.after.value=0; b.inputs[0].sha256='edited';
  assert.equal(JSON.stringify(station),snapshot); assert.equal(selection.year,2020);
  assert.equal(b.inquiry.authority,'none');
  assert.match(b.classification,/not a crisis warning/);
});
