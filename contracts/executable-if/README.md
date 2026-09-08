# Executable IF kernel

> **Status:** Isolated research prototype. It is not yet part of a transition
> bundle, public forecast, warning or action boundary. Its fixture is invented
> test data.

## Purpose

The kernel makes one narrow promise:

> Given a content-addressed condition definition, exact signal definitions,
> normalized same-scope observations and a fixed evaluation time, compute the
> registered rule state reproducibly.

The result is a **computed state from registered observations**. It does not
establish that a publisher is authentic, that the observations represent the
world, that a causal explanation is correct or that anybody should act.

## What executes

```text
content-addressed signal definition
  → typed WHO + VERB + OBJECT + STANDARD + POLARITY + PERIOD
  → dated, content-addressed condition definition
  → exact-scope normalized observations
  → predicate windows and thresholds
  → AND / OR / NOT expression
  → content-addressed receipt
  → true | false | unknown | stale | conflicted
```

The normative evaluator profile is
[`evaluator-semantics.json`](evaluator-semantics.json). The kernel and every
condition definition must name its exact identifier, version, semantics digest,
implementation digest and conformance-vector digest. This makes implementation
drift visible. It does not make the implementation correct or the publisher
authentic.

## Five states, three separate questions

| Axis | States | Meaning |
|---|---|---|
| **Computed rule state** | `true`, `false`, `unknown`, `stale`, `conflicted` | Result of the registered predicates for the exact scope and evaluation time |
| **Scope applicability** | evaluated elsewhere | Whether the condition definition applies to the proposed person, service, place and period |
| **Authority** | always `none` here | Whether a legitimate actor may use a result to make a decision |

Out of scope is not a truth state. The caller must reject a scope mismatch
before evaluation. It cannot turn evidence from one cohort or place into
`not-applicable`, `false` or support for another scope.

`unknown`, `stale` and `conflicted` never silently become `false`. In `AND`, a
known `false` is decisive. In `OR`, a known `true` is decisive. Where no Boolean
state decides the expression, one shared unresolved state is preserved and
mixed unresolved states become `unknown`.

## Observation contract

Each observation binds:

- one immutable condition definition;
- one predicate and immutable signal definition;
- the complete condition scope;
- period start, period end and recording time;
- typed value and exact unit;
- source identifier and source-artifact digest;
- explicit unquantified uncertainty and coverage accounting;
- a non-authorising classification.

The evaluator inspects the latest required periods. It cannot discard a newer
incomplete period and fall back to older convenient evidence. Selected periods
must be non-overlapping and meet explicit floors for distinct source labels,
distinct source-artifact hashes and coverage. Failing these gates yields
`unknown`, with exclusion reasons. Conflicting eligible values yield
`conflicted`.

The current schema accepts only synthetic observations. This is deliberate. A
future empirical schema needs source authentication, sampling and measurement
uncertainty, revision, missingness, licence and publication controls before it
can carry real observations.

`minimum_distinct_source_ids` checks only distinct labels within a period.
**Distinct source IDs do not establish independence.** Shared upstream data,
methods, ownership or reporting systems can make two labels dependent.
Independence remains `not-verified` in this prototype and must be governed by a
separate evidence-lineage contract.

Every signal also declares its population, estimand, aggregation rule, source
schema and `exact-scope-only` projection boundary. This blocks silent reuse of a
measure across a different cohort, service, geography or jurisdiction.

## IF identity

The public sentence is not the identity. Each definition binds a typed claim:

```text
WHO + VERB + OBJECT + STANDARD + POLARITY + PERIOD
```

Scope supplies the registered places, cohorts and services. The claim period
supplies its public time boundary, while `effective_from` supplies the earliest
time a particular definition version can be used. A definition revision may
improve thresholds, windows or logic, but it cannot invert or silently replace
the typed claim.
Changing the claim requires a new identity and an explicit relationship.

## Evolution contract

Definitions are introduced through a locally hash-chained event history. The
supported prototype operations are:

- `added`: introduce one new active identity;
- `narrowed`: preserve executable semantics while making scope a strict subset;
- `definition-revised`: preserve identity and scope while changing executable
  semantics under a higher version;
- `split`: supersede one identity and introduce an exhaustive, disjoint
  partition along exactly one scope axis;
- `merge`: supersede two or more compatible identities and introduce one whose
  scope is their exact single-axis union.

Events preserve the previous and new states, claimed author, reason, time,
previous event digest and event digest. `current_definition_state` must equal a
fresh fold of the whole local history. Reusing a condition identifier and
version, even with identical bytes, is rejected because it would make a replay
look like a new change. This local chain detects rewriting only when an earlier
checkpoint is retained elsewhere. `recorded_by` is not authenticated.

Evidence has a separate, locally hash-chained lifecycle:

- `evidence-added` introduces one observation once;
- `evidence-corrected` supersedes it with a new same-cell observation;
- `evidence-challenged` excludes it while the challenge is unresolved;
- `challenge-resolved` returns the same observation to active use;
- `evidence-withdrawn` and `evidence-expired` exclude it without erasure.

Only `active` evidence from a valid fold is eligible for evaluation.
`challenged`, `superseded`, `withdrawn` and `expired` evidence stays visible in
history. A correction cannot change the condition, predicate, signal, scope,
period, unit or source identity. A different cell is new evidence, not a
correction.

This prototype does not yet authenticate event actors, model disputed claims
between institutions, impose a retention service, or encode who has authority
to resolve a challenge. Those are integration gates, not implied capabilities.

## Integrity and its ceiling

Content hashes detect byte drift inside the local contract. A matching hash
does not authenticate a source, prove independence, establish empirical truth,
approve publication or authorise action. The schema fixes:

```text
empirical_truth_established: false
authority_effect: none
action_authorised: false
publication_approved: false
```

Those are safety ceilings for this synthetic kernel, not claims about the
world.

Evaluation returns `mechanically_valid_for_evaluation` and
`computed_rule_state`. Temporary `executable` and `condition_truth` aliases are
retained for migration only. A receipt binds the exact definition, evaluator,
sorted observation hashes, untrusted caller clock, diagnostics and result hash.

## Run and reproduce

```sh
npm run test:executable-if
node contracts/executable-if/tools/build-synthetic-fixture.mjs --check
```

Regenerate the invented fixture only after an intentional contract change:

```sh
node contracts/executable-if/tools/build-synthetic-fixture.mjs
```

The next integration gate is a new transition-bundle version that references
this kernel without allowing it to certify evidence quality, probability,
public approval or action authority.
