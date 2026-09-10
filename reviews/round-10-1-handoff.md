---
id: round-10-1-frozen-handoff
title: Round 10.1 frozen repair handoff
type: internal-review
status: frozen-for-independent-review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Review the repair candidate, not the later seal tree

**Round 10.1 is frozen for independent closure review, not approved for merge.**
Review candidate `05073cdb80eb1d834aff9a06e35670a9c58af4e5`, tree
`e7d272c4ef64656dcad18d7a8ad165c388b49874`, on existing PR #33 and branch
`ren/round-10`. Main remains `31febcb31048b00191fa6c5024897ac6c281c93e`.
The original candidate `1c2b694` and seal `e04a287` remain in history.

The [closure brief](../meta/round-10-external-review-brief.md) and
[53-finding disposition ledger](round-10-1-dispositions.md) cover 16 P2 repairs
and 37 P3 repairs, disclosures or explicit deferrals. No new data acquisition,
forecast issue, real IF evolution event, application or public post is claimed.

This separate seal adds exactly four files/changes: the new receipt, four seal
regression tests, its unconditional CI verification step, and this note. They
are not included retroactively in the candidate's reproduced tree or test count.
The existing policy and schema are unchanged; a new path and UUID identify
this execution without overwriting any historical receipt.

## Retained reproduction

- Policy: `review-freeze.round-10`, version `1.0.0`; receipt edition `1.1.0`.
- Execution ID: `round-10.review-inputs.6aa7a0c9-0376-424b-804d-a0836b7b4d4e`.
- Created: `2026-09-10T12:39:52.008Z`.
- Content hash: `sha256:bcaf0729a5a5f0b4137ac4df37cfcac8c19d2c931aac5abd06e94ba273a3e318`.
- Receipt-file hash: `sha256:3c4b41d660901c83f73802be9aaabf958c21f26857eaef5fcd7e85e907a6475e`.
- All 43 commands passed, binding 243 required files and the full tracked tree.
  Every before/after tree and runtime-control check passed. No changed tracked
  paths or unexpected files were found.
- Full suite: 18 suites, 1,171 tests, zero failures, skips, cancellations or todos.
  Repeated focused commands are not added to this unique full-suite count.
- Both exact-candidate CI runs passed: `34474144476` and `34474141863`.
- The four later seal tests passed separately. Seal CI outcomes are recorded
  on PR #33; they do not change the frozen candidate's count.

Root and a separate agent verified receipt integrity, recomputed hashes and
inspected the retained transcript. **This is not independent full execution,
environmental independence or transcript authentication.** The prior independent
review also used the same host/runtime bytes. Closure reviewers must reproduce
the declared commands against the exact candidate under the existing
[time-bounded trust decision](round-10-receipt-trust-decision.md), not infer
execution or approval from a self-consistent hash.

From a complete-history, LFS-hydrated seal checkout:

```sh
node meta/review-freeze/review-freeze.mjs verify --policy=round-10 --manifest=meta/review-freeze/round-10.1.review-freeze.json
```

Use a separate detached candidate checkout for independent execution. Preserve
this receipt; further executions need distinct output paths and UUIDs. The
long reproduction includes full tracked-tree checks around every command.
No live source acquisition, forecast issuance, outcome resolution/scoring or
editorial publication occurred. Tests and read-only replay exercised those
mechanisms.

## What did and did not change

Threshold and checked-in bindings are pinned; CI steps reject weakening; the
reader defines its states and denominator and shows dated native comparisons.
Beneficial shifts expose the pending direction decision. An independent repair
check found a remaining decimal half-tie after the first fix; exact decimal
quantisation and a new regression closed it before this candidate was selected.
Provisional IF definitions explicitly express the direct arm only and cannot
admit real country observations. Vintage changes no longer change their meaning
hashes. Name the If stays at `review`, with seven approvals pending.

All 1,000 country-periods remain structurally `cannot-say`; three native families
still cover 50/50/49 economies. Nine adverse and eleven beneficial native
crossings are context, not measured storms or skill. Real IF evolution remains
zero new, one total. Direct income-route disruption, household linkage, binding
diagnoses and social outcome labels are still missing. The broader WHEN gate,
literal historical receipt-ID request, comprehensive Git-author enforcement and
named technical deferrals remain open as dispositioned. No human/affected-party
review, appointment, publication or active NERO scheduler is implied.

The Canadian issue remains unscored and byte-identical, with issued-file SHA-256
`fd35bf9998830c4ba3d9d42bcd94feefd1fce29c70b144042754239df2e01140`.
Its human-account, self-posted registration is now explicit in unsealed notes;
the sealed closure is unchanged. Original source captures and the naughty-kid
draft remain untouched. The Observatory's substantive payload is unchanged;
only its validation-context metadata changed.

Stop here for independent closure review. Passing reproduction is not approval
to merge Round 10.1, appoint an adjudicator or publish the draft.
