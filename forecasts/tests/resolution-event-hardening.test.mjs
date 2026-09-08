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
  evaluateForecastCohort,
  evaluationPlanChecksum,
  issuedRecordChecksum,
} from "../lib/evaluation.mjs";
import { assertForecastSemantics } from "../lib/registry.mjs";
import { scoreBinaryForecast } from "../lib/scoring.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const readJson = (name) => JSON.parse(readFileSync(join(root, "fixtures", name), "utf8"));
const resolved = readJson("binary.resolved.json");
const schema = readJson("../schema/binary-forecast.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateForecast = ajv.compile(schema);

function retainResolution(record, { value = 20 } = {}) {
  const result = structuredClone(record);
  result.target.resolver = {
    resolver_id: "mind-flow.binary-threshold-json",
    resolver_version: "1.0.0",
    measure: "fictional-pilot-adoption",
    observation_unit: "percent",
    operator: "gte",
    threshold: 20,
  };
  const payload = {
    schema_version: "1.0.0",
    resolution_event_id: result.target.resolution_event_id,
    measure: result.target.resolver.measure,
    unit: result.target.resolver.observation_unit,
    scope: result.target.scope,
    observation_window_start: result.target.observation_window_start,
    observation_window_end: result.target.observation_window_end,
    value,
  };
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  result.resolution.evidence.retained_media_type = "application/json";
  result.resolution.evidence.retained_bytes_base64 = bytes.toString("base64");
  result.resolution.evidence.publisher_identity_verification_status =
    "unverified_external_review_required";
  result.resolution.evidence.checksum =
    `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  return result;
}

function planFor(records) {
  const ids = records.map(({ id }) => id);
  const plan = {
    schema_version: "1.1.0",
    id: "forecast-evaluation.resolution-event-hardening.v1",
    registered_at: "2026-09-09T00:00:00Z",
    claimed_registered_commit: "0000000",
    registration_anchor: {
      source: "https://example.org/hardening/registration",
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
        source: "https://example.org/hardening/cohort-policy",
        retrieved_at: "2026-09-07T00:00:00Z",
        vintage: "cohort-policy-v1",
        checksum: `sha256:${"b".repeat(64)}`,
        verification_status: "unverified_external_review_required",
      },
    },
    eligible_registry_manifest: {
      sealed_at: "2026-09-09T00:00:00Z",
      eligible_forecast_ids: ids,
      source: "https://example.org/hardening/manifest",
      retrieved_at: "2026-09-09T00:00:00Z",
      vintage: "manifest-v1",
      checksum: `sha256:${"c".repeat(64)}`,
      verification_status: "unverified_external_review_required",
    },
    forecast_use_scope: ["research_only"],
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

test("resolution outcome is reconstructed from retained bytes by the frozen resolver", () => {
  const reconstructed = retainResolution(resolved);
  assert.equal(validateForecast(reconstructed), true, ajv.errorsText(validateForecast.errors));
  assert.doesNotThrow(() => assertForecastSemantics(reconstructed));
  assert.equal(scoreBinaryForecast(reconstructed).resolution_reconstruction.status, "reconstructed");

  const flipped = structuredClone(reconstructed);
  flipped.resolution.outcome = 0;
  assert.throws(
    () => assertForecastSemantics(flipped),
    /derived outcome.*declared outcome/i,
  );

  const tampered = structuredClone(reconstructed);
  tampered.resolution.evidence.retained_bytes_base64 = Buffer.from("{}", "utf8").toString("base64");
  assert.throws(() => assertForecastSemantics(tampered), /retained bytes.*checksum/i);
});

test("scoring is withheld when exact resolution bytes were not retained", () => {
  const unretained = retainResolution(resolved);
  delete unretained.resolution.evidence.retained_media_type;
  delete unretained.resolution.evidence.retained_bytes_base64;
  delete unretained.resolution.evidence.publisher_identity_verification_status;

  assert.doesNotThrow(() => assertForecastSemantics(unretained));
  assert.throws(() => scoreBinaryForecast(unretained), /scoring withheld.*retained/i);

  const report = evaluateForecastCohort(planFor([unretained]), [unretained], {
    asOf: "2027-08-15T00:00:00Z",
  });
  assert.equal(report.cohort.resolved, 1);
  assert.equal(report.cohort.scored, 0);
  assert.equal(report.cohort.withheld_unreconstructed, 1);
  assert.equal(report.cohort.score_coverage, 0);
  assert.equal(report.scores.mean_brier, null);
  assert.equal(report.withheld_scores[0].reason, "resolution_bytes_not_retained");
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(report.interpretation.causal_truth_established, false);
  assert.equal(report.interpretation.action_authorised, false);
});

test("one resolution event cannot claim multiple independent clusters", () => {
  const first = retainResolution(resolved);
  const second = structuredClone(first);
  second.id = "forecast.hostile-same-event-different-cluster.v1";
  second.target.independence_cluster_id = "cluster.forged-independent";

  assert.throws(
    () => assertEvaluationPlanSemantics(planFor([first, second]), [first, second]),
    /resolution event.*one independence cluster/i,
  );
});

test("score and reliability denominators aggregate by event and cluster", () => {
  const eventA = retainResolution(resolved);
  const eventBSeed = structuredClone(resolved);
  eventBSeed.id = "forecast.synthetic-second-event.v1";
  eventBSeed.target.resolution_event_id = "event.synthetic-adoption.second.2027-q2";
  eventBSeed.probability = 0.9;
  const eventB = retainResolution(eventBSeed);
  const duplicateB = structuredClone(eventB);
  duplicateB.id = "forecast.synthetic-second-event-duplicate.v1";

  const report = evaluateForecastCohort(
    planFor([eventA, eventB, duplicateB]),
    [eventA, eventB, duplicateB],
    { asOf: "2027-08-15T00:00:00Z" },
  );

  assert.equal(report.scores.resolved_forecasts, 3);
  assert.equal(report.scores.scored_events, 2);
  assert.equal(report.scores.scored_clusters, 1);
  assert.equal(report.scores.aggregation_unit, "equal-weighted-event-within-cluster");
  assert.equal(report.scores.mean_brier, 0.05);
  assert.equal(report.reliability.resolved_events, 2);
  assert.equal(report.reliability.claimed_independent_clusters, 1);
  assert.ok(report.reliability.bins.every((bin) => bin.observed_frequency === null));
});
