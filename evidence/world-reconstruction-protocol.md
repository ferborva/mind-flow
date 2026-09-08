---
id: world-reconstruction-protocol
title: World transmission reconstruction protocol
type: statistical-protocol
status: proposed
provenance: commissioned-agent-proposal
author: Ren
created: 2026-09-08
updated: 2026-09-08
---

# World transmission reconstruction protocol

> **PROPOSED PROTOCOL. NOT PREREGISTERED. NOT AN EMPIRICAL RESULT.** This is
> Ren's statistical repair proposal. Its thresholds, estimands and permitted
> claims require methods review and affected-party review before data are
> inspected. It does not represent Fernando's adopted position, validate the
> thesis or authorise action.

## Conclusion first

The current World chart reproduces a useful arithmetic question, but it cannot
yet answer whether productivity reached workers, households or affected
communities. Its two headline lines are constructed from separately published
global GDP-per-person and modelled labour-share series. The difference between
them is algebraically the output index scaled by the change in labour share.
It is not independent evidence of a transmission mechanism.

The repair is to separate four claim domains that the existing chart
compresses. The worker domain then splits into three incompatible estimands:

1. exact replication of the repository arithmetic;
2. production income allocation;
3. worker outcomes, separated into aggregate compensation, earnings
   distribution and work autonomy; and
4. household agency.

Each estimand needs its own denominator, panel, price concept, uncertainty,
falsification tests and permitted language. None may borrow the claim strength
of another. A result may inform a typed IF predicate only at its own evidence
level. It does not authorise action.

## What the frozen arithmetic actually says

Let:

- `Y_t` be the published real GDP-per-person aggregate at time `t`;
- `s_t` be the separately published modelled labour share at time `t`;
- `0` be the first shared reference year;
- `I_Y,t = 100 * Y_t / Y_0` be the output index;
- `I_L,t = 100 * (Y_t * s_t) / (Y_0 * s_0)` be the constructed
  labour-attributed output index.

Then:

```text
I_L - I_Y = I_Y * (s_t / s_0 - 1)
```

The difference is therefore a deterministic restatement of labour-share
change, scaled by the GDP-per-person index. It does not add a separately
observed transmission channel. For annual growth, where `g_L` and `g_Y` are
fractions rather than percentage points:

```text
g_L - g_Y = (1 + g_Y) * (s_t / s_(t-1) - 1)
```

The annual gap likewise contains no independent evidence beyond output growth
and labour-share change. A displayed percentage-point gap is
`100 * (g_L - g_Y)`. The formula and display conversion must be stored
separately to prevent a hundredfold unit error.

The frozen repository snapshot reports an output index of `144.27`, a
constructed labour-attributed output index of `140.79` and a difference of
`-3.48` index points in 2025. Those numbers are internally derived from the
transformed snapshot. The exact upstream source bytes were not retained, the
publisher series were not reconstructed from one common-country panel, and
source uncertainty was not propagated.

### Permitted public wording now

> Within the frozen transformed snapshot, the constructed labour-attributed
> output index is 3.48 points below the GDP-per-person index in 2025, with both
> indexed to 100 in 2004. The snapshot contains no uncertainty interval. It
> combines separately published `WLD` and `OWID_WRL` aggregates whose coverage
> compatibility is unverified. The arithmetic has not been reproduced from
> retained source bytes and does not measure household welfare, affected
> cohorts, AI effects or agency.

### Prohibited public wording now

Do not say that the result proves:

- the world is or is not in an Engels' Pause;
- productivity has or has not reached workers;
- households gained or lost purchasing power;
- AI caused the difference;
- most people experienced the global average;
- the result is current, independently reproduced or ready to trigger action.

The next snapshot revision must replace the current population label, `World
aggregate where both component series report data`. The actual lineage combines
separately published `WLD` and `OWID_WRL` direct aggregates. No common-country
intersection was constructed. The build must reject the old wording for that
lineage.

## Four claim domains and six estimands

### E0. Replication estimand

**Question:** Can an independent analyst reproduce the exact frozen
construction from retained source bytes and declared transformations?

**Inputs:** The exact publisher responses, metadata, licences, selection rules,
adapter code, classifications and transformation code used by the snapshot.

**Output:** The two indices, their difference and every intermediate value,
reproduced without network access.

**Permitted claim:** The repository arithmetic is or is not reproducible from
the retained evidence package.

