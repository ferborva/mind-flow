---
id: sipp-2025-variable-crosswalk
title: SIPP metadata crosswalk and its remaining measurement gates
type: research-and-programme-proposal
status: review
provenance: commissioned-proposal
created: 2026-09-11
updated: 2026-09-11
---

# SIPP: a stronger specification, not a measured storm

**We can now reproduce which metadata informed the SIPP proposal. We still cannot estimate income-access disruption.** This bounded pass retains five original public documentation files and selects 16 variable definitions. No respondent data, participant contact, provider application, acquisition approval or new forecast is included. The cohort proposal does not detect national disruption affecting 5% of society.

## What this changes

The [crosswalk](sipp-crosswalk.v1.json) binds exact schema names, labels, types and ordinals to dictionary annotations. It makes three distinctions operational: reference month versus interview year, observed employment versus available opportunities, and published weighting instructions versus a verified estimator. The original [proposal](feasibility.v1.json) remains unchanged and unapproved.

| Question | Metadata-supported candidate | Boundary still open |
|---|---|---|
| Which person and month? | `SSUID`, `PNUM`, release context, `MONTHCODE`; panel and wave separately | Deduplication, frame changes and longitudinal coverage require testing after authorised acquisition |
| Was employment disrupted? | `RMESR`, employer-exit `EJB1_RSEND`, business-exit `EJB1_RENDB` | Different universes and reason-code meanings; no approved involuntary-disruption mapping |
| Did earnings change? | `TPEARN` and calendar-length alternative `TPEARN_ALT` | Neither series measures available opportunities; missing/out-of-universe is not automatically zero |
| Were alternatives available? | Job identities and `RMNUMJOBS` can describe realised arrangements | Suppression and unrealised alternatives prevent a complete option-set claim |
| How much of the population? | Published monthly and longitudinal weight families | Cohort, denominator, variance, missingness and discrepancy review remain pending |

The [2025 dictionary](https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/2025_SIPP_Data_Dictionary.pdf), printed pp1773, 1780, 2488, 2579–2587 and 2630, supplies these variable universes. Exact field details and page locators are in the crosswalk. This is an agent interpretation, not independent statistical review.

## The important IF conditions

