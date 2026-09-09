---
id: dashboard-communications-round-02
title: Dashboard communications review, round 02
type: internal-review
status: active
provenance: agent-analysis
author: Ren (Codex agent)
reviewed_on: 2026-09-08
reviewed_commit: 9c4564c
reviewed_artifacts:
  - dashboard/web/index.template.html
  - dashboard/snapshots/2026-09-07.json
basis:
  - communications/README.md
  - communications/labels-and-headlines.md
  - communications/templates.md
  - communications/comprehension-test.md
---

# Dashboard communications review, round 02

> **Internal agent analysis. Not approved.** This review is a proposal for project discussion. It does not represent approval by Fernando Bordallo, project governance, domain experts, affected communities, or a public authority. Line references are pinned to commit `9c4564c` and may not describe later revisions.

## Verdict

**Stop public release.** The prototype has a strong visual and conceptual foundation, but its current presentation can cause readers to mistake instrumentation coverage for crisis risk, scenarios for forecasts, and agent-authored proposals for authorised action. Those are not polish issues. They affect public interpretation, consent, accountability, and safety.

The next revision should make the dashboard a legible public reasoning instrument. It should show what is observed, inferred, unknown, proposed, decided, activated, and contestable without requiring a reader to infer those distinctions from caveats.

## Severity and release rule

| Severity | Meaning | Release rule |
|---|---|---|
| Stop-line | A reasonable reader could act on a false impression of evidence, authority, risk, or available help. | Public release and operational use are blocked. |
| Major | The design weakens evidential integrity, accessibility, accountability, or balanced understanding. | Resolve and review again before public release. |
| Minor | The issue reduces clarity or precision but is unlikely to independently cause material harm. | Resolve before the public-ready milestone where practical. |

All findings are provisional agent analysis. Closure requires evidence against the acceptance tests, followed by the appropriate human and governance review.

## Stop-line findings

### S1. Agent proposals appear as public authority

**Evidence.** The masthead calls the page a "public instrument" without visible authorship, approval, epistemic, or provenance labels (`dashboard/web/index.template.html:362-375`). An unidentified first person speaks under "What would change my mind" (`dashboard/web/index.template.html:480-497`). The default actor is `country` (`dashboard/web/index.template.html:568`), and the action deck presents phase-based instructions under an imperative heading (`dashboard/web/index.template.html:427-435`). The snapshot directs countries to legislate signal owners and activate bridge income (`dashboard/snapshots/2026-09-07.json:8827-8843`) without naming authority, owner, funding, safeguards, or appeal.

**Risk.** A reader could treat unapproved agent proposals as official instructions or existing public protections.

**Required change.** Put `[PROTOTYPE]` and `[AGENT PROPOSAL, REQUIRES APPROVAL]` above the fold and preserve them in screen, print, and export views. Every action must be explicitly typed as either a proposal that is not authorised or a validated commitment.

**Acceptance tests.** Tests 8, 13, 14, 18, 20, 23, 26, and 31.

### S2. The principal headline is not a seven-part public update

**Evidence.** The primary verdict is composed from a derived point estimate and calls the result an "observed gap" (`dashboard/web/index.template.html:986-1013`). It does not keep the scope, uncertainty, affected cohort, inference, IF state, action status, falsifier, and next check visible together.

**Risk.** The headline can carry more certainty and universality than the evidence supports.

**Required change.** The first-layer update must visibly answer: what changed, for whom and where, what is observed versus inferred, uncertainty, which IF condition is implicated, what action is or is not active, what would change the interpretation, and when the next check occurs. Unknown values must remain explicit.

**Acceptance tests.** Tests 1, 8, 9, 10, 17, 24, 28, and 29.

### S3. Instrumentation coverage is visualised as crisis magnitude

**Evidence.** The crisis section uses a filled radar polygon whose radii are the coverage of leading signals (`dashboard/web/index.template.html:415-424`, `dashboard/web/index.template.html:770-810`). Although nearby copy says this is not a synthetic probability, the phrase "warning signals live" gives the display operational warning semantics (`dashboard/web/index.template.html:809-810`). No validated crisis thresholds are shown.

**Risk.** Readers can reasonably read a familiar risk chart as a crisis score, with larger shapes meaning greater danger.

**Required change.** Remove coverage from crisis geometry. Present it as an instrumentation-gap table. Mark failure paths as unscored hypotheses until evidence, thresholds, uncertainty, alternatives, and validation exist.

**Acceptance tests.** Tests 7, 11, 24, and 27.

### S4. A withdrawn claim remains in the public snapshot

**Evidence.** The inflation signal says abundance requires CPI to go negative and treats positive CPI as trouble (`dashboard/snapshots/2026-09-07.json:5307-5312`). The project's integrity review rejected this formulation.

