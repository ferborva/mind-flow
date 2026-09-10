---
id: country-weather-criteria-v1
title: Storms versus weather, a proposed investigation rule
type: statistical-protocol
status: proposed
author: Ren
provenance: commissioned-proposal
sources: [2026-09-08-abundance-frame-conversation, 2026-09-10-where-the-money-sits-and-the-weather-station]
created: 2026-09-10
---

# Storms versus weather: what would earn a closer look?

**An unusual movement could justify investigation; it would not establish a
storm.** Fernando supplied the weather-station metaphor and country breadth.
He has not selected a ranking, a signal list or a definition of a storm. This
is Ren's proposed statistical question, not an adopted warning rule. No storm,
binding-category change, forecast, causal effect or authority is claimed here.

## One proposed rule, three different constructs

Compare a country's latest annual movement with its ten immediately preceding
annual movements, all extracted from the same retained publisher vintage.
Define `r = (count(prior < latest) + 0.5 × count(prior = latest)) / 10` after
taking the movement's absolute magnitude. The proposed investigation condition
is **r ≥ 0.90**, with the mathematical domain **0 ≤ r ≤ 1**. Exact ties receive
midrank, so a constant series has rank 0.5, not 1. No rounding precedes ranking.

| Retained series | Movement to compare | Underlying domain | Interpretation ceiling |
| --- | --- | --- | --- |
| WDI CPI annual change | Absolute annual percentage change itself | Greater than -100%, no finite upper bound | Typical-consumer price movement, not an essentials basket or affordability; inflation and deflation both warrant interpretation |
| WDI electricity access | Absolute year-on-year percentage-point change | Access level 0 to 100%; signed change -100 to 100 points | Connection coverage, not reliable power, compute capacity, affordability or an individual's usable access |
| ILO labour income share | Absolute year-on-year percentage-point change | Share 0 to 100% of GDP; signed change -100 to 100 points | Modelled aggregate distribution, not wages of a person, job exposure or AI causation |

This requires eleven annual CPI-rate observations, or twelve annual share-level
observations, including the latest. Missing years are not skipped or filled.
Nulls, duplicates, invalid domains, absent source bytes or missing selectors
stop eligibility. The latest row cannot enter its own reference distribution.

Ten years is a proposed minimum with coarse ranks, not a sufficient sample for
estimating rare-event probabilities. The 0.90 threshold is an uncalibrated
review priority, not a 10% false-alarm rate, significance test or crisis
probability. Overlapping changes, serial dependence and testing many countries
make that distinction essential. Twenty years could improve resolution but
increase exposure to structural breaks; 0.95 could reduce flags but miss
meaningful changes. These alternatives are research choices, not extra rules
silently selected after seeing outcomes.

## Retention is necessary; comparability is a separate judgement

The retained country measurement file supplies exact vintages and selectors.
Same-vintage history can still contain basket revisions, survey changes,
model revisions, country boundary changes or changing definitions. A reviewer
must assess the specific country, series and complete comparison interval
before this rule is interpretable. A Boolean supplied by a caller does not
prove that review happened. This edition does not accept such a shortcut.

The proposed executable-IF bindings use the existing signal and condition
definition family, with no evolution events or registered observations. Three
Australian examples show exact construct and scope binding; they are not a
150-condition empty country panel. The proposed rank is not computed on real
data here. Numeric history sufficiency and source retention can be checked
without declaring history comparable. Missing comparability remains named.

The existing-family objects are in
[`weather-criteria.v1.json`](weather-criteria.v1.json). Each condition binds its
rank signal, threshold and declared domain by the existing definition hashes.
The signal binds the full measurement-file hash and raw-source identity;
the output also binds this proposal's bytes. Its history rows retain the
publisher selectors and model flags. No `added` event is appended merely to
register these examples, and no example counts toward the three-event gate.

Each proposed predicate asks for one normalized rank observation, with a
365-day lookback and maximum age and persistence of one. These are explicit
annual-review design choices, not calibrated freshness or persistence rules.
They do not replace the ten preceding movements required to construct a rank.
Any future normalized observation must keep the underlying reference-period
end, not use a new computation date to freshen old evidence. The claim window
is a proposed one-year review scope, not a transition timetable. This edition
registers no observations; the existing evaluator returns unknown without them.

## What the rank would miss

A long deterioration can be ordinary relative to its own bad history. A tiny
movement near a ceiling can rank highly without mattering to people. A large
improvement can rank as unusually as a disruption. Always retain the signed
movement, level, units, population, uncertainty and affected groups alongside
any eventual rank. Do not turn the rank into an agency score, combine the three
series into a traffic light, or equate a national mean with household access.

Cross-country divergence is an alternative research question requiring
comparable constructs, explicit comparator selection and a declared divergence
domain. A change in which IF binds is another, requiring linked evidence on
the same essentials, population and alternative routes at both times. Neither
alternative has an adopted numeric rule in this edition. A future threshold
needs its own content-addressed definition before use.

## Goal / Signals / Actions

Agency remains the goal. These proposed signals would identify questions about
movement; the first action would be source and context review. Escalation to
preparation would additionally need a credible mechanism of harm or opportunity,
affected-party input, uncertainty, ownership and legitimate authority. Ren's
proposal cannot supply those by assigning a high rank.

The open question for Fernando remains: does a storm mean an unusual movement,
a binding-category change, a divergence, or something else? His ambition to
prepare for crisis points and his sequencing concession both remain in the
source record. This proposal does not settle their relationship for him.

## Reproduction

After country-set and measurement integration, use Node 22:

```sh
node --test signals/countries/weather-criteria.test.mjs
node signals/countries/weather-criteria-build.mjs --check
```

The builder calls the existing measurement extractor and requires exact
measurement-byte replay from pinned source bodies, response headers and receipts
before producing bindings. Missing source files fail visibly. `--source-root=`
and `--country-set-root=` are local integration aids selecting trusted project
checkouts, not a sandbox for untrusted code. Reproduction does not authenticate
publishers or prove longitudinal comparability. No real-data rank is emitted.
