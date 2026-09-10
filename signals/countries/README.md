# Proposed country sampling frame

**Start with the [50-economy measurement reader](measurement-view.md).** It
shows dated national context, exact source links and the five missing local
measurements for each economy. No current binding condition or storm is claimed.
The [signal catalogue](storm-signals.v1.md) distinguishes the three retained
core series from additional candidates and research-only coverage gaps.
The [Australian worked example](../../pilots/australia/basket/README.md) sits
beside this breadth at greater pathway depth. The frame below is still proposed.

This is Ren's commissioned proposal, not Fernando's chosen ranking. It uses
2025 nominal GDP from the April 2026 IMF World Economic Outlook (WEO), the full
database identified by the retained publisher page on 10 September 2026. July
2026 is a separately listed report update. The latest completed reference year
was proposed to avoid choosing the current-year projection. Historical values
can still be IMF estimates, and exceptional fiscal reporting years remain named
in the retained metadata. No observation is certified actual by this producer.

The sampling frame is 50 IMF **economies**, not a decision about sovereignty.
It retains Hong Kong and Taiwan separately under the publisher's names and
codes. The `iso3` field carries the IMF native three-letter country identifier;
the full source universe includes identifiers such as `WBG` that must not be
assumed to be ISO-standard mappings. Do not merge these observations into China
or replace absent observations when joining another publisher.

`country-set.v1.json` selects `Countries`, `INDICATOR.ID=NGDPD`, `FREQUENCY=Annual`,
`SCALE=Billions`, `UNIT=US dollar`, and column `BW` (2025). It sorts the retained
numeric values descending, with native code ascending for exact ties. Original
numeric text and exact cell addresses survive beside the parsed values. It does
not use the country-group sheet or substitute PPP, per-capita GDP or another year.
It names missing cells and retains ranks 50–52 for the inclusion boundary.

This frame admits no country or signal to a panel. GDP rank does not establish
essential access, a binding condition, or a storm. Signal coverage is a separate
gate. Which GDP concept, year, vintage and economy universe Fernando wants remains
an open programme question for `meta/backlog.md`.

## Reproduce

Use Node 22 and the system `unzip` command. Extraction checks the pinned archive
hash, reads only explicit OOXML members with bounded output, and does not execute
external workbook links, embedded add-ins or formulas. No workbook is rewritten.

```sh
node --test signals/countries/tests/country-set.test.mjs
node signals/countries/tools/country-set.mts --check
```

The `--write` mode only creates a missing output; it refuses overwrites. A future
vintage requires a separately retained capture and reviewed proposal revision,
not a refresh of this evidence. `record-weo-capture.mts` records already-acquired
source files once. It does not contact a publisher or overwrite a manifest.

Source: International Monetary Fund. 2026. *World Economic Outlook database,
April 2026*. Washington, DC: IMF. © IMF.
[Dataset](https://data.imf.org/Datasets/WEO).
The ranking is our filtered and sorted derivative, not an IMF endorsement.
See the retained [attribution and rights notes](sources/imf-weo/2026-04/ATTRIBUTION.md).

The current `source.licence_status` is derived from the pinned
[licence review](sources/imf-weo/2026-04/licence-review.json), including its
evidence limit and exact review hash. It is an agent assessment, not original
terms bytes or legal clearance. The acquisition-time status in `capture.json`
remains unchanged as historical evidence; it is not the current assessment.
