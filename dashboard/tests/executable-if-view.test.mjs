import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { evaluateKernelCondition } from "../../contracts/executable-if/validate.mjs";
import { validateExecutableIfView } from "../tools/validate-executable-if-view.mjs";

const kernelPath = "contracts/executable-if/fixtures/kernel.synthetic.json";
const kernelBytes = readFileSync(new URL("../../contracts/executable-if/fixtures/kernel.synthetic.json", import.meta.url));
const kernel = JSON.parse(kernelBytes.toString("utf8"));
const kernelSha256 = `sha256:${createHash("sha256").update(kernelBytes).digest("hex")}`;
const evaluatedAt = "2026-09-09T00:00:00Z";
const conditionId = "condition.worker-option.nsw";
const states = ["true", "false", "unknown", "stale", "conflicted"];

const legend = [
  {
    state: "true",
    public_label: "Supported by current registered evidence",
    public_meaning: "Every registered predicate is satisfied for this exact scope and period.",
    next_step: "Keep monitoring. Separate authority is still required before action.",
  },
  {
    state: "false",
    public_label: "Not supported by current registered evidence",
    public_meaning: "At least one registered predicate fails for this exact scope and period.",
    next_step: "Repair the failed protection or choose an alternative path.",
  },
  {
    state: "unknown",
    public_label: "Evidence is missing",
    public_meaning: "The registered evidence cannot decide at least one predicate.",
    next_step: "Acquire the named missing evidence before deciding.",
  },
  {
    state: "stale",
    public_label: "Evidence is out of date",
    public_meaning: "The latest registered evidence exceeds its permitted age.",
    next_step: "Refresh the evidence and recompute the condition.",
  },
  {
    state: "conflicted",
    public_label: "Evidence conflicts",
    public_meaning: "Current eligible sources disagree under the registered rule.",
    next_step: "Adjudicate the conflict without selecting the convenient source.",
  },
];

function activeDefinition() {
  const state = kernel.current_state.find((candidate) =>
    candidate.condition_id === conditionId && candidate.lifecycle === "active");
  return kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
    .find(({ definition_hash: hash }) => hash === state.condition_definition_ref.definition_hash);
}

function makeView() {
  const definition = activeDefinition();
  const receipt = evaluateKernelCondition(kernel, conditionId, { evaluatedAt });
  const displayedLegend = legend.find(({ state }) => state === receipt.computed_rule_state.state);
  const sourceBinding = {
    artifact_path: kernelPath,
    artifact_sha256: kernelSha256,
    kernel_id: kernel.kernel_id,
    schema_version: kernel.schema_version,
    manifest_hash: kernel.manifest_hash,
  };
  const claimScope = {
    claim: structuredClone(definition.claim),
    scope: structuredClone(definition.scope),
  };
  const clock = {
    evaluated_at: receipt.evaluated_at,
    source: receipt.clock.source,
    trusted: receipt.clock.trusted,
  };

  return {
    schema_version: "1.0.0",
    view_id: "dashboard-view.worker-option.synthetic",
    generated_at: evaluatedAt,
    classification: "synthetic-research-fixture",
    public_boundary: "A computed IF state is not empirical truth, a forecast probability, or authority to act.",
    state_legend: structuredClone(legend),
    condition_views: [{
      condition_id: conditionId,
      source_binding: sourceBinding,
      condition_definition_ref: structuredClone(receipt.condition_definition_ref),
      claim_scope: claimScope,
      evaluation_receipt: structuredClone(receipt),
      display: {
        state: receipt.computed_rule_state.state,
        public_label: displayedLegend.public_label,
        public_meaning: displayedLegend.public_meaning,
        next_step: displayedLegend.next_step,
      },
      provenance_panel: {
        visibility: "always-visible",
        source_binding: structuredClone(sourceBinding),
        condition_definition_ref: structuredClone(receipt.condition_definition_ref),
        claim_scope: structuredClone(claimScope),
        clock,
        evidence_state_hash: receipt.evidence_state_hash,
        observation_hashes: structuredClone(receipt.observation_hashes),
        evaluation_hash: receipt.evaluation_hash,
      },
      context_series: [{
        series_id: "context.synthetic.productivity",
        public_label: "Synthetic productivity context",
        evidence_role: "macro-context-only",
        condition_truth_effect: "none",
        may_satisfy_predicate: false,
        source_provenance: {
          source_name: "Synthetic context fixture",
          source_artifact_ref: "fixture.synthetic.productivity",
          reference_period: "2026 Q2",
          publisher_vintage: "synthetic-v1",
          retrieved_at: "2026-09-08T00:00:00Z",
        },
        scope: {
          jurisdictions: ["Australia"],
          geographies: ["New South Wales"],
          cohorts: ["Economy-wide aggregate, not the registered worker cohort"],
          services: ["Macroeconomic context"],
        },
      }],
      forecast_context: [{
        forecast_id: "forecast.synthetic.worker-option",
        public_label: "Synthetic probability of a future threshold event",
        probability: 0.62,
        semantic_role: "forecast-probability-not-condition-truth",
        condition_truth_effect: "none",
        may_set_if_state: false,
        issued_at: "2026-09-08T00:00:00Z",
        target_period: {
          starts_at: "2027-01-01T00:00:00Z",
          ends_at: "2027-12-31T23:59:59Z",
        },
      }],
    }],
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
  };
}

