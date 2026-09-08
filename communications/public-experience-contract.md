---
id: public-experience-contract
title: Executable Public Experience Contract
type: communications-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-09
updated: 2026-09-09
authority: none
---

# Executable Public Experience Contract

> **Research prototype. Not live. No service or policy authority.** This
> contract is an agent proposal. It does not create a warning, public service,
> institutional commitment, help route or permission to act.

## The public promise

The first public layer should let a person answer, without opening technical
details:

1. What does this record conclude?
2. Who and what does it cover?
3. Which IFs are known, unknown or disputed?
4. Is any action authorised, and is waiting known to be safe?
5. Does help or a challenge route actually exist?
6. Is monitoring active?
7. What proposed goal and value choice shape the page?
8. How strong, applicable and current is the evidence?
9. Are positive, adverse, refusal and recovery paths established?
10. What evidence would change the reading?

The machine record fixes this first-screen order. Technical record identity,
methods and charts follow it. A mobile layout may compress wording, but it may
not move action safety or scope below technical evidence.

## Current prototype reading

The valid fixture renders this bounded result:

```text
STATUS
Research prototype. Not live. No Observatory service or policy authority.
Record time: 2026-09-09T00:00:00.000Z. Its clock is operator-supplied and
untrusted, so it cannot establish current freshness.

CURRENT READ
No transition conclusion. The frozen world aggregate does not establish
progress, crisis, personal effect or a technology cause.

SCOPE AND APPLICABILITY
World aggregates, 2004 to 2025. This record does not describe an individual,
occupation, household or community.

IF STATUS
Capability: unknown | Reach: unknown | Agency: unknown |
Durability: unknown | Fairness: unknown
No progress or crisis path is established.

ACTION, HELP AND SAFETY
No Observatory action is authorised. This does not establish that waiting is
safe. No Observatory-linked help or challenge service exists.

MONITORING
Monitoring inactive. No governed check, owner or service cadence is scheduled.

PROPOSED GOAL (VALUE CHOICE)
Expand real choices and continuity as technological capability grows.
Affected-party adoption is not completed. Alternative goals and dissent remain
legitimate.

EVIDENCE STATE
Derived record. Source authenticity: unverified. Measurement quality: mixed.
Applicability: unknown. Inference: descriptive only. Decision readiness: none.

PATH STATUS
No positive or adverse path is established. Refusal, reduction and
no-deployment remain legitimate candidate paths.

WHAT WOULD CHANGE THIS READING?
A scoped reconstruction with distributional human outcomes, uncertainty and
independent counterevidence could narrow, reverse or retire the reading.
```

## IF and actor-specific WHEN

The public IF describes a scoped human outcome condition. An actor-specific
WHEN describes a proposed, bounded work hypothesis for one named actor.

Every WHEN in this prototype is an **action hypothesis**, not an instruction,
date prediction, authority claim or commitment. It names:

- the condition it may help investigate;
- the actor whose identity and relation remain unverified;
- completion criteria;
- actor dependencies;
- a review date and expiry;
- acting, waiting and information-harm references; and
- fixed `none` authority and `not-committed` states.

The current fixture assigns only a proposed research actor. It does not assign
work, blame or proof duties to affected people. Every mapped condition needs a
WHEN hypothesis. A condition with no plausible actor must say
`no-actor-identified` and explain why.

## Uncertainty without a confidence score

Confidence is not collapsed into one number. The record keeps these dimensions
separate:

| Dimension | Public question |
|---|---|
| Source authenticity | Are the publisher bytes independently authenticated? |
| Measurement quality | What was observed, modelled, derived or left unknown? |
| Applicability | Does the record describe the person or population in view? |
| Inference strength | Is the result descriptive, causal, forecast or unresolved? |
| Decision readiness | Can the evidence support any governed decision? |
| Timing readiness | Is the evidence live, frozen, stale or unknown? |

Moving one dimension cannot upgrade another.

## Harms and action safety

Four harm records are mandatory and cannot be averaged into a synthetic score:

- experienced harm to the scoped people;
- harm from acting;
- harm from waiting; and
- information harm from anxiety, stigma, false certainty or harmful action.

The safety of acting and the safety of waiting are different questions. No
Observatory authority does not mean waiting is safe. Unknown harm does not mean
zero harm.

## Dissent, help and challenge

Alternative goals and dissent remain legitimate. A person may reject the goal,
condition set, evidence, inference or method without being treated as a failed
condition.

The current prototype has no verified service. Its help and challenge records
are fixed to unavailable, unverified and unowned. A URL or owner cannot be
added while preserving prototype validity. The public sentence remains:

> **No Observatory-linked help or challenge service exists.**

Existing rights, duties and ordinary services sit outside this record and must
not be invented or suppressed by it.

## Condition evolution

Condition evolution is a separate evidence object. The current prototype binds
no history, so its event list must remain empty and the public layer must say
that history is not bound.

A future bound history would need typed, dated operations, previous and new
wording, previous and new scope, evidence, author, reason, privacy treatment,
challenge state and review. This prototype does not claim that boundary exists.

## Executable boundary

The repository-owned schema rejects:

- public authority, policy authority or service status other than `none`;
- live help or challenge routes;
- active monitoring or invented owners;
- actor WHENs that imply activation, commitment or authority;
- expired WHEN hypotheses;
- mapped conditions without a scoped actor WHEN;
- missing signal roles;
- missing or duplicate harm classes;
- observed harm without evidence;
- hidden dissent;
- invented condition history; and
- reordered first-screen content that moves action behind evidence detail.

Validation proves only internal completeness against this proposed contract. It
does not validate truth, authority or public comprehension. Those require
source verification, affected-party governance, independent review and human
testing.

Run:

```sh
node --test communications/tests/public-experience-record.test.mjs
node --test dashboard/tests/public-experience-integration.test.mjs
```
