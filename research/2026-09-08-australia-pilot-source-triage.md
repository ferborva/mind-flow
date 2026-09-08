---
id: australia-pilot-source-triage-2026-09-08
title: Australia pilot source triage
type: research-note
status: proposed
provenance: commissioned-agent-research
author: Ren
created: 2026-09-08
updated: 2026-09-08
---

# Australia pilot source triage

> **AGENT RESEARCH NOTE. NOT A STUDY RESULT OR PUBLIC WARNING.** Source date and
> release date are recorded below; all pages were retrieved on 2026-09-08. The
> sources establish feasibility and claim ceilings. They do not establish an AI
> effect, a crisis, affected-party consent or authority to act.

## 🦅 TL;DR

**Australia has credible official building blocks for a bounded transition
study, but no source below closes the chain from AI capability to lived
agency.** NERO offers timely, granular modelled employment estimates. ABS
offers a national business-use indicator and slower earnings, hours and linked
job data. ILO offers a task-exposure construct. These measures answer different
questions and must not be stitched into a causal story.

The first defensible move is a prospective, no-consequence feasibility study
with competing causal graphs. It is not a warning system.

## 📚 Primary-source register

| Source and source date | What it supplies | Material limit | Claim ceiling now |
|---|---|---|---|
| [Jobs and Skills Australia, NERO, August 2026 data released 2 September 2026](https://www.jobsandskills.gov.au/data/nero) | Monthly modelled employment estimate for 355 ANZSCO four-digit occupations across 88 SA4 regions | Experimental, smoothed, revision-prone and may miss change outside its training history. Estimates must not be summed or combined across occupations or geographies. | `NERO reports this modelled estimate for this occupation, SA4 and vintage.` Not a direct employment observation, rapid-change detector or causal AI result. |
| [Jobs and Skills Australia, NERO methodology, version 3 released 3 June 2026](https://www.jobsandskills.gov.au/data/nero/nero-methodology) | Model design and inputs, including ABS Labour Force Survey, Census, vacancies, placements, visas, businesses and training | A comparison with an input source is not independent corroboration. Model error, smoothing and revisions remain material, especially for small series and large movements. Region is a person's location of residence, not the location of business. A minimum of 10 is applied to all series for privacy, so the floor is part of the measurement process rather than evidence of ten observed jobs. | `The registered model used these source families and methods.` Not proof that a movement is real or why it occurred. |
| [Australian Bureau of Statistics, Characteristics of Australian Business 2024-25, released 25 June 2026](https://www.abs.gov.au/statistics/industry/technology-and-innovation/characteristics-australian-business/latest-release) | Twelve per cent of businesses reported AI use in 2024-25, with industry, size and innovation-status breakdowns | The survey question records selected use. It does not measure intensity or extent of AI use within a business, task change, worker exposure or local adoption. The population is businesses, not workers. | `A stated share of in-scope businesses reported AI use.` Not adoption intensity, workforce redesign or clerical-worker treatment. |
| [International Labour Organization, refined GenAI occupational exposure index, 20 May 2025](https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure) | Task-level potential-exposure gradients and an explicit finding that clerical occupations have high exposure | Exposure is not actual impact. The index estimates potential under a task and technology model; it does not observe Australian workplace adoption, displacement or job quality. | `This occupation has this modelled potential-exposure classification.` Not a probability of job loss or a treatment variable. |
| [Australian Bureau of Statistics, Employee Earnings and Hours, May 2025, released 23 January 2026](https://www.abs.gov.au/statistics/labour/earnings-and-working-conditions/employee-earnings-and-hours-australia/latest-release) | Earnings distributions, paid hours and pay-setting method, including detailed occupation outputs | Biennial employer survey. Detail differs by cube, with four-digit weekly earnings but three-digit detailed hourly measures. It does not provide a monthly occupation-by-SA4 transition panel. | `The published earnings or hours statistic changed for its exact employee universe and classification.` Not a NERO-compatible local cohort effect. |
| [Australian Bureau of Statistics, LEED and L-LEED, updated 18 August 2025](https://www.abs.gov.au/about/data-services/data-integration/integrated-data/linked-employer-employee-dataset-leed-and-longitudinal-leed-l-leed) | Annual linked person, job and employer records, including income, occupation, industry and geography | Access, lag, disclosure control, changing job links and annual timing constrain use. Household service access, agency and AI adoption are not supplied by the dataset itself. | `Linked administrative outcomes can be estimated under an approved design.` Not a public microdata release or causal effect without identification. |

## 🔗 What can and cannot be joined

```text
ILO task exposure
  ? actual Australian business or workplace adoption
  ? task and work redesign
  ? employment, job and hours flows
  ? earnings and household resources
  ? effective service access
  ? person-level agency
```

Every `?` is an IF and a missing identification problem. A valid join requires
the same classification version, population, geography, period and evidence
cut-off, or an explicit crosswalk with uncertainty. It must also reconcile the
statistical unit (business, job, employed person, household or resident), join
keys, denominator compatibility, inclusion rules, survey weights and revision
vintages. Aggregates at business, occupation and resident-region level cannot
be assigned to individuals. The design must register ecological-inference and
cross-level-bias controls, or keep those links as context rather than joined
evidence. NERO and ABS Labour Force
Survey comparisons carry **shared-source dependence** because Labour Force
Survey aggregates are NERO inputs. Agreement is useful for consistency checks,
but cannot be counted as independent confirmation.

The business AI-use statistic is a possible adoption context signal. It cannot
be assigned to a worker, occupation or SA4 without a new source or study. The
ILO exposure score is a possible capability signal. It cannot be interpreted
as deployment, automation, displacement or harm.

## 🥊 Competing explanations to preserve

| Graph | Observation that could fit it | Evidence needed to discriminate |
|---|---|---|
| Technology-push | Exposure and adoption precede task redesign and scoped worker flows | Workplace adoption timing, task change, untreated comparisons and negative controls |
| Macro-demand | Clerical employment moves with interest rates, demand, inflation or fiscal change | Predeclared macro covariates, sector exposure and timing tests |
| Sector-composition | Regional industry mix changes while within-workplace employment is stable | Employer and industry composition, within-unit transitions and stable geography |
| Measurement-and-reclassification | NERO movement changes after revision, smoothing or ANZSCO migration | As-published vintages, revision cube, classification crosswalk and source-independent outcomes |
| Policy-and-ownership | Procurement, bargaining, regulation or firm strategy determines adoption and distribution | Decision records, ownership, bargaining coverage, deployment terms and intervention exposure |
| No material change | Estimates move within revision, sampling or practical-equivalence bounds | Preregistered smallest material effect, uncertainty and a frozen null region |

No graph is the default. A result may favour one only if its registered
observable implications separate it from credible rivals.

## ✅ Feasibility verdict and next acquisition

The source stack supports a **feasibility candidate** for named clerical
occupations and places. It does not yet support a historical backtest, causal
claim, household-access finding or operational warning.

The next acquisition should bind one prospective NERO vintage and revision,
one exact occupation classification, one non-NERO outcome source, and one
independently measured adoption or work-redesign event. Before collection, fix
the competing graphs, outcome unit, smallest material effect, privacy boundary,
affected-party governance disposition and decision that earlier knowledge
could legitimately change.
