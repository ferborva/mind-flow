import { createHash } from "node:crypto";

import {
  IMMUTABLE_ISSUE_FIELDS,
  assertContentAddressedEvidence,
  assertForecastSemantics,
  parseExactInstant,
} from "./registry.mjs";
import {
  ForecastScoringWithheldError,
  requireReconstructedResolution,
} from "./resolution.mjs";
import { scoreBinaryForecast } from "./scoring.mjs";

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const FORECAST_USES = new Set(["research_only", "decision_linked"]);
const SCORE_FIELDS = [
  "brier",
  "reference_class_baseline_brier",
  "naive_baseline_brier",
  "log_loss",
  "reference_class_baseline_log_loss",
  "naive_baseline_log_loss",
];

function rounded(value) {
  return Number(value.toFixed(12));
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function mean(values) {
  if (!values.length) return null;
  if (values.some((value) => value === Number.POSITIVE_INFINITY)) {
    return Number.POSITIVE_INFINITY;
  }
  return rounded(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function lossState(value) {
  if (value === null) return "not_available";
  return value === Number.POSITIVE_INFINITY ? "positive_infinity" : "finite";
}

function serializableLosses(score) {
  return {
    ...score,
    log_loss: Number.isFinite(score.log_loss) ? score.log_loss : null,
    log_loss_state: lossState(score.log_loss),
    reference_class_baseline_log_loss:
      Number.isFinite(score.reference_class_baseline_log_loss)
        ? score.reference_class_baseline_log_loss
        : null,
    reference_class_baseline_log_loss_state:
      lossState(score.reference_class_baseline_log_loss),
    naive_baseline_log_loss: Number.isFinite(score.naive_baseline_log_loss)
      ? score.naive_baseline_log_loss
      : null,
    naive_baseline_log_loss_state: lossState(score.naive_baseline_log_loss),
  };
}

function aggregateScores(rawScores, metadata = {}) {
  const meanBrier = mean(rawScores.map((score) => score.brier));
  const meanBaselineBrier = mean(
    rawScores.map((score) => score.reference_class_baseline_brier),
  );
  const meanNaiveBaselineBrier = mean(rawScores.map((score) => score.naive_baseline_brier));
  const rawMeanLogLoss = mean(rawScores.map((score) => score.log_loss));
  const rawMeanBaselineLogLoss = mean(
    rawScores.map((score) => score.reference_class_baseline_log_loss),
  );
  const rawMeanNaiveBaselineLogLoss = mean(
    rawScores.map((score) => score.naive_baseline_log_loss),
  );
  const skillAgainst = (baseline) => baseline > 0 && meanBrier !== null
    ? rounded(1 - meanBrier / baseline)
    : null;
  const skillState = (baseline) => {
    if (baseline === null) return "not_available";
    if (baseline > 0) return "finite";
    return meanBrier === 0 ? "undefined_both_perfect" : "undefined_perfect_baseline";
  };
  return {
    resolved_forecasts: metadata.resolvedForecasts ?? rawScores.length,
    scored_forecasts: metadata.scoredForecasts ?? rawScores.length,
    scored_events: metadata.scoredEvents ?? rawScores.length,
    scored_clusters: metadata.scoredClusters ?? rawScores.length,
    aggregation_unit: "equal-weighted-event-within-cluster",
    mean_brier: meanBrier,
    mean_reference_class_baseline_brier: meanBaselineBrier,
    aggregate_reference_class_brier_skill: skillAgainst(meanBaselineBrier),
    aggregate_reference_class_brier_skill_state: skillState(meanBaselineBrier),
    mean_naive_baseline_brier: meanNaiveBaselineBrier,
    aggregate_naive_brier_skill: skillAgainst(meanNaiveBaselineBrier),
    aggregate_naive_brier_skill_state: skillState(meanNaiveBaselineBrier),
    mean_log_loss: Number.isFinite(rawMeanLogLoss) ? rawMeanLogLoss : null,
    mean_log_loss_state: lossState(rawMeanLogLoss),
    mean_reference_class_baseline_log_loss: Number.isFinite(rawMeanBaselineLogLoss)
      ? rawMeanBaselineLogLoss
      : null,
    mean_reference_class_baseline_log_loss_state: lossState(rawMeanBaselineLogLoss),
    mean_naive_baseline_log_loss: Number.isFinite(rawMeanNaiveBaselineLogLoss)
      ? rawMeanNaiveBaselineLogLoss
      : null,
    mean_naive_baseline_log_loss_state: lossState(rawMeanNaiveBaselineLogLoss),
    reference_class_log_loss_improvement:
      Number.isFinite(rawMeanLogLoss) && Number.isFinite(rawMeanBaselineLogLoss)
        ? rounded(rawMeanBaselineLogLoss - rawMeanLogLoss)
        : null,
    naive_log_loss_improvement:
      Number.isFinite(rawMeanLogLoss) && Number.isFinite(rawMeanNaiveBaselineLogLoss)
        ? rounded(rawMeanNaiveBaselineLogLoss - rawMeanLogLoss)
        : null,
  };
}

function groupedBy(records, key) {
  const groups = new Map();
  for (const record of records) {
    const value = record[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(record);
  }
  return groups;
}

function averagedScoreFields(records) {
  return Object.fromEntries(
    SCORE_FIELDS.map((field) => [field, mean(records.map((record) => record[field]))]),
  );
}

function eventLevelScores(rawScores) {
  return [...groupedBy(rawScores, "resolution_event_id")].map(([eventId, records]) => {
    const clusters = new Set(records.map((record) => record.claimed_independence_cluster_id));
    const outcomes = new Set(records.map((record) => record.outcome));
    if (clusters.size !== 1) {
      throw new Error(`resolution event ${eventId} must map to one independence cluster`);
    }
    if (outcomes.size !== 1) {
      throw new Error(`resolution event ${eventId} has conflicting outcomes`);
    }
    return {
      resolution_event_id: eventId,
      claimed_independence_cluster_id: records[0].claimed_independence_cluster_id,
      forecast_count: records.length,
      probability: mean(records.map((record) => record.forecast_probability)),
      outcome: records[0].outcome,
      ...averagedScoreFields(records),
    };
  });
}

function clusterLevelScores(events) {
  return [...groupedBy(events, "claimed_independence_cluster_id")].map(
    ([clusterId, records]) => ({
      claimed_independence_cluster_id: clusterId,
      event_count: records.length,
      forecast_count: records.reduce((sum, record) => sum + record.forecast_count, 0),
      ...averagedScoreFields(records),
    }),
  );
}

function aggregateRegisteredScores(rawScores, resolvedForecasts, withhold = false) {
  const events = eventLevelScores(rawScores);
  const clusters = clusterLevelScores(events);
  return {
    aggregate: aggregateScores(withhold ? [] : clusters, {
      resolvedForecasts,
      scoredForecasts: rawScores.length,
      scoredEvents: events.length,
      scoredClusters: clusters.length,
    }),
    events: withhold ? [] : events,
    clusters: withhold ? [] : clusters,
  };
}

function issuedProjection(forecast) {
  return Object.fromEntries(
    IMMUTABLE_ISSUE_FIELDS
      .filter((field) => forecast[field] !== undefined)
      .map((field) => [field, forecast[field]]),
  );
}

function objectChecksum(value) {
  const bytes = JSON.stringify(canonicalValue(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function issuedRecordChecksum(forecast) {
  return objectChecksum(issuedProjection(forecast));
}

export function evaluationPlanChecksum(plan) {
  const projection = Object.fromEntries(
    Object.entries(plan || {}).filter(([key]) => key !== "registered_plan_checksum"),
  );
  return objectChecksum(projection);
}

function assertPlanShape(plan) {
  if (plan?.schema_version !== "1.1.0") {
    throw new TypeError("evaluation plan schema_version must be 1.1.0");
  }
  if (!/^forecast-evaluation\.[a-z0-9][a-z0-9.-]+\.v[0-9]+$/.test(plan.id || "")) {
    throw new TypeError("evaluation plan id is invalid");
  }
  if (!/^[a-f0-9]{7,40}$/.test(plan.claimed_registered_commit || "")) {
    throw new TypeError("evaluation plan must name its claimed registration commit");
  }
  if (evaluationPlanChecksum(plan) !== plan.registered_plan_checksum) {
    throw new Error("evaluation registered plan checksum does not match its contents");
  }

  const uses = plan.forecast_use_scope || [];
  if (!uses.length || new Set(uses).size !== uses.length || uses.some((use) => !FORECAST_USES.has(use))) {
    throw new TypeError("evaluation plan must declare unique forecast uses");
  }

  if (
    plan.scoring?.primary !== "brier" ||
    plan.scoring?.baseline_comparator !== "campaign_mechanical_naive_and_reference_class" ||
    !Array.isArray(plan.scoring?.secondary) ||
    plan.scoring.secondary.some((score) => score !== "log_loss")
  ) {
    throw new TypeError("evaluation plan must predeclare supported proper scoring rules");
  }

  const reliability = plan.reliability || {};
  const edges = reliability.bin_edges || [];
  if (
    edges.length < 2 ||
    edges[0] !== 0 ||
    edges.at(-1) !== 1 ||
    edges.some((edge, index) =>
      typeof edge !== "number" || !Number.isFinite(edge) || edge < 0 || edge > 1 ||
      (index > 0 && edge <= edges[index - 1]))
  ) {
    throw new Error("reliability bin edges must increase strictly from 0 to 1");
  }
  if (!Number.isInteger(reliability.minimum_resolved_forecasts) ||
      reliability.minimum_resolved_forecasts < 30) {
    throw new Error("reliability diagnostics require a declared floor of at least 30 resolved forecasts");
  }
  if (!Number.isInteger(reliability.minimum_forecasts_per_bin) ||
      reliability.minimum_forecasts_per_bin < 5) {
    throw new Error("reliability bins require a declared floor of at least 5 forecasts");
  }
  if (!Number.isInteger(reliability.minimum_independent_clusters) ||
      reliability.minimum_independent_clusters < 20 ||
      !Number.isInteger(reliability.minimum_independent_clusters_per_bin) ||
      reliability.minimum_independent_clusters_per_bin < 5) {
    throw new Error("reliability diagnostics require independent-cluster floors");
  }
  if (reliability.small_n_handling !== "withhold_rates_and_calibration_language") {
    throw new Error("evaluation plan must fail closed for small reliability samples");
  }
  if (
    plan.void_handling?.cohort_denominator !== "all_registered_forecasts" ||
    plan.void_handling?.scoring !== "exclude_with_visible_disclosure" ||
    plan.void_handling?.adjudication_required !== true ||
    typeof plan.void_handling?.minimum_score_coverage !== "number" ||
    !Number.isFinite(plan.void_handling.minimum_score_coverage) ||
    plan.void_handling.minimum_score_coverage < 0.8 ||
    plan.void_handling.minimum_score_coverage > 1
  ) {
    throw new Error("evaluation plan must retain and visibly disclose every registered void");
  }
  if (
    plan.declared_utility?.comparator !== "declared_no_model_policy" ||
    plan.declared_utility?.aggregation !==
      "stratify_by_utility_scale_consultation_and_adherence"
  ) {
    throw new Error("declared utility arithmetic must use the no-model policy and required strata");
  }
}

export function assertEvaluationPlanSemantics(plan, forecasts) {
  assertPlanShape(plan);
  const registeredAt = parseExactInstant(plan.registered_at, "evaluation plan registered_at");
  const registrationAnchor = assertContentAddressedEvidence(
    plan.registration_anchor,
    "evaluation plan registration anchor",
  );
  if (
    plan.registration_anchor?.verification_status !== "unverified_external_review_required" ||
    registrationAnchor.retrievedAt !== registeredAt
  ) {
    throw new Error("evaluation registration anchor must be sealed at registered_at and remain explicitly unverified");
  }
  const policy = plan.cohort_policy;
  if (
    !policy || policy.eligibility_rule?.kind !== "all_issued_campaign_records" ||
    policy.eligibility_rule?.campaign_id !== policy.campaign_id ||
    policy.eligibility_rule?.exclusions !== "none"
  ) {
    throw new Error("evaluation requires a pre-issue cohort eligibility rule");
  }
  const policyAt = parseExactInstant(policy.registered_at, "cohort policy registered_at");
  const policyAnchor = assertContentAddressedEvidence(policy.anchor, "cohort policy anchor");
  if (
    policy.anchor?.verification_status !== "unverified_external_review_required" ||
    policyAnchor.retrievedAt > policyAt
  ) {
    throw new Error("pre-issue cohort policy needs an explicitly unverified anchor");
  }
  const manifest = plan.eligible_registry_manifest;
  if (!manifest || manifest.verification_status !== "unverified_external_review_required") {
    throw new Error("evaluation requires a sealed eligible-registry manifest");
  }
  const manifestAt = parseExactInstant(manifest.sealed_at, "eligible registry manifest sealed_at");
  const manifestEvidence = assertContentAddressedEvidence(
    manifest,
    "eligible registry manifest",
  );
  if (manifestAt !== registeredAt || manifestEvidence.retrievedAt !== registeredAt) {
    throw new Error("eligible-registry manifest and evaluation plan must be sealed together");
  }
  if (!Array.isArray(forecasts)) {
    throw new TypeError("evaluation forecasts must be an array");
  }

  const declared = plan.cohort || [];
  const declaredIds = declared.map((entry) => entry.forecast_id);
  if (!declaredIds.length || new Set(declaredIds).size !== declaredIds.length) {
    throw new Error("evaluation cohort must contain unique forecast ids");
  }
  if (declared.some((entry) => !SHA256.test(entry.issued_record_checksum || ""))) {
    throw new Error("evaluation cohort needs a SHA-256 issued record checksum");
  }
  const eligibleIds = manifest.eligible_forecast_ids || [];
  if (
    eligibleIds.length !== declaredIds.length ||
    eligibleIds.some((id) => !declaredIds.includes(id)) ||
    declaredIds.some((id) => !eligibleIds.includes(id))
  ) {
    throw new Error("evaluation cohort must equal the sealed eligible-registry manifest");
  }

  const recordsById = new Map();
  const clusterByResolutionEvent = new Map();
  for (const forecast of forecasts) {
    if (recordsById.has(forecast?.id)) {
      throw new Error(`evaluation cohort contains duplicate forecast ${forecast?.id}`);
    }
    recordsById.set(forecast?.id, forecast);
    const eventId = forecast?.target?.resolution_event_id;
    const clusterId = forecast?.target?.independence_cluster_id;
    const knownCluster = clusterByResolutionEvent.get(eventId);
    if (knownCluster !== undefined && knownCluster !== clusterId) {
      throw new Error(`resolution event ${eventId} must map to one independence cluster`);
    }
    clusterByResolutionEvent.set(eventId, clusterId);
  }

  const missing = declaredIds.filter((id) => !recordsById.has(id));
  if (missing.length) {
    throw new Error(`evaluation cohort is missing registered forecasts: ${missing.join(", ")}`);
  }
  const undeclared = [...recordsById.keys()].filter((id) => !declaredIds.includes(id));
  if (undeclared.length) {
    throw new Error(`evaluation cohort contains undeclared forecasts: ${undeclared.join(", ")}`);
  }

  for (const entry of declared) {
    const forecast = recordsById.get(entry.forecast_id);
    assertForecastSemantics(forecast);
    if (!plan.forecast_use_scope.includes(forecast.forecast_use)) {
      throw new Error(`forecast ${forecast.id} use is outside the registered evaluation scope`);
    }
    const issuedAt = parseExactInstant(forecast.issued_at, `${forecast.id} issued_at`);
    const resolveAfter = parseExactInstant(forecast.resolve_after, `${forecast.id} resolve_after`);
    const observationStartsAt = parseExactInstant(
      forecast.target.observation_window_start,
      `${forecast.id} observation_window_start`,
    );
    if (policyAt >= issuedAt) {
      throw new Error("cohort eligibility policy must be registered before every forecast is issued");
    }
    if (forecast.baseline.campaign_id !== policy.campaign_id ||
        forecast.naive_baseline.campaign_id !== policy.campaign_id) {
      throw new Error(`forecast ${forecast.id} baselines are outside the registered campaign`);
    }
    if (registeredAt < issuedAt) {
      throw new Error("evaluation plan cannot be registered before a cohort forecast is issued");
    }
    if (registeredAt >= resolveAfter) {
      throw new Error("evaluation plan must be registered before every forecast resolution window");
    }
    if (registeredAt >= observationStartsAt) {
      throw new Error("evaluation plan and eligible manifest must be sealed before every observation window");
    }
    if (forecast.status === "void" &&
        registeredAt >= parseExactInstant(
          forecast.resolution.voided_at,
          `${forecast.id} voided_at`,
        )) {
      throw new Error("evaluation plan must be registered before every terminal event, including voids");
    }
    if (forecast.forecast_use === "decision_linked" &&
        forecast.resolution?.decision_observation &&
        registeredAt >= parseExactInstant(
          forecast.resolution.decision_observation.decided_at,
          `${forecast.id} decision observation decided_at`,
        )) {
      throw new Error("evaluation plan must be registered before every decision observation");
    }
    if (issuedRecordChecksum(forecast) !== entry.issued_record_checksum) {
      throw new Error(`forecast ${forecast.id} issued record checksum does not match the registered cohort`);
    }
  }

  for (const baselineField of ["baseline", "naive_baseline"]) {
    const first = forecasts[0][baselineField];
    for (const forecast of forecasts.slice(1)) {
      const candidate = forecast[baselineField];
      for (const key of [
        "campaign_id",
        "family_id",
        "name",
        "kind",
        "mechanical_role",
        "method",
      ]) {
        if (candidate[key] !== first[key]) {
          throw new Error(`${baselineField} must use one campaign-level mechanical family`);
        }
      }
      if (
        candidate.policy_snapshot.checksum !== first.policy_snapshot.checksum ||
        candidate.calculation.algorithm_id !== first.calculation.algorithm_id ||
        candidate.calculation.version !== first.calculation.version
      ) {
        throw new Error(`${baselineField} policy and algorithm must be campaign-level and immutable`);
      }
    }
  }
  return true;
}

function utilityFor(context, action, outcome) {
  const entry = context.utility_model.entries.find(
    (candidate) => candidate.action === action && candidate.outcome === outcome,
  );
  if (!entry) throw new Error("decision utility table is incomplete");
  return entry.value;
}

export function evaluateDeclaredUtility(forecast) {
  assertForecastSemantics(forecast);
  if (forecast.forecast_use !== "decision_linked" || forecast.status !== "resolved") {
    throw new TypeError("declared utility arithmetic requires a resolved decision-linked forecast");
  }
  const resolutionReconstruction = requireReconstructedResolution(forecast);

  const context = forecast.decision_context;
  const observation = forecast.resolution.decision_observation;
  const policy = context.forecast_policy;
  const forecastAction = forecast.probability >= policy.probability_threshold
    ? policy.action_at_or_above
    : policy.action_below;
  const noModelAction = context.no_model_baseline.action;
  const actionUtility = utilityFor(context, observation.action_taken, resolutionReconstruction.outcome);
  const noModelUtility = utilityFor(context, noModelAction, resolutionReconstruction.outcome);

  return {
    forecast_id: forecast.id,
    claimed_accountable_owner_id: context.claimed_accountable_owner.claimed_owner_id,
    owner_authority_verification_status:
      context.claimed_accountable_owner.verification_status,
    action_taken: observation.action_taken,
    forecast_consulted: observation.forecast_consulted,
    forecast_policy_action: forecastAction,
    no_model_action: noModelAction,
    followed_forecast_policy: observation.action_taken === forecastAction,
    utility_scale_id: context.utility_model.scale_id,
    utility_unit: context.utility_model.unit,
    utility_perspective: context.utility_model.perspective,
    utility_basis_class: context.utility_model.basis.class,
    utility_model_checksum: objectChecksum(context.utility_model),
    action_utility: actionUtility,
    no_model_utility: noModelUtility,
    declared_utility_difference: rounded(actionUtility - noModelUtility),
    comparison_kind: "same_outcome_arithmetic_not_counterfactual_effect",
    outcome_interference: context.outcome_interference,
    action_authorised_by_scoring: false,
    causal_effect_established: false,
    note: "A comparison under the predeclared utility table. It does not identify the forecast's causal value or authorise an action.",
  };
}

function reliabilityBins(events, plan, withhold = false) {
  const enoughTotal = events.length >= plan.reliability.minimum_resolved_forecasts;
  const independentClusters = new Set(
    events.map((event) => event.claimed_independence_cluster_id),
  ).size;
  const enoughIndependent =
    independentClusters >= plan.reliability.minimum_independent_clusters;
  const edges = plan.reliability.bin_edges;
  const bins = edges.slice(0, -1).map((lower, index) => {
    const upper = edges[index + 1];
    const last = index === edges.length - 2;
    const records = events.filter((event) =>
      event.probability >= lower && (last ? event.probability <= upper : event.probability < upper));
    const enoughBin = records.length >= plan.reliability.minimum_forecasts_per_bin;
    const independentClusterCount = new Set(
      records.map((record) => record.claimed_independence_cluster_id),
    ).size;
    const enoughIndependentBin = independentClusterCount >=
      plan.reliability.minimum_independent_clusters_per_bin;
    const publishRates = !withhold && enoughTotal && enoughIndependent && enoughBin && enoughIndependentBin;
    const clusterGroups = [...groupedBy(records, "claimed_independence_cluster_id").values()];
    return {
      lower,
      upper,
      upper_inclusive: last,
      count: records.length,
      event_count: records.length,
      claimed_independent_cluster_count: independentClusterCount,
      mean_probability: publishRates
        ? mean(clusterGroups.map((cluster) => mean(cluster.map((record) => record.probability))))
        : null,
      observed_frequency: publishRates
        ? mean(clusterGroups.map((cluster) => mean(cluster.map((record) => record.outcome))))
        : null,
      status: withhold ? "withheld_ineligible_cohort" : publishRates
        ? "descriptive_rate_claimed_clusters"
        : enoughTotal && !enoughIndependent
          ? "withheld_dependent_n"
          : "withheld_small_n",
    };
  });

  return {
    status: withhold ? "withheld_ineligible_cohort" : enoughTotal && enoughIndependent
      ? "descriptive_diagnostic_only_claimed_clusters"
      : enoughTotal
        ? "withheld_dependent_n"
        : "withheld_small_n",
    calibration_established: false,
    resolved_events: events.length,
    minimum_resolved_forecasts: plan.reliability.minimum_resolved_forecasts,
    minimum_resolved_events: plan.reliability.minimum_resolved_forecasts,
    minimum_forecasts_per_bin: plan.reliability.minimum_forecasts_per_bin,
    minimum_events_per_bin: plan.reliability.minimum_forecasts_per_bin,
    claimed_independent_clusters: independentClusters,
    independence_verified: false,
    aggregation_unit: "equal-weighted-event-within-cluster",
    minimum_independent_clusters: plan.reliability.minimum_independent_clusters,
    minimum_independent_clusters_per_bin:
      plan.reliability.minimum_independent_clusters_per_bin,
    bins,
    note: withhold
      ? "Cohort performance is ineligible. Scores and reliability rates are withheld."
      : enoughTotal && enoughIndependent
      ? "Predeclared reliability bins aggregate registered events within unverified claimed clusters. They are descriptive diagnostics only and do not establish independence or calibration."
      : enoughTotal
        ? "Registered event count was met but the independent-cluster floor was not. Reliability rates and calibration language are withheld."
        : "Individual and aggregate descriptive scores may be reported, but they are not calibration evidence. The registered event floor was not met, so reliability rates and calibration language are withheld.",
  };
}

function declaredUtilityReport(records) {
  const cases = records
    .filter((record) => record.forecast_use === "decision_linked")
    .map(evaluateDeclaredUtility);
  const groupsByScale = new Map();
  for (const value of cases) {
    const existing = groupsByScale.get(value.utility_scale_id);
    if (existing &&
        (existing.utility_unit !== value.utility_unit ||
         existing.utility_perspective !== value.utility_perspective ||
         existing.utility_basis_class !== value.utility_basis_class ||
         existing.utility_model_checksum !== value.utility_model_checksum)) {
      throw new Error(`utility scale ${value.utility_scale_id} has multiple definitions, units, perspectives or bases`);
    }
    if (!existing) {
      groupsByScale.set(value.utility_scale_id, {
        utility_scale_id: value.utility_scale_id,
        utility_unit: value.utility_unit,
        utility_perspective: value.utility_perspective,
        utility_basis_class: value.utility_basis_class,
        utility_model_checksum: value.utility_model_checksum,
        cases: 0,
        forecast_consulted_cases: 0,
        strata: new Map(),
      });
    }
    const group = groupsByScale.get(value.utility_scale_id);
    group.cases += 1;
    if (value.forecast_consulted) group.forecast_consulted_cases += 1;
    const stratumKey = `${value.forecast_consulted}:${value.followed_forecast_policy}`;
    if (!group.strata.has(stratumKey)) {
      group.strata.set(stratumKey, {
        forecast_consulted: value.forecast_consulted,
        followed_forecast_policy: value.followed_forecast_policy,
        cases: 0,
        declared_utility_difference_total: 0,
      });
    }
    const stratum = group.strata.get(stratumKey);
    stratum.cases += 1;
    stratum.declared_utility_difference_total += value.declared_utility_difference;
  }

  const groups = [...groupsByScale.values()].map((group) => ({
    ...group,
    strata: [...group.strata.values()].map((stratum) => ({
      ...stratum,
      declared_utility_difference_total: rounded(
        stratum.declared_utility_difference_total,
      ),
      mean_declared_utility_difference: rounded(
        stratum.declared_utility_difference_total / stratum.cases,
      ),
    })),
  }));
  return {
    cases,
    groups,
    action_authorised: false,
    causal_effect_established: false,
    note: "Declared utility arithmetic is separated by consultation and policy adherence inside a shared scale. It is not a causal estimate of model value.",
  };
}

export function evaluateForecastCohort(plan, forecasts, { asOf } = {}) {
  assertEvaluationPlanSemantics(plan, forecasts);
  const asOfTime = parseExactInstant(asOf, "evaluation asOf");
  const registeredAt = parseExactInstant(plan.registered_at, "evaluation plan registered_at");
  if (asOfTime < registeredAt) {
    throw new Error("evaluation asOf cannot precede plan registration");
  }

  for (const forecast of forecasts) {
    if (forecast.status === "resolved" &&
        parseExactInstant(forecast.resolution.resolved_at, `${forecast.id} resolved_at`) > asOfTime) {
      throw new Error(`evaluation contains a future resolution for ${forecast.id}`);
    }
    if (forecast.status === "void" &&
        parseExactInstant(forecast.resolution.voided_at, `${forecast.id} voided_at`) > asOfTime) {
      throw new Error(`evaluation contains a future void for ${forecast.id}`);
    }
  }

  const resolved = forecasts.filter((forecast) => forecast.status === "resolved");
  const voided = forecasts.filter((forecast) => forecast.status === "void");
  const postPublicationVoids = voided.filter((forecast) =>
    parseExactInstant(forecast.resolution.voided_at, `${forecast.id} voided_at`) >=
      parseExactInstant(
        forecast.target.outcome_publication_not_before,
        `${forecast.id} outcome_publication_not_before`,
      ));
  const unresolved = forecasts.filter((forecast) => forecast.status === "issued");
  const overdue = unresolved.filter((forecast) =>
    parseExactInstant(forecast.resolve_by, `${forecast.id} resolve_by`) < asOfTime);
  const overdueIds = new Set(overdue.map((forecast) => forecast.id));
  const pending = unresolved.filter((forecast) => !overdueIds.has(forecast.id));
  const outcomesByEvent = new Map();
  for (const forecast of resolved) {
    const eventId = forecast.target.resolution_event_id;
    const known = outcomesByEvent.get(eventId);
    if (known !== undefined && known !== forecast.resolution.outcome) {
      throw new Error(`resolution event ${eventId} has conflicting outcomes`);
    }
    outcomesByEvent.set(eventId, forecast.resolution.outcome);
  }
  const rawScores = [];
  const withheldScores = [];
  for (const forecast of resolved) {
    try {
      rawScores.push({
        forecast_id: forecast.id,
        forecast_use: forecast.forecast_use,
        resolution_event_id: forecast.target.resolution_event_id,
        claimed_independence_cluster_id: forecast.target.independence_cluster_id,
        forecast_probability: forecast.probability,
        reference_class_baseline_probability: forecast.baseline.probability,
        reference_class_calculation_checksum: forecast.baseline.calculation.checksum,
        naive_baseline_probability: forecast.naive_baseline.probability,
        naive_calculation_checksum: forecast.naive_baseline.calculation.checksum,
        ...scoreBinaryForecast(forecast),
      });
    } catch (error) {
      if (!(error instanceof ForecastScoringWithheldError)) throw error;
      withheldScores.push({
        forecast_id: forecast.id,
        resolution_event_id: forecast.target.resolution_event_id,
        claimed_independence_cluster_id: forecast.target.independence_cluster_id,
        reason: error.reason,
      });
    }
  }
  const scoredIds = new Set(rawScores.map((score) => score.forecast_id));
  const scoredResolved = resolved.filter((forecast) => scoredIds.has(forecast.id));
  const lifecycleComplete = pending.length === 0 && overdue.length === 0;
  const scoreCoverage = forecasts.length ? rounded(rawScores.length / forecasts.length) : 0;
  const performanceWithheldReason = !lifecycleComplete
    ? "lifecycle_incomplete"
    : postPublicationVoids.length > 0
      ? "post_publication_voids_present"
      : rawScores.length === 0
        ? "no_scored_outcomes"
        : scoreCoverage < plan.void_handling.minimum_score_coverage
          ? "minimum_score_coverage_not_met"
          : null;

  const withholdPerformance = performanceWithheldReason !== null;
  const scores = withholdPerformance ? [] : rawScores.map(serializableLosses);
  const registeredScores = aggregateRegisteredScores(rawScores, resolved.length, withholdPerformance);
  const scoresByUse = Object.fromEntries(
    [...FORECAST_USES].map((use) => {
      const useRawScores = rawScores.filter((score) => score.forecast_use === use);
      const useResolvedCount = resolved.filter((record) => record.forecast_use === use).length;
      return [use, aggregateRegisteredScores(useRawScores, useResolvedCount, withholdPerformance).aggregate];
    }),
  );

  const useCounts = Object.fromEntries(
    [...FORECAST_USES].map((use) => [use, forecasts.filter((record) => record.forecast_use === use).length]),
  );
  const baselineSummary = (baseline) => ({
    family_id: baseline.family_id,
    name: baseline.name,
    mechanical_role: baseline.mechanical_role,
    policy_checksum: baseline.policy_snapshot.checksum,
    algorithm_id: baseline.calculation.algorithm_id,
    algorithm_version: baseline.calculation.version,
    calculation_verification_status: baseline.calculation.verification_status,
  });

  return {
    plan_id: plan.id,
    registered_at: plan.registered_at,
    evaluated_as_of: asOf,
    report_provenance: {
      kind: "derived-forecast-evaluation-report",
      plan_id: plan.id,
      evaluated_as_of: asOf,
      input_provenance_classes: [...new Set(
        forecasts.map((forecast) => forecast.provenance?.class ?? "unclassified"),
      )].sort(),
      source_forecasts: forecasts.map((forecast) => ({
        forecast_id: forecast.id,
        epistemic_class: forecast.epistemic_class,
        forecast_use: forecast.forecast_use,
        provenance: structuredClone(forecast.provenance),
      })),
      source_authenticity_verified: false,
      empirical_truth_established: false,
      action_authorised: false,
    },
    registration: {
      claimed_commit: plan.claimed_registered_commit,
      verification_status: plan.registration_anchor.verification_status,
      registration_anchor_checksum: plan.registration_anchor.checksum,
      cohort_policy_anchor_checksum: plan.cohort_policy.anchor.checksum,
      eligible_registry_manifest_checksum: plan.eligible_registry_manifest.checksum,
    },
    baseline_contract: {
      campaign_id: plan.cohort_policy.campaign_id,
      reference_class: baselineSummary(forecasts[0].baseline),
      naive: baselineSummary(forecasts[0].naive_baseline),
    },
    cohort: {
      registered: forecasts.length,
      resolved: resolved.length,
      scored: rawScores.length,
      withheld_unreconstructed: withheldScores.length,
      pending: pending.length,
      overdue_unresolved: overdue.length,
      void: voided.length,
      post_publication_voids: postPublicationVoids.length,
      score_coverage: scoreCoverage,
      void_rate: forecasts.length ? rounded(voided.length / forecasts.length) : 0,
      minimum_score_coverage: plan.void_handling.minimum_score_coverage,
      by_forecast_use: useCounts,
    },
    overdue_unresolved: overdue.map((forecast) => ({
      forecast_id: forecast.id,
      resolve_by: forecast.resolve_by,
    })),
    voids: voided.map((forecast) => ({
      forecast_id: forecast.id,
      reason_code: forecast.resolution.reason_code,
      reason: forecast.resolution.reason,
      evidence_checksum: forecast.resolution.evidence.checksum,
      evidence: forecast.resolution.evidence,
      adjudication: {
        claimed_adjudicator_id:
          forecast.resolution.adjudication.claimed_adjudicator_id,
        independent_of_forecaster:
          forecast.resolution.adjudication.independent_of_forecaster,
        decision: forecast.resolution.adjudication.decision,
        verification_status:
          forecast.resolution.adjudication.verification_status,
        evidence_checksum: forecast.resolution.adjudication.evidence.checksum,
        evidence: forecast.resolution.adjudication.evidence,
      },
      ...(forecast.resolution.decision_observation
        ? {
            decision_observation: {
              decided_at: forecast.resolution.decision_observation.decided_at,
              action_taken: forecast.resolution.decision_observation.action_taken,
              claimed_authoriser_id:
                forecast.resolution.decision_observation.claimed_authoriser_id,
              authority_verification_status:
                forecast.resolution.decision_observation.authority_verification_status,
              forecast_consulted:
                forecast.resolution.decision_observation.forecast_consulted,
              evidence_checksum:
                forecast.resolution.decision_observation.evidence.checksum,
              evidence: forecast.resolution.decision_observation.evidence,
            },
          }
        : {}),
    })),
    withheld_scores: withheldScores,
    scores: {
      ...registeredScores.aggregate,
      individual: scores,
      events: registeredScores.events.map(serializableLosses),
      clusters: registeredScores.clusters.map(serializableLosses),
      by_forecast_use: scoresByUse,
    },
    reliability: reliabilityBins(eventLevelScores(rawScores), plan, withholdPerformance),
    reliability_by_forecast_use: Object.fromEntries(
      [...FORECAST_USES].map((use) => [
        use,
        reliabilityBins(
          eventLevelScores(rawScores.filter((score) => score.forecast_use === use)),
          plan,
          withholdPerformance,
        ),
      ]),
    ),
    declared_utility_arithmetic: declaredUtilityReport(withholdPerformance ? [] : scoredResolved),
    interpretation: {
      action_authorised: false,
      causal_truth_established: false,
      predictive_skill_established: false,
      lifecycle_complete: lifecycleComplete,
      performance_evaluable: performanceWithheldReason === null,
      performance_withheld_reason: performanceWithheldReason,
      note: "Scores are evidence about registered predictive performance only. Separate authority, causal and action contracts still apply.",
    },
  };
}
