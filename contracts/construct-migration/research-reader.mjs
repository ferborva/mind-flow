import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { buildRound11MigrationReview, previewReaderAdoption } from './review.mjs';

const root = resolve(import.meta.dirname, '../..');
const editionId = 'mind-flow.research-reader-migration/1.0.0';
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const bindings = [
  ['contracts/construct-migration/research-reader-review-evidence.json', 'aa113b69631de6aa5d271c2f449ab2eac23914b4c0735ada3a90407ab14a93f0'],
  ['contracts/construct-migration/research-reader-adoptions.v1.json', '24610ea035a403351b56138bbb5daae0e713c97819962fe7e0b3b50f392f8353'],
  ['pilots/australia/basket/round-11-construct-migrations.json', '20f543f993e66fc5b5a7abfae3daf2ef468556404ea26f01252513c23d511a1c'],
].map(([path, hash]) => ({ path, sha256: 'sha256:' + hash }));
const readBound = source => {
  const bytes = readFileSync(resolve(root, source.path));
  if (digest(bytes) !== source.sha256) throw new Error(`RESEARCH_READER_SOURCE_MISMATCH: ${source.path}`);
  return JSON.parse(bytes);
};
const at = (document, pointer) => pointer.split('/').slice(1).reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], document);
const definitionRef = meaning => ({ condition_id: meaning.condition_id, definition_version: meaning.definition_version, definition_hash: meaning.definition_hash });

/** Build a NEW research presentation reader. This does not apply a kernel
 * construct correction, admit observations, alter old files or grant authority.
 * The explicit adoption manifest is required; readers are not auto-rebound.
 */
export function buildResearchReaderEdition() {
  const [reviewEvidence, intent, retainedProposal] = bindings.map(readBound);
  const proposal = buildRound11MigrationReview();
  if (!same(retainedProposal, proposal)) throw new Error('RESEARCH_READER_PROPOSAL_REPLAY_MISMATCH');
  const readers = intent.selected_readers.map(selection => {
    const migration = proposal.migrations.find(m => m.id === selection.migration_id);
    const existing = migration?.readers.find(r => r.reader_id === selection.reader_id);
    if (!migration || !existing || selection.proposed_meaning_hash !== migration.proposed_meaning.definition_hash
      || selection.scope !== 'interpretation-metadata-only' || selection.historical_observation_transfer !== 'none') throw new Error('RESEARCH_READER_ADOPTION_SCOPE_MISMATCH');
    const preview = previewReaderAdoption(proposal, migration.id, existing.reader_id, {
      migration_hash: selection.migration_hash, acknowledge_non_equivalence: selection.acknowledge_non_equivalence,
    });
    if (!existing.pointer.endsWith('/condition_definition_ref')) throw new Error('RESEARCH_READER_SOURCE_POINTER_UNSUPPORTED');
    const artifact = proposal.source_artifacts.find(s => s.path === existing.path);
    const original = readBound(artifact);
    const pointer = existing.pointer.slice(0, -'/condition_definition_ref'.length);
    const context = at(original, pointer);
    if (!same(context.condition_definition_ref, preview.previous_binding)) throw new Error('RESEARCH_READER_OLD_BINDING_MISMATCH');
    return {
      reader_id: existing.reader_id, reader_edition: editionId, role: existing.role,
      source: { ...artifact, pointer },
      migration_id: migration.id,
      previous_binding: structuredClone(preview.previous_binding),
      presentation_binding: structuredClone(preview.proposed_binding),
      corrected_interpretation: structuredClone(migration.proposed_meaning),
      unanswered_question: migration.unanswered_question,
      adoption: {
        record_ref: bindings[1].path, migration_hash: selection.migration_hash,
        acknowledge_non_equivalence: selection.acknowledge_non_equivalence,
        scope: selection.scope, status: 'applied-in-this-new-research-reader-edition',
        recorded_on: intent.recorded_on, actor: intent.author,
      },
      retained_original_context: structuredClone(context),
      context_boundary: 'Historical context retains its old identity. The new presentation meaning does not admit, transfer or evaluate these values under the new condition.',
      historical_values_admitted_under_new_identity: false, admitted_observations: [],
      truth_state: 'not-evaluated', old_reader_modified: false,
      human_approval: false, action_authorised: false,
    };
  });
  const edition = {
    id: 'round-11-research-reader', edition: editionId, status: 'local-research-reader-edition',
    authored_on: intent.recorded_on, author: intent.author,
    sources: structuredClone(bindings), review_evidence: reviewEvidence,
    review_boundary: 'Independent AI review covers source meanings and the preview adapter. This subsequent reader edition needs its own implementation review; no human or operational approval is implied.',
    readers,
    completed_kernel_corrections: 0, kernel_events_appended: 0, observations_transferred: 0,
    existing_appended_kernel_events: proposal.existing_appended_kernel_events,
    programme_three_event_gate_met: false, authority_effect: 'none',
    human_approval: false, operational_action_authorised: false, public_release_approved: false,
  };
  return {
    edition,
    summary: {
      id: 'round-11-research-reader-summary', edition: editionId, status: edition.status,
      applied_reader_metadata_adoptions: readers.length,
      corrected_meanings_used: new Set(readers.map(r => r.presentation_binding.condition_id)).size,
      completed_kernel_corrections: edition.completed_kernel_corrections,
      kernel_events_appended: edition.kernel_events_appended,
      observations_transferred: edition.observations_transferred,
      existing_appended_kernel_events: edition.existing_appended_kernel_events,
      programme_three_event_gate_met: edition.programme_three_event_gate_met,
      human_approval: false, operational_action_authorised: false, public_release_approved: false,
      page_path: 'pilots/australia/basket/round-11-research-reader.html',
      boundary: 'Three explicit metadata adoptions in this new local research reader are not three kernel corrections, evidence admissions or improvements in access.',
      items: readers.map(r => ({ reader_id: r.reader_id, role: r.role, previous_binding: r.previous_binding,
        presentation_binding: r.presentation_binding, adoption_status: r.adoption.status,
        truth_state: r.truth_state, unanswered_question: r.unanswered_question })),
    },
  };
}