function assess(view, sourceOverrides = {}) {
  return validateExecutableIfView(view, {
    sourceKernel: {
      bytes: kernelBytes,
      document: kernel,
      path: kernelPath,
      sha256: kernelSha256,
      ...sourceOverrides,
    },
  });
}

function codes(result) {
  return new Set(result.errors.map(({ code }) => code));
}

test("a pure dashboard projection is recomputed from its exact kernel receipt", () => {
  const result = assess(makeView());
  assert.equal(result.schema_conformant, true, JSON.stringify(result.errors));
  assert.equal(result.source_verified, true, JSON.stringify(result.errors));
  assert.equal(result.semantic_valid, true, JSON.stringify(result.errors));
  assert.equal(result.displayed_if_states[conditionId], "true");
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.action_authorised, false);
});

test("none of the five displayed states can substitute for the recomputed receipt state", () => {
  for (const state of states.filter((candidate) => candidate !== "true")) {
    const view = makeView();
    view.condition_views[0].display.state = state;
    const result = assess(view);
    assert.equal(result.semantic_valid, false, `${state} must not replace true`);
    assert.equal(codes(result).has("DISPLAYED_STATE_MISMATCH"), true);
  }
});

test("the five-state public legend is a complete and semantically distinct partition", () => {
  const missing = makeView();
  missing.state_legend.pop();
  assert.equal(codes(assess(missing)).has("STATE_LEGEND_PARTITION_INVALID"), true);

  const collapsed = makeView();
  collapsed.state_legend[1].public_label = collapsed.state_legend[0].public_label;
  assert.equal(codes(assess(collapsed)).has("STATE_LEGEND_SEMANTICS_COLLAPSED"), true);

  const valid = assess(makeView());
  assert.deepEqual(Object.keys(valid.state_legend).sort(), [...states].sort());
  assert.equal(new Set(Object.values(valid.state_legend).map(({ public_label: label }) => label)).size, 5);
});

test("macro context cannot masquerade as executable IF evidence", () => {
  const truthEffect = makeView();
  truthEffect.condition_views[0].context_series[0].condition_truth_effect = "predicate-input";
  assert.equal(codes(assess(truthEffect)).has("CONTEXT_TRUTH_EFFECT_FORBIDDEN"), true);

  const predicate = makeView();
  predicate.condition_views[0].context_series[0].may_satisfy_predicate = true;
  assert.equal(codes(assess(predicate)).has("CONTEXT_PREDICATE_BINDING_FORBIDDEN"), true);
});

test("source, exact scope and evaluation clock remain visible and receipt-bound", () => {
  const hidden = makeView();
  hidden.condition_views[0].provenance_panel.visibility = "on-request";
  assert.equal(codes(assess(hidden)).has("PROVENANCE_NOT_VISIBLE"), true);

  const scopeDrift = makeView();
  scopeDrift.condition_views[0].provenance_panel.claim_scope.scope.geographies = ["Victoria"];
  assert.equal(codes(assess(scopeDrift)).has("PROVENANCE_SCOPE_MISMATCH"), true);

  const trustedClock = makeView();
  trustedClock.condition_views[0].provenance_panel.clock.trusted = true;
  assert.equal(codes(assess(trustedClock)).has("PROVENANCE_CLOCK_MISMATCH"), true);
});

test("forecast probability stays orthogonal to IF truth, including at the extremes", () => {
  for (const probability of [0, 1]) {
    const view = makeView();
    view.condition_views[0].forecast_context[0].probability = probability;
    const result = assess(view);
    assert.equal(result.semantic_valid, true, JSON.stringify(result.errors));
    assert.equal(result.displayed_if_states[conditionId], "true");
  }

  const laundering = makeView();
  laundering.condition_views[0].forecast_context[0].may_set_if_state = true;
  assert.equal(codes(assess(laundering)).has("FORECAST_TRUTH_EFFECT_FORBIDDEN"), true);
});

test("caller-side source identity, bytes and receipt fields cannot be resealed independently", () => {
  const sourceDrift = makeView();
  sourceDrift.condition_views[0].source_binding.manifest_hash = `sha256:${"0".repeat(64)}`;
  assert.equal(codes(assess(sourceDrift)).has("SOURCE_BINDING_MISMATCH"), true);

  const receiptDrift = makeView();
  receiptDrift.condition_views[0].evaluation_receipt.evidence_state_hash = `sha256:${"0".repeat(64)}`;
  assert.equal(codes(assess(receiptDrift)).has("EVALUATION_RECEIPT_MISMATCH"), true);

  const digestDrift = makeView();
  const falseDigest = `sha256:${"1".repeat(64)}`;
  digestDrift.condition_views[0].source_binding.artifact_sha256 = falseDigest;
  digestDrift.condition_views[0].provenance_panel.source_binding.artifact_sha256 = falseDigest;
  assert.equal(codes(assess(digestDrift, { sha256: falseDigest })).has("SOURCE_BYTES_HASH_MISMATCH"), true);
});
