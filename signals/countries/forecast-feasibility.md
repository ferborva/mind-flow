---
id: round-10-country-forecast-feasibility
title: Third forecast source and observation-clock assessment
type: technical-proposal
status: proposed
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Third forecast feasibility

**A Canadian October 2026 reported unemployment target can fit the existing observation chronology. A future revision to a 2025 poverty estimate cannot make its 2025 reference period prospective.** These are design findings, not issuance or calibrated probabilities.

Three primary sources are retained separately in `sources/forecast-feasibility-2026-09-10/`, with complete body bytes, serialised headers, real request clocks and hashes. They do not change the hash-pinned income capture:

- [PIP update calendar](https://worldbank.github.io/PIP_data_updates/): typical major updates in March/April and September/October, with intermediate corrections. This is a usual window, not an announced 2026 release day.
- [World Bank Data360 PIP metadata](https://data360files.worldbank.org/data360-data/metadata/WB_PIP/WB_PIP_HEADCOUNT_IPL.pdf): repeats the release window and warns against using reference-year interpolations and extrapolations for country poverty trends. Survey-year comparisons still require comparability review.
- [Statistics Canada 2026-2027 calendar](https://www150.statcan.gc.ca/n1/release-diffusion/2026-eng.pdf), page 2: the October 2026 Labour Force Survey is scheduled for 6 November 2026. Dates may change. This calendar governs the upstream publisher, not ILO ingestion timing.

## Proposal for review

The candidate is October 2026 Canadian unemployment in the reported ILO companion: `ref_area=CAN`, `source=BA:147`, `indicator=UNE_DEAP_SEX_AGE_RT`, `sex=SEX_T`, `classif1=AGE_YTHADULT_YGE15`, `time=2026M10`. The proposed binary event is whether the first retained eligible value is at least the frozen August 2026 value. A read-only source audit found that August value to be `7.302`; it must be retained and reproduced before being sealed as the threshold. It is not interchangeable with a seasonally adjusted national headline. Native note `I12:422` and source notes need explicit retention and interpretation.

Issue must finish before October starts. The reference window is 1-31 October. Publication-not-before is 6 November, with resolution close proposed at 31 December 2026, fewer than 120 days after the September proposal. Missing ILO ingestion, missing cells, conflicting native rows or changed definitions require a prewritten unresolved/void procedure, never zero or a negative result. The source is a reported statistical estimate, not measured gross loss of income routes.

The monthly reported table was audited read-only: 40,868,697 bytes, 42 of the top 50 economies somewhere in its history, but at most 34 in any common month even allowing any age group. Therefore it must remain a **breadth-ineligible companion, excluded from the storm panel**. This does not reduce the separate three-family breadth requirement or prohibit a prospective single-country forecast in the existing programme. The full monthly table is not retained by this feasibility note; the numbers above are an in-memory audit, not replayable evidence until the forecast lane captures the source.

## Remaining team-owned work

Retain the reported native source and note dictionaries, verify the Canadian contiguous baseline window, implement and test a fixed country-specific baseline/resolver adapter, prepare exact preregistration bytes and have an independent reviewer rerun them. The existing independent baseline adapter executes NERO algorithms only. Its support must be extended explicitly rather than relabelling Canadian observations as NERO inputs. Then obtain the required external registration anchor before issuance. No record is issued by this proposal or its clock guard.

PIP is not rejected merely because its exact release day is unknown. Its candidate fails the current protocol because the target reference period has already begun or ended; a later publication cannot repair that semantic mismatch. A future publisher-revision event would require an explicitly reviewed target/chronology design, not a silent change of the observation window.
