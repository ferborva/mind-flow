# Forecast registry

> **AGENT-PROPOSED FORECAST GOVERNANCE, NOT FERNANDO'S VIEW OR AN ACTION
> AUTHORITY.** This contract is a falsifiable instrument for review.

**TL;DR: register who must be included before forecasts are issued. Seal every
eligible issued record before observation begins. Freeze the question,
publication boundary, two mechanical baselines, scoring plan and any declared
utility assumptions. Then show every resolution, overdue record and adjudicated
void. Scores describe registered predictive performance only.**

The registry makes a future claim capable of being wrong in public. It does not
authenticate institutions, verify source contents, establish causal value or
authorise action.

## Fail-closed sequence

1. Register a structured cohort rule before the first forecast is issued. The
   only supported rule includes every issued record carrying the campaign ID,
   with no exclusions.
2. Issue each forecast before its observation window begins. Name an exact
   observation window and the earliest possible publication time.
3. Before observation begins, seal the eligible registry manifest and the
   evaluation plan together. The manifest IDs must exactly equal the evaluation
   cohort IDs.
4. Store issue-record, plan, registry-manifest, baseline-calculation and evidence
   SHA-256 values. A checksum proves byte identity, not truth.
5. Reject input vintages retrieved after issue. Resolution evidence must declare
   a publication time at or after the frozen publication boundary and be
   retrieved no later than resolution.
6. Never overwrite issued substance. History begins at issue and only appends a
   matching resolution or void event.
7. Resolve only inside the declared window. Report issued records left after
   `resolve_by` as `overdue_unresolved`.
8. Keep every void in the registered denominator. A void needs reason evidence
   and a separately evidenced, claimed-independent adjudication.
9. Score every resolved forecast, including misses. Never convert a void or
   overdue record into an outcome.
10. Withhold reliability rates below both record and claimed-independent-cluster
    floors. Passing these floors still produces a descriptive diagnostic, not a
    calibration claim.
11. Keep predictive scores separate from declared utility arithmetic and from
    any action decision.

All timestamps are exact RFC 3339 instants with timezones and real calendar
dates.

## Cohort anti-selection contract

The plan has two stages:

- `cohort_policy` is anchored before issue and says
  `all_issued_campaign_records`, with no exclusions.
- `eligible_registry_manifest` is sealed with the evaluation plan after issue
  but before observation. Its IDs must exactly equal the plan cohort.

This blocks caller-supplied subset scoring inside the evaluator. It still needs
an external reviewer to verify that the manifest source contains every eligible
registry record and that its claimed timestamps and commit exist. All anchors
therefore carry `unverified_external_review_required`. Recomputing a checksum
inside this repository is not independent registration.

## Two mechanical predictive baselines

Every forecast carries both:

- a naive mechanical baseline;
- a mechanical reference-class baseline.

Both belong to the campaign, are declared before the forecast, name their
algorithm and version, pin input checksums and carry a calculation checksum. The
evaluator rejects mixed baseline families, policies or algorithms inside one
campaign. Calculation status remains `unverified_external_review_required`
until a separate reproducer checks the algorithm, inputs and output probability.

Raw binary forecasts use Brier score and log loss. Brier skill is reported
against both baselines. If a baseline has zero Brier loss, ratio skill is
mathematically undefined. The evaluator reports `null` with
`undefined_both_perfect` or `undefined_perfect_baseline`; it does not crash or
invent a finite ratio.

## Two forecast uses

| Use | Required at issue time | Maximum interpretation |
|---|---|---|
| `research_only` | Frozen target, probability, dual baselines, vintages and void policy | A prospective claim that can later be scored |
| `decision_linked` | Everything above, plus a claimed accountable owner, decision time, eligible actions, evaluation-only forecast policy, content-addressed no-model policy and bounded utility basis | A forecast associated with a separately claimed human decision record |

Owner and authoriser identifiers are deliberately named `claimed_*`. Evidence
and matching IDs do not establish identity, consent, legal authority or a human
act. The fixed policy role is
`evaluation_only_human_authorisation_required`. Public surfaces must preserve
the verification status and the false authority flags.

## Voids and completeness

The evaluator reports:

- `lifecycle_complete`: no record remains pending or overdue;
- `performance_evaluable`: lifecycle is complete and at least one registered
  record resolved;
- `score_coverage`: resolved records divided by all registered records;
- `void_rate`: voids divided by all registered records.

The plan freezes a minimum score coverage of at least 80 percent. A cohort below
that floor, including an all-void cohort, can finish its lifecycle but is not
performance-evaluable.
Void evidence and claimed-independent adjudication remain public. The registry
cannot itself verify that the adjudicator is independent, so the authority
status remains unverified.

## Reliability and dependence

The plan freezes probability-bin edges and four floors: total records, records
per bin, claimed-independent clusters and claimed-independent clusters per bin.
Thirty copied forecasts of one event remain one cluster and cannot unlock a
rate. Even after every floor passes, output is
`descriptive_diagnostic_only_claimed_clusters`, with
`independence_verified: false`; formal inference, uncertainty intervals and
external verification of cluster assignments are not implemented.

## Declared utility arithmetic

For a resolved decision-linked record, the evaluator compares the recorded
action and pinned no-model action under the same bounded utility table and the
same realised binary outcome. The output is named
`declared_utility_arithmetic`, not decision value. It is stratified by:

- exact utility-model checksum, scale, unit, perspective and provenance class;
- whether the forecast was reportedly consulted;
- whether the action matched the frozen evaluation-only policy.

The difference is `same_outcome_arithmetic_not_counterfactual_effect`. It is not
an estimate of what the forecast caused. `causal_effect_established` and
`action_authorised` are always false. Utility bounds are limited to plus or minus
one billion to keep subtraction, aggregation and JSON output finite.

## Public interpretation contract

A public summary must show, beside any score:

- resolved, overdue, void and total counts;
- score coverage and void rate;
- both baseline identities and verification status;
- reliability status and cluster counts;
- `action_authorised: false` and `causal_truth_established: false`;
- unverified owner, authoriser, registration and adjudication status where used.

Do not abbreviate `declared_utility_arithmetic` to value, impact or benefit.
Do not describe descriptive reliability bins as calibration.

## Known trust boundary

This code validates structure, chronology, internal hashes and arithmetic. It
does not fetch evidence bytes, verify a Git commit or trusted timestamp, prove
manifest completeness, reproduce baseline calculations, authenticate people,
verify cluster independence, adjudicate a source change or recover affected
party preferences. Those are external review obligations, not hidden passes.

## Fixtures and test

Files under `fixtures/` are fictional software examples. Their event, source,
threshold, probability, claimed owner, actions and utilities are not forecasts
or decisions about Australia and are not Fernando's views.

```bash
node --test forecasts/tests/*.test.mjs
```

The first real forecast must wait for the pilot source-feasibility review,
reproducible baseline implementation, externally anchored campaign policy and
registry manifest. Until then, the Observatory has scenarios and hypotheses,
not forecasts.
