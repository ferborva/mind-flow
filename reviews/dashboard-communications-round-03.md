---
id: dashboard-communications-round-03
title: Dashboard communications review, round 03
type: internal-review
status: active
provenance: agent-analysis
author: Ren (Codex agent)
reviewed_on: 2026-09-08
reviewed_commit: 52ecae2
working_tree_template_blob: c5dfa44f12c202f33844fa8cc6c51d6f43da0346
working_tree_template_diff_sha256: 1a2c0de2ec16a5a2c4888addbf9e74d4718eb0bbd5860a46acd83861a6a04dd1
reviewed_artifacts:
  - dashboard/web/index.template.html
  - dashboard/snapshots/2026-09-07.json
basis:
  - reviews/dashboard-communications-round-02.md
  - communications/README.md
  - communications/templates.md
  - communications/comprehension-test.md
---

# Dashboard communications review, round 03

> **Internal agent analysis. Not approved.** This review does not represent approval by Fernando Bordallo, project governance, domain experts, affected communities, or a public authority. Line references refer to the working-tree template blob recorded above, which includes the uncommitted title and dynamic coverage-count changes on top of commit `52ecae2`.

## Verdict

**Public release remains blocked.** The revision makes a substantial and directionally correct move from an authoritative crisis dashboard toward a public reasoning instrument. It now visibly discloses its prototype status, rejects predictive mystique, presents positive and adverse paths together, removes the crisis radar, labels scenarios, and disables local snapshot loading.

The remaining problem is no longer a total absence of boundaries. It is that several boundaries stop at the section label while the high-authority content inside still overreaches. The seven-part update has the right seven headings but not yet the required seven evidence contracts. The action deck says "not authorised" and then renders imperative instructions for countries and people in crisis. The scenario is labeled but still silently starts from observed aggregate rates. Instrumentation coverage is no longer a crisis polygon, but it remains visually prominent and attached to each failure mode.

### Stop-line score

| Prior stop-line | Status | Short reason |
|---|---|---|
| S1. Agent proposals appear as public authority | **Partial** | Strong page and section labels exist, but imperative action content and an unnamed "research team" still imply authority. |
| S2. Principal headline is not a seven-part update | **Partial** | All seven headings exist, but most required fields are missing or too generic to audit. |
| S3. Coverage is visualised as crisis magnitude | **Partial** | The radar is gone, but coverage remains a prominent orbit and is attached to each failure path. Human misreading has not been tested. |
| S4. Withdrawn CPI claim remains public | **Partial** | The rejected sentence is gone, but positive CPI is still framed categorically as trouble. |
| S5. Local snapshots inherit trusted presentation | **Closed** | Public local loading is disabled and the UI control and handler are absent. A regression gate must preserve this. |
| S6. Scenario can be mistaken for a forecast | **Partial** | Strong labels exist, but baseline seeding remains automatic and provenance is not adjacent to the result. |
| S7. Affected people cannot find help, authority, or appeal | **Partial** | No-authority labels are clearer, but operational-sounding playbooks still lack real help and appeal routes. |

**Total: 1 closed, 6 partial, 0 open.** Partial stop-lines still block release.

## What improved materially

1. The authority strip is visible before the brand and includes `PROTOTYPE`, `AGENT PROPOSAL`, `REQUIRES FERNANDO REVIEW`, and `PUBLIC RELEASE BLOCKED` (`dashboard/web/index.template.html:394-400`).
2. The Seldon name has been removed from the live template title and masthead (`dashboard/web/index.template.html:1`, `dashboard/web/index.template.html:401-409`). The text now directly rejects psychohistory and inevitable futures.
3. A first-screen seven-part update exists (`dashboard/web/index.template.html:416-426`). The uncommitted `renderNow` change prevents signal counts from becoming stale when the snapshot changes (`dashboard/web/index.template.html:1091-1103`).
4. The IF map now gives capability, reach, agency, durability, and fairness equal visible status and explicitly says unknown is not failure (`dashboard/web/index.template.html:466-479`).
5. Positive hypotheses now precede possible failure modes and all are labeled unscored (`dashboard/web/index.template.html:482-498`).
6. The filled crisis radar has been removed. Failure paths are rendered as an unscored list (`dashboard/web/index.template.html:799-837`).
7. The scenario heading and result copy both reject forecast, probability, diagnosis, and activation semantics (`dashboard/web/index.template.html:511-527`, `dashboard/web/index.template.html:870-895`).
8. Local snapshot loading is explicitly disabled until strong validation and watermarking exist (`dashboard/web/index.template.html:570-575`).
9. The tested dashboard checks pass in the reviewed working tree. These are structural string, schema, and build tests, not evidence of human comprehension.

