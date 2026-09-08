---
id: possible-path-hypothesis-contract
title: Possible path hypothesis contract
type: technical-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-08
updated: 2026-09-08
authority: none
---

# Possible path hypothesis contract

> **AGENT PROPOSAL. SYNTHETIC EXAMPLE. NO FINDING OR ACTION AUTHORITY.** A valid
> record shows that one possible path is internally explicit. It does not show
> that the path is expected, exhaustive, safe or true.

## 🦅 TL;DR

The project needs to reason about paths without pretending to be an oracle.
This contract keeps each path **open-world, plural and unscored**. It rejects a
path that presents a forecast, a probability or a crisis verdict.

Each path completes the public promise:

> `[WHO] may [VERB] [OBJECT] at [STANDARD], in [PLACE], during [PERIOD], only
> if [REGISTERED CONDITIONS].`

That full scope is hashed. Every consequential decision, negotiation and
transition edge repeats the hash and the exact ledger anchors for the IFs it
depends on. Changing “who”, “where”, “when” or an IF sentence without changing
the bindings fails validation.

## 🗺️ Read a path in three passes

1. **Read the promise.** Check who is included, the action verb, the object,
   the standard, place, period and every plain-language IF.
2. **Follow every branch.** A true result permits human consideration only. A
   false or unknown result blocks that edge. Unknown never means safe.
3. **Try to defeat it.** Inspect every named competing path, the registered
   strongest selection, their
   discriminating observations, unresolved signal roles, omitted populations,
   gaming risks and abandonment triggers.

The graph is a discussion surface, not an execution engine. `auto_action` and
`action_authorised` are fixed to false. Authority remains
`externally-unverified`, even when every local structural test passes.
False and unknown branches must end at abandonment sinks. Outcome nodes are
sinks too. The validator rejects cycles and checks every entry-to-outcome route
accumulates every registered IF condition.

## 🔀 IFs evolve, so paths must stop

Every bound condition carries an eleven-row policy for the complete condition
event vocabulary:

| Condition event | Path effect |
|---|---|
| `added` | No effect only when the complete hash-bound event proves a different condition identity and no scope intersection. |
| `narrowed` | Stop and re-register. |
| `split` | Stop and re-register. |
| `merged` | Stop and re-register. |
| `challenged` | Stop and re-register. |
| `satisfied` | Stop and review the assessment before re-registering. Satisfaction does not carry authority into the path. |
| `failed` | Stop and re-register. |
| `expired` | Stop and re-register. |
| `superseded` | Stop and bind the replacement explicitly. |
| `disputed` | Stop and re-register. A dispute cannot be relabelled as satisfaction. |
| `withdrawn` | Stop and re-register. |

This is deliberately conservative. A stale edge must never inherit confidence
from a condition whose meaning, scope, evidence or status changed. A
`no-effect` declaration is not free text. It requires the exact proof rules in
the schema. The current validator checks that declaration's structure, but it
cannot fetch and authenticate the external ledger event that would satisfy it.

## 🧭 Competing paths and signals

A path must name at least two distinct competitors, select one of those named
records as its strongest known competitor, and register observations that could
distinguish each from the candidate path. The observations remain unresolved
until a separate prospective evidence process acquires and validates them.
Calling one competitor “strongest” is a registered judgement, not a measured
rank. Unnamed possibilities still remain possible under the open-world model.

Each path also exposes seven evidence roles:

- leading;
- confirming;
- counter;
- outcome;
- readiness;
- intervention exposure; and
- information harm.

Every role is assigned or explicitly unresolved. The same signal cannot fill
multiple roles. Passing this check does not establish source independence,
signal quality or condition truth. Those belong to the signal and evidence
contracts.

## 👥 People are part of the model boundary

The path names affected populations and the channel through which each may be
affected. It also carries an explicit omission register. “None identified” is
allowed only with a search method and its limitations still visible.
The deterministic public ceiling repeats every affected-population label,
omission notice and named competitor, so those boundaries cannot disappear from
the public scope while remaining present only in the machine record.

The synthetic Australian clerical example identifies temporary visa holders
and unpaid carers as incompletely represented. It also records risks from offer
relabeling and metric targeting, the intervention state, expiry and conditions
for abandoning the path while retaining its record. These entries illustrate
the contract. They are not Australian findings and are not based on acquired
affected-party evidence.

## 🧪 Files and reproduction

- `schema/possible-path.schema.json` closes every object boundary and fixes the
  non-authority states.
- `validate.mjs` checks graph, scope, condition, signal and population
  integrity against a repository-owned digest-pinned schema and produces the
  deterministic public claim ceiling.
- `fixtures/australian-clerical-transition.synthetic.json` is a synthetic,
  unverified example.
- `tests/possible-path.test.mjs` attacks scope mutation, missing branches,
  incomplete condition policies, dispute and satisfaction laundering,
  verdict language, competitor removal, authority inflation, population
  omission, unsafe reachability, caller-supplied schema forks and signal reuse.

Only the deterministic ceiling is returned as the bounded public rendering.
Because that rendering includes bounded domain prose, its publication status
remains `human-review-required`. The lexical checks reject known quantitative
and forecast forms but do not claim to understand every natural-language
equivalent.

Run:

```sh
node --test paths/tests/*.test.mjs
```

## ⚠️ Residual boundary

This contract does not discover all possible paths, prove that the named
competitor is strongest, authenticate a condition ledger, validate signal
sources, assess condition truth, represent affected-party consent or confer
legal authority. Local hashes detect unresealed edits, not a coordinated
rewrite. Production use needs independently published ledger checkpoints,
prospective evidence, affected-party governance and a separately verified
human authority layer.
