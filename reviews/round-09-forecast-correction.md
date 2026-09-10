---
id: round-09-forecast-correction
title: Preserve the defective issue and register a corrected prospective target
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: ren
created: 2026-09-10
updated: 2026-09-10
---

# 🛑 The P1 finding was correct

**Current result: the uniquely identified corrected forecast is issued and
passes peer target/byte/clock and operational-wrapper checks.** Its actual issue
time is `2026-09-10T00:44:16Z`. The defective predecessor stays preserved and
blocked. The first forecast still cannot resolve before October data exists.

**The original second issue was internally contradictory.** Its resolution
rule said `sa4_code 101`; its title, typed scope, baseline and native resolver
used 102, Central Coast. Ren's mechanical copy changed quoted `"101"` and other
forms but missed this space-separated literal. Reconstruction tests and target
parity compared the same erroneous strings. Passing them did not establish a
coherent native target. Measurement cross-review found the error before October.

The [error notice](../forecasts/prospective-pilot/round-09-nero/error-notice.md)
preserves the defective issue, protocol, original baseline policies and all
sealed dependencies. Its ID remains registered and its stored status remains
issued. Current admission rejects this ID, whether issued or terminal. No
formal void, appointment, adjudication or denominator exclusion is claimed.
The first Capital Region issue is unaffected and still awaits October data.

## 🔬 Failing regression and separate current admission

The new regression applied the old adapter to the actual defective issue's
preparation. It failed with `true !== false`: the adapter accepted the SA4
101/102 contradiction. The corrected adapter returns a named
`NERO_NATIVE_TARGET_PROSE_CONFLICT` for the same retained input. Additional
tests reject matching-but-wrong prose about occupation, geography, date or
threshold, and separately reject wrong native or baseline parameters.

`target-policy.mjs` renders prose from the fixed source tuple and checks the
prose against typed scope, fixed native parameters and both baseline records.
Tests also exercise the unchanged native resolver directly. These are complementary
checks, not a claim that self-consistent code proves the external tuple correct.

The new path is `forecasts/prospective-pilot/round-09-nero-corrected/`. The forecast,
protocol, campaign, target, manifest and evaluation plan have distinct correction
identities. Signal and condition identity remain unchanged because their 102
scope was already correct. The old basis, kernel, registry and native resolver
are reused byte-for-byte. A fresh source acquisition ended
`2026-09-10T00:28:30.179Z`; the page still linked August and expected October's
release on 4 November. The source inspection event is `00:28:43Z`.

## 🔒 Reviewed dependency boundary

The corrected resolver-parameter seal contains exactly these nine paths:

| Reused or new | Sealed path |
| --- | --- |
| Reused basis | `forecasts/prospective-pilot/round-09-nero/basis.mts` |
| Reused native resolver | `forecasts/prospective-pilot/round-09-nero/resolver.mts` |
| Reused ZIP parser | `dashboard/tools/build-nero-baseline.mjs` |
| Corrected conformance | `forecasts/prospective-pilot/tests/round-09-nero-corrected.test.mjs` |
| Target policy | `forecasts/prospective-pilot/round-09-nero-corrected/target-policy.mjs` |
| Candidate preparation | `forecasts/prospective-pilot/round-09-nero-corrected/candidate.mts` |
| Live-clock guard | `forecasts/prospective-pilot/operational-clock.mjs` |
| Clock conformance | `forecasts/prospective-pilot/tests/operational-clock.test.mjs` |
| Admission edition | `forecasts/prospective-pilot/issuance-binding/round-09-corrected-validate.mjs` |

Missing or changed bytes in any of these nine paths block admission. Existing
schemas, generic baseline/scoring implementation and contract hashes retain
their existing bindings. This explicit boundary is not a claim of complete
transitive runtime closure. Operational CLI wrappers are separately reviewed
current intake, like the earlier Round 08.1 wrapper.

Production CLIs now reject future claimed evaluation, publication, retrieval
and first-presence times against actual local UTC before reading an outcome
archive. Pure helpers remain replayable for synthetic tests. A CLI test supplies
future clocks and absent terminal/archive paths and confirms the clock rejection
occurs first. The local clock is not an independently authenticated time source.

## 🤝 Peer recheck before a new registration

Measurement peer rechecked source revision `9ed981f` before the new seal. It
directly compared 5311/102, Central Coast, 2026-10-15 and 3,092 across the prose,
native and baseline fields, inspected the nine dependency paths, and ran 13
focused tests successfully. It found no remaining target/dependency preparation
blocker and explicitly withheld institutional or statistical approval. The
source tuple also matched its preceding retained-source and arithmetic audit.

The new protocol seal was made at `2026-09-10T00:40:25Z`, commit `c41865c`.
Protocol content SHA is
`5711a4b61439a3cb704ad9ca4a6707d0064737e6852e022333f37748bdee8b6e`.
The genuine [new provider receipt](https://github.com/ferborva/mind-flow/pull/21#issuecomment-5610877949)
was created at `2026-09-10T00:41:18Z`, before issue opens `00:43:25Z`. Its exact
POST response is retained, SHA
`9a9f6f79f9c05bbeccfdef2bd512cc3728ec7939fbc8d37127dc88934fcb7b2d`.
This is a fresh self-posted provider receipt, not the prior issue's timestamp
or an independent registrar.

## ✅ Corrected issuance and post-issue peer check

The corrected issue was created at actual local UTC `2026-09-10T00:44:16Z`,
commit `d50a3e9`, after issue opens and before October observation. Its issued
SHA is `b4fa0511720b4964790e40417da5ccb12bce78e978cafa83530895abbce12ee1`;
preregistration SHA is
`4fe88976fda8ea5a8973071b06f3c3a7fbdd799c0e7c3cf259a38f0824256c27`.
The registered evaluation-plan checksum is
`f2ed018d0c029cf5638958832a4caf30df1e44724b40f1e113ba25fe01344b2e`.

Measurement peer independently rehashed the new issue and preregistration,
decoded the retained response and queried the live provider comment. It
confirmed both content and `created_at=updated_at=00:41:18Z`, the complete
seal/receipt/open/issue/observation ordering, and unchanged reviewed preparation
bytes. It also confirmed all four prior issue/preregistration files were intact.

At `9f34b6e`, peer review found no operational blocker in the corrected intake,
evaluation wrapper or CLI. Five intake/CLI tests passed. The wrapper verifies
the pinned issue, protocol, parameter bytes, nine declared dependencies and
native/prose tuple; full-stream archive rules and process-local admission remain
mandatory. The known defective prior ID remains rejected. Synthetic replay is
still separate from the CLI's actual-clock gate. These checks create no
independent adjudication or source-authentication claim.

The complete lane forecast suite at `9f34b6e` passed all 125 tests on Node 22.
Frontmatter validation and `git diff --check` also passed for the final notes.

The [corrected issuance note](../forecasts/prospective-pilot/round-09-nero-corrected/issuance-note.md)
records the operational procedure and limits. The second prospective-record
gate is restored on the corrected record, without rewriting the preparation
error out of programme history. Full integrated reproduction, shared artifact
lock review and the Round 09 freeze remain the coordinator's next steps.