## Stop-line reassessment

### S1. Agent proposals appear as public authority

**Status: Partial**

**Closed surface.** The page-level authority strip is excellent and appears above the high-status brand (`dashboard/web/index.template.html:394-409`). The action section says `Agent proposal, not authorised` (`dashboard/web/index.template.html:501-505`), and the rendered playbook repeats `Proposal, not authorised` (`dashboard/web/index.template.html:839-855`). The footer repeats the prototype and proposal status (`dashboard/web/index.template.html:582-585`).

**Remaining gap.** The public update simultaneously says `No authorised action` and that a generic `research team continues` work (`dashboard/web/index.template.html:423`). That reads like an active commitment without a named owner, provenance, approval state, or authority. The default actor remains `country` (`dashboard/web/index.template.html:595-597`), and the deck renders directives such as `Legislate`, `Activate`, and `Protect` from the snapshot (`dashboard/snapshots/2026-09-07.json:8827-8843`). A label above three columns does not fully neutralise the visual force of ordered action lists.

**Required resolution.** Separate three objects in both data and presentation:

- `Current authorised action`, which may truthfully be `None`.
- `Internal research work`, with named accountable person, commission provenance, status, and next review.
- `Public policy option`, with `PROPOSAL, NOT AUTHORISED` on every action card and a complete hypothetical IF condition.

Do not preselect a sovereign actor. Require a deliberate actor choice or default to `No actor selected`.

**Acceptance tests.**

- **R3-S1.1 DOM:** Every rendered playbook action contains an adjacent `PROPOSAL, NOT AUTHORISED` label in the same card, not only at section level.
- **R3-S1.2 state:** Initial load has no selected actor and renders no actor-specific directive until the reader chooses a role.
- **R3-S1.3 content:** `No authorised action` cannot coexist with `continues`, `will`, `activates`, or equivalent commitment language unless a separately labeled internal commitment names its owner and provenance.
- **R3-S1.4 schema:** Every action object has `claim_class`, `provenance`, `approval_state`, `owner`, `authority`, `if_condition`, `stop_rule`, and `review_on`. Fields may be explicitly unknown but may not be omitted.
- **R3-S1.5 comprehension:** At least 95% of tested readers correctly say that no public action is authorised. Any participant who believes the country instructions are current policy blocks release until remediated and retested.

### S2. The principal headline is not a complete seven-part public update

**Status: Partial**

**Closed surface.** The interface provides all seven required headings and retains unknowns instead of deleting fields (`dashboard/web/index.template.html:416-426`). Dynamic counting removes the brittle hard-coded `six measured and two derived` sentence (`dashboard/web/index.template.html:1091-1099`).

**Remaining gap by field.**

| Field | Current rendering | Missing contract |
|---|---|---|
| Observed | Counts measured, derived, and absent inputs (`dashboard/web/index.template.html:419`, `dashboard/web/index.template.html:1091-1099`). | Actual measure, value, population, place, period, source, vintage, uncertainty. Coverage is metadata, not the observed transition result. |
| Affected | Correctly says unknown (`dashboard/web/index.template.html:420`). | Who is excluded or not represented and why no affected inference is possible. |
| Inferred | Says aggregate output and constructed labour income diverged (`dashboard/web/index.template.html:421`). | Magnitude, place, period, method, confidence, strongest alternative, provenance, and derived label. |
| IF changed | Says none validated and all layers remain untested (`dashboard/web/index.template.html:422`). | Condition ID, previous state, current state, evidence grade, scope, dependencies, and explicit `no change established`. |
| Action and owner | Says no authorised action, then assigns an unnamed research team (`dashboard/web/index.template.html:423`). | Named internal owner or explicit unknown, approval state, authority, safeguard, and help or challenge route. |
| Falsifier | Says cohort evidence may change the reading (`dashboard/web/index.template.html:424`). | A realistic observation with direction, boundary, population, period, and decision consequence. `May change` is not falsifiable. |
| Next check | Gives a date and NERO event (`dashboard/web/index.template.html:425`). | Owner, expected field or release, linkage to the current aggregate claim, and treatment of delay or source failure. |