**Cannot claim:** Production allocation, worker welfare, household access,
agency, causation or forecast skill.

### E1. Production-allocation estimand

**Question:** What share of measured production income is allocated to labour
within a compatible accounting frame?

**Primary measure:** For continuity with the current SDG construct, adjusted
labour compensation divided by GDP at market prices. Self-employment labour
income must be imputed by a declared method. Numerator and denominator must
share sector, institutional, geographic and temporal coverage.

**Accounting bridge:** A labour-compensation-to-gross-value-added measure is a
separate sensitivity estimand. Reconcile GDP at market prices to gross value
added through product taxes and subsidies. Do not silently change the current
GDP denominator into gross value added.

**Aggregation:** Convert current-price national numerator and denominator
components to one currency using contemporaneous market exchange rates, sum
each side, then divide. This produces a market-price-weighted global production
share. A PPP-weighted result answers a different question and must be labelled
as a sensitivity. Do not average national shares and call the result a World
accounting share.

**Permitted claim:** Measured production income shifted towards or away from
labour within the covered accounting frame.

**Cannot claim:** A typical worker's real wage, household living standard,
access, agency or AI causation.

### E2. Worker purchasing-power estimand family

The following are separate estimands. They may use different populations,
numerators and sources, so their values cannot be merged into one series.

#### E2a. Household-price-deflated gross compensation per hour

**Question:** Did national-accounts output per hour and gross labour
compensation per hour move together after applying their relevant price
indexes?

Let `NGDP` be nominal GDP, `COMP` gross labour compensation including employer
social contributions and declared self-employment imputation, `H` total hours,
`P_Y` the output deflator and `P_C` the household-consumption deflator. When all
components share scope:

```text
change(x; a, b) = x_b - x_a

D
= change(log(NGDP / (P_Y * H)))
  - change(log(COMP / (P_C * H)))
= -change(log(COMP / NGDP))
  + change(log(P_C / P_Y))
```

Store annual `delta_1` and endpoint `delta_[a,b]` as different result IDs.
`delta_1(x,t) = change(x; t-1, t)`. `delta_[a,b](x) = change(x; a, b)`.
Neither an annual rate nor a multi-year endpoint change may inherit the other's
label, uncertainty or decision threshold.

This identity applies only to compatible aggregate compensation. Gross
compensation is an employer-cost accounting measure. Household-price deflation
does not make employer contributions or imputations disposable worker
purchasing power. The identity does not apply to median survey earnings.

For a registered cross-country aggregate, first compute each `D_i` from
local-currency growth indexes, then use fixed base-period employment weights.
The result is a **fixed-base employment-weighted mean of country-level per-hour
log-change differences**, not a directly observed World worker, job or hour:

```text
D_world = SUM_i(w_i,0 * D_i)
w_i,0 = covered_employment_i,0 / SUM_k(covered_employment_k,0)
```

Do not aggregate cross-country compensation or output levels unless a separate
currency-conversion or PPP estimand is registered.

The weighting unit is the employed person counted in the frozen base-period
employment source. The outcome unit is an aggregate log change per paid hour
within each country. Job counts, worker counts and hours are not interchangeable;
alternative weighting units are separate sensitivity estimands.

#### E2b. Median and distributional earnings

**Question:** How did the earnings distribution move for the same defined
workers and period?

Use linked administrative or survey microdata with a declared worker universe,
hours concept, job coverage, non-response treatment and household-relevant
deflator. Report median, quantiles, transitions and zero-earner treatment.

#### E2c. Work and time autonomy

**Question:** Did named workers gain control over desired hours, scheduling,
unpaid care, security, refusal and exit?

These are separate direct outcomes, not components to add to earnings. Their
construct validity and affected-party meaning must be tested before use.

**Permitted claims:** E2a may support an average real gross-compensation-cost
claim. E2b may
support a distributional earnings claim. E2c may support a scoped work-autonomy
claim. One may not stand in for another.

**Cannot claim:** Household access, individual control within households,
agency or an AI effect.

### E3. Household agency estimand

**Question:** Can named people in named places reliably obtain important
outcomes while retaining meaningful choice, refusal, time, privacy and appeal?

Report delivered in-kind basket coverage separately, matching each service to
one required basket component for the same unit and period. State the valuation
basis, quality, eligibility and actual usability. Never add the value of a
service while also subtracting its full cash price. Report debt stock and liquid
buffers as separate resilience measures, not income flows. Household production
and unpaid care remain separate time and burden accounts.

