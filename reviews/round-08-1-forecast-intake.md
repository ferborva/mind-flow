---
id: round-08-1-forecast-intake
title: Round 08.1 forecast intake repairs and immutable boundaries
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# Accept the findings without rewriting the issued forecast

The [Track 3 review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404292)
and [Round 08.1 verdict](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609403803)
are accepted for this workstream. The issued probability, target, dates,
preregistration, evaluation plan, original resolver and all sealed dependencies
remain byte-identical. These changes strengthen **current admission**, not the
historical meaning of the sealed implementation. No reissue or retarget occurred.

| Finding | Disposition |
| --- | --- |
| P2 first-retained release was procedural | Accepted. New mandatory NERO resolution intake validates the full archive, first-presence receipt, pinned chronology and native filename before current evaluation. |
| P2 confusable strings did not establish distinct adjudicators | Accepted. Current evaluation rejects punctuation/whitespace variants and embedded author/issuer skeletons. Appointment remains a separate unmet verification requirement. |
| P3 immutability is comparative | Accepted. Standalone semantics and coherent self-checks are not self-authentication; original bytes, comparative validation, registered cohort checksums and history are required. |
| P3 post-publication guard is outside the record | Accepted. The record's void policy names reasons and evidence requirements. The evaluator and registered plan enforce performance eligibility; the record alone does not. |
| P3 provider receipt is self-posted | Accepted. Provider-recorded time is verifiable, not an independent registrar or appointed authority. |

## First-presence admission, not a new resolver contract

The sealed `resolver.mts` and binary-threshold payload are unchanged. The new
`forecasts/prospective-pilot/round-08-nero/resolution-intake.mjs` wrapper:

1. Pins the original issued JSON SHA to
   `bc230310d6edb9814ef350dd58f683ca26f7fd60a9a43cd48c1ed2aacf995053` and compares
   each separate resolved record using `assertIssuedForecastImmutable`.
2. Requires the local and official-host URL filename `2026-10_nero.zip`. It
   recomputes archive SHA, matches it to the exact first-presence receipt, and
   validates the appended existing source-event chronology against the original
   sealed absent prefix and a separately supplied exact tip anchor. A different
   archive or substituted receipt cannot match the retained first entry.
3. Consumes every CSV row through the existing ZIP size/CRC verifier. Any row
   dated after 2026-10-15, including another occupation or region, rejects the
   archive. Malformed monthly dates and duplicate target cells also reject.
   Archive SHA is checked again after parsing to detect a changing local file.
4. Reuses the unchanged native extraction and closed binary JSON payload.
   Adding the review's proposed fields inside that payload would invalidate the
   sealed resolver. Instead the existing resolution-evidence `vintage` field is
   exactly `2026-10_nero.zip;first-presence=sha256:<receipt digest>`; its `source`
   is the actual official archive URL. Admission compares the whole evidence
   object to independently reconstructed bytes and metadata.
5. Admits the exact resolved object for this process only. Current cohort
   evaluation refuses a resolved NERO record without that admission, or after
   any mutation. A persisted `admitted: true` flag cannot substitute for rerunning
   the archive and receipt checks. The old low-level resolver/scorer remains a
   compatibility primitive, not the approved standalone resolution workflow.

First-presence means the **first retained event in the supplied anchored
chronology**. The anchor must be retained when the acquisition occurs, separately
from the later resolution. Do not create a replacement chronology after seeing
an outcome. Neither a caller-supplied tip nor filename authenticates a publisher
or proves that no earlier public release existed. The existing validator rejects
multiple presence entries; later corrections belong in separate disclosed
correction records, not an overwritten first receipt. Same-month publisher
revisions require the original first-presence archive hash, not merely the right
filename. No real October outcome or future receipt was created in these tests.

