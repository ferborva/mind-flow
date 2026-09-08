#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeEvidenceStateHash,
  evaluateKernelCondition,
} from "../../contracts/executable-if/validate.mjs";
import {
  assertForecastSemantics,
  forecastIssueBasisHash,
  forecastScopeHash,
  renderForecastClaimCeiling,
} from "../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");
const outputPath = resolve(
  repositoryRoot,
  "forecasts/fixtures/round-04.worker-option.synthetic.json",
);

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

const sources = {
  sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
  sourceSignalRegistry: fileSource("signals/fixtures/round-04.worker-option.synthetic.json"),
};
const kernel = sources.sourceKernel.document;
const registry = sources.sourceSignalRegistry.document;
const conditionId = "condition.worker-option.nsw";
const predicateId = "option-coverage";
const issuedAt = "2026-09-09T00:00:00Z";
const activeState = kernel.current_state.find(({ lifecycle, condition_definition_ref: reference }) =>
  lifecycle === "active" && reference.condition_id === conditionId);
const activeDefinition = kernel.events.flatMap(({ introduced_definitions: values }) => values)
  .find(({ definition_hash: hash }) =>
    hash === activeState.condition_definition_ref.definition_hash);
const predicate = activeDefinition.predicates[predicateId];
const registeredSignal = registry.signals.find(({ signal_id: signalId }) =>
  signalId === predicate.signal_ref.signal_id);
const metric = registeredSignal.metric_contract;
const registrySource = registry.sources.find(({ source_id: sourceId }) =>
  registeredSignal.source_refs.includes(sourceId));
const evidenceTip = kernel.evidence_events.at(-1);
const evaluation = evaluateKernelCondition(kernel, conditionId, { evaluatedAt: issuedAt });
const conditionScope = {
  jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
  geographies: structuredClone(activeDefinition.scope.geographies),
  cohorts: structuredClone(activeDefinition.scope.cohorts),
  services: structuredClone(activeDefinition.scope.services),
  period: structuredClone(activeDefinition.claim.period),
};
const targetScope = {
  geographies: structuredClone(conditionScope.geographies),
  cohorts: structuredClone(conditionScope.cohorts),
  services: structuredClone(conditionScope.services),
};

