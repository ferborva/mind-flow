---
id: signal-portfolio-contract
title: Signal portfolio contract
type: technical-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-08
updated: 2026-09-08
authority: none
---

# Signal portfolio contract

> **AGENT PROPOSAL. NO ACTION AUTHORITY.** Passing this contract means that a
> record is internally consistent. It does not make a signal true, causal,
> publishable or safe to use.

## 🦅 TL;DR

**A signal is useful only when we can say exactly what it estimates, which IF
it informs, how early it arrives, what could defeat it and what must remain
unknown.** The project never compresses a condition portfolio into a single
score. People need to see disagreement, absence and harm, not a polished
average that hides them.

The public mnemonic remains:

> `[PEOPLE] can [VERB] [OBJECT] at [STANDARD], in [PLACE], during [PERIOD], if
> [REGISTERED CONDITIONS].`

This contract attaches a portfolio to each material IF. It keeps seven roles
separate:

| Role | Public question |
|---|---|
| Leading | What may change early enough to matter? |
| Confirming | What independent process could show the same scoped change? |
| Counter | What would favour a credible rival explanation? |
| Outcome | What happened to the people or system named in the claim? |
| Readiness | Could a named owner deliver the proposed response in time? |
| Intervention exposure | Who or what actually received the intervention? |
| Information harm | Did the warning itself create anxiety, stigma, false certainty or rushed action? |

Every role is either linked to evidence or explicitly unresolved. **Unknown is
not safe, no change or permission to fill the gap with a broader statistic.**
It means the registered evidence cannot establish the condition yet.

## 🔐 Boundaries that fail closed

- A modelled estimate is not an observation of the world it models.
- Agreement is not independent confirmation when sources share inputs or a
  collection process.
- An occupation, region, household, business and person are not interchangeable
  statistical units.
- A signal is not early if its minimum prospective lead time is shorter than
  the decision's minimum useful lead time.
- A candidate measure cannot assert an individual outcome, causal effect or
  operational consequence.
- An agent proposal never creates authority, consent, funding or capacity.

The validator compiles only the repository-owned schema whose byte digest is
pinned in the implementation. Caller-supplied schemas are ignored, and the
non-authority fields are checked semantically as a second boundary. A relaxed
schema fork therefore cannot turn structural validity into operational effect.

The fixture contains no acquired source bytes and no locally verified condition
ledger. Those absences are represented as `not-acquired` and
`external-unverified`, with a next acquisition. Placeholder hashes are not used.

Version 1 intentionally has no schema path for a locally verified condition
binding. Decision-linked and public portfolio modes therefore fail closed even
though their vocabulary is reserved. A later version must import and validate a
complete [condition evolution ledger](../contracts/evolution/README.md), not
accept a caller's `verified` label.

The validator follows source dependencies transitively. NERO depends on the
ABS Labour Force Survey family, so an LFS-family comparison may test coherence
but cannot satisfy independent confirmation for a NERO movement.

## 🇦🇺 Current Australian candidate

The fixture registers NERO as a possible **descriptive leading signal** for one
occupation and one resident SA4. It keeps an LFS-family extract as dependent
counter or coherence context. Confirmation, lived outcome, readiness,
intervention exposure and information-harm evidence remain unresolved.

The machine-rendered public ceiling is:

> NERO modelled employment estimate may be described only as modelled-estimate
> evidence about modelled employed-person level for ANZSCO 5311 General Clerks,
> one ASGS 2021 SA4 by residence, during monthly NERO reference month. It does
> not establish causality, individual outcomes or action authority.

That narrow sentence is a feature. The missing links are the work.

## ✅ Reproduce

```sh
node --test signals/tests/*.test.mjs
```

The tests attack unresolved references, role laundering, scope substitution,
dependent corroboration, inadequate decision lead time, forbidden claim
permissions, caller-controlled schema forks and source-lineage cycles.
