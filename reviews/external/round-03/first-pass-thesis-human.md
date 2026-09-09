---
id: round-03-first-pass-thesis-human
title: Blind Round 03 thesis and human-impact review
type: external-review-first-pass
status: submitted
provenance: independent-blind-agent-review
reviewer: Ren, external thesis and human-impact lane
reviewed_commit: f5b3b643e80e0f16d7dadd13805df6accf9526ed
reviewed_on: 2026-09-09
reviewed_with: exact-git-show-blobs
closure_authority: none
---

## Blind Round 03 review

Reviewed exact `f5b3b643e80e0f16d7dadd13805df6accf9526ed` blobs via `git show`. No prohibited reviews or other reviewers were read.

### R03-HUM-001 · P1 · Severe harms are averaged away

- **Location:** `preparation/lib/validate.mjs:155-174`; `preparation/schema/preparation-action.schema.json:311-320`
- **Counterexample:** Party A suffers action harm `1.0`; Party B suffers `0.01`. Inaction harms are `0.6` each. The reducer compares `1.01` against `1.2` and returns `action-appears-safer`, despite Party A’s maximal harm.
- **Consequence:** A severe, non-compensable harm can be offset by another party’s aggregate benefit. This contradicts `meta/abundance-transition-programme.md:110-112`.
- **Evidence:** Harm is summed globally as `severity_weight * likelihood`; the schema has no non-compensable flag, party-specific ceiling, or veto.
- **Smallest repair:** Apply per-party and non-compensable harm vetoes before aggregate comparison. Add the counterexample as a regression test.
- **Closure owner:** Preparation contract owner, with affected-party governance sign-off.

### R03-HUM-002 · P1 · A caller can self-certify necessity instead of consent

- **Location:** `preparation/lib/validate.mjs:24,510-521,852-857`; `preparation/fixtures/valid/round-03.register.json:895-915,2070-2080,2353-2369`
- **Counterexample:** Mark a burdened party `necessity-test-passed` and reference any `affected-party-testimony` naming that party. The validator treats this as a strong disposition without checking a necessity finding.
- **Consequence:** Emergency power can appear to clear the rights gate through a caller-set label, substituting assertion for consent or independently tested necessity.
- **Evidence:** The accepted fixture does this. Its disposition references unverified recipient testimony, while the separate necessity evaluation has no party binding.
- **Smallest repair:** Derive necessity status from a structured, independently reviewed necessity record bound to the party, scope, dissent, alternatives, expiry, and appeal. Never accept the status as caller input.
- **Closure owner:** Preparation validator owner plus independent rights reviewer.

### R03-HUM-003 · P2 · Known omitted groups vanish from the public claim ceiling

- **Location:** `paths/validate.mjs:61-66`; `paths/fixtures/australian-clerical-transition.synthetic.json:355-368,440`
- **Counterexample:** Temporary visa holders are explicitly inadequately represented because refusal may not be genuine, yet the generated ceiling broadly says “Australian employees” may transition through a genuinely rejectable option.
- **Consequence:** A burdened subgroup can reasonably read itself into a claim whose model explicitly excludes its power constraints.
- **Evidence:** `renderPublicClaimCeiling` uses only `outcome_scope`; it never renders `population_accounting.omissions`. `paths/tests/possible-path.test.mjs:34-36` accepts this fixture.
- **Smallest repair:** Append every material omission notice to the generated ceiling, narrow `WHO`, or block public disposition until the contradiction is resolved.
- **Closure owner:** Possible-path contract and public-communications owners.

### R03-HUM-004 · P2 · The first screen presents a derived estimate as “what the data show”

- **Location:** `dashboard/web/index.template.html:416,1319-1322,1350-1351`; `dashboard/snapshots/2026-09-08.r2.json:55-65,143-156`
- **Counterexample:** A reader scans the default first screen and sees the numeric result under “WHAT THE DATA SHOW.” Its `derived` class is inside a closed `<details>` block, and one input is a modelled estimate.
- **Consequence:** Readers can mistake derived arithmetic over modelled inputs for observation, defeating the promised observation/inference distinction.
- **Evidence:** The visible string at line 1350 omits epistemic class; line 1351 hides it in disclosure detail.
- **Smallest repair:** Put `[DERIVED FROM MODELLED ESTIMATE]` beside the visible value and make the section heading reflect the actual class.
- **Closure owner:** Dashboard UI and communications owners.