const document = {
  schema_version: "1.4.0",
  id: "forecast.worker-option.nsw.synthetic.2026.v1",
  epistemic_class: "forecast",
  forecast_use: "research_only",
  status: "issued",
  title: "Synthetic forecast of future credible-option coverage",
  question: "Will the registered credible-option coverage measure meet or exceed 0.90 during the exact future observation window for the bound worker scope?",
  issued_at: issuedAt,
  resolve_after: "2027-01-08T00:00:00Z",
  resolve_by: "2027-01-31T00:00:00Z",
  probability: 0.62,
  target: {
    event: "The registered credible-option coverage measure is at or above 0.90 for the exact scope and future observation window.",
    unit: "binary threshold event",
    scope: targetScope,
    signal_id: registeredSignal.signal_id,
    metric_id: metric.metric_id,
    metric_checksum: metric.metric_checksum,
    condition_id: conditionId,
    scope_hash: forecastScopeHash(targetScope),
    resolution_rule: "Resolve 1 only if retained resolution bytes report the registered metric at or above 0.90 for the exact signal, metric checksum, condition, scope and window. Resolve 0 if they report below 0.90. Void only under the predeclared evidence-backed policy.",
    resolution_source: registrySource.evidence_ref,
    resolution_event_id: "event.worker-option.option-coverage.2026-future-window",
    independence_cluster_id: "cluster.worker-option.option-coverage.2026",
    resolver: {
      resolver_id: "mind-flow.binary-threshold-json",
      resolver_version: "1.1.0",
      measure: metric.measure,
      observation_unit: predicate.threshold.unit,
      operator: predicate.operator,
      threshold: predicate.threshold.value,
    },
    observation_window_start: "2026-09-10T00:00:00Z",
    observation_window_end: "2026-12-31T23:59:59Z",
    outcome_publication_not_before: "2027-01-08T00:00:00Z",
  },
  baseline: {
    campaign_id: "campaign.worker-option.synthetic-2026",
    family_id: "family.worker-option.synthetic-reference.v1",
    name: "Synthetic predeclared reference-class baseline",
    kind: "mechanical",
    mechanical_role: "reference_class",
    probability: 0.55,
    method: "Frozen synthetic historical-frequency rule. No empirical reference class is claimed.",
    declared_at: "2026-09-07T00:00:00Z",
    policy_snapshot: {
      source: "https://example.invalid/mind-flow/forecast-baselines/worker-option-reference-v1",
      retrieved_at: "2026-09-07T00:00:00Z",
      vintage: "worker-option-reference-policy-v1",
      checksum: sources.sourceSignalRegistry.sha256,
    },
    calculation: {
      algorithm_id: "synthetic-historical-frequency",
      version: "1.0.0",
      input_checksums: [sources.sourceSignalRegistry.sha256],
      checksum: `sha256:${"5".repeat(64)}`,
      verification_status: "unverified_external_review_required",
    },
  },
  naive_baseline: {
    campaign_id: "campaign.worker-option.synthetic-2026",
    family_id: "family.worker-option.synthetic-constant.v1",
    name: "Synthetic constant-probability baseline",
    kind: "mechanical",
    mechanical_role: "naive",
    probability: 0.5,
    method: "Frozen constant-probability rule used only to test the forecast contract.",
    declared_at: "2026-09-07T00:00:00Z",
    policy_snapshot: {
      source: "https://example.invalid/mind-flow/forecast-baselines/worker-option-naive-v1",
      retrieved_at: "2026-09-07T00:00:00Z",
      vintage: "worker-option-naive-policy-v1",
      checksum: sources.sourceSignalRegistry.sha256,
    },
    calculation: {
      algorithm_id: "constant-probability",
      version: "1.0.0",
      input_checksums: [sources.sourceSignalRegistry.sha256],
      checksum: `sha256:${"6".repeat(64)}`,
      verification_status: "unverified_external_review_required",
    },
  },
  method: {
    kind: "human",
    description: "Synthetic judgement for contract testing. It is not derived from the current IF state and is not an empirical estimate.",
    version: "fixture-1",
  },
  data_vintages: [{
    source: "https://example.invalid/mind-flow/signals/round-04-worker-option",
    retrieved_at: issuedAt,
    vintage: registry.registry_id,
    checksum: sources.sourceSignalRegistry.sha256,
  }],
  provenance: {
    author: "Ren",
    class: "agent-proposal",
    issued_commit: "0000000",
    disclaimer: "Synthetic unverified fixture for contract testing. It is not a public forecast, empirical finding, decision or Fernando's view.",
  },
  assumptions: [
    "The probability is a synthetic judgement chosen to test the contract, not an estimate derived from validated data.",
    "The future resolution source and observation are fictional and have not been acquired.",
    "The issue-time IF receipt and forecast probability answer different questions.",
  ],
  counter_hypotheses: [
    "Future credible-option coverage falls below the registered threshold.",
    "The metric or source changes materially and the forecast is voided rather than reinterpreted.",
    "The current favourable IF state fails to persist through the future observation window.",
  ],
  void_policy: {
    allowed_reason_codes: ["source_retired", "measure_materially_changed"],
    evidence_required: true,
  },
  issue_basis: {
    basis_version: "1.0.0",
    issued_at: issuedAt,
    kernel_ref: {
      artifact_path: sources.sourceKernel.path,
      artifact_sha256: sources.sourceKernel.sha256,
      kernel_id: kernel.kernel_id,
      manifest_hash: kernel.manifest_hash,
    },
    signal_registry_ref: {
      artifact_path: sources.sourceSignalRegistry.path,
      artifact_sha256: sources.sourceSignalRegistry.sha256,
      registry_id: registry.registry_id,
      schema_version: registry.schema_version,
    },
    condition_definition_ref: structuredClone(activeState.condition_definition_ref),
    predicate_id: predicateId,
    signal_definition_ref: structuredClone(predicate.signal_ref),
    metric_contract: structuredClone(metric),
    condition_scope: conditionScope,
    target_scope_hash: forecastScopeHash(targetScope),
    evidence_state_ref: {
      kernel_id: kernel.kernel_id,
      kernel_manifest_hash: kernel.manifest_hash,
      event_count: kernel.evidence_events.length,
      tip_event_id: evidenceTip.evidence_event_id,
      tip_event_hash: evidenceTip.evidence_event_hash,
      state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
    },
    issue_evaluation_receipt: {
      evaluated_at: evaluation.evaluated_at,
      clock: structuredClone(evaluation.clock),
      evaluator_ref: structuredClone(evaluation.evaluator_ref),
      condition_definition_ref: structuredClone(evaluation.condition_definition_ref),
      observation_hashes: structuredClone(evaluation.observation_hashes),
      mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
      computed_rule_state: structuredClone(evaluation.computed_rule_state),
      empirical_truth_established: false,
      authority_effect: "none",
      action_authorised: false,
      publication_approved: false,
      kernel_manifest_hash: evaluation.kernel_manifest_hash,
      evidence_state_hash: evaluation.evidence_state_hash,
      evaluation_hash: evaluation.evaluation_hash,
    },
    interpretation_boundaries: {
      probability_relation: "orthogonal-to-current-computed-if-state",
      current_if_state_is_forecast_probability: false,
      probability_establishes_empirical_truth: false,
      probability_establishes_causality: false,
      probability_establishes_authority: false,
      empirical_truth_established: false,
      causality_established: false,
      authority_effect: "none",
      action_authorised: false,
      public_claim_ceiling: "",
    },
    issue_basis_hash: "",
  },
  resolution: { status: "pending" },
  history: [{
    at: issuedAt,
    event: "issued",
    actor: "forecast test fixture",
    note: "Synthetic record created to test exact issue-basis joins and probability boundaries.",
  }],
};

document.issue_basis.interpretation_boundaries.public_claim_ceiling =
  renderForecastClaimCeiling(document);
document.issue_basis.issue_basis_hash = forecastIssueBasisHash(document.issue_basis);
assertForecastSemantics(document, sources);

const rendered = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== rendered) {
    throw new Error("Round 4 forecast fixture is stale; run the builder");
  }
  console.log("Round 4 forecast fixture is reproducible");
} else {
  writeFileSync(outputPath, rendered);
  console.log(`Built ${outputPath}`);
}
