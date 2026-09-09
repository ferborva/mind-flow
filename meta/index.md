---
title: Index
updated: 2026-09-09
---

# Index

The map of everything in the repository. Refreshed during housekeeping on
scheduled runs.

## State

| Stage | Count |
|---|---|
| Captures | 6 |
| Seeds | 16 |
| Drafts | 5 |
| Posts | 0 |
| Books | 0 |
| Research notes | 8 |
| Dashboard snapshots | 1 |

Foundation documents: **4 of 4 in place.**

| Document | Source | Installed |
|---|---|---|
| `constitution.md` | "Writing style and agent soul", 2026-07-28 | 2026-08-31 |
| `communication-style.md` | same email | 2026-08-31 |
| `soul.md` | same email | 2026-08-31 |
| `writing-style-long-form.md` | "Long-content form writing style", 2026-09-01 | 2026-09-01 |

## Captures

- `2026-09-08-the-benchmark-shrug`, why people shrug at a benchmark, and the
  condition categories becoming his. **processed**, 1 seed. Short, typed, and it
  carries a provenance event: the five categories are his from here.
- `2026-09-08-abundance-frame-conversation`, taking the if frame further and the
  two sides of the exchange. **processed**, 6 seeds. Full transcript of a spoken
  session, kept verbatim at `capture/raw/`. **Read its provenance warnings:**
  roughly half the good lines are the other Claude's, and long stretches are
  Claude speaking in character as named living people.
- `2026-09-07-endorsing-the-red-team`, endorsing the red team and commissioning a
  transition design. **processed**, 1 seed.
- `2026-09-07-deflation-metric-and-labour-paradox`, a metric for abundance and
  the labour paradox underneath it. **processed**, 2 seeds.
- `2026-09-01-abundance-is-conditional`, abundance is conditional and nobody is
  talking about the conditions. **processed**, 6 seeds. Verbatim transcript kept
  at `capture/raw/`.
- `2026-08-31-founding-intent`, what this repository is for. **raw**

## Seeds

| Seed | Status | Theme |
|---|---|---|
| `abundance-has-an-if` | ripe | abundance |
| `conditions-are-national` | ripe | abundance |
| `money-does-not-disappear` | ripe | abundance |
| `the-choice-belongs-to-enterprises` | ripe | abundance |
| `how-much-is-enough` | growing | abundance |
| `everything-is-limited` | growing | abundance |
| `the-zero-cost-count` | ripe | abundance |
| `the-free-labour-paradox` | ripe | abundance |
| `the-transmission-test` | ripe | abundance |
| `tell-me-your-conditions` | ripe | abundance |
| `run-the-frame-on-the-supplier` | ripe | abundance |
| `if-is-demand-when-is-supply` | ripe | abundance |
| `conditions-have-owners` | ripe | abundance |
| `agency-is-the-goal-conditions-are-the-signals` | ripe | abundance |
| `you-cannot-sequence-the-conditions` | growing | abundance |
| `nobody-has-that-sentence` | ripe | abundance |

## Drafts

- `name-the-if`, medium, **drafting**, ~1,700 words. The frame as an instrument:
  the shrug, the missing if, the reversal, five condition categories, the
  healthcare promise run across four countries, and the invitation. No remedy,
  no crisis layer, no supply side. **This is the one he sends.** One blocker
  left: the Diamandis anecdote needs a source. The four-country table is now
  sourced, and the research corrected a row I had written from memory.
- `every-if-is-somebodys-when`, medium, **drafting**, ~1,500 words. Round two.
  Consumer's if against provider's when, the CEO's condition list, and sorting
  conditions by who holds them. **Quietly replaces the broken ending of
  `abundance-has-an-if`.**
- `message-to-the-moonshot-mates`, short, **drafting**. Correspondence, not a
  piece, and it does not move to `posts/`. Three versions: YouTube comment,
  email, one-liner. Awaits the podcast-transcript pass before it gains specific
  callbacks.
- `from-if-to-when`, long, **review**, ~4,500 words. The transition design he
  commissioned. **New tension as of 2026-09-08:** he says the order conditions
  fall in cannot be planned, and this draft runs on five dated phases. See
  `seeds/you-cannot-sequence-the-conditions.md`. **Different provenance class:** a commissioned proposal, not his
  substance. Most of the structure is mine and needs his sign-off section by
  section. See the provenance warning at the top of the file.
- `abundance-has-an-if`, long, **review**. Draws on the first four seeds and
  touches the other two. Figures and Musk quotes now verified and folded in, and
  the distribution data added. One substantive call left for Fer: the remedy
  section needs new reasoning, because redistribution is short by a factor of
  twenty. See the draft's review notes.

## Research

| Note | What it covers |
|---|---|
| `2026-09-09-four-country-access-conditions` | What binds the "see a doctor" promise in Spain, Belgium, Australia and the US, plus the state of AI prescribing law. Corrects the Spain row of the draft's own table |
| `2026-09-07-abundance-figures` | Fact-check of the rant. Company profits, Musk quotes, displacement vs exposure, global income distribution |
| `2026-09-07-decent-life-thresholds` | Decent Living Standards thresholds, what a decent life costs, capital needed for a life and the next generation |
| `2026-09-07-labour-supply-and-cost-disease` | Reservation wage, backward-bending labour supply, Baumol's cost disease, and why his two new ideas pull against each other |
| `2026-09-07-transition-precedents-and-adkar` | ADKAR's five stages, Engels' Pause (1780-1840, output +46% vs wages +12%), and what ended it |
| `2026-09-07-red-team-the-observatory` | The dashboard taken apart. The shipped defect, plus Diamandis on CPI's blindness to demonetisation and Wissner-Gross on lagging indicators |
| `2026-09-07-red-team-moonshot` | Five counter-arguments from the Moonshot regulars' own published frameworks, and which parts of the piece survive |
| `2026-09-07-transition-control-system` | Red team of the transition design: access margin, readiness gates, communications, crisis triggers and preparation by actor |

## Dashboard

**Seldon Observatory** · https://claude.ai/code/artifact/4a869745-1f2f-46c8-a1cb-7d80ba9f0bdb

Snapshot `2026-09-07`, schema 1.1.0. Ten signals, six measured, two derived, two
deliberately empty because no registry publishes them. Audience: the Moonshot
crew, argument-first.

Headline: World 2004-2025, real output per capita **+44.3%** against real labour
income per capita **+40.8%**. A 3.5 index-point gap. **Not an Engels' Pause**,
which is a baseline rather than reassurance.

**Corrected 2026-09-07.** The v1.0.0 headline added inflation to a change in
labour share, different units, and was 94% inflation. It read FAILING in red on
no real evidence. Replaced and corrected on the page itself.

Refresh with `dashboard/tools/fetch_snapshot.py`, rebuild, republish to the same
URL. See `dashboard/README.md`.

## Posts

_(none yet)_

## Books

_(none yet)_
