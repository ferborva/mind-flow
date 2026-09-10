---
id: proximity-candidate-rai-round-09
title: Rural Access Index retained as research-only below the breadth gate
type: research-note
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# 🛣️ Retained, but not admitted to the country panel

**The official Rural Access Index file covers five of the proposed fifty
economies across all its years, and at most one in any common year.** It does
not meet the 40/50 breadth gate. No values enter `measurements.v1.json`, no
missing economy is modelled, and no nonofficial global raster substitutes for
the publisher file.

The [World Bank catalogue](https://datacatalog.worldbank.org/infrastructure-data/search/dataset/0038250/rural-access-index-rai)
links the retained official XLS as its current data resource, last updated
8 April 2024; catalogue metadata was updated 9 April. The native workbook
contains 31 observations for 29 countries, with reference years 2009 to 2022.
This is a single retained publisher file vintage, not simultaneous current
observations. The catalogue temporal text still says 2006 to 2019. That
discrepancy is retained explicitly, not silently repaired.

| Proposed economy | Reference year | RAI percent | Native RAI Data cell |
| --- | --- | --- | --- |
| South Africa, ZAF | 2020 | 57.5 | D20 |
| Peru, PER | 2016 | 37.2 | D26 |
| United Arab Emirates, ARE | 2019 | 95.1 | D30 |
| United Arab Emirates, ARE | 2021 | 99.5 | D31 |
| Saudi Arabia, SAU | 2022 | 91.77 | D32 |
| Bangladesh, BGD | 2015 | 86.7 | D33 |

The other 45 proposed economies are individually named by native country code
in `proximity-candidate.v1.json`. A best-common-year count of 1/50 must not be
relabelled 5/50 by mixing years. None is an adequate basis for a current binding
diagnosis. The source does not supply cell-level actual/modelled status flags;
the extraction makes no actual-only claim and retains each source note.

## 📦 Retention and licence

`sources/proximity-2026-09-10/` retains the entire official workbook, catalogue
HTML and UN SDG metadata PDF, with complete response headers and SHA receipts.
The original download filename is `rural-access-index-data.xls`; its exact
59,926 bytes are stored as `data.body`, SHA-256
`8c315ae3e0eb72ffa1710b91227d8ff48302f849b0c011e058b165773b152131`.
The neutral storage suffix is not a conversion. The internal workbook title
still refers to a 2007 filename, while its last-save date is 8 April 2024.
Native row dates, not the internal title, determine observation years.

Acquisition ran 2026-09-10T01:35:57.274Z to 01:36:02.773Z. Bodies are exact
complete responses after HTTP content decoding. Header files serialise actual
Fetch header values, not original wire headers. These are creator receipts,
not independent publisher authentication. The catalogue explicitly applies
Creative Commons Attribution 4.0 to the dataset. The UN metadata PDF is retained
as methodology evidence; its own redistribution licence is not inferred from
the World Bank dataset licence.

The proposed signal measures the rural population within 2 km of an all-season
road as a share of the rural population. Its numerical domain is [0,100]. It is
a road-distance proxy for proximity, not travel time, affordable transport,
reachability of an essential service destination, urban access or proof of
which condition binds. No annual refresh cadence is established: the retained
catalogue's `temporal_resolution.periodicity` is null.

## 🔁 Explicit native reevaluation, not a hidden repository dependency

An existing SheetJS reader handled legacy BIFF XLS. No new BIFF parser or
shared package change was introduced. The bundled runtime exposed an XLSX
reader but no legacy XLS reader. The first default npm-registry attempt failed
with E401; the public-registry retry below succeeded without saved credentials.

```sh
RAI_READER_DIR=$(mktemp -d /private/tmp/round09-rai-reader.XXXXXX)
npm install --prefix "$RAI_READER_DIR" --userconfig /dev/null \
  --registry https://registry.npmjs.org --ignore-scripts --no-audit --no-fund \
  xlsx@0.18.5
node signals/countries/proximity-candidate.mjs --reader-root="$RAI_READER_DIR" --check
```

Use Node 22. The extractor checks the installed package version and lockfile
integrity against the retained direct-package integrity:

```text
sha512-dmg3LCjBPHZnQp5/F/+nnTa+miPJxUXB6vtk42YjBBKayDNagxGEeIdWApkYPOf3Z3pm3k62Knjzp7lMeTEtFQ==
```

Package source is `https://registry.npmjs.org/xlsx/-/xlsx-0.18.5.tgz`, licence
Apache-2.0. This records a reproducibility dependency, not a security endorsement
or a complete transitive-runtime seal. No macros, formulas or external links
are executed. The extractor pins source bytes and rejects formula data cells,
wrong sheet/range/headers, duplicate native keys and out-of-domain percentages.
Exact-name mapping is limited to the five overlapping proposed economies;
other publisher names remain unmodified with an explicit native-name prefix.

Ordinary offline tests need no SheetJS installation and make no network calls:

```sh
node --test signals/tests/proximity-candidate.test.mjs
```

Those tests verify retained source/headers, extraction-receipt coverage and the
six specified native cell results. They are not a pristine native XLS replay.
The explicit native `--check` above was separately run successfully with the
pinned reader. Tests preceded the producer and first failed because it did not
yet exist; both tests now pass. Full repository integration remains a
coordinator step.

## 🧭 What would close the gap

Obtain a maintained official dataset covering at least 40 of these exact 50
economies in one comparable reference year, with a named publisher vintage,
road-condition definition, rural-population denominator and estimation flags.
Then retain its full source and reassess. Until then this candidate stays in
research only. Even broader RAI coverage would still leave the country-specific
journey-time, destination, cost and capability measurements needed to diagnose
access to essentials missing.
