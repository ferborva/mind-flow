import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildRound11MigrationReview, validateMigrationReview, buildMigrationSummary,
  assessReaderAdoption, previewReaderAdoption, computeMigrationHash,
  inventoryReaders,
} from '../review.mjs';

const review = buildRound11MigrationReview();
const clone = () => structuredClone(review);
const reseal = value => { value.migrations.forEach(m => { m.migration_hash = computeMigrationHash(m); }); return value; };

test('two source-bound proposals do not become completed events', () => {
  assert.equal(validateMigrationReview(review).valid, true);
  assert.equal(review.edition, 'mind-flow.construct-migration.review/1.0.0');
  assert.equal(review.migrations.length, 2);
  const summary = buildMigrationSummary(review);
  assert.equal(summary.proposed_corrections, 2);
  assert.equal(summary.applied_corrections, 0);
  assert.equal(summary.existing_appended_kernel_events, 1);
  assert.equal(summary.programme_three_event_gate_met, false);
  assert.equal(summary.action_authorised, false);
});

test('actual basket readers exist for both proposals; only prescription has a positive-signal reader', () => {
  const [urgent, prescription] = review.migrations;
  for (const migration of review.migrations) {
    assert.ok(migration.readers.some(r => r.role === 'basket-definition-reader'));
    assert.ok(migration.readers.some(r => r.role === 'historical-observation'));
  }
  assert.equal(urgent.readers.filter(r => r.role === 'positive-signal-context-reader').length, 0);
  assert.equal(prescription.readers.filter(r => r.role === 'positive-signal-context-reader').length, 1);
});

test('corrected meanings preserve the unanswered question and do not inherit old predicate thresholds', () => {
  const [urgent, prescription] = review.migrations;
  assert.equal(urgent.proposed_meaning.clock_origin, 'appointment-making');
  assert.equal(prescription.proposed_meaning.rate_kind, 'crude');
  for (const migration of review.migrations) {
    assert.notEqual(migration.proposed_meaning.condition_id, migration.old_definition.condition_id);
    assert.notEqual(migration.proposed_meaning.signal_id, migration.old_signal.signal_id);
    assert.equal(migration.proposed_meaning.truth_predicate, null);
    assert.equal(migration.historical_observation_transfer, 'none');
    assert.ok(migration.unanswered_question.length > 30);
  }
});

test('urgent meaning retains known crude-rate and changing coverage caveats without claiming new discoveries', () => {
  const urgent = review.migrations[0];
  assert.equal(urgent.proposed_meaning.rate_kind, 'crude');
  assert.match(urgent.proposed_meaning.coverage_change, /phased out part way through 2023-24/);
  assert.match(urgent.proposed_meaning.coverage_change, /excluded from 2024-25/);
  assert.match(urgent.proposed_meaning.coverage_change, /comparability is not established/);
  const caveats = urgent.known_source_caveats;
  assert.deepEqual(caveats.map(c => c.cell), ['10A.43!C50', '10A.43!C59']);
  assert.ok(caveats.every(c => c.role === 'known-context-not-new-discovery'));
  assert.equal(caveats[0].text, 'Data values are crude rates and may differ from data in previous reports in which rates were age-standardised.');
  assert.deepEqual(urgent.source_cells.map(c => c.cell), ['10A.43!C54', '10A.43!C55']);
  const summary = buildMigrationSummary(review);
  assert.equal(summary.proposed_corrections, 2);
  assert.equal(summary.applied_corrections, 0);
  assert.equal(summary.items[0].rate_kind, 'crude');
  assert.equal(summary.items[0].coverage_change, urgent.proposed_meaning.coverage_change);
  assert.deepEqual(summary.items[0].known_caveat_cells, ['10A.43!C50', '10A.43!C59']);
});

test('each real basket reference rejects stale meaning before explicit preview adoption', () => {
  const before = JSON.stringify(review);
  for (const migration of review.migrations) {
    const reader = migration.readers.find(r => r.role === 'basket-definition-reader');
    assert.equal(assessReaderAdoption(review, migration.id, reader.reader_id, reader.definition_ref).code, 'STALE_MEANING');
    assert.throws(() => previewReaderAdoption(review, migration.id, reader.reader_id), /EXPLICIT_ACKNOWLEDGEMENT_REQUIRED/);
    const preview = previewReaderAdoption(review, migration.id, reader.reader_id, {
      migration_hash: migration.migration_hash, acknowledge_non_equivalence: true,
    });
    assert.equal(preview.adoption_status, 'preview-only');
    assert.equal(preview.source_reader_modified, false);
    assert.equal(preview.operationally_usable, false);
    assert.equal(assessReaderAdoption(review, migration.id, reader.reader_id, preview.proposed_binding).code, 'MATCHED_PROPOSAL_NOT_OPERATIONAL');
  }
  assert.equal(JSON.stringify(review), before);
});

