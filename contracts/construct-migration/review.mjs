import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { readWorkbookTables } from '../../pilots/australia/tools/primary-care-workbook.mts';
import { validateExecutableIfKernel } from '../executable-if/validate.mjs';

const root = resolve(import.meta.dirname, '../..');
const edition = 'mind-flow.construct-migration.review/1.0.0';
const kernelPath = 'pilots/australia/basket/primary-care.kernel.current.json';
const basketPath = 'pilots/australia/basket/primary-care.r3.json';
const positivePath = 'pilots/australia/data/positive-signals-current.json';
const overlayPath = 'contracts/evolution/fixtures/australia-primary-care.current.json';
const workbookPath = 'pilots/australia/sources/primary-care/2026-09-10/pc-primary-care-tables.xlsx';
const artifacts = [
  [kernelPath, '1fe8272a1855bace95b2151fce1290e40a368267bebf22a4c74d845d10fc1651'],
  [basketPath, '6d2a20844719fd9851c28c5ec961a4c0f6bb049adea7f382454eaad15da8f65e'],
  [positivePath, '88aa1967cbe4372fdfbe8fcc0845d09c9653dce713191249544fc6b5b098382e'],
  [overlayPath, '8174a428c0c243f8d3828bbd543dd7ecc7f63b6fa7aa4525964fe66ba360417f'],
  [workbookPath, '99c6ff08e0a48026b780370aa4d02a8edb36b1b11049dd6ce92087005481a36c'],
  ['contracts/executable-if/construct-correction-policy.md', '1809a6354f43c26d6ef3bd1750fd809177bd4bf0f2c4b63adedf673d8ff6b988'],
  ['pilots/australia/data/round-09-evolution-discoveries.json', '530f57b9081fced55d74d799579c36b048b8b53fad024f2882650f00acb049b1'],
].map(([path, hash]) => ({ path, sha256: 'sha256:' + hash }));
const hash = value => 'sha256:' + createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
};
const ref = definition => ({ condition_id: definition.condition_id, definition_version: definition.definition_version, definition_hash: definition.definition_hash });
const escapePointer = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');

export function computeMigrationHash(migration) {
  const { migration_hash, ...payload } = migration;
  return hash(edition + '\n' + canonical(payload));
}

function role(path, pointer) {
  if (path === basketPath) return 'basket-definition-reader';
  if (path === positivePath) return 'positive-signal-context-reader';
  if (path === overlayPath) return 'derived-evolution-reader';
  if (pointer.startsWith('/observations/')) return 'historical-observation';
  if (pointer.startsWith('/events/')) return 'retained-event-history';
  if (pointer.startsWith('/current_state/')) return 'current-kernel-state';
  return 'retained-kernel-reference';
}

/** Inventory exact structured references in the declared, pinned four-document universe.
 * This is not a repository-wide textual dependency scanner. Historical references
 * remain visible and are not represented as mutable live application consumers.
 */
export function inventoryReaders(documents, conditionId) {
  const readers = [];
  for (const [path, document] of Object.entries(documents)) {
    const visit = (value, pointer) => {
      if (!value || typeof value !== 'object') return;
      if (value.condition_id === conditionId && typeof value.definition_version === 'string' && typeof value.definition_hash === 'string') {
        readers.push({ reader_id: `${path}#${pointer}`, path, pointer, role: role(path, pointer), definition_ref: ref(value) });
      }
      for (const [key, child] of Object.entries(value)) visit(child, pointer + '/' + escapePointer(key));
    };
    visit(document, '');
  }
  return readers.sort((a, b) => a.reader_id < b.reader_id ? -1 : a.reader_id > b.reader_id ? 1 : 0);
}

