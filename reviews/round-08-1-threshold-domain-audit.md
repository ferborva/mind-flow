---
id: round-08-1-threshold-domain-audit
title: Source-aware threshold review and current discretion schema profile
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# Audit provenance and plausibility without rewriting the evaluator

This addresses the threshold/domain P2 and schema-only discretion P3 in the
[Track 2 review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404573).
The sealed validator, original schema, evaluator semantics and FIXED_EVALUATOR
identity are unchanged. No historical kernel, observation, forecast, cohort plan
or derived report has been rewritten. No new schema family is introduced.

| Finding | Disposition |
| --- | --- |
| A count domain can include negative values by declaration | Accepted. The separate current audit flags `DOMAIN_CONTRADICTS_INTRINSIC_UNIT`. A cardinal count has intrinsic domain `[0, infinity)`; declaration cannot make negative cardinalities feasible. `gte 0` is then intrinsically always true, even if an implausible negative lower bound hid that fact from the historical validator. |
| Unbounded nonnegative count with `lte 1e9` is called vacuous | The provenance/plausibility concern is accepted; the logical-vacuity description is rejected. Counts above one billion remain feasible in an unbounded domain. The predicate is not constant. If the retained observations span 0 to 10, the audit flags an out-of-envelope threshold for contextual review, not formal impossibility. |
| Non-intrinsic domains lack source metadata checks | Accepted. Current audit requires an exact artifact hash and JSON source-field pointer matching the signal, unit and declared domain. Missing provenance remains `unassessed`, not a green check. Conflicting source-domain fields are flagged. |
| Schema-only readers accept price plus discretion | Accepted. Original full semantics already reject it. A current in-memory admission profile adds the same availability-only restriction to the existing schema family, without changing original schema bytes or evaluator identity. The AU current review invokes that profile. |

## Source-aware audit boundary

`contracts/executable-if/source-aware-audit.mjs` reports three separate things:

- **Intrinsic-domain facts:** ratio `[0,1]`, percent `[0,100]`, and cardinal
  count `[0,infinity)`. No observed maximum becomes an intrinsic bound.
- **Declared-domain mathematical vacuity:** a predicate may be always true or
  false relative to its declared bounds. This remains conditional on provenance
  when the bounds are non-intrinsic or add restrictions to an intrinsic domain.
- **Historical evidence-envelope plausibility:** the threshold is compared with
  exact retained observations from the explicitly selected source scope. Being
  outside that envelope is a review flag, not proof that a research target is
  unreasonable, unattainable, or logically vacuous.

A domain provenance reference names the exact signal-definition hash, source
artifact SHA and JSON field. That field must contain the matching unit and
`value_range`. Observation references similarly resolve matching `{value, unit}`
fields from verified bytes. Wrong hashes, unresolved fields, unit/signal drift,
missing observations and missing domain metadata stay unassessed. A matching
hash establishes byte correspondence, not publisher authentication or the truth
of a metadata assertion. The audit never changes the input domain or kernel.

The only intrinsic interpretation of the exact unit `count` is cardinal count,
not a net change or a signed balance. Differently defined quantities need their
own source-bound domain, not an automatic inference from an English label.

## Used by the AU review path

`pilots/australia/tools/audit-primary-care.mts` exports
`auditPrimaryCareThresholds(kernel)` for the current AU consumer. The same
read-only command requires an explicit kernel path, so it cannot silently fall
back from a current kernel to an older construction revision:

```sh
node --experimental-strip-types pilots/australia/tools/audit-primary-care.mts \
  --kernel=pilots/australia/basket/primary-care.kernel.current.json
```

The adapter replays the existing retained primary-care measurement extraction,
which validates capture hashes and selectors, and checks it against the retained
measurement JSON. It then binds exact JSON pointers and its raw-byte SHA for
the relevant NSW or national historical points. Routine telehealth rule values
do not fill the urgent-exemption branch's missing observations. This is an audit
of historical context, not insertion of old measurements as current kernel
observations, nor a claim that they satisfy a prospective evaluation window.

The current AU records do not contain hash-bound publisher domain fields for
months, GP FTE intensity or patient-paid gap units. Those domains therefore stay
unassessed, even when nonnegativity has a sensible research rationale. A locally
written rationale must not be promoted to retained publisher metadata.

For reproducibility against the retained r3 construction, the command reports
formal kernel validity separately from **flagged** contextual review: nine
current predicates, four unassessed domain-provenance entries and eight
out-of-envelope flags. Normative zero-barrier and universal-coverage thresholds
can legitimately be outside observed values; the output does not silently lower
those goals to fit the sample. The later current kernel must be audited afresh.

Default CLI success means the read-only audit ran and emitted its disclosed
findings, not that the findings are clear. Add `--require-assessed` to require
`assessed_no_flags`; it exits nonzero on flagged or unassessed results. Invalid
formal/profile inputs also exit nonzero. Current consumer presentation must keep
`status`, provenance gaps and review flags visible rather than equating process
success with a validated domain or empirically plausible threshold.

## Schema-only compatibility boundary

`contracts/executable-if/current-schema-profile.mjs` clones the original schema
in memory and adds the availability-only discretion restriction. Its output
names the admission profile and the base schema's exact raw SHA; it does not
claim to replace FIXED_EVALUATOR or assign a new canonical contract version.
The AU audit runs both this profile and the unchanged full semantic validator.

Legacy schema-only consumers that keep compiling the original schema still have
the documented gap. They must adopt the profile or the full semantic validator.
Changing the original schema would invalidate already sealed identities, so a
global historical-schema rewrite is deliberately not performed. The current
admission path is repaired; historical compatibility bytes are preserved.

## Checks

Fail-first tests cover negative count domains, intrinsic count nonnegativity,
the non-vacuous billion-count threshold, source-domain mismatch, missing or
changed retained bytes, missing observations, and the schema-only discretion
gap. The AU adapter test verifies the audit is invoked and leaves old kernels
unchanged. The complete IF test set plus this AU check and the immutable NERO
issued-file check pass together: **70 tests**. The original NERO historical
evaluation report still reproduces exactly.
