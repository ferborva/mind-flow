---
id: round-03-external-first-pass-evidence-forecast
title: Independent Round 03 evidence and forecast first pass
type: external-review-first-pass
status: submitted-open-findings
provenance: independent-blind-agent-review
reviewer: Ren
reviewed_commit: f5b3b643e80e0f16d7dadd13805df6accf9526ed
reviewed_on: 2026-09-09
blind_pass_completed_before_internal_register_read: true
authority: none
closure_claimed: false
---

# Independent Round 03 review

Reviewed exact commit `f5b3b643e80e0f16d7dadd13805df6accf9526ed`, read-only. No prohibited reviews, external reviews, branches, or agent summaries were consulted. No shared files changed.

## Findings

### R03-EF-01 · P1 · Blocked path branches can advance to another consequential node

- **Location:** [paths/validate.mjs:277](../../../paths/validate.mjs#L277), especially lines 283-313.
- **Counterexample:** Set `edge.prepare.branches.if_false.target_node_id` to `node.negotiated-option`. It exists and differs from the edge’s nominal destination, so validation succeeds.
- **Consequence:** A false or unknown IF can skip forward despite declaring `block-edge-traversal`, breaking the central fail-closed graph invariant.
- **Reproduction:** Exact-tree mutation returned `machine_valid: true`, `errors: []`.
- **Smallest repair:** Require blocked branches to target a node of kind `abandonment`, or a formally designated terminal blocked node; add reachability tests for both false and unknown paths.
- **Closure owner:** Possible-path contract owner.

### R03-EF-02 · P1 · Preparation evidence has no population/geography join

- **Location:** [preparation/schema/preparation-register.schema.json:122](../../../preparation/schema/preparation-register.schema.json#L122), [preparation/lib/validate.mjs:113](../../../preparation/lib/validate.mjs#L113).
- **Counterexample:** Reseal an action, expression, evaluation, and capability from `Example region` to `Mars Colony One` while leaving the evidence bundle unchanged.
- **Consequence:** The same observations satisfy an IF for any cohort or geography because matching uses only `measure` and `unit`. Population, geography, statistical unit, denominator, and reference period are absent from observations.
- **Reproduction:** Mutation returned `structurally_publishable_proposal: true`, no errors, with the original evidence checksum.
- **Smallest repair:** Put structured estimand and scope fields on every observation and require exact compatibility with the expression/evaluation scope.
- **Closure owner:** Preparation evidence-contract owner.

### R03-EF-03 · P1 · Forecast outcomes are asserted, not reconstructed from resolution evidence

- **Location:** [forecasts/schema/binary-forecast.schema.json:386](../../../forecasts/schema/binary-forecast.schema.json#L386), [forecasts/lib/registry.mjs:447](../../../forecasts/lib/registry.mjs#L447), [forecasts/lib/scoring.mjs:50](../../../forecasts/lib/scoring.mjs#L50).
- **Counterexample:** Flip `resolution.outcome` from `1` to `0` while retaining the identical evidence URI, vintage, timestamps, and checksum.
- **Consequence:** Both records pass semantic validation, while Brier score changes from `0.09` to `0.49`. Predictive-performance output is therefore controlled by an unverified outcome bit, not the frozen resolution rule or evidence bytes.
- **Reproduction:** `assertForecastSemantics` accepted both variants with the same evidence checksum.
- **Smallest repair:** Retain/fetch authenticated resolution bytes and run a versioned resolver that derives the binary outcome from the frozen target rule. Withhold scoring when reconstruction fails.
- **Closure owner:** Forecast resolution owner.

### R03-EF-04 · P1 · One resolved event can manufacture 30 “independent” clusters

- **Location:** [forecasts/lib/evaluation.mjs:401](../../../forecasts/lib/evaluation.mjs#L401), [forecasts/lib/evaluation.mjs:552](../../../forecasts/lib/evaluation.mjs#L552).
- **Counterexample:** Create 30 unique forecast IDs for the same `resolution_event_id`, assigning each a distinct `independence_cluster_id`.
- **Consequence:** The evaluator reports 30 claimed clusters and publishes a reliability-bin observed frequency derived from one realised event. This contradicts the stated rule that 30 copies of one event remain one cluster.
- **Reproduction:** `unique_resolution_events=1`, `claimed_clusters=30`, status `descriptive_diagnostic_only_claimed_clusters`, one published bin rate.
- **Smallest repair:** Enforce one cluster per resolution event; aggregate or weight scores at event/cluster level and report unique event counts.
- **Closure owner:** Forecast evaluation/scoring owner.

### R03-EF-05 · P2 · Duplicate harm records change the action-versus-inaction headline

- **Location:** [preparation/lib/validate.mjs:155](../../../preparation/lib/validate.mjs#L155), [preparation/lib/validate.mjs:635](../../../preparation/lib/validate.mjs#L635).
- **Counterexample:** Duplicate the first action-harm entry verbatim and change the derived headline from `action-appears-safer` to `uncertain`.
- **Consequence:** Identical evidence is counted twice, changing the safety conclusion without changing the world. Harm totals depend on record granularity rather than a declared estimand or denominator.
- **Reproduction:** The duplicated record remained structurally publishable with no errors.
- **Smallest repair:** Require unique harm identities/dimensions per arm and party, define an exhaustive non-overlapping harm taxonomy, and use declared population weights or prohibit cross-harm summation.
- **Closure owner:** Preparation comparator/statistics owner.

### R03-EF-06 · P2 · Public signal ceiling drops units and denominators

- **Location:** [signals/validate.mjs:43](../../../signals/validate.mjs#L43).
- **Counterexample:** Change the leading signal and portfolio from `modelled employed persons`/no denominator to `percentage points`/`all working-age residents`.
- **Consequence:** The registry remains valid and the public ceiling is byte-for-byte unchanged. Unit, denominator, statistical unit, and aggregation changes are invisible publicly.
- **Reproduction:** `machine_valid=true`, `public_ceiling_unchanged=true`.
- **Smallest repair:** Render all estimand fields in the ceiling and add mutation tests requiring public text to change.
- **Closure owner:** Signal registry/public-rendering owner.

### R03-EF-07 · P2 · Forecast-language guard omits the hashed outcome scope

- **Location:** [paths/validate.mjs:100](../../../paths/validate.mjs#L100), [paths/validate.mjs:412](../../../paths/validate.mjs#L412).
- **Counterexample:** Set `outcome_scope.standard` to `95% probability of crisis`, then correctly reseal the scope, edge bindings, and generated public ceiling.
- **Consequence:** The path validates while its principal public sentence contains forbidden forecast, percentage, and crisis language.
- **Reproduction:** Returned `machine_valid: true`, no errors.
- **Smallest repair:** Scan all rendered public fields, especially `outcome_scope` and `public_claim_ceiling`, or enforce structured vocabulary before rendering.
- **Closure owner:** Possible-path public-language owner.

### R03-EF-08 · P2 · NERO reacquisition assurance is self-referential and non-reproducible

- **Location:** [source-reacquisition.test.mjs:13](../../../pilots/australia/rehearsal/tests/source-reacquisition.test.mjs#L13), [nero-reacquisition-2026-09-08.json:34](../../../pilots/australia/reproductions/nero-reacquisition-2026-09-08.json#L34).
- **Counterexample:** Replace both recorded archive hashes with the same arbitrary SHA-256 string. The test checks equality between fields but never reads the prior capture, archive bytes, or rebuilt output.
- **Consequence:** Claims of bit-for-bit continuity and 440-series reconstruction cannot be independently repeated after the unretained archive changes or disappears.
- **Reproduction:** Test assertions only inspect the observation record; `prior_capture_record` is never opened.
- **Smallest repair:** Bind the record to the prior capture’s actual checksum, preserve the archive in immutable CAS/object storage, retain a retrieval receipt, and rerun the builder in the test.
- **Closure owner:** Source provenance/reconstruction owner.

## Explicit no-finding areas

- **P0:** None.
- NERO is consistently labelled modelled, not directly observed.
- Publisher authentication and exact-release-time limits are clearly disclosed; decision use remains prohibited.
- Declared source-lineage traversal catches registered NERO/LFS dependence.
- Forecast voids remain visible in the cohort denominator.
- Dual mechanical baselines, small-sample calibration withholding, infinite log-loss handling, and causal/authority disclaimers are sound within their stated unverified boundary.
- The observatory comparison protocol separates ITT, harms, multiplicity, missingness, clustering, and transport limits adequately for a proposal that is explicitly not preregistered or recruitment-ready.

## Verification

- Relevant exact-tree suites: **87/87 passed**.
- Full `npm test` in the archive snapshot reached two unrelated frozen-ref tests that require `.git`; they failed only because `git archive` intentionally contains no repository metadata.
