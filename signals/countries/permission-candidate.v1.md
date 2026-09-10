---
id: permission-candidate-v1
title: Women's economic legal rights as a permission-context candidate
type: research-note
status: review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# Women's economic legal rights: a measured permission-context candidate

**The WBL 2026 legal-framework index has retained values for 49 of the proposed
50 economies, but it does not establish effective permission for a particular
person or service.** The only missing economy is Taiwan (`TWN`); no substitute
is used. The native series is `GD_WBL_OVL_LAW`, not the earlier `SG.LAW.INDX`.
The values, selectors and source identities are in
[`permission-candidate.v1.json`](permission-candidate.v1.json).

## What is measured, and when

World Bank metadata describes a composite of ten legal-rights topics affecting
women's economic opportunities. The index is the unweighted average of the
topic scores, on a 0–100 scale. These are **index points, not the percentage of
women with access or a probability of enforcement**. Australia is 91.88 in the
retained native cell; this producer preserves the value rather than rounding it
to the API's display precision.
[Series metadata](https://api.worldbank.org/v2/sources/2/series/GD_WBL_OVL_LAW/metadata?format=json).

The retained WDI vintage is **2026-07-13**, and the common WDI reference year is
**2025**. The metadata explicitly maps WBL's **2026 report** to **2025 WDI data**
and identifies revised WBL 2.0 methodology. Laws and policies are assessed
through **1 October 2025**, not through the retrieval date. Annual reporting is
the programme's cadence; the FAQ identifies 2027 as the next planned report.
[Metadata](https://api.worldbank.org/v2/sources/2/series/GD_WBL_OVL_LAW/metadata?format=json),
[WBL FAQ](https://wbl.worldbank.org/en/aboutus/faq).

Only 2025 has non-null values in the retained native series. The WBL download
page separately offers 2024–2025 recalculated under the 2026 methodology, but
those workbooks are not retained in this candidate. No historical series is
spliced in and no change, tail rank or storm is inferred.
[WBL downloads](https://wbl.worldbank.org/en/data/download-data).

## Why it is a proxy, not a permission verdict

The selected pillar measures formal laws. WBL separately measures supportive
frameworks and expert perceptions of enforcement. Selecting the legal score
does not import either of those other pillars. The publisher's standardised
cases typically concern an adult lawful citizen in the main business city,
with further topic-specific assumptions. National labels do not mean every
woman, rural resident, disabled person, migrant or minority legal situation is
represented. The retained metadata expressly warns about subnational and
intersectional limits.
[Methodology](https://wbl.worldbank.org/en/data/methodology),
[Metadata limitations](https://api.worldbank.org/v2/sources/2/series/GD_WBL_OVL_LAW/metadata?format=json).

Its proposed role under Fernando's **permission** lens is narrow: investigate
formal economic-rights restrictions and their distribution across economies.
It cannot establish which condition binds today for obtaining an essential,
nor whether legal reform caused a change in people's outcomes. That requires
the exact route, population and current legal eligibility, successful and
refused attempts, appeal/enforcement outcomes, and linked evidence for price,
proximity, availability and capability, including alternative routes.

## Retention, licence and admission status

Six official responses are retained with exact decoded body bytes, serialised
Fetch response headers, timestamps, HTTP status and SHA-256 hashes. The values
response contains all 17,490 native rows in one page; null historical cells and
non-selected economies remain in the source. Extraction verifies source `2`,
the exact series and vintage, unique country-year keys, numeric domain and one
common year. Every selected value retains its `$[1][index]` selector.

The source-specific metadata names **CC BY 3.0 IGO**, not the CC BY 4.0 licence
of some other WDI series. Its licence URL contains spaces; the malformed native
value is preserved rather than silently repaired. This licence statement is
for the data series, not blanket permission to redistribute all accompanying
website content. Retention establishes local byte consistency, not publisher
authentication or legal advice about redistribution.
[Licence metadata](https://api.worldbank.org/v2/sources/2/series/GD_WBL_OVL_LAW/metadata?format=json).

The 49/50 coverage exceeds the numerical breadth criterion. This lane supplies
a **candidate for review**, not an edit to the shared panel or catalogue. No
frontend, condition evolution, binding diagnosis or detection claim is added.

## Reproduce

```sh
node --test signals/countries/permission-candidate.test.mjs
node signals/countries/tools/permission-candidate.mjs --check
```

Use Node 22. Tests reject pagination, changed vintage, old-method series,
duplicate keys, missing values promoted to observations, out-of-domain scores,
failed HTTP status and modified bodies even if local receipt hashes are changed.
The acquisition tool requires a new directory and preserves failed HTTP bodies;
it is not part of ordinary replay. No provider or participant was contacted.
