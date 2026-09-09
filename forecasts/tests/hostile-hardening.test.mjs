import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertEvaluationPlanSemantics,
  evaluateDeclaredUtility,
  evaluateForecastCohort,
  evaluationPlanChecksum,
  issuedRecordChecksum,
} from "../lib/evaluation.mjs";
import { assertForecastSemantics } from "../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const readJson = (name) => JSON.parse(readFileSync(join(root, "fixtures", name), "utf8"));
const issued = readJson("binary.issued.json");
const resolved = readJson("binary.resolved.json");
const decisionResolved = readJson("decision-linked.resolved.json");

function resealResolution(record, value = 20) {
  const payload = {
    schema_version: "1.1.0",
    resolution_event_id: record.target.resolution_event_id,
    signal_id: record.target.signal_id,
    metric_id: record.target.metric_id,
    metric_checksum: record.target.metric_checksum,
    condition_id: record.target.condition_id,
    scope_hash: record.target.scope_hash,
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

function hardenedPlan(records) {
  const ids = records.map((record) => record.id);
  const plan = {
    schema_version: "1.1.0",
    id: "forecast-evaluation.hostile.v1",
    registered_at: "2026-09-09T00:00:00Z",
    claimed_registered_commit: "0000000",
    registration_anchor: {
      source: "https://example.org/hostile/registration",
      retrieved_at: "2026-09-09T00:00:00Z",
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
        source: "https://example.org/hostile/cohort-policy",
        retrieved_at: "2026-09-07T00:00:00Z",
        vintage: "cohort-policy-v1",
        checksum: `sha256:${"b".repeat(64)}`,
        verification_status: "unverified_external_review_required",
      },
    },
    eligible_registry_manifest: {
      sealed_at: "2026-09-09T00:00:00Z",
      eligible_forecast_ids: ids,
      source: "https://example.org/hostile/manifest",
      retrieved_at: "2026-09-09T00:00:00Z",
      vintage: "manifest-v1",
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
  };
  return { ...plan, registered_plan_checksum: evaluationPlanChecksum(plan) };
}

function voidedRecord({
  id = "forecast.hostile-void.v1",
  voidedAt = "2026-10-01T00:00:00Z",
  evidenceAt = voidedAt,
  adjudicationAt = voidedAt,
  adjudicatorId = "claimed-independent-reviewer",
} = {}) {
  const record = structuredClone(issued);
  record.id = id;
  record.status = "void";
  record.resolution = {
    status: "void",
    outcome: null,
    voided_at: voidedAt,
    reason_code: "source_retired",
    reason: "Claimed source retirement.",
    evidence: {
      source: "https://example.org/retirement",
      published_at: evidenceAt,
      retrieved_at: evidenceAt,
      vintage: "retirement-v1",
      checksum: `sha256:${"c".repeat(64)}`,
    },
    adjudication: {
      claimed_adjudicator_id: adjudicatorId,
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence: {
        source: "https://example.org/retirement/review",
        published_at: adjudicationAt,
        retrieved_at: adjudicationAt,
        vintage: "review-v1",
        checksum: `sha256:${"d".repeat(64)}`,
      },
    },
  };
  record.history.push({ at: voidedAt, event: "voided", actor: "test" });
  return record;
}

test("an evaluation cannot select a caller-supplied subset without a pre-issue rule and sealed manifest", () => {
  const omitted = structuredClone(resolved);
  omitted.id = "forecast.hostile-omitted.v1";
  const plan = hardenedPlan([resolved]);
  plan.eligible_registry_manifest.eligible_forecast_ids.push(omitted.id);
  plan.registered_plan_checksum = evaluationPlanChecksum(plan);
  assert.throws(
    () => assertEvaluationPlanSemantics(plan, [resolved]),
    /pre-issue|eligibility|manifest/i,
  );
});

test("resolution evidence cannot predate issue or its declared publication boundary", () => {
  const knownOutcome = structuredClone(resolved);
  knownOutcome.resolution.evidence.published_at = "2026-01-01T00:00:00Z";
  assert.throws(() => assertForecastSemantics(knownOutcome), /publish|known|issued_at/i);
});

test("a perfectly correct baseline cannot crash scoring", () => {
  const perfectBaseline = structuredClone(resolved);
  perfectBaseline.baseline.probability = 1;
  const plan = hardenedPlan([perfectBaseline]);
  const report = evaluateForecastCohort(plan, [perfectBaseline], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.scores.individual[0].reference_class_brier_skill, null);
  assert.equal(
    report.scores.individual[0].reference_class_brier_skill_state,
    "undefined_perfect_baseline",
  );
  assert.equal(report.scores.aggregate_reference_class_brier_skill, null);
  assert.equal(
    report.scores.aggregate_reference_class_brier_skill_state,
    "undefined_perfect_baseline",
  );
});

test("an all-void cohort is lifecycle complete but not performance evaluable", () => {
  const voided = voidedRecord();
  const report = evaluateForecastCohort(hardenedPlan([voided]), [voided], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.interpretation.lifecycle_complete, true);
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(report.cohort.score_coverage, 0);
  assert.equal(report.cohort.void_rate, 1);
  assert.equal(report.cohort.minimum_score_coverage, 0.8);
  assert.equal(
    report.voids[0].adjudication.verification_status,
    "unverified_external_review_required",
  );

  const unadjudicated = structuredClone(voided);
  delete unadjudicated.resolution.adjudication;
  assert.throws(() => assertForecastSemantics(unadjudicated), /void.*adjudication/i);

  const mixed = evaluateForecastCohort(hardenedPlan([resolved, voided]), [resolved, voided], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(mixed.cohort.score_coverage, 0.5);
  assert.equal(mixed.interpretation.lifecycle_complete, true);
  assert.equal(mixed.interpretation.performance_evaluable, false);
});

test("an exact five-record cohort cannot hide a selective post-publication void at the coverage floor", () => {
  const scored = Array.from({ length: 4 }, (_, index) => {
    const record = structuredClone(resolved);
    record.id = `forecast.hostile-selective-void.scored-${index + 1}.v1`;
    record.target.resolution_event_id = `event.hostile-selective-void.${index + 1}`;
    record.target.independence_cluster_id = `cluster.hostile-selective-void.${index + 1}`;
    resealResolution(record);
    return record;
  });
  const selectivelyVoided = voidedRecord({
    id: "forecast.hostile-selective-void.excluded.v1",
    voidedAt: "2027-08-16T00:00:00Z",
  });
  const cohort = [...scored, selectivelyVoided];

  const report = evaluateForecastCohort(hardenedPlan(cohort), cohort, {
    asOf: "2027-08-17T00:00:00Z",
  });

  assert.equal(report.cohort.registered, 5);
  assert.equal(report.cohort.scored, 4);
  assert.equal(report.cohort.score_coverage, 0.8);
  assert.equal(report.cohort.post_publication_voids, 1);
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(
    report.interpretation.performance_withheld_reason,
    "post_publication_voids_present",
  );
});

test("void adjudication must follow its evidence and be claimed by someone other than the forecaster", () => {
  const prematureAdjudication = voidedRecord({
    evidenceAt: "2026-10-01T00:00:00Z",
    adjudicationAt: "2026-09-30T00:00:00Z",
  });
  assert.throws(
    () => assertForecastSemantics(prematureAdjudication),
    /adjudication.*after.*void evidence/i,
  );

  const selfAdjudicated = voidedRecord({ adjudicatorId: issued.provenance.author });
  assert.throws(
    () => assertForecastSemantics(selfAdjudicated),
    /adjudicator.*forecaster/i,
  );
});

test("declared utility arithmetic is stratified away from unconsulted decisions", () => {
  const ignored = structuredClone(decisionResolved);
  ignored.resolution.decision_observation.forecast_consulted = false;
  const value = evaluateDeclaredUtility(ignored);
  assert.equal(value.declared_utility_difference, 5);
  assert.equal("incremental_declared_utility" in value, false);

  const report = evaluateForecastCohort(hardenedPlan([ignored]), [ignored], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.declared_utility_arithmetic.groups[0].strata[0].forecast_consulted, false);
});

test("thirty copies of one resolution cluster do not unlock reliability rates", () => {
  const copies = Array.from({ length: 30 }, (_, index) => {
    const record = structuredClone(resolved);
    record.id = `forecast.hostile-copy.${index}.v1`;
    record.target.resolution_event_id = `event.hostile-copy.${index}`;
    resealResolution(record);
    return record;
  });
  const report = evaluateForecastCohort(hardenedPlan(copies), copies, {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.reliability.status, "withheld_dependent_n");
  assert.equal(report.reliability.claimed_independent_clusters, 1);
  assert.equal(report.reliability.independence_verified, false);
  assert.ok(report.reliability.bins.every((bin) => bin.observed_frequency === null));
});

test("utility bounds reject arithmetic that can overflow public JSON", () => {
  const overflow = structuredClone(decisionResolved);
  overflow.decision_context.utility_model.entries[1].value = -1e308;
  overflow.decision_context.utility_model.entries[3].value = 1e308;
  assert.throws(() => assertForecastSemantics(overflow), /utility.*bound/i);
});

test("baseline policy is pre-issue, dual, campaign-level and explicitly unverified", () => {
  const late = structuredClone(issued);
  late.baseline.declared_at = late.issued_at;
  assert.throws(() => assertForecastSemantics(late), /baseline.*before.*issued_at/i);

  const second = structuredClone(resolved);
  second.id = "forecast.hostile-second.v1";
  second.target.resolution_event_id = "event.hostile-second";
  second.target.independence_cluster_id = "cluster.hostile-second";
  resealResolution(second);
  second.baseline.family_id = "opportunistic-family";
  const plan = hardenedPlan([resolved, second]);
  assert.throws(
    () => assertEvaluationPlanSemantics(plan, [resolved, second]),
    /campaign-level mechanical family/i,
  );

  const falselyVerified = structuredClone(issued);
  falselyVerified.naive_baseline.calculation.verification_status = "verified";
  assert.throws(() => assertForecastSemantics(falselyVerified), /content-addressed mechanical/i);
});

test("cohort policy must precede issuance and anchors cannot claim verified authority", () => {
  const latePolicy = hardenedPlan([resolved]);
  latePolicy.cohort_policy.registered_at = "2026-09-08T00:00:00Z";
  latePolicy.cohort_policy.anchor.retrieved_at = "2026-09-08T00:00:00Z";
  latePolicy.registered_plan_checksum = evaluationPlanChecksum(latePolicy);
  assert.throws(
    () => assertEvaluationPlanSemantics(latePolicy, [resolved]),
    /policy.*before.*issued/i,
  );

  const falseRegistrationAuthority = hardenedPlan([resolved]);
  falseRegistrationAuthority.registration_anchor.verification_status = "verified";
  falseRegistrationAuthority.registered_plan_checksum = evaluationPlanChecksum(
    falseRegistrationAuthority,
  );
  assert.throws(
    () => assertEvaluationPlanSemantics(falseRegistrationAuthority, [resolved]),
    /remain explicitly unverified/i,
  );

  const afterObservationStarted = hardenedPlan([resolved]);
  afterObservationStarted.registered_at = "2027-04-02T00:00:00Z";
  afterObservationStarted.registration_anchor.retrieved_at = "2027-04-02T00:00:00Z";
  afterObservationStarted.eligible_registry_manifest.sealed_at = "2027-04-02T00:00:00Z";
  afterObservationStarted.eligible_registry_manifest.retrieved_at = "2027-04-02T00:00:00Z";
  afterObservationStarted.registered_plan_checksum = evaluationPlanChecksum(afterObservationStarted);
  assert.throws(
    () => assertEvaluationPlanSemantics(afterObservationStarted, [resolved]),
    /before.*observation/i,
  );
});

test("decision records use claimed authority and cannot upgrade it inside the registry", () => {
  const falseAuthority = structuredClone(decisionResolved);
  falseAuthority.decision_context.claimed_accountable_owner.verification_status = "verified";
  assert.throws(() => assertForecastSemantics(falseAuthority), /authority.*unverified/i);

  const falseAuthorisation = structuredClone(decisionResolved);
  falseAuthorisation.resolution.decision_observation.authority_verification_status = "verified";
  assert.throws(() => assertForecastSemantics(falseAuthorisation), /authority.*unverified/i);
});

test("public evaluation output retains baseline and registration trust boundaries", () => {
  const report = evaluateForecastCohort(hardenedPlan([resolved]), [resolved], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.deepEqual(report.report_provenance, {
    kind: "derived-forecast-evaluation-report",
    plan_id: "forecast-evaluation.hostile.v1",
    evaluated_as_of: "2027-08-15T00:00:00Z",
    input_provenance_classes: ["agent-proposal"],
    source_forecasts: [{
      forecast_id: resolved.id,
      epistemic_class: resolved.epistemic_class,
      forecast_use: resolved.forecast_use,
      provenance: resolved.provenance,
    }],
    source_authenticity_verified: false,
    empirical_truth_established: false,
    action_authorised: false,
  });
  assert.equal(report.registration.verification_status, "unverified_external_review_required");
  assert.equal(report.baseline_contract.campaign_id, "campaign.synthetic-transition-2027");
  assert.equal(
    report.baseline_contract.reference_class.calculation_verification_status,
    "unverified_external_review_required",
  );
  assert.equal(
    report.baseline_contract.naive.calculation_verification_status,
    "unverified_external_review_required",
  );
});

test("report provenance lists every distinct input class without lifting small-n ceilings", () => {
  const human = structuredClone(resolved);
  human.id = "forecast.hostile-human-provenance.v1";
  human.provenance.class = "human-judgement";
  human.target.resolution_event_id = "event.hostile-human-provenance.v1";
  human.target.independence_cluster_id = "cluster.hostile-human-provenance.v1";
  resealResolution(human);

  const records = [resolved, human];
  const report = evaluateForecastCohort(hardenedPlan(records), records, {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.deepEqual(
    report.report_provenance.input_provenance_classes,
    ["agent-proposal", "human-judgement"],
  );
  assert.equal(report.reliability.status, "withheld_small_n");
  assert.equal(report.reliability.calibration_established, false);
  assert.equal(report.interpretation.predictive_skill_established, false);
});
