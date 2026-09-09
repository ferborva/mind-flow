---
id: round-08-plan
title: Round 08, from instrument to measurement
type: programme-proposal
status: in-progress
provenance: commissioned-proposal
created: 2026-09-09
updated: 2026-09-09
---

# Round 08, from instrument to measurement

The goal is agency. This round measures conditions that stand between people
and primary care, tests what those observations justify, and makes Fernando's
Goal / Signals / Actions method the programme's spine. Agency itself remains
unmeasured. This plan implements Fernando's Round 08 brief; it creates no
publication, recruitment, clinical, negotiation or intervention authority.

## Sequence and ownership

The integration branch is `ren/round-08`, starting at merge commit
`b17d4ac993bbb04467db4e0a53f27e64e8193e8a`. Six workstream branches target
that branch. Each change is committed with an agent author and receipt of its
checks. Creator receipts remain claims until independently reproduced.

| Lane | Work | Dependency and acceptance evidence |
| --- | --- | --- |
| A | Re-anchor programme; justify the signal panel; require the five condition categories; demote dated phases to scenarios | Capture audit; condition validation; explicit population and owner for every retained signal |
| B | Retain Australian primary-care sources; derive basket measurements; join geography to NERO; diagnose binding conditions; demonstrate three evidence-driven IF evolutions | Exact bytes, headers, hashes, reproducible extraction, denominator and geography checks |
| C | Repair forecast identity and score withholding; preregister and issue one prospective forecast; write resolution procedure | All day-one repairs precede issuance; input and outcome chronology independently checkable; score withheld |
| D | Derive at least three positive agency signals | Same evidence standard as adverse signals; no rebadging policy eligibility as observed access |
| E | Write piece one and revise public narrative in Fernando's register | Captures before seeds before drafts; research links and dates; sentence-level provenance; disclaimer audit |
| F | Repair remaining day-one validation and test isolation; use LFS for retained files over 5 MB; generate HTML in CI | Failing-first behavioural checks; Node 22 suite; reproducible builds and clean tree |

A and E share an editorial owner; B and D share a measurement owner; C has
an independent engineering owner; the coordinator owns F and integration.
Owners work in isolated checkouts. No shared scratch paths or branch switches.
Later review exchanges ownership so nobody reviews their own gate as passed.

## Working checkpoints

1. Verify the merged baseline and read both stance captures in full. Preserve
   the enterprise-choice GAP and the parked enough line.
2. Fix the day-one validation residuals. Regression checks exercise rejection
   and output withholding, with small repairs in the existing mechanisms.
3. Inventory source availability before promising precision. Record vintage,
   population, geography, unit, sampling uncertainty and what each measure can
   establish. Require measured category coverage for at least one basket item.
4. Derive measurements from retained bytes. Compare alternative denominators
   and counterexamples. If comparable evidence cannot identify a binding
   condition, leave that gate unmet and explain the missing observation.
5. Update the panel, condition evolution and programme against the measured
   evidence. Deleting a signal removes an unsupported panel claim; it does not
   establish that the underlying condition is satisfied.
6. Issue one forecast only after the repair dependency clears. Establish the
   prospective clock and a resolution window within 90 days. Preserve issuance.
7. Audit public prose and retain one linked boundary statement per document.
   Do not optimise a disclaimer count by deleting necessary evidence ceilings.
8. Have a different owner challenge each gate. Reproduce the full suite and
   CI steps on Node 22. Freeze the exact candidate and prepare the eight-track
   external review handoff. Unmet gates stay unmet.

Push substantive progress at least every six hours of work. Append a dated
checkpoint to `reviews/round-08-progress.md` at least every twelve hours and
when a material dependency or gate changes. These are working checkpoints,
not a promise to manufacture progress for a fixed duration.

## Measurement challenges

The review lenses are public finance, rural general practice, Medicare
statistics, disability access, and affordability under constrained household
income. Agent analysis through these lenses is not consultation with those
people. Challenge selection, denominators, ecological joins, survivor bias,
non-use, eligibility versus actual service delivery, and national means that
hide rural access. Agreement between agents is not evidence.

## Moratorium and carried deferrals

No HTML, CSS or frontend JavaScript work; no new contract family, schema or
governance record type; no extra review machinery; no binary or built HTML
commits; no prose-only snapshot revision. Existing mechanisms may receive
small measurement-driven repairs. Basket records use existing contracts.
Conflicts go in the backlog under Round 08 moratorium exceptions.

Keep open: hash domain separation in freeze schema 2.0 (review 2026-09-16);
repository weight until LFS actually works; and coherent receipt forgery,
because verification does not rerun commands. Independent CI reproduction is
the existing mitigation, not a claim that receipt authenticity is solved.
