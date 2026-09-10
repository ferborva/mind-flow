---
id: round-10-canada-unissued-design
title: Canadian reported unemployment forecast draft
type: technical-proposal
status: proposed
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Unissued Canadian draft

**The source and baseline are reproducible. This is not an issued forecast or permission to issue.** `preregistration-draft.json` is a preparation artifact, not a contract or registry entry. The fixed issuance adapter, independent review, fresh source absence, protocol validation, seals and external receipt remain gates.

The event concerns ILO's first eligible retained **October 2026** Canadian reported unemployment estimate, at least **7.302 percent**. Its native tuple is CAN / BA:147 / UNE_DEAP_SEX_AGE_RT / SEX_T / AGE_YTHADULT_YGE15 / 2026M10. The threshold is frozen August 2026, not a subsequently revised August comparator. It is a labour-force denominator, not total population, gross income-route losses, household counts, or a five-percentage-point storm measurement.

## Native source and limits

The full publisher-filtered response is retained, not an agent-created extract: 37,528 bytes, 128 contiguous months January 2016 through August 2026. The documented API filters select country, source, sex and age, and `type=both` retains codes and English labels together. Source BA:147 is LFS - Labour Force Survey; I12:422 means Frequency: Monthly; R1:3513 means Repository: ILO-STATISTICS - Micro data processing. Blank status/classification notes remain blank, not inferred quality guarantees. This is a microdata-processed reported companion, kept separate from modelled ILO estimates. Seasonal adjustment is not asserted, and the StatCan seasonally adjusted headline is never a substitute.

This single-country companion is **not admitted to the storm panel**. It does not alter the independently admitted three-family, 40-of-50 breadth gate. Global monthly coverage estimates in the earlier feasibility note are read-only research, not replayable claims supplied by this Canadian response. ILO's retained reuse policy is in the existing income-source audit; attribution and publisher limitations continue to apply.

The source response, headers, receipt and API schema are retained under `sources-2026-09-10/`. Real request time is 10 September 2026, 06:54:51-55 UTC. Fixed body hashes are verified by the producer, with header and receipt consistency checks. No old source vintage is overwritten.

## Baseline and resolution design

The proposed fixed baseline uses September 2016 through August 2026, 120 complete months, and all 118 two-month endpoint comparisons. Nonnegative differences count as successes. Laplace smoothing yields `(successes+1)/(118+2) = 0.483333` with six-decimal half-even rounding; the naive comparator is 0.5. Native decimal strings are compared as exact integer thousandths of a percentage point. This is a deliberately simple historical frequency, not a calibrated probability, causal model, seasonal model or out-of-sample validation. The window and method were specified for this draft, not searched to optimise the output.

The substantive forecaster now uses all nine August-to-October pairs wholly inside that fixed window, 2017-2025. All nine declined. Laplace smoothing gives **1/11 = 0.090909**, while the all-month 0.483333 and naive 0.5 remain unchanged comparators. Every native pair is retained in the draft. This seasonal method was chosen **after inspecting the historical seasonal pattern**; the target and source were selected for future publication timing and retained availability. This is not a blind design, calibration or demonstrated skill. Nine potentially dependent historical pairs do not justify binomial precision as validated uncertainty.

Issue must close before 1 October. Observation is 1-31 October. The retained [Statistics Canada calendar](https://www150.statcan.gc.ca/n1/release-diffusion/2026-eng.pdf), page 2, schedules upstream October LFS for 6 November; it warns dates can change and does not guarantee ILO ingestion. Proposed publication lower bound and resolution start are 6 November; resolution closes 31 December, fewer than 120 days after this September preparation. No precise ILO publication day is claimed.

The resolver must retain complete responses and select the first eligible post-bound response, require exactly one native tuple with unchanged flags, and compare against frozen 7.302. Missing by close, conflict, changed definition/flags or integrity failure leads to the existing void/unresolved procedure, never a false outcome or replacement series. Before issuance the adapter must bind this exact target, all prose, source hashes, observation clock, input manifest, baseline implementation and conformance vectors. A known future target or relabelled historical reference period must fail.

Offline replay: `node forecasts/prospective-pilot/round-10-canada/draft.mts --check`. The same check is mandatory in CI from the first producer commit. Acquisition is explicit and writes only to a new local source directory: `node forecasts/prospective-pilot/round-10-canada/retain.mts <new-directory>`.

## Unresolved adapter semantics

The existing mature forecast requires an executable condition basis. The executable-if schema requires a category from price, permission, proximity, availability or capability. It has no measurement-only category. Signal links permit `correlated-only`, but that does not remove the condition category requirement. The NERO template assigns availability and a necessary link; copying those for Canadian unemployment would introduce an unsupported macro-indicator-to-binding-category inference. No such assignment has been made. A reviewed observational basis compatible with the existing protocol is still needed, or this remains a team-owned adapter/semantic blocker. Source calendar uncertainty is not the sole barrier. No sealed NERO dependency has changed.