**Risk.** A known-overstated claim can continue to shape the headline, narrative, and user interpretation.

**Required change.** Remove the claim from the source generator and regenerated snapshots. Add a regression test that rejects the known phrase and equivalent categorical formulations.

**Acceptance tests.** Tests 1 and 4.

### S5. Locally loaded snapshots inherit trusted presentation without validation

**Evidence.** The loader parses JSON and checks only the schema major version before replacing the active snapshot (`dashboard/web/index.template.html:1101-1119`). The loaded content then inherits the same brand, language, and action affordances as the bundled snapshot.

**Risk.** Malformed, unsafe, or adversarial content can appear to carry the Observatory's trust and authority.

**Required change.** Apply complete schema and semantic validation, restrict source URL schemes, require provenance fields, and display a persistent `LOCAL, UNVERIFIED` watermark in the title, screen, print, and export. Disable action and commitment presentation for untrusted snapshots.

**Acceptance tests.** Tests 1, 2, 19, 20, and 23.

### S6. Scenario output can be mistaken for a forecast

**Evidence.** The scenario copy calls the result a "transparent projection" and an "attention-worthy gap" (`dashboard/web/index.template.html:437-451`). The controls are automatically seeded from observed growth rates to generate future paths (`dashboard/web/index.template.html:844-869`). There is no adjacent, persistent scenario label or model provenance.

**Risk.** Historical seeding and precise output can be interpreted as an empirical prediction.

**Required change.** Put `[SCENARIO, NOT A FORECAST]` beside every result and chart. Explain the historical seeding, assumptions, exclusions, and lack of predictive validation at the point of interpretation.

**Acceptance tests.** Tests 5, 12, 22, 23, and 25.

### S7. Affected people cannot find help, authority, or appeal

**Evidence.** The playbooks use urgent, operational language but do not expose current action state, accountable owner, legal authority, help route, challenge route, or appeal. The individual crisis advice says to use "the named case owner and appeal path," but neither is named (`dashboard/snapshots/2026-09-07.json:8770-8787`).

**Risk.** A person under pressure may assume help exists, lose time looking for it, or fail to challenge a harmful decision.

**Required change.** Remove operational language until a validated action contract exists, or provide the complete contract with current status, owner, authority, funding, trigger, service level, safeguards, help route, appeal, override, review, and exit.

**Acceptance tests.** Tests 2, 3, 13, 14, 18, 21, 26, 30, and 31.

## Major findings

### M1. Crisis dominates the positive horizon

The information journey moves from trajectory to crisis radar, action deck, divergence scenario, and trouble signals (`dashboard/web/index.template.html:378-460`). It lacks equivalent paths for health, learning, time, security, choice, adaptation, or other ways capability could become lived abundance. Add a `Possible paths` section before failure modes, with positive and adverse pathways shown under the same evidential discipline. Where measures do not exist, show the gap rather than inventing symmetry.

### M2. The Seldon frame implies predictive authority

The name "Seldon Observatory," radar metaphor, and instruction to "Observe the crossing. Protect human agency" create an aura of psychohistorical foresight (`dashboard/web/index.template.html:364-369`). The current evidence does not support that authority. If the frame remains, add an explicit boundary near the title: "No psychohistory. No inevitable future. Evidence and scenarios for public challenge."

### M3. The visible IF model is incomplete

The current equation includes availability, affordability, eligibility, quality, and delivery (`dashboard/web/index.template.html:404-412`). It omits whether people retain agency, meaningful choice and refusal, privacy, alternatives, appeal, durability, fairness, and freedom from hidden payment. Replace the compressed equation with a one-minute `verb + object + IF` explainer and the five IF Protocol layers: capability, reach, agency, durability, and distribution.

### M4. Snapshot interpretations exceed their evidence

Several statements are hypotheses or values but render like settled findings:

- Poverty is described as on the "wrong side," near a "developed-world floor," and elsewhere as the "single clearest" measure (`dashboard/snapshots/2026-09-07.json:2445-2456`; `dashboard/web/index.template.html:947`).
- The last mile is described as the hardest and most expensive (`dashboard/snapshots/2026-09-07.json:3337-3348`).
- A zero-cost count is treated as a target before its definition is approved (`dashboard/snapshots/2026-09-07.json:7017-7038`).
- The unconstructed Baumol gap says it "predicts" an outcome (`dashboard/snapshots/2026-09-07.json:7041-7061`).
- The access margin is called the outcome the transition "must protect" (`dashboard/snapshots/2026-09-07.json:7064-7085`).
- Trust assumes a transition to which people should consent and predicts a legitimacy crisis (`dashboard/snapshots/2026-09-07.json:7159-7179`).
- The permission migration is stated as a causal claim (`dashboard/snapshots/2026-09-07.json:8746-8765`).

