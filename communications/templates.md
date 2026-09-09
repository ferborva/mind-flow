---
id: public-update-templates
title: Public Update Templates
type: communications-proposal
status: proposed
provenance: commissioned-proposal
author: Ren
reviewer: Fernando Bordallo
created: 2026-09-08
updated: 2026-09-08
---

# Public Update Templates

> **Proposal status:** Ren, an AI agent, wrote these templates. They are not
> Fernando's opinion and require his approval before public use.

## 🦅 TL;DR

- Each template uses the same seven-part evidence contract.
- Replace every bracketed field. Write `Unknown` rather than deleting an
  unanswered field.
- Every example is fictional. `Harbourvale`, `Aster Systems`, `Bridge Service`
  and all figures, institutions, laws and events below do not represent real
  people, places, organisations or policy.
- Audience variants may change assistance, language and order. They may not
  change facts, uncertainty, trigger status or claim class.

---

## 🧾 Shared evidence block

Attach this block to every update:

```markdown
**Observed:** [measure, value, cohort, place, period, source, vintage,
uncertainty]

**Affected:** [who appears affected, distribution, who is missing]

**Inferred:** [interpretation, confidence, strongest competing explanation]

**IF changed:** [condition ID and name, scope, previous state → current state,
evidence grade]

**Action and owner:** [no action | investigate | prepare | activate | pause |
recover], [named owner], [authority], [help or appeal]

**Falsifier:** [specific evidence that would weaken or reverse the reading]

**Next check:** [date or event, expected evidence, treatment of delay]
```

Required labels:

```text
EPISTEMIC: [Observed | Derived | Hypothesis | Forecast | Scenario |
Value choice | Proposal | Commitment | Unknown | Contested | Correction]

PROVENANCE: [Fernando, captured | Fernando, endorsed | External source |
Ren or agent proposal | Participant evidence | Institutional commitment]
```

## 1. 📍 Baseline update

### Use when

Establishing the first scoped observation before interpreting direction or
setting a trigger.

### Template

```markdown
# [OBSERVED] Baseline: [outcome] for [cohort/place], [period]

**Current reading:** [plain-language observation]. This is a starting point,
not evidence of improvement, deterioration or causation.

[Shared evidence block]

## What this baseline can answer

- [Supported descriptive question]
- [Supported comparison]

## What it cannot answer

- [Causal or distributional limit]
- [Missing cohort, measure or period]

## Positive horizon

[Which valuable outcome would improve if the relevant IFs move well?]

## Possible harm

[Which outcome could deteriorate, for whom?]

## Participate or challenge

[Evidence challenge, lived-context or accessibility route]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [OBSERVED] Baseline: continuity access for Harbourvale records clerks,
> January
>
> **Current reading:** 82% of 1,000 fictional registered participants could
> reach the defined housing, energy, primary-care and connectivity floor during
> January. The fictional survey uncertainty is plus or minus 3 percentage
> points. This is a baseline, not a trend and not an estimate of AI impact.
>
> **Affected:** The result covers registered records clerks in Harbourvale. It
> does not represent unregistered workers, contractors or other regions.
>
> **Inferred:** No causal interpretation. A possible future hypothesis is that
> workflow automation affects household continuity through hours and earnings.
> Cost-of-living change is a competing explanation.
>
> **IF changed:** `household-continuity` moved from `defined` to `baselined`.
> Binding state remains unknown. Evidence grade is descriptive observation.
>
> **Action and owner:** No activation. The fictional Harbourvale Transition
> Office owns the next measurement under the imaginary Pilot Charter. Questions
> can be submitted through a fictional public review route.
>
> **Falsifier:** Not applicable to the descriptive baseline. A later claim of
> deterioration would be weakened if complete data remains within uncertainty
> of 82%.
>
> **Next check:** 15 March, when fictional February records and non-registration
> analysis are expected.

### Do not

- label a single baseline green, safe or successful;
- infer a trend from one period;
- infer cause from the cohort definition;
- omit people outside the registry.

---

## 2. ⚠️ Warning update

### Use when

A leading or confirming condition changes materially, but before or at a public
warning threshold. A warning does not imply that an action is authorised.

### Template

```markdown
# [OBSERVED + HYPOTHESIS] Warning review: [condition], [scope]

