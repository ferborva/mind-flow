---
id: if-protocol
title: The IF Protocol
subtitle: A public grammar for conditional promises, decisions and transitions
type: governance-proposal
status: proposed
provenance: commissioned-proposal
author: ren
reviewer: fernando-bordallo
created: 2026-09-08
updated: 2026-09-08
---

# The IF Protocol

> **Proposal status:** Ren, an AI agent, wrote this protocol after Fernando
> commissioned a deeper development of his `verb + fill in the blank + if`
> idea. The foundational observation is Fernando's. The grammar, condition
> model, lifecycle, evidence grades, decision rules and compact below are
> agent-authored proposals requiring his approval.

## 🦅 TL;DR

- A capability promise is incomplete until it names who can achieve what,
  where, by when, to what standard and under which conditions.
- Conditions form a versioned graph with `AND`, `OR`, `NOT` and `UNLESS`, not a
  single score.
- A condition's lifecycle, current binding state and evidence grade are
  separate. Conflating them creates false confidence.
- Decisions add an `IF warning, THEN action` contract with an owner, authority,
  funding, safeguards, appeal, review and exit test.
- The protocol is a language for public reasoning. It is not a machine that is
  authorised to govern people.

---

## 🧩 From a promise to a public claim

Fernando's original pattern is:

> **verb + fill in the blank + if**

The IF Protocol makes every hidden term explicit:

> **[WHO] can [VERB] [OUTCOME], to [STANDARD], in [PLACE], by [TIME], IF
> [CONDITIONS]. If [WARNING], then [ACTION] by [OWNER]. Continue until [EXIT
> TEST]. Pause or stop if [SAFEGUARD] fails. Evidence: [SOURCE, VINTAGE,
> UNCERTAINTY].**

This grammar separates six questions that public promises often collapse:

1. **Capability:** can a system produce the output?
2. **Reach:** can the named person obtain and use it?
3. **Agency:** can that person understand, choose, refuse, switch and appeal?
4. **Durability:** will the outcome persist under foreseeable stress?
5. **Fairness:** who receives the gain, carries the cost and shapes the rules?
6. **Response:** what happens if an important condition worsens or fails?

### A claim before and after

| | Statement |
|---|---|
| Incomplete | Everyone can learn anything. |
| Better | A secondary student can master the agreed algebra curriculum using an AI tutor. |
| IF Protocol | A secondary student in the pilot region can master the agreed algebra curriculum, with no greater outcome gap for low-income or disabled students, if the tutor passes quality and safety evaluation, works in required languages, is available without hidden payment, preserves a non-digital route, and provides human review and appeal. |

The final version is longer because it makes disagreement possible. People can
challenge the standard, cohort, conditions, evidence or authority instead of
arguing about a slogan.

## 🧱 The five condition layers

### 1. Capability

Does the service or system exist, perform the required task, and meet the
minimum quality and safety standard?

Typical conditions: technical performance, reliability, capacity, safety,
security and reproducibility.

### 2. Reach

Can the named person find, afford, qualify for and receive it?

Typical conditions: availability, total cost, eligibility, location,
connectivity, language, accessibility, logistics and waiting time.

### 3. Agency

Can the person use it meaningfully and by choice?

Typical conditions: comprehension, skills, informed consent, privacy, a viable
alternative, freedom to refuse, ability to switch provider, human review and
appeal.

### 4. Durability

Will the outcome remain available under stress and over the relevant period?

Typical conditions: continuity, provider substitutability, fiscal capacity,
workforce capacity, supply resilience, institutional stability and ecological
limits.

### 5. Fairness

Who receives the gain, who carries the cost and who participates in the
decision?

Typical conditions: distribution by cohort and place, labour transition,
externalities, public return for public support, participation and remedy.

These layers are a completeness check, not an equation. Access, agency and
fairness cannot be calculated by multiplying ordinal scores.

---

## 🕸 Condition graphs

A promise is represented as a directed condition graph:

- **Outcome nodes** describe what a named population should be able to achieve.
- **Condition nodes** describe requirements, margins, hazards, choices or
  unknowns.
- **Evidence nodes** connect observations to each condition.
- **Decision nodes** connect warnings to authorised actions.
- **Effect nodes** track intended outcomes and possible harms after action.

Every edge states the proposed relationship, its evidence grade and plausible
alternatives. A visual arrow must never imply causality when the evidence shows
only association.

### Logical operators

| Operator | Public meaning | Rule |
|---|---|---|
| `AND` | Every linked condition is required | Failure of one blocks the claim |
| `OR` | At least one valid route is sufficient | Routes must meet comparable outcome and rights standards |
| `NOT` | A named hazard or exclusion must be absent | Define how absence is measured |
| `UNLESS` | A declared exception replaces one requirement | The exception needs its own evidence, authority, safeguard and expiry |

