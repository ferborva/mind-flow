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
| Captures | 5 |
| Seeds | 16 |
| Drafts | 2 |
| Posts | 0 |
| Books | 0 |
| Research notes | 7 |
| Dashboard snapshots | 1 |

Foundation documents: **4 of 4 in place.**

## Threads

Two now, and they do not touch. The pipeline is shared; the material is not.
This section exists so the state of the newer thread is visible next to the
older one rather than buried in a stage list.

| Thread | Captures | Seeds | Drafts | Posts | State |
|---|---|---|---|---|---|
| **abundance** | 3 | 9 | 2 | 0 | Active theme. Two long drafts in review, both blocked on decisions only he can make. Has an instrument, `dashboard/`. |
| **collaboration** | 1 | 7 | 0 | 0 | Below threshold, needs two more captures. Seven seeds, no draft opened yet, and the best story in it is missing. |

Ungrouped: `2026-08-31-founding-intent`, which is about the repo rather than
about anything.

<!-- NOTE ON STRUCTURE, 2026-09-09. He asked whether the layout is built for
     more than one thought path. Short answer: the pipeline is thread-agnostic
     and fine, the navigation is not, and the scheduled run had a starvation bug
     that this note and one rule in CLAUDE.md now cover.

     What is genuinely thread-agnostic: capture, seeds, drafts, posts, books,
     the frontmatter, the themes file and its three-capture rule, which already
     has a below-threshold shelf for exactly this case.

     What is not:
     1. Flat directories. Sixteen seeds in one folder with no way to tell which
        thread a file belongs to without opening it. Survivable now, not at
        forty. The fix when it comes is `seeds/<thread>/`, and it is cheap:
        cross-references between files are a handful of markdown mentions, not
        code. Holding until a directory passes twenty files or a third thread
        arrives, whichever is first.
     2. The scheduled run had no tiebreaker. "Advance one draft" with one thread
        is obvious; with two it silently means "advance abundance", because
        abundance is where all the drafts are. Fixed in CLAUDE.md.
     3. `dashboard/` sits at the top level as though it were a stage. It is not.
        It is one instrument belonging to one thread. Not worth moving today
        (build tooling, tests and a published URL all point at those paths), but
        it is named as the abundance thread's in CLAUDE.md now, and if a second
        instrument ever arrives the whole class wants a home.
     4. This index was organised by stage only, so "where is the collaboration
        thread up to" needed four lookups. Hence this table. -->

| Document | Source | Installed |
|---|---|---|
| `constitution.md` | "Writing style and agent soul", 2026-07-28 | 2026-08-31 |
| `communication-style.md` | same email | 2026-08-31 |
| `soul.md` | same email | 2026-08-31 |
| `writing-style-long-form.md` | "Long-content form writing style", 2026-09-01 | 2026-09-01 |

## Captures

- `2026-09-09-collaboration-kernel`, the strategy kernel as a collaboration
  framework. **processed**, 7 seeds. Thread: collaboration. Voice, heavily
  transcribed, verbatim kept at `capture/raw/`.
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
| `the-kernel-is-a-collaboration-protocol` | ripe | collaboration |
| `everyone-is-time-poor` | ripe | collaboration |
| `heard-not-obeyed` | ripe | collaboration |
| `the-frame-is-the-job` | ripe | collaboration |
| `borrow-the-guiding-policy` | ripe | collaboration |
| `principle-versus-execution` | growing | collaboration |
| `the-synthesist-not-the-secretary` | growing | collaboration |

## Drafts

No draft open on the collaboration thread yet. Five of its seven seeds are ripe
and a short piece could be written from `everyone-is-time-poor` and
`heard-not-obeyed` together without inventing anything, but it would be thin in
exactly the way his own guideline warns about: the framework travels on its
examples, and the best example in the material is a story he has not yet told.
See the first item in the 2026-09-09 backlog section.

- `from-if-to-when`, long, **review**, ~4,500 words. The transition design he
  commissioned. **Different provenance class:** a commissioned proposal, not his
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
| `2026-09-07-abundance-figures` | Fact-check of the rant. Company profits, Musk quotes, displacement vs exposure, global income distribution |
| `2026-09-07-decent-life-thresholds` | Decent Living Standards thresholds, what a decent life costs, capital needed for a life and the next generation |
| `2026-09-07-labour-supply-and-cost-disease` | Reservation wage, backward-bending labour supply, Baumol's cost disease, and why his two new ideas pull against each other |
| `2026-09-07-transition-precedents-and-adkar` | ADKAR's five stages, Engels' Pause (1780-1840, output +46% vs wages +12%), and what ended it |
| `2026-09-07-red-team-the-observatory` | The dashboard taken apart. The shipped defect, plus Diamandis on CPI's blindness to demonetisation and Wissner-Gross on lagging indicators |
| `2026-09-07-red-team-moonshot` | Five counter-arguments from the Moonshot regulars' own published frameworks, and which parts of the piece survive |
| `2026-09-07-transition-control-system` | Red team of the transition design: access margin, readiness gates, communications, crisis triggers and preparation by actor |

## Dashboard

The abundance thread's instrument. It belongs to that thread, not to the repo.

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
