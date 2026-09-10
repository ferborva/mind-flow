---
id: round-09-nero-issuance
title: Second October NERO forecast issued before observation
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: ren
created: 2026-09-10
updated: 2026-09-10
---

# 🦅 Issued at 00:08:53 UTC, performance withheld

**The Central Coast forecast assigns 0.76 to October modelled General Clerks
employment being at least the frozen August count of 3,092.** The native cell
is 5311/102, General Clerks, Central Coast, NSW, date `2026-10-15`. The source-order
selection and algorithm were fixed before calculation. This shares the NERO
model cluster with the first Capital Region forecast; it is a different cell,
not independent evidence about calibration or worker access.

The actual local UTC issue time is `2026-09-10T00:08:53Z`. The source checkout
is `b773fd3`, and the containing issuance commit is `0e68b2f`. The prewritten
observation starts 1 October; publication and resolution cannot precede
1 November. Resolution closes `2026-12-07T00:00:00Z`, less than 90 days after
issue. The first forecast remained unresolved at this second issuance.

## 🔒 Retained addresses and clocks

| Artifact or event | Address or UTC time |
| --- | --- |
| Issued JSON SHA-256 | `b69cab97b86b7aa5b3c863201133de5a69053b5aa42ed95138b74af1b3a25969` |
| Preregistration bytes SHA-256 | `e130dd9cf7e4b80f04b82117e18382d80960bfa64bf7c54cae42492fb8313d2a` |
| Protocol content SHA-256 | `ca4385907d9ad9bd6f6571eaa7af363635eb74da2c35e93fbaee86f5ad891d4f` |
| Evaluation plan checksum | `c734176e99f19caf0247b3d411180a26d6740ded558d88dfd3f84728dbe48a4a` |
| Protocol seal | `2026-09-10T00:05:10Z` |
| Provider-created registration | `2026-09-10T00:06:00Z` |
| Issue opens | `2026-09-10T00:08:10Z` |
| Actual issue | `2026-09-10T00:08:53Z` |

The [provider receipt](https://github.com/ferborva/mind-flow/pull/21#issuecomment-5610531875)
is self-posted through collaborator account `ferbo-atl`. Its actual JSON was
read back and retained as base64; `created_at` comes from GitHub. The UTC issue
clock is local. Neither is an independently appointed registrar or adjudicator.
The sealed protocol omits the later receipt from its content seal by the
existing contract rule, while the final preregistration binds its exact bytes.

The registered one-record cohort includes the issue without exclusions.
`evaluation-at-issue.json` retains a null mean Brier score and
`lifecycle_incomplete`. The primary and reference baseline are both 0.76;
the naive comparator is 0.5. Their calculation/input manifests and exact
resolver dependencies are retained. The new admission edition itself is sealed
in that dependency set. The original first forecast and all its dependencies
remain byte-identical.

## 🔍 Resolution entry point

Run `round-09-nero/check-resolution.mjs` using the same named arguments as the
[first forecast intake procedure](../../../reviews/round-08-1-forecast-intake.md),
with this directory's original evaluation plan and a separate resolved record.
It checks archive/receipt chronology, full-stream CRC, the immutable issued
SHA, fixed labels, post-October row exclusion and the original plan checksum.
`current-evaluation.mjs` refuses a resolved record without current process-local
archive admission. Raw compatibility evaluators alone are not approved intake.

These additional current admission files were written after issuance, before
any outcome, to enforce the already sealed README procedure. They do not alter
the sealed resolver or any issued field. The same rule applies to future
corrections: append separate records, preserve originals, disclose delay and
uncertainty. A miss earns an explanatory write-up, not a void or a new target.