**Current reading:** [what crossed or moved]. [Trigger status]. [Immediate
action or explicit no-action statement].

[Shared evidence block]

## Why this may matter

[Mechanism, clearly labelled hypothesis]

## Why this may be wrong

[Strongest competing explanation, data limit and false-alarm risk]

## What happens now

[Investigation, preparation or authorised response, owner, service level]

## What you should do

[Cohort-specific reachable action, including `nothing now` where honest]

## Positive path still open

[Conditions under which the outcome stabilises or improves]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [OBSERVED + HYPOTHESIS] Warning review: household continuity,
> Harbourvale records clerks
>
> **Current reading:** Fictional continuity coverage moved from 82% plus or
> minus 3 points to 77% plus or minus 4 points in February. The imaginary rule
> requires two confirmed periods below 80%, so the activation trigger has not
> passed. No immediate household action is required.
>
> **Affected:** Registered records clerks in Harbourvale. Contractor data is
> incomplete and no individual risk prediction has been made.
>
> **Inferred:** Reduced paid hours may be contributing. A fictional energy-bill
> change and a two-day benefit-system outage are strong competing explanations.
>
> **IF changed:** `household-continuity` moved from `not-binding` to
> `emerging`. Evidence remains an observed association, not causal.
>
> **Action and owner:** The fictional Transition Office begins data-quality and
> service-readiness review. No payment or deployment restriction activates.
> Registered participants can check their fictional support record or request
> human review.
>
> **Falsifier:** Complete March coverage at or above 80%, or decomposition
> showing the movement came entirely from the corrected system outage.
>
> **Next check:** 15 April.

### Do not

- use a siren, countdown or pulsing crisis treatment;
- say `triggered` without naming which trigger and action;
- imply affected people should make irreversible decisions;
- suppress the strongest mundane explanation.

---

## 3. 🛠 Correction update

### Use when

A figure, definition, method, label or implication in a prior release was
materially wrong.

### Template

```markdown
# [CORRECTION] We got [claim] wrong

**The correction:** We previously said [exact prior claim]. That was wrong
because [error]. The corrected statement is [new claim].

**What changes:** [conclusion, condition state, action or forecast impact]

**What does not change:** [claims that remain supported]

[Shared evidence block]

## How the error happened

[Plain-language method and process failure]

## Repair

- [Data or code correction]
- [Communication and reach correction]
- [Test or governance change]

## People affected by the error

[Who may have acted, worried or been denied service, plus remedy]

## Original record

[Permanent link to the preserved original statement]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [CORRECTION] We used the wrong registration denominator
>
> **The correction:** We previously reported fictional continuity coverage of
> 74%. That was wrong because 80 duplicate registrations remained in the
> denominator. The corrected estimate is 79% plus or minus 4 points.
>
> **What changes:** The fictional two-period activation rule no longer passes.
> The scheduled activation is paused pending human review.
>
> **What does not change:** February's result remains below the January
> baseline, and the data-quality investigation continues.
>
> **Action and owner:** The fictional evidence owner must rebuild the cohort
> file. The Transition Office must contact every person who received an
> activation notice. No person loses support already provided because of this
> correction.
>
> **Falsifier:** An independent deduplication showing the original denominator
> was valid would reopen the decision.
>
> **Next check:** 22 April, whether or not the rebuild is complete.

### Correction rules

- Say `wrong`, not `clarified`, when the statement was wrong.
- Give the correction at least the reach and prominence of the error.
- Preserve the original with a correction banner.
- State whether anybody lost access, money, time or trust because of the error.
- Correct downstream forecasts, charts and decisions, not only the source file.

---

## 4. 🌫 Uncertainty update

### Use when

Uncertainty or missingness is itself decision-relevant, including when no honest
headline direction is available.

### Template

```markdown
# [UNKNOWN] We cannot yet tell whether [question]

**Current reading:** [what is known]. [What remains unknown]. [Why it matters
now].

[Shared evidence block]

## Sources of uncertainty

| Source | Direction or effect | Can it change the conclusion? | Learning step |
|---|---|---|---|
| Sampling | [...] | yes/no/unknown | [...] |
| Missing population | [...] | yes/no/unknown | [...] |
| Definition | [...] | yes/no/unknown | [...] |
| Model or imputation | [...] | yes/no/unknown | [...] |
| Causality | [...] | yes/no/unknown | [...] |
| Data age | [...] | yes/no/unknown | [...] |

