# Second prospective NERO record: Central Coast

**The second target is General Clerks in Central Coast (5311/102), October
2026 modelled employment stock at least the frozen August count of 3,092.**
Selection takes the next SA4 in source order after the first forecast's 101,
before calculating this cell's probability. Both records belong to the same
NERO model cluster; geography does not establish statistical independence.

The retained input is the unchanged August 2026 projection at
`pilots/australia/data/nero-clerical-2026-08.r2.json`, backed by the full archive
SHA-256 `a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446`.
The reference and primary probability use the existing two-month direction
algorithm: all 23 overlapping comparisons in August 2024 through August 2026,
Laplace smoothing `(successes+1)/(23+2)`, six decimal half-even rounding.
The naive comparator is 0.5. Historical overlap and revisions prevent treating
these comparisons as independent trials. One outcome establishes no calibration.

## Prospective clocks

The [official landing page](https://www.jobsandskills.gov.au/data/nero), acquired
between `2026-09-09T23:59:10.810Z` and `2026-09-09T23:59:11.123Z`, still links the
August archive. It lists 4 November 2026 as October's expected release, with
October 2026 observation labels still in the future. Exact body bytes, header
values and local UTC request bounds are retained in [sources](sources/).
This reports absence on that page, not global first publication.

The target label is `2026-10-15`. Observation convention is 1 through 31 October
UTC. Publication and resolution cannot precede 1 November. Issue closes
30 September at 00:00 UTC; resolution closes 7 December at 00:00 UTC.
Protocol sealing, provider receipt and issue must occur in that order, before
observation. Retain the real provider response as evidence, never a fabricated
timestamp. GitHub records a self-posted registration, not an independent registrar.
Separate issuance notes record later state without rewriting this sealed policy.

## First release, one cell, one resolver

Retain a contemporaneous first-presence receipt, its appended source chronology
and separate tip context before any resolution calculation. Keep the complete
official `2026-10_nero.zip`, native filename, headers, full archive SHA and ZIP
inventory/CRC verification, with Git LFS above 5 MB. Disclose monitoring delay.
Reject a purported October publication before the frozen lower bound, and any
archive containing post-October rows, even for another occupation or geography.

Consume the complete verified CSV stream. Require exactly one nonnegative
integer cell with `anzsco4_code=5311`, `sa4_code=102`, `date=2026-10-15`, labels
General Clerks, Central Coast and NSW. Missing, duplicate, suppressed, changed
labels or malformed rows withhold resolution. Transform x to `x/(x+3092)` and
use the existing binary-threshold resolver, gte 0.5, equivalent to x>=3092.
Retain native count and derived payload together. No other cell or later vintage
may substitute. Reproduce archive and receipt intake in the scoring process.

Preserve the original issue bytes. Append resolved, void or corrected records
separately and compare them using the existing immutable projection. The
existing preregistered cohort includes the issued record without exclusions.
Scoring remains withheld until resolution close and retained outcome evidence.
If the outcome misses, publish why alongside the score. If no outcome exists by
the deadline, the record becomes overdue, not negative or silently discarded.

Void reasons remain source retirement, material measure change or unavailable
resolution evidence. Require contemporaneous reason and separately evidenced
adjudication; no adjudicator is appointed here. Current intake withholds cohort
performance for unverified appointment and any post-publication void. An
unfavourable result never justifies voiding. Publisher corrections retain both
vintages; erroneous resolution is withdrawn and rescored in a separate report.

## Attribution and scope

Nowcast of Employment by Region and Occupation, Jobs and Skills Australia,
Commonwealth of Australia. Used under Creative Commons BY 4.0 licence.
This is modelled occupied-role stock, not vacancies, access or agency. The
bounded transform and forecast are Ren's research, not Fernando's opinions.
The new adapter is an explicit copy of the reviewed Round 08 implementation
with the cell and local artifact paths changed; the first forecast's sealed
dependencies remain byte-identical.
