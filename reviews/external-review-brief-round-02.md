---
id: external-review-brief-round-02
title: External adversarial review brief, round 02
type: review-brief
status: frozen-input
provenance: commissioned-proposal
author: Ren
review_ref: review/round-02
created: 2026-09-08
---

# External adversarial review brief, round 02

> **Public release remains blocked.** This is an agent-produced review input,
> not Fernando Bordallo's adopted position, an affected-party review, an
> expert approval or public authority. External agent review cannot satisfy
> the affected-party, accessibility, institutional-authority or operational
> gates.

## 1. Review object

Review the exact Git tag `review/round-02`. Do not review a moving branch.
`round-02-manifest.json` pins the material artifacts by SHA-256, and the public
release record pins the rendered Observatory and embedded snapshot.

The proposition under test is:

> Growing technological capability can become shared and durable human agency,
> if observable distributional, institutional, operational and ecological
> conditions hold, and if legitimate actors can detect and correct avoidable
> failure early enough.

The instrument under test is:

> A public Observatory that makes those conditions, evidence, disagreements,
> forecasts, decisions, owners, safeguards, appeals and corrections legible
> without manufacturing prediction or authority.

Do not grade the work on ambition, aesthetics or internal consistency alone.
Try to show that the proposition is wrong, unmeasurable, politically unsafe,
operationally useless or better served by a simpler design.

## 2. Reproduction before interpretation

From a clean checkout of `review/round-02`:

```bash
npm ci
npm test
node dashboard/tools/build.mjs \
  dashboard/snapshots/2026-09-07.json dashboard/web/index.html
node dashboard/tools/build-australia-pilot.mjs \
  pilots/australia/data/nero-clerical-2026-08.json \
  pilots/australia/web/index.html
git diff --exit-code
```

Then independently recalculate every quantitative claim you rely upon. Do not
treat a passing repository test as source validation, causal identification,
human comprehension or release readiness.

If reproduction fails, file that failure before continuing. Record the
platform, command, observed output, expected output and smallest reproducible
case.

## 3. Independence protocol

Each reviewer receives the frozen artifacts, this brief and no other
reviewer's findings for the first pass. Reviewers submit an immutable first
report before discussion. A second pass may challenge another report, but must
preserve the original finding and explain any change.

No author reviews their own contribution as the decisive reviewer. Agreement
is not evidence. Disagreement is retained with its strongest supporting case.
Agent consensus cannot approve a public release.

## 4. Six review lanes

Every reviewer owns one primary lane and one cross-check lane.

### A. Thesis, political economy and narrative

Try to defeat the core proposition, not merely soften its wording.

- Does the thesis smuggle in a preferred distribution, theory of freedom or
  political settlement while presenting it as measurement?
- Can technological capability reduce prices while reducing agency?
- Can agency grow without abundance, or abundance without agency?
- Are ownership, power, ecology, geopolitics, care and coercion causal
  conditions, outcomes or missing dimensions?
- What historical analogues genuinely transfer, and what breaks the analogy?
- Would a public crisis narrative create fatalism, panic, polarisation or the
  self-fulfilling behaviour it claims to detect?
- State the strongest case for the thesis and the strongest case against it.
  Name evidence that would change each case.

### B. Evidence, measurement and causal inference

Audit every major public-facing and programme-level claim.

- Reproduce units, denominators, index construction, source vintages and
  transformations from primary sources.
- Identify survivorship, coverage, revision, classification, aggregation,
  price, household-resource and selection errors.
- Separate observation, derivation, association, mechanism, causal effect,
  forecast, scenario, value judgement and action proposal.
- Test the strongest alternative explanation, not a convenient straw person.
- Identify which claims cannot presently be measured at the named cohort,
  place, service and period.
- Search for high-quality counterevidence and null findings.

### C. IF formalism, forecasting and decision theory

Treat each `WHO + VERB + OUTCOME + STANDARD + PLACE + PERIOD + IF` record as a
candidate executable decision model.

- Are capability, reach, agency, durability and fairness complete, separable
  and stable across contexts?
- Can two competent encoders reproduce the same condition graph?
- Do `AND`, `OR`, `NOT` and `UNLESS` preserve five-valued uncertainty without
  hiding vetoes or double-counting dependencies?
- Are lifecycle, binding state and evidence grade genuinely independent axes?
- Can a condition migrate without post-hoc reinterpretation?
- Do watch, prepare, act, pause, reverse, recover and graduate rules name
  asymmetric false-positive, false-negative, delay and gaming costs?
- What naive baseline must a forecast beat to be useful?
- Which predictions are resolvable soon enough to change a legitimate action?

### D. Affected parties, public comprehension and distributional harm

Review the proposed protocol, but do not claim to execute participant review.

