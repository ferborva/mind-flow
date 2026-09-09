---
id: observatory-comparison-protocol
title: Observatory public-instrument comparison
type: experiment-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren
requested_reviewer: Fernando Bordallo
adoption_status: not-adopted
created: 2026-09-08
updated: 2026-09-09
authority: none
---

# Observatory public-instrument comparison

> **AGENT-PROPOSED RESEARCH PROTOCOL. NOT PREREGISTERED OR APPROVED.** This
> design tests how people respond to an interface. It creates no operational
> warning, but participants may experience anxiety, stigma, perceived pressure,
> false reassurance or altered intentions. Affected-party, research-ethics,
> accessibility, privacy and statistical review must occur before recruitment.

## Decision first

The Observatory should not earn trust by looking more advanced than a normal
statistical release. It should earn a bounded role only if it helps people
understand uncertainty, conditions, authority and choices without increasing
dangerous inference, anxiety, stigma or false reassurance.

Run a balanced 2×2 randomised comparison of interface and facilitation:

1. **Conventional statistical release, self-serve:** a concise table and explanatory note.
2. **Conventional release plus facilitated deliberation:** the same release followed by a
   neutral, scripted discussion.
3. **Observatory, self-serve:** the same facts rendered through the IF, path,
   action-boundary and evidence views without facilitation.
4. **Observatory plus identical deliberation:** the same facts rendered through
   the IF, path, action-boundary and evidence views, followed by the identical
   discussion used in arm 2.

Every arm receives the same facts, uncertainty, scope, source, decision context,
correction, section order and planned viewing time. The conventional and Observatory visual
systems are the treatment. Added facts, urgency, recommendations, examples,
facilitator time or omitted boundaries are protocol violations. Perceived
authority and emotional response are measured outcomes, not assumed parity.
The Observatory may lose. If facilitated deliberation provides the benefit without the interface,
prefer the simpler instrument or narrow the Observatory to provenance and
forecast memory.

The two preregistered primary contrasts should be Observatory versus
conventional release within self-serve use, and Observatory versus conventional
release within facilitated use. Secondary contrasts estimate facilitation
within each interface. The interface-by-facilitation interaction tests whether
the Observatory helps only when a trained person explains it. Do not describe a
self-serve effect from a facilitated contrast.

## Executable proposal boundary

`fixtures/manifest.synthetic.json` binds all four proposed arms to the same
content-addressed fact pack and outcome contract. Each arm binds a typed
instrument specification. The two deliberation arms also bind the same typed
script bytes. `validate.mjs` checks inner artifact types and IDs, the balanced
2×2 allocation, exact claim and condition coverage, source JSON pointers,
retained bytes, the comparator set and all six complete safety stop lines.

This proves only **declared input binding**. It does not prove that a renderer,
facilitator or deployed interface presented the inputs faithfully. Rendered
fact parity requires captured browser and assistive-technology outputs plus an
independent comparison that this prototype does not perform.

Round 05 adds a bounded template-parity prototype under `rendered/`. It projects
the exact shared fact pack into conventional and Observatory self-serve HTML,
then verifies every marked-up material item, five-state meaning, forecast
boundary, authority boundary, source binding and shared planned 480-second
viewing time. It does not verify computed visibility, clipping, reading order,
contrast, zoom or assistive output. The timer is inactive. Comprehension remains
unassessed and recruitment remains blocked.

The manifest pins the coherent seven-artifact Round 4 pre-projection core and
runs its independent assessor. The shared fact pack reproduces its exact active
condition definition, WHO + VERB + OBJECT + STANDARD + PERIOD, observation
scope, evidence state and evaluation receipt. The complete source bytes and
every arm's fact-pack bytes are content addressed. Copied IDs or resealed prose
cannot substitute for those joins.

The mechanical rule currently computes `true` for the synthetic fixture. That
does not establish empirical truth. The fact pack preserves a five-state legend
for `true`, `false`, `unknown`, `stale` and `conflicted`, with a distinct public
meaning and next step for each. A separate 62% synthetic forecast concerns a
future threshold event. Probabilities, including zero or one, cannot set the
current IF state.

Each state meaning and next step is an exact, hash-bound projection of that
state's branch in the possible-path artifact. The path claim is the artifact's
exact public claim ceiling and separately binds its competitor set, epistemic
contract and outcome scope. A valid pointer cannot lend authority to different
prose, and swapping two state meanings fails validation.