The update is also static while entity controls change the evidence below it. A reader can select Australia and still see a global update with no reminder that the top panel has not changed (`dashboard/web/index.template.html:537-542`, `dashboard/web/index.template.html:1043-1053`).

**Required resolution.** Drive the seven fields from one validated public-update object rather than independent prose and coverage counts. Keep the visible layer concise, but let each field expand to its evidence card without changing meaning.

**Acceptance tests.**

- **R3-S2.1 schema:** A `public_update` object requires all seven fields plus `epistemic_class` and `provenance`; missing values serialize as `Unknown` with a reason.
- **R3-S2.2 semantic:** `observed` fails validation if it only reports instrumentation coverage or lacks population, place, period, source, vintage, and uncertainty.
- **R3-S2.3 semantic:** `falsifier` fails if it contains only `may`, `could`, `more research`, or an unspecified evidence direction without a defined implication.
- **R3-S2.4 interaction:** Changing entity either updates all seven fields from a matching object or preserves the global update with an adjacent, persistent `Global update unchanged` notice.
- **R3-S2.5 consistency:** The next-check evidence must update or test the claim named in `inferred`; otherwise it must be labeled as a different monitoring track.
- **R3-S2.6 comprehension:** At least 85% of tested readers identify the observed measure, scope, period, uncertainty, and non-causal status. At least 80% find a concrete falsifier and next check.

### S3. Instrumentation coverage is visualised as crisis magnitude

**Status: Partial**

**Closed surface.** The radar polygon and `warning signals live` language are gone. The orbit says `Completeness only. Not progress, risk or probability` (`dashboard/web/index.template.html:444-453`, `dashboard/web/index.template.html:790-797`). Failure paths and their detail chips say `unscored hypothesis` (`dashboard/web/index.template.html:482-498`, `dashboard/web/index.template.html:818-826`).

**Remaining gap.** The circular orbit remains one of the most prominent first-section visuals, despite having no decision meaning. Each failure-mode selector and detail also displays a fraction of `inputs available` (`dashboard/web/index.template.html:807-825`). Attaching a count to a named failure can still imply evidential support, monitoring maturity, or nearness to detection. No rendered visual-comprehension result exists to show the disclaimers overcome the geometry and adjacency.

**Required resolution.** Move coverage to a neutral instrumentation table grouped by measure status. Do not attach a scalar fraction to a failure-path name. If dependency availability is useful, expose each input as `observed`, `derived`, `missing`, or `not applicable`, with no aggregate score.

**Acceptance tests.**

- **R3-S3.1 DOM:** No circular, radial, gauge, traffic-light, or progress-bar geometry encodes instrumentation availability.
- **R3-S3.2 DOM:** Failure-path selectors contain no scalar coverage ratio, percentage, score, colour rank, or readiness label.
- **R3-S3.3 content:** Each listed dependency states its evidence status individually, and the failure path remains `UNSCORED HYPOTHESIS` in the same viewport.
- **R3-S3.4 comprehension:** At least 95% of tested readers say coverage means available inputs, not transition state, crisis risk, probability, support for the hypothesis, or preparedness.
- **R3-S3.5 anti-panic:** At least 90% say no crisis is diagnosed or imminent. More than 10% inferring a quantified crisis probability is an automatic fail.

### S4. A withdrawn CPI claim remains public

**Status: Partial**

**Closed surface.** The sentence `Abundance requires this to go negative` was replaced with a bounded description of CPI, and regression checks reject the original phrase. The snapshot now says CPI cannot establish affordability, access, or demonetisation on its own (`dashboard/snapshots/2026-09-07.json:5301-5312`).

**Remaining gap.** The question still asks whether prices are `actually falling`, and the trouble reading still classifies persistent positive inflation as the problem (`dashboard/snapshots/2026-09-07.json:5307-5309`). This retains the withdrawn claim's normative direction while moving the caveat one line away. Positive aggregate CPI can coexist with falling real costs, improved quality, public provision, or widening access for a defined service and cohort.

**Required resolution.** Ask what changed in a defined basket for a defined household and period. Treat CPI as context. Do not assign a transition-state or trouble direction to CPI alone.

**Acceptance tests.**

