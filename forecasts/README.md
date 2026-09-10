# Forecast registry

**Current NERO records:** the first Capital Region forecast remains open. The
second Central Coast issue has a [disclosed target contradiction](prospective-pilot/round-09-nero/error-notice.md)
and is blocked at admission. A corrected prospective replacement is being
prepared; the second-valid-forecast gate is currently unmet. Historical issued
bytes and registered cohorts remain visible, with no invented void or score.

> **AGENT-PROPOSED FORECAST GOVERNANCE, NOT FERNANDO'S VIEW OR AN ACTION
> AUTHORITY.** This contract is a falsifiable instrument for review.

**TL;DR: register who must be included before forecasts are issued. Seal every
eligible issued record before observation begins. Freeze the question,
publication boundary, two mechanical baselines, scoring plan and any declared
utility assumptions. Retain the exact resolution bytes and freeze the versioned
resolver that derives the binary outcome. Then show every resolution, withheld
score, overdue record and adjudicated void. Scores describe registered
predictive performance only.**

The registry makes a future claim capable of being wrong in public. It does not
authenticate institutions, verify source contents, establish causal value or
authorise action.

## Round 4 exact issue basis

Schema `1.4.0` adds an immutable `issue_basis`. It binds the forecast to exact
bytes for one executable IF kernel and signal registry, then resolves:

- one active condition definition and its complete WHO, VERB, OBJECT, STANDARD,
  POLARITY and PERIOD;
- one executable predicate and immutable signal definition;
- the complete registered metric contract, not only its metric ID;
- the exact jurisdiction, geography, cohort, service and PERIOD scope;
- the complete issue-time evidence-history tip; and
- a governed five-state evaluation receipt at the forecast's `issued_at` time.

The issue basis is content-addressed and checked again against both source
artifacts. Recomputing its hash cannot legitimise a substituted definition,
metric, scope or earlier evidence tip.

### Two questions, never one confidence scale

The issue-time receipt asks: **what state did the registered IF rule compute at
issue time?** Its answer is exactly one of `true`, `false`, `unknown`, `stale`
or `conflicted`.

The forecast asks: **what probability is assigned to a separately specified
future resolution event?** Its answer is a number strictly between zero and one.

For example, the Round 4 fixture records an issue-time IF state of `true` and a
future-event probability of `0.62`. The state is not 100 percent confidence and
the probability does not weaken, strengthen or replace the state. Neither
establishes empirical truth, causality, authority or permission to act. The
machine-generated `public_claim_ceiling` must accompany any public projection.

## Fail-closed sequence

1. Register a structured cohort rule before the first forecast is issued. The
   only supported rule includes every issued record carrying the campaign ID,
   with no exclusions.
2. Issue each forecast before its observation window begins. Name an exact
   observation window and the earliest possible publication time. Bind the
   target to a non-empty `signal_id`, `metric_id`, `metric_checksum`,
   `condition_id` and canonical `scope_hash`.
3. Before observation begins, seal the eligible registry manifest and the
   evaluation plan together. The manifest IDs must exactly equal the evaluation
   cohort IDs.
4. Store issue-record, plan, registry-manifest, baseline-calculation and evidence
   SHA-256 values. Retain the exact resolution bytes used by the frozen resolver.
   A checksum proves byte identity, not truth or publisher identity.
5. Reject input vintages retrieved after issue. A source retrieved after a
   registered `input_vintage_cutoff_at` is not made eligible merely by claiming
   an older vintage. The cutoff governs eligible source knowledge; a baseline
   calculation may run after that cutoff, but must still finish before issue.
   This is the intended policy boundary. The current retained baseline input
   manifest binds digests but not per-input retrieval clocks, so the issuance
   adapter cannot independently establish this chronology and remains blocked.
   Resolution evidence must declare a publication time at or after the frozen
   publication boundary and be retrieved no later than resolution.
6. Never overwrite issued substance. History begins at issue and only appends a
   matching resolution or void event.
7. Resolve only inside the declared window. Report issued records left after
   `resolve_by` as `overdue_unresolved`.
8. Keep every void in the registered denominator. A void needs reason evidence
   and a separately evidenced, claimed-independent adjudication.