Freeze one registered analysis unit `u` before joining records. It is either a
household or a person, never the phrase "household or person" resolved during
analysis. For each required in-kind component `j`, pool every user cash charge
before testing affordability:

```text
cash_co_payment_total(u)
= SUM_j(copayment(u, j) + mandatory_complement_cash_cost(u, j))

cash_access_margin(u)
= equivalised(disposable cash resources(u), registered_scale)
  - equivalised(required cash basket cost excluding covered components(u), same scale)
  - equivalised(cash_co_payment_total(u), same scale)
  - equivalised(debt-service due(u), same scale)

cash_pass(u) = cash_access_margin(u) >= 0

in_kind_pass(u, j)
= available(u, j)
  AND eligible(u, j)
  AND cash_charge_recorded_in_pool(u, j)
  AND travel_time(u, j) <= registered_travel_time_limit(j)
  AND wait_time(u, j) <= registered_wait_time_limit(j)
  AND complement_available(u, j)
  AND delivered(u, j)
  AND quality(u, j) >= registered_quality_threshold(j)

continuity_floor_met(u)
= cash_pass(u)
  AND ALL required in-kind components pass
```

Money, travel time, wait time, complement availability and quality remain
separate typed fields with separate thresholds. They must never be added into a
scalar. Pooling cash charges prevents several individually small copayments from
evading the household cash floor. The required cash basket excludes only the
component actually replaced by delivered provision, which prevents double
counting in either direction.

Every component must use the same registered unit, place and period.
Missing evidence remains `unknown`, never false or satisfied. Report loss at
each access stage rather than multiplying unlike rates into one score. A
positive cash margin cannot offset a missing required service.

Evaluate each threshold against its registered uncertainty rule. Return `true`
only when the admissible interval lies wholly inside the passing region,
`false` only when it lies wholly inside the failing region, and `unknown` when
it crosses a boundary or evidence is missing. Mixed equivalisation scales or
mixed monetary periods must fail validation.

If `u` is a person, shared household costs require a preregistered allocation
rule before they can enter that person's cash margin. The rule must name the
household unit `h`, the linked persons, the economic rationale, uncertainty and
sensitivity alternatives. Allocation shares across the registered household
must sum to one for each cost and period, and one cost cannot be charged to
several people in full. A person-level result must report how it changes under
reasonable alternative allocations. If those allocations change the threshold
state, the result is `unknown`, not a convenient pass or failure.

If `u` is a household, write `u = h` and keep the result at household level.
Each member's agency, control and experienced burden remains a separate
person-level record `p` linked to `h`. A household surplus cannot be allocated
to a member without evidence of that member's actual command over it.

The cash margin and in-kind coverage are necessary but not sufficient. Report
direct agency measures alongside them, including ability to choose, refuse,
change provider, challenge a decision, preserve privacy and control time.
Measure individual outcomes where household aggregation could hide unequal
control or harm. Person-level agency cannot be inferred from a household-level
cash margin. Each member `p` needs a separate person-level outcome record and a
declared link to household unit `h`.

**Primary outputs:** The component-level pass and unknown states, cash shortfall,
movement across the conjunctive continuity floor and direct agency outcomes by
affected cohort.

**Permitted claim:** A named cohort's matched cash margin, delivered in-kind
coverage or independently validated direct agency outcome changed within the
study scope. Do not collapse them into one abundance score.

**Cannot claim:** Universal abundance, durable benefit outside the observation
window, absence of transferred harm or an AI effect without separate evidence.

## Panel contract

The same dataset must not change identity as the claim becomes stronger.

| Panel | Construction | Legitimate use |
|---|---|---|
| `P0` | Publisher global aggregates | Replication audit only |
| `P1` | Strict balanced country panel with identical countries and variables throughout | Stable-panel estimate, not automatically representative |
| `P2` | Available-country repeated cross-section | Missingness and sensitivity analysis |
| `P3` | Cohort microdata, beginning with separate Australian clerical occupations | Distribution, access and agency analysis |

Before constructing any panel, freeze the target country and territory
universe, denominator sources, denominator vintages and common reference year
for population, employment and GDP coverage. Coverage is itself a derived
result with lineage and uncertainty.

Balanced completeness can select richer and more statistically capable
economies. For `P1`, publish the inclusion model, profiles of excluded units and
partial-identification bounds for the target universe. If admissible `P1` and
`P2` estimates occupy different decision regions, the evidence-consistency
state is `conflicted`.

