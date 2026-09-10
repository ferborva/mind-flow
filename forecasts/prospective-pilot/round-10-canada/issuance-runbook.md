---
id: round-10-canada-real-issuance-runbook
title: Canadian forecast real-clock issuance and resolution gates
type: technical-proposal
status: proposed
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Approval-gated Canadian issuance

**This runbook and CLI do not authorise execution.** Root and independent peer must review the final source commit, exact target, probabilities, calendar, fresh absence and all implementation dependencies first. No forecast has been issued by writing this document. Freeze this runbook and README before sealing; record any later actual status in a separate issuance note, never by editing the sealed source closure.

## Fixed external operation

After explicit approval, `register` makes exactly one `POST /repos/ferborva/mind-flow/issues/42/comments` on the existing PR42 review thread (already integrated into central). Its body contains the protocol ID, sealed protocol-content SHA-256, source commit and research-only/self-posted receipt disclaimer. It does not create an issue or PR, edit an existing comment, send email, or publish outcome claims. It then GETs the exact returned comment ID. API version `2026-03-10` was verified by a read-only PR42 GET before implementation was finalised.

GitHub comments **can be edited**. This is a self-posted, provider-timed registration, not an immutable provider comment, independent registrar, institutional approval or authenticated local clock. Creation/update times and exact body/identity are checked through readback. Exact HTTP response/readback bytes and capture records become write-once local evidence. Their subsequent repository commits and final artifact lock provide immutable local addresses; the current provider comment remains mutable. The typed receipt stays `unverified_external_review_required`.

## Sequence and command boundaries

1. Complete the final source review and commit every dependency, native input, calendar, absence capture, generated basis, CLI, tests and this runbook. Root and peer approve that source commit. All baseline and future native selectors are fixed. The reported companion is excluded from the storm panel.
2. The distinct reviewed absence response must already have completed before sealing. It is currently the 07:14:56.435-07:14:59.012 UTC capture, recorded prospectively at 07:15:00 after rounding completion up. It contains 128 complete native rows and no October target. Refreshing it, if needed, is a separate reviewed source change with new bytes/receipt/pins, never an unreviewed command-line path or baseline overwrite.
3. Only after local-seal approval run `node forecasts/prospective-pilot/round-10-canada/issuance.mts seal --approved-local-seal`. It takes the actual local clock and current full Git commit, checks every closure byte against that commit, and writes a new `issuance/seal/` bundle. Issue opens exactly ten minutes after sealing, leaving time to commit, push, review and register. A seal too near the fixed 30 September issue close is rejected. There is no caller-supplied date override.
4. Commit the exact seal bundle, push it for independent anchor review, and obtain explicit approval for the one PR42 comment. Do not change any closure file. `register` requires all seal files already committed unchanged. Run `node forecasts/prospective-pilot/round-10-canada/issuance.mts register --approved-pr42-digest-comment`. Registration must begin strictly after sealing and complete before issue opens. Exact POST and GET bodies, headers, statuses, endpoints, hashes, sizes and real capture clocks are retained and replayed. Provider creation must follow the seal, precede issue-open, match update time, and overlap the local POST capture interval at the provider's one-second precision.
5. Root and peer inspect the returned comment independently and verify the digest, timestamp, target/prose and source closure. If this cannot finish within the fixed window, do not backdate or alter the seal. Any replacement campaign requires separate review; the CLI has no automatic reseal or retry mode.
6. After issue opens and explicit local-issue approval, run `node forecasts/prospective-pilot/round-10-canada/issuance.mts issue --approved-local-issue`. It verifies the committed seal, source closure and retained registration, performs a fresh GET of that exact comment, and checks unchanged body/identity/timestamps. It waits at most one second so the recorded issue second is not earlier than readback completion, takes the actual issue clock, and refuses issuance at or after 30 September. The pure candidate must reproduce the externally registered content hash and pass the full fixed adapter before write-once issue files are emitted.
7. Run `node forecasts/prospective-pilot/round-10-canada/issuance.mts --check`, then independently rehash the output files and compare the seal/provider anchors before asserting success. Root adds the actual issue to the approved programme, policy, CI and final artifact lock. This CLI does not score, void, resolve, alter an existing record, or claim statistical skill.

