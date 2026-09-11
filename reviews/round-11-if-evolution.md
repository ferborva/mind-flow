---
id: round-11-if-evolution
title: Round 11 IF evolution, meaning before migration
type: technical-proposal
status: review
author: Ren (AI agent)
provenance: commissioned-proposal
created: 2026-09-11
---

# Meaning before migration

**The station can now show two real source-backed meaning corrections, identify actual structured dependents and reject stale references in an explicit adoption preview. Neither correction is applied or counted as a completed evolution event.**

This is Ren's engineering implementation and analysis under the approved Round 11 plan. It is not a new opinion attributed to Fernando, a new human approval or a publication decision.

## 🔬 What changes in the demonstration

Start with urgent GP care. The retained proxy reports people seeing a GP in less than four hours. Open the source footnote: the clock begins **when the appointment is made**, not when someone first tries to obtain care. Someone who never secured an appointment is outside this particular measure. A source-backed measurement can be real and still answer a narrower question than a reader assumes.

The new review adapter makes that boundary concrete:

> Old meaning → exact source footnote → proposed corrected identity → actual reader rejected → explicit preview adoption → original access question still unanswered.

The final step matters. A better label does not fill missing evidence.

| Correction | Retained source | Actual reference consequences |
| --- | --- | --- |
| Urgent appointment clock | `10A.43!C54` and `C55` | Nine structured references in the bounded inventory, including a basket binding and one old observation. No positive-signal context reader exists. |
| Prescription denominator and crude rate | `10A.33!C17`, `C20` and `C24` | Ten structured references, including a basket binding, one old observation and one positive-signal context reader. |

Counts include retained history, condition declarations and derived projection references. They are not distinct people, independent consumers or migrations completed. Exact JSON Pointers are retained in the [full review package](../pilots/australia/basket/round-11-construct-migrations.json).

The source workbook is the retained [10 September capture](../pilots/australia/sources/primary-care/2026-09-10/pc-primary-care-tables.xlsx), not a new acquisition. The adapter checks its byte hash and compares extracted footnote hashes with the [retained discovery record](../pilots/australia/data/round-09-evolution-discoveries.json). It does not claim independent measurement validation merely because those checks pass.

## 🧭 What the definitions now say

**Urgent GP:** a proposed NSW measurement identity for the published share reporting less than four hours from appointment-making to seeing a GP, among survey-scope people aged 15+ who obtained respondent-defined urgent GP care for their own health in the preceding twelve months. This does not measure first-attempt access, unmet urgent need or today's appointment availability.

**Prescription cost:** a proposed NSW measurement identity for the published crude share who delayed or did not obtain prescribed medication due to cost, among survey-scope people aged 15+ who received a GP prescription or needed prescribed medication. Aggregate medicine coverage is not atorvastatin-specific access. Very-remote collection changed between 2023-24 and 2024-25, so common-population comparability remains unestablished. Aggregate coverage and that very-remote exclusion were already known; they are not presented as newly discovered events.

The new identities carry no executable truth predicate. **We do not carry the old 100%/0% research thresholds across a change in meaning.** Nor do we reinterpret existing observation periods or republish their values under the proposed identities. Broader access questions remain named and unmeasured.

## ⚙️ What is implemented

- New `mind-flow.construct-migration.review/1.0.0` edition and read-only builder.
- Exact retained-proposal validation, including source pins, old definitions, new meanings, real reference inventory and all refusal boundaries.
- Edition-domain hashes. Recomputed local hashes cannot approve changed source interpretations or remove a reader.
- Explicit, hash-bound adoption previews for actual basket and positive-context readers.
- Refusal of old observations and sealed/derived readers through either assessment or preview entry point.
- Deterministic station summary that keeps proposed and applied separate.

The [API and contract](../contracts/construct-migration/README.md) explain all status meanings. Old executable-IF files, source captures, forecasts, historical events and existing readers are unchanged.

## 🚧 Where we deliberately stop

**This ships a reviewable migration boundary, not the completed operational migration.** The current edition does not provide an `apply` or retire/supersede API. It refuses any claim that the retained proposals are independently approved or applied.

The declared inventory is complete for structured identity/version/hash references in four pinned current research JSON artefacts. It is not complete for code, prose, archived versions, unbound series readers, copied web output or external consumers. These must be considered before a broader application claim.

Remaining work is specific:

1. Independently review the source interpretation and new identities.
2. Confirm the intended operational evidence and condition contracts, including which broader questions remain unresolved.
3. Expand the dependent-surface inventory as required by the intended migration scope.
4. Implement and independently review the operational registry/evaluator edition, without changing sealed dependencies.
5. Admit eligible observations individually, preserving period and comparability limits.
6. Record actual reader refusals/adoptions and regenerate necessary surfaces.

The programme remains at **one actual appended kernel event**, with **two correction proposals and zero newly applied corrections**. The three-event gate stays false. No event quota was used to justify fabricated history.

## ✅ Validation and challenge

Tests were written before the implementation. Initial execution failed because the new module did not exist. Once implemented, the retained-output test failed until the new review files were supplied. A follow-up negative test exposed that the assessment entry point could accept a new identity for an old observation even though the preview entry point refused it. Both paths now enforce the separate-admission refusal.

The 22 focused tests cover source-bound replay, omitted and fabricated readers, reused identities, changed clock, invented truth threshold, evidence transfer, forged applied/review/authority status, unknown readers, wrong identity/version/hash, stale acknowledgement, sealed-reader refusal, pointer escaping, no source mutation and deterministic output.

These are implementation and reproducibility checks. They are not independent source interpretation, live deployment tests, human comprehension results or authentication of a reviewer. The fixed proposed meanings remain open to correction in review.

## ➡️ Next useful review

Try to break the story before expanding it: does each new meaning answer exactly what the source can support, does the actual affected reader list omit a surface intended for migration, and could a reader mistake a preview for operational adoption? Review those three boundaries against the [source-bound package](../pilots/australia/basket/round-11-construct-migrations.json) and [station summary](../pilots/australia/basket/round-11-construct-migrations.summary.json).