### R03-HUM-005 · P2 · The experiment denies the harms it later measures

- **Location:** `experiments/observatory-comparison/README.md:16-19,171-180,210-225`
- **Counterexample:** A directly affected worker sees a fictional displacement warning, experiences serious anxiety, or forms an irreversible action intention.
- **Consequence:** “Tests an interface, not people” and “no individual consequence” minimize participant risk. The protocol has stop lines but no explicit withdrawal, debrief, remediation, support, or adverse-event response.
- **Evidence:** The document itself lists anxiety, stigma, dignity harm, and irreversible intentions as measurable stop events.
- **Smallest repair:** State that the study tests interface effects on participants, then add informed consent, immediate withdrawal, debrief, support/referral, remediation, and adverse-event ownership before recruitment.
- **Closure owner:** Research protocol owner and independent ethics reviewer.

### R03-HUM-006 · P2 · The public primer universalizes candidate IFs

- **Location:** `communications/transition-field-guide.md:34-37,101-105`
- **Counterexample:** A self-directed learner may benefit from an offline tutor without an institutional appeal route. Conversely, every listed condition may hold while the model still fails to help.
- **Consequence:** The highest-salience explanation turns a contestable list into universal necessary conditions, before later admitting conditions may be enabling, correlated, alternative, or omitted.
- **Evidence:** “The valuable outcome exists only if” conflicts with the later open-world condition-role taxonomy.
- **Smallest repair:** Use “may depend on candidate conditions such as,” and move the non-exhaustive, non-necessary caveat into the one-minute explanation.
- **Closure owner:** Thesis owner and public-guide editor.

### R03-HUM-007 · P2 · Editorial emphasis is laundered as evidence

- **Location:** `communications/README.md:31-34`; `meta/abundance-transition-programme.md:171-172`
- **Counterexample:** Evidence strongly supports a minor gain but weakly suggests a catastrophic, concentrated harm. Evidence alone cannot decide prominence.
- **Consequence:** Editorial values, loss tolerance, and affected-party priorities can remain hidden behind “the evidence decides.”
- **Evidence:** The programme requires every value choice to name its maker, but this editorial choice names no authority or loss function.
- **Smallest repair:** Require a disclosed editorial loss function, affected-party input, and accountable decision owner for emphasis.
- **Closure owner:** Fernando as normative approver, advised by communications and affected-party reviewers.

### R03-HUM-008 · P2 · Competing-path enforcement permits a convenient singleton

- **Location:** `paths/schema/possible-path.schema.json:18,76,364-391`; `paths/validate.mjs:404-409`; `meta/round-03-deep-plan.md:346-361`
- **Counterexample:** The fixture selects in-role redesign as the sole competitor while macro-demand, policy/ownership, sector composition, measurement, and no-material-change accounts remain absent.
- **Consequence:** Calling one path “strongest” can create a compliant straw opponent and overstate discrimination.
- **Evidence:** The programme requires six candidate graphs, but the schema permits exactly one competing object and the validator checks only that its ID differs.
- **Smallest repair:** Require a competing-path registry or array covering all credible known accounts, with explicit omission reasons and discriminators.
- **Closure owner:** Possible-path methods owner.

## Explicit no-finding areas

- **P0:** None found.
- No direct claim that abundance, crisis, or displacement is inevitable.
- Scenario versus forecast is explicit in the current dashboard.
- The current dashboard displays no option, commitment, or authorised action.
- False and unknown path branches fail closed.
- Public release and operational authority are explicitly blocked.
- Higher-level programme text does enumerate credible causal alternatives; the defect is executable enforcement.

Tests were not run because the working tree is at another SHA and contains unrelated untracked work. Running them would not verify the reviewed commit.
