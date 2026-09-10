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

## Existing-family statistical basis

The reviewed existing-family design uses a literal statistical predicate: Canadian reported unemployment percent is at least 7.302. Its executable category `availability` is the explicitly commissioned research relationship, **not a diagnosis that availability binds income access**. Its signal link is `correlated-only`, never necessary or sufficient. [ILO's unemployment definition](https://www.ilo.org/resource/labour-underutilization) includes seeking employment and being available to start; a person's availability for work does not establish that job availability causes their unemployment or constrains their income routes. The source does not identify those causes.

The numeric representation is the natural fraction `x/100`, denominator Canadian labour force aged 15 and older, with threshold **0.07302**. It is not a constructed index or total-population fraction. Boundary tests cover native 7.301, 7.302 and 7.303. Condition/evidence construction is recorded at the actual captured 07:09:35 UTC clock; source acquisition remains separately 06:54:51-55 UTC. Publisher lag is null/unknown, not an invented empirical 120-day maximum. The December date is only an operational resolution cutoff.

The separate fixed `round-10-country-validate.mjs` edition checks source-native prose and selector consistency, every retained implementation dependency, exact input replay from native pinned bytes, and both baseline calculations. `prepareCanadaCandidate` is pure preparation and writes nothing. Its proposed mature record is not issued merely because an in-memory schema-valid candidate exists. Synthetic receipt tests establish mechanics only, never an external timestamp or authority. A real fresh absence capture, fixed final dependency bytes, explicit root review, immutable receipt and final issuance approval remain necessary. Sealed NERO dependencies are untouched.

A distinct fresh complete Canadian response was captured 07:14:56.435-07:14:59.012 UTC in `absence-2026-09-10/`, without changing the baseline. Its 128 native rows contain no October target. Exact receipt bytes, response headers and body are pinned, and the protocol clock rounds completion up to 07:15:00. The existing protocol requires `artifact_sha256: null` for `reported_absent`, because no future outcome bytes exist. Inspection bytes are instead bound as mandatory resolver dependencies, alongside the calendar body, headers and pinned receipt. The fixed adapter verifies all these and the actual event clock before admitting a prepared candidate. An arbitrary caller path or changed capture cannot replace the reviewed absence evidence.
