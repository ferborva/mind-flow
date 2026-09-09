---
id: condition-agency-map
title: Condition agency map
type: technical-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-09
updated: 2026-09-09
authority: none
---

# Condition agency map

> **Agent proposal. Synthetic example. No control, commitment or authority is
> verified.** Fernando supplied the goal, signal and IF/WHEN framing in the
> captured 2026-09-08 conversation. This executable interpretation remains
> Ren's proposal until Fernando and affected parties adopt or change it.

## 🦅 The idea

The project needs one public spine:

```text
human agency as the declared goal
→ load-bearing conditions
→ signals that could reveal each condition
→ metrics that operationalise those signals
→ IF evaluations that remain open to challenge
→ actor-specific actions, each a hypothesis
→ experienced outcomes and harms
→ condition revision, recovery or retirement
```

The goal is a value choice, not a number. Conditions say what must be examined.
Signals are observations or estimands that may inform them. Metrics are the
registered calculations. Keeping those layers separate prevents a convenient
metric from silently becoming the goal.

## 📚 Conceptual precedent

Google's 2010 HEART paper describes a Goals, Signals, Metrics process for
connecting product goals to measurable user-experience evidence. Our chain is
a proposed extension: it inserts explicit conditions between the goal and its
signals, then places actor-specific action hypotheses after the metrics. That
precedent supports the separation of goals from measurements. It does not validate
this societal transition model, its five starting prompts or its effectiveness.

Source: [Google Research, *Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications*](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/)

## 🧩 Consumer IF, provider WHEN

The consumer-facing question is:

> Who may do what, to what standard, where and during which period, **if** which
> conditions hold?

The provider-facing question is:

> Which actor proposes it **could** offer what, to what standard and scope,
> **when** each condition has a completion criterion and a legitimate mode of
> work?

`WHEN` is a work-list lens. It is not a date, forecast, guarantee, commitment or
permission to act. Conditions do not fall in one universal sequence. Work may
be concurrent, dependency-bound, cyclical or blocked by an actor who has not
agreed.

The two sides are not symmetrical. A consumer facing price, distance, paperwork
or exclusion often cannot move it alone. A provider may influence more of the
list, but cannot claim control over technology, law, infrastructure,
counterparties, ecology or affected people's choices.

## 🧭 “Who holds it?” is four questions

One owner field hides power. This contract decomposes holdership into relations:

- who controls or influences the condition;
- who has a duty, funds or delivers;
- who depends on, negotiates over, verifies or observes it; and
- who bears its consequences.

A technical limit is a condition locus, not an actor. A law may have an
authorised decision-maker, affected rights-holders, delivery institutions and
funders. None of those roles automatically implies the others. Every relation
in the current fixture is caller-asserted and externally unverified.

The proposed planning modes are `act`, `prepare`, `watch`, `negotiate`,
`coordinate`, `escalate-for-authority`, `cannot-move` and `investigate`. The
validator checks that a mode fits the actor's declared relation. It does not
verify the relation, identity or mandate.

## 🗂 Five prompts, not five boxes

Fernando's current public starting set is:

- **price:** can the person or provider carry the complete cost?
- **permission:** is it allowed for this actor, person, place and use?
- **proximity:** can it physically or digitally reach the person?
- **availability:** does suitable supply and capacity actually exist?
- **capability:** can the person meaningfully use, choose or refuse it?

This is a **starting set, not a taxonomy**. A condition may use several prompts,
or `other`. The prompts do not decide logical role, truth, importance or who can
move the condition. Availability should split when “supply exists” and “a
provider keeps choosing to supply” have different owners or failure modes.

## 🎯 Actions sit below signals

Every action record is an expiring, reversible hypothesis that names:

- one target condition;
- one intended signal and direction;
- distinct counter and information-harm signals;
- a mechanism and falsifier;
- the actor's caller-asserted capability; and
- the authority and action state, both fixed to unverified or false.

An action that improves its intended signal may still harm people, game the
metric, worsen another condition or fail to improve the goal. Those results
must revise the hypothesis. They cannot be averaged into proof of success.

## 🔐 Trust boundary

Passing validation means only that the proposed map is internally explicit.
It does not establish:

- that human agency was correctly defined or measured;
- that the conditions are complete, necessary or satisfied;
- that any signal describes the world;
- that an actor exists, controls the condition or has a duty;
- that a provider will deliver anything;
- that an action works, is wanted or is lawful; or
- that a public or operational decision is authorised.

Version 1 accepts only `external-unverified` identity, relation, ledger and
authority states. Production use needs authenticated ledgers, source evidence,
affected-party governance and a separate lawful decision record.

The validator compiles the repository-owned schema and ignores caller-supplied
schema forks. It checks a caller-independent evaluation time, typed outcome and
provider scope, condition logic, affected-party relationships, content-addressed
metric definitions, plan coverage, completion verifiers and actor-dependency
cycles. The public projection exposes the actual metric denominator, condition
logic, freshness, completion test and dependency rather than hiding them behind
a label. These checks prevent easy contract drift. They still do not verify that
the caller's assertions are true.

## 🧪 Reproduce

- `schema/condition-agency-map.schema.json` closes the machine contract.
- `validate.mjs` checks scope, references, relations, plan modes, capabilities
  and deterministic public projection.
- `fixtures/australian-clerical-agency.synthetic.json` is an illustrative
  Australian clerical transition map, not an Australian finding.
- `tools/refresh-fixture.mjs` regenerates its complete scope hash and public
  projection.

Run:

```sh
node --test contracts/agency-map/tests/*.test.mjs
```