Give each statement an epistemic class, provenance, competing account, falsifier, and evidence-safe wording. Mark value choices as values, not observations.

### M5. Nowcasts render as measurements

Modelled 2026 poverty nowcasts carry measured-style presentation while their caveats are collapsed into secondary detail (`dashboard/snapshots/2026-09-07.json:3330-3356`; `dashboard/web/index.template.html:934-938`). Put `NOWCAST` at the point level, visually distinguish the modelled tail, and show model vintage and uncertainty beside the value.

### M6. Entity selection is inconsistent

Charts follow the selected entity but headline cards use the snapshot-wide `sig.latest`, which is usually World (`dashboard/web/index.template.html:893-899`). Missing entity data silently falls back to World (`dashboard/web/index.template.html:620-635`, `dashboard/web/index.template.html:968-971`). Selecting Australia must show Australia or an explicit, adjacent `Australia unavailable, showing World` fallback on every affected value.

### M7. Crisis hypotheses lack the structure needed for decisions

The crisis objects are unscored and omit evidence grade, competing explanations, falsifier, validated threshold, probability, forecast history, owner, and next check (`dashboard/snapshots/2026-09-07.json:8651-8767`). Some phrasing, such as "politics turns," implies causal certainty (`dashboard/snapshots/2026-09-07.json:8703-8708`). Rename these objects `possible failure paths` and require alternatives, recovery paths, and the missing evidential fields.

### M8. Action phases are disconnected from actual state

Every actor sees `now`, `warning`, and `crisis` instructions even though crises are unscored and no activation condition has been validated (`dashboard/snapshots/2026-09-07.json:8769-8845`). Split the presentation into `Current authorised action`, `No-regret proposals`, and `Hypothetical actions if a stated condition becomes true`.

### M9. The falsifiers overclaim what one result would establish

The current text says a near-zero transmission gap would show the pause is not coming, a rising zero-cost count would answer the argument, and falling poverty would make the rest follow (`dashboard/web/index.template.html:480-497`). Each observation would update only part of the thesis. Narrow each falsifier to the claim it actually tests and state what it would not establish.

### M10. Correction disclosure is incomplete

The correction surface does not consistently show correction date, original statement, affected decisions, repair, owner, and next review (`dashboard/web/index.template.html:1006-1012`). Use a fixed correction contract and preserve prior versions.

### M11. No update cadence or next check is visible

The masthead and footer expose generation metadata and a snapshot identifier, but no planned next check (`dashboard/web/index.template.html:370-375`, `dashboard/web/index.template.html:1058-1068`). Add the next scheduled observation and clearly label overdue sources.

### M12. No challenge or dissent route exists

"Where I need you to push" lists open questions but provides no submission route, review owner, response status, protection for dissent, or publication trail (`dashboard/web/index.template.html:500-512`). Add a challenge contract and visible queue, or label the section as non-operational.

### M13. The country panel is unexplained

The snapshot includes World plus six countries without a visible selection rationale (`dashboard/snapshots/2026-09-07.json:8-43`). Comparison can look representative when it is illustrative. Publish inclusion logic, exclusions, limitations, and whether the panel is fixed or opportunistic.

### M14. Charts are not sufficiently accessible

Axes and tooltips often omit units, interactions are substantially mouse-dependent, and visible values are not always available in an equivalent text table (`dashboard/web/index.template.html:642-725`). Radar labels are also truncated (`dashboard/web/index.template.html:785-789`). Provide keyboard navigation, screen-reader descriptions, visible units, full labels, and an equivalent data table.

### M15. "No registry publishes this" is too universal

The statement appears in signal text and the footer without a documented search boundary (`dashboard/snapshots/2026-09-07.json:7027-7035`; `dashboard/web/index.template.html:545-550`). Use: "No suitable source identified in the documented search as of [date], covering [registries and jurisdictions]."

## Minor findings

| ID | Finding | Evidence | Proposed revision |
|---|---|---|---|
| m1 | "Interrogate the evidence" can sound adversarial. | `dashboard/web/index.template.html:456-460` | Prefer "Explore and challenge the evidence." |
| m2 | "Move before the threshold" implies a threshold exists. | `dashboard/web/index.template.html:427-431` | Prefer "Prepare before validated warning conditions are reached," or say none are validated. |
| m3 | Theme control does not name the resulting mode clearly. | `dashboard/web/index.template.html:382`, `dashboard/web/index.template.html:1097-1099` | Use "Switch to light theme" and "Switch to dark theme." |
| m4 | The permission signal has no family-facing label or explainer. | `dashboard/web/index.template.html:945-955` | Show the family name and its relationship to the selected IF condition. |
| m5 | Summary cards omit or obscure units. | `dashboard/web/index.template.html:893-899` | Keep value, unit, period, scope, and status together. |
| m6 | Source footer lacks direct links, series vintages, and periods. | `dashboard/web/index.template.html:1067-1068` | Render complete source metadata and archived snapshot links. |
| m7 | "Earns trust" asserts an outcome rather than a practice. | `dashboard/web/index.template.html:472-476` | Prefer "Designed to support scrutiny through..." |