9. Derive every scored outcome from retained bytes with the issue-time resolver.
   The retained resolution payload must repeat the issued target bindings
   exactly. A changed signal, metric checksum, condition or scope fails rather
   than becoming a new interpretation of the same forecast.
   If the bytes are unavailable, keep the record resolved but withhold its score.
   Never convert a void or overdue record into an outcome.
10. Map each resolution event to exactly one claimed independence cluster.
    Aggregate scores and reliability by event, then by cluster. Withhold
    reliability rates below both event and claimed-independent-cluster floors.
    Passing these floors still produces a descriptive diagnostic, not a
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
  record has a byte-reconstructed outcome;
- `score_coverage`: scored records divided by all registered records;
- `withheld_unreconstructed`: resolved records whose exact bytes were not
  available for deterministic reconstruction;
- `void_rate`: voids divided by all registered records.
- `post_publication_voids`: voids recorded on or after the target's earliest
  declared outcome-publication boundary.

The plan freezes a minimum score coverage of at least 80 percent. A cohort below
that floor, including an all-void cohort, can finish its lifecycle but is not
performance-evaluable.
Any post-publication void also withholds `performance_evaluable`, even when the
remaining score coverage meets the registered floor, because outcome-informed
selective exclusion has not been ruled out.
Void adjudication evidence must not predate the evidence for the void, and the
claimed adjudicator identity must differ from the forecast author and issuing
actor. These are structural checks only. They do not authenticate identity or
establish actual independence, so the authority status remains unverified.

Every derived evaluation report lists its distinct `input_provenance_classes`
and repeats each source forecast's epistemic class, use and complete provenance
object. Every machine-generated public claim ceiling names `provenance.class`.
This prevents a downstream report from silently stripping the fixture
disclaimer or authorship boundary. It still does not authenticate those
caller-supplied fields.

## Reliability and dependence

The plan freezes probability-bin edges and four floors. The legacy plan field
names `minimum_resolved_forecasts` and `minimum_forecasts_per_bin` are applied to
registered resolution events, alongside claimed-independent clusters and
claimed-independent clusters per bin. One resolution event cannot be assigned
to multiple clusters. Duplicate forecasts of one event count as one event.

Scores first average forecast losses within each registered event, then average
events within each claimed cluster, then weight clusters equally. Reliability
uses the same event and cluster units. Thirty distinct events assigned to one
cluster still cannot unlock a rate. Even after every floor passes, output is
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
- scored and byte-unreconstructed counts, score coverage and void rate;
- scored event and claimed-cluster counts plus the aggregation unit;
- both baseline identities and verification status;
- reliability status and cluster counts;
- `action_authorised: false` and `causal_truth_established: false`;
- unverified owner, authoriser, registration and adjudication status where used.

Do not abbreviate `declared_utility_arithmetic` to value, impact or benefit.
Do not describe descriptive reliability bins as calibration.

## Known trust boundary

This code validates structure, chronology, retained-byte hashes, deterministic
outcome reconstruction, target-binding immutability, canonical target-scope
hashes and arithmetic. A `metric_checksum` binds bytes identified elsewhere; it
does not prove that the metric measures a relevant outcome. A `condition_id`
and `signal_id` bind identifiers; they do not establish that the condition is
causal or the signal is truthful. The code does not fetch missing evidence,
authenticate the external publisher of retained bytes, verify a Git commit or
trusted timestamp, prove manifest completeness, reproduce baseline
calculations, authenticate people, verify cluster independence, adjudicate a
source change or recover affected-party preferences. Those are external review
obligations, not hidden passes.

## Fixtures and test

Files under `fixtures/` are fictional software examples. Their event, source,
threshold, probability, claimed owner, actions and utilities are not forecasts
or decisions about Australia and are not Fernando's views.

```bash
node --test forecasts/tests/*.test.mjs
node forecasts/tools/build-round-04-fixture.mjs --check
```

The first real forecast must wait for the pilot source-feasibility review,
reproducible baseline implementation, externally anchored campaign policy and
registry manifest. Until then, the Observatory has scenarios and hypotheses,
not forecasts.
