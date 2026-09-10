---
id: round-10-canada-actual-issuance
title: Canadian reported unemployment forecast issued after provider-timed registration
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# Canadian forecast issued, outcome pending

**`forecast.canada.unemployment.october-2026.v1` was issued at 07:56:37 UTC on 10 September 2026, with probability 0.090909.** The event is whether the first eligible retained ILO October 2026 Canadian reported unemployment rate is at least the frozen August value, **7.302 percent**. The reference-class comparator is **0.483333** and the naive comparator is **0.5**. Resolution remains pending; no outcome or score is reported.

This separate note records actual events after sealing. It does not change the sealed README, runbook, target, source closure, issued bytes or preregistration.

## Native target, method and boundaries

The exact native tuple is `CAN / BA:147 / UNE_DEAP_SEX_AGE_RT / SEX_T / AGE_YTHADULT_YGE15 / 2026M10`. It is the ILO microdata-processed reported Labour Force Survey series, not the ILO modelled-estimate family or a Statistics Canada seasonally adjusted headline. The denominator is the **Canadian labour force aged 15 and older, both sexes**. The typed fraction is `x/100`, with threshold `0.07302`; it is not a total-population fraction or income-route-loss count.

The retained source has 128 contiguous monthly observations, January 2016 through August 2026. The fixed baseline window is September 2016 through August 2026. Its 118 two-month comparisons contain 57 nonnegative changes, yielding Laplace-smoothed `58/120 = 0.483333`. All nine August-to-October pairs wholly inside that window, 2017-2025, declined; the seasonal forecaster therefore uses `1/11 = 0.090909`. The seasonal method was chosen after inspecting that historical pattern. Nine potentially dependent pairs establish neither calibration, forecast skill nor validated binomial uncertainty.

This single-country reported companion remains excluded from the storm panel. Its availability category is a commissioned research relationship with a `correlated-only` signal link, not a finding that availability binds income access. No five-percentage-point population disruption, household mapping, causal attribution, authority or action permission follows.

## Actual clocks and retained addresses

All times below are UTC on 10 September 2026 unless another date is shown.

| Event | Retained time |
| --- | --- |
| Native baseline request | 06:54:51.977-06:54:54.504 |
| Distinct fresh absence request | 07:14:56.435-07:14:59.012 |
| Absence chronology second, rounded up | 07:15:00 |
| Local protocol seal | 07:45:59 |
| Provider-created registration | 07:49:33 |
| Issue window opened | 07:55:59 |
| Live preissue readback | 07:56:35.900-07:56:36.833 |
| Actual local issue | 07:56:37 |
| Observation window | 1-31 October 2026 |
| Operational eligibility and resolution lower bound | 6 November 2026, 00:00:00 |
| Resolution closes | 31 December 2026, 23:59:59 |

The retained Statistics Canada calendar schedules upstream October LFS for 6 November, with dates subject to change. It does not guarantee an ILO publication or ingestion date. Missing or changed native evidence at resolution requires the prewritten review/void procedure, never zero imputation or headline substitution.

| Artifact | SHA-256 |
| --- | --- |
| Issued forecast | `fd35bf9998830c4ba3d9d42bcd94feefd1fce29c70b144042754239df2e01140` |
| Preregistration with receipt | `70991b3027a297d366eb15087883d7ecfa176f79e00c137ea0962382455df09c` |
| Sealed protocol content | `cffdc5c10cc9943653680e1e4362aa41ea3d804e0fedf8e4ea00a86dc6131ea4` |
| Exact provider POST response | `197cf2599c339dc9d986434ca9367ef45441d8aea53c22bf4153433fa53706db` |
| Registration readback | `18b9a9f5bea95a05fd24e0d7f5f0c905db4bbfdea6ba9f70100a42641a980808` |
| Preissue readback | `b30a92987c271f3dcd9c51a4cb27eb9f7b8e7a6628af74116dfc17c6e6890c51` |
| Native baseline body, also matched by the distinct absence capture | `0c1a707f99b482fea3da936c45c3bfa565dce6184a542e9b96a7e4f9bd5fd52b` |

The source commit is `630b59af9a47a47e4b894433e03f2e5b8205ee6d`; the local seal commit is `381cb452ff9c27a3a5a7159c04dd92cd68be6904`. The provider capture was retained in `c0aac1f`, and the actual issued bundle in `d8af9cf`. Exact issued and preregistration bytes were rehashed when preparing this note and matched the retained anchors.

## Receipt and verification ceiling

The [PR42 registration comment](https://github.com/ferborva/mind-flow/pull/42#issuecomment-5615053978) is **self-posted and editable**, not an immutable provider comment or independent registrar. The workflow retained exact POST and readback bytes and checked body, identity, provider creation/update times, statuses, endpoints and capture chronology. The typed receipt remains `unverified_external_review_required`. Immutable local byte addresses and provider-timed registration must not be confused with institutional or statistical approval, or authenticated local time.

The retained binding report has `binding_complete: true` and `baseline_execution_reproduced: true`, with no reported blockers. It does not itself certify independent anchor verification or independent baseline review, and its `issuance_authorised` field remains false. Human approval and the actual guarded issuance operation are distinct from those mechanical claims.

Offline replay is `node forecasts/prospective-pilot/round-10-canada/issuance.mts --check`. It verifies the actual bundle without querying the currently editable comment, resolving an outcome or calculating a score. The [frozen runbook](issuance-runbook.md) continues to require complete native source capture, exact labels and flags, first-presence evidence, chronology and separate typed admission before any future resolution. Raw payload preparation alone is not an admitted outcome.

## Earlier NERO defect remains visible

This Canadian record neither replaces nor repairs the [earlier NERO issue](../round-09-nero/error-notice.md). Its known SA4 101 resolution-prose versus SA4 102 native-selector contradiction, original sealed bytes and disclosure remain preserved. The separately corrected Central Coast NERO record also remains distinct. No retrospective editing, formal void, cohort exclusion or denominator change is implied by issuing this Canadian forecast.
