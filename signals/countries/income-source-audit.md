---
id: income-source-audit.round-10
title: Income indicator feasibility and construct audit
type: research-audit
status: reviewed
provenance: commissioned-proposal
created: 2026-09-10
updated: 2026-09-10
---

# Income indicators, with their limits

**Process miss:** the already-pushed initial commit `314a481` changed 81,241 lines, including a 56,195-line generated JSON file, contrary to the commissioned limit on commit size. It remains in history. Forward-only staged serialization repairs reduce future review size without changing source bytes or values; they do not erase or excuse that violation.

**Three families have retained native observations for at least 40 of the retained IMF top 50 economies in every year from 2006 to 2025. None measures the share of people whose income routes were disrupted.** This is a breadth result for commissioned operational readings, not satisfaction of the 5 percentage point storm criterion. All category relationships below are Ren's proposals, not measured binding causes or Fernando's additional words.

| Family | Retained vintage | Complete 2006-2025 histories | Native denominator | Proposed relationship |
| --- | --- | --- | --- | --- |
| ILO employment-to-population ratio, total sex, ages 15+ | November 2025 modelled estimates | 50/50 | Population aged 15+ | Availability of paid work |
| ILO unemployment rate, total sex, ages 15+ | November 2025 modelled estimates | 50/50 | Labour force aged 15+ | Availability of paid work |
| World Bank PIP poverty headcount, $3/day at 2021 PPP, national publisher lineup | `20260324_2021_01_02_PROD` | 49/50 | National reporting population, per-person income or consumption | Price/affordability |

Argentina is absent from the national PIP selection. Urban coverage is not substituted. The retained [PIP acquisition chapter](sources/income-2026-09-10/pip-methodology-acquiring.body) states that Argentina has only urban-representative surveys. The producer also exposes the 2005 baseline, giving 1,050, 1,050 and 1,029 observations respectively and exactly twenty annual transition endpoints for 2006-2025. Baseline coverage is 50/50/49 from the same retained bodies; no source was refreshed. A vintage is a publication snapshot, not a claim that all historical observations are independently surveyed or were known in that historical year.

**All 49 PIP values for 2025 are publisher nowcasts.** In 2009 the retained `estimate_type` labels comprise 32 `actual` and 17 `projection` rows; in 2020 they comprise 37 and 12. `actual` is the publisher's separate status field, not a claim that an interpolation or extrapolation is a directly observed survey. Estimation method remains separately retained. Comparisons across welfare-type switches or missing comparability spells remain unknown without a country-and-vintage comparability audit.

Indonesia 2025 carries both `estimation_type: survey` and `estimate_type: nowcast`.
Those distinct publisher fields are retained, not reconciled by choosing the
more reassuring label. Pakistan, Iran, India, Singapore, Saudi Arabia and Hong
Kong have zero survey-typed rows across the retained 2005-2025 lineup.

## Exact acquisition and replay

The source directory is `signals/countries/sources/income-2026-09-10/`. Every request has the URL, actual UTC request times, HTTP status, exact complete decoded body length and SHA-256, and the hash of serialised response headers. All source receipts, including the failed legacy methodology request, are pinned as one receipt collection in the producer. Source and header bytes are verified before parsing. Primary source body hashes are independently pinned in tests. Fetch does not retain the original wire transfer encoding or original header ordering and casing, and does not independently authenticate publisher identity.

Independent review found that the original capture helper did not preserve partial bytes on transport failure despite its error message. The forward repair now retains received headers, bounded partial bytes and a failed-attempt record under `failed-attempts/`, separate from completed-response receipts. Regression fixtures cover mid-stream failure, size cap and failure before headers. No original successful capture was changed or reacquired. A complete HTTP error response, such as the retained 404, remains a completed response with its unsuccessful status, never usable methodology evidence.

