import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildResearchReaderEdition, validateResearchReaderEdition,
  assessResearchReaderBinding, renderResearchReader,
} from '../research-reader.mjs';

const pack = buildResearchReaderEdition();

test('actual new research reader edition adopts three metadata bindings but no truth or kernel events', () => {
  assert.equal(validateResearchReaderEdition(pack.edition).valid, true);
  assert.equal(pack.edition.edition, 'mind-flow.research-reader-migration/1.0.0');
  assert.equal(pack.edition.readers.length, 3);
  assert.equal(pack.summary.applied_reader_metadata_adoptions, 3);
  assert.equal(pack.summary.corrected_meanings_used, 2);
  assert.equal(pack.summary.completed_kernel_corrections, 0);
  assert.equal(pack.summary.kernel_events_appended, 0);
  assert.equal(pack.summary.observations_transferred, 0);
  assert.equal(pack.summary.human_approval, false);
  assert.equal(pack.summary.operational_action_authorised, false);
});

test('each actual old reader is rejected before the new explicitly acknowledged edition is accepted', () => {
  for (const reader of pack.edition.readers) {
    assert.equal(assessResearchReaderBinding(pack.edition, reader.reader_id, reader.previous_binding).code, 'STALE_RESEARCH_MEANING');
    const result = assessResearchReaderBinding(pack.edition, reader.reader_id, reader.presentation_binding);
    assert.equal(result.code, 'RESEARCH_METADATA_BOUND');
    assert.equal(result.truth_evaluated, false);
    assert.equal(result.action_authorised, false);
    assert.equal(reader.adoption.acknowledge_non_equivalence, true);
    assert.equal(reader.adoption.status, 'applied-in-this-new-research-reader-edition');
  }
});

test('old observations and source reader fragments retain original identity and bytes', () => {
  for (const reader of pack.edition.readers) {
    const source = JSON.parse(readFileSync(new URL('../../../' + reader.source.path, import.meta.url), 'utf8'));
    const fragment = reader.source.pointer.split('/').slice(1).reduce((v, key) => v[key.replaceAll('~1', '/').replaceAll('~0', '~')], source);
    assert.deepEqual(reader.retained_original_context, fragment);
    assert.deepEqual(fragment.condition_definition_ref, reader.previous_binding);
    assert.equal(reader.historical_values_admitted_under_new_identity, false);
    assert.equal(reader.truth_state, 'not-evaluated');
    assert.equal(reader.admitted_observations.length, 0);
  }
});

test('real independent agent review is retained without human or operational approval claims', () => {
  const review = pack.edition.review_evidence;
  assert.equal(review.reviewer_task, '/root/r11_experience');
  assert.equal(review.reviewed_fix_commit, '2d4f7d4b9de3a94ada504187ca7d78ac5bd5a026');
  assert.equal(review.evidence_kind, 'retained-agent-message-transcription');
  assert.equal(review.publisher_authentication, false);
  assert.equal(review.human_approval, false);
  assert.equal(review.operational_migration_signoff, false);
  assert.match(review.message_verbatim, /not externalhuman approval/);
});

for (const [name, mutate] of [
  ['old binding', e => { e.readers[0].presentation_binding = e.readers[0].previous_binding; }],
  ['missing acknowledgement', e => { e.readers[0].adoption.acknowledge_non_equivalence = false; }],
  ['false human approval', e => { e.review_evidence.human_approval = true; }],
  ['truth claim', e => { e.readers[0].truth_state = 'true'; }],
  ['invented evidence transfer', e => { e.readers[0].admitted_observations.push({ value: 100 }); }],
  ['rewritten old values', e => { e.readers[2].retained_original_context.observations[0].value = 100; }],
  ['omitted reader', e => { e.readers.pop(); }],
  ['fabricated reader', e => { e.readers.push(structuredClone(e.readers[0])); }],
  ['wrong source bytes', e => { e.readers[0].source.sha256 = 'sha256:' + '0'.repeat(64); }],
]) test(`edition rejects ${name}`, () => {
  const edition = structuredClone(pack.edition); mutate(edition);
  assert.equal(validateResearchReaderEdition(edition).valid, false);
  assert.throws(() => renderResearchReader(edition), /INVALID_RESEARCH_READER_EDITION/);
});

test('unknown and mismatched bindings fail, never becoming a truth state', () => {
  const reader = pack.edition.readers[0];
  assert.equal(assessResearchReaderBinding(pack.edition, 'invented', {}).code, 'UNKNOWN_RESEARCH_READER');
  for (const binding of [{ ...reader.presentation_binding, definition_version: '2.0.0' }, { ...reader.presentation_binding, definition_hash: 'sha256:' + '0'.repeat(64) }]) {
    assert.equal(assessResearchReaderBinding(pack.edition, reader.reader_id, binding).code, 'RESEARCH_BINDING_MISMATCH');
  }
});

test('new reader is a usable corrected presentation with old context and visible action boundary', () => {
  const html = renderResearchReader(pack.edition);
  assert.match(html, /Research reader, corrected meanings/);
  assert.match(html, /3 metadata adoptions/);
  assert.match(html, /0 completed kernel corrections/);
  assert.match(html, /appointment-making/);
  assert.match(html, /crude/);
  assert.match(html, /very-remote/);
  assert.match(html, /Historical context retains its old identity/);
  assert.match(html, /Not a personal access assessment/);
  assert.doesNotMatch(html, /<script/);
});

test('retained new edition, summary and page reproduce exactly', () => {
  const dir = new URL('../../../pilots/australia/basket/', import.meta.url);
  for (const [name, bytes] of [
    ['round-11-research-reader.json', JSON.stringify(pack.edition, null, 2) + '\n'],
    ['round-11-research-reader.summary.json', JSON.stringify(pack.summary, null, 2) + '\n'],
    ['round-11-research-reader.html', renderResearchReader(pack.edition)],
  ]) assert.equal(readFileSync(new URL(name, dir), 'utf8'), bytes);
});
