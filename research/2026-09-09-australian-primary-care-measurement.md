---
id: australian-primary-care-measurement-round-08
title: Australian primary care, measured conditions and remaining gaps
type: research
status: review
provenance: commissioned-proposal
created: 2026-09-09
updated: 2026-09-09
---

# Australian primary care, measured conditions and remaining gaps

**Price demonstrably obstructed GP care for a survey-estimated subset of NSW
residents in 2024-25. The retained data cannot identify a rural clerical
worker's binding condition today.** The basket now has reproducible indicators
in all five categories for the GP item. Three are rule or contextual measures,
of the kinds expressly permitted in the brief. This supports the literal
five-category retained-indicator gate, subject to independent review. It does
not establish five direct, jointly measured current access conditions.

This is Ren's commissioned research, not Fernando's healthcare policy or a
clinical recommendation. The [measurement boundaries](#measurement-boundaries)
apply to every number below.

Independent review prompted an explicit construction revision, `pilots/australia/basket/primary-care.r2.json`, with `primary-care.kernel.r2.json`. Original basket, kernel and dashboard snapshot bytes remain retained. Nonnegative months, monetary gaps and workforce intensity now have one-sided domains rather than unsupported finite maxima. Specialist pathway price is explicitly missing because the all-specialty mean is not that pathway's price. Coverage of one selected cell out of one is not survey representativeness. No source value or observation period changed.

## What the retained sources measure

| Category | Measure and population | Current evidence ceiling |
| --- | --- | --- |
| Price | NSW residents in the ABS survey population who needed a GP: 7.2% reported cost-related delay or non-use in 2024-25, compared with 9.3% in 2023-24 | A historical self-reported obstruction, not a household access-margin measure |
| Permission | The MBS eligible-practitioner telehealth pathway has a 12-month face-to-face lookback, alongside the MyMedicare alternative and explicit exemptions | A published rule parameter, not the percentage of residents eligible or actual use |
| Proximity | NSW GP FTE per 100,000 residents in 2024: major cities 115.7; outer regional 77.2; remote 91.9; very remote 131.7 | Spatial supply intensity, not journey time or physically accessible premises |
| Availability | NSW survey respondents obtaining urgent GP care: 45.9% were seen in under four hours in 2024-25 | Timeliness among people obtaining care, not all urgent need |
| Capability | In the ABS 2018 adult health-literacy survey, 14% reported difficulty navigating the healthcare system | An old, broad health-system measure, not current GP-specific capability |

Sources: [Productivity Commission, RoGS 2026 section 10](https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/),
released 2026-02-05, tables 10A.19, 10A.26 and 10A.43;
[MBS AN.1.1](https://www9.health.gov.au/mbs/fullDisplay.cfm?type=note&q=AN.1.1),
retrieved 2026-09-09; [ABS Health Literacy 2018](https://www.abs.gov.au/statistics/health/health-conditions-and-risks/national-health-survey-health-literacy/latest-release),
released 2019-04-29. All were retained on 2026-09-09. The
[source manifest](../pilots/australia/sources/primary-care/2026-09-09/capture.json)
records original URLs, headers, byte lengths and SHA-256 digests.

**The remoteness pattern defeats a simple story that supply always falls with
distance.** The very remote NSW estimate exceeds the city estimate. Different
population sizes, service models and GP workloads matter. A state and
remoteness classification does not locate the nearest accessible appointment.
Treating the FTE ratio as the binding proximity condition would exceed this
measurement.

The NSW GP-cost estimate has a published 95% confidence-interval half-width of
0.7 percentage points. The urgent-care estimate's half-width is 6.0 points.
These are retained separately from point estimates. The extractor never
mistakes a confidence interval for prevalence or a suppression marker for zero.
They do not share the same denominator, so ranking their percentages cannot
identify a dominant category. [RoGS dataset](https://assets.pc.gov.au/2026-01/rogs-2026-parte-section10-primary-and-community-health-dataset_0.csv?VersionId=skSVcIjTxjuNWGWtKhp75L9zKdEohB9W),
tables 10A.26 and 10A.43, retained 2026-09-09.

## Basket and geography

The [basket](../pilots/australia/basket/primary-care.v1.json) contains a GP
consultation, an atorvastatin prescription and community-pharmacy dispensing
pathway, a GP-to-specialist referral, and an after-hours GP option. Each binds
an existing executable IF definition by its exact content hash.

Atorvastatin was selected because AIHW identifies it among the most-prescribed
medicines. The prescription-cost series is broader: it covers prescription
medication as a whole. No drug-specific affordability, dispensing completion
or eligibility series has been substituted into that gap.
[AIHW, Medicines in the health system](https://www.aihw.gov.au/reports/medicines/medicines-in-the-health-system),
retrieved 2026-09-09.

The referral pathway retains the official MBS note about referrals, including
the default period and exceptions. The specialist cost series describes
patient-billed attendances across specialties; it does not follow a referral
from issuance to completion. After-hours data likewise describe a broader
population than the particular urgent unsociable-hours telehealth exception.
[MBS GN.6.16](https://www9.health.gov.au/mbs/fullDisplay.cfm?type=note&q=GN.6.16)
and [ABS Patient Experiences 2024-25](https://www.abs.gov.au/statistics/health/health-services/patient-experiences/2024-25),
retrieved 2026-09-09.

The finest defensible join to the retained NERO cohort is **NSW state context
attached to each separate NSW occupation and SA4 series**. No NERO counts are
summed. The healthcare evidence refers to 2024-25 and the selected NERO vintage
to August 2026. They are neither contemporaneous nor linked person records.
An SA4 is not a remoteness stratum, and assigning one state's percentage to an
SA4 does not create a local estimate. The
[derived record](../pilots/australia/data/primary-care-2026-09-09.json) keeps
the separate occupation observations and those boundaries machine-readable.

## Binding condition and ownership

For the subset reporting cost-related GP delay, **price was an observed
barrier in the survey period**. General practices control fees and individual
bulk-billing choices. The Australian Government controls Medicare benefit
settings. This identifies the institutional places where the price condition
can change; it does not allocate a remedy or tell a patient what to do.

For a particular rural clerical worker today, the binding category is unknown.
The evidence does not tell us their concession status, medical needs,
transport, provider relationships, time constraints, accessible appointment
options or ability to navigate the available services. It also cannot show
that reducing a fee would secure an appointment. The next comparable annual
cost-delay observation can test population-level movement; identifying a
current individual bottleneck requires a different observation.

## Definition evolution, with visible consequences

Three source-driven changes use the existing kernel, rather than new machinery:

1. **Narrowed:** the initial child-and-adult GP-cost scope is restricted to the
   survey's age scope. The earlier child-inclusive definition hash no longer
   binds the current condition.
2. **Definition revised:** the observation window changes from 90 to 366 days
   after encountering annual source data. The zero-cost-obstruction threshold
   remains unchanged. The old definition hash is incompatible, and the
   2024-25 data remain stale at the September 2026 assessment.
3. **Split:** routine GP telehealth and urgent unsociable-hours telehealth are
   separated after the MBS exemption is found. The parent is superseded.
   The routine relationship parameter cannot be projected onto the urgent
   child, which has no matched normalised observation.

These are research construction events recorded in this session. Their
one-second ordering is a local deterministic sequence, not a history of past
operational use or independently witnessed timestamps. The evaluator's small
historical-period repair preserves actual observation dates and current
normalisation dates. It does not make old evidence fresh. The complete
[kernel](../pilots/australia/basket/primary-care.kernel.json) retains exact
definitions, measured observations, source hashes and event chains.

## Panel theory and deletions

The new panel contains eight inherited macro-context measures and four
distinct Australian primary-care measures. All eight previously unmeasured
proposals are deleted with explicit reasons in the
[disposition register](../pilots/australia/basket/panel-dispositions.json).

GP cost delay does not become household access margin. GP spatial density
does not become corporate concentration. Health literacy does not become
social-protection readiness. Those constructs need different data. Removing
them from the panel removes unsupported measurement claims; it does not
declare the corresponding conditions satisfied. The archived snapshots retain
their original definitions and values.

## Measurement boundaries

The opposition tests remain substantive. A rural GP would challenge FTE as
appointment supply. A Medicare statistician would distinguish fully bulk-billed
patients, bulk-billed attendances and people who never obtained care. A
disability advocate would challenge an old general navigation score as a
description of accessible service design. A person unable to pay could face
both a fee and a queue. A public-finance reading cannot identify a causal
effect of rebates from these before-and-after descriptive series. These are
analytical challenges, not claims of consultation with those people.

The brief's one-item five-category indicator gate is supported for the GP item;
the stronger direct-current comparison is an additional evidence ceiling, not
a replacement gate. Workstream B's coverage of every basket item remains
incomplete. Item-specific
prescription, referral and after-hours coverage is incomplete. Which category
binds today remains undetermined for each basket item and geography. The NSW
price finding is historical and scoped to the reporting subset. Agency itself
is unmeasured.
The evidence supports the narrower historical and contextual statements above,
and no clinical, publication, intervention or decision authority follows.

## Reproduction

On Node 22:

```sh
node pilots/australia/tools/primary-care.mts --check
node pilots/australia/tools/primary-care-basket.mts --check
node --test pilots/australia/tests/primary-care.test.mjs dashboard/tests/primary-care-panel.test.mjs
```

Acquisition metadata distinguishes publication dates, HTTP response dates and
capture time. SHA-256 verifies retained bytes against the local manifest; it
does not independently authenticate the publisher. Whole-snapshot upstream
reconstruction remains incomplete for the inherited macro panel, while the
new healthcare values rederive from retained source bytes on every build.