| Source | Exact URL | Retained bytes |
| --- | --- | --- |
| ILO EPOP | <https://rplumber.ilo.org/data/indicator/?id=EMP_2WAP_SEX_AGE_RT_A&format=.csv> | 7,451,393 |
| ILO unemployment | <https://rplumber.ilo.org/data/indicator/?id=UNE_2EAP_SEX_AGE_RT_A&format=.csv> | 7,565,147 |
| PIP lineup | <https://api.worldbank.org/pip/v1/pip?country=ALL&year=all&povline=3&fill_gaps=TRUE&reporting_level=national&version=20260324_2021_01_02_PROD&format=json> | 8,758,639 |

`income-retain.mts` is explicit acquisition only. `income-measurements.mts --check` performs no network requests and reproduces `income-measurements.v1.json` from retained bodies. CI runs that producer from its first implementation commit. The three bodies above use explicit Git LFS paths; GitHub Actions already checks out LFS content. Byte counts include the ILO UTF-8 BOM, which is removed only for decoding.

ILO selectors are exact native indicator, `SEX_T`, `AGE_YTHADULT_YGE15`, and the retained country-specific source dictionary entry labelled `ILO - Modelled Estimates`. Reported LFS tables are not blended in. The retained table of contents names November 2025 and its update date. No empty observation flag is interpreted as actual data. ILO row flags are retained as strings or `null` if absent.

The unemployment CSV carries `obs_status: R` on 908 selected rows and the empty
string on 142. The EPOP CSV has no `obs_status` column, so all 1,050 values are
`null`; absent-column and present-but-empty states are intentionally different.
No flag legend is retained. The ILO series extends to 2027; the 2025 model outputs
have no retained row-level estimate-versus-projection classification.

PIP's native `headcount` is a fraction, converted explicitly by multiplication by 100. `reporting_pop` is retained as context, not multiplied into newly disrupted-person counts. `estimation_type`, `estimate_type`, `welfare_type`, distribution type, interpolation flag, survey year, acronym, comparability and comparable spell are retained. Survey, interpolation, extrapolation, CMD estimation, nowcast and projection must remain distinguishable. No duplicate national country-year rows occur in the selected source.

**All four survey metadata fields (`survey_year`, `survey_acronym`,
`survey_comparability`, `comparable_spell`) are null on every row of this
`fill_gaps=TRUE` endpoint: all 9,981 raw rows and all 1,029 retained rows, including
645 retained `estimation_type: survey` rows.** The comparable-spell check is inert
on this source, not evidence that no breaks occurred. Survey comparability is
unestablished for every retained comparison; the consumer does not interpret a
non-boolean publisher code as a true/false comparability verdict. Welfare-type
changes remain observable separately. A new retained `fill_gaps=FALSE` capture
and country-level audit would be needed to investigate survey-year breaks; no
such acquisition is claimed in this repair. Null fields are not filled by Ren.

## What a five percentage point change can establish

**A stock difference is not a count of people who lost income routes.** For a native percentage `r`, denominator `D`, and total population `N`, a population stock share would be `r * D / N`. A change requires the separately aligned denominators in both periods. Applying `delta(r)` directly to total population is invalid. This capture does not retain a compatible denominator series for that conversion.

Even if those denominators were supplied, the resulting stock-share difference would remain a net difference. Job entry, exit, migration and population ageing can offset income-route losses. The unemployment numerator also includes people seeking a first job. EPOP counts employment, not adequate hours, secure jobs, sufficient pay or households supported. Neither establishes a binding category.

For PIP, a 5 percentage point increase means a net increase in the estimated population share below the retained welfare threshold. Consumption poverty is not earned-income loss; income can include transfers. Poverty status can change through prices, distribution changes or measurement revisions. The source supplies neither longitudinal transition counts nor disrupted earners linked to dependants. Household welfare assignment does not create the missing affected-household mapping. These readings must stay uncomputed in the criterion consumer.

Category fields identify a proposed research relationship. They do not establish that availability or price is currently binding. The two ILO series overlap and PIP may cover the same people; their shares and counts must never be added. Regional or global co-occurrence cannot be the sum of national shares.

## PIP modelling and licence evidence

