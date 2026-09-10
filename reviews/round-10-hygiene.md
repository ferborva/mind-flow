---
id: round-10-hygiene
title: Round 10 hygiene disposition and preserved evidence
type: internal-review
status: review
provenance: commissioned-proposal
author: Ren
authority: none
created: 2026-09-10
updated: 2026-09-10
---

# Round 10 hygiene

**The new changes enforce Ren's display-name casing in forecast/review
Markdown and pin the accepted Round 09.1 freeze hash directly in its seal
test.** Already merged closure repairs are exercised, not rewritten. No
receipt, issued JSON, preregistration, registered dependency code or source
capture is changed by this lane.

## Scoped check table

| Requested item | Disposition and evidence |
| --- | --- |
| Extend author casing to `forecasts/` and `reviews/` | Implemented. Both roots and future nested documents reject lowercase/mixed-case/quoted variants of Ren. Other authors, canonical Ren and source/foundation exemptions remain. Eleven existing notes receive casing-only metadata changes. |
| Canonical freeze hash directly in seal test | Added to `contracts/tests/ci-round09-1-seal.test.mjs`: accepted hash `sha256:489204811340cbc49466ac6b198a509550cffaf8e1eb4dee71db47561b8cf024`, candidate and successful reproduction. Substitution of failed hash or status fails. Existing complete-file pins and blocked-receipt checks remain. |
| Distinct `freeze_id` values for canonical/blocked receipts | Pending coordinator disposition. Both original receipts remain byte-identical. Existing attempt index already distinguishes executions but does not give the embedded receipts different `freeze_id` values. This requested gate is not marked closed. |
| Layout replacement must fail loudly | Already merged in `31febcb`. `dashboard/tests/primary-care-layout-control.test.mjs` rejects missing, changed and duplicate CSS anchors before browser launch. No implementation change. |
| Error-disclosure command directly in CI | Already merged in `31febcb`. `contracts/tests/round09-1-closure.test.mjs` rejects omission, duplicate, conditional, overridden and failure-tolerant invocation; direct read-only CLI check rerun. |
| WHEN `updated:` | Already `2026-09-10` in merged baseline, guarded by editorial regression. Round 10's separate E lane preserves the date. |
| “Round 6” workflow step label | Already corrected to Round 06 in merged baseline, with a closure regression. No command or policy change. |

## Before-edit dependency inventory

Before changing any Markdown, all JSON files under `forecasts/` were scanned
for the complete-file digests and paths below. **No affected note's old
digest occurs in any forecast JSON.** Both Round 09 resolver dependency sets
(five original paths and nine corrected paths) contain implementation/test
files, not these notes. This is a declared dependency inventory, not a claim
of complete transitive runtime closure.

The sole path reference is the corrected registration request's link to
`round-09-nero/error-notice.md` at historical commit `56c8434`. It stays
unchanged and continues to address the historical note. Receipt tracked-tree
and review-input hashes refer to their named historical candidate commits;
editing a current display name does not rewrite those retained commitments.

| Casing-only note | SHA256 before edit |
| --- | --- |
| `forecasts/prospective-pilot/round-09-nero/error-notice.md` | `ca86e82de9976711a53296724090ddf00a066d154d9ece008f913be0468b1981` |
| `forecasts/prospective-pilot/round-09-nero/issuance-note.md` | `bb5383dcc14ae9814b16a473d4d114c7b9bea0f646d44e88dc6c54748ca4a643` |
| `forecasts/prospective-pilot/round-09-nero-corrected/issuance-note.md` | `1a328308dcc6c26c8553eec65a5f61581040fbac5c56d733b82d130e7ab0c50c` |
| `reviews/round-08-1-dispositions.md` | `a0b44d36ac836b3defd4d55a688fb85623d608a25b5dc05ba750b79767f0dfca` |
| `reviews/round-08-1-forecast-intake.md` | `bfd94a0f158bf4b2988848bf42f45fdd787ff34dd57368604efc4e1f5af52cd3` |
| `reviews/round-08-1-threshold-domain-audit.md` | `83e6af3256852e674edfa08ef8ab6ec59063b1f7bd4874dc8414bf2361f03a32` |
| `reviews/round-08-disclaimer-inventory.md` | `1bddf9949a07ecc479497be74a11efbfda5c3490a97c3ff20b30faa084665c3c` |
| `reviews/round-08-measurement-independent-review.md` | `ba37359fe2b8539ea775375e2fbc9b14600382ba07167f700090c95be591831e` |
| `reviews/round-08-narrative-provenance.md` | `5f32c2c75fe65e0a6c47ea6f3b03ccf01b723510181d34e8c58637b9097601f2` |
| `reviews/round-09-forecast-correction.md` | `b175547bb5dc0b879c00cc17488780031913e02ecdedc1a16728db9c108c5cf1` |
| `reviews/round-09-forecast-intake.md` | `833c46acc40ce73635d69b387d18caab4552661ebe395cbc5d8502bfb651c472` |

Only `author: ren` becomes `author: Ren`; prose, embedded JSON logs, dates
and all other metadata stay identical. Mechanical casing does not change a
substantive `updated:` date. Historical receipts continue to preserve their
original note hashes and authorship spelling.

## Validation and limits

The hostile casing test first failed on the current validator for a lowercase
forecast-note author; it passed after extending the root set. It tests nested
and future paths, five casing variants, canonical quoted/unquoted names and
other authors. The repository frontmatter audit then passed after the eleven
display-name repairs.

The new direct seal assertion passes on the already retained accepted
receipt. It is added coverage, not a claim that the receipt bytes previously
failed. It also rejects accepted/blocked substitution. Existing hostile
closure tests prove the already merged fixes remain in force. No new receipt
is created to claim these tests ran in a past round.

On Node 22, all 25 focused casing/editorial/seal/closure/layout tests and all
79 communications tests passed in this lane's A-based checkout. The direct
disclosure command reported admission blocked, no formal void and null scores.
An exact comparison with the lane baseline confirmed all eleven existing
Markdown changes are only the author-casing replacement. Frontmatter audit
and whitespace checks pass. The coordinator owns the combined-round test
count and artifact-lock update after integration with the editorial lane.

## Named deferrals

- **Receipt forgery:** a coherent fabricated command transcript can still pass
  verification because verify does not independently re-execute those
  commands. Coordinator to record either one-command re-execution or formal
  boundary acceptance for the 16 September review. This lane makes no
  governance decision and does not alter the verifier.
- **Hash-domain separation:** schema-2 design remains deferred to the
  16 September review. No schema or digest-domain migration here.
- **Repository/history weight:** current binary controls do not remove
  inherited Git history weight. No history rewrite is performed.
- **Inherited macro raw inputs:** eight inherited macro series still require
  retained upstream raw-input closure. No new measurement claim from casing.
- **Receipt identity:** preserve originals versus an additive versioned
  disposition is awaiting the coordinator's recorded answer. Do not silently
  mark the literal distinct-freeze-id requirement met by the attempt index.
