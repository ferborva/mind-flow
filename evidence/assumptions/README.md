# Assumption registry

## 🦅 TL;DR

> **This registry makes uncertainty governable without pretending to remove it.**

Every decision-relevant assumption gets a stable identity, an exact statement,
a named epistemic class, affected parties, evidence on both sides, a challenge
route, decision consequences and a review clock.

**Schema-conformant does not mean true.** The validator checks record shape and
cross-record consistency only. Every result therefore reports
`claim_truth_assessed: false`.

The initial registry translates every hostile finding in the
[Round 03 internal adversarial register](../../reviews/round-03-internal-adversarial-register.md)
into a smaller set of explicit, challengeable assumptions. Those findings
remain internal attacks, not independent closure.

---

## 🧭 The four lanes

**The most dangerous assumption is one wearing the wrong uniform.** A testable
claim, a safety boundary, a value choice and an unresolved fact need different
treatment.

| Class | What it means | Required challenge | Public label |
|---|---|---|---|
| `bounded_hypothesis` | A scoped empirical or system-behaviour claim that may be wrong | A falsifier with a prediction, disconfirming observation and test method | `Hypothesis:` |
| `hard_safeguard` | A constraint that must hold before a dependent decision may proceed | A review mechanism with a fail-closed decision dependency | `Safeguard:` |
| `legitimate_value_decision` | A normative tradeoff that evidence alone cannot settle | A legitimate review and deliberation mechanism | `Value choice:` |
| `explicit_unknown` | A decision-relevant gap that has not been established | A resolution or review mechanism that keeps the gap visible | `Unknown:` |

A hard safeguard is not called true because a validator accepts it. A value
choice is not disguised as science. An unknown is not silently converted into
zero. A hypothesis earns confidence only through evidence and attempts to
falsify it.

---

## 🔬 What the contract checks

The [closed JSON Schema](schema/assumption-registry.schema.json) rejects missing
required fields and undeclared fields. Each assumption records:

- **Identity** - stable `assumption_id` plus semantic `version`.
- **Claim** - one exact statement and one class.
- **Scope** - jurisdictions, populations, systems, dates and exclusions.
- **Stewardship** - owner, lifecycle status and accountability.
- **People** - affected, benefited and burdened parties, each with an explicit
  representation state.
- **Contestability** - evidence, counterevidence and a falsifier or review
  mechanism appropriate to the class.
- **Decision exposure** - dependencies, the consequence of error and handling.
- **Time** - expiry and next review.
- **History** - versioned replacement links.
- **Public meaning** - whether to publish, withhold or retire the assumption,
  plus class-preserving plain language.

The semantic validator additionally rejects duplicate identities, omitted
affected parties, evidence counted on both sides, overdue reviews, invalid
expiry states, self-replacement, mismatched public labels and safeguards that
do not constrain a decision fail closed.

It does **not** determine empirical truth, legal validity, moral legitimacy,
representative authority, consent or operational readiness.

---

## 🧪 Run it

From the repository root:

```sh
node --test evidence/assumptions/tests/*.test.mjs
```

The suite validates:

- a fixture containing all four classes;
- the Round 03 initial registry;
- complete coverage of Round 03 finding IDs;
- hostile mutations for class swaps, omitted parties, evidence-role conflicts,
  overdue reviews, fail-open safeguards, self-replacement and truth overclaim.

Programmatic use keeps the trust boundary in the return value:

```js
import { assessAssumptionRegistry } from "./evidence/assumptions/lib/validate.mjs";

const result = assessAssumptionRegistry(registry);
// {
//   schema_conformant: true,
//   registry_consistent: true,
//   claim_truth_assessed: false,
//   errors: []
// }
```

There is intentionally no bare `valid: true` result. That phrase is too easy to
misread outside its narrow contract boundary.

---

## 🔁 Working method

1. **Write one exact statement.** If two observations could falsify different
   parts, split it.
2. **Choose the class before gathering support.** Do not upgrade an unknown into
   a hypothesis merely because a decision is urgent.
3. **Name the people.** A beneficiary and a burden bearer must also appear as an
   affected party. `unknown` is an allowed representation state and a prompt to
   investigate, not permission to infer consent.
4. **Record both sides.** Empty evidence arrays are allowed because fabricated
   completeness is worse than an explicit gap.
5. **Connect the decision.** State what depends on the assumption, what happens
   if it is wrong and whether the response is fail closed, a bounded experiment
   or explicit deliberation.
6. **Set the clock.** A current record becomes inconsistent after its next review
   date or at expiry.
7. **Publish the class with the claim.** Crops and summaries must preserve the
   `Hypothesis:`, `Safeguard:`, `Value choice:` or `Unknown:` prefix.
8. **Replace, never rewrite history.** Material statement or scope changes create
   a new version and explicit replacement links.

### A worked example

Imagine the dashboard says, "the transition resolver prevents unsafe changes".
That sounds comforting, but what kind of sentence is it?

It predicts system behaviour, so it belongs in `bounded_hypothesis`. The record
must then say what would falsify it: one lifecycle row that silently withdraws
support, hides recovery or graduates through a conflict. The public version
becomes:

> **Hypothesis:** the resolver can expose safe candidate states without
> activating or withdrawing anything.

Now a reviewer knows what is claimed, what is not claimed and how to attack it.

---

## ⚠️ Current limits

- The Round 03 mapping groups related findings into assumptions. Independent
  review may split them where falsifiers or affected parties differ.
- Repository-local evidence records what internal agents observed. It is not
  external reproduction.
- Owners are role references, not evidence that a person or institution has
  accepted accountability.
- Review dates create a visible failure when time passes. They do not schedule
  or perform the review.
- Public disposition defines safe wording. It does not itself publish anything.

---

## ✅ Next review

The next useful attack is not more schema work. Give the registry to affected
party representatives, an empirical reviewer, a governance reviewer and an
operational practitioner. Ask each to identify:

1. statements that hide multiple assumptions;
2. missing burden bearers or representation gaps;
3. weak falsifiers and circular evidence;
4. decisions that should fail closed but do not;
5. public wording that could still be mistaken for fact or authority.

## Change log

- **2026-09-08** - Added schema `1.0.0`, semantic validation, all-class and
  hostile fixtures, and the initial Round 03 registry.
