---
id: round-10-australia-depth
type: internal-review-proposal
title: "Round 10 Australia depth: native changes, not disrupted people"
date: 2026-09-10
author: Ren
status: review
---

# Result

**Cannot say whether the commissioned storm criterion occurred.** This commissioned retrospective measures native modelled employment stock changes, not comparable direct income-route disruption prevalence shares of total population or a measured change in the binding condition category. It neither certifies a storm nor certifies its absence. No new rendered surface, issued forecast, receipt, or raw value changes.

Forward repair: the original C output described the ceiling without invoking the shared evaluator. It now calls `evaluateStorm` for every retained December-to-December annual window per occupation/SA4, 2015→2016 through 2024→2025 (1,400 annual windows). Each call supplies country AUS and explicit null disruption, binding and household evidence. The national criterion therefore returns `cannot-say`; the regional occupational stock is labelled unadmitted context, not projected to national evidence or treated as a local criterion implementation. Monthly windows, including February-to-May 2020, remain descriptive only. The output binds exact SHA-256 hashes of the criterion code, its commissioned definition Markdown and its retained definition/consumer artifact. Any changed binding forces replay drift until reviewed and regenerated.

Round 10.1 clarification: the criterion API has no geography below country. The
1,400 windows repeat ten national unknown results, not 1,400 local diagnoses.
The 140 per-series summaries and one overall summary add 141 calls, for 1,541
invocations in the retained producer. Those summaries are explicitly labelled
retained-range summaries, September 2015 through incomplete August 2026, not
annual windows. The CSV output now names the full-stream validation method
instead of presenting a literal `true` as a computed verification result.
CRC remains transitively pinned by the unchanged archive SHA-256. Adding CRC
fields to the historical capture is deferred to a separately versioned source
record rather than rewriting the original receipt.

## Reproducible numerical depth

The retained August 2026 NERO vintage supplies 132 monthly observations per series, September 2015 through August 2026. Selecting NSW and ANZSCO codes 5311, 5411, 5511, 5512 and 5513 yields 140 separate occupation-by-SA4 series and 18,480 observations. They are never summed across occupations or regions. The full 4,123,680-row CSV is consumed with its CRC and declared length verified.

Central Coast (SA4 102), General Clerks (5311):

| Window | Native stocks | Net change | Native stock change | CSV lines, including header |
| --- | --- | --- | --- | --- |
| December 2019 to December 2020 | 3,766 to 4,080 | +314 | +8.337759% | 78857, 78869 |
| February to May 2020 | 3,861 to 3,986 | +125 | +3.237503% | 78859, 78862 |
| Largest absolute monthly decline, August to September 2021 | 3,705 to 3,636 | -69 | -1.862348% | 78877, 78878 |
| Largest absolute annual decline, March 2021 to March 2022 | 3,994 to 3,273 | -721 | -18.052078% | 78872, 78884 |

The calculation is `(after - before) / before * 100`, with a null percentage when the prior stock is zero. These percentages use the prior occupational employment stock, not total population. The series has 71 negative monthly changes out of 131. Across the 140 separate series, the calendar-2020 comparison has 83 declines and 57 increases; February-to-May 2020 has 72 declines, 62 increases and 6 unchanged series. These are counts of series, not people.

The 2020 comparisons are fixed historical windows, not causal pandemic estimates. The extrema are retrospective descriptive selections, not predeclared forecast thresholds. All figures are from one August 2026 model vintage, potentially revised or smoothed, not observations known in real time. The retained series cannot examine 2008–09. Neither misses nor false fires against the commissioned storm criterion can be adjudicated without independent outcome labels and comparable disruption-prevalence or binding-category measurements. Gross flows are a different construct, not a required substitute for prevalence. No forecast skill claim follows.

Even an 18% native stock decline does not establish a five-percentage-point increase in disrupted-person share of total population. Flat stocks can hide offsetting exits and entries. A net decline cannot identify who lost an income route, who found another route, or which dependants were affected. A rise does not prove no disruption. The output therefore retains null disrupted-person counts, dependant counts, disrupted-share change and binding-category change for every series.

