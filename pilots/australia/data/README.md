# Frozen public baselines

This directory contains small, reviewable extracts built from official source
archives. It does not contain unit-record microdata or unrestricted copies of
large source files.

## NERO clerical baseline, August 2026

`nero-clerical-2026-08.json` contains 440 separate modelled employment series:
five scoped ANZSCO 4-digit occupations by 88 ASGS 2021 SA4 regions. Each series
retains its own identity, latest estimate, 12-month and 60-month comparison,
and the recent monthly observations plus any older comparison anchor needed to
recompute the 60-month value.

**Do not sum or combine occupation or region estimates.** Jobs and Skills
Australia warns that doing so can be inaccurate or misleading. NERO is
modelled and smoothed. It can miss rapid changes and is more useful for the
direction and scale of a single series than its precise count.

This baseline does not measure AI adoption, work redesign, individual worker
flows, household continuity or agency. It cannot attribute a change to AI.

### Reproduce

Download the official August 2026 archive linked in the data record, then run:

```bash
node dashboard/tools/build-nero-baseline.mjs \
  --source /path/to/2026-08_nero.zip \
  --output pilots/australia/data/nero-clerical-2026-08.json \
  --release-period 2026-08 \
  --released-at 2026-09-02 \
  --retrieved-at 2026-09-08T01:01:48Z \
  --archive-url https://www.jobsandskills.gov.au/sites/default/files/2026-09/2026-08_nero.zip \
  --recent-months 25
```

The output stores a local archive SHA-256 checksum. It detects changes to the
locally captured archive but does not authenticate publisher origin. The public
record remains `research_draft_unverified` and `not_retained_unverified`. A new
source release creates a new dated file rather than overwriting this vintage.

The archive was [temporarily re-acquired on 8 September 2026](../reproductions/nero-reacquisition-2026-09-08.json).
Its byte length and SHA-256 digest matched the earlier local capture exactly.
The frozen build recipe also reproduced every derived field across all 440
series. Its output differed only in the temporary archive filename,
release-availability explanation and JSON key order. The archive was not
committed or retained, no publisher signature or independent witness was
available, and its exact release time remains unknown. This supports capture
continuity and deterministic extraction only. It does not upgrade the evidence
for condition truth, causal inference, prospective chronology or decision use.

`source.released_at` is the publisher's descriptive calendar date. It is not a
UTC availability timestamp and cannot prove that a detector ran before the
release. Before this file can enter a prospective rehearsal, attach either a
verified publisher timestamp or a conservative first-seen interval under
`source.release_availability`. The August record currently has a first-seen
upper bound but no lower bound, so its prospective chronology remains unknown.
The exact next observation is a timestamped archive or publisher record that
proves when the release was unavailable, followed by when it became available.

The dashboard baseline builder requires release availability, validates its
chronology, pins source/display metadata, and recomputes latest, 12-month and
60-month values from included observations. The evidence room and its selected
JSON export label all values `UNVERIFIED SOURCE BYTES`.

### Reproduce the warning audit

After extracting the checksum-matched source CSV from the archive, run:

```bash
node pilots/australia/tools/decline-audit.mjs \
  /path/to/2026-08_nero/2026-08_shiny_df.csv
```

This code derives eligible denominators from source rows. For a three-month
decline rule, the first three observations in each series are boundary context,
not eligible trigger dates. The frozen audit records 21,485 of 56,760 eligible
whole-archive comparisons, 12,321 of 33,000 in the negative-control era and
7,630 of 19,800 in the later era.

### Validate

```bash
node --test dashboard/tests/nero-baseline.test.mjs
```

The schema is `../schema/nero-baseline.schema.json`.