## Exact files emitted

All paths are below `forecasts/prospective-pilot/round-10-canada/issuance/`.

- `seal/`: `registration-clocks.json`, `protocol-sealed-awaiting-receipt.json`, `registration-request.json`, `source-closure.json`, `seal-anchors.json`.
- `registration/`: `attempt-request.json`; `provider-post.http`, `provider-post.capture.json`; `provider-readback.http`, `provider-readback.capture.json`; `registration-receipt.json`.
- `issued/`: `attempt.json`; `provider-preissue-readback.http`, `provider-preissue-readback.capture.json`; `issued.json`, `preregistration.json`, `byte-anchors.json`, `issuance-binding-report.json`, `baseline-parameters.json`, `resolver-parameters.json`, `reference-baseline-calculation.json`, `naive-baseline-calculation.json`, `reference-input-manifest.json`, `naive-input-manifest.json`.

Every bundle directory and file is created exclusively. Existing paths cause failure, never overwrite. A filesystem or transport failure can leave a partial bundle. Partial bundles are not admitted records: preserve them, disclose the failure and require manual reconciliation. The successful offline check is mandatory before calling the local issue complete.

## Ambiguous POST and failed readback

The attempt directory is reserved **before** POST. A timeout may mean GitHub created the comment even though no complete response arrived. Transport failure retains any returned stdout in `<operation>.partial.http` plus `failed-attempt.json` with real clocks and partial-byte hashes. Complete responses are retained even when status, identity, body, chronology or subsequent checks fail. No failure path blindly retries POST. A second register command fails because the attempt directory exists.

Root must inspect PR42 comments for the exact sealed digest and reconcile any returned ID with the live provider before deciding what to do. Do not delete the attempt directory, edit the comment, substitute a new receipt, or reuse an old clock. A separately approved recovery must preserve the failed attempt and existing comment, and may require a new campaign. GET failure after a successful POST is not permission to post again.

## Offline verification and resolution ceiling

`issuance.mts --check` is read-only and offline. It requires an actual issued bundle, not an optional file check. It reproduces the fixed candidate and both baselines, verifies exact issued/preregistered bytes and anchors, replays all provider capture metadata against raw responses and known endpoints/statuses, and checks seal/receipt/issue ordering. It does not query the current editable comment or perform scoring. Pure test helpers accept fixture clocks; the CLI has no clock override.

The raw Canadian outcome helper currently prepares a payload only, **not an admitted outcome**. Before any later resolution, retain the complete HTTP 200 response at the exact frozen URL, final URL, headers, real start/completion times, lengths and hashes. Verify completion against the actual local clock and operational eligibility window, 6 November through 31 December; do not claim 6 November is an ILO publication guarantee. Retain the first matching source-presence receipt and append-only chronology linked to the sealed absence tip. Require exactly one target cell with every native label/flag unchanged, verify that no earlier retained matching presence is being skipped, and keep the independently retained chronology tip. No later-vintage shopping, headline substitution, zero imputation or revised August comparator is permitted.

Run the fixed native decoder and existing typed resolution admission with those source bytes, first-presence evidence, exact issued record, preregistration and independent byte anchors. A payload from `canadaOutcomePayload` alone cannot pass this human gate. Missing, conflicting, changed or out-of-window evidence requires review under the prewritten void policy, never automatic scoring, automatic voiding or a negative outcome. Root and peer must approve the operational intake and its evidence checks before the first resolution. The literal statistical predicate and correlated-only availability relationship establish no binding income-access category, population disruption, authority or action permission.