## Acceptance tests

### Schema and content gates

1. Every public claim requires `epistemic_class`, provenance, scope, uncertainty, falsifier, and `next_check`.
2. Every action is typed as `proposal` or `commitment`.
3. Every commitment requires owner, authority, funding, trigger, service level, safeguards, appeal, override, review, and exit.
4. The generator fails when known rejected phrases or semantically equivalent categorical claims are introduced.
5. Every nowcast or forecast has point-level status, model vintage, uncertainty, and a resolution rule.
6. Every `not_measured` claim records search scope and search date.
7. Every crisis hypothesis has alternatives, evidence grade, falsifier, explicit `unscored` status unless validated, and a recovery path.

### DOM and presentation gates

8. `Prototype`, `Agent proposal`, and `Requires approval` are visible above the fold and remain visible in print and export.
9. The primary update exposes the complete seven-part public update without requiring expansion.
10. Every derived headline carries an adjacent `[DERIVED]` label.
11. No unscored concept uses probability colour, a filled risk geometry, or language such as "signals live."
12. Every scenario result has an adjacent `[SCENARIO, NOT A FORECAST]` label.
13. Every proposed action displays `NOT AUTHORISED` at the point of action.
14. Every commitment displays owner, authority, help route, and appeal route at the point of action.
15. Every correction shows the original, date, error, corrected statement, implications, and permanent record link.
16. Every failure path is paired with a positive path under equivalent evidential standards, or the missing positive instrumentation is explicit.
17. A challenge route and the next scheduled check are visible in the first information layer.

### Interaction and trust gates

18. Selecting Australia shows an Australian value or an explicit adjacent fallback. It never silently presents World as Australia.
19. Loading a local snapshot runs full schema and semantic validation and applies a persistent `LOCAL, UNVERIFIED` watermark.
20. Untrusted or invalid snapshots cannot present commitments or operational action.
21. Actor selection cannot change observations, uncertainty, trigger state, or forecast status.
22. A keyboard and screen-reader user can retrieve every chart value, unit, period, source, and caveat.
23. Screenshots, printouts, and exports preserve provenance, epistemic, proposal, scenario, and trust labels.

### Human comprehension and safety gates

24. At least 95% of tested readers correctly identify instrumentation coverage as coverage, not risk.
25. At least 95% correctly identify a scenario as not a forecast.
26. At least 95% correctly distinguish a proposal from a commitment.
27. At least 90% correctly state that no crisis is currently scored or activated.
28. At least 85% correctly identify scope, uncertainty, and non-causal status in the primary update.
29. At least 80% can locate the falsifier and next check without assistance.
30. At least 85% can identify the accountable owner or correctly conclude that no authorised action exists.
31. An affected reader can find the correct help and appeal route without assistance whenever a commitment is shown.
32. No tested cohort trails the overall comprehension rate by more than 15 percentage points.
33. Any severe rights, manipulation, accessibility, or unsafe-action failure blocks release regardless of aggregate comprehension.

## Revised information architecture

Use the smallest structure that lets a reader move from evidence to conditions to action without crossing an unlabeled inference boundary.

1. **Status strip**
   `Prototype` · `Agent proposal` · snapshot date · observation vintage · next check
2. **What we know now**
   Seven-part headline, honest limits, affected cohort, and current action state
3. **Complete promise**
   One-minute `verb + object + IF` explanation, then service, cohort, and place selection across capability, reach, agency, durability, and distribution
4. **Possible paths**
   Positive and failure paths side by side, without radar geometry, with grades, unknowns, alternatives, and falsifiers
5. **What can happen now**
   `No action` · `Investigate` · `Prepare` · `Activate` · `Pause` · `Recover`, with commitments separated from proposals
6. **Evidence explorer**
   Charts with scope, unit, period, vintage, uncertainty, nowcast status, source, and equivalent table
7. **Scenario lab**
   Isolated from observed evidence, driven by visible user assumptions, and carrying no decision semantics
8. **Accountability**
   Authorship, provenance, methods, corrections, forecast resolutions, challenges, decisions, overrides, and next checks

Recommended navigation:

`Now · Conditions · Paths · Action · Evidence · Accountability`

## Release sequence

1. Resolve S1 through S7 and prove the associated automated gates.
2. Run comprehension tests 24 through 33 with affected people, not only project contributors.
3. Record unresolved major findings and accountable owners.
4. Conduct a fresh communications, epistemic, accessibility, and rights review against the resulting commit.
5. Seek explicit governance approval. An agent review cannot grant it.
