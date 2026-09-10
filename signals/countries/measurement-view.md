---
id: country-measurement-view
title: Country measurement snapshot
type: research-synthesis
status: commissioned-proposal
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# Country measurement snapshot

[Jump to income-access assessments](#income-access-comparison-2024-to-2025). The original national context remains below.

**50 economies, 47 with all three original series, 146 retained signal observations.** These are dated national statistics, not live conditions or a warning result. Binding categories remain unknown; the evidence needed to assess them is named below.

The proposed sampling frame uses 2025 nominal GDP in the April 2026 IMF WEO. Fernando has not chosen the ranking or signals. IMF economies include Hong Kong and Taiwan separately; the labels make no sovereignty decision. GDP estimates may be present even for a completed year.

Measurement snapshot: [retained data](measurements.v1.json), sha256:d2801fedadabf24a7c0c02c19e10829b35cf35834024aea5363783357fa51b0f. Country-frame hash: sha256:500048481fb5f6bae4caa3dca469837e3ab209ead1140eacfb93a6f350877e1f.

Values display at most three decimal places; original precision remains in the linked bytes. Each series uses one common reference year and one retained publisher vintage. The series cover different reference years, not a single-period snapshot; do not infer a same-period relationship between them. Missing entries are not backfilled. Empty native observation flags do not certify actual-only data. ILO labour-income shares are publisher-modelled. ILO native flags are retained; their meaning is not verified because no observation-status legend is retained. National averages do not establish household access.

### Series and interpretation

- **Headline CPI change:** WDI lastupdated 2026-07-13. Headline typical-consumer basket price change, not an essentials basket price level, household affordability, local prices or AI effects. Source: World Bank WDI; underlying IMF International Financial Statistics. Licence: CC BY-4.0. [Original response](sources/international-2026-09-10/wdi-cpi.body), sha256:28813d8e4499cf3941cb24f4e1a662590b0f3c5d9bbb1ea0f3ed22041161ea5a.

- **Electricity access:** WDI lastupdated 2026-07-13. Population electricity-access share, not continuous/reliable/affordable usable service, compute capacity or a diagnosed binding condition. Source: World Bank WDI; underlying SDG 7.1.1 Electrification Dataset. Licence: CC BY-4.0. [Original response](sources/international-2026-09-10/wdi-electricity.body), sha256:9b78c10ee45b8e8da6624f8d47e47d43045262aaf2c759d3c9e8655da635374f.

- **Labour income share:** ILO modelled estimates Nov. 2025; TOC last.update 20/03/2026 12:54:04 \(publisher supplies no timezone\). Aggregate labour-income distribution context only, not earnings of a particular household, affordability, AI occupation exposure or causal AI effects. Source: International Labour Organization, ILOSTAT. Licence: CC BY-4.0. [Original response](sources/international-2026-09-10/ilo-labour-share.body), sha256:0a9f3339226b6fa2073ad50552ed57613d630795a5b593d6d60f728770fbf48b.

The proposed weather criteria remain unadopted and history comparability unassessed. No rank is computed in this reader. [Method proposal](weather-criteria.v1.md).

## 1. United States (USA)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | No retained observation | 2025 | % annual change | No non-null FP.CPI.TOTL.ZG observation for USA in this common year; no substitute used. |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[16765\]; native flag empty |
| Labour income share | 55.807 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 4055; ref\_area=USA; source=XA:2174; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** USA: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** USA: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** USA: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** USA: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** USA: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 2. China, People's Republic of (CHN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.06 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[5874\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[5875\]; native flag empty |
| Labour income share | 51.228 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 716; ref\_area=CHN; source=XA:2070; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** CHN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** CHN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** CHN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** CHN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** CHN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 3. Germany (DEU)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.172 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[7986\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[7987\]; native flag empty |
| Labour income share | 63.107 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 992; ref\_area=DEU; source=XA:2165; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** DEU: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** DEU: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** DEU: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** DEU: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** DEU: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 4. Japan (JPN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.173 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9636\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9637\]; native flag empty |
| Labour income share | 54.409 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1958; ref\_area=JPN; source=XA:1843; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** JPN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** JPN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** JPN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** JPN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** JPN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 5. United Kingdom (GBR)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.883 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[16698\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[16699\]; native flag empty |
| Labour income share | 57.704 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1360; ref\_area=GBR; source=XA:2056; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** GBR: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** GBR: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** GBR: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** GBR: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** GBR: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 6. India (IND)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.399 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9042\]; native flag empty |
| Electricity access | 99.9 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9043\]; native flag empty |
| Labour income share | 61.825 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1751; ref\_area=IND; source=XA:1976; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** IND: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** IND: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** IND: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** IND: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** IND: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 7. France (FRA)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.944 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[7656\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[7657\]; native flag empty |
| Labour income share | 59.996 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1314; ref\_area=FRA; source=XA:2048; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** FRA: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** FRA: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** FRA: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** FRA: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** FRA: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 8. Russian Federation (RUS)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 8.72 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13794\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13795\]; native flag empty |
| Labour income share | 48.307 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3285; ref\_area=RUS; source=XA:2110; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** RUS: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** RUS: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** RUS: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** RUS: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** RUS: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 9. Italy (ITA)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.532 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9504\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9505\]; native flag empty |
| Labour income share | 58.452 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1889; ref\_area=ITA; source=XA:1988; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** ITA: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ITA: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ITA: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ITA: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ITA: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 10. Canada (CAN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.072 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[5478\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[5479\]; native flag empty |
| Labour income share | 58.697 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 624; ref\_area=CAN; source=XA:1935; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** CAN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** CAN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** CAN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** CAN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** CAN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 11. Brazil (BRA)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 5.017 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[4884\]; native flag empty |
| Electricity access | 99.8 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[4885\]; native flag empty |
| Labour income share | 59.5 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 486; ref\_area=BRA; source=XA:2002; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** BRA: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** BRA: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** BRA: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** BRA: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** BRA: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 12. Spain (ESP)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.7 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[14982\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[14983\]; native flag empty |
| Labour income share | 59.684 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1199; ref\_area=ESP; source=XA:2028; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** ESP: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ESP: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ESP: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ESP: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ESP: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 13. Korea, Republic of (KOR)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.123 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[10032\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[10033\]; native flag empty |
| Labour income share | 58.681 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2073; ref\_area=KOR; source=XA:2004; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** KOR: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** KOR: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** KOR: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** KOR: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** KOR: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 14. Australia (AUS)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.874 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[3828\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[3829\]; native flag empty |
| Labour income share | 58.322 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 141; ref\_area=AUS; source=XA:2202; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** AUS: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** AUS: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** AUS: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** AUS: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** AUS: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 15. Mexico (MEX)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.807 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[11550\]; native flag empty |
| Electricity access | 99.8 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[11551\]; native flag empty |
| Labour income share | 37.985 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2461; ref\_area=MEX; source=XA:1875; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** MEX: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** MEX: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** MEX: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** MEX: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** MEX: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 16. Türkiye, Republic of (TUR)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 34.881 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[16236\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[16237\]; native flag empty |
| Labour income share | 41.126 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3922; ref\_area=TUR; source=XA:2164; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** TUR: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** TUR: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** TUR: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** TUR: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** TUR: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 17. Indonesia (IDN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.913 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9108\]; native flag empty |
| Electricity access | 99.9 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9109\]; native flag empty |
| Labour income share | 58.202 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1728; ref\_area=IDN; source=XA:1897; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** IDN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** IDN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** IDN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** IDN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** IDN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 18. Netherlands, The (NLD)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.26 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[12342\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[12343\]; native flag empty |
| Labour income share | 60.499 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2852; ref\_area=NLD; source=XA:1946; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** NLD: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** NLD: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** NLD: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** NLD: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** NLD: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 19. Saudi Arabia (SAU)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.084 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[14124\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[14125\]; native flag empty |
| Labour income share | 30.227 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3331; ref\_area=SAU; source=XA:2114; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** SAU: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** SAU: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** SAU: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** SAU: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** SAU: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 20. Switzerland (CHE)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.154 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[15576\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[15577\]; native flag empty |
| Labour income share | 71.172 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 670; ref\_area=CHE; source=XA:2054; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** CHE: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** CHE: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** CHE: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** CHE: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** CHE: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 21. Poland, Republic of (POL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.814 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13464\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13465\]; native flag empty |
| Labour income share | 49.592 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3082; ref\_area=POL; source=XA:2090; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** POL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** POL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** POL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** POL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** POL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 22. Taiwan Province of China (TWN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | No retained observation | 2025 | % annual change | No non-null FP.CPI.TOTL.ZG observation for TWN in this common year; no substitute used. |
| Electricity access | No retained observation | 2024 | % of population | No non-null EG.ELC.ACCS.ZS observation for TWN in this common year; no substitute used. |
| Labour income share | 52.201 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3945; ref\_area=TWN; source=XA:8368; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** TWN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** TWN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** TWN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** TWN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** TWN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 23. Belgium (BEL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.467 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[4356\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[4357\]; native flag empty |
| Labour income share | 63.345 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 233; ref\_area=BEL; source=XA:2185; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** BEL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** BEL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** BEL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** BEL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** BEL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 24. Ireland (IRL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.21 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9306\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9307\]; native flag empty |
| Labour income share | 29.228 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1774; ref\_area=IRL; source=XA:1832; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** IRL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** IRL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** IRL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** IRL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** IRL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 25. Argentina (ARG)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | No retained observation | 2025 | % annual change | No non-null FP.CPI.TOTL.ZG observation for ARG in this common year; no substitute used. |
| Electricity access | 98.4 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[3631\]; native flag empty |
| Labour income share | 50.188 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 95; ref\_area=ARG; source=XA:1868; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** ARG: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ARG: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ARG: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ARG: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ARG: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 26. Sweden (SWE)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.68 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[15510\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[15511\]; native flag empty |
| Labour income share | 53.686 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3646; ref\_area=SWE; source=XA:2140; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** SWE: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** SWE: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** SWE: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** SWE: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** SWE: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 27. Israel (ISR)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.041 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9438\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9439\]; native flag empty |
| Labour income share | 49.436 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1866; ref\_area=ISR; source=XA:1862; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** ISR: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ISR: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ISR: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ISR: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ISR: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 28. Singapore (SGP)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.903 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[14454\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[14455\]; native flag empty |
| Labour income share | 43.218 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3396; ref\_area=SGP; source=XA:2120; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** SGP: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** SGP: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** SGP: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** SGP: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** SGP: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 29. Austria (AUT)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.527 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[3894\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[3895\]; native flag empty |
| Labour income share | 62.058 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 164; ref\_area=AUT; source=XA:2089; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** AUT: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** AUT: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** AUT: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** AUT: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** AUT: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 30. Thailand (THA)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | -0.134 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[15840\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[15841\]; native flag empty |
| Labour income share | 47.019 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3761; ref\_area=THA; source=XA:2150; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** THA: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** THA: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** THA: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** THA: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** THA: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 31. United Arab Emirates (ARE)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.251 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[16632\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[16633\]; native flag empty |
| Labour income share | 36.838 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 72; ref\_area=ARE; source=XA:1978; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** ARE: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ARE: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ARE: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ARE: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ARE: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 32. Norway (NOR)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.056 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[12870\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[12871\]; native flag empty |
| Labour income share | 45.928 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2875; ref\_area=NOR; source=XA:2206; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** NOR: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** NOR: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** NOR: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** NOR: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** NOR: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 33. Vietnam (VNM)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.31 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[17094\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[17095\]; native flag empty |
| Labour income share | 47.32 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 4170; ref\_area=VNM; source=XA:2184; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** VNM: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** VNM: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** VNM: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** VNM: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** VNM: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 34. Philippines (PHL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.659 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13398\]; native flag empty |
| Electricity access | 94.8 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13399\]; native flag empty |
| Labour income share | 45.646 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3036; ref\_area=PHL; source=XA:2086; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** PHL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** PHL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** PHL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** PHL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** PHL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 35. Malaysia (MYS)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.381 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[11088\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[11089\]; native flag empty |
| Labour income share | 40.712 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2714; ref\_area=MYS; source=XA:1940; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** MYS: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** MYS: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** MYS: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** MYS: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** MYS: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 36. Denmark (DNK)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.894 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[6666\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[6667\]; native flag empty |
| Labour income share | 56.172 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1038; ref\_area=DNK; source=XA:2181; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** DNK: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** DNK: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** DNK: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** DNK: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** DNK: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 37. Bangladesh (BGD)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 8.769 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[4158\]; native flag empty |
| Electricity access | 99.5 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[4159\]; native flag empty |
| Labour income share | 49.029 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 302; ref\_area=BGD; source=XA:1939; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** BGD: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** BGD: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** BGD: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** BGD: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** BGD: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 38. Colombia (COL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 5.142 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[5940\]; native flag empty |
| Electricity access | 98.9 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[5941\]; native flag empty |
| Labour income share | 50.537 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 831; ref\_area=COL; source=XA:2109; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** COL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** COL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** COL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** COL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** COL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 39. Romania (ROU)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 7.189 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13728\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13729\]; native flag empty |
| Labour income share | 44.549 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3262; ref\_area=ROU; source=XA:2108; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** ROU: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ROU: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ROU: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ROU: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ROU: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 40. Hong Kong Special Administrative Region, People's Republic of China (HKG)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.436 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[8844\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[8845\]; native flag empty |
| Labour income share | 53.363 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1613; ref\_area=HKG; source=XA:1964; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** HKG: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** HKG: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** HKG: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** HKG: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** HKG: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 41. South Africa (ZAF)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.206 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[14850\]; native flag empty |
| Electricity access | 90.2 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[14851\]; native flag empty |
| Labour income share | 52.636 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 6263; ref\_area=ZAF; source=XA:2192; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** ZAF: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** ZAF: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** ZAF: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** ZAF: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** ZAF: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 42. Pakistan (PAK)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 3.546 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13002\]; native flag empty |
| Electricity access | 95.7 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13003\]; native flag empty |
| Labour income share | 49.828 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 2967; ref\_area=PAK; source=XA:2080; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** PAK: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** PAK: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** PAK: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** PAK: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** PAK: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 43. Czech Republic (CZE)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.46 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[6600\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[6601\]; native flag empty |
| Labour income share | 53.988 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 969; ref\_area=CZE; source=XA:1990; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** CZE: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** CZE: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** CZE: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** CZE: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** CZE: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 44. Iran, Islamic Republic of (IRN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 42.171 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9174\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9175\]; native flag empty |
| Labour income share | 34.953 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1797; ref\_area=IRN; source=XA:1980; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** IRN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** IRN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** IRN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** IRN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** IRN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 45. Egypt, Arab Republic of (EGY)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 14.074 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[6996\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[6997\]; native flag empty |
| Labour income share | 38.242 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1130; ref\_area=EGY; source=XA:2016; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** EGY: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** EGY: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** EGY: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** EGY: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** EGY: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 46. Chile (CHL)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 4.213 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[5808\]; native flag empty |
| Electricity access | 99 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[5809\]; native flag empty |
| Labour income share | 51.833 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 693; ref\_area=CHL; source=XA:1943; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** CHL: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** CHL: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** CHL: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** CHL: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** CHL: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 47. Portugal (PRT)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 2.336 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13530\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13531\]; native flag empty |
| Labour income share | 57.587 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3151; ref\_area=PRT; source=XA:2096; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** PRT: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** PRT: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** PRT: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** PRT: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** PRT: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 48. Peru (PER)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 1.531 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[13332\]; native flag empty |
| Electricity access | 96.5 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[13333\]; native flag empty |
| Labour income share | 43.619 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 3013; ref\_area=PER; source=XA:2084; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** PER: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** PER: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** PER: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** PER: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** PER: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 49. Finland (FIN)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 0.338 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[7590\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[7591\]; native flag empty |
| Labour income share | 54.077 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1268; ref\_area=FIN; source=XA:1836; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag M |

Evidence needed to assess the five conditions:

- **Price:** FIN: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** FIN: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** FIN: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** FIN: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** FIN: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

## 50. Kazakhstan, Republic of (KAZ)

**Binding category: unknown.** The national indicators below do not identify which condition prevents access to the covered essentials.

| Indicator | Value | Reference year | Unit | Retained source and native selector |
| --- | ---: | ---: | --- | --- |
| Headline CPI change | 11.388 | 2025 | % annual change | [Source](sources/international-2026-09-10/wdi-cpi.body); $\[1\]\[9768\]; native flag empty |
| Electricity access | 100 | 2024 | % of population | [Source](sources/international-2026-09-10/wdi-electricity.body); $\[1\]\[9769\]; native flag empty |
| Labour income share | 41.333 | 2025 | % of GDP, publisher-modelled | [Source](sources/international-2026-09-10/ilo-labour-share.body); CSV record 1981; ref\_area=KAZ; source=XA:1996; indicator=LAP\_2GDP\_NOC\_RT; time=2025; native flag I |

Evidence needed to assess the five conditions:

- **Price:** KAZ: local essential-basket and adequate-electricity bills matched to equivalised disposable income by household income decile and region in the same period; CPI and aggregate labour share do not supply this ratio.

- **Permission:** KAZ: electricity connection applications, eligibility, refusals and legal/administrative reasons by household/region, matched to unmet essential-service need in the same period.

- **Proximity:** KAZ: household travel/delivery time to essential-basket suppliers and distance to feasible grid/off-grid service by settlement and income decile.

- **Availability:** KAZ: hours of usable electricity, outage frequency/duration \(SAIFI/SAIDI\), unmet demand and essential-basket stockouts by household/region; national connection share is insufficient.

- **Capability:** KAZ: household ability to operate essential appliances and obtain/use essential goods, including disability/accessibility support and functional skills, matched to service need.

<!-- round-10-income-context:start -->
## Income-access comparison, 2024 to 2025

**50 economies: 50 cannot-say.** This is income context, not a measured storm panel or an all-clear result. The rule is a commissioned proposal, not a validated warning system.

- **candidate:** at least one measured arm of the proposed rule is met. This is a reason to investigate, not a confirmed crisis.

- **no-candidate:** both arms are measured and neither is met under the stated assumptions. This does not establish safety or stability.

- **cannot-say:** missing measurement or an unresolved assumption prevents a verdict; this is not evidence of stability. It does not mean that people are unaffected.

The direct arm asks whether disrupted access to means of generating income has increased by at least five percentage points of total population. The other arm asks whether the binding condition, the condition preventing that same access, has changed. A large beneficial shift remains unassessed while Fernando's direction decision is open.

Direct disruption concerns the person whose way of earning is disrupted. Household exposure concerns linked household members; it is shown separately and never added to the direct reading. Here, pp means percentage points: a change from 1% to 6% is +5 pp, not a 5% relative increase. No people counts, causal category or shared global event are inferred.

[Criterion and reversible assumptions](storm-criterion.v1.md) · [Twenty-year review data](storm-review.v1.json) · [Source and licence audit](income-source-audit.md).

Coverage for these income families: employment/population 50/50; unemployment 50/50; national PIP poverty 49/50. These are distinct from the original CPI, electricity and labour-income-share series above. Any absent family is named in the row, not backfilled.

ILO uses the November 2025 modelled vintage, which extends to 2027. Its 2025 values are model outputs whose estimate-versus-projection status is not carried at row level. PIP uses the March 2026 national $3/day lineup in 2021 PPP (purchasing power parity, a price-level adjustment, not an exchange rate). 49 of 49 retained 2025 PIP values are labelled nowcast: a model estimate, not a survey observation for that year. The source vintages are not a common release date.

**Evidence missing in every row:**

- Comparable direct income-route disruption shares of total population.

- Measured before/after binding category for the same income-access claim and population.

- Person-linked household exposure mapping with overlap specified.

| Economy | State | Direct disruption change (pp of total population) | Household exposure change (pp of total population) | Binding condition | Additional gaps |
| --- | --- | --- | --- | --- | --- |
| USA | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| CHN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| DEU | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| JPN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| GBR | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| IND | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| FRA | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| RUS | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ITA | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| CAN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| BRA | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ESP | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| KOR | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| AUS | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| MEX | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| TUR | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| IDN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| NLD | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| SAU | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| CHE | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| POL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| TWN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| BEL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| IRL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ARG | cannot-say | Unavailable | Unavailable | Unknown | No national PIP observation |
| SWE | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ISR | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| SGP | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| AUT | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| THA | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ARE | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| NOR | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| VNM | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| PHL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| MYS | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| DNK | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| BGD | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| COL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ROU | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| HKG | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| ZAF | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| PAK | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| CZE | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| IRN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| EGY | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| CHL | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| PRT | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| PER | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| FIN | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |
| KAZ | cannot-say | Unavailable | Unavailable | Unknown | None beyond common gaps |

### Native income-related measurements, not affected-person shares

Each level is a percentage of its own denominator. The change column subtracts the earlier native level from the later one; it does not count disrupted people. The values cannot be added or converted into disrupted-person shares. Country codes use the same retained sampling frame as the sections above.

Values and changes display at most three decimals; full precision remains in the linked review data. A selector identifies the later value in the retained source: CSV record N is 1-based; $[N] is a 0-based JSON array index. Earlier values and all source selectors remain in [the income measurement data](income-measurements.v1.json).

#### Employment / population aged 15+

[Retained source](sources/income-2026-09-10/ilo-epop.body).

| Economy | 2024 (%) | 2025 (%) | Native change 2024 to 2025 (pp; not disruption) | 2025 source selector |
| --- | ---: | ---: | ---: | --- |
| USA | 59.467 | 59.114 | -0.353 | CSV record 58745 |
| CHN | 61.931 | 61.572 | -0.359 | CSV record 10343 |
| DEU | 58.849 | 58.323 | -0.526 | CSV record 14339 |
| JPN | 61.717 | 61.893 | +0.176 | CSV record 28325 |
| GBR | 58.871 | 58.457 | -0.414 | CSV record 19667 |
| IND | 53.317 | 53.31 | -0.007 | CSV record 25328 |
| FRA | 51.544 | 51.172 | -0.372 | CSV record 19001 |
| RUS | 60.322 | 59.809 | -0.513 | CSV record 47558 |
| ITA | 46.365 | 46.151 | -0.214 | CSV record 27326 |
| CAN | 60.627 | 60.061 | -0.566 | CSV record 9011 |
| BRA | 59.031 | 59.37 | +0.339 | CSV record 7013 |
| ESP | 51.249 | 51.453 | +0.204 | CSV record 17336 |
| KOR | 62.67 | 62.624 | -0.046 | CSV record 29990 |
| AUS | 64.089 | 63.816 | -0.273 | CSV record 2018 |
| MEX | 59.985 | 59.962 | -0.023 | CSV record 35615 |
| TUR | 49.43 | 49.746 | +0.316 | CSV record 56801 |
| IDN | 65.685 | 65.765 | +0.08 | CSV record 24995 |
| NLD | 64.966 | 64.643 | -0.323 | CSV record 41276 |
| SAU | 62.907 | 63.12 | +0.213 | CSV record 48224 |
| CHE | 64.189 | 63.494 | -0.695 | CSV record 9677 |
| POL | 57.009 | 56.577 | -0.432 | CSV record 44606 |
| TWN | 57.084 | 57.207 | +0.123 | CSV record 57134 |
| BEL | 51.429 | 51.068 | -0.361 | CSV record 3350 |
| IRL | 62.218 | 61.841 | -0.377 | CSV record 25661 |
| ARG | 57.439 | 57.489 | +0.05 | CSV record 1352 |
| SWE | 59.298 | 58.979 | -0.319 | CSV record 52805 |
| ISR | 63.14 | 63.204 | +0.064 | CSV record 26993 |
| SGP | 67.308 | 67.709 | +0.401 | CSV record 49178 |
| AUT | 57.361 | 56.767 | -0.594 | CSV record 2351 |
| THA | 66.604 | 66.157 | -0.447 | CSV record 54470 |
| ARE | 76.789 | 76.885 | +0.096 | CSV record 1019 |
| NOR | 63.201 | 62.564 | -0.637 | CSV record 41609 |
| VNM | 71.963 | 71.67 | -0.293 | CSV record 60410 |
| PHL | 60.05 | 59.979 | -0.071 | CSV record 43940 |
| MYS | 63.565 | 63.631 | +0.066 | CSV record 39278 |
| DNK | 61.56 | 61.345 | -0.215 | CSV record 15005 |
| BGD | 56.762 | 56.574 | -0.188 | CSV record 4349 |
| COL | 57.418 | 58.142 | +0.724 | CSV record 12008 |
| ROU | 48.683 | 48.255 | -0.428 | CSV record 47225 |
| HKG | 55.139 | 54.778 | -0.361 | CSV record 23330 |
| ZAF | 37.632 | 37.58 | -0.052 | CSV record 90713 |
| PAK | 49.435 | 49.498 | +0.063 | CSV record 42941 |
| CZE | 59.048 | 58.637 | -0.411 | CSV record 14006 |
| IRN | 37.905 | 37.565 | -0.34 | CSV record 25994 |
| EGY | 41.556 | 41.546 | -0.01 | CSV record 16337 |
| CHL | 56.864 | 56.713 | -0.151 | CSV record 10010 |
| PRT | 54.644 | 54.576 | -0.068 | CSV record 45605 |
| PER | 69.023 | 69.127 | +0.104 | CSV record 43607 |
| FIN | 54.826 | 54.035 | -0.791 | CSV record 18335 |
| KAZ | 67.176 | 64.537 | -2.639 | CSV record 28658 |

#### Unemployment / labour force aged 15+

[Retained source](sources/income-2026-09-10/ilo-unemployment.body).

| Economy | 2024 (%) | 2025 (%) | Native change 2024 to 2025 (pp; not disruption) | 2025 source selector |
| --- | ---: | ---: | ---: | --- |
| USA | 4.022 | 4.198 | +0.176 | CSV record 58745 |
| CHN | 4.59 | 4.615 | +0.025 | CSV record 10343 |
| DEU | 3.4 | 3.711 | +0.311 | CSV record 14339 |
| JPN | 2.5 | 2.451 | -0.049 | CSV record 28325 |
| GBR | 4.361 | 4.746 | +0.385 | CSV record 19667 |
| IND | 4.173 | 4.219 | +0.046 | CSV record 25328 |
| FRA | 7.4 | 7.542 | +0.142 | CSV record 19001 |
| RUS | 2.43 | 2.133 | -0.297 | CSV record 47558 |
| ITA | 6.5 | 6.391 | -0.109 | CSV record 27326 |
| CAN | 6.351 | 6.907 | +0.556 | CSV record 9011 |
| BRA | 6.801 | 5.97 | -0.831 | CSV record 7013 |
| ESP | 11.4 | 10.376 | -1.024 | CSV record 17336 |
| KOR | 2.784 | 2.683 | -0.101 | CSV record 29990 |
| AUS | 3.942 | 4.09 | +0.148 | CSV record 2018 |
| MEX | 2.678 | 2.673 | -0.005 | CSV record 35615 |
| TUR | 8.8 | 8.52 | -0.28 | CSV record 56801 |
| IDN | 3.301 | 3.237 | -0.064 | CSV record 24995 |
| NLD | 3.7 | 3.874 | +0.174 | CSV record 41276 |
| SAU | 3.518 | 3.038 | -0.48 | CSV record 48224 |
| CHE | 4.343 | 4.873 | +0.53 | CSV record 9677 |
| POL | 2.807 | 2.976 | +0.169 | CSV record 44606 |
| TWN | 3.705 | 3.545 | -0.16 | CSV record 57134 |
| BEL | 5.7 | 5.906 | +0.206 | CSV record 3350 |
| IRL | 4.3 | 4.632 | +0.332 | CSV record 25661 |
| ARG | 7.15 | 7.145 | -0.005 | CSV record 1352 |
| SWE | 8.4 | 8.694 | +0.294 | CSV record 52805 |
| ISR | 3.595 | 3.489 | -0.106 | CSV record 26993 |
| SGP | 2.737 | 2.818 | +0.081 | CSV record 49178 |
| AUT | 5.2 | 5.582 | +0.382 | CSV record 2351 |
| THA | 0.781 | 0.781 | 0 | CSV record 54470 |
| ARE | 2.16 | 2.174 | +0.014 | CSV record 1019 |
| NOR | 4 | 4.637 | +0.637 | CSV record 41609 |
| VNM | 1.602 | 1.523 | -0.079 | CSV record 60410 |
| PHL | 2.202 | 2.235 | +0.033 | CSV record 43940 |
| MYS | 3.846 | 3.764 | -0.082 | CSV record 39278 |
| DNK | 5.358 | 5.529 | +0.171 | CSV record 15005 |
| BGD | 3.635 | 3.778 | +0.143 | CSV record 4349 |
| COL | 9.619 | 8.29 | -1.329 | CSV record 12008 |
| ROU | 5.4 | 5.992 | +0.592 | CSV record 47225 |
| HKG | 2.988 | 2.799 | -0.189 | CSV record 23330 |
| ZAF | 32.279 | 32.391 | +0.112 | CSV record 90713 |
| PAK | 5.492 | 5.42 | -0.072 | CSV record 42941 |
| CZE | 2.6 | 2.825 | +0.225 | CSV record 14006 |
| IRN | 8.146 | 8.301 | +0.155 | CSV record 25994 |
| EGY | 6.817 | 6.781 | -0.036 | CSV record 16337 |
| CHL | 8.718 | 8.974 | +0.256 | CSV record 10010 |
| PRT | 6.5 | 6.164 | -0.336 | CSV record 45605 |
| PER | 5.199 | 5.117 | -0.082 | CSV record 43607 |
| FIN | 8.4 | 9.461 | +1.061 | CSV record 18335 |
| KAZ | 4.833 | 4.771 | -0.062 | CSV record 28658 |

#### Poverty / publisher reporting population

[Retained source](sources/income-2026-09-10/pip-lineup.body).

| Economy | 2024 (%) | 2025 (%) | Native change 2024 to 2025 (pp; not disruption) | 2025 source selector |
| --- | ---: | ---: | ---: | --- |
| USA | 1.02 | 1.02 | 0 | $\[9381\] |
| CHN | 0 | 0 | 0 | $\[1654\] |
| DEU | 0.69 | 0.69 | 0 | $\[2298\] |
| JPN | 0.96 | 0.94 | -0.02 | $\[4505\] |
| GBR | 0.34 | 0.34 | 0 | $\[3126\] |
| IND | 3.7 | 2.96 | -0.74 | $\[4091\] |
| FRA | 0.07 | 0.07 | 0 | $\[2942\] |
| RUS | 0.09 | 0.09 | 0 | $\[7587\] |
| ITA | 0.92 | 0.92 | 0 | $\[4367\] |
| CAN | 0.22 | 0.22 | 0 | $\[1470\] |
| BRA | 3.01 | 2.88 | -0.13 | $\[1194\] |
| ESP | 0.8 | 0.78 | -0.02 | $\[2712\] |
| KOR | 0.06 | 0.06 | 0 | $\[4827\] |
| AUS | 0.84 | 0.84 | 0 | $\[458\] |
| MEX | 1.64 | 1.64 | 0 | $\[5747\] |
| TUR | 0.16 | 0.15 | -0.01 | $\[9059\] |
| IDN | 5.4 | 4.03 | -1.37 | $\[3999\] |
| NLD | 0.07 | 0.07 | 0 | $\[6621\] |
| SAU | 0.03 | 0.03 | 0 | $\[7679\] |
| CHE | 0.2 | 0.2 | 0 | $\[1516\] |
| POL | 0.24 | 0.24 | 0 | $\[7173\] |
| TWN | 0 | 0 | 0 | $\[9151\] |
| BEL | 0.08 | 0.08 | 0 | $\[642\] |
| IRL | 0.08 | 0.08 | 0 | $\[4137\] |
| ARG | Unavailable | Unavailable | Unavailable | No national PIP observation |
| SWE | 0.83 | 0.83 | 0 | $\[8369\] |
| ISR | 0.39 | 0.38 | -0.01 | $\[4321\] |
| SGP | 0 | 0 | 0 | $\[7817\] |
| AUT | 0.52 | 0.52 | 0 | $\[504\] |
| THA | 0.01 | 0.01 | 0 | $\[8737\] |
| ARE | 0 | 0 | 0 | $\[274\] |
| NOR | 0.19 | 0.19 | 0 | $\[6667\] |
| VNM | 1.32 | 1.12 | -0.2 | $\[9657\] |
| PHL | 10.24 | 9.24 | -1 | $\[7035\] |
| MYS | 0 | 0 | 0 | $\[6345\] |
| DNK | 0.35 | 0.35 | 0 | $\[2436\] |
| BGD | 4.81 | 4.41 | -0.4 | $\[780\] |
| COL | 8.5 | 8.27 | -0.23 | $\[1884\] |
| ROU | 0.68 | 0.66 | -0.02 | $\[7541\] |
| HKG | 0.01 | 0.01 | 0 | $\[3769\] |
| ZAF | 17.56 | 17.64 | +0.08 | $\[9887\] |
| PAK | 22.32 | 22.8 | +0.48 | $\[6897\] |
| CZE | 0 | 0 | 0 | $\[2252\] |
| IRN | 2.39 | 2.42 | +0.03 | $\[4183\] |
| EGY | 1.18 | 1.02 | -0.16 | $\[2620\] |
| CHL | 0.4 | 0.39 | -0.01 | $\[1608\] |
| PRT | 0.41 | 0.4 | -0.01 | $\[7311\] |
| PER | 5.14 | 4.92 | -0.22 | $\[6989\] |
| FIN | 0.2 | 0.2 | 0 | $\[2850\] |
| KAZ | 0.02 | 0.02 | 0 | $\[4551\] |

A high unemployment or poverty level is not itself a measured change in income-route disruption. A candidate would require comparable direct measurements meeting five percentage points of total population or evidence of a changed binding category. Confidence intervals, direct counts and household mappings are not supplied. Native movements can justify investigating a named population; they do not authorise action or establish forecast skill.

To question or correct a row, [open a repository issue](https://github.com/ferborva/mind-flow/issues/new) with the country code, comparison years, disputed value or wording, and a public source if available. Do not include personal or sensitive information. This is a public issue route, not consultation or an adjudicated correction process. No response time or change to the row is promised; no other reader correction route is established here.

<!-- round-10-income-context:end -->