### Proposed gate for the label `World`

The following are proposed governance choices, not validated scientific facts.
They must be reviewed and fixed before results are inspected:

- at least 90 per cent of world population, employment and GDP covered in
  every year;
- at least 75 per cent employment coverage in every declared major region;
- no omitted country exceeding 2 per cent of world population or GDP without
  explicit lower and upper bounds;
- missing-country bounds remain inside the same preregistered decision region.

For each estimand, preregister a smallest material effect `delta` and decision
regions such as materially adverse, practically equivalent and materially
favourable. Replace sign-only tests with bounds relative to those regions. If
missingness bounds cross a region boundary, the result is `unknown`. If
credible specifications occupy opposing material regions, it is `conflicted`.

If any gate fails, label the result `covered economies` and publish the exact
coverage. Report `P1` and `P2` together. A changing repeated cross-section must
never masquerade as a balanced World panel.

## Weight, price and denominator rules

Every result bundle must declare one choice for each row before computation.

| Purpose | Primary rule | Required sensitivity |
|---|---|---|
| Labour-share accounting | Current-price compatible numerator and denominator, no deflator | Self-employment imputation method |
| Household floor | Local reference-budget prices | Basket, tenure and household-type variants |
| E1 production aggregate | Current-price components converted at contemporaneous market exchange rates | Fixed-base market-price weights |
| E1 PPP comparator | Separate estimand, never pooled with the market-price result | Fixed PPP vintage and explicit welfare concept |
| Within-country growth | Local-currency indexes, no PPP conversion | Alternative publisher-consistent deflator |
| E2a aggregate compensation | Fixed base-period employment weights across countries | Current employment and Törnqvist weights |
| E2b worker distribution | Person weights for the frozen worker universe | Household and hours weights |
| E2b and E3 cross-country welfare levels | Fixed PPP vintage | Next available PPP vintage, reported separately |
| E3 household access | Person weights within the target household population | Household weights, never substituted silently |
| Country distribution | Equal-country only when explicitly labelled | Population and employment weights |

Never mix output deflation, household purchasing power and PPP conversion
without showing each step. Never change weights, deflators, panels or endpoints
after seeing which combination produces a preferred conclusion.

## Required decompositions

At minimum, publish:

- fixed-weight within-country change and changing-country-weight effect;
- country entry, exit and missingness contribution;
- GDP per declared population decomposed as
  `GDP / population = (GDP / total hours) * (total hours / employed people) *
  (employed people / population)`;
- whether population means total, working-age or labour-force population, with
  demographic composition retained as a separate term;
- compensation separated into employee compensation, self-employment
  imputation and hours;
- household resources separated into earnings, capital income, transfers,
  taxes, debt-service flows, liquid buffers, in-kind services and unpaid work;
- sector, occupation, region, sex, age, disability, household type and income
  decile where data and disclosure controls permit;
- the share and count of people in adverse cohorts, not only average movement.

An aggregate improvement and a cohort deterioration may both be true. Neither
may erase the other.

## Vintage, timing and revision contract

Preserve a complete evidence cube for every source value:

1. observation or reference period;
2. publisher vintage identifier, or explicit unknown;
3. publisher release instant, date, bounded first-seen interval, or unknown;
4. retrieval time and its precision;
5. exact byte acquisition time;
6. source, adapter and method hashes;
7. first-release, revised and latest values;
8. epistemic classification and classification-policy version.

If an as-published vintage was not contemporaneously archived or independently
evidenced, store `first_release_status: unknown`. Never label a value rebuilt
from the latest dataset as first release, and never use it for prospective
forecast scoring.

`Reference period`, `publisher release`, `retrieval`, `acquisition` and
`snapshot revision` are different clocks. A recent retrieval cannot freshen an
old observation. A checksum proves retained byte identity, not publisher
authenticity. First-release analysis may use only information demonstrably
available at that decision time.

## Uncertainty contract

Use the uncertainty supplied by the source and preserve its dependence:

- design-based survey uncertainty with replicate weights;
- publisher model draws or covariance for modelled estimates;
- Monte Carlo propagation that retains cross-series correlation;
- empirical first-release-to-latest revision distributions, stratified by
  indicator, country and methodological regime;
