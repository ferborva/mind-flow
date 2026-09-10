---
id: when-an-if-changes
title: When an IF changes, its readers must change with it
type: public-guide-proposal
status: review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# When an IF changes

## 🦅 TL;DR

**The Australian pilot has one actual appended definition change, not twelve.**
A workbook footnote exposed a missing population limit. Event 12 changed the
evidence required for the GP cost condition. The existing positive-signal record
then failed its definition-binding check until it explicitly adopted the new
version. The historical numbers did not change.

This page is Ren's explanation of a research instrument, not a service-access
diagnosis or permission to act.

## 🔎 What the footnote changed

Start with the question a rural NSW worker cares about: can I obtain the GP care
I need without cost stopping me? The retained survey measures a narrower thing:
cost-related delay or missed care in a past year, among a specified survey
population. It cannot answer that worker's question today.

The numeric CSV did not carry everything needed to interpret that population.
The original [RoGS workbook](https://assets.pc.gov.au/2026-01/rogs-2026-parte-section10-primary-and-community-health-data-tables_0.xlsx?VersionId=dhbsbDjTKGQMTdhUt6hXYhyRTwePk28I),
table 10A.26 cell C23, records the phase-out of very-remote survey collection in
2023-24 and its exclusion in 2024-25. Treating the resulting percentages as a
common-population trend would hide a real change in who was counted.

**Event 12 revised the research evidence policy, not the survey population.**
It requires two distinct retained numeric artifacts, intended to pair the CSV
with its footnoted workbook. Both come from the same publisher. Two file hashes
are not independent sources, and the rule itself cannot judge whether a second
file supplies the needed footnote. The broader scope of the original predicate
therefore remains unestablished.

## 🔗 What stopped working

The consumer here is the pilot's positive-signal record. It carries historical
measurements and names the exact condition definition it refers to. A definition
hash is a fingerprint of that meaning and its executable rules.

| Step | Condition and consumer | What the check says |
| --- | --- | --- |
| Before event 12 | GP cost version 1.2.0; consumer names 1.2.0 | Binding matches the retained pre-event kernel |
| Event 12 appended | Same condition identity, version 1.3.0; consumer still names 1.2.0 | Binding fails |
| Explicit rebind | Consumer names the exact 1.3.0 definition hash | Binding passes; observations and evidence ceilings are unchanged |

The old events remain in the same kernel. Events 1 to 11 are construction replay:
they describe building the instrument, not eleven observed changes in access.
Event 12 was recorded at `2026-09-09T22:33:29Z`. Its
[kernel](../../pilots/australia/basket/primary-care.kernel.current.json),
[ledger](../evolution/fixtures/australia-primary-care.current.json) and
[consumer](../../pilots/australia/data/positive-signals-current.json) retain the
complete hashes and the reason for the change.

**Passing the new binding does not mean care became obtainable.** The historical
observation was already stale at evaluation. After the revision there is no
eligible observation for the new definition. A separate test-only fresh-data
probe isolates how the two-artifact rule behaves; it is not an observed loss of
access. The [regression](../../pilots/australia/tests/current-evolution.test.mjs)
tests both distinctions.

Binding and byte parity are now separate checks. An unrelated wording edit can
leave all definition references valid while failing reproduction of the retained
record. A stale definition fails the binding check itself. Both gates must pass
when reproducing the current consumer.

## 🧭 Two discoveries that need a different operation

Round 09 found two more source limits in the same retained workbook:

- **Urgent care's clock starts at appointment-making**, not the first attempt to
  book. Table 10A.43 C54-C55 also makes urgency respondent-defined and covers
  people who obtained urgent care.
- **Prescription cost delay is an annual aggregate**, not completed atorvastatin
  fills. Table 10A.33 C17, C20 and C24 define crude rates, the GP-prescription or
  prescribed-medication population and changing very-remote coverage.

These discoveries change the measured construct or population. The existing
contract deliberately forbids disguising such a change as an ordinary definition
revision. Its narrowing operation only removes members from already enumerated
scope sets; replacing one broad text label with another is not that operation.

**Neither discovery has been counted as a new evolution event.** The
[discovery record](../../pilots/australia/data/round-09-evolution-discoveries.json)
retains the source cells, text hashes and exact migration blockers. The
[tests](../../pilots/australia/tests/round-09-evolution-discoveries.test.mjs)
show that attempts to sneak the changes into the current operation set are
rejected even when their local hashes have been recomputed.

## ✅ Where to go next

The next engineering proposal should define an explicit relationship between an
old proxy and its corrected construct, with a versioned migration that invalidates
affected readers. It must preserve the old record and the unmeasured broader
question. Adding a parallel condition without invalidating those readers, or
changing an arbitrary threshold to manufacture a new version, would not do that
job. The three-event gate remains unmet until two genuine changes can be carried
through that full chain.