The two deliberation arms bind the same script bytes. The script cannot add
facts, urgency, probability, condition state or action advice. Presentation may
change comprehension, but it cannot change facts, truth or authority.

The version 1 manifest is deliberately unable to approve recruitment. Its
schema fixes ethics and privacy review to `pending`, participant data collection
to `disabled`, recruitment to `blocked`, and every authority or truth effect to
`none`. A later operational protocol needs a separately reviewed schema and an
external approval verifier. Editing this manifest cannot create that authority.
The structured protocol also records that power, smallest worthwhile effect,
multiplicity, missingness, attrition, contamination and assignment
implementation are not yet specified. Until those become independently
reviewed, `analysis_ready` remains false.

Aesthetic preference is descriptive only. Perceived authority and uncalibrated
confidence are safety or calibration harms, not success endpoints. The sole
proposed primary endpoint remains complete unaided boundary reconstruction.

## Instrument hypotheses

### H1: conditional comprehension

> **IF the Observatory makes every material IF, uncertainty and authority
> boundary visible without adding cognitive overload, THEN participants should
> more often reconstruct the claim's scope and identify what would change it.**

The discriminating observations are the two preregistered within-facilitation
contrasts in complete, unaided reconstruction of a held-out public claim.
Failure in self-serve use means retire or narrow the public condition-map claim
for self-serve use, even if the facilitated version performs better.

### H2: decision-boundary comprehension

> **IF the distinction among observation, forecast, option, commitment and
> action is useful, THEN participants should more accurately identify which
> actor could do what, under which authority, and which choices remain open.**

The discriminating observation is performance on novel vignettes that change
only evidence and authority state. Agreement with the project's preferred
future is not an outcome.

### H3: challenge and correction

> **IF visible history and falsifiers create contestability, THEN participants
> should find a material correction or challenge route without becoming more
> certain that the latest record is true.**

The discriminating observation combines route-finding success with a separate
confidence-calibration measure. Finding the route while treating a checksum as
publisher authentication is a failure, not partial success.

### A1: overload and aesthetic authority

> **IF the Observatory's density or mathematical aesthetic manufactures
> authority, THEN it may reduce comprehension or increase confidence unsupported
> by the evidence.**

This adverse hypothesis receives equal testing priority. It is favoured if the
interface raises confidence without raising accuracy, increases completion time
without added understanding, or creates more dangerous inferences.

### A2: warning-induced harm

> **IF transition framing primes threat, blame or inevitability, THEN it may
> increase anxiety, stigma, fatalism, rushed decisions or false reassurance.**

This is tested directly and by open-ended interviews. A participant declining
the transition premise is not coded as confused.

## Experimental population and allocation

Recruitment must include:

- people directly affected by the fictional occupation or service scenario;
- people with low numeracy, low digital confidence or limited English;
- disabled people using keyboard, screen-reader, magnification and alternative
  input workflows;
- service, worker, community and public-institution practitioners; and
- a broader public sample appropriate to the intended release jurisdiction.

The sampling frame, recruitment channels, compensation, exclusions and
non-response must be visible. Directly affected participants are a separate
analysis and safety stratum, not a quota to average away.

Use random allocation stratified only by preregistered variables needed for
precision or safety. Allocation concealment holds until the participant begins
the assigned instrument. Facilitators receive a fixed script and cannot see
interim arm performance. Prevent contamination by separating sessions and
asking participants not to circulate study material until debrief.

Power and sample size follow a declared smallest effect worth detecting, the
validated outcome's baseline rate, attrition allowance, subgroup safety gate
and multiplicity plan. Do not choose a round participant count first and invent
precision afterwards.

## Outcome system

### Primary estimand

The proposed primary estimand is the intention-to-treat risk difference in the
proportion of participants who reconstruct all of these boundaries correctly
on a held-out vignette:

1. who and what the claim describes;
2. observation versus inference;
3. scenario versus forecast;
4. option versus commitment and action;
5. current uncertainty and strongest credible alternative;
6. the material IF state, including true, false, unknown, stale or conflicted;
7. who has authority and who does not; and
8. the next check, challenge or appeal route.

The exact response rubric and adjudication process must be validated before the
analysis plan is frozen. Report every component. A total score cannot conceal a
dangerous error.

### Dangerous-understanding gates

Independently score whether a participant makes any of these errors:

- **aggregate-to-person inference**;
- **scenario as forecast**;
- **option as commitment**;
- **inaction as safe**;
- **crisis as established**;
- exposure as adoption or causation;
- source checksum as publisher authentication; or
- an agent proposal as legal or democratic authority.

One dangerous error is not compensated by several easy correct answers. An
arm's mean comprehension benefit cannot be offset by a material increase in a
dangerous error for directly affected participants.

### Decision quality without compliance

Decision quality means selecting an **evidence-and-authority-appropriate** next
step from the choices permitted by the vignette, while identifying unresolved
conditions and the right to decline. It is not agreement with the project's
preferred future, politics, intervention or deployment stance.

Score expansion, redistribution, reduction, refusal and no-deployment options
under the same evidence and authority rules. The rubric may recognise several
defensible choices. Rationale quality and identified trade-offs are reported
separately from the choice itself.

### Harm, access and usability

Measure anxiety, stigma, dignity, blame, false reassurance, fatalism, perceived
pressure, trust calibration and intention to take an urgent or irreversible
step. Collect open-ended accounts before revealing the research hypothesis.

Record task completion and failure for accessible, low-bandwidth,
screen-reader, keyboard-only, touch, zoom and low-numeracy use. Accessibility is
an outcome, not a pre-study checkbox. Time-on-task may indicate fluency or
confusion and must not stand alone as success.

## Analysis contract

Freeze the protocol, materials, outcomes, exclusions, transformations, stopping
rules and analysis plan before the first participant. Publish a content hash
and timestamp. Preserve later amendments as append-only events with reasons.

Estimate all assigned participants under intention to treat. Report allocation,
exposure, attrition, missingness and contamination by arm. Predeclare:

- the primary pairwise comparisons and multiplicity control;
- uncertainty intervals and the smallest effect worth acting on;
- treatment of incomplete sessions without silent complete-case substitution;
- facilitator, device and session clustering;
- order and learning effects;
- outcome-adjudicator blinding and disagreement;
- subgroup estimates and minimum information for interpretation; and
- sensitivity to reasonable missing-data and rubric choices.

Random allocation may support a causal claim about assignment to these study
instruments within this study session. It does not establish effects in the
general population, live crises, repeated use, different jurisdictions or
high-stakes decisions. Generalisation requires replication and an explicit
transport argument.

Do not inspect interim arm differences unless a preregistered safety monitor
requires it. Do not add a helpful metric after seeing which arm wins. Never
describe a noisy subgroup estimate as proof that a population is deficient.

## Safety and subgroup stop lines

Before recruitment, the approved protocol must specify informed consent in
accessible language, immediate withdrawal without penalty, a prompt debrief,
and an accessible support or referral route. It must name an adverse-event
owner, an independent safety monitor with authority to pause recruitment, and
a remediation process for participant harms. Compensation already earned is
not lost on withdrawal. No participant should have to disclose distress to the
product team to receive support.

Pause the study and review the material if any arm:

- creates an urgent or irreversible action intention from fictional evidence;
- materially increases a dangerous-understanding error;
- produces a serious anxiety, stigma, dignity or blame report;
- conceals that no real service, warning or authority exists;
- fails a critical assistive-technology path; or
- exposes personal data beyond the approved minimum.

A **subgroup stop line** applies even when the overall mean looks favourable.
Material harm or dangerous misunderstanding among directly affected
participants cannot be offset by better scores elsewhere. The safety reviewer
must be independent of the product team and may stop recruitment without
revealing comparative results to facilitators.

## Condition evolution during the study

Every instrument assumption becomes a versioned condition. For example:

```text
IF comprehension gain is positive
AND no dangerous-understanding gate worsens
AND affected-group harm stays inside the approved boundary
AND accessibility paths pass
THEN the Observatory remains a candidate public instrument
ELSE retire or narrow the failing feature
```

A changed condition records its previous wording, scope, evidence, author,
reason and typed operation. The current decision is recomputed from append-only
history. Rewording an outcome after results are visible invalidates the affected
comparison.

## Release ceiling

A successful trial would permit only this claim:

> Assignment to the tested Observatory version changed the registered outcomes
> relative to the named comparator for the sampled participants and fictional
> tasks, under the reported uncertainty and protocol deviations.

It would not prove public trust, democratic legitimacy, forecast skill,
operational safety or better real-world outcomes. A failed or mixed trial is a
useful result. Preserve it, explain it and retire or narrow the instrument.
