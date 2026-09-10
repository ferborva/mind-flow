---
id: country-signal-measurement-research-round-09
title: Three retained country signals and the measurements still missing
type: research-note
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# Three retained signals, no binding diagnosis

**Three distinct series clear 40 of the proposed 50 economies.** This is a
commissioned measurement choice, not Fernando's selection of storm signals.
It uses the IMF April 2026 nominal-GDP/2025 proposal produced in the country-set
lane. No country-set bytes are copied or changed here. No new rendered surface,
contract family or governance type is introduced.

| Series | Publisher vintage | Common reference year | Coverage | Missing native observations |
| --- | --- | --- | --- | --- |
| CPI annual percentage change, FP.CPI.TOTL.ZG | WDI lastupdated 2026-07-13 | 2025 | 47/50 | USA, TWN, ARG |
| Electricity-access population share, EG.ELC.ACCS.ZS | WDI lastupdated 2026-07-13 | 2024 | 49/50 | TWN |
| Labour-income GDP share, LAP_2GDP_NOC_RT_A | ILO modelled estimates Nov. 2025; TOC updated 20/03/2026 12:54:04 | 2025 | 50/50 | None |

These measure price movement, physical connection coverage and aggregate income
distribution. They are not three relabelled employment proxies. Shared economic
causes and country aggregates mean they are not statistically independent.
Labour share supplies purchasing-power context only; it does not measure a
household's resources or an AI occupation effect.

## 📦 Exact retention and reconstruction

`sources/international-2026-09-10/` contains each complete native HTTP response
body, serialised actual response headers and an acquisition receipt with URL,
final URL, status, start/end UTC, byte count and SHA-256. Acquisition ran at
2026-09-10T01:15:19.285Z to 01:15:30.268Z. The bodies are the complete responses
after HTTP content decoding, not reconstructed CSV or extracted snippets.
Both WDI requests retain all available years/areas in a single page. The full
ILO CSV contains 6,329 rows, matching the publisher TOC count. Original UTF-8 BOM
bytes are retained; only the parser's decoded view removes the BOM.

`tools/build-measurements.mjs` pins every native/metadata body digest, checks the
receipt's body and header digests, and rejects pagination, wrong editions,
wrong series, malformed numbers and duplicate country/year keys. Headers use
Fetch's normalised representation, not original wire-header bytes. Receipts are
creator records; publisher identity is not independently authenticated.

`measurements.v1.json` includes exact native row selectors, unrounded values,
selected common-year observations, all retained selected-economy history through
2025, missing-country lists, per-year coverage and the source-country-set digest.
Future rows remain in native bytes and are counted but never selected. It stores
the original publisher status flag even when empty. Empty WDI status does not
certify actual-only data. The ILO series is always explicitly modelled, including
completed years and imputation flags. This producer creates no estimates.

```sh
node signals/countries/tools/build-measurements.mjs
node signals/countries/tools/build-measurements.mjs --check
node --test signals/tests/country-measurements.test.mjs
```

Node 22 is required. Before country-set integration, use
`--country-set=/absolute/path/to/country-set.v1.json` to read that lane's exact
artifact. Acquisition is explicit and separate:
`node signals/countries/tools/retain-sources.mts <new-retention-directory>`.
It refuses an existing destination; use a new dated directory and review new
pins and edition selectors before admitting a refresh.

## 🔎 Definition findings from native publisher metadata

The retained [WDI CPI metadata](https://api.worldbank.org/v2/sources/2/series/FP.CPI.TOTL.ZG/metadata?format=json)
describes annual change in a typical consumer basket, not its price level or
an essentials-only basket. Deflation and changes above 100% are valid. Its
declared domain is greater than -100 with no upper cap, assuming a positive
price index. It must not inherit the generic [0,100] percentage-share domain.

The retained [WDI electricity metadata](https://api.worldbank.org/v2/sources/2/series/EG.ELC.ACCS.ZS/metadata?format=json)
names population access, compiled from surveys and other sources. Its historical
source text still says publication 2023/accessed 2024 while the reference range
ends in 2024. We retain that mismatch and label the common vintage as the WDI
database update, not a proven original publication date. The World Bank's
retained [Beyond Connections](https://www.worldbank.org/en/topic/energy/publication/energy-access-redefined)
explains why binary connection measures do not establish adequate energy
service. A value of 100% cannot certify reliability, affordability or compute
availability.

The retained [ILO TOC](https://rplumber.ilo.org/metadata/toc/indicator/)
names the Nov. 2025 model edition separately from its March 2026 update timestamp.
The timestamp has no declared timezone; none is invented. Source IDs are
country-specific. `XA:2198` belongs to Afghanistan, not the entire model. Every
row's `(ref_area, source)` joins the retained dictionary to the modelled-estimate
label. A hostile test rejects reusing a different country's source mapping.

All three are annual. Both WDI metadata responses explicitly declare CC BY-4.0.
The retained [ILO rights page](https://www.ilo.org/rights-and-permissions#data)
applies CC BY 4.0 to datasets and referential metadata published since 3 May 2023,
covering this November 2025 model edition. Publisher attribution is retained.
The electricity explanatory page is retained as source evidence; its separate
page licence is not assumed to be the dataset licence.

## 🧭 Exact gaps, not coloured diagnoses

Every one of the 50 economies has at least one retained signal. Each country's
`missing_binding_series` names five required measurements for the covered basket
and electricity scope: household bills versus income; connection refusals and
eligibility; travel/delivery distance; usable service and stockouts; and practical
capability/support. These are requested series specifications, not invented
publisher series IDs or claims that such datasets already exist.

The binding category is **unknown** for all 50. No national aggregate identifies
the binding cause for individual households. No threshold crossing is labelled
a storm, and no AI effect or future event is inferred. The root lane owns the
commissioned storm-versus-weather classifications and condition definitions.

## 🧪 Test record

Tests preceded the extraction module. The initial module-absent failure was
followed by actual fail-first regressions: retained ILO BOM caused malformed
quoting; cross-country reuse of an ILO source mapping was wrongly accepted; and
duplicate country/year rows could inflate the coverage helper. Each failed,
then passed with the narrow fix. The tests also reject mixed vintages,
pagination, malformed/native numeric strings and wrong series; preserve zero;
permit CPI deflation and values over 100; reproduce all three retained series
and all fifty country gap records. All eight focused tests pass on Node 22;
frontmatter and whitespace checks pass.

Measurement peer independently selected raw rows without using these extractors
and matched all 47 CPI, 49 electricity and 50 labour-share values. It also
checked country-specific ILO source joins and licence evidence, finding no
current measurement blocker. Its coverage-helper caveat is covered by the
duplicate-key regression and fix in `44d3be7`. This is an agent code/data check,
not publisher authentication or statistical approval. Full integrated validation
and external review remain coordinator steps.
