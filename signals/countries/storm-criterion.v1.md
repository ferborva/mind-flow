---
id: storm-criterion.v1
title: Candidate shifts in access to earning a living
type: technical-proposal
status: commissioned-proposal
provenance: commissioned-proposal
author: Ren
authority: none
created: 2026-09-10
updated: 2026-09-10
---

# Candidate shifts in access to earning a living

**The rule is operational as a research test. Its required disruption and
binding-change measurements are not yet available in these national sources.**
For the retained 50 economies and 20 annual comparisons, the result is
`cannot-say`, not “nothing happened”. This is a failure of measurement
sufficiency, not evidence of stability. No country is admitted to a measured
storm panel merely because a related national statistic exists.

## Commissioned criterion, not a new quotation

A candidate storm in country C over period P is a measured change in the share
of C's population whose access to means of generating income was disrupted, of
at least 5 percentage points of population, **or** a measured change in which
condition category binds that access. Regional and global candidates are the
co-occurrence of national candidates, never the sum of their affected shares.

Fernando's words and what they do not settle are preserved in the
[storm capture](../../capture/2026-09-10-storms-as-social-contract-shifts.md).
This document's measurement choices and code are Ren's commissioned proposals.
The rule diagnoses a measured comparison; it does not schedule a crisis or
claim that the order of changing conditions can be planned.

## Five reversible assumptions

1. **People and household exposure remain separate.** Report both when a
   source supports a person-linked household mapping. Label whether household
   exposure includes directly disrupted people or only dependants. Never add
   overlapping populations. Neither mapping exists in the retained sources.
2. **Sampling frame:** the existing IMF WEO April 2026 nominal-GDP top 50,
   ranked on 2025 values. These are the retained publisher's economies, not
   a new sovereignty judgment or a globally representative sample.
3. **Indicator choices:** modelled employment-to-population, modelled
   unemployment and the PIP national poverty lineup are income-related
   context. Their condition-category relationships are proposals. Other
   candidate families failed breadth or remain unacquired, as the
   [source audit](income-source-audit.md) records. Fernando may strike or add.
4. **Direction:** increased direct disruption is the provisional positive
   reading. A beneficial shift of at least five points is unassessed, not a
   settled negative finding. Fernando has not decided whether it is a storm.
5. **Threshold basis:** direct disruption is provisionally tested against the
   five-point threshold. Household exposure is separate, never substituted.
   Fernando has not selected direct versus household threshold membership.

All five are also in [the decision backlog](../../meta/backlog.md).
The executable provisional rule uses **increased direct disruption**, with
household exposure shown separately and not substituted.
The binding-category arm follows the commission's OR without adding a second
five-percent gate. These choices cannot become Fernando's settled answers.

## What five percentage points means

Let d(C,t) be the percentage of **total population** directly experiencing the
defined income-route disruption. The first arm is d(C,t1) − d(C,t0) ≥ 5.
A movement from 1% to 6% meets the boundary; 1% to 5.999% does not. It is not a
5% relative change. A decline of at least five points sets
`beneficial_shift_unassessed: true` and leaves the direct arm unknown. It cannot
yield a firm `no-candidate` while the direction decision is pending. A measured
binding-category change can still independently yield `candidate`.

Both direct and native percentage arithmetic first round each input separately
to six decimal places (nearest, half towards positive infinity), subtract the
scaled integers, then divide by one million. Thus 3.04% to 8.04% is exactly five
points; 3.04% to 8.039999% remains below it. This declared arithmetic precision
does not claim survey precision or quantify uncertainty. Original input values
remain retained alongside the calculated change.

Sources must define disruption, duration,
population coverage, survey uncertainty and a comparable before/after scope.

This is a change in a scoped disruption prevalence, not necessarily the gross
number newly disrupted during the interval. A longitudinal flow count would
answer a different question and require its own identity, time denominator
and rule. Even a sound prevalence criterion can miss large offsetting entry
and recovery flows. Both must be considered before adopting it for warnings.

No person counts are computed by multiplying national rates by an unrelated
population total. If counts later become available, retain numerator and
denominator together, identify overlap and population change, and derive the
displayed count from that same admitted observation. Counts, household shares
and uncertainty are currently unavailable, never zero.

| Retained family | Proposed category relationship | Native denominator | Why a five-point native movement is not five points of disrupted population |
| --- | --- | --- | --- |
| ILO employment-to-population, modelled November 2025 | Availability of work, including own-account and informal employment | Population aged 15+ | Net employment stock includes offsetting entries/exits and demographic change; it does not identify disrupted people, work quality, earnings or dependants. |
| ILO unemployment, same modelled edition | Availability of work, not proof of its binding cause | Labour force aged 15+ | Entry into search and labour-force exit affect the rate; excluded/non-searching people and income-route losses are not identified. |
| PIP $3/day, 2021 PPP, March 2026 lineup | Price/affordability context, not a causal diagnosis | National persons assigned household income or consumption welfare | Poverty is a welfare stock influenced by prices and transfers, not directly measured loss of income access. Latest 2025 values are all nowcasts; welfare and comparability changes remain explicit. |

