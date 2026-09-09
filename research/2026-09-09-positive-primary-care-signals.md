---
id: positive-primary-care-signals-2026-09-09
title: Three measured improvements, with no personal agency claim
type: research
status: review
provenance: commissioned-agent-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-09
updated: 2026-09-09
authority: none
---

# Three measured improvements, with no personal agency claim

Three NSW primary-care measures moved in a favorable direction between 2023-24 and 2024-25. They show narrower price barriers in their respective populations. They do not show that a particular rural worker has more choice, control or access today.

The current construction revision is `pilots/australia/data/positive-signals-2026-09-09.r3.json`. It binds the reviewed basket and evaluator enforcing numeric observation domains without changing any source observations. The original and r2 positive artifacts remain retained with their old condition references; they are not silently overwritten.

| Published NSW measure | 2023-24 | 2024-25 | Observed change | Population and condition |
| --- | ---: | ---: | ---: | --- |
| Patients fully bulk-billed for GP attendances | 55.2% | 56.1% | +0.9 percentage points | Patients with Medicare GP attendances in the year; fewer exposed to a GP attendance charge across that year. Not people who never attended, nor all costs of care. |
| GP delay or non-use due to cost | 9.3% | 7.2% | -2.1 percentage points | Survey-scope residents aged 15+ who needed GP care; a lower estimated share encountering this price barrier. |
| Prescription delay or non-use due to cost | 9.4% | 6.8% | -2.6 percentage points | Survey-scope residents aged 15+ who needed prescription medicines; not a particular medicine, condition or treatment pathway. |

Source: Productivity Commission, *Report on Government Services 2026*, [primary and community health](https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/), tables 10A.31, 10A.26 and 10A.33. Publication date: 5 February 2026. Original data suppliers and exact selectors are retained with each observation. Exact publication time is unknown.

## Who can move the condition?

General practices set fees and bulk-billing choices; the Australian Government sets Medicare benefits. Prescription cost involves Australian Government PBS settings and pharmacies. These are descriptions of relevant institutional roles, not verified control over every case, proof that a policy caused the change, or a promise to act. The affected person is not assigned sole responsibility for moving the barrier.

The fully bulk-billed measure is related price context for the basket's GP cost condition. It is **not** the executable GP cost-delay predicate: the denominators differ. The other two observations use the same series as the GP and prescription cost conditions. Their historical periods remain historical, and do not make those conditions currently satisfied.

## What uncertainty survives?

The GP cost estimates have published 95% confidence-interval half-widths of 0.9 and 0.7 percentage points. Prescription estimates have half-widths of 1.1 in both years. Those intervals are retained, but no covariance or publisher test of the year-to-year NSW difference was captured. We therefore report an observed change without claiming statistical significance.

The bulk-billing administrative share has no sampling interval in the selected table. That does not eliminate claims-coverage, definition or nonattendance limitations. None of the three identifies an individual or establishes a causal intervention effect.

This is post hoc selection of favorable measures to correct an exclusively adverse narrative. It is not a preregistered test or a representative verdict on the health system. The full measurement still retains less favorable evidence, including patient-billed GP and specialist gaps. We do not count a barrier and its arithmetic complement as two improvements, sum these measures, or treat overlapping GP populations as independent gains.

## Machine-checkable, without changing synthetic authority

`pilots/australia/data/positive-signals-2026-09-09.json` retains observations, uncertainty, populations, institutional owners, exact condition-definition references and source hashes. Each metric is validated against the existing agency-map metric definition and checksum function. No new schema family is introduced. The container is a producer-verified research artifact, not a validated full actor/provider agency map.

The existing illustrative agency maps remain synthetic. Across the two fixtures, their `signals` arrays contain 4 increase-direction, 8 decrease-direction and 1 maintain-direction metrics. Counting the duplicated public projection yields the brief's 8 increase and 16 decrease entries, not 24 distinct signals. These hypotheses are not relabelled as observed, and their actor, control and authority claims remain unchanged. Positive direction is kept separate from the desired numerical direction: a measured reduction in a cost barrier is favorable even though the raw metric direction is `decrease`.

Reproduce with Node 22:

```sh
node pilots/australia/tools/positive-signals.mts --check
node --test pilots/australia/tests/positive-signals.test.mjs
```

Validation replays the retained primary-care acquisition and rejects modified values, owners, condition bindings or an invented claim that personal agency has been measured. External review remains necessary for measurement interpretation, scope, rights and any eventual use.
