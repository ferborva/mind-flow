---
id: country-capability-internet-use-candidate
title: Internet use as a capability-context candidate
type: research-note
status: commissioned-proposal
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# Internet use as a capability-context candidate

**Proposal, not Fernando's selection:** retain internet-use participation as
one capability-context proxy. It is not a measure of digital skill, effective
essential-service access or a diagnosed binding condition. This source-only
candidate adds no rendered surface and claims no additional breadth gate.

World Bank WDI `IT.NET.USER.ZS`, sourced from the International Telecommunication
Union, counts individuals who used the internet from any location during the
last three months. Device and fixed/mobile route do not determine inclusion.
The native series is an annual percentage of the population, not a broadband
subscription count or household connectivity measure.

The retained WDI vintage has `lastupdated=2026-07-13`. The latest completed year
with at least 40 of the proposed 50 IMF economy codes is **2024: 49/50**. The
2025 column covers only six, so there is no per-country latest-year mixture.
Taiwan (`TWN`) has no non-null observation in the chosen year. It is not merged
into China or filled from another source. Earlier same-vintage history and each
native observation flag remain in the candidate file. Empty flags do not prove
actual-only data or rule out publisher estimates. The year is one reporting label;
metadata cautions that national data quality and fiscal reporting periods differ.

For effective capability we would need task-specific ability to obtain and use
essential digital services, including affordability, literacy, disability
accommodations and assisted access, linked to unmet need by household and region.
An individual can have used the internet once yet lack those capabilities.

## Retention and reproduction

The original complete API responses, serialised response headers, acquisition
start/end timestamps, final URLs, body lengths and SHA-256 hashes are in
`sources/capability-2026-09-10-r2/`. The first local attempt was blocked by the
network sandbox before receiving bytes; the successful new directory preserves
that attempt boundary. Metadata includes the definition, limitations, cadence,
licence and required attribution. No source values were rewritten.

Use Node 22 after the separate country-set proposal is integrated:

```sh
node --test signals/countries/capability-candidate.test.mjs
node signals/countries/capability-candidate.mts --check
```

Before integration, tests accept `COUNTRY_SET_PATH` and the producer accepts
`--country-set=/absolute/path/to/country-set.v1.json` for read-only access to the
separate lane. The output binds the exact country-set bytes by hash. `--write`
creates a missing output only, never overwrites a retained candidate. Extraction
rejects pagination, vintage, domain, duplicate country/year and indicator drift.
The selection counts distinct country/year observations and never treats null
as zero or selects future years.

Source: International Telecommunication Union (ITU), World Telecommunication/ICT
Indicators Database, via [World Bank WDI](https://data.worldbank.org/indicator/IT.NET.USER.ZS).
The retained series-specific metadata declares **CC BY 4.0** and requests ITU
attribution for third-party use. The filtered, common-year derivative is Ren's
analysis. No publisher endorsement is implied.
