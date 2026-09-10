---
id: round-09.1-forecast-repairs
title: Round 09.1 forecast lifecycle and historical-adapter repairs
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# 🦅 The error is now machine-readable, not silently voided

**The defective Round 09 issue now has a separately versioned current-admission
plan and a typed, hash-bound error disclosure.** Both original and corrected
current wrappers read it. Historical issued/pending state, registered plan and
one-record denominator remain intact. The blocked record has an explicit next
action, independent authority and policy review, rather than only an indefinitely
opaque `lifecycle_incomplete` outcome.

This is Ren's commissioned mechanism repair, not Fernando's substantive view,
an appointment, an adjudication or a retrospective forecast correction.

## 🔬 Finding dispositions

| Review finding | Repair and evidence |
| --- | --- |
| P2: no typed lifecycle marker | [Current admission plan](../forecasts/prospective-pilot/round-09-nero/current-admission-plan.json) references exact registered plan, issue, protocol, resolver parameters and [error disclosure](../forecasts/prospective-pilot/round-09-nero/error-disclosure.json). The loader pins the plan's exact bytes and validates all referenced bytes before admission. |
| P2: hard-coded ID and no appointment path | [Current admission helper](../forecasts/prospective-pilot/round-09-nero/issue-error-intake.mjs) selects the affected ID from the validated marker. Its closed contract requires `required-not-established`, false appointment/identity flags, no adjudicator, no void, no exclusion and no score. The runbook names the unresolved authority and policy decision. |
| P3: only reconstructed contradiction tested | [New regression](../forecasts/prospective-pilot/tests/round-09-error-disclosure.test.mjs) passes retained `issued.json` and protocol/native parameter bytes directly to `assertNeroTargetConsistency`, expecting `NERO_NATIVE_TARGET_PROSE_CONFLICT`. |
| P3: historical adapter still says binding complete | [Active error notice](../forecasts/prospective-pilot/round-09-nero/error-notice.md) deprecates the sealed `round-09-validate.mjs` for current admission. New tests traverse current resolution entry points' literal local imports and forbid that adapter transitively. Historical replay still uses the original bytes and reports its original limited result. |
| P3: provider receipt spacing defect | [Corrected issuance note](../forecasts/prospective-pilot/round-09-nero-corrected/issuance-note.md) discloses `identify102` and `Laplace19/25`, without editing registration request, live comment or retained response bytes. |

## 🔒 What the new check proves

Run the following with Node 22 from the repository root:

```sh
node forecasts/prospective-pilot/round-09-nero/check-error-disclosure.mjs
```

It is read-only and takes no overrides. It returns the typed error state,
the registered cohort size of one, original issued/pending status, null scores,
and the required authority/policy review. Missing or changed plan/sidecar/source
bytes stop the current intake. Hashes prove local consistency with this reviewed
admission edition; they do not establish external authentication, appointment or
independent historical publication. Someone changing both code and its pins
still needs repository review; this is not tamper-proof external notarisation.

The retained issued and preregistered resolution rules must both demonstrate the
same SA4 101 value, while exact native parameters demonstrate SA4 102. A copied
marker cannot declare a source contradiction without those retained bytes.
The plan cannot change its effect to replacement scoring, point outside the
fixed retained paths, omit its disclosure or silently select a different issue.

## 🧪 Verification and red-to-green record

The first run of the new regression file produced **six failures and two
passes**. The missing overlay failed with `ENOENT`; the old ID-only rejection
had no typed lifecycle context; loader and operator-note assertions failed.
The retained contradiction and current import boundary were already correct.

After the repair, all eight initial tests passed. Two further tests cover
current-plan substitution and the read-only CLI's refusal of override arguments.
Hostile cases include altered/missing bytes, rehashed claims of appointment,
identity authentication, scoring, lifecycle changes or exclusion, changed
error/source claims, wrong forecast identity, backwards disclosure chronology,
unrecognised fields and removal/replacement of the pinned plan.

The complete forecast suite passed **134 tests** after the initial eight-test
repair, then **136 tests, zero failures or skips**, after the two boundary tests
were added. The read-only disclosure CLI and frontmatter validator also passed.
Sealed records, registered plans, campaign manifests, source bytes, all original
and corrected dependency files, and historical adapters are untouched by this
lane. No generated artifact or existing freeze receipt was rewritten.

## 🧭 Remaining authority and time gates

**A target contradiction is not a registered void reason.** An independently
appointed adjudicator would not, by appointment alone, gain authority to insert
a new retrospective void reason or exclude this issue. The next review must
address that policy gap explicitly. This repair does not claim to solve it or
manufacture an appointment. The public cohort continues to disclose the failed
preparation and retain its registered denominator.

The [scheduled-resolution runbook](round-09-scheduled-resolution.md) now checks
the marker before acquisition and at the final post-close checkpoint, retaining
it alongside both valid campaigns' reports. At the deadline the preparation error
and outstanding authority decision must remain explicit, not become a miss,
an ordinary missing source or a silent exclusion. The scheduler remains
**NOT ACTIVE**. Nothing here resolves October early or authorises publication.