test('old observations cannot be automatically adopted even in preview', () => {
  const migration = review.migrations[0];
  const reader = migration.readers.find(r => r.role === 'historical-observation');
  assert.throws(() => previewReaderAdoption(review, migration.id, reader.reader_id, {
    migration_hash: migration.migration_hash, acknowledge_non_equivalence: true,
  }), /HISTORICAL_EVIDENCE_REQUIRES_SEPARATE_ADMISSION/);
  const meaning = migration.proposed_meaning;
  const result = assessReaderAdoption(review, migration.id, reader.reader_id, {
    condition_id: meaning.condition_id, definition_version: meaning.definition_version, definition_hash: meaning.definition_hash,
  });
  assert.equal(result.accepted_for_preview, false);
  assert.equal(result.code, 'HISTORICAL_EVIDENCE_REQUIRES_SEPARATE_ADMISSION');
});

test('sealed and derived references cannot masquerade as an applied consumer adoption', () => {
  const migration = review.migrations[0];
  for (const reader of migration.readers.filter(r => ['retained-event-history', 'current-kernel-state', 'derived-evolution-reader'].includes(r.role))) {
    assert.throws(() => previewReaderAdoption(review, migration.id, reader.reader_id, {
      migration_hash: migration.migration_hash, acknowledge_non_equivalence: true,
    }), /SEALED_OR_DERIVED_READER_REQUIRES_NEW_EDITION/);
  }
});

test('pointer inventory escapes special keys and does not confuse strings or incomplete refs with bindings', () => {
  const definition = review.migrations[0].readers[0].definition_ref;
  const readers = inventoryReaders({ 'fixture.json': {
    'a/b~c': { condition_definition_ref: definition },
    text: definition.condition_id, incomplete: { condition_id: definition.condition_id },
  } }, definition.condition_id);
  assert.equal(readers.length, 1);
  assert.equal(readers[0].pointer, '/a~1b~0c/condition_definition_ref');
});

test('adoption rejects foreign identity and correct identity with wrong hash or version', () => {
  const migration = review.migrations[0];
  const reader = migration.readers.find(r => r.role === 'basket-definition-reader');
  const base = { condition_id: migration.proposed_meaning.condition_id, definition_version: '1.0.0', definition_hash: migration.proposed_meaning.definition_hash };
  for (const binding of [
    { ...base, condition_id: 'condition.foreign' },
    { ...base, definition_version: '2.0.0' },
    { ...base, definition_hash: 'sha256:' + '0'.repeat(64) },
    { ...base, action_authorised: true },
  ]) assert.equal(assessReaderAdoption(review, migration.id, reader.reader_id, binding).code, 'DEFINITION_BINDING_MISMATCH');
});

test('unknown reader and stale acknowledgement fail visibly', () => {
  const migration = review.migrations[0];
  assert.equal(assessReaderAdoption(review, migration.id, 'invented-reader', {}).code, 'UNKNOWN_READER');
  assert.throws(() => previewReaderAdoption(review, migration.id, migration.readers[0].reader_id, {
    migration_hash: 'sha256:' + '0'.repeat(64), acknowledge_non_equivalence: true,
  }), /EXPLICIT_ACKNOWLEDGEMENT_REQUIRED/);
});

for (const [name, mutate] of [
  ['omitted actual reader', r => r.migrations[0].readers.pop()],
  ['fabricated reader', r => r.migrations[0].readers.push({ ...r.migrations[0].readers[0], reader_id: 'invented' })],
  ['identity reused', r => { r.migrations[0].proposed_meaning.condition_id = r.migrations[0].old_definition.condition_id; }],
  ['changed clock', r => { r.migrations[0].proposed_meaning.clock_origin = 'first-attempt'; }],
  ['removed urgent crude-rate caveat', r => { delete r.migrations[0].proposed_meaning.rate_kind; }],
  ['removed urgent coverage caveat', r => { delete r.migrations[0].proposed_meaning.coverage_change; }],
  ['forged known caveat', r => { r.migrations[0].known_source_caveats[0].text = 'Age-standardised rates'; }],
  ['unjustified truth threshold', r => { r.migrations[0].proposed_meaning.truth_predicate = { threshold: 100 }; }],
  ['evidence transfer', r => { r.migrations[0].historical_observation_transfer = 'automatic'; }],
  ['applied claim', r => { r.migrations[0].status = 'applied'; }],
  ['invented review approval', r => { r.migrations[0].independent_review = { status: 'approved' }; }],
  ['action authority', r => { r.action_authorised = true; }],
  ['modified source hash', r => { r.source_artifacts[0].sha256 = 'sha256:' + '0'.repeat(64); }],
  ['missing proposal', r => { r.migrations.pop(); }],
]) {
  test(`recomputed local hashes cannot admit ${name}`, () => {
    const changed = clone(); mutate(changed); reseal(changed);
    assert.equal(validateMigrationReview(changed).valid, false);
  });
}

test('summary refuses invalid proposal rather than broadcasting altered counts', () => {
  const changed = clone(); changed.migrations[0].status = 'applied';
  assert.throws(() => buildMigrationSummary(changed), /INVALID_MIGRATION_REVIEW/);
});

test('retained outputs reproduce exactly', () => {
  const directory = new URL('../../../pilots/australia/basket/', import.meta.url);
  for (const [name, value] of [
    ['round-11-construct-migrations.json', review],
    ['round-11-construct-migrations.summary.json', buildMigrationSummary(review)],
  ]) assert.equal(readFileSync(new URL(name, directory), 'utf8'), JSON.stringify(value, null, 2) + '\n');
});
