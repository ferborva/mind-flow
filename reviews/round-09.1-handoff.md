---
id: round-09.1-handoff
title: Round 09.1 candidate and seal handoff
type: internal-review
status: ready-for-independent-review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# Round 09.1 handoff

**Review candidate `84456bbb2a2355a93e98db69e661928dd6593801` on PR #16.**
Its Git tree is `85d86834a7b6081546b4ce2f0eba2e017fd9aa9e`.
The [disposition ledger](round-09.1-dispositions.md) covers every independent
finding, tests, browser evidence and unresolved gates. This later handoff is
outside the candidate, as are its receipt and seal-only CI guards.

## Verification layers

- **Integrated local suite:** 1,053 tests, all 18 suites, zero failures,
  cancellations or skips, Node 22.23.2.
- **Candidate GitHub CI:** both Integrity runs passed,
  [34437653002](https://github.com/ferborva/mind-flow/actions/runs/34437653002)
  and [34437657035](https://github.com/ferborva/mind-flow/actions/runs/34437657035).
- **Browser:** Chromium 149.0.7827.55, Puppeteer 24.40.0, 1280x900 and 390x900.
  All 15 body headers scroll normally and match body typography; column headers
  remain sticky. Regression control and screenshots inspected, as documented in
  the ledger. This is separate local evidence, not a browser run in CI/freeze.
- **Earlier receipts:** all six normal verifications passed with unchanged
  bytes. The prior [handoff](round-09-handoff-cover-note.md) now points to both
  Round 09 receipts, including the pre-steer `ac47bf...` record.

## Network-blocked attempt and authorised retry

The first detached attempt failed to install pinned dependencies because the
sandbox could not resolve `registry.npmjs.org` (`ENOTFOUND`). A separate network
probe was denied by the allowlist. This is an execution-environment failure,
not evidence of a passing candidate or a newly discovered measurement defect.
The complete failed attempt is retained separately. The authorised retry uses
the same candidate, policy, lockfile and ordered 34 commands. No dependency,
source or repair code was changed to obtain a different result.

The [blocked-attempt receipt](../meta/review-freeze/round-09.1.network-blocked.review-freeze.json)
has hash `sha256:f48fe292c080e34b28cd691cce14047016339df4cc9f434ea3b8ff6b091d6b9a`.
It retains all 34 command records: 24 failures, no tracked-tree drift and no
unexpected paths. Its normal verifier confirms integrity but exits **2**, since
reproduction failed. A seal regression checks that it cannot be admitted as a
successful run. It was moved, without byte changes, from the initial output
filename before any canonical successful receipt was placed there; no existing
receipt was overwritten or relabelled as success.

The authorised retry **passed all 34 commands**, with no tracked-tree drift or
unexpected files. Its [canonical receipt](../meta/review-freeze/round-09.1.review-freeze.json)
has hash `sha256:489204811340cbc49466ac6b198a509550cffaf8e1eb4dee71db47561b8cf024`.
The policy is `review-freeze.round-09.1` version `1.0.0`, with checksum
`sha256:76e7c58b714631a5b586c1dc62dc48a38fbe87ac6dcaf5a83bdc0c175c204b90`.
The retained full-suite output independently recounts 1,053 passed tests across
18 suites, no failures or skips. Normal verification passes. Applying the older
Round 09 policy fails with `REVIEW_POLICY_MISMATCH`; no failure override is used.

The successful receipt was created at a distinct `network-authorised` output
path, then moved unchanged to the canonical path after the failed attempt had
been moved aside. Both complete outcomes remain in the seal with their own
timestamps and hashes. Their shared candidate and policy identify the same
inputs, not the same execution outcome.

## Seal-only changes

The later seal adds this handoff, the two receipts, an unconditional normal
Round 09.1 verification step in Integrity, and three seal regression tests.
The three tests pass; they first failed on the missing verification step and
missing blocked-attempt disclosure. None of these five seal-only files changes
a measurement, issued forecast, evaluator or frozen repair input. Candidate
test counts must not be relabelled as the seal's complete-suite result; inspect
the Integrity run at the actual PR head for that later evidence.

## Review boundaries that remain

**The repairs do not make every programme gate green.** There is still one
actual evolution event, not three. Construct corrections now require new
identities by explicit policy, but the relationship/consumer migration remains
team-owned unfinished engineering. Basket references exist even where there is
no positive-signal measurement consumer. Current bindings remain unknown.

The restored WHEN claim ceiling stays, with 4/79 = 5.06% explicitly missing
the disclaimer target. Income-generation access remains Fernando's storm
focus; dependent-household counting and other parked choices remain unanswered.
The October scheduler is **NOT ACTIVE**. The defective forecast has a typed
error disclosure, not a formal void, denominator exclusion or appointed authority.

The current IMF workbook is now an LFS pointer to the identical 5,585,205 bytes.
Historical plain-blob commits remain reachable; no history-weight reduction is
claimed. Earlier receipts are not renamed or force-overwritten. Receipt
authentication and the historical 08.1 policy identity remain disclosed gaps.

Main remains at `80586a93694ddcd72600693e018728c6cbd1c80d` for this pass. No merge
or new PR is authorised by this handoff. Independent acceptance of these repairs
comes before a separate merge decision.