**Count an event once IF the spell boundaries and overlapping spells have been reconciled.** Employment is collected at spell level; many attributes are repeated across monthly output records. Monthly pay exceptions and recodes do not make every field an independent monthly observation. `ROVERLAPMN` flags overlapping non-employment spells, but does not itself reconstruct all events. See the [guide](https://www2.census.gov/programs-surveys/sipp/tech-documentation/methodology/2025_SIPP_Users_Guide.pdf), printed pp69–72.

**Interpret an earnings change IF the universe, calendar treatment and allocation flags are respected.** Both earnings recodes require a job held during the month. Negative business returns are possible. A missing cell must not become an observed zero. A reported job exit can be a beneficial switch; its reason can be copied across months. These constraints must precede any severity threshold.

**Estimate a share IF the target population and appropriate weight are fixed.** The guide's monthly replicate join uses `SSUID`, `PNUM`, `MONTHCODE`; its longitudinal join uses `SSUID`, `PNUM`. These are documented candidate keys, not data-verified uniqueness. `FINYR2`, `FINYR3`, `FINYR4` cover 2023–2024, 2022–2024 and 2021–2024. Their cohort logic and response adjustments cannot be replaced by an arbitrary complete-case filter. See [guide pp154–160](https://www2.census.gov/programs-surveys/sipp/tech-documentation/methodology/2025_SIPP_Users_Guide.pdf).

## Discrepancies we will not silently repair

1. **Panel-year range.** The primary dictionary p1239 gives 2022–2025. The [monthly replicate-weight dictionary](https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/rw2025_dictionary.txt) gives 2021–2024. The files were obtained from the official 2025 locations. A stale text dictionary is a possible explanation, not an established finding. The [longitudinal dictionary](https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/lgtwgt2025_dictionary.txt) range 2022–2024 may reflect eligibility and is not, by itself, an error.
2. **Schema completeness.** The retained [primary JSON schema](https://www2.census.gov/programs-surveys/sipp/data/datasets/2025/pu2025_schema.json) has 5,203 entries, consecutive ordinals 1–5,203. Guide p15 reports 5,204 variables for 2025. We do not invent the extra variable or assert which document is current.
3. **Coverage and grain.** `EJB7_JOBID` is explicitly suppressed. The primary dictionary calls the replicate family a person file, while its separate text includes month and the guide documents a monthly join. Keep these descriptions visible and validate the actual join only after authorised acquisition. No claim of complete job-option coverage follows from the available labels.

These issues weaken the recommendation to start extraction immediately, not the value of the historical-method exercise. They are inexpensive failures to discover before an empirical pipeline is built.

## Reproduce without a network or personal data

With Node 22.23.2 or a compatible Node 22 TypeScript-stripping runtime:

```sh
node --test pilots/income-access/tests/*.test.mjs
node pilots/income-access/tools/sipp-crosswalk.mts
```

The five files total **7,839,466 bytes**. The [capture receipt](sources/sipp-2025-2026-09-11/capture.json) records each URL, media type, byte length, SHA-256 and local start/end timestamp, captured on 2026-09-11 between 05:13:13 and 05:13:17 UTC. Hashes establish retained-byte identity, not publisher signatures or a trusted timestamp. The receipt itself and every source hash are independently pinned in the replay code.

Replay verifies original bytes, selects exact JSON-schema records and reproduces retained annotations. It does **not** independently parse the PDF semantics or validate the construct. The PDF universes, page references and weight interpretation were inspected by Ren and still need a second reviewer. Tests first failed without the implementation and then passed; mutation tests reject substituted bytes even when receipt hashes are changed, altered labels/universes, approval inflation, missing variables and erased unknowns. These are software checks, not empirical validation.

`sipp-metadata-capture.mts --capture` is a separate explicit network operation restricted to those five bounded documentation URLs. It refuses an existing capture directory. Do not use it as an automatic refresh or amend sealed source bytes. The guide initially exceeded the 3 MB guard; no files were written. Its official size was checked before a bounded 3.5 MB retry. No respondent archive was requested.

## Next safe step and next authority boundary

**Review the exact dictionary dependencies and public errata IF an independent survey-methods reviewer is appointed.** Age, job screen/start/end/continuation, frame and allocation flags still need complete code-value mappings, including all relevant job lines. Search official public corrections for the two metadata discrepancies and retain a separate dated result, without changing these captured bytes. This metadata work requires no participant data.

**Do not begin a respondent-data pilot yet.** The next acquisition decision needs the authorised owner to approve custody, permitted use and a narrow extraction specification, followed by construct/statistical review. Fernando's severity, persistence, viable-alternative, household and national denominator choices remain unanswered. No deadline, success rate, national affected share or useful warning lead time can be estimated from this crosswalk.

## Bounded public errata check, 2026-09-11

Ren inspected the official [2025 user-notes index](https://www.census.gov/programs-surveys/sipp/tech-documentation/user-notes/2025-usernotes.html), [release documentation index](https://www.census.gov/programs-surveys/sipp/tech-documentation/complete-technical-documentation.html), [2025 release notes](https://www2.census.gov/programs-surveys/sipp/tech-documentation/2025/2025_SIPP_Release_Notes.pdf) and linked [data-quality note](https://www.census.gov/programs-surveys/sipp/tech-documentation/user-notes/2025-usernotes/2025-data-quality-concerns.html). The release notes listed only the initial version 1.0, dated 15 July 2026. The user-notes index did not list a panel-year-range or variable-count correction. The quality note warns that declining response increases standard errors and weights, and points users to source-and-accuracy documentation.

**No relevant correction was located in these bounded sources. This does not establish that no correction exists.** The panel-range and schema-count questions remain open. Search-engine results and the opened pages are inspection evidence only: no new original bytes were captured or added to the five-file receipt. This author follow-up is not independent review of the crosswalk, does not approve any join or construct, and does not authorise respondent-data acquisition.