The three families satisfy native breadth (50, 50 and 49 economies), not
disruption validity. Argentina has no retained national PIP row; urban-only
data is not a national replacement, as the retained [PIP acquisition chapter](sources/income-2026-09-10/pip-methodology-acquiring.body)
explains. Models from one retained vintage provide
reproducible hindsight, not what was known in each historical year.

## Decision mechanics and public wording

The two arms use three-valued logic. If either is measured true, the result
is `candidate`, naming that arm. Only **both measured false** yield
`no-candidate`. All other combinations yield `cannot-say`, with the missing
measurements named. An absent household mapping is displayed separately;
it does not erase a measured direct candidate or manufacture another one.

The five categories are price, permission, proximity, availability and
capability. A source's relationship to a category is not evidence that it
binds. A before/after binding diagnosis must concern the same people, place,
income-access claim and period, and show why alternatives were not binding.
The simple single-category arm cannot yet represent tied or multiple binding
sets, ambiguity, confidence intervals or partial identification. Those are
explicit admission gaps, not silently flattened findings.

`evaluateStorm` is arithmetic over already admitted evidence, not a publisher
authenticator or a survey validator. Its positive tests are synthetic. The
real producer replays retained bytes and supplies **no** disruption or binding
measurement because none is justified. A hash and a declared construct do not
prove that a source measured it. No operational warning pipeline admits these
synthetic fixtures.
Before any operational admission, a claimed `source_sha256` must resolve to
retained receipt bytes and its construct, scope and comparability must undergo
an independent evidence review. The generic arithmetic API does not implement
that future admission layer; a well-shaped hash alone remains insufficient.

Co-occurrence groups distinct national candidates over the same comparison
period. It neither adds shares nor asserts a common cause, contagion, regional
population coverage or global risk. The API's period length is caller-defined:
it accepts ordered comparison years, including a multi-year retained-range
summary. Only the native producer is annual. Its generic API has country scope,
not subnational geography. The placeholder IF's 366-day window does not make the
API a kernel-equivalent evaluator. An annual comparison can miss a severe
within-year disruption and cannot determine a daily crisis point.

## IF identities and evolution, without manufactured events

Each native family is linked to a research condition definition in the
existing executable-IF schema, with its proposed `condition_category`, exact
signal hash and a separately retained measurement hash. The definitions express
the **direct-share arm only**, not the two-arm OR. The binding-category arm has
no executable IF identity here. Changing its categories or logic changes the
arithmetic implementation, not these direct-arm definitions; whole-file byte
replay and focused truth-table tests guard the retained consumer separately.

These are **family-level placeholders to be superseded, not admitted against**.
Their descriptive jurisdiction is not an ISO3 scope and their fixed research
epoch is not a continuing admission window. Real country-specific admission
requires new scoped identities, retained old meaning, and explicit reviewed
adoption. There is no generic supersede operation in this kernel. Constructing
those identities would not itself be empirical evolution.

Measurement hash and source vintage live in the wrapper, outside hashed signal
fields. A vintage refresh alone must not change the IF meaning. Native
observations remain context, not the unmeasured proposition's evidence.
`verifyStormBindings` recomputes the commissioned definitions and exact retained
context, rejecting stale hashes, changed membership and coherently rehashed
definition mutations against that expectation. The checked-in artefact is
guarded by whole-file byte replay in CI; focused tests now also load its actual
bindings and independently pin the threshold and proposition text. Neither
mechanism authenticates a source or proves equivalence with the two-arm
arithmetic API.

The three definitions are new construction, not three empirical discoveries
or three evolution events. The source audit corrected interpretation before
any native stock was adopted as disruption evidence. Intentionally adopting
a known-wrong denominator just to retire it would manufacture an event.
**New real events: 0. Programme total: 1, not the required 3.**
These are the dated Round 10 review findings, not live counters. The generated
storm review no longer embeds literal programme evolution counts; its producer
does not inspect the event ledger.

The [construct-correction policy](../../contracts/executable-if/construct-correction-policy.md)
still applies. A later change of estimand requires a new identity, retained
old meaning, a real existing-reader inventory, stale-binding rejection and
explicit reviewed adoption. This round does not implement a generic
retire/supersede operation or count a synthetic mutation test as a migration.

## Next evidence and action, not a forecast

**Investigate income access in a named population IF** a retained native
movement, local account or policy change gives a specific reason to look.
Admit comparable disruption-prevalence evidence for the direct-share arm, or
matched before/after evidence for the binding-category arm. Report uncertainty,
household mapping and any other missing evidence separately; neither both arms
nor a household mapping is required when one arm is measured true. Keep practical support based on demonstrated
local need separate from whether a national threshold has been established.

**Reconsider this rule IF** direct evidence shows its five-point prevalence
threshold misses major offsetting flows or meaningful subnational disruption,
or if binding categories cannot be measured reproducibly. A rule firing
everywhere or nowhere on an assessable, labelled history would be wrong for
its proposed purpose. An entirely unassessable history cannot establish either
behaviour. The next step is measurement design and independent validation,
not tuning a threshold until the familiar crises appear.

Replay: `node signals/countries/tools/storm-criterion.mts --check`.
The generated [review data](storm-review.v1.json) preserves all 1,000
country-period states plus explicitly rejected naive proxy crossings. The
retrospective establishes **no forecast skill**, sensitivity or specificity.
