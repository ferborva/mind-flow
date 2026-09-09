---
id: 2026-09-10-primary-care-review-correction
title: Primary-care review correction and public evidence table
type: research-audit
status: review
provenance: commissioned-proposal
created: 2026-09-10
---

# Primary-care review correction

## 🦅 TL;DR

**The five GP indicators are now visible, but today's binding barrier remains unknown.** This is a review repair, not a new measurement programme or self-approval. [PR15 Track8](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404043) and its [verdict](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609403803) were read in full. The dated 9 September artifacts and source capture remain unchanged.

## 🔬 Findings and dispositions

| Review finding | Disposition and evidence |
| --- | --- |
| P1 GP measurements absent from public pilot | Accepted. The existing pilot build now renders five GP rows from [corrected data](../pilots/australia/data/primary-care-2026-09-10.json) and the [r3 basket mapping](../pilots/australia/basket/primary-care.r3.json). Values, periods, proxy/rule labels, populations, owner roles and source links are visible HTML. No new styling or status chips. |
| P1 reported proximity rates overstated as reproducible | Accepted. Exact rate-cell extraction remains reproduced; rate recomputation is explicitly false because ERP denominator values are not retained. The geography is ASGS Remoteness Areas, not MMM or SA4. No denominator is reconstructed by inversion. |
| P2 missing workbook footnotes | Accepted. Original 10A Excel bytes and paired headers are retained in LFS with hashes. Table 10A.19 C80-C88 explains geography, rounded FTE workload, regional counting and the 30 June ERP denominator; E90 identifies the source vintage. |
| P2 old NERO join metadata | Accepted. The correction points to the unchanged r2 baseline and repeats its unverified source-byte and occupation-classification status. State context is not an SA4 access estimate. |
| P2 source licence claims | Accepted as explicit uncertainty. Every retained source has `licence_claim: null`, `licence_review_status: unreviewed` and a reason. No blanket open-licence inference from an official host. |
| P2 unused sources | Accepted. MBS referrals is rule context only; AIHW medicines is basket-selection context only. Neither is counted as a quantitative derived series. The panel still replaced eight deleted placeholders with four measured series, not eight. |
| P3 favourable timeframe, proxy age and stale README | Accepted. Full retained NSW annual points and earlier endpoints accompany all three favourable one-year examples. Permission dates are retrieval observations, literacy is 2018 national adult context, and README links target r3 plus the new correction. |

**The workbook changes interpretation, not the reported values.** Table 10A.26 C23 says very-remote collection was phased out during 2023-24 and excluded in 2024-25. C22 identifies ASGS 2016 survey geography. The same scope notes appear in 10A.33 C23-C24, 10A.43 C58-C59 and 10A.44 C21-C22. The correction attaches these exclusions to the relevant series, so neither all-rural coverage nor a same-population improvement is asserted. The [publisher directs readers to these workbook definitions](https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/).

For example, NSW fully bulk-billed patients were 71.8% in 2021-22, 59.2% in 2022-23 and 56.1% in 2024-25, despite the favourable last-year movement from 55.2%. Table 10A.31 C15-C18 defines patient-year coverage and claim-processing dates; it supplies no explanation of that earlier fall. Cost-delay was 1.8% in 2020-21 and 7.2% in 2024-25, subject to the survey-scope change. These are contextual comparisons, not causal or significance findings. Their exact CSV selectors and confidence intervals remain in the corrected data.

## ✅ Reproduce and review

With Node 22 and the LFS workbook hydrated, run `node pilots/australia/tools/primary-care-review.mts --check` and `node --test pilots/australia/tests/primary-care-review.test.mjs dashboard/tests/primary-care-public.test.mjs`. The new tests were run before implementation and failed for the absent correction module and absent generated GP section. They now check the actual generated HTML, unchanged historical numeric points, workbook GP cell corroboration and source limits. Hostile tests reject changed values and both cross-category and same-category substitutions in the pinned r3 basket mapping.

Read-only workbook extraction uses Node's native ZIP inflation and validates member sizes and CRCs against the same byte snapshot already checked by SHA256, without recalculation, subprocesses or external workbook links. Independent review remains necessary for licence coverage, representativeness, the three incomplete basket items and any proposed operational use. No provider outreach, personal records, eligibility adjudication or clinical instruction was introduced.
