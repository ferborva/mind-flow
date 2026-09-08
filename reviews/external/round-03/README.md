---
id: round-03-external-review-brief
title: Round 03 external adversarial review
type: external-review-request
status: ready-for-independent-review
provenance: commissioned-agent-proposal
author: Ren
reviewer: unassigned
created: 2026-09-08
updated: 2026-09-08
authority: none
---

# Round 03 external adversarial review

> **Public release remains blocked.** This pack requests attempts to falsify a
> programme, its contracts and its public instrument. Internal test passes are
> not closure, endorsement, empirical validation or authority.

Review exactly commit:

```text
f5b3b643e80e0f16d7dadd13805df6accf9526ed
```

The machine-readable [manifest](manifest.json) pins 45 artefacts from that
commit. Do not review a moving branch or substitute later files without opening
a new review round.

## The review question

Can this project help named people and legitimate institutions see when
technological capability is, or is not, becoming shared and durable agency,
then prepare early without manufacturing certainty, authority or consent?

Do not review whether this is an inspiring ambition. Attack whether its claims,
measurements, IFs, paths, forecasts, preparations and interface could mislead or
harm people while appearing rigorous.

## Blind first pass

Each lane starts independently. Before recording a first disposition, do not read
any other review, agent summary or lane output. Read the internal
adversarial register only after submitting the blind first pass. This protects
independent convergence and exposes findings the builders did not anticipate.

Assign one primary lane per reviewer:

1. Mission, thesis, claims and competing explanations.
2. Source provenance, estimands, statistics and reconstruction.
3. IF grammar, condition identity, evolution and logic.
4. Possible paths, causal restraint, forecasts and scoring.
5. Affected-party constructs, power, consent and information harm.
6. Preparation, authority, feasibility, negotiation and operations.
7. Public comprehension, accessibility, visual semantics and misuse.
8. Security, privacy, integrity, reproducibility and governance.

Reviewers may cross boundaries after the blind pass. At least two reviewers
should independently attack each release-critical boundary.

## Reproduce before interpreting

Use a clean clone and detached checkout of the reviewed commit:

```sh
git checkout --detach f5b3b643e80e0f16d7dadd13805df6accf9526ed
npm ci
npm test
node dashboard/tools/migrate-timing-contract.mjs
node dashboard/tools/build.mjs dashboard/snapshots/2026-09-08.r2.json dashboard/web/index.html
node dashboard/tools/build-australia-pilot.mjs pilots/australia/data/nero-clerical-2026-08.json pilots/australia/web/index.html
git diff --exit-code
```

The internal run recorded 405 passing tests. A clean reproduction checks only
the declared structural contract. It does not validate source truth, causal
identification, forecast skill, affected-party legitimacy, legal authority or
operational feasibility.

## Required attack posture

Start with the strongest cheap counterexample, then escalate. In particular:

- change an IF's meaning, population or plain-language wording and reseal every
  local hash;
- merge semantically incompatible conditions that happen to share exact text;
- hide challenges through history crops, exports, small screens or print;
- substitute geography, period, denominator, unit or statistical level at a
  signal edge;
- alias dependent sources until they appear independent;
- route a false or unknown branch indirectly to a favourable destination;
- delete rivals, affected groups or omissions while preserving machine shape;
- select forecast cohorts after issue or score outcomes already knowable;
- forge identity, funding, capacity, consent, independence and authority;
- construct cases where both acting and waiting can cause serious harm;
- test comprehension, anxiety, stigma and political priming against the simpler
  release; and
- independently reacquire and authenticate every source used for a material
  claim.

The manifest carries the full required-attack list.

## Finding contract

Record each finding without proposing away its consequence:

```text
ID:
lane:
severity: P0 | P1 | P2 | P3
artefact and exact location:
claim or control attacked:
counterexample:
reproduction steps:
observed result:
public or operational consequence:
smallest credible repair:
evidence needed to close:
closure owner type:
```

Severity means:

- **P0:** credible risk of severe harm, unlawful action, destructive data loss,
  fabricated authority or a materially false public conclusion.
- **P1:** release-critical failure of truth, scope, logic, provenance,
  comprehension, consent, safety or reproducibility.
- **P2:** important weakness that narrows usefulness or materially raises misuse
  risk but can be contained before release.
- **P3:** clarity, maintainability or low-consequence defect.

Do not lower severity because the programme is a prototype. State whether the
counterexample is prevented, detected, merely disclosed or still open.

## Falsification targets by lane

### Thesis and claims

Try to show that the master story privileges a technology-push account, treats
abundance as inevitable, hides value choices, or adds convenient IFs after an
outcome. Demand the observation that would narrow, contradict or retire each
claim.

### Evidence and statistics

Attack source identity, retained bytes, vintages, clocks, units, denominators,
population coverage, modelled estimates, revision paths and ecological joins.
Recompute every material number from independently acquired inputs.

### IF evolution

Attack identity, scope, split coverage, merge equivalence, challenges,
retroactivity, cropped history and coordinated resealing. Test whether a public
reader notices when a condition changed after the apparent result.

### Paths and forecasts

Look for omitted paths, decorative competitors, unfalsifiable mechanisms,
post-issue selection, dependent events, weak baselines, void laundering and
causal claims hidden inside declared utility arithmetic.

### Affected parties

Reject the Round 02 count of 180 as a power calculation. Test construct validity,
representation, refusal, burden, severe subgroup harm, cultural and disability
access, information harm and whether participation can change the design.

### Preparation and authority

Forge every caller-supplied assertion. Test cross-actor command, expiring funds,
missing recovery, service failure, appeal failure and cases where fail-closed
automation conceals the duty of a named human decision-maker.

### Public experience

Run keyboard, screen-reader, 320-pixel, 200 percent zoom, print, reduced-motion,
low-literacy and low-numeracy reviews. Compare understanding with the same
statistics and deliberation without the Observatory framing.

### Integrity and governance

Attack canonicalisation across implementations, path traversal, symlinks,
manifest forks, trust-registry collusion, restricted data, correction service
levels, privacy leakage and release-process capture.

## Disposition

Use one status: `open`, `reproduced`, `contained-internal`, `needs-field-test`,
`needs-authority`, `rejected-with-evidence` or `closed-independent`.

Only an independent reviewer with the required discipline may apply
`closed-independent`. Agent consensus cannot close affected-party, legal,
authority, source-authentication or operational findings. No release approval
exists in this pack.