- **R3-S4.1 content:** The CPI signal contains no categorical `trouble_reading` based only on its sign or persistence.
- **R3-S4.2 schema:** A broad price index cannot set `if_state`, action status, risk state, or abundance verdict without an explicit service, cohort, total-cost measure, uncertainty, and approved inference rule.
- **R3-S4.3 regression:** Tests reject both the original phrase and semantic equivalents such as `positive CPI means abundance is not arriving`.
- **R3-S4.4 comprehension:** At least 85% of readers say CPI alone cannot establish affordability, access, or demonetisation.

### S5. Locally loaded snapshots inherit trusted presentation

**Status: Closed**

**Closure evidence.** The file input and local-load affordance are absent from the controls (`dashboard/web/index.template.html:530-542`). No local file handler remains in the interaction setup (`dashboard/web/index.template.html:1106-1121`). The methods section states that local loading is disabled until full validation, provenance checks, and an unmistakable watermark exist (`dashboard/web/index.template.html:570-575`).

**Preservation tests.**

- **R3-S5.1 DOM:** The public build contains no snapshot file input, drag-and-drop target, paste importer, query-string importer, or file-reader handler.
- **R3-S5.2 build:** Only the repository snapshot that passes the complete build-time schema and semantic validators can be embedded.
- **R3-S5.3 regression:** If importing is reintroduced, tests require safe URL schemes, mandatory provenance, full validation, a persistent `LOCAL, UNVERIFIED` title and watermark in screen, print, screenshot, and export, plus disabled action surfaces.
- **R3-S5.4 security:** An invalid or adversarial fixture cannot render any claim, action, link, or trusted Observatory branding.

### S6. Scenario output can be mistaken for a forecast

**Status: Partial**

**Closed surface.** The heading carries `[SCENARIO, NOT A FORECAST]`; nearby copy excludes probability, forecast, diagnosis, and activation semantics (`dashboard/web/index.template.html:511-527`). The result itself repeats that it is arithmetic under chosen rates and not an action threshold (`dashboard/web/index.template.html:870-895`).

**Remaining gap.** On first render and every entity change, the tool silently seeds its controls from the selected aggregate baseline (`dashboard/web/index.template.html:858-872`). The button says `Use aggregate baseline rates`, but the code has already used them before the user presses it (`dashboard/web/index.template.html:523`, `dashboard/web/index.template.html:866-872`). Neither the numeric result nor SVG accessible name includes the scenario label, source period, method, baseline entity, or vintage (`dashboard/web/index.template.html:519-526`, `dashboard/web/index.template.html:879-883`). A cropped result or screen-reader chart description can therefore lose its epistemic boundary.

**Required resolution.** Start with neutral user-entered assumptions or disclose `Seeded from [entity], [period], [source vintage]` beside the controls before computing. Put the scenario label in the numeric result container, chart accessible name, print view, screenshot crop, and exported data.

**Acceptance tests.**

- **R3-S6.1 initialization:** Initial render does not silently seed from observations. If seeding is retained, the seed entity, exact historical window, method, vintage, and limitations render before the output.
- **R3-S6.2 DOM:** The scenario label is inside the result container and the chart accessible name, not only in a section heading.
- **R3-S6.3 state:** Scenario outputs cannot set an IF state, action phase, warning colour, notification, or recommendation.
- **R3-S6.4 export:** Print, screenshot, copied text, and exported data retain `SCENARIO, NOT A FORECAST` and all input assumptions.
- **R3-S6.5 comprehension:** At least 95% of tested readers identify the output as arithmetic rather than the project's prediction.

### S7. Affected people cannot find help, authority, or appeal

**Status: Partial**

**Closed surface.** The first screen says `No authorised action`, and the action deck twice labels content as a proposal (`dashboard/web/index.template.html:423`, `dashboard/web/index.template.html:501-505`, `dashboard/web/index.template.html:839-855`). The accountability section states that no action occurs without named authority and that the challenge service is not operational (`dashboard/web/index.template.html:545-554`).

**Remaining gap.** Proposal status does not remove the operational tone of `Prepare safely`, `If evidence is validated`, and `Protect and recover` (`dashboard/web/index.template.html:851-855`). The underlying individual playbook still says `Use the named case owner and appeal path` when neither exists (`dashboard/snapshots/2026-09-07.json:8770-8787`). Country playbooks still instruct activation of support without naming a responsible authority, help route, appeal, or jurisdiction (`dashboard/snapshots/2026-09-07.json:8827-8843`). The challenge service is explicitly unavailable (`dashboard/web/index.template.html:552`).

