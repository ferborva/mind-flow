---
id: round-10-frozen-handoff
title: Round 10 frozen handoff, measured limits intact
type: internal-review
status: frozen-for-independent-review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Review the candidate, not the seal tree

**Round 10 is frozen for independent review, not approved for merge.**
The exact candidate is `1c2b69478322280bd7b269ca1fb0732458531cc1`, tree
`a8084b74bdd40e3567c0139c6114a1fffee93c5c`. Its
[eight-track brief](../meta/round-10-external-review-brief.md) includes separate
measurement depth, breadth and storm-criterion reviews. Main remains at
`31febcb31048b00191fa6c5024897ac6c281c93e`.

This later seal adds only the receipt, four seal regressions, its unconditional
CI verification step and this note. Those additions are not falsely included
in the earlier candidate or its test count. The candidate has no receipt file
because a non-circular receipt must be retained afterwards.

## Retained reproduction

- Policy: `review-freeze.round-10`, version `1.0.0`.
- Same-family receipt edition: `1.1.0`, including recorded Git LFS.
- Execution ID: `round-10.review-inputs.88fe8b5a-9b2b-4032-8019-329aee66d8c0`.
- Receipt created: `2026-09-10T08:44:38.536Z`.
- Receipt content hash:
  `sha256:5b9f576c60d19a7d52c6f960efe442c77cc4b21e663dc33501ce3872b4f824f7`.
- Complete receipt-file hash:
  `sha256:360f5a93ee00f47d50d08fb5d8c818601151dd4b46b748ff426ab0f8dc5c86ff`.
- All 43 commands passed; all 243 required files and the entire tracked tree
  were bound. No changed tracked paths or unexpected files were found.
- The full `npm test` transcript contains 18 suites and 1,145 tests, with no
  failures, skips, cancellations or todos. Additional repeated test commands
  are not added to that unique full-suite count.
- Both candidate CI runs passed: `34452969163` and `34452965465`.

The command span is 08:03:49.809 through 08:43:50.479 UTC. Repeated full-tree
checks between commands explain much of the duration; the full test command
itself ran 08:04:35.977 through 08:09:36.505 UTC. Public dependency installation
used explicitly approved network access. No source collector, registration,
scorer, appointment or editorial publisher was run by the freeze policy.

Root and a separate agent verified the receipt integrity and inspected its
retained transcript. That is **not an independent full replay or transcript
authentication**. Before merge, independent reviewers must rerun all declared
commands against the exact candidate under the
[time-bounded trust decision](round-10-receipt-trust-decision.md).

Verify from a complete-history, LFS-hydrated seal checkout:

```sh
node meta/review-freeze/review-freeze.mjs verify --policy=round-10 --manifest=meta/review-freeze/round-10.review-freeze.json
```

Use a separate detached candidate checkout for independent reproduction.
Do not overwrite the receipt. New executions require new output paths and
their own UUID identities; historical Round 09.1 receipts remain untouched.

## Outcomes and gates that remain open

Three native families retain 50/50/49 country coverage, but all 1,000 social
criterion periods remain `cannot-say`. Direct income-route disruption,
household mapping and measured binding-category change are missing. There is
no measured storm panel, social fire/miss/false-alarm matrix or forecast-skill
claim. Real IF evolution remains **zero new, one total**.

The [Canadian research forecast](../forecasts/prospective-pilot/round-10-canada/issuance-note.md)
was issued at 07:56:37 UTC after provider registration and fresh readback.
Its probability is 0.090909; baselines are 0.483333 and 0.5. Its native October
target resolves between 6 November and 31 December. It remains unscored and
externally unverified. The original defective NERO record remains disclosed.

The evidence-only NERO scheduler is implemented and tested but inactive until
main integration and permissions are confirmed. The adjudicator proposal is
not an appointment or a new retrospective void ground. Name the If is ready
for section-level human sign-off, not publication. WHEN is below 5% only under
the standalone-disclaimer classification; the broader 5.13% classification
remains above the gate. Literal distinct historical receipt IDs remain unmet.
Original receipt bytes, schemas and the naughty-kid draft are unchanged.

Human/affected-party review has not happened. The initial oversized B commit,
uncompleted GP construct migrations and named technical deferrals remain
visible. Passing reproduction does not remove these findings. Stop here for
external review; no Round 10 main merge or editorial publication is authorised.