## GP join attempted independently

The proposed local unit is a Central Coast GP consultation route. The retained GP cost-delay observation is instead NSW, 2024–25: 7.2%, with confidence-interval half-width 0.7 percentage points. Its population is people aged 15+ in private dwellings who needed a GP, excluding very remote areas. It is reported cost-related delay/non-use, not a total-population disrupted-person count.

| Country family, latest Australian observation | Geography and population mismatch | Time and unit mismatch |
| --- | --- | --- |
| EPOP, 2025, 63.816% | Australia; population aged 15+, not Central Coast people needing a GP | Annual modelled employment stock ratio, not current consultation access or direct disruption prevalence |
| Unemployment, 2025, 4.09% | Australia; labour force aged 15+, not total population or matched GP users | Annual modelled labour-force rate, not a local available appointment, full price, or disrupted share |
| PIP poverty lineup, 2025, 0.84% | Australia; persons under a household-welfare poverty threshold, not matched local GP users | Annual extrapolation/nowcast under $3/day in 2021 PPP, not a consultation cost or access observation |

These country values are retained contextual evidence only. Matching the name Australia or nesting NSW within Australia does not establish a statistical join. NSW GP geography uses the retained ABS scope; NERO's SA4 version/place basis is not established in the capture. No correspondence and joint population file bridges those units. Annual 2025 country indicators and a 2024–25 NSW survey cannot identify an August 2026 Central Coast route.

The output records each national family's vintage, denominator, source selector and latest observation, then returns `not-joinable` and `cannot-say`. Missing inputs are matched local GP access and income observations for the same people; consultation eligibility, full cost, travel, bookable capacity and navigation support; aligned periods; and comparable direct disruption prevalence or measured binding-category change, with separate household-exposure mapping. None of the available context demonstrates which condition binds, or that a different condition became binding. Display wording, if this evidence is later used in the existing pilot, must remain **local access unknown**, not a national-rate-derived local status.

## Replay and evidence boundary

Producer: `pilots/australia/tools/round-10-nero-retrospective.mts`. Retained output: `pilots/australia/data/round-10-nero-retrospective.json`. The producer is read-only and supports `--print` or `--check`. CI runs the check unconditionally; the stacked integration needs Workstream B's country artifact present. For independent lane verification, pass `--income-root=/path/to/B/worktree`.

- Archive: `pilots/australia/sources/nero/2026-08/2026-08_nero.zip`, SHA-256 `a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446`.
- CSV member: `2026-08_nero/2026-08_shiny_df.csv`; selectors and one-based source lines accompany every numerical comparison. Capture and response-header hashes, native scope and licence-review caveats are retained in the output. The existing ZIP reader is imported unchanged.
- Country artifact: `signals/countries/income-measurements.v1.json`, SHA-256 `f2f21350057d7f006eeefbc263a4553c9f108d38ebeb3b04dbef733c99ce34a5`. Its source directory, history, family vintages and row selectors are carried into this output. A changed country artifact requires an explicit replay and review, not silent reuse of this hash.
- GP artifact: `pilots/australia/data/primary-care-2026-09-10.json`; its exact hash, population, NSW point and evidence ceiling are retained in the output.

Hostile tests exercise extreme and flat stocks, offsetting gross flows, zero denominators, duplicate/gapped dates, invalid values and geography, identity drift, order independence, national rates of 100%, duplicate country-years, and CI omission/failure swallowing. The independent replay validates actual retained numeric history, not only byte pins. No material classification is made from a volatility threshold.

## Named deferrals

Local GP/income population linkage, verified SA4 correspondence, comparable disrupted-person prevalence shares, separate dependent-household linkage, binding-category observations, historical as-published vintages, and outcome labels for misses/false fires remain absent. These are measurement gaps, not zero-valued findings. Root owns the general criterion interface, country reader, central backlog and final artifact lock.
