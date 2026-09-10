# Executable IF kernel

For a worked example, read [When an IF changes](when-an-if-changes.md): the
actual Australian event-12 revision, the consumer it invalidated and the two
new discoveries that still require an explicit construct migration.

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

Every definition declares `condition_category`: `price`, `permission`,
`proximity`, `availability` or `capability`. This starting set follows Fernando's
September 2026 captures. `condition_subtype: discretion` is valid only under
availability: access that depends on somebody continuing to choose to provide
it is revocable. A category change changes the identity, rather than quietly
revising the same claim.

Numeric predicates must leave possible passing and failing values. Ratios have
an intrinsic range of 0 to 1, percentages 0 to 100. Other numeric signals declare
`value_range` with at least one finite bound (`minimum`, `maximum`, or both).
An omitted endpoint is unbounded, so nonnegative money, duration or workforce
intensity need no invented upper limit. Two supplied bounds must be ordered.
A declared range
may narrow, never expand, an intrinsic range. These bounds establish logical
plausibility, not empirical justification for the selected threshold. A count's
maximum needs a documented population or physical bound, not a number chosen
to make a predicate pass.

### Count-domain audit boundary

**Count nonnegativity is an audit-layer control.** The sealed evaluator remains
unchanged in Round 09: it tests vacuity against a declared count range, but does
not reject an impossible negative cardinal-count lower bound. For example,
`count >= 0` with a declared range `[-10, 10]` passes that formal threshold check
even though actual cardinal counts cannot be negative. The current
[`source-aware-audit.mjs`](source-aware-audit.mjs) flags the contradiction and
reports the predicate as intrinsically always true. Callers must run this audit
and expose flagged or unassessed findings; a valid kernel is not an audited domain.

This separation preserves already issued forecast dependencies and historical
evaluator receipts. Promoting the rule would need a deliberately versioned
evaluator and a consumer migration, not an in-place edit to sealed semantics.
The executable [boundary regression](tests/audit-layer-boundary.test.mjs) runs
the same test-only predicate through both paths. It documents the remaining
formal acceptance, rather than claiming the evaluator was repaired. The AU
adapter's `--require-assessed` option fails on flagged or unassessed audits.

An out-of-sample threshold is a different question: `count <= 1e9` is not
logically vacuous on an unbounded nonnegative domain merely because retained
observations end at 10. It deserves a source-bound plausibility review.

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
schema digest, implementation digest and conformance-vector digest. This makes
contract or implementation drift visible. It does not make the implementation
correct or the publisher authentic.

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

`classification: measured-observation` identifies normalised retained-source
observations; `synthetic-observation` retains the fixture-only namespace
`source.synthetic.*`. The classifications cannot share source identifiers.
Neither a source identifier nor a digest proves that a retained artifact
supports a derived value. The measurement producer must reproduce that
derivation from retained bytes and state its evidence ceiling.

Historical measured periods may precede a newly registered definition. Their
normalisation `recorded_at` must still follow that definition's introducing
event, and evaluation must follow both the definition and evidence fold.
Keep the actual historical period: `maximum_age_days` still makes old evidence
stale. The claim period must include both the studied period and evaluation
instant. This supports retrospective measurement without backdating a
definition or asserting prospective knowledge. Forecast issuance has its own
separate chronology requirements.

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

The current schema accepts both explicitly classified synthetic and measured
observations. Retained-source measurement does not supply source authentication,
sampling adequacy or publication authority by itself. The measurement producer
must carry the source, uncertainty, revision, missingness and licence limits.

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
improve thresholds, windows and source policies. It cannot change the truth
expression, predicate set, predicate-to-signal binding or which operator direction
passes. Those are semantic anchors for the typed claim. Changing one requires a
new condition identity and an explicit relationship.

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

All contract instants use exact `YYYY-MM-DDTHH:mm:ssZ` form. Governed evaluation
uses the complete current definition and evidence folds, so `evaluated_at` must
not predate the latest event in either fold. This blocks a current snapshot from
silently reading evidence or lifecycle decisions recorded in its future. The clock
is still caller supplied and unauthenticated.

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

Synthetic observations use the `source.synthetic.*` namespace; measured
observations cannot use that namespace. The shared ID type is unchanged.
`recorded_by` and `signals[].source_schema_ref` remain general strings. These
fields are caller claims, not authenticated provenance.

Missing, stale and conflicting predicate results are fixed respectively to
`unknown`, `stale` and `conflicted`. A definition cannot turn absent or disputed
evidence into a passing result.

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