const specifications = [
  {
    id: 'migration.au.gp.urgent-appointment-clock.r11', old_id: 'condition.au.gp.timely',
    title: 'The urgent-care clock starts after an appointment is made',
    cells: ['10A.43!C54', '10A.43!C55'],
    known_caveats: [
      { cell: '10A.43!C50', sha256: 'sha256:6013c45ca9919e77d21b4bce42e7a7d7542fa0d60252b79e513f54a8c094a1a8' },
      { cell: '10A.43!C59', sha256: 'sha256:29e2120f7382fd2ddcc832c3701568c2fa848cc3bc06f73655aa00aafdf6986e' },
    ],
    proposed_meaning: {
      condition_id: 'condition.au.nsw.gp.urgent-appointment-clock',
      signal_id: 'signal.au.nsw.gp.urgent-appointment-under-four-hours',
      definition_version: '1.0.0', condition_category: 'availability',
      population: 'Survey-scope persons aged 15 years and over who saw a GP for urgent medical care for their own health in the last 12 months; urgency defined by the respondent.',
      geography: 'NSW, Australia',
      measure: 'Published proportion reporting less than four hours between making an appointment and seeing the GP for urgent medical care.',
      denominator: 'Survey-scope people who obtained urgent GP care, not everyone who needed it or attempted access.',
      clock_origin: 'appointment-making', rate_kind: 'crude', unit: 'percent',
      coverage_change: 'Very-remote collection was phased out part way through 2023-24; very-remote residents were excluded from 2024-25. Cross-period common-population comparability is not established.',
      truth_predicate: null,
    },
    reason: 'The old signal did not specify the waiting-clock origin. Appointment-making is not first attempted contact or onset of need. The measured population obtained care, so unmet need cannot inherit a timeliness result.',
    unanswered_question: 'How long did people wait from their first attempt or onset of urgent need, including people who never obtained an appointment?',
  },
  {
    id: 'migration.au.prescription.denominator.r11', old_id: 'condition.au.prescription.cost',
    title: 'Prescription cost uses a particular survey denominator',
    cells: ['10A.33!C17', '10A.33!C20', '10A.33!C24'],
    proposed_meaning: {
      condition_id: 'condition.au.nsw.prescription.gp-or-needed-cost-delay',
      signal_id: 'signal.au.nsw.prescription.gp-or-needed-cost-delay-crude',
      definition_version: '1.0.0', condition_category: 'price',
      population: 'Survey-scope persons aged 15 years and over who received a prescription for medication from a GP in the last 12 months, or needed prescribed medication.',
      geography: 'NSW, Australia',
      measure: 'Published crude proportion who delayed getting, or did not get, prescribed medication at any time in the last 12 months due to cost.',
      denominator: 'Survey-scope people who received a GP prescription or needed prescribed medication; not all residents and not an atorvastatin-specific population.',
      rate_kind: 'crude', unit: 'percent',
      coverage_change: 'Very-remote collection was phased out part way through 2023-24; very-remote residents were excluded from 2024-25. Cross-period common-population comparability is not established.',
      truth_predicate: null,
    },
    reason: 'Replacing a generic cohort label with the GP-prescription-or-needed-medication denominator changes meaning. Crude rates cannot inherit age-standardised interpretation. Aggregate medicine coverage and the very-remote exclusion were already known, not newly discovered events.',
    unanswered_question: 'Can a person obtain the particular clinically prescribed medicine they need, including people outside the survey scope, and which alternative routes remain feasible?',
  },
];

/** Reproduce two proposed migration packages from retained evidence. No writes,
 * acquisition, old-kernel mutation, evidence admission or event append occurs.
 */
