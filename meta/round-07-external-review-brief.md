---
id: round-07-external-review-brief
title: Round 07 external review brief
type: review-brief
status: ready-for-review
provenance: commissioned-proposal
created: 2026-09-09
updated: 2026-09-09
---

# Round 07 external review brief

## Decision requested

Determine whether the Round 06 findings are locally contained in the repair
candidate. Do not infer that a passing review approves publication, public
recruitment, operational use, negotiation, warning or intervention.

The exact candidate commit and freeze hash are published in the Round 07
review-freeze wrapper after the candidate commit exists. Review that immutable
commit, not the moving integration branch.

## Why this round exists

Round 06 found six P1 and seventeen P2 issues. It also recorded P3 hardening
opportunities. Round 07 tests the mechanisms used to repair them, including the
revised provenance boundary, executable-IF identity, forecast void controls,
governance anti-omission rules, append-only snapshot history, fail-closed UI and
review infrastructure.

The coordinator ledger is
[`../reviews/round-06-disposition-ledger.json`](../reviews/round-06-disposition-ledger.json).
Its dispositions are claims by the repair team. Reviewers must reproduce or
reject those claims independently.

## Review shape

The complete integrated tree remains visible in PR 2. Six sequential component
branches provide bounded diffs. Their exact bases, path ownership, dependencies
and check commands are declared in
[`../reviews/round-07-component-review-manifest.json`](../reviews/round-07-component-review-manifest.json).

Each component PR is a review view, not an independently mergeable product.
Review the six diffs in order. Then test the final integration tree as a whole.
No path may disappear between the component stack and the frozen candidate.

Some intermediate lanes deliberately defer checks that require a later lane.
The manifest names every such suite and provides narrower checks that must pass
at that point in the stack. A partial lane result is not a system verdict. The
final lane must run every deferred suite through the complete `npm test` gate.

## Independent tracks

1. **Provenance and public meaning.** Trace first-person substance to capture.
   Separate Fernando's IF and Goal / Signals / Actions method from remedies
   proposed by Ren. Test the parked “enough” line and the open enterprise-choice
   GAP.
2. **Executable IF and evolution.** Repeat NOT, operator-direction and signal-ID
   inversion attacks. Test clocks, evaluator identity, lifecycle basis states
   and every consumer binding.
3. **Evidence and forecasts.** Repeat selective post-publication voiding, invalid
   assessment clocks, review-expiry, support-state and blank-cell attacks. Check
   forecast provenance ceilings and retrieval-clock boundaries.
4. **Governance and lineage.** Delete or collapse participants, positions,
   dissent, mandates, roles, owners, challenge routes and stop invokers. Test
   receipt freshness, chronology and fully resolved negotiations.
5. **Dashboard and public experience.** Block each script independently. Mutate
   fixture headline values. Inspect correction history, IF provenance, caveats,
   consultation status, keyboard use, zoom, contrast and screen-reader output.
6. **Freeze, CI and repository security.** Forge coherent receipts, add untracked
   outputs, alter action refs, use absolute and escaping paths, interrupt a
   manifest write, and test canonical JSON edge cases.
7. **Human and affected-party review.** Test comprehension without the authors
   present. Ask people who could bear the named consequences whether the action
   choices, stop lines, representation model and remedy paths are intelligible
   and contestable.

Reviewers should complete their first pass without reading another reviewer's
conclusions. Use separate clean checkouts. The coordinator may compare results
only after those first passes are sealed.

## Mandatory hostile checks

A credible review must at least:

- run `npm ci` and `npm test` under Node 22;
- run every build and parity check declared by the freeze policy;
- verify the retained receipt against its exact commit;
- compare the final stacked component tree to the frozen candidate tree;
- repeat every Round 06 P1 reproduction from original hostile inputs;
- test at least one new mutation per P1 mechanism;
- inspect every deferred disposition and decide whether its residual risk is
  acceptable for another research round;
- confirm that no machine-valid state is described as evidence truth,
  democratic legitimacy, authority or permission to act.

## Stop rules

Stop and return the candidate when any of these is true:

- a Round 06 P1 remains reproducible;
- a claimed P1 or P2 repair lacks a failing-first hostile regression;
- one component diff cannot be reviewed without loading unrelated paths;
- the component stack and frozen candidate differ;
- a generated artefact cannot be reproduced without changing tracked bytes;
- unsupported or synthetic material loses its visible claim ceiling;
- missing, stale, conflicted or unauthenticated input becomes affirmative;
- dissent, challenge rights, stop authority or affected-party status can be
  removed through a coordinated reseal;
- a failed or absent reproduction exits successfully without an explicit
  inspection override.

## Required outputs

Return:

1. a pass, conditional pass or return verdict for each component lane;
2. a finding ledger with severity, exact path, reproduction and smallest repair;
3. an integrated-tree verdict;
4. a separate human-comprehension and affected-party report;
5. an explicit list of legal, ethics, statistical, accessibility and security
   reviews not performed.

## Boundaries

Round 07 can establish local integrity, internal consistency and the result of
specified hostile checks. It cannot authenticate source publishers, clocks,
reviewers, representatives, mandates or signatures. It cannot establish that a
forecast is calibrated, that a remedy is desirable, or that any institution or
population has consented. Those remain external work.