- time-block methods where serial dependence is material;
- partial-identification bounds where uncertainty cannot be estimated;
- a separate specification envelope for panel, weight, deflator, window and
  missingness choices.

A specification envelope is not a confidence interval. If source uncertainty
or dependence cannot be recovered, publish `inference unavailable` instead of
manufacturing precision.

Before using a revision distribution, freeze the eligible vintage population,
pooling rule, minimum revision history and structural-break test. Do not pool
across methodology breaks merely to obtain a larger sample.

## Falsification suite

Every stronger claim must survive the tests relevant to it:

1. algebraic identity tests detect a renamed input rather than a new measure;
2. publisher-global and balanced-panel results are compared;
3. fixed and changing weights are compared;
4. output and household deflators are compared;
5. first-release and latest-vintage results are compared;
6. alternative preregistered start and end windows are compared;
7. leave-one-country and leave-one-region-out tests are reported;
8. missingness bounds test whether omitted units cross the material-effect
   decision region;
9. an aggregate-improves, cohort-worsens fixture detects Simpson's paradox;
10. a mean-improves, median-worsens fixture prevents average substitution;
11. a historical benchmark is reconstructed through an explicit compatibility
    crosswalk covering output concept, worker denominator, wage or compensation
    concept, price index, geography, population and uncertainty. An unresolved
    mismatch blocks the Engels analogy, not the modern estimand;
12. exposure-without-adoption and employment-decline-without-AI placebos are
    retained as counterexamples.

AI causation additionally requires observed adoption, timing, a credible
comparison and a named target causal estimand. The design must declare the
assignment mechanism, anticipation window, interference and spillover rule,
staggered-treatment method, attrition, treatment misclassification, negative
controls and sensitivity to unmeasured confounding. Pre-trend compatibility is
a diagnostic, not proof of identification. Aggregate co-movement cannot supply
those conditions.

### Deterministic robustness rule

Freeze one primary specification and a finite set of admissible sensitivity
specifications before results. A claim is `robust within the registered set`
only when the uncertainty sets for the primary and every required sensitivity
remain in the same decision region. Crossing into practical equivalence makes
the claim `specification-sensitive`. Occupying opposing material regions makes
it `conflicted`. A missing required specification makes it `unknown`.

### Multiplicity and search rule

Name one primary contrast per estimand and group secondary outcomes into
declared hypothesis families. Freeze endpoints, windows, subgroups and stopping
rules. Use a declared family-wise, false-discovery or hierarchical model where
confirmatory claims are made. All additional searches remain exploratory and
cannot promote the primary claim.

## Machine-testable result bundle

The intended artifact set is:

```text
evidence/estimands/registry.json
evidence/sources/<source>/<vintage>/manifest.json
evidence/sources/<source>/<vintage>/raw/*
evidence/normalised/world-transmission.parquet
evidence/panels/<panel-id>.json
evidence/coverage/<panel-id>.json
evidence/specifications/frozen-grid.json
evidence/vintages/revision-cube.parquet
evidence/results/<result-id>.json
evidence/claims/ledger-v2.json
evidence/claims/policy-v1.json
evidence/reviews/<review-id>.json
```

For Parquet and other container formats, pin both logical content and physical
bytes. The logical digest uses canonical row and field order, canonical null,
decimal and UTC timestamp representations, and a versioned schema. The physical
digest binds the emitted file plus serializer and runtime versions. Equivalent
logical records may have different physical hashes because metadata and row
group layout differ.

Each result must content-address:

- estimand and claim level;
- population, place and period;
- panel membership and exclusions;
- numerator, denominator, units and transformations;
- weights, price concept, PPP vintage and endpoints;
- evidence cut-off and vintage policy;
- source bytes, metadata, code and environment;
- unrounded result and deterministic rounding rule;
- sampling uncertainty, revision uncertainty and specification envelope;
- sensitivity results and falsification failures;
- a checksum reference to a separately versioned claim policy containing
  permitted public wording and prohibited public wording;
- scope of any IF predicate that consumes the result.

The same producer cannot make a result public merely by writing permissive
language into its own bundle. The claim ledger must bind the exact statement
hash, result hash, evidence role and support location, reviewer disposition,
expiry and replacement lineage.

## Acceptance tests

A result cannot progress beyond internal research draft unless:

- a separately versioned result dependency graph derives the complete required
  artifact set before validation;
- the result bundle must content-address the exact dependency-graph version used
  for closure. Validation fails if that graph, its source membership or its
  transformation closure changes after result generation;