Example:

```text
STUDENT ACHIEVES AGREED LEARNING OUTCOME
IF
  quality standard passes
  AND safety standard passes
  AND (home access OR accessible community access)
  AND affordability standard passes
  AND language and disability access pass
  AND NOT hidden advertising or sale of student data
  AND human review is available
  AND appeal is reachable
  AND teacher approval is recorded
  UNLESS an authorised accessibility plan specifies an equivalent route
```

`UNLESS` is not an informal loophole. It records a legitimate exception, who
authorised it, why it produces an equivalent protected outcome, and when it
will be reviewed.

### Condition types

Each node is one of:

| Type | Meaning | Example |
|---|---|---|
| **Hard gate** | Non-compensable minimum | Safety or informed-consent requirement |
| **Margin** | Continuous condition with an acceptable range | Total cost, wait time or travel distance |
| **Route** | One of several ways to satisfy a requirement | Home connection or community access point |
| **Hazard** | Harm that must stay below a ceiling | Privacy loss, exclusion error or ecological burden |
| **Choice** | Normative rule requiring legitimate authority | Eligibility, public funding or acceptable trade-off |
| **Unknown** | Important condition without adequate evidence | Long-run effect on essential workforce supply |

Hard gates cannot be compensated by high scores elsewhere. A safe service does
not become acceptable because it is cheap. A cheap service does not become
abundant if people cannot refuse it.

## 🗂 Minimum condition record

Every condition needs a versioned record:

```yaml
id: stable-condition-id
name: Plain-language name
question: What must be true?
layer: capability | reach | agency | durability | fairness
type: hard-gate | margin | route | hazard | choice | unknown
scope:
  outcome: Named outcome
  service: Named service
  cohort: Named population
  place: Named geography or jurisdiction
  period: Observation and decision horizon
logic:
  operator: AND | OR | NOT | UNLESS
  dependencies: [condition-id]
definition:
  measure: Observable definition
  unit: Unit or categorical test
  threshold: Public threshold or explicitly unset
  distribution: Required cohort and regional cuts
state:
  lifecycle: hypothesised
  binding: unknown
  evidence_grade: conjecture
evidence:
  sources: []
  vintage: null
  uncertainty: Unknown
  alternatives: []
accountability:
  evidence_owner: Named role or institution
  decision_authority: Named lawful authority or unset
  affected_participants: []
  review_on: YYYY-MM-DD
response:
  warning: Observable warning or unset
  action_contract: compact-id or unset
history:
  created_by: Named person or agent
  changes: []
```

A blank is valid when the answer is unknown. It must render as unknown rather
than inherit a default that looks authoritative.

---

## 🔄 Three states that must remain separate

### Lifecycle: how operationally mature is the condition?

```text
hypothesised → defined → instrumented → baselined → trigger-ready
             → active → relieved or failed → reviewed or retired
```

| Lifecycle | Meaning |
|---|---|
| **Hypothesised** | The condition may matter, but its definition is unfinished |
| **Defined** | Scope, measure and interpretation are explicit |
| **Instrumented** | Evidence can be collected reproducibly |
| **Baselined** | A representative starting distribution and uncertainty exist |
| **Trigger-ready** | A legitimate authority has approved a threshold and response contract |
| **Active** | The condition is being used in a live decision or commitment |
| **Relieved** | The condition is no longer constraining the scoped outcome |
| **Failed** | The condition breached and the promised outcome did not hold |
| **Reviewed** | Outcomes, harms and prediction performance have been assessed |
| **Retired** | The condition no longer adds decision value, with reasons recorded |

Lifecycle is not confidence. A widely instrumented measure can still be a weak
explanation of what caused the outcome.

### Binding state: how strongly is it constraining this outcome now?

```text
unknown | not-binding | latent | emerging | binding | relieved | displaced
```

- **Latent:** currently passing but plausibly exposed to a known change.
- **Emerging:** moving towards a declared boundary.
- **Binding:** preventing the named population from achieving the outcome.
- **Relieved:** no longer constraining after change or intervention.
- **Displaced:** relieving this condition made another one binding.

Binding state is always scoped by service, cohort, place and time. Money can be
non-binding for a digital tutorial and binding for housing in the same
household.

### Evidence grade: how strong is the support for the claimed relationship?

```text
conjecture → mechanism → observed association → causal evidence → replicated
```

| Grade | Meaning |
|---|---|
| **Conjecture** | A falsifiable idea with no direct supporting observation yet |
| **Mechanism** | A credible process is specified, but effect size is uncertain |
| **Observed association** | The measures move together in relevant data |
| **Causal evidence** | A credible design isolates an effect under stated conditions |
| **Replicated** | Relevant causal evidence holds across multiple settings or teams |

These are categories, not universal scientific ranks. The evidence note must
explain why the grade was assigned and record credible competing explanations.

