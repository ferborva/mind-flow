---
id: round-08-1-external-review-brief
title: Round 08.1, verify the repairs against preserved history
type: review-brief
status: review
provenance: commissioned-proposal
author: ren
created: 2026-09-10
updated: 2026-09-10
---

# Verify the repairs, not a new round of claims

**The goal remains abundance with agency.** Goal / Signals / Actions is the
method: conditions supply signals, and proposed actions are hypotheses about
changing them. This candidate repairs the existing PR15 review findings. It
adds no measurement programme, policy remedy, appointed authority, forecast
outcome or approval to intervene.

## Exact target

Use `review_target.commit` in
[`round-08.1.review-freeze.json`](review-freeze/round-08.1.review-freeze.json),
not the branch head or the original Round 08 receipt. The new receipt is added
in a later seal commit, so it cannot include itself in its reviewed tree.
Until the receipt exists and reports passing reproduction, this is not a
ready frozen-input handoff. The PR body identifies candidate and seal hashes.

The policy remains the unchanged `round-08` policy, not a new schema or review
policy. Its complete-tree inventory includes the added repair artifacts. Its
existing build contract now invokes the current measurement and consumer
checks and compares generated outputs with a separately retained artifact lock.
The original `round-08.review-freeze.json` continues to identify historical
candidate `f7d988ce4244d7553cc1f405a1483e01c63f1f07` and is never overwritten.

Read the manifest from the seal, hydrate LFS, and create a separate detached
checkout at its full target hash. Plain verification at the seal checks the
retained manifest and target objects:

```sh
node meta/review-freeze/review-freeze.mjs verify \
  --policy=round-08 \
  --manifest=meta/review-freeze/round-08.1.review-freeze.json
```

For `--checkout`, supply the retained manifest from outside the detached
candidate tree; that tree must be the exact clean candidate. It intentionally
does not contain its own later seal. Plain verification binds LFS pointers;
source checks and reproduction verify hydrated content bytes. Creator command
receipts remain unauthenticated reports, so rerun the candidate independently.

## What to challenge

Start with the [finding-by-finding dispositions](../reviews/round-08-1-dispositions.md),
which link all six reviewer comments, code, evidence and explicit disagreements.
Record your own first pass before reading the other agents' conclusions.

1. **Visible measurement:** inspect the generated GP table, its five distinct
   populations, old capability proxy, rule clock, reported FTE rates and
   unverified owner roles. Read the retained workbook's very-remote exclusions.
   Can the page be mistaken for five contemporary personal-access diagnoses?
2. **Actual evolution:** compare the original r3 kernel and existing positive
   consumer with the appended current kernel. The old consumer must fail after
   the event; rebinding must not change historical values or imply satisfaction.
   Does the source-policy revision earn its rationale without pretending it
   repairs the broader population scope or creates independent sources?
3. **Threshold review:** missing domain metadata stays unassessed. Separate
   mathematical vacuity from a research target outside the observed envelope.
   The current audit is flagged, not empirically validated.
4. **Resolution intake:** verify full archive consumption, first-presence
   binding, original issue and plan hashes, and process-local admission. A
   caller-supplied chronology anchor is not independently authenticated public
   release history. Distinct adjudicator strings are not appointments.
5. **Voice:** compare the restored essay with the 1, 8 and 9 September captures.
   Concrete illustrations should survive; obsolete remedies should not return
   as current stance. Attribution coverage is not semantic provenance proof.
6. **Integrity:** change a builder and check that the output lock rejects a
   consistent new result. Verify the F2 rejection against the original temporary
   repository helper. Do not confuse a green CI run with signed receipt
   authentication or with research approval.

## Reproduce the repair checks

With Node 22, complete Git history and hydrated LFS objects:

```sh
npm ci
npm test
node pilots/australia/tools/primary-care-review.mts --check
node pilots/australia/tools/current-primary-care.mts --check
node pilots/australia/tools/audit-primary-care.mts \
  --kernel=pilots/australia/basket/primary-care.kernel.current.json
node meta/build-artifacts.mjs --check
```

The audit command succeeds when it has reported its findings. Its current
status is `flagged`; `--require-assessed` must fail. The consumer remains
nonempirical. `--write-lock` is an intentional reviewed update operation,
never an alternative to fixing a failed `--check` during reproduction.

## Keep the unpassed gates visible

One actual appended evidence-policy event does not become three operational
evolutions. Five heterogeneous GP indicators do not establish a binding barrier
for an individual or complete the other basket items. The universal disclaimer
ratio remains unmet. Raw historical macro inputs, source licensing, appointment,
human comprehension, affected-party review and pixel-level/accessibility review
remain incomplete. Freeze schema-2.0 trust-boundary work remains deferred to
2026-09-16. The [boundaries](../boundaries.md) continue to apply.