export function buildRound11MigrationReview() {
  const buffers = new Map(artifacts.map(artifact => {
    const bytes = readFileSync(resolve(root, artifact.path));
    if (hash(bytes) !== artifact.sha256) throw new Error(`SOURCE_ARTIFACT_MISMATCH: ${artifact.path}`);
    return [artifact.path, bytes];
  }));
  const documents = Object.fromEntries([kernelPath, basketPath, positivePath, overlayPath].map(path => [path, JSON.parse(buffers.get(path))]));
  const kernel = documents[kernelPath];
  const validation = validateExecutableIfKernel(kernel);
  if (!validation.machine_valid || !validation.integrity_valid) throw new Error('RETAINED_KERNEL_INVALID');
  const discoveries = JSON.parse(buffers.get('pilots/australia/data/round-09-evolution-discoveries.json'));
  const tables = readWorkbookTables(buffers.get(workbookPath), [33, 43]);
  const migrations = specifications.map(specification => {
    const current = kernel.current_state.find(state => state.condition_id === specification.old_id);
    const old = kernel.events.flatMap(event => event.introduced_definitions).find(definition => definition.definition_hash === current.condition_definition_ref.definition_hash);
    const signal = kernel.signals.find(signal => signal.signal_id === old.predicates.measure.signal_ref.signal_id);
    const source_cells = specification.cells.map(cell => {
      const [table, address] = cell.split('!');
      const value = tables[table].find(value => value.address === address);
      const retained = discoveries.discoveries.flatMap(discovery => discovery.source_text_hashes).find(value => value.cell === cell);
      if (value?.kind !== 'text' || hash(value.text) !== retained?.sha256) throw new Error(`SOURCE_CELL_MISMATCH: ${cell}`);
      return { cell, text: value.text, sha256: hash(value.text) };
    });
    const known_source_caveats = (specification.known_caveats ?? []).map(caveat => {
      const [table, address] = caveat.cell.split('!');
      const value = tables[table].find(value => value.address === address);
      if (value?.kind !== 'text' || hash(value.text) !== caveat.sha256) throw new Error(`KNOWN_SOURCE_CAVEAT_MISMATCH: ${caveat.cell}`);
      return { cell: caveat.cell, text: value.text, sha256: hash(value.text), role: 'known-context-not-new-discovery' };
    });
    const proposed_meaning = structuredClone(specification.proposed_meaning);
    proposed_meaning.definition_hash = hash(edition + '\nmeaning\n' + canonical(proposed_meaning));
    const migration = {
      id: specification.id, title: specification.title, status: 'proposed',
      old_definition: structuredClone(old), old_signal: structuredClone(signal), proposed_meaning,
      relationship: { kind: 'construct-correction-not-equivalent', reason: specification.reason },
      source_cells, known_source_caveats, readers: inventoryReaders(documents, specification.old_id),
      unanswered_question: specification.unanswered_question,
      historical_observation_transfer: 'none', new_observations: [],
      independent_review: { status: 'pending', reviewer: null, receipt: null },
      condition_truth: 'not-evaluated', authority_effect: 'none', action_authorised: false,
      migration_hash: '',
    };
    migration.migration_hash = computeMigrationHash(migration);
    return migration;
  });
  return {
    id: 'round-11-construct-migrations', edition, prepared_on: '2026-09-11',
    author: 'Ren (AI agent)', status: 'research-proposals-for-independent-review',
    source_artifacts: structuredClone(artifacts),
    inventory_scope: {
      included_paths: Object.keys(documents),
      method: 'All structured condition_id/definition_version/definition_hash references in four pinned current research artefacts, including their retained history.',
      exclusions: 'Archived revisions, code, prose, unbound series readers, copied web views and external consumers are not exhaustively inventoried. No repository-wide or deployment-wide migration completion is claimed.',
      completeness: 'complete-within-declared-structured-reference-universe-only',
    },
    migrations,
    existing_appended_kernel_events: discoveries.actual_appended_events,
    applied_corrections: 0, programme_three_event_gate_met: false,
    authority_effect: 'none', action_authorised: false,
    next_gate: 'Independent review of source interpretation, corrected meanings, remaining dependent surfaces and explicit migrations. Separate evidence admission and a future operational edition are required before truth evaluation or completed-event claims.',
  };
}

/** Exact retained-proposal validation, not a signature/authentication service.
 * Recomputing attacker/caller supplied hashes cannot invent source interpretation,
 * remove readers or approve an applied state. New proposals require reviewed code.
 */
export function validateMigrationReview(review) {
  try {
    const expected = buildRound11MigrationReview();
    if (!same(review, expected)) return { valid: false, code: 'MIGRATION_REVIEW_MISMATCH', errors: ['Review differs from exact source-bound proposal replay.'] };
    return { valid: true, code: null, errors: [], independent_review: false, applied: false };
  } catch (error) {
    return { valid: false, code: 'MIGRATION_SOURCE_INVALID', errors: [String(error)] };
  }
}

function requireReview(review) {
  const result = validateMigrationReview(review);
  if (!result.valid) throw new Error('INVALID_MIGRATION_REVIEW: ' + result.errors.join('; '));
}

function selectedReader(review, migrationId, readerId) {
  const migration = review.migrations.find(migration => migration.id === migrationId);
  const reader = migration?.readers.find(reader => reader.reader_id === readerId);
  return { migration, reader };
}

export function assessReaderAdoption(review, migrationId, readerId, binding) {
  requireReview(review);
  const { migration, reader } = selectedReader(review, migrationId, readerId);
  if (!migration || !reader) return { accepted_for_preview: false, operationally_usable: false, code: 'UNKNOWN_READER' };
  if (same(binding, reader.definition_ref)) return { accepted_for_preview: false, operationally_usable: false, code: 'STALE_MEANING' };
  if (reader.role === 'historical-observation') return { accepted_for_preview: false, operationally_usable: false, code: 'HISTORICAL_EVIDENCE_REQUIRES_SEPARATE_ADMISSION' };
  if (!['basket-definition-reader', 'positive-signal-context-reader'].includes(reader.role)) return { accepted_for_preview: false, operationally_usable: false, code: 'SEALED_OR_DERIVED_READER_REQUIRES_NEW_EDITION' };
  const matches = same(binding, ref(migration.proposed_meaning));
  return { accepted_for_preview: matches, operationally_usable: false, code: matches ? 'MATCHED_PROPOSAL_NOT_OPERATIONAL' : 'DEFINITION_BINDING_MISMATCH' };
}