### The non-conflation rule

Do not say a condition is `safe`, `solved` or `high risk` from one axis alone.
For example:

| Lifecycle | Binding | Evidence | Honest reading |
|---|---|---|---|
| Instrumented | Emerging | Observed association | We can see movement, but do not yet know whether it causes the outcome |
| Hypothesised | Unknown | Mechanism | Plausible and important, not measurable or actionable yet |
| Trigger-ready | Binding | Causal evidence | A legitimate response can activate against a well-supported condition |
| Baselined | Not-binding | Replicated | Strong evidence says it matters, but it is not constraining this scope now |

## 🧭 How IF conditions evolve

The protocol treats condition evolution as the central transition object.

1. **Emergence:** a capability or social change creates a new condition.
2. **Exposure:** evidence shows which cohorts and places encounter it.
3. **Binding:** the condition prevents an outcome for a named scope.
4. **Negotiation:** affected parties contest the definition, burden, threshold
   and acceptable response.
5. **Intervention:** an authorised, funded action changes the condition or opens
   another route.
6. **Migration:** a relieved condition exposes another constraint.
7. **Stress:** the new arrangement encounters provider failure, recession,
   political change or another declared test.
8. **Institutionalisation or reversal:** the arrangement becomes durable, is
   revised, or is abandoned based on evidence and legitimacy.

Every change creates a new version. Historical definitions, thresholds and
forecasts remain available so the project cannot rewrite its past accuracy.

### Condition migration

The existing thesis that a binding condition may migrate from money to
permission is one hypothesis, not a universal sequence. Other migrations may
include:

- affordability → delivery;
- availability → quality;
- capability → workforce capacity;
- price → privacy or hidden payment;
- national eligibility → cross-border recognition;
- provider access → monopoly dependence;
- material scarcity → ecological limit;
- formal access → comprehension and meaningful use.

The graph should show several candidate migrations and the evidence that would
distinguish them.

---

## 🤝 The public IF-THEN compact

A warning becomes useful only when it connects to a legitimate action contract.
The proposed compact is:

> **We commit to [ACTION] for [COHORT] in [PLACE] if [TRIGGER] is observed under
> [EVIDENCE RULE]. [OWNER] acts under [AUTHORITY] using [FUNDING]. [SAFEGUARDS]
> limit harm. [APPEAL] protects affected people. We review on [DATE], stop when
> [EXIT TEST], and publicly record any override.**

### Required fields

| Field | Required question |
|---|---|
| Objective | What protected outcome is this compact trying to preserve? |
| Scope | Which service, cohort, place and period does it cover? |
| Trigger | What observed combination activates consideration or action? |
| Evidence rule | Which source, lag, uncertainty and confirmation rule apply? |
| Action | What exactly happens, at what service level and for how long? |
| Owner | Which named role is operationally accountable? |
| Authority | What law, mandate or agreement permits the action? |
| Funding | Which pre-positioned resource makes the promise deliverable? |
| Participants | Which affected parties helped define and can review it? |
| Safeguards | What rights and harm ceilings cannot be traded away? |
| Appeal and remedy | How can a person contest an error and receive correction? |
| Alternatives | What other responses were considered and why were they not chosen? |
| Override | Who may override, for what reasons, and how is that made public? |
| Review | When and by whom are outcomes, harms and legitimacy reassessed? |
| Exit test | What ends, extends or redesigns the intervention? |

### Automation boundary

An automatic trigger may initiate only a reversible first response that is:

- explicitly authorised in advance;
- funded and operationally tested;
- proportionate to the observed condition;
- bounded in time and scope;
- subject to human appeal and public override review.

Coercion, surveillance, criminal sanction, rights restriction and irreversible
allocation decisions always require fresh human authority. The dashboard
itself has no decision power.

## 🧪 Worked hypothetical example

This is a fictional example for testing the protocol. Its thresholds are not
evidence-backed recommendations.

### Promise

> Adults displaced from the pilot region's accounts-processing sector can
> maintain housing, healthcare and a minimum household access margin while
> choosing a credible next pathway.

### Condition graph

```text
PROTECTED TRANSITION OUTCOME
IF
  affected-worker registry coverage passes
  AND displacement is verified without invasive monitoring
  AND (bridge income OR equivalent in-kind access) is deliverable
  AND healthcare continuity passes
  AND housing-loss hazard stays below the agreed ceiling
  AND at least two credible pathways are available
  AND participation is voluntary
  AND human casework and appeal are reachable
  AND support does NOT require surrendering unrelated privacy or labour rights
```

### Warning

```text
IF
  confirmed displacement rises for two reporting periods
  AND median re-employment time worsens
  AND replacement earnings fall for the same cohort
THEN
  the authorised reversible first response enters activation review
```

### Compact

