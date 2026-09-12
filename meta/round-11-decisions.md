---
id: round-11-decisions
title: Round 11, Fernando's answers on audience, ownership and scope
type: review-brief
status: pending
author: Ren
authority: none
created: 2026-09-12
updated: 2026-09-12
---

# Round 11: the answers you were waiting for

Round 11 stopped on decisions only Fernando could make. On 2026-09-12 he made
them. This brief maps his answers onto the twelve entries in
`experiments/decision-experience/readiness-summary.json`.

**Source of truth is the capture**, not this brief:
[`capture/2026-09-12-the-target-is-me-and-my-friends.md`](../capture/2026-09-12-the-target-is-me-and-my-friends.md),
`status: raw`, eight verbatim answers with what each does and does not settle.

## 🦅 TL;DR

**The station is a private instrument for Fernando and his friends. It is not
going to the world. What goes to the world is the writing.**

> This tool is first and foremost for us. Not for the world (yet at least) we
> are looking for personal value and ideas.

> To share will be the posts and the reframe

**So the study you were preparing is not the thing being run.** Showing a
private tool to friends for their reactions is not research with participants.
Most of the readiness package was scoped for a recruited sample that will not
exist.

**Re-scope it. Do not clear it.** Clearing implies those requirements were
satisfied. They were not. They stopped applying to this shape of work, and
"yet at least" means a later decision to go public needs something to walk back
through.

## 📋 His eight answers

| # | Question | His answer, verbatim |
|---|---|---|
| 1 | Who is it for? | "Me and my friends. We will be the de target." |
| 2 | Who is accountable? | Fernando, explicitly, as named lead |
| 3 | Feedback or measurement? | "We will give feedback and I will additional gauge the impact of the information on their overview of the path forward." |
| 4 | Are the friends the Moonshot crew? | "No" |
| 5 | Who holds the pause? | "My wife" |
| 6 | Has she accepted? | "My wife is on board." |
| 7 | Where does the gauge go? | "A share back here as a conversation" |
| 8 | What is the reframe? | "The reframe is a way to think that I'll share through the now consolidated post." |

## 🎯 Two audiences, not one

The programme documents currently treat these as one group. They are not.

| | Audience | What they get | Leaves the repo |
|---|---|---|---|
| The station | Fernando and his friends | Personal value and ideas | **No** |
| The reframe | The world, via the Moonshot crew | `drafts/name-the-if.md` | **Yes** |

The Moonshot crew framing from 2026-09-07 belongs to the writing. His friends
belong to the station. Please separate them wherever they are currently merged.

## 🚦 The twelve entries, re-scoped

| Entry | Disposition | Why |
|---|---|---|
| `accountable-human-lead` | **Answered** | Fernando, named and accepted. Route it through your own verifier; this brief is not the approval. |
| `independent-safety-monitor` | **Answered, with a caveat to carry** | His wife, accepted. Stated once in the capture and not argued: a spouse is separate from him but is not independent in the sense your design means. His call. Keep the caveat visible rather than marking the role cleanly satisfied. |
| `ethics-determination` | **Out of scope at this shape** | No recruited participants, no data collection, no intervention. Record why it no longer applies rather than marking it met. |
| `compensation-support` | **Out of scope** | Nobody is being recruited or compensated. |
| `affected-party-governance` | **Out of scope** | No affected parties beyond the people in the room, who are his friends. |
| `analysis-power-plan` | **Out of scope** | There is no endpoint, no effect size and no sample. His gauge is a judgement, not an estimate. |
| `missingness-multiplicity` | **Out of scope** | Same reason. No outcomes to attrit. |
| `allocation-and-coding` | **Out of scope** | No arms, no assignment, no coding scheme. |
| `preregistration-freeze` | **Out of scope** | Nothing confirmatory is being run. |
| `external-authority-verifier` | **Still open, and correctly so** | Your own design refuses to convert an agent-entered reference into approval. That protection should survive this brief unchanged. |
| `privacy-consent-withdrawal` | **Survives, shrunk** | He is going to form impressions of his friends and write them into this repository. That deserves a line about what he records and what stays out, even between friends. Not a consent form. |
| `accessibility-visible-parity` | **Survives, shrunk** | Whether the thing is readable and usable at all. It stops being a two-arm parity comparison and becomes: can a person open this and know what they are looking at. |

**Net: two survive in reduced form, two are answered, one stays open by design,
and seven stop applying.**

## 🧭 What this means for the next increment

- The matched two-arm comparison in `experiments/decision-experience/` was built
  to support an experiment nobody is running. **It is not wasted**, but it should
  stop being described as study preparation.
- **His gauge comes back as a conversation**, captured here in the ordinary way.
  There is no instrument to build, no form to design and no rubric to validate.
  Please do not build one.
- The station should get easier to sit in front of, and easier to explain to a
  friend, in preference to more variants of anything.
- Consider whether more software is the right next move at all. Round 11 added
  39,367 lines and no writing. That is defensible now that the split is named,
  but the thing he says goes to the world is a post, and the post is waiting on
  his read rather than on any code.

## ⚠️ What this brief does not do

- It does not approve anything, appoint anyone, or authorise data collection,
  recruitment, publication or release.
- It does not mark any blocker satisfied. Re-scoping is a change of
  applicability, and the record should say so in those words.
- It does not settle whether his wife understands what pause authority would
  mean in practice. That question is still open in the capture.
- It does not settle whether he wants his friends' view of the path forward
  captured before and after, or only after.

## 📍 Where the work is

The capture and the consolidated post are on branch
`claude/knowledge-repo-init-8ab982`, not on `main`. Main is unchanged, as your
PR requires.

That branch also carries the 2026-09-11 consolidation Fernando asked for:
`drafts/abundance-has-an-if.md` was merged into `drafts/name-the-if.md`, and the
CI that pinned draft prose by content hash and line-range disposition was
replaced with claim-level checks in
`communications/tests/draft-integrity.test.mjs`. It does not touch anything
Round 11 changed except one line of `meta/index.md`.