- 100 per cent of dependency-graph input bytes are retained and hash-valid,
  with no missing referenced inputs, extra unreferenced inputs, transformations
  without code hashes, source values without row or field lineage, or claims
  with an incomplete dependency closure;
- publisher origin has a cryptographically signed artifact or checksum whose
  publisher signing key is independently authenticated, an
  authenticated publisher API receipt plus an independently timestamped
  archival witness, or an independently governed archive with a verified chain
  to the publisher. Otherwise the maximum claim is `local capture reproduced`,
  even when two downloads agree;
- a clean environment reproduces every published value from those bytes;
- source identity, units and panel membership pass closed contracts;
- first-release analysis contains no look-ahead information;
- exact decimal or rational identities close exactly where possible. Otherwise
  absolute and relative tolerances are preregistered per formula, scale and
  numeric representation before rounding;
- declared coverage and missingness gates pass;
- uncertainty and dependence are propagated or inference is withheld;
- public wording is generated only from a separately governed claim policy and
  checksum-bound ledger entry;
- an independent analyst reproduces the bundle;
- affected-party and methods review records are typed, scope-bound, expiring,
  checksum-pinned and preserve dissent. A boolean `accepted` is insufficient.

Failure is a result. The bundle must state which claim level remains available
after a failed gate.

## Non-ordinal claim routing into the IF Protocol

Evidence capabilities are typed and non-substitutable. A claim may consume only
the capabilities named in its dependency graph. No ordering is implied unless
the claim contract explicitly requires one capability as an input to another.
Forecast skill and causal identification remain orthogonal.

| Evidence passed | Maximum supported IF predicate |
|---|---|
| Reproducible arithmetic | `this construction reproduced` |
| Compatible production accounts | `measured production allocation changed` |
| Compatible aggregate compensation and price data | `household-price-deflated gross compensation per hour changed for the covered accounting scope` |
| Cohort distribution | `the named cohort's distribution changed` |
| Matched household resources and basket for the same unit and period | `the named cohort's measured access margin changed` |
| Construct-valid, invariant direct agency measures with missingness controls and a complete affected-party governance disposition | `the named cohort's measured agency outcome changed` |
| Credible causal design | `the named adoption contributed to the outcome` |
| Adequate prospective resolved sample, frozen holdout, declared naive and reference baselines, calibration, discrimination and utility gates | `the model demonstrated bounded predictive skill within the registered domain` |

Keep axes separate. Predicate truth is `true`, `false`, `unknown`,
`not-applicable` or `disputed`. Measurement availability, reference freshness,
release recency and evidence consistency are separate fields. `Stale` belongs
to freshness and `conflicted` belongs to evidence consistency, not predicate
truth. The current executable contract still combines these for compatibility,
so an explicit migration is required before this protocol feeds it.

A capability cannot be inferred from another capability. A true predicate can
make an option eligible for authority review only where a
separate action contract also proves current authority, consent, funding,
service capacity, help, appeal and expiry. It does not authorise action.

### Forecast admission

One issued and resolved forecast is a scored case, not evidence of skill. A
predictive-skill predicate requires a prospective registry, an adequate
resolved sample fixed by power or precision analysis, a frozen holdout,
declared naive and domain baselines, calibration and discrimination tests,
loss-weighted utility thresholds and a stopping rule. Report warning exposure
and behavioural response because publication can change the outcome.

## Australian `P3` carry-over controls

The cohort panel inherits the Australian pilot's strongest boundaries:

- preserve source-native denominators and suppression flags;
- keep all five NERO clerical occupations separate;
- bind the occupation classification version and reject silent remapping;
- require scope-compatible cohort joins and classify shared-source dependence;
- publish precision and suppression rules before subgroup inspection;
- never substitute a place average when the named cohort is missing.

## Adversarial decision log

Before results are opened, reviewers must answer:

- Which estimand could produce the opposite conclusion while all current
  arithmetic remains correct?
- Which omitted cohort could carry the apparent gain or loss?
- Which panel, weight, price or vintage choice has the most sign-changing
  power?
- Which claim is still modal or definitional and therefore unable to lose?
- What observation would make us narrow or abandon the claim?
- Who bears the cost of a false positive, false negative and delayed finding?
- Who owns the threshold and who may reject its use?

Record answers, changes and dissent before computation. Results must never
rewrite the preregistered question silently.
