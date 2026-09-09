---
id: australia-evidence-bridge-protocol
title: The Bridge Study
subtitle: A prospective design for observing when AI deployment changes work, continuity and agency
type: pilot-protocol-proposal
status: proposed
provenance: commissioned-proposal
author: ren
reviewer: fernando-bordallo
created: 2026-09-09
updated: 2026-09-09
---

# The Bridge Study

> **Proposal status:** This is an agent-authored acquisition and evaluation
> protocol. It is not ethics approval, a recruitment plan, statistical advice or
> evidence that AI has caused an Australian labour-market outcome.

## 🦅 TL;DR

- **The pilot should acquire one missing bridge, not manufacture another
  composite index:** exact workplace deployment → actual task redesign → worker
  transition → household continuity → experienced agency.
- Official sources can define the population, locate broad changes and test
  whether a site resembles the wider labour market. None repeatedly observes
  the whole bridge for the same people.
- The minimum study is a prospective, matched employer-worker-household panel
  registered before deployment. A phased rollout can support a bounded
  difference-in-differences estimate if its assumptions survive.
- Every IF evolves through immutable events. A new observation may change an
  evidence state, a condition state, a forecast, an eligible action, all four or
  none. The system must calculate and explain each difference.
- No dashboard result can withdraw a service, reduce an entitlement, rank a
  person for enforcement or certify that waiting is safe.

---

## 🌉 The missing bridge

Australia has valuable pieces of the transition picture:

- [Jobs and Skills Australia](https://www.jobsandskills.gov.au/studies/generative-artificial-intelligence-capacity-study)
  models task exposure and distinguishes exposure, adoption and adaptation.
- The [ABS Business Characteristics Survey](https://www.abs.gov.au/statistics/industry/technology-and-innovation/characteristics-australian-business/2024-25)
  reports business AI use by industry and size. Its question does not measure
  intensity or worker-level treatment.
- [NERO](https://www.jobsandskills.gov.au/data/nero) estimates employment for
  355 occupations across 88 SA4 regions each month. It is experimental,
  smoothed and revision-prone, particularly for smaller series.
- [Longitudinal Labour Force](https://www.abs.gov.au/statistics/microdata-tablebuilder/available-microdata-tablebuilder/longitudinal-labour-force-australia),
  [L-LEED](https://www.abs.gov.au/about/data-services/data-integration/integrated-data/linked-employer-employee-dataset-leed-and-longitudinal-leed-l-leed),
  [PLIDA](https://www.abs.gov.au/statistics/data-integration/integrated-data/person-level-integrated-data-asset-plida)
  and [HILDA](https://melbourneinstitute.unimelb.edu.au/hilda) provide different
  longitudinal views of work, income, services, households and wellbeing.
- The [2025 General Social Survey](https://www.abs.gov.au/statistics/people/people-and-communities/general-social-survey-summary-results-australia/2025)
  measures direct forms of financial stress and service difficulty.

**These sources observe different people, units, places, periods and
constructs. Proximity on a dashboard does not create a valid join.**

The missing observation is:

```text
the exact deployment event
  → the exact workflow and task bundle changed
  → the same worker's hours, earnings, security and discretion changed
  → the same household retained or lost practical access to essentials
  → the affected person gained or lost meaningful options, voice and remedy
```

Every arrow is an empirical IF. The Bridge Study is designed to observe those
arrows without assuming the direction is beneficial or harmful.

---

## 🎯 The bounded research question

> **For participating Australian workplaces employing one of the five scoped
> clerical cohorts, what happens to worker and household outcomes after a
> verified AI-enabled workflow change, compared with credible contemporaneous
> workers not yet receiving that change?**

The study must accept at least five possible answers:

1. measured capability and worker agency both improve;
2. capability improves while agency or continuity deteriorates;
3. no material outcome changes within the study horizon;
4. effects differ materially by worker, household, workplace or implementation;
5. the design cannot distinguish the deployment effect from credible rivals.

The fifth answer is not failure. It is protection against a false story.

## 🧪 Prospective design

### Unit and treatment

The treatment is not “AI exposure” or “the employer uses AI”. It is a verified
deployment event containing:

- site and accountable owner;
- deployment date and rollout sequence;
- model, product and material version;
- named workflow and task share intended to change;
- affected job families and eligibility rule;
- permission, monitoring, override and human-review settings;
- worker consultation, consent and refusal route;
- training, paid learning time and available non-AI route;
- expected output, quality, workload and distributional effects;
- rollback condition and retained pre-deployment baseline.

Workers whose access is only informal or self-directed are recorded as a
different exposure state. They are not silently placed in either group.

### Comparison

Prefer an ethical phased rollout in which operationally comparable teams begin
at different registered times. Estimate the change for treated workers against
the contemporaneous change for not-yet-treated workers using a preregistered
difference-in-differences model and event-study diagnostics.

If rollout timing is chosen because a team is already improving or declining,
the comparison is not exchangeable. The study must then narrow the inference,
use a justified matching strategy or remain descriptive. It must test:

- pre-trends and anticipation;
- treatment crossover and informal use;
- attrition and missing outcomes by group;
- spillovers between teams;
- concurrent restructuring, outsourcing or demand shocks;
- changes in management, targets, pay or staffing;
- classification and measurement breaks.

Negative controls should include outcomes the stated mechanism should not move
within the horizon and workers or workflows not exposed to the deployment. A
failed negative control weakens the causal account rather than being hidden in
an appendix.

### Outcomes and estimands

The first primary estimand should be selected with affected workers before
recruitment. One defensible candidate is the average within-person change in
the desired-hours gap at the first registered post-deployment quarter, compared
between treated and not-yet-treated workers.

Secondary outcomes remain separate:

| Layer | Candidate outcome | Why it cannot be collapsed |
|---|---|---|
| Work | Paid hours, real earnings, employment state, involuntary exit, workload | More output can coexist with less pay, security or time |
| Task | Time by task, error and override rate, rework, task creation and removal | Tool use does not prove useful redesign |
| Continuity | Housing, food, energy, transport, primary healthcare and connectivity access | Spending is not practical access |
| Agency | Comprehension, influence, refusal, switching, appeal, discretionary time and credible alternatives | Agency is not satisfaction and is not one unvalidated score |
| Distribution | Outcomes by income, disability, caring status, contract, age, gender, place and other governed cohorts | An average cannot describe who carries the loss |
| Ecology | Attributable energy, water, materials, emissions, waste and local burden within a declared boundary | Infrastructure burden has different units and affected populations |
| Service value | Quality-adjusted output, wait time, price, accessibility and user remedy | Labour saving is not public value by itself |

**An aggregate improvement cannot override a severe person-level harm.** Each
hard-gate harm is reported as a distribution and a count under privacy-safe
release rules, never netted against productivity or average wellbeing.

Do not set the sample size from a rhetorical round number. Before recruitment,
declare the primary outcome, smallest effect worth detecting, clustering unit,
expected intra-cluster correlation, baseline correlation, attrition, subgroup
claims, multiplicity rule and acceptable uncertainty. Simulate power and
precision under plausible missingness and treatment crossover. If recruitment
cannot meet the design, narrow the claim before seeing outcomes.

---

## 🧭 Four evidence roles

| Role | What belongs here | What it may change |
|---|---|---|
| **Context** | JSA exposure, ABS business AI use, NERO, prices and service context | Which questions and places deserve study |
| **Outcome anchor** | Longitudinal Labour Force, L-LEED, PLIDA, HILDA and direct service records | Whether site changes resemble wider outcomes, with scope caveats |
| **Transition bridge** | Verified deployment plus matched worker, household and task observations | A bounded association or causal estimate if the registered design survives |
| **Response reality** | Capacity, funding, authority, delivery time, appeal, failure and ecological stress tests | Whether an action can be rehearsed or considered by a lawful authority |

The [ANAO audit of 2024-25 performance statements](https://www.anao.gov.au/work/performance-statements-audit/performance-statements-of-major-australian-government-entities-outcomes-of-2024-25-audit-program)
shows why response reality needs its own evidence. An aggregate Services
Australia timeliness result was dominated by automated Health work, which
accounted for 98.8 per cent of included work. A passing headline can therefore
mask the capacity that a particular protection would actually require.

The [2026 AEMO Integrated System Plan](https://www.aemo.com.au/energy-systems/major-publications/integrated-system-plan-isp)
also makes data-centre demand a material scenario and sensitivity. That is
system-planning evidence, not a measurement of one AI model's footprint or a
proof that household bills changed because of AI.

---

## 🔀 IF evolution is the decision spine

Each IF is an immutable proposition version plus an append-only event stream.
Allowed material events include:

```text
evidence-added → evidence-challenged → definition-revised → scope-changed → expired
```

Other events can record threshold adoption, contradiction, split, merge,
satisfaction, failure, dispute, withdrawal and supersession. Every event must
answer:

1. What exact proposition changed?
2. Did its scope, definition, observation or evidence quality change?
3. Did its five-valued truth state change: `true`, `false`, `unknown`, `stale`
   or `conflicted`? Out-of-scope or not-applicable is a scope/lifecycle
   disposition, not a predicate truth value.
4. Which possible paths gained or lost compatibility?
5. Which forecasts require reissue or invalidation?
6. Which actions became eligible, ineligible or unchanged?
7. Who can challenge this event, by when and through which route?

No event inherits authority from the evaluator. A technically valid condition
can still lack empirical truth, a probability, an action authority or public
approval.

### Action ladder

- `watch_if`: collect a named observation because earlier knowledge could
  change a legitimate decision.
- `prepare_if`: build reversible capacity before a threshold is crossed.
- `act_if`: an accountable authority considers a proportionate intervention.
- `pause_if`: stop expansion while a hard-gate harm or missing safeguard is
  examined.
- `reverse_if`: roll back a reversible intervention under a registered failure.
- `recover_if`: restore a continuity floor or remedy harm after failure.
- `graduate_if`: retire temporary support only after durable outcomes and exit
  protections pass.

These are eligibility states, not commands. The same observation can support
watching while leaving action ineligible.

---

## 🛡️ Rights, privacy and non-use

The Bridge Study must be co-governed by affected workers and reviewed for
privacy, ethics, employment law, Indigenous data governance and statistical
disclosure before recruitment.

Participation cannot be a condition of work, promotion, training, income
support or access to a service. Individual responses cannot be returned to an
employer for performance management. A service cannot be withdrawn because a
condition, model or forecast says a person or place is “safe”.

Publish only privacy-safe aggregates with denominator, missingness, precision,
revision and suppression visible. Preserve dissent about the outcome,
threshold, interpretation and proposed response.

## ✅ Stage gates

| Gate | Pass only if | Failure consequence |
|---|---|---|
| Scope | Cohort, site, task, geography, period and comparison are exact | Narrow or stop |
| Co-governance | Affected workers can change definitions and record dissent | Do not recruit |
| Measurement | Instruments show content validity, test-retest behaviour and acceptable burden | Keep construct unmeasured |
| Identification | Timing, pre-trends, spillovers and negative controls support the bounded design | Use descriptive language only |
| Precision | Simulated and realised precision support the registered estimand | Suppress or widen scope without changing outcome |
| Linkage | Join keys, consent, linkage error and unit compatibility pass | Keep sources side by side, not linked |
| Action | Authority, funding, capacity, safeguard, appeal and exit test exist | No operational action |
| Ecology | Named lifecycle boundary and material burdens are assessed | Keep outcome unsupported |
| Public comprehension | Readers distinguish observation, inference, forecast and authority | Redesign and retest |

## 📆 First 12 weeks

1. **Weeks 1-2: co-design and preregistration.** Select one deployment, one
   primary estimand, rival explanations, non-use rules and affected-party
   governance. Request the needed restricted-data access.
2. **Weeks 3-4: instrument and linkage feasibility.** Cognitive-test the worker
   and household instruments. Audit classification, denominator, consent,
   privacy, precision and linkage failure modes.
3. **Weeks 5-8: retrospective baseline only.** Reconstruct pre-deployment work,
   household and site outcomes. Do not inspect post-treatment estimates while
   changing the model.
4. **Weeks 9-12: shadow collection and operational rehearsal.** Run the data
   pipeline, condition evolution and false-warning tabletop without public
   alerts or service changes.

At week 12, proceed only if the data can observe the treatment and primary
outcome, workers judge the constructs recognisable, the comparison survives
its first diagnostics, and at least one reversible preparation can be tested
within the signal lag.

## 🗣️ What the public can be told now

> Australia can already see where AI may affect tasks and where labour-market
> or household conditions are changing. We cannot yet tell whether AI caused
> those changes for a particular group. The next step is to observe real
> deployments and the same people's outcomes over time, with affected workers
> helping define agency, harm and what should happen next.

That sentence is less dramatic than a crisis dial. It is also a stronger door
to early action because it tells people what is known, what is missing and what
we are doing about it.