**Required resolution.** Until a real commitment is in scope, replace operational phase names with `Option to evaluate` and attach the full hypothetical IF. Remove references to nonexistent help. When a commitment is introduced, keep the proposal and commitment visually separate and provide the complete action contract at the point of use.

**Acceptance tests.**

- **R3-S7.1 content:** No proposal refers to an existing case owner, help service, payment, appeal, or activation unless a validated commitment object supplies it.
- **R3-S7.2 DOM:** Every action card displays current status, jurisdiction, owner, authority, funding, trigger, service level, safeguards, help, appeal, stop rule, review, and exit, with unknown fields visible.
- **R3-S7.3 semantic:** An unscored hypothesis cannot select `warning`, `crisis`, `activate`, or `recover` as current state.
- **R3-S7.4 interaction:** Actor selection changes only audience framing. It cannot change observations, uncertainty, IF status, action authority, or trigger state.
- **R3-S7.5 comprehension:** At least 85% identify the owner or correctly say none exists; at least 95% distinguish proposal from commitment; at least 90% choose no public activation.
- **R3-S7.6 affected-reader safety:** Whenever a commitment is displayed, affected readers can find help and appeal without assistance. If none exists, the page must say so and must not simulate crisis guidance.

## Cross-cutting findings

### C1. Visual authority is better bounded, but still outruns evidence

The new authority strip and anti-psychohistory copy are strong. However, the labels use 10-pixel uppercase pills while the Observatory brand, numerical baseline, orbit, path cards, and action columns carry substantially more visual weight (`dashboard/web/index.template.html:358-378`, `dashboard/web/index.template.html:394-409`). The methods section itself correctly says authority should never come from the aesthetic (`dashboard/web/index.template.html:545-553`). Closure therefore requires rendered testing at desktop, mobile, zoom, dark mode, print, and screenshot crops, not a markup check.

### C2. The IF map is a vocabulary map, not yet a decision map

The five cards clearly define the layers but give every layer the same static `UNKNOWN` state (`dashboard/web/index.template.html:466-479`). There is no selected verb, object, service, cohort, place, previous state, current state, evidence grade, dependency, or next observation. This prevents the IF model from carrying an actual path, negotiation, or decision.

The next version should let a reader ask: `Who can do what, for whom, where, for how long, if which observable conditions hold, according to whose evidence, with what remedy if wrong?`

### C3. Evidence cards still lack point-of-claim epistemic and provenance labels

Signal panels show status chips, method for derived signals, sources, trouble readings, and collapsed caveats (`dashboard/web/index.template.html:897-954`). They do not consistently show the full epistemic class, provenance, scope, uncertainty, competing explanation, falsifier, and next check. The claim boundary is still reconstructed by the reader.

### C4. Entity controls can create contradictory page states

The chart selector silently falls back to World when the selected entity lacks data (`dashboard/web/index.template.html:650-667`). Summary cards still use `sig.latest`, which commonly points to World, regardless of the selected entity (`dashboard/web/index.template.html:897-918`). The public update remains global. This can place an Australian chart, World headline value, and global seven-part update on the same page without a visible fallback or scope ledger.

### C5. Automated checks verify words, not meaning

The current dashboard test suite passes. It proves that required strings exist, rejected phrases are absent, schema structure validates, and the page builds. It does not prove label proximity, visual persistence, accurate field content, state consistency, keyboard access, screen-reader meaning, or human comprehension. A passing structural suite must not be presented as public-readiness evidence.

## Concrete Round 3 release gate

Do not seek external public-release approval until all of the following are true:

1. S1, S2, S3, S4, S6, and S7 pass their listed automated and human tests.
2. S5 preservation tests are added so the closed issue cannot silently return.
3. One validated `public_update` object drives the first layer, evidence expansion, entity scope, and next-check record.
4. The action deck renders only proposals until a separately governed commitment exists.
5. Every IF path is a scoped predicate with evidence and transition history, not merely a named concept.
6. A rendered visual review covers desktop, mobile, dark mode, 200% zoom, print, screenshots, keyboard, and screen-reader output.
7. Comprehension testing includes directly affected participants and records failures by cohort. A dangerous misunderstanding is never averaged away.
8. A functioning challenge route exists, or the artifact remains a private research prototype.

## Review limitation

This round inspected source, the current working-tree diff, snapshot content, and automated dashboard tests. A rendered-page browser session was unavailable in this task, so no claim is made that visual hierarchy or responsive behavior passed. That limitation is material and is why the visual and human comprehension gates remain open.
