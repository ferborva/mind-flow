import { source, jsonBytes, sha256 } from "./basis.mts";
import { evaluationPlanChecksum, issuedRecordChecksum, assertEvaluationPlanSemantics } from "../../lib/evaluation.mjs";

// Pure local preparation. URI anchors identify retained bytes, not an external
// timestamp, a published file, or an independently verified registration.
export function prepareNeroEvaluationPlan(candidate: any, clocks: { registeredAt: string; sourceCommit: string }) {
  const { forecast, protocol } = candidate;
  const plan: any = structuredClone(source("forecasts/fixtures/evaluation-plan.example.json").document);
  const retained: Record<string, any> = {};
  const anchor = (key: string, document: unknown, at: string) => {
    const bytes = jsonBytes(document);
    const checksum = sha256(bytes);
    retained[key] = { document, bytes, sha256: checksum };
    return { source: `urn:${checksum}`, checksum, retrieved_at: at, vintage: key,
      verification_status: "unverified_external_review_required" };
  };
  plan.id = "forecast-evaluation.nero.5311.101.october-2026.v1";
  plan.registered_at = clocks.registeredAt;
  plan.claimed_registered_commit = clocks.sourceCommit;
  const campaignId = protocol.campaign.campaign_id;
  // The anchor is the manifest already included in the pre-issue protocol,
  // not a newly constructed policy given a retrospective timestamp.
  const policy = protocol.campaign.manifest;
  plan.cohort_policy = { campaign_id: campaignId, registered_at: protocol.registration.registered_at,
    eligibility_rule: { kind: "all_issued_campaign_records", campaign_id: campaignId, exclusions: "none" },
    anchor: anchor("cohort-policy", policy, protocol.registration.registered_at) };
  plan.cohort = [{ forecast_id: forecast.id, issued_record_checksum: issuedRecordChecksum(forecast) }];
  const manifest = { sealed_at: clocks.registeredAt, eligible_forecast_ids: [forecast.id], cohort: plan.cohort };
  plan.eligible_registry_manifest = { sealed_at: clocks.registeredAt, eligible_forecast_ids: [forecast.id],
    ...anchor("eligible-registry-manifest", manifest, clocks.registeredAt) };
  const registration = { registered_at: clocks.registeredAt, plan_id: plan.id, cohort: plan.cohort,
    manifest_checksum: plan.eligible_registry_manifest.checksum, scoring: plan.scoring, reliability: plan.reliability,
    void_handling: plan.void_handling, declared_utility: plan.declared_utility };
  plan.registration_anchor = anchor("evaluation-registration", registration, clocks.registeredAt);
  plan.registered_plan_checksum = evaluationPlanChecksum(plan);
  assertEvaluationPlanSemantics(plan, [forecast]);
  return { plan, retained };
}
