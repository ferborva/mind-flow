---
id: round-09-nero-corrected-issuance
title: Corrected Central Coast forecast issued with a fresh prospective receipt
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# 🦅 Corrected prospective record issued; the defective issue remains visible

**The corrected Central Coast forecast is issued and passes peer byte, clock,
native-target and operational-wrapper checks.** It assigns 0.76 to the first
retained October 2026 NERO count for General Clerks, Central Coast, NSW,
5311/102, date 2026-10-15, being at least 3,092. Both registered prose and native
parameters now name 102. The first Capital Region forecast remains unresolved.

The distinct ID is `forecast.nero.5311.102.october-2026.correction-1.v1`.
The [defective earlier issue](../round-09-nero/error-notice.md) retains its
original bytes, registered cohort and stored issued status. Its current intake
is blocked. This correction is not a formal void, adjudication or denominator
exclusion. Both records must be disclosed together; the new campaign must not
be presented as a programme with no preparation error.

## 🔒 Addresses and prospective clocks

| Artifact or event | Exact address or UTC time |
| --- | --- |
| Corrected issue SHA-256 | `b4fa0511720b4964790e40417da5ccb12bce78e978cafa83530895abbce12ee1` |
| Corrected preregistration SHA-256 | `4fe88976fda8ea5a8973071b06f3c3a7fbdd799c0e7c3cf259a38f0824256c27` |
| Protocol content SHA-256 | `5711a4b61439a3cb704ad9ca4a6707d0064737e6852e022333f37748bdee8b6e` |
| Provider response SHA-256 | `9a9f6f79f9c05bbeccfdef2bd512cc3728ec7939fbc8d37127dc88934fcb7b2d` |
| Registered evaluation plan checksum | `f2ed018d0c029cf5638958832a4caf30df1e44724b40f1e113ba25fe01344b2e` |
| Protocol seal | `2026-09-10T00:40:25Z` |
| Provider-created registration | `2026-09-10T00:41:18Z` |
| Issue opens | `2026-09-10T00:43:25Z` |
| Actual local issue | `2026-09-10T00:44:16Z` |
| Observation starts | `2026-10-01T00:00:00Z` |
| Publication/resolve lower bound | `2026-11-01T00:00:00Z` |
| Resolution closes | `2026-12-07T00:00:00Z` |

The source checkout is `9ed981f`; the containing issuance commit is `d50a3e9`.
The [new provider comment](https://github.com/ferborva/mind-flow/pull/21#issuecomment-5610877949)
is a self-posted registration, not an independent registrar. Measurement peer
decoded the retained POST response, queried that live comment independently
and confirmed its creation/update times, content seal and target. It also
rehashed issue/preregistration bytes and confirmed prior issued records remained
unchanged. This is agent review, not institutional or statistical approval.

The retained registration request and live provider comment contain spacing
corruption, including `identify102` and `Laplace19/25`. This note discloses the
readability defect; neither receipt nor provider-response bytes are edited.
Read those fragments as "identify 102" and "Laplace 19/25". The native target
and arithmetic are verified from sealed structured records and retained source
bytes, not repaired prose substituted for the provider's actual response.

## 🔍 Current resolution entry point and evidence ceiling

Use this directory's `check-resolution.mjs` with the original registered plan,
a separate resolved record, complete first October archive, exact first-presence
receipt, appended chronology and separately retained tip. The named arguments
match the [existing intake procedure](../../../reviews/round-08-1-forecast-intake.md).
The CLI rejects future evaluation/publication/retrieval/presence clocks against
actual local UTC. Pure replay helpers remain available for synthetic tests.

Current intake pins the corrected issued SHA, its protocol and native/baseline
parameter bytes. It checks all nine declared dependency digests and the fixed
native/prose tuple before accepting a record. Full archive consumption, CRC,
exact 5311/102 labels, one target cell and no post-October rows remain required.
Process-local admission must precede current cohort evaluation. The known
defective prior ID remains rejected, including in the corrected wrapper.

The [nine-path boundary](../../../reviews/round-09-forecast-correction.md)
includes candidate, target policy, admission implementation and conformance
bytes, plus reused basis/resolver/parser and the live-clock guard/test. It does
not establish complete transitive runtime closure. Source identity and global
first publication remain unverified; local time is not authenticated external
time. The operational wrapper was appended before any outcome and does not
change the sealed target or resolver.

The one-record corrected cohort was registered at issue, before observation,
with no exclusions. `evaluation-at-issue.json` retains a null mean Brier score
and `lifecycle_incomplete`. Primary/reference probability is 0.76; naive is
0.5. This shares the NERO model cluster with the first forecast. No calibration,
independence, worker-access or causal claim follows from these records.