The retained [March 2026 methodology chapter](https://datanalytics.worldbank.org/PIP-Methodology/lineupestimates.html) explains the publisher's interpolation and extrapolation. It uses national accounts growth to move survey welfare distributions, assuming distribution-neutral growth in extrapolation. Nowcasts can use macroeconomic projections. Therefore a retrospective match to 2009 or 2020 is partly conditioned on macroeconomic knowledge of those events; it cannot establish forecast skill. The retained [acquisition chapter](https://datanalytics.worldbank.org/PIP-Methodology/acquiring.html) and [welfare chapter](https://datanalytics.worldbank.org/PIP-Methodology/welfareaggregate.html) provide the upstream construct and comparability context. Ren performs no gap filling.

The old GitHub methodology URL returned HTTP 404. Its original bytes and receipt remain; the successful `pip-methodology-current` source is used. HTTP 200 alone is not treated as a licence: the retained World Bank public-licence body states the default CC BY 4.0 terms and dataset/third-party exceptions. The retained WDI indicator metadata credits PIP and national household surveys. This covers published aggregate data, not underlying microdata, and is a source licence assessment rather than legal clearance. The [ILO rights page](https://www.ilo.org/rights-and-permissions), also retained, applies CC BY 4.0 to datasets and referential metadata published from 3 May 2023, excluding restricted third-party microdata.

## Candidate families not admitted

| Brief candidate | Audit outcome | Why it cannot be substituted |
| --- | --- | --- |
| ILO LU4 modelled | Retained `LUU_2LU4_SEX_RT_A` has zero top-50 country rows; its 87 areas are regional/group outputs | Global coverage is not country coverage. Native denominator is the extended labour force, not population. |
| ILO informal employment | Retained reported `EMP_NIFL_SEX_RT_A` covers 5/50 in 2006, 26/50 in 2009 and 2020, 30/50 in 2023, 29/50 in 2024 and 26/50 in 2025; only 2 complete histories | Below breadth gate. Informal employment divided by employment measures job form, not people losing earning access. The modelled table has regional/group outputs, not a country substitute. |
| ILO/OECD real wage index | Not acquired as a passing family | An average/index cannot yield the number of workers with falling wages or all-population income disruption. ILO nominal earnings cannot silently become real wages by an agent-selected deflator. Coverage of a comparable 40-country real-wage vintage remains unverified. [OECD definition](https://www.oecd.org/en/data/indicators/average-annual-wages.html). |
| World Bank survey poverty | Read-only WDI audit, not retained proof of a passing family: 38/50 in 2020, 10/50 in 2024, 1/50 in 2025 | Survey-year series does not meet the selected common-year/history requirement. The retained PIP lineup is separately labelled publisher modelling, not a survey replacement. |
| IMF employment `LE` | Retained April 2026 workbook: 25/50 in 2025 and 25 complete 2006-2025 histories | Below 40. Persons employed are a stock, not gross income-route losses. |
| IMF output gap `NGAP_NPGDP` | Same retained workbook: 19/50 in 2025 and 17 complete histories | Below 40. Percentage of potential GDP has no person denominator. |
| IMF unemployment `LUR` | Same workbook: 47/50 in 2025 and 45 complete histories | A useful cross-check, not another independent indicator family; same denominator and stock/flow problems. |
| National food CPI aggregated internationally | FAO says its May 2026 update covers 203 economies, with estimates flagged; exact top-50 20-year coverage not acquired | Household price-index change is not a population affected share or an income-route transition. The [FAO release](https://www.fao.org/statistics/highlights-archive/highlights-detail/general-and-food-consumer-price-indices-inflation-rates.-may-2026-update/en) is feasibility context only, not a retained passing source. |

The retained ILO table of contents is supporting metadata, not a substitute for country-row checks. Reported and modelled series are not summed or counted as independent families merely because their source names differ. A source that could have broad coverage but has not been acquired remains unverified.

## Producer-consumer boundary

Each family supplies its stable identity, proposed category relationship, native denominator, source vintage, licence assessment, evidence ceiling, full coverage table, and selected observations with source selectors and native statuses. Every family declares `disruption_measurement: not-measured` and `household_mapping: not-available`. A consumer may compute clearly named native-indicator changes, but must not convert those into disruption counts or a binding-condition change. Missing or incomparable evidence requires `cannot-say`, including a null affected-share reading, rather than zero or `no-candidate` by default.