## Decision under uncertainty

[Observe, prepare, pilot, pause or no action, with reason]

## What would resolve enough uncertainty

[Evidence threshold, not a promise of certainty]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [UNKNOWN] We cannot yet tell whether automation reduced paid hours
>
> **Current reading:** Fictional paid hours fell in the registered cohort after
> Aster Systems introduced a new workflow. Employer adoption timing is reported
> only at division level, 28% of contractor records are missing, and energy
> prices changed in the same period. The evidence does not isolate an AI effect.
>
> **Affected:** The uncertainty is greatest for contractors and people who left
> the registry. Their outcomes may be systematically different.
>
> **IF changed:** `ai-attribution` remains `hypothesised`, binding unknown,
> evidence grade observed association.
>
> **Action and owner:** Prepare the already approved service-readiness drill
> because it is useful across shocks. Do not attribute losses publicly or
> restrict deployment from this result.
>
> **Falsifier:** A credible comparison showing the same hours decline before
> adoption or in non-adopting teams would weaken the AI explanation.
>
> **Next check:** after fictional payroll and adoption records are independently
> linked, no earlier than 30 May.

---

## 5. 🎯 Forecast resolution

### Use when

The stated horizon of a previously archived probabilistic forecast arrives.
Resolve every forecast, including forgotten, inconvenient and ambiguous ones.

### Template

```markdown
# [FORECAST RESOLUTION] [Event] by [horizon]

**Issued:** [date]
**Forecast:** [probability] that [precise event] by [horizon]
**Model or reference class:** [method]
**Outcome:** [occurred | did not occur | indeterminate]
**Score:** [pre-registered score]
**Baseline score:** [naive or reference forecast]

**Plain-language result:** [What happened and what one forecast can and cannot
show]

[Shared evidence block adapted for resolution]

## Why the forecast succeeded or failed

[Attribution with uncertainty, including luck and data revision]

## Calibration record

[Performance across comparable resolved forecasts. Never claim calibration
from one result.]

## Model change

[Keep, revise or retire, plus the rule applied]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [FORECAST RESOLUTION] Continuity coverage below 75% by June
>
> **Issued:** 15 March
> **Forecast:** 60% chance that fictional Harbourvale continuity coverage would
> be below 75% in June
> **Model:** archived fictional cohort-flow model version 0.2
> **Outcome:** occurred, revised June coverage was 73% plus or minus 3 points
> **Score:** Brier score 0.16 for this binary forecast
> **Baseline score:** the archived fictional 35% reference forecast scored
> 0.4225
>
> **Plain-language result:** The event occurred and this forecast outperformed
> its stated reference for this case. One correct result does not establish
> calibration or validate the model's causal explanation.
>
> **IF changed:** `household-continuity` is observed below the forecast event
> boundary. Its causal relationship to automation remains contested.
>
> **Action and owner:** Resolution creates no new authority. The separate
> fictional action compact determines support.
>
> **Falsifier:** A later source revision above 75% changes the event resolution
> and score.
>
> **Next check:** quarterly calibration after at least the pre-registered number
> of comparable forecasts resolves.

### Do not

- resolve only forecasts that look good;
- treat one correct binary call as calibration;
- change the event definition after seeing the outcome;
- use the forecast result as proof of its causal story;
- let resolution itself activate an unauthorised action.

---

## 6. 🚦 Action activation

### Use when

A previously authorised, funded and rehearsed action contract passes its public
evidence rule.

### Template

```markdown
# [COMMITMENT] [Action] activates for [scope]

**Activation:** [action] begins [date/time] for [cohort/place].

**Why:** [trigger] passed under [confirmation and uncertainty rule].

**Owner and authority:** [named role], [authority], [funding]

**Service level:** [what eligible people receive, how and by when]

**Safeguards:** [rights, privacy, alternatives, harm ceilings]

**Appeal and remedy:** [route, human decision time, remedy]

[Shared evidence block]

## What did not activate

[Related powers or actions that remain unauthorised]

## Exit and review

