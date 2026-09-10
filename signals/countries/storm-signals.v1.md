---
id: country-storm-signals-v1
title: Country signals, a commissioned starting list
type: research
status: proposed
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# What should the weather station measure first?

**Start with traceable context, then acquire the evidence needed to explain
access.** Fernando commissioned a world weather station, not this particular
signal list. His five categories organise the questions. They are not five
independent indices of abundance. None of the retained national aggregates
establishes which condition currently binds for a person, or detects a storm.

The proposed [sampling frame](country-set.v1.json) is the IMF April 2026 WEO
ranking of 2025 nominal GDP, including separately reported economies. It is not
Fernando's chosen ranking or a sovereignty judgement. Every coverage denominator
below is that exact set of 50, not the publisher's total country count.

## Candidate register

| Category lens | Proposed candidate and publisher | Cadence and retained coverage | Licence and evidence ceiling |
| --- | --- | --- | --- |
| Price | WDI `FP.CPI.TOTL.ZG`, World Bank with IMF IFS upstream | Annual; 47/50 in 2025, WDI update 2026-07-13 | Retained metadata CC BY 4.0. Headline consumer price change, not an essentials-only price level or affordability ratio. Negative rates and rates above 100% are valid. |
| Price, distribution context | ILOSTAT `LAP_2GDP_NOC_RT_A`, labour income share | Annual; 50/50 in 2025, modelled estimates Nov. 2025 edition, TOC update 2026-03-20 without stated timezone | Retained ILO data terms CC BY 4.0 for this edition. Explicitly modelled national labour income/GDP, not a household's spendable income or AI-related losses. |
| Availability | WDI `EG.ELC.ACCS.ZS`, World Bank SDG electrification dataset | Annual; 49/50 in 2024, WDI update 2026-07-13 | Retained metadata CC BY 4.0. Population connection/access share, not outage-free, affordable usable electricity or compute capacity. |
| Capability, enabling context | WDI `IT.NET.USER.ZS`, World Bank with ITU upstream | Annual; 49/50 in 2024, WDI update 2026-07-13; only 6/50 at 2025 | Retained metadata CC BY 4.0 with ITU attribution. Internet use in the preceding three months, not functional skills, accessible design or effective access. Candidate research remains separate from the three-series view. |
| Permission | WBL `GD_WBL_OVL_LAW`, World Bank Legal Framework Index | Annual programme; 49/50 in WDI 2025, WDI update 2026-07-13, WBL 2026 methodology; laws through 2025-10-01 | Retained metadata CC BY 3.0 IGO, not the WDI default 4.0. Women's de jure economic-rights index points, not the percentage of women with permission, enforcement or household service eligibility. |
| Proximity | Rural Access Index, World Bank / SDG 9.1.1 | Retained April 2024 workbook has 29 economies and years 2009–2022. Five proposed economies appear across different years, but the maximum common-year coverage is only 1/50 | Retained catalogue CC BY 4.0. Rural population within 2 km of an all-season road, not travel time to a reachable essential-service destination. Research-only, below the 40/50 gate; regular fresh top-50 coverage is not established. |

For the first three, [measurements.v1.json](measurements.v1.json) holds all
selected rows, exact native selectors, source paths, SHA-256 digests, response
receipts, metadata, status flags and same-vintage history. The
[measurement research](measurement-research.md) explains extraction and gaps.
The [capability candidate](capability-candidate.md) has its own retained body,
headers, selectors, licence and reproducible artifact. The
[permission candidate](permission-candidate.v1.md) retains its separate WBL
methodology and terms; the API has no non-null history before 2025 under this
series, so no old-method trend is spliced in. The retained
[proximity candidate](proximity-candidate.md) stays outside the reader: six
observations for five economies across mixed years do not become five
same-period observations. Its sparse, old coverage fails the requested regular
broad proximity-series aim. That category's acquisition gate remains unmet.

No per-country older-year fallback, neighbouring-country value or agent estimate
is used. The common-year rule deliberately exposes missing observations: CPI
USA/TWN/ARG and electricity TWN are absent at the selected years. A completed
year is not proof of actual-only data. ILO estimates are modelled; empty WDI
status flags do not certify otherwise. Vintage, observation year and original
publication date remain separate fields.

## What would make these useful for early action?

The annual series describe 2024 or 2025 while this review occurs in September
2026. They do not establish timely warning. Before proposing an alert, measure
release lag, historical revision size, within-country comparability, persistence,
false alarms, missed episodes and usable lead time against independently defined
outcomes. Do not retrospectively select a threshold around a remembered crisis.

The [weather criteria proposal](weather-criteria.v1.md) binds one uncalibrated
own-history investigation rule to existing IF definitions with declared domains.
It does not compute real-country ranks because comparability has not been
reviewed. No detection, warning or cross-country league table follows from
having enough numeric history. Improvements and deteriorations both require
interpretation, especially near a connection-rate ceiling.

For each measured economy, the five named gaps specify the missing household,
region, period and service relationships needed to identify a bottleneck.
National labour share cannot fill an affordability gap; legal equality cannot
fill an enforcement gap; a road cannot fill an accepted-appointment gap.
The research action is to obtain those linked measurements with appropriate
licensing and consent. Collecting personal data or contacting people needs
separate authority. No policy intervention is authorised by this catalogue.

## Leads not yet proposed as panel series

Occupation exposure, concentration/top-firm profits, essentials basket levels,
compute availability and component prices remain research leads from the brief.
No coverage, maintained cadence or usable licence is claimed without retention.
Do not quietly substitute a one-off AI exposure index for observed displacement,
or a global profit total for country market concentration. These are priorities
for the next acquisition decision, not empty panel entries.

The [backlog](../../meta/backlog.md) asks Fernando which shifts matter most,
which country ranking he wants, what counts as a storm, and how forecastable
crisis points fit a transition whose sequence he says cannot be planned.
This proposal supplies choices and limits, not answers in his voice.
