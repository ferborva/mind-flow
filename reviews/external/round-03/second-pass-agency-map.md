---
id: round-03-external-second-pass-agency-map
title: Round 03 agency-map and public-framing adversarial review
type: external-review-second-pass
status: submitted-open-findings
provenance: independent-agent-adversarial-review
reviewer: Ren
reviewed_state: live-post-93ca-worktree
reviewed_on: 2026-09-09
review_pack_baseline_commit: 93ca624
reviewed_head_at_capture: 3f2345ced213a208fb8587a7dde2a391d2fc0795
frozen_commit_review: false
included_uncommitted_worktree_state: true
authority: none
closure_claimed: false
---

## Result

No P0. The authority disclaimers prevent direct activation, but eight structural failures remain. Ten hostile variants returned `machine_valid: true`.

### P1: Logical roles collapse into one global AND

The guide permits necessary, sufficient, enabling, correlated, and decision-rule roles, but the schema has no logical role and the renderer joins every clause with `and if` ([guide:103](../../../communications/transition-field-guide.md#L103), [validate.mjs:121](../../../contracts/agency-map/validate.mjs#L121)).

Mutation:

```js
m.conditions[0].public_if_clause =
  "one sufficient alternative route is a funded transition option";
m.outcome_scope.scope_hash = computeOutcomeScopeHash(m);
m.public_projection = computePublicProjection(m);
```

Result: valid, but the sufficient alternative becomes mandatory.

Smallest repair: add structured condition logic and route expressions, hash them, and render necessary versus alternative sufficient routes differently.

### P1: Provider capability and scope are unchecked

`providerPlan` uses free text. Validation never joins offered work to actor capability, jurisdiction, consumer scope, or time ([schema:213](../../../contracts/agency-map/schema/condition-agency-map.schema.json#L213), [validate.mjs:294](../../../contracts/agency-map/validate.mjs#L294)).

Both remained valid after regenerating public output:

```js
plan.place = "Mars";
plan.period = "1900-01-01 through 1900-01-02";
```

```js
plan.offered_verb = "coerce";
plan.offered_object = "workers to waive appeal rights";
```

Smallest repair: structure provider object class, service, geography, and period; require exact capability and outcome-scope compatibility; expose capability verification publicly.

### P1: Affectedness can be reassigned to the powerful actor

Validation checks only that some relation contains `affected`. It does not connect the role to an affected-person actor or scoped population ([validate.mjs:249](../../../contracts/agency-map/validate.mjs#L249)).

Mutation across every condition:

```js
worker.roles = ["observes"];
employer.roles = [...employer.roles, "affected"];
```

Result: valid with byte-identical public output.

Smallest repair: bind affected-party references to the scoped population, require appropriate actor classes and governance evidence, and render affected parties plus verification state publicly.

### P1: Signals have no executable metrics and can be gamed invisibly

The machine contract contains signal labels and roles, but no measure, unit, denominator, population, period, source, metric, or evaluation rule ([schema:118](../../../contracts/agency-map/schema/condition-agency-map.schema.json#L118)). This contradicts the declared goal → signal → metric chain.

Mutation:

```js
m.signals[0].label =
  "Count of adverse cases removed from the reporting denominator";
```

Result: valid with unchanged public output, while the action still proposes increasing that signal.

Smallest repair: add content-addressed metric and estimand records with scope, denominator, window, direction, source, and independent collection rules. Render the actual measure, not an opaque reference.

### P1: Counter and harm signals can come from an unrelated condition

Only the intended signal is checked against the target condition. Counter and harm references are checked for existence and role, not scope compatibility ([validate.mjs:400](../../../contracts/agency-map/validate.mjs#L400), [validate.mjs:414](../../../contracts/agency-map/validate.mjs#L414)).

Mutation:

```js
action.counter_signal_refs = ["signal.offer-counter"];
action.harm_signal_refs = ["signal.offer-harm"];
```

The action targets `condition.transition-option-ready`; both substituted signals belong to `condition.employment-offer-exists`. Result: valid, public output unchanged.

Smallest repair: require exact population, geography, period, and condition compatibility, or an explicit cross-condition rationale and evaluation contract.

### P1: Caller-controlled clocks preserve decades-old plans as current

Freshness is checked only relative to `map.as_of`, never evaluation time, while public output omits as-of, review, and expiry ([validate.mjs:356](../../../contracts/agency-map/validate.mjs#L356)).

Mutation:

```js
m.created_at = m.as_of = "2000-01-01T00:00:00Z";
allNextReviewsAndExpiries = "2000-02-01T00:00:00Z";
```

Result on 2026-09-09: valid with unchanged public output.

Smallest repair: require an evaluator-supplied trusted `evaluatedAt`, fail closed when reviews or hypotheses are expired at that instant, and publish freshness fields.

### P2: Hidden completion criteria and dependency cycles

Completion criteria, evidence, dependencies, and review dates disappear from public output ([validate.mjs:128](../../../contracts/agency-map/validate.mjs#L128)). Evidence arrays may be empty, criteria are arbitrary strings, and cycles are not detected.

Valid mutations:

```js
clause.completion_criterion =
  "Complete whenever this actor says complete.";
clause.evidence_refs = [];
```

And a mutual employment-condition dependency between employer and transition provider also passed.

Smallest repair: structure completion evaluation and verifier identity, expose criteria and dependencies publicly, and detect or visibly label dependency cycles and blocked strongly connected components.

### P2: Relevant providers may disappear

The schema requires only one provider plan. Validation checks plans that exist, but not actors with control, duty, funding, delivery, or negotiation roles that lack plans.

Mutation:

```js
m.provider_plans = [m.provider_plans[0]];
m.public_projection = computePublicProjection(m);
```

Result: valid after omitting employer and public-authority WHEN plans.

Smallest repair: derive required plan coverage from material relation roles, or require an explicit public exclusion reason for every relevant actor without a plan.

### P2: Narrative language still implies prediction and exhaustive diagnosis

[every-if-is-somebodys-when.md:84](../../../drafts/every-if-is-somebodys-when.md#L84) says providers “will be able” when conditions hold, then says WHEN is not a forecast or commitment at line 115. [name-the-if.md:171](../../../drafts/name-the-if.md#L171) asks for every condition defeating “every viable route,” despite the open-world limitation.

Smallest repair: use “proposes it could attempt”; describe binding conditions as provisional within registered, evidenced routes; never claim exhaustive viable-route coverage.

## Verification

- Focused tests: **32/32 passed**
- Machine-valid hostile mutations: **10/10 reproduced**
- Files edited: **none**