[Individual exit, programme exit, review date, public override process]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [COMMITMENT] Fictional Bridge Service activates for registered
> Harbourvale records clerks
>
> **Activation:** The fictional Bridge Service begins on 1 July for registered
> participants whose continuity assessment is below the agreed floor.
>
> **Why:** Fictional continuity coverage was below 75% in two independently
> checked releases, and the imaginary activation compact's data-quality test
> passed.
>
> **Owner and authority:** The fictional Service Director acts under the
> imaginary Harbourvale Pilot Charter using its pre-positioned fund.
>
> **Service level:** A named human case contact responds within two fictional
> business days. Eligible participants can choose bridge income, equivalent
> in-kind continuity support or a mixed route.
>
> **Safeguards:** Participation is voluntary. No automated denial, unrelated
> data use, employment penalty or compulsory retraining is permitted.
>
> **Appeal and remedy:** A fictional independent reviewer issues a human
> decision within five fictional business days. An incorrect denial is
> backdated.
>
> **What did not activate:** No deployment restriction, tax, sanction or
> political emergency power was authorised.
>
> **Exit and review:** Individual support ends only under the fictional
> stability test or voluntary withdrawal. The compact is reviewed on 30
> September and can be paused if privacy or exclusion limits fail.

### Do not

- announce action before operational confirmation;
- name `government` or `business` as the owner;
- omit people who are eligible but missing from the registry;
- imply a warning itself created authority;
- hide what remains unauthorised.

---

## 7. 🌱 Recovery update

### Use when

The protected condition and lived outcomes improve after activation or a shock.
Recovery is a measured state, not a celebratory declaration.

### Template

```markdown
# [OBSERVED + COMMITMENT] Recovery review: [outcome], [scope]

**Current reading:** [which conditions recovered, over what periods]. [Which
outcomes remain below baseline or unknown].

[Shared evidence block]

## What improved

[Coverage, quality, time, security, choice and distribution]

## What remains harmed or fragile

[Cohorts, recurrence risk, appeals, hidden costs]

## Contribution of the response

[Causal evidence or explicit uncertainty. Do not claim the intervention caused
recovery from a before-and-after chart alone.]

## Continue, adapt or end

[Action by owner, individual safeguards, programme exit and review]

## Lessons and compensation

[Failed assumptions, preventable harm, remedy and model change]
```

### Fictional example

> **FICTIONAL EXAMPLE**
>
> # [OBSERVED + COMMITMENT] Recovery review: Harbourvale continuity access,
> September
>
> **Current reading:** Fictional coverage exceeded the 80% recovery boundary in
> August and September. Housing stability remains below its January baseline,
> contractor coverage is uncertain and nine appeals are unresolved. Recovery
> is partial.
>
> **Inferred:** The Bridge Service may have contributed to continuity, but an
> improvement in fictional energy costs and new hiring occurred simultaneously.
> The current design does not isolate effects.
>
> **IF changed:** `household-continuity` moved from `binding` to `relieved` for
> registered employees. It remains unknown for contractors.
>
> **Action and owner:** The Service Director continues individual support until
> each person's stability test or voluntary exit. New automatic enrolment
> pauses while missing-contractor outreach is independently reviewed.
>
> **Falsifier:** Revised data below the boundary, recurrence next period or
> evidence of unresolved housing loss would reverse the partial recovery
> reading.
>
> **Next check:** 31 October, with appeal, housing and contractor results.

### Do not

- declare victory from an average crossing;
- end individual protection solely because a population average recovered;
- attribute recovery to the intervention without a credible design;
- erase failed assumptions or uncompensated harm;
- stop reporting immediately after the headline turns positive.

---

## 🗣 Audience adaptation shell

Build variants only after the common evidence block is locked.

```markdown
## What this means for [audience]

**Same current reading:** [link or exact immutable summary]

**What you can do now:** [reachable role-specific action or `nothing now`]

**What support exists:** [service, owner and expected response]

**What choice remains yours:** [options, refusal, alternatives]

**How to challenge or appeal:** [route]
```

### Variant integrity checklist

- Same numbers and denominators?
- Same uncertainty and data age?
- Same epistemic and provenance labels?
- Same trigger and activation status?
- Same competing explanation?
- Same forecast probability?
- Same correction history?
- Same next check?

Any `no` means the variant is a different claim and must be reviewed as one.

## ❓ Decisions requiring Fernando's approval

1. Template fields and required ordering.
2. Fictional example tone and complexity.
3. Correction symmetry requirements.
4. Forecast resolution and scoring language.
5. Activation and recovery safeguards.