export function previewReaderAdoption(review, migrationId, readerId, acknowledgement) {
  requireReview(review);
  const { migration, reader } = selectedReader(review, migrationId, readerId);
  if (!migration || !reader) throw new Error('UNKNOWN_READER');
  if (!same(acknowledgement, { migration_hash: migration.migration_hash, acknowledge_non_equivalence: true })) throw new Error('EXPLICIT_ACKNOWLEDGEMENT_REQUIRED');
  if (reader.role === 'historical-observation') throw new Error('HISTORICAL_EVIDENCE_REQUIRES_SEPARATE_ADMISSION');
  if (!['basket-definition-reader', 'positive-signal-context-reader'].includes(reader.role)) throw new Error('SEALED_OR_DERIVED_READER_REQUIRES_NEW_EDITION');
  return {
    migration_id: migration.id, reader_id: reader.reader_id,
    previous_binding: structuredClone(reader.definition_ref), proposed_binding: ref(migration.proposed_meaning),
    acknowledgement: structuredClone(acknowledgement), adoption_status: 'preview-only',
    source_reader_modified: false, operationally_usable: false, evidence_transferred: false,
    condition_truth: 'not-evaluated', action_authorised: false,
  };
}

export function buildMigrationSummary(review = buildRound11MigrationReview()) {
  requireReview(review);
  return {
    id: 'round-11-construct-migrations-summary', edition,
    status: 'proposed-not-applied', proposed_corrections: review.migrations.length,
    applied_corrections: review.applied_corrections,
    existing_appended_kernel_events: review.existing_appended_kernel_events,
    programme_three_event_gate_met: review.programme_three_event_gate_met,
    action_authorised: false,
    scope_warning: review.inventory_scope.exclusions,
    items: review.migrations.map(migration => ({
      id: migration.id, title: migration.title, status: migration.status,
      old_condition_id: migration.old_definition.condition_id,
      proposed_condition_id: migration.proposed_meaning.condition_id,
      migration_hash: migration.migration_hash,
      what_changed: migration.relationship.reason,
      unanswered_question: migration.unanswered_question,
      source_cells: migration.source_cells.map(cell => cell.cell),
      known_caveat_cells: migration.known_source_caveats.map(cell => cell.cell),
      rate_kind: migration.proposed_meaning.rate_kind,
      coverage_change: migration.proposed_meaning.coverage_change,
      reader_reference_count: migration.readers.length,
      historical_observation_count: migration.readers.filter(reader => reader.role === 'historical-observation').length,
      positive_signal_context_readers: migration.readers.filter(reader => reader.role === 'positive-signal-context-reader').length,
      preview_readers: migration.readers.filter(reader => ['basket-definition-reader', 'positive-signal-context-reader'].includes(reader.role)).map(reader => ({
        reader_id: reader.reader_id,
        stale_meaning_rejected: assessReaderAdoption(review, migration.id, reader.reader_id, reader.definition_ref).code === 'STALE_MEANING',
        preview_binding: ref(migration.proposed_meaning), adoption_status: 'preview-only',
      })),
      source_path: workbookPath,
      next_gate: review.next_gate,
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['--check', '--json', '--summary'].includes(args[0])) throw new Error('Use --check, --json or --summary. This command never writes.');
    const review = buildRound11MigrationReview();
    const summary = buildMigrationSummary(review);
    if (args[0] === '--check') {
      for (const [path, value] of [
        ['pilots/australia/basket/round-11-construct-migrations.json', review],
        ['pilots/australia/basket/round-11-construct-migrations.summary.json', summary],
      ]) if (readFileSync(resolve(root, path), 'utf8') !== JSON.stringify(value, null, 2) + '\n') throw new Error(`RETAINED_OUTPUT_DRIFT: ${path}`);
      console.log('Two source-bound correction proposals reproduce; zero applied corrections; no sealed bytes changed.');
    } else console.log(JSON.stringify(args[0] === '--summary' ? summary : review, null, 2));
  } catch (error) { console.error(String(error)); process.exitCode = 1; }
}
