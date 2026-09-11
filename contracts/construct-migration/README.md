# Construct migration review adapter, edition 1.0.0

**A corrected meaning can now expose stale readers before anyone adopts it. It cannot silently inherit old evidence or become an operational condition.**

This is an additive, source-pinned **review and preview edition**, implementing the first acceptance boundary in the [construct-correction policy](../executable-if/construct-correction-policy.md). It is not a new sealed truth evaluator, a general registry retirement operation or a completed migration. No old schema, evaluator, event, observation or consumer is rewritten.

## What the adapter does

1. Reopens seven exact retained artefacts and verifies their SHA-256 hashes.
2. Validates the retained current kernel using its unchanged validator.
3. Extracts the actual workbook footnotes and checks their text hashes against the retained Round 09 discoveries.
   Urgent-care crude-rate and very-remote coverage footnotes are separately retained as source-pinned known context, not new discoveries.
4. Constructs two new NSW-scoped measurement meanings, with new condition and signal identities.
5. Inventories every structured definition reference in the four explicitly named current research JSON artefacts, including their history.
6. Rejects each old basket reference against the proposed corrected meaning.
7. Allows explicit, hash-bound **preview adoption** of an existing basket or positive-signal context reader.
8. Keeps evidence transfer, operational use, independent approval, completed-event counts and action authority false.

The unchanged original question stays visible. There is no positive-signal reader for urgent GP timeliness. There is one for prescription cost. Both have actual basket readers. We do not manufacture a dependent to claim an invalidation success.

## Public functions

Import from `review.mjs` under Node 22:

| Function | Contract |
| --- | --- |
| `buildRound11MigrationReview()` | Read-only reproduction of the exact two retained proposals. Throws on changed source bytes, invalid kernel or changed source-cell content. |
| `validateMigrationReview(review)` | Validates against exact source-bound replay. Returns `{ valid, code, errors }`. This is integrity and content checking, not independent review or authenticated approval. |
| `inventoryReaders(documents, conditionId)` | Enumerates exact structured definition references with JSON Pointers. A bounded utility, not a repository-wide dependency scanner. |
| `computeMigrationHash(migration)` | SHA-256 over the edition domain and sorted-key JSON payload, excluding the hash field. A locally recomputed hash never overrides exact replay validation. |
| `assessReaderAdoption(review, migrationId, readerId, binding)` | Returns `STALE_MEANING`, a mismatch/refusal code, or `MATCHED_PROPOSAL_NOT_OPERATIONAL`. Operational usability is always false. |
| `previewReaderAdoption(review, migrationId, readerId, acknowledgement)` | Requires exact `{ migration_hash, acknowledge_non_equivalence: true }`; returns a new preview record without changing the source reader. Refuses old evidence and sealed/derived readers. |
| `buildMigrationSummary(review?)` | Validates before projecting a small station-readable object. Includes actual reference counts, unanswered questions and next gates. |

### Preview, not application

```js
const review = buildRound11MigrationReview();
const migration = review.migrations[0];
const reader = migration.readers.find(r => r.role === 'basket-definition-reader');

assessReaderAdoption(review, migration.id, reader.reader_id, reader.definition_ref);
// code: STALE_MEANING, operationally_usable: false

const preview = previewReaderAdoption(review, migration.id, reader.reader_id, {
  migration_hash: migration.migration_hash,
  acknowledge_non_equivalence: true,
});
// adoption_status: preview-only; source_reader_modified: false
```

`STALE_MEANING` means unsuitable **for the proposed corrected reader**. It does not mutate the lifecycle of the retained original condition or declare the historical record corrupt. `acknowledge_non_equivalence` is a caller acknowledgement, not an authenticated person, approval or appointment.

### Refusal codes