Retain the exact first-presence event bytes, appended event array and separately
captured tip context before preparing a resolved record. Publication, observation
and acquisition clocks remain distinct claims: do not substitute an observed
time for an unknown publisher publication time. The intake checks their ordering
and leaves publisher/global-first-publication verification false.

### Read-only operational check

After acquisition, prepare evidence with `prepareNeroResolutionEvidence`, append
a separate resolved record and run the following command. It never rewrites the
issue record, preregistration, receipt or plan. The command pins the original
registered plan checksum as well as running existing plan semantics.

```sh
node --experimental-strip-types forecasts/prospective-pilot/round-08-nero/check-resolution.mjs \
  --forecast PATH_TO_SEPARATE_RESOLVED_RECORD \
  --archive PATH_TO_2026-10_nero.zip \
  --first-presence PATH_TO_EXACT_SOURCE_EVENT_RECEIPT \
  --chronology PATH_TO_APPENDED_EVENT_ARRAY \
  --chronology-tip PATH_TO_SEPARATELY_RETAINED_TIP_CONTEXT \
  --source ACTUAL_OFFICIAL_ARCHIVE_URL \
  --published-at RETAINED_CLAIMED_PUBLICATION_UTC \
  --retrieved-at ACTUAL_ARCHIVE_ACQUISITION_UTC \
  --as-of ACTUAL_EVALUATION_UTC \
  --plan forecasts/prospective-pilot/round-08-nero/evaluation-plan.json
```

These are argument placeholders, not fabricated source records or dates. Missing
or inconsistent inputs fail visibly. Acquisition, any external tip witnessing
and appointment decisions still require their own real evidence and authority.

## Distinct strings do not appoint people

The original Unicode 16 UTS #39 table and sealed `identity.mjs`/`registry.mjs`
remain unchanged. `forecasts/lib/adjudication-intake.mjs` adds a conservative
comparison policy at unsealed evaluation intake: remove Unicode punctuation and
whitespace after the original skeleton, then reject a claimed adjudicator whose
skeleton contains the author or original issuer skeleton. This can reject
genuinely distinct people, especially for short names. It is a rejection
heuristic, not an identity system or evidence of appointment.

A distinct name still reports `appointment_verified: false` and
`identity_authenticated: false`. There is currently no authenticated appointment
mechanism in these records. Consequently an otherwise score-eligible cohort
with any void retains its denominator and withholds performance with
`adjudicator_appointment_not_independently_verified`. Existing stronger lifecycle,
post-publication and coverage withholding reasons take precedence. No input flag
can self-certify appointment. A future appointment workflow needs separately
reviewed evidence and authority; string similarity must never stand in for it.

## Comparative immutability and provider provenance

The record's self-checking hashes can detect an inconsistent edit, not establish
that a consistently rewritten record is the original. Detection relies on the
retained issued SHA, `assertIssuedForecastImmutable`, the original plan's cohort
checksum and repository history. Current intake preserves those comparisons.
`void_policy` in the forecast carries allowed reasons and required evidence, not
the evaluator's post-publication scoring guard. The original issued evaluation
report is historical evidence and remains byte-identical, including withheld
performance. The new guard does not retroactively rewrite that report.

The genuine GitHub comment was posted using collaborator account `ferbo-atl`.
GitHub's recorded creation time, `2026-09-09T11:23:03Z`, is separately inspectable
and matches the retained 3,414 response bytes. It was self-posted, not recorded by
an independently appointed registrar. The local `issued_at` is also a caller-
supplied clock, not an authenticated timestamp. The containing commit provides
another recorded event, not proof of institutional independence.

## Verification

Focused negative tests reject the listed identity variants without constructing
an offensive score-manipulation workflow. Tiny synthetic archive tests cover
post-October rows, full-stream consumption, wrong filename/host/hash, missing
receipt/tip, a second presence event, retained metadata and post-admission drift.
The real issued-file check recomputes the original report exactly. All sealed
files remain unchanged; no binary fixture or new schema family is added.