- **Action:** activate the pre-funded bridge and continuity service for the
  scoped cohort.
- **Owner:** a named regional transition-service role, not `government` in the
  abstract.
- **Authority:** the explicit pilot mandate.
- **Safeguards:** data minimisation, voluntary pathway choice, non-retaliation,
  no automated denial and a protected alternative to retraining.
- **Appeal:** reachable human review with a published decision time.
- **Review:** affected-worker representatives examine coverage, exclusion,
  outcomes and harms on a fixed cadence.
- **Exit:** individual support ends only under the agreed stability test, while
  the compact itself ends, extends or changes after public review.

The example does not presume that retraining is the correct response. It makes
income stability, access and choice the outcome, then lets evidence and the
person's preferences shape the pathway.

## 🛤 Applying the protocol to different work

| Use | Required pattern |
|---|---|
| Capability promise | `[cohort] can [verb] [outcome] if [conditions]` |
| Forecast | `There is [probability] that [condition] reaches [state] by [date], conditional on [assumptions]` |
| Scenario | `If [assumptions], then [illustrated path]. No probability assigned.` |
| Decision | `Choose [reversible action] if [decision rule], unless [safeguard]` |
| Negotiation | `Party A provides [commitment] if Party B provides [commitment], with audit, remedy and exit` |
| Transition | `Move from [state] to [state] when readiness gates pass, not because the calendar advanced` |
| Warning | `If [leading conditions] move together under the evidence rule, begin [review or first response]` |
| Recovery | `Continue protection until [person-centred recovery test], then review harms and recurrence risk` |

### Negotiation example

> A provider receives a stable procurement route if it reports auditable cost,
> access, quality and worker-transition evidence. The public buyer guarantees
> only verified demand if the full agency and safeguard gates pass. Either party
> may exit under stated conditions, and affected users retain appeal and remedy.

This is reciprocal and testable. “Business should be generous” is neither.

## ⚖ Decision modes under uncertainty

The graph informs, but does not make, the decision. A legitimate authority can
choose among:

| Mode | Appropriate when |
|---|---|
| **Observe** | Evidence is weak and delay creates little additional harm |
| **Prepare** | Harm could be serious and preparation is low-cost, reversible and broadly useful |
| **Pilot** | Causal uncertainty is material and a bounded, ethical test can reduce it |
| **Activate** | The approved trigger and evidence rule pass, and delivery is ready |
| **Pause** | A hard safeguard, authority requirement or harm ceiling is breached |
| **Stop** | The intervention fails its exit or harm test, loses authority, or is dominated by a better option |

Precaution does not mean every uncertain risk triggers intervention. Innovation
does not mean every uncertain harm is acceptable. The decision record should
show the cost of action, inaction and delay, plus who carries each one.

## ✊ Participation and dissent safeguards

For each consequential condition graph:

1. Publish who selected the outcome, cohort and conditions.
2. Invite affected people to add missing nodes and challenge causal edges.
3. Preserve minority and dissenting models instead of forcing consensus.
4. Do not infer political beliefs or predicted behaviour from individual data.
5. Do not describe political organising as failure of communication.
6. Publish the strongest alternative explanation for each crisis pathway.
7. Give challenge submissions a visible status and dated resolution.
8. Test whether the message informs choice rather than merely increasing support
   for a preferred policy.
9. Keep an offline and low-data participation route.
10. Record whose evidence and priorities remain absent.

## ✅ Protocol validation tests

A public implementation should fail review if a reader cannot answer:

1. Who is supposed to be able to do what?
2. What standard, place and time does the claim cover?
3. Which conditions are required, alternative, prohibited or excepted?
4. Which condition is emerging or binding for which cohort?
5. Which statements are observed, derived, hypothesised, forecast, scenario,
   value choice, proposal or commitment?
6. Who authored and who approved each substantive claim?
7. What evidence, uncertainty and competing explanation support it?
8. What would change the conclusion?
9. Who can act, under what authority and with what funding?
10. How can an affected person refuse, appeal, obtain remedy or contest the
    model?
11. What ends the action?
12. How will the forecast and intervention later be scored?

Recommended comprehension tests should additionally confirm that readers do
not interpret instrumentation coverage as risk, a scenario as a forecast, a
global average as their cohort's result, or an agent proposal as Fernando's
view.

## ❓ Decisions requiring Fernando's approval

Fernando should explicitly approve, reject or revise:

1. `The IF Protocol` as the proposed name.
2. The expansion from capability and access to agency, durability and fairness.
3. The complete public grammar.
4. The condition layers, node types and logical operators.
5. The lifecycle, binding states and evidence grades.
6. The public IF-THEN compact and automation boundary.
7. The hypothetical examples and their tone.
8. The participation, dissent and validation requirements.
9. Whether the protocol becomes a public standard, an internal design tool, or
   an experiment submitted for external review.
