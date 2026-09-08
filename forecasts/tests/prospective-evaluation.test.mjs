import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assertEvaluationPlanSemantics,
  evaluationPlanChecksum,
  evaluateDeclaredUtility,
  evaluateForecastCohort,
  issuedRecordChecksum,
} from "../lib/evaluation.mjs";
import { assertForecastSemantics } from "../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const forecasts = resolve(here, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const forecastSchema = readJson(join(forecasts, "schema", "binary-forecast.schema.json"));
const evaluationSchema = readJson(join(forecasts, "schema", "evaluation-plan.schema.json"));
const researchIssued = readJson(join(forecasts, "fixtures", "binary.issued.json"));
const researchResolved = readJson(join(forecasts, "fixtures", "binary.resolved.json"));
const decisionIssued = readJson(join(forecasts, "fixtures", "decision-linked.issued.json"));
const decisionResolved = readJson(join(forecasts, "fixtures", "decision-linked.resolved.json"));
const examplePlan = readJson(join(forecasts, "fixtures", "evaluation-plan.example.json"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateForecast = ajv.compile(forecastSchema);
const validatePlan = ajv.compile(evaluationSchema);

function resealResolution(record, value) {
  const payload = {
    schema_version: "1.0.0",
    resolution_event_id: record.target.resolution_event_id,
    measure: record.target.resolver.measure,
    unit: record.target.resolver.observation_unit,
    scope: record.target.scope,
    observation_window_start: record.target.observation_window_start,
    observation_window_end: record.target.observation_window_end,
    value,
  };
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  record.resolution.evidence.retained_bytes_base64 = bytes.toString("base64");
  record.resolution.evidence.checksum =
    `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function evaluationPlan(records, overrides = {}) {
  const ids = records.map((record) => record.id);
  const registeredAt = overrides.registered_at || "2026-09-09T00:00:00Z";
  const plan = {
    schema_version: "1.1.0",
    id: "forecast-evaluation.synthetic-2027.v1",
    registered_at: registeredAt,
    claimed_registered_commit: "0000000",
    registration_anchor: {
      source: "https://example.org/forecast-evaluations/registration-v1",
      retrieved_at: registeredAt,
      vintage: "registration-v1",
      checksum: `sha256:${"a".repeat(64)}`,
      verification_status: "unverified_external_review_required",
    },
    cohort_policy: {
      campaign_id: "campaign.synthetic-transition-2027",
      registered_at: "2026-09-07T00:00:00Z",
      eligibility_rule: {
        kind: "all_issued_campaign_records",
        campaign_id: "campaign.synthetic-transition-2027",
        exclusions: "none",
      },
      anchor: {
        source: "https://example.org/forecast-evaluations/cohort-policy-v1",
        retrieved_at: "2026-09-07T00:00:00Z",
        vintage: "cohort-policy-v1",
        checksum: `sha256:${"b".repeat(64)}`,
        verification_status: "unverified_external_review_required",
      },
    },
    eligible_registry_manifest: {
      sealed_at: registeredAt,
      eligible_forecast_ids: ids,
      source: "https://example.org/forecast-evaluations/registry-manifest-v1",
      retrieved_at: registeredAt,
      vintage: "registry-manifest-v1",
      checksum: `sha256:${"c".repeat(64)}`,
      verification_status: "unverified_external_review_required",
    },
    forecast_use_scope: ["research_only", "decision_linked"],
    cohort: records.map((record) => ({
      forecast_id: record.id,
      issued_record_checksum: issuedRecordChecksum(record),
    })),
    scoring: {
      primary: "brier",
      secondary: ["log_loss"],
      baseline_comparator: "campaign_mechanical_naive_and_reference_class",
    },
    reliability: {
      bin_edges: [0, 0.5, 1],
      minimum_resolved_forecasts: 30,
      minimum_forecasts_per_bin: 5,
      minimum_independent_clusters: 20,
      minimum_independent_clusters_per_bin: 5,
      small_n_handling: "withhold_rates_and_calibration_language",
    },
    void_handling: {
      cohort_denominator: "all_registered_forecasts",
      scoring: "exclude_with_visible_disclosure",
      adjudication_required: true,
      minimum_score_coverage: 0.8,
    },
    declared_utility: {
      comparator: "declared_no_model_policy",
      aggregation: "stratify_by_utility_scale_consultation_and_adherence",
    },
    ...overrides,
  };
  return {
    ...plan,
    registered_plan_checksum: evaluationPlanChecksum(plan),
  };
}

function resolvedSeries(count) {
  return Array.from({ length: count }, (_, index) => {
    const record = structuredClone(researchResolved);
    record.id = `forecast.synthetic-series.case-${String(index + 1).padStart(2, "0")}.v1`;
    record.target.resolution_event_id = `event.synthetic-series.${index + 1}`;
    record.target.independence_cluster_id = `cluster.synthetic-series.${index + 1}`;
    record.probability = (index % 10 + 0.5) / 10;
    record.baseline.probability = 0.5;
    record.resolution.outcome = index % 3 === 0 ? 1 : 0;
    resealResolution(record, record.resolution.outcome === 1 ? 20 : 19);
    return record;
  });
}

test("forecast use is explicit and decision-linked records require a human owner and pinned policy", () => {
  assert.equal(validateForecast(researchIssued), true, ajv.errorsText(validateForecast.errors));
  assert.equal(validateForecast(decisionIssued), true, ajv.errorsText(validateForecast.errors));
  assert.doesNotThrow(() => assertForecastSemantics(researchIssued));
  assert.doesNotThrow(() => assertForecastSemantics(decisionIssued));

  const undeclaredUse = structuredClone(researchIssued);
  delete undeclaredUse.forecast_use;
  assert.equal(validateForecast(undeclaredUse), false, "forecast use cannot be inferred later");

  const researchWithDecision = structuredClone(researchIssued);
  researchWithDecision.decision_context = decisionIssued.decision_context;
  assert.equal(validateForecast(researchWithDecision), false, "research-only records cannot masquerade as decision-linked");

  const ownerless = structuredClone(decisionIssued);
  delete ownerless.decision_context.claimed_accountable_owner;
  assert.equal(validateForecast(ownerless), false, "a decision-linked forecast needs an accountable owner");

  const unpinned = structuredClone(decisionIssued);
  unpinned.decision_context.no_model_baseline.policy_snapshot.checksum = "sha256:unverified";
  assert.equal(validateForecast(unpinned), false, "the no-model policy must be content-addressed");

  const lateBaseline = structuredClone(decisionIssued);
  lateBaseline.decision_context.no_model_baseline.declared_at = "2026-09-08T00:00:01Z";
  assert.throws(() => assertForecastSemantics(lateBaseline), /baseline.*issued_at/i);

  const anonymousAcknowledgement = structuredClone(decisionIssued);
  anonymousAcknowledgement.decision_context.claimed_accountable_owner.acknowledged_at = "2026-09-08T00:00:01Z";
  assert.throws(() => assertForecastSemantics(anonymousAcknowledgement), /owner.*issued_at/i);

  const ungroundedUtility = structuredClone(decisionIssued);
  delete ungroundedUtility.decision_context.utility_model.basis;
  assert.equal(validateForecast(ungroundedUtility), false, "a utility table needs a pinned value basis");

  const retrospectiveUtility = structuredClone(decisionIssued);
  retrospectiveUtility.decision_context.utility_model.basis.declared_at = "2026-09-08T00:00:01Z";
  assert.throws(() => assertForecastSemantics(retrospectiveUtility), /utility.*issued_at/i);
});

test("decision observations remain human records and cannot arrive after the outcome", () => {
  assert.equal(validateForecast(decisionResolved), true, ajv.errorsText(validateForecast.errors));
  assert.doesNotThrow(() => assertForecastSemantics(decisionResolved));

  const noDecisionRecord = structuredClone(decisionResolved);
  delete noDecisionRecord.resolution.decision_observation;
  assert.throws(() => assertForecastSemantics(noDecisionRecord), /decision observation/i);

  const afterOutcome = structuredClone(decisionResolved);
  afterOutcome.resolution.decision_observation.decided_at = "2027-08-16T00:00:00Z";
  assert.throws(() => assertForecastSemantics(afterOutcome), /decision.*resolution/i);

  const wrongOwner = structuredClone(decisionResolved);
  wrongOwner.resolution.decision_observation.claimed_authoriser_id = "someone-else";
  assert.throws(() => assertForecastSemantics(wrongOwner), /accountable owner/i);

  const unavailableAction = structuredClone(decisionResolved);
  unavailableAction.resolution.decision_observation.action_taken = "coerce deployment";
  assert.throws(() => assertForecastSemantics(unavailableAction), /eligible action/i);
});

test("a prospective evaluation plan freezes cohort, targets and bins before outcomes", () => {
  const records = [researchResolved, decisionResolved];
  const plan = evaluationPlan(records);
  assert.equal(validatePlan(plan), true, ajv.errorsText(validatePlan.errors));
  assert.doesNotThrow(() => assertEvaluationPlanSemantics(plan, records));

  const postOutcomePlan = evaluationPlan(records, { registered_at: "2027-08-16T00:00:00Z" });
  assert.throws(() => assertEvaluationPlanSemantics(postOutcomePlan, records), /before.*resolution window/i);

  const movedTarget = structuredClone(researchResolved);
  movedTarget.target.event = "A retrospectively easier event occurred.";
  assert.throws(
    () => assertEvaluationPlanSemantics(plan, [movedTarget, decisionResolved]),
    /issued record checksum/i,
  );

  assert.throws(
    () => assertEvaluationPlanSemantics(plan, [researchResolved]),
    /cohort.*missing/i,
  );

  const undeclaredExtra = structuredClone(researchResolved);
  undeclaredExtra.id = "forecast.synthetic.undeclared-extra.v1";
  assert.throws(
    () => assertEvaluationPlanSemantics(plan, [...records, undeclaredExtra]),
    /cohort.*undeclared/i,
  );

  const revisedBins = structuredClone(plan);
  revisedBins.reliability.bin_edges = [0, 0.7, 1];
  assert.throws(
    () => assertEvaluationPlanSemantics(revisedBins, records),
    /registered plan checksum/i,
    "post-hoc bin changes must invalidate the registered plan",
  );
});

test("the example plan is schema-valid, self-checking and prospective", () => {
  assert.equal(validatePlan(examplePlan), true, ajv.errorsText(validatePlan.errors));
  assert.equal(evaluationPlanChecksum(examplePlan), examplePlan.registered_plan_checksum);
  assert.doesNotThrow(() => assertEvaluationPlanSemantics(examplePlan, [researchIssued]));
});

test("evaluation rejects future knowledge at the stated as-of time", () => {
  const plan = evaluationPlan([researchResolved]);
  assert.throws(
    () => evaluateForecastCohort(plan, [researchResolved], { asOf: "2027-08-14T00:00:00Z" }),
    /future resolution/i,
  );
  assert.doesNotThrow(() =>
    evaluateForecastCohort(plan, [researchResolved], { asOf: "2027-08-15T00:00:00Z" }),
  );
});

test("an issued forecast left unresolved after its deadline is an explicit evaluation failure", () => {
  const report = evaluateForecastCohort(evaluationPlan([researchIssued]), [researchIssued], {
    asOf: "2027-10-02T00:00:00Z",
  });
  assert.equal(report.cohort.pending, 0);
  assert.equal(report.cohort.overdue_unresolved, 1);
  assert.deepEqual(report.overdue_unresolved, [{
    forecast_id: researchIssued.id,
    resolve_by: researchIssued.resolve_by,
  }]);
  assert.equal(report.interpretation.lifecycle_complete, false);
  assert.equal(report.interpretation.performance_evaluable, false);
});

test("cohort registration precedes voids and recorded decisions, not only outcomes", () => {
  const earlyVoid = structuredClone(researchIssued);
  earlyVoid.status = "void";
  earlyVoid.resolution = {
    status: "void",
    outcome: null,
    voided_at: "2026-09-08T12:00:00Z",
    reason_code: "source_retired",
    reason: "The synthetic source retired before plan registration.",
    evidence: {
      source: "https://example.org/fictional-transition-survey/early-retirement-notice",
      published_at: "2026-09-08T12:00:00Z",
      retrieved_at: "2026-09-08T12:00:00Z",
      vintage: "fictional-early-retirement-notice-v1",
      checksum: "sha256:7777777777777777777777777777777777777777777777777777777777777777",
    },
    adjudication: {
      claimed_adjudicator_id: "synthetic-independent-reviewer",
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence: {
        source: "https://example.org/fictional-transition-survey/early-void-review",
        published_at: "2026-09-08T12:00:00Z",
        retrieved_at: "2026-09-08T12:00:00Z",
        vintage: "early-void-review-v1",
        checksum: `sha256:${"8".repeat(64)}`,
      },
    },
  };
  earlyVoid.history.push({
    at: earlyVoid.resolution.voided_at,
    event: "voided",
    actor: "forecast test fixture",
  });
  assert.throws(
    () => assertEvaluationPlanSemantics(evaluationPlan([earlyVoid]), [earlyVoid]),
    /plan.*before.*terminal event/i,
  );

  const earlyDecision = structuredClone(decisionResolved);
  earlyDecision.resolution.decision_observation.decided_at = "2026-09-08T12:00:00Z";
  earlyDecision.resolution.decision_observation.evidence.published_at = "2026-09-08T12:00:00Z";
  earlyDecision.resolution.decision_observation.evidence.retrieved_at = "2026-09-08T12:00:00Z";
  assert.throws(
    () => assertEvaluationPlanSemantics(evaluationPlan([earlyDecision]), [earlyDecision]),
    /plan.*before.*decision observation/i,
  );
});

test("voids require an allowed reason and evidence, and stay visible in the registered denominator", () => {
  const voided = structuredClone(researchIssued);
  voided.status = "void";
  voided.resolution = {
    status: "void",
    outcome: null,
    voided_at: "2026-10-01T00:00:00Z",
    reason_code: "source_retired",
    reason: "The synthetic source retired.",
    evidence: {
      source: "https://example.org/fictional-transition-survey/retirement-notice",
      published_at: "2026-10-01T00:00:00Z",
      retrieved_at: "2026-10-01T00:00:00Z",
      vintage: "fictional-retirement-notice-v1",
      checksum: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    },
    adjudication: {
      claimed_adjudicator_id: "synthetic-independent-reviewer",
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence: {
        source: "https://example.org/fictional-transition-survey/void-review",
        published_at: "2026-10-01T00:00:00Z",
        retrieved_at: "2026-10-01T00:00:00Z",
        vintage: "void-review-v1",
        checksum: `sha256:${"d".repeat(64)}`,
      },
    },
  };
  voided.history.push({
    at: voided.resolution.voided_at,
    event: "voided",
    actor: "forecast test fixture",
    note: "Synthetic source-retirement event."
  });

  assert.equal(validateForecast(voided), true, ajv.errorsText(validateForecast.errors));
  assert.doesNotThrow(() => assertForecastSemantics(voided));

  const noEvidence = structuredClone(voided);
  delete noEvidence.resolution.evidence;
  assert.equal(validateForecast(noEvidence), false, "voids cannot disappear without evidence");

  const inventedReason = structuredClone(voided);
  inventedReason.resolution.reason_code = "forecast_was_wrong";
  assert.throws(() => assertForecastSemantics(inventedReason), /void reason.*declared/i);

  const report = evaluateForecastCohort(evaluationPlan([voided]), [voided], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.cohort.registered, 1);
  assert.equal(report.cohort.void, 1);
  assert.equal(report.cohort.resolved, 0);
  assert.deepEqual(report.voids, [{
    forecast_id: voided.id,
    reason_code: "source_retired",
    reason: "The synthetic source retired.",
    evidence_checksum: voided.resolution.evidence.checksum,
    evidence: voided.resolution.evidence,
    adjudication: {
      claimed_adjudicator_id: "synthetic-independent-reviewer",
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence_checksum: `sha256:${"d".repeat(64)}`,
      evidence: voided.resolution.adjudication.evidence,
    },
  }]);

  const decisionVoid = structuredClone(decisionIssued);
  decisionVoid.status = "void";
  decisionVoid.resolution = {
    status: "void",
    outcome: null,
    voided_at: "2026-10-02T00:00:00Z",
    reason_code: "source_retired",
    reason: "The synthetic source retired after the decision deadline.",
    evidence: {
      source: "https://example.org/fictional-continuity-survey/retirement-notice",
      published_at: "2026-10-02T00:00:00Z",
      retrieved_at: "2026-10-02T00:00:00Z",
      vintage: "fictional-continuity-retirement-v1",
      checksum: "sha256:6666666666666666666666666666666666666666666666666666666666666666",
    },
    adjudication: {
      claimed_adjudicator_id: "synthetic-independent-reviewer",
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence: {
        source: "https://example.org/fictional-continuity-survey/void-review",
        published_at: "2026-10-02T00:00:00Z",
        retrieved_at: "2026-10-02T00:00:00Z",
        vintage: "continuity-void-review-v1",
        checksum: `sha256:${"e".repeat(64)}`,
      },
    },
  };
  decisionVoid.history.push({
    at: decisionVoid.resolution.voided_at,
    event: "voided",
    actor: "forecast test fixture",
  });
  assert.throws(
    () => assertForecastSemantics(decisionVoid),
    /void.*decision observation/i,
    "a late void cannot erase a decision that should already have been recorded",
  );

  decisionVoid.resolution.decision_observation =
    structuredClone(decisionResolved.resolution.decision_observation);
  assert.equal(validateForecast(decisionVoid), true, ajv.errorsText(validateForecast.errors));
  assert.doesNotThrow(() => assertForecastSemantics(decisionVoid));
  const decisionVoidReport = evaluateForecastCohort(
    evaluationPlan([decisionVoid]),
    [decisionVoid],
    { asOf: "2026-10-02T00:00:00Z" },
  );
  assert.deepEqual(decisionVoidReport.voids[0].decision_observation, {
    decided_at: "2026-09-30T00:00:00Z",
    action_taken: "prepare reversible support",
    claimed_authoriser_id: "synthetic-transition-owner",
    authority_verification_status: "unverified_external_review_required",
    forecast_consulted: true,
    evidence_checksum:
      "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    evidence: decisionVoid.resolution.decision_observation.evidence,
  });
});

test("small samples expose scores but withhold reliability rates and calibration language", () => {
  const records = [researchResolved, decisionResolved];
  const report = evaluateForecastCohort(evaluationPlan(records), records, {
    asOf: "2027-08-15T00:00:00Z",
  });

  assert.equal(report.scores.resolved_forecasts, 2);
  assert.equal(report.scores.by_forecast_use.research_only.resolved_forecasts, 1);
  assert.equal(report.scores.by_forecast_use.decision_linked.resolved_forecasts, 1);
  assert.ok(Number.isFinite(report.scores.mean_brier));
  assert.ok(Number.isFinite(report.scores.mean_log_loss));
  assert.equal(report.reliability.status, "withheld_small_n");
  assert.equal(report.reliability_by_forecast_use.research_only.status, "withheld_small_n");
  assert.equal(report.reliability_by_forecast_use.decision_linked.status, "withheld_small_n");
  assert.equal(report.reliability.calibration_established, false);
  assert.ok(report.reliability.bins.every((bin) => bin.observed_frequency === null));
  assert.match(report.reliability.note, /descriptive scores.*not calibration/i);
});

test("declared reliability bins produce diagnostics only after the registered floor", () => {
  const records = resolvedSeries(30);
  const report = evaluateForecastCohort(evaluationPlan(records), records, {
    asOf: "2027-08-15T00:00:00Z",
  });

  assert.equal(
    report.reliability.status,
    "descriptive_diagnostic_only_claimed_clusters",
  );
  assert.equal(report.reliability.independence_verified, false);
  assert.equal(report.reliability.calibration_established, false);
  assert.equal(report.reliability.bins.reduce((sum, bin) => sum + bin.count, 0), 30);
  assert.ok(report.reliability.bins.some((bin) => bin.observed_frequency !== null));
  assert.doesNotMatch(JSON.stringify(report), /model is calibrated/i);
});

test("an impossible realised event keeps infinite log loss explicit and JSON-safe", () => {
  const certainMiss = structuredClone(researchResolved);
  certainMiss.id = "forecast.synthetic.certain-miss.v1";
  certainMiss.probability = 0;
  certainMiss.resolution.outcome = 1;
  const report = evaluateForecastCohort(evaluationPlan([certainMiss]), [certainMiss], {
    asOf: "2027-08-15T00:00:00Z",
  });

  assert.equal(report.scores.individual[0].log_loss, null);
  assert.equal(report.scores.individual[0].log_loss_state, "positive_infinity");
  assert.equal(report.scores.mean_log_loss, null);
  assert.equal(report.scores.mean_log_loss_state, "positive_infinity");
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(report)));
});

test("declared utility arithmetic compares the recorded human decision with the pinned no-model policy", () => {
  const result = evaluateDeclaredUtility(decisionResolved);
  assert.match(result.utility_model_checksum, /^sha256:[a-f0-9]{64}$/);
  const { utility_model_checksum: _utilityModelChecksum, ...comparable } = result;
  assert.deepEqual(comparable, {
    forecast_id: decisionResolved.id,
    claimed_accountable_owner_id: "synthetic-transition-owner",
    owner_authority_verification_status: "unverified_external_review_required",
    action_taken: "prepare reversible support",
    forecast_consulted: true,
    forecast_policy_action: "prepare reversible support",
    no_model_action: "continue monitoring",
    followed_forecast_policy: true,
    utility_scale_id: "synthetic-continuity-utility-v1",
    utility_unit: "synthetic decision points",
    utility_perspective: "fictional affected cohort",
    utility_basis_class: "agent_hypothesis",
    action_utility: 5,
    no_model_utility: 0,
    declared_utility_difference: 5,
    comparison_kind: "same_outcome_arithmetic_not_counterfactual_effect",
    outcome_interference: "action_may_affect_target",
    action_authorised_by_scoring: false,
    causal_effect_established: false,
    note: "A comparison under the predeclared utility table. It does not identify the forecast's causal value or authorise an action.",
  });

  const incompleteUtility = structuredClone(decisionResolved);
  incompleteUtility.decision_context.utility_model.entries.pop();
  assert.throws(() => assertForecastSemantics(incompleteUtility), /utility.*complete/i);
});

test("decision utility aggregates only within the same declared scale", () => {
  const second = structuredClone(decisionResolved);
  second.id = "forecast.synthetic-decision.second.v1";
  second.decision_context.utility_model.scale_id = "incommensurable-utility-v1";
  second.decision_context.utility_model.unit = "different synthetic units";

  const report = evaluateForecastCohort(evaluationPlan([decisionResolved, second]), [decisionResolved, second], {
    asOf: "2027-08-15T00:00:00Z",
  });

  assert.equal(report.declared_utility_arithmetic.groups.length, 2);
  assert.equal(report.declared_utility_arithmetic.groups[0].forecast_consulted_cases, 1);
  assert.equal(report.declared_utility_arithmetic.causal_effect_established, false);
  assert.equal(report.declared_utility_arithmetic.action_authorised, false);

  const conflictingDefinition = structuredClone(decisionResolved);
  conflictingDefinition.id = "forecast.synthetic-decision.conflicting-utility.v1";
  conflictingDefinition.decision_context.utility_model.entries[3].value = 9;
  assert.throws(
    () => evaluateForecastCohort(
      evaluationPlan([decisionResolved, conflictingDefinition]),
      [decisionResolved, conflictingDefinition],
      { asOf: "2027-08-15T00:00:00Z" },
    ),
    /utility scale.*multiple definitions/i,
  );
});