/** Exact edition replay. This is a content-integrity check, not authenticated review. */
export function validateResearchReaderEdition(edition) {
  try {
    if (!same(edition, buildResearchReaderEdition().edition)) return { valid: false, code: 'RESEARCH_READER_EDITION_MISMATCH' };
    return { valid: true, code: null, truth_evaluated: false, action_authorised: false };
  } catch (error) { return { valid: false, code: 'RESEARCH_READER_SOURCE_INVALID', error: String(error) }; }
}

function requireEdition(edition) {
  if (!validateResearchReaderEdition(edition).valid) throw new Error('INVALID_RESEARCH_READER_EDITION');
}

export function assessResearchReaderBinding(edition, readerId, binding) {
  requireEdition(edition);
  const reader = edition.readers.find(reader => reader.reader_id === readerId);
  let code = 'UNKNOWN_RESEARCH_READER';
  if (reader) code = same(binding, reader.previous_binding) ? 'STALE_RESEARCH_MEANING'
    : same(binding, reader.presentation_binding) ? 'RESEARCH_METADATA_BOUND' : 'RESEARCH_BINDING_MISMATCH';
  return { code, metadata_bound: code === 'RESEARCH_METADATA_BOUND', truth_evaluated: false, action_authorised: false };
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function renderResearchReader(edition) {
  requireEdition(edition);
  const rows = edition.readers.map(reader => {
    const meaning = reader.corrected_interpretation;
    const old = assessResearchReaderBinding(edition, reader.reader_id, reader.previous_binding);
    const current = assessResearchReaderBinding(edition, reader.reader_id, definitionRef(meaning));
    return `<article><p class="eyebrow">${escape(reader.role)}</p><h2>${escape(meaning.condition_category)}: ${escape(meaning.geography)}</h2>
<p><strong>${escape(meaning.measure)}</strong></p><dl><dt>Population</dt><dd>${escape(meaning.population)}</dd><dt>Denominator</dt><dd>${escape(meaning.denominator)}</dd>${meaning.clock_origin ? `<dt>Waiting clock starts at</dt><dd>${escape(meaning.clock_origin)}, not the first attempt to access care.</dd>` : ''}<dt>Rate and coverage</dt><dd>${escape(meaning.rate_kind)}. ${escape(meaning.coverage_change)}</dd></dl>
<p class="state">Old binding: ${escape(old.code)}<br>New reader binding: ${escape(current.code)}<br>Truth: ${escape(reader.truth_state)}. No observation transferred.</p>
<p><strong>Still unanswered:</strong> ${escape(reader.unanswered_question)}</p>
<details><summary>Inspect the explicit adoption and old source context</summary><p>${escape(reader.context_boundary)}</p><p>Source: <a href="../../../${escape(reader.source.path)}">${escape(reader.source.path)}</a> ${escape(reader.source.pointer)}</p><p class="hash">${escape(reader.source.sha256)}</p><pre>${escape(JSON.stringify({ adoption: reader.adoption, previous_binding: reader.previous_binding, presentation_binding: reader.presentation_binding, retained_original_context: reader.retained_original_context }, null, 2))}</pre></details></article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Research reader, corrected meanings</title><style>body{font:18px/1.55 system-ui;background:#091719;color:#e2f1eb;max-width:960px;margin:auto;padding:24px}a{color:#bdeaba}h1{line-height:1.15}article{padding:24px;border:1px solid #43625d;border-radius:16px;margin:24px 0}.eyebrow,dt{font-size:.8rem;text-transform:uppercase;color:#b6cbbd;letter-spacing:.08em}dd{margin:0 0 12px}.state{padding:14px;background:#142e2c;border-left:3px solid #bdeaba}summary{cursor:pointer}pre,.hash{overflow-wrap:anywhere;white-space:pre-wrap;font-size:.78rem}a:focus-visible,summary:focus-visible{outline:3px solid #edc68d;outline-offset:4px}</style></head><body><header><p class="eyebrow">New local research edition, not an operational release</p><h1>Research reader, corrected meanings</h1><p>${edition.readers.length} metadata adoptions. ${edition.completed_kernel_corrections} completed kernel corrections. No new observations or human approvals.</p><p><strong>Not a personal access assessment.</strong> Correcting what a statistic means does not establish that people can obtain care. Historical context remains attached to its original identity.</p><a href="../../../dashboard/station/index.html#if-evolution">Return to the station</a></header><main>${rows}</main><footer><p>${escape(edition.review_boundary)}</p><p>No participant contact, public warning, authority appointment or personal recommendation is authorised. The old sealed kernel and old readers remain unchanged.</p><a href="../../../contracts/construct-migration/research-reader-review-evidence.json">Inspect retained independent-agent review and its limits</a></footer></body></html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['--check', '--json', '--summary', '--html'].includes(args[0])) throw new Error('Use --check, --json, --summary or --html. No writes are performed.');
    const pack = buildResearchReaderEdition();
    const html = renderResearchReader(pack.edition);
    if (args[0] === '--check') {
      for (const [path, expected] of [
        ['pilots/australia/basket/round-11-research-reader.json', JSON.stringify(pack.edition, null, 2) + '\n'],
        ['pilots/australia/basket/round-11-research-reader.summary.json', JSON.stringify(pack.summary, null, 2) + '\n'],
        ['pilots/australia/basket/round-11-research-reader.html', html],
      ]) if (readFileSync(resolve(root, path), 'utf8') !== expected) throw new Error(`RESEARCH_READER_OUTPUT_DRIFT: ${path}`);
      console.log('Three new-reader metadata adoptions reproduce; no kernel corrections or observation transfers.');
    } else if (args[0] === '--html') process.stdout.write(html);
    else console.log(JSON.stringify(args[0] === '--json' ? pack.edition : pack.summary, null, 2));
  } catch (error) { console.error(String(error)); process.exitCode = 1; }
}
