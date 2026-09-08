# Frozen public baselines

This directory contains small, reviewable extracts built from official source
archives. It does not contain unit-record microdata or unrestricted copies of
large source files.

## NERO clerical baseline, August 2026

`nero-clerical-2026-08.json` contains 440 separate modelled employment series:
five scoped ANZSCO 4-digit occupations by 88 ASGS 2021 SA4 regions. Each series
retains its own identity, latest estimate, 12-month and 60-month comparison,
and 25 recent monthly observations.

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

The output stores the archive SHA-256 checksum. A new source release creates a
new dated file rather than overwriting this vintage.

### Validate

```bash
node --test dashboard/tests/nero-baseline.test.mjs
```

The schema is `../schema/nero-baseline.schema.json`.
