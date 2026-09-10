---
id: construct-correction-policy
title: Construct corrections require new identities
type: technical-proposal
status: review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# Construct corrections require new identities

## Decision for the research programme

**Construct corrections require new condition identities.** Round 09.1 chooses
this policy, rather than broadening `definition-revised` or treating a new
population label as a literal subset. This is Ren's engineering decision within
the commissioned repair, not a new opinion attributed to Fernando. It governs
new research work; it does not alter an issued forecast or sealed evaluator.

A changed waiting-clock origin, denominator, estimand or semantic anchor cannot
inherit the old identity's truth or observations. A threshold, window or evidence
policy adjustment may remain a version of the same meaning under the existing
validator. Split and merge still mean exact scope partitions and unions, not
generic ways to retire an inaccurate construct.

| Discovery | Required identity treatment | Existing consumer consequence |
| --- | --- | --- |
| Urgent GP clock starts when the appointment is made | New exact appointment-clock condition and signal identities; preserve first-attempt access as unmeasured | `condition.au.gp.timely` has no positive-signal measurement consumer, but basket records bind its definition and hash. Inventory these readers; do not invent a new consumer to claim invalidation |
| Prescription rate covers people who received a GP prescription or needed prescribed medication | New exact population/estimand identities; retain original proxy and source caveats | Inventory references to the old prescription condition before proposing a migration; no automatic transfer of evidence |

## Migration admission requirements

**No automatic observation or consumer rebinding.** Before a correction can be
counted as a completed programme evolution event, a separately reviewed migration
must retain the old definition and source, identify the new definition, record
the relationship and the reason equivalence fails, inventory existing readers,
and show each affected reader rejecting stale meaning before explicit adoption.
Historical observations need their own new-identity admissibility check with
their actual periods preserved. A change with no existing consumer must be
reported as such, not as an invalidation/rebind success.

The current kernel has no general retire/supersede operation. Adding one needs a
new registry/schema/evaluator edition with conformance tests and explicit
consumer migration, not an in-place edit to sealed dependencies. Until that
mechanism is implemented, adding an unrelated parallel condition is not a
completed correction. The source-backed discoveries remain uncounted.

**This is team-owned unfinished engineering, not an external blocker.** The
policy choice is now settled for this repair. The migration implementation is
not. The programme still has one real appended event of the required three.
The existing [negative tests](../../pilots/australia/tests/round-09-evolution-discoveries.test.mjs)
reject both relabelling attempts even with recomputed local hashes and verify
the absence of a timely-GP positive-signal consumer, alongside its existing basket
definition reference. They do not claim a completed migration.

## Next acceptance boundary

Implement the versioned relationship and reader inventory first. Review the
specific corrected definitions and source scopes second. Only then append a
real dated correction and demonstrate its actual consumer consequences. Keep
the original question visible when the source can answer only a narrower one.