- Can a general reader identify what was observed, who is affected, what was
  inferred, which IF moved, who can act, what would falsify the claim and when
  it will be checked?
- Could a reader mistake missingness for safety, coverage for probability,
  exposure for job loss, a scenario for a forecast or an option for policy?
- Does the model recognise refusal, dissent, Indigenous data sovereignty,
  disability, language, low bandwidth, low numeracy, household structure,
  informal work and cross-border exclusion?
- Which groups bear the error costs and which groups choose the threshold?
- Can dissent change the metric, goal or action, or only annotate it?
- Identify dangerous misunderstandings that must never be averaged away.

### E. Product, accessibility, security and privacy

Test the rendered artifact, not just its source.

- Desktop and mobile, light and dark, keyboard only, screen reader, reduced
  motion, 200 and 400 percent zoom, print, cropped screenshot and copied text.
- Verify that epistemic and authority labels remain adjacent to every claim
  when content is reflowed, exported or cropped.
- Attempt malicious or malformed snapshots, unsafe links, markup injection,
  stale caches, mixed scopes and missing entities.
- Threat-model persuasion, selective screenshots, data poisoning, reviewer
  impersonation, checksum substitution and release-boundary bypass.
- Verify data minimisation, absence of tracking, safe retention and plausible
  re-identification paths before any cohort data is added.
- Ask whether a simpler low-bandwidth page would communicate more safely.

### F. Governance, negotiation and early action

Try to break every path from evidence to consequence.

- Who has publication authority, decision authority, funding, delivery
  capacity, legal basis, consent and a duty to act?
- Can one actor's `act_if` violate another actor's `pause_if`?
- Are precedence, appeal, override, expiry, compensation and recovery explicit?
- Are benefits and burdens negotiated with affected people before thresholds
  bind?
- Can a temporary action become permanent through drift or emergency framing?
- Can a state, firm, union, community, household or cross-border compact exit
  without losing essential access?
- What preparation is robustly useful if the forecast is wrong?

## 5. Required attempts to falsify

At minimum, attempt these attacks:

1. A capability jump increases output but ownership concentration makes reach
   and agency worse.
2. Aggregate household access improves while one affected cohort loses income,
   time, privacy or practical choice.
3. An employment decline is caused by seasonality, migration, classification,
   recession or revisions rather than AI.
4. A detector appears accurate only because thresholds were selected after the
   outcome or revised vintages leaked into the past.
5. A warning causes employers, markets or governments to produce the outcome.
6. An apparently reversible action creates stigma, surveillance, dependency or
   administrative burden that cannot be reversed.
7. A national rule suppresses local or Indigenous authority.
8. A cross-border floor becomes a permission regime or coercive standard.
9. The five-condition model omits ecological durability or embeds it in a way
   that makes the claim impossible to falsify.
10. The Observatory is less useful and less trustworthy than a conventional
    statistical release plus a public deliberation process.

## 6. Finding format

One finding per record:

```text
ID:
Severity: stop-line | major | minor | question
Lane:
Artifact and exact location:
Claim or control challenged:
Observed problem:
Evidence and reproduction:
People or decisions affected:
Strongest defence of the current design:
Why that defence succeeds or fails:
Falsifier for this finding:
Minimum safe correction:
Closure test:
Residual uncertainty:
Reviewer conflicts or dependencies:
```

A **stop-line** means the artifact could create material false belief, harm,
unauthorised consequence, invalid inference or irreproducible public evidence.
A **major** finding requires correction and another review. A **minor** finding
improves clarity or resilience without blocking restricted review. A question
must state what decision its answer would change.

## 7. Disposition rules

Every finding receives one disposition: `accepted`, `partially accepted`,
`rejected`, `deferred` or `superseded`. The disposition must cite evidence and
an owner. Rejection must steelman the finding and specify what future evidence
would reopen it. Deferral must name the blocker, next observation and expiry.

No stop-line may be closed by wording alone if the underlying problem is data,
method, authority, accessibility, security, delivery or lived experience.
Repeated agent assertion does not increase confidence.

## 8. Exit criteria for the next checkpoint

Round 03 can be frozen only when:

- every review report is pinned and independently reproducible;
- every stop-line is resolved or visibly blocks the next stage;
- every material disagreement is preserved;
- quantitative corrections propagate through claim ledger, prose, contracts,
  snapshot and interface;
- IF changes have explicit prior state, evidence, decision effect and reversal;
- the dashboard remains non-public and no-consequence unless all release gates
  pass;
- the next empirical test has a preregistered claim, counter-hypothesis,
  outcome, baseline, loss function and stop rule.

The review is successful if it makes the project narrower, more falsifiable and
safer. It is also successful if it shows that a central premise, metric,
forecast or product should be withdrawn.