- `STALE_MEANING`: retained old identity/version/hash supplied to the proposed interpretation.
- `DEFINITION_BINDING_MISMATCH`: foreign identity, version, hash or extra binding fields.
- `UNKNOWN_READER`: no such actual reference in the bounded inventory.
- `HISTORICAL_EVIDENCE_REQUIRES_SEPARATE_ADMISSION`: no automatic observation transfer, even with a correct new identity.
- `SEALED_OR_DERIVED_READER_REQUIRES_NEW_EDITION`: old history and derived projections cannot be rebound through the preview API.
- `EXPLICIT_ACKNOWLEDGEMENT_REQUIRED`: missing, stale or augmented acknowledgement.
- `INVALID_MIGRATION_REVIEW`: attempted local rewrite of the source-bound review package.

## Boundaries that remain open

The new meanings have `truth_predicate: null`. Their semantic hashes belong to this review edition, **not** the executable-IF definition hash domain. They are not valid old-kernel definitions and cannot be fed into its evaluator. In particular, the former research thresholds of 100% urgent timeliness and 0% prescription cost delay are not inherited. This lane does not select a new normative threshold or claim measured access.

The inventory covers these four files only:

- `pilots/australia/basket/primary-care.kernel.current.json`
- `pilots/australia/basket/primary-care.r3.json`
- `pilots/australia/data/positive-signals-current.json`
- `contracts/evolution/fixtures/australia-primary-care.current.json`

It includes current state, retained event definitions, old observations and the evolution projection. These are **structured references**, not nineteen independent live application consumers. Archived revisions, code, prose, unbound series readers, copied web views and external consumers are explicitly outside the completeness claim.

Before application, independently review the new meanings and reference universe; resolve necessary operational condition/evidence contracts; create a reviewed operational edition; admit each eligible observation under its actual period; regenerate necessary dependent surfaces; and retain dated adoption/refusal records. The existing three-real-event gate remains unmet. This is unfinished programme work, not a fabricated success or a requirement for Fernando to supply an opinion.

## Reproduce and test

```sh
node --test contracts/construct-migration/tests/migration.test.mjs
node contracts/construct-migration/review.mjs --check
node contracts/construct-migration/review.mjs --summary
```

The CLI never writes. `--json` and `--summary` emit deterministic review artefacts; `--check` compares them with the retained files. Updating a source pin or meaning requires a new reviewed proposal change, not silently accepting a refreshed source.

## Separate research-reader edition

[`research-reader.mjs`](research-reader.mjs) implements a different, narrower operation: three explicit **interpretation-metadata adoptions in a new local research reader**. It does not turn either proposal into a completed kernel correction. The [new reader](../../pilots/australia/basket/round-11-research-reader.html) displays corrected meanings, actual old-binding refusals, and the old context under its original identity.

`buildResearchReaderEdition()` returns `{ edition, summary }`. `validateResearchReaderEdition(edition)` checks exact source-bound replay. `assessResearchReaderBinding(edition, readerId, binding)` distinguishes stale old meaning, correctly bound research metadata, unknown readers and mismatches. `renderResearchReader(edition)` validates before emitting a static page. No function writes, evaluates condition truth or grants action authority.

The authored adoption manifest selects the two actual basket references and the prescription positive-context reference. It pins migration and meaning hashes and explicitly acknowledges non-equivalence. Actual independent-agent review messages are retained separately. Those messages reviewed the source-meaning/preview work, **not this subsequent reader implementation**, and are not its authorisation or an authenticated signature. The user-approved local engineering scope authorises creation of the new research reader; human approvals and public release remain absent.

The summary's `applied_reader_metadata_adoptions: 3` is not interchangeable with `completed_kernel_corrections: 0`. The original proposal summary remains proposed-only with `applied_corrections: 0`. Historical observation arrays stay inside `retained_original_context`, with their original binding. `admitted_observations` under each new presentation identity is empty.

```sh
node --test contracts/construct-migration/tests/research-reader.test.mjs
node contracts/construct-migration/research-reader.mjs --check
node contracts/construct-migration/research-reader.mjs --summary
```

The CLI also supports `--json` and `--html`, but never writes. The implementation report is [Round 11 research-reader adoption](../../reviews/round-11-research-reader.md).
