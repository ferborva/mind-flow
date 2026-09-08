#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKernelCondition } from "../../contracts/executable-if/validate.mjs";
import { validateExecutableIfView } from "./validate-executable-if-view.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const outputPath = resolve(
  root,
  "dashboard/fixtures/round-04.worker-option.executable-if-view.synthetic.json",
);
const conditionId = "condition.worker-option.nsw";

function source(path) {
  const bytes = readFileSync(resolve(root, path));
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

const sourceKernel = source("contracts/executable-if/fixtures/kernel.synthetic.json");
const projectionSources = {
  "transition-bundle": source(
    "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json",
  ),
  "possible-path": source("paths/fixtures/round-04.worker-option.synthetic.json"),
  "preparation-register": source(
    "preparation/fixtures/valid/round-04.worker-option.synthetic.json",
  ),
  forecast: source("forecasts/fixtures/round-04.worker-option.synthetic.json"),
};
const bundle = projectionSources["transition-bundle"].document;
const kernel = sourceKernel.document;
const forecast = projectionSources.forecast.document;
const evaluatedAt = bundle.evaluation_clock.evaluated_at;
const receipt = evaluateKernelCondition(kernel, conditionId, { evaluatedAt });
const definition = kernel.events
  .flatMap(({ introduced_definitions: values }) => values)
  .find(({ definition_hash: hash }) => hash === receipt.condition_definition_ref.definition_hash);

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
const display = legend.find(({ state }) => state === receipt.computed_rule_state.state);
const sourceBinding = {
  artifact_path: sourceKernel.path,
  artifact_sha256: sourceKernel.sha256,
  kernel_id: kernel.kernel_id,
  schema_version: kernel.schema_version,
  manifest_hash: kernel.manifest_hash,
};
const claimScope = {
  claim: structuredClone(definition.claim),
  scope: structuredClone(definition.scope),
};
const view = {
  schema_version: "1.1.0",
  view_id: "dashboard-view.round-04.worker-option.synthetic",
  generated_at: evaluatedAt,
  classification: "synthetic-research-fixture",
  public_boundary: "A computed IF state is not empirical truth, a forecast probability, or authority to act.",
  state_legend: legend,
  condition_views: [{
    condition_id: conditionId,
    source_binding: sourceBinding,
    condition_definition_ref: structuredClone(receipt.condition_definition_ref),
    claim_scope: claimScope,
    evaluation_receipt: structuredClone(receipt),
    display: {
      state: receipt.computed_rule_state.state,
      public_label: display.public_label,
      public_meaning: display.public_meaning,
      next_step: display.next_step,
    },
    provenance_panel: {
      visibility: "always-visible",
      source_binding: structuredClone(sourceBinding),
      condition_definition_ref: structuredClone(receipt.condition_definition_ref),
      claim_scope: structuredClone(claimScope),
      clock: {
        evaluated_at: receipt.evaluated_at,
        source: receipt.clock.source,
        trusted: receipt.clock.trusted,
      },
      evidence_state_hash: receipt.evidence_state_hash,
      observation_hashes: structuredClone(receipt.observation_hashes),
      evaluation_hash: receipt.evaluation_hash,
    },
    context_series: [],
    forecast_context: [{
      forecast_id: forecast.id,
      public_label: forecast.question,
      probability: forecast.probability,
      semantic_role: "forecast-probability-not-condition-truth",
      condition_truth_effect: "none",
      may_set_if_state: false,
      issued_at: forecast.issued_at,
      target_period: {
        starts_at: forecast.target.observation_window_start,
        ends_at: forecast.target.observation_window_end,
      },
    }],
  }],
  projection_sources: Object.fromEntries(Object.entries(projectionSources).map(([role, item]) => [
    role,
    {
      role,
      id: role === "transition-bundle"
        ? item.document.bundle_id
        : role === "possible-path"
          ? item.document.path_id
          : role === "preparation-register"
            ? item.document.register_id
            : item.document.id,
      path: item.path,
      sha256: item.sha256,
    },
  ])),
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
  publication_approved: false,
};
const bytes = Buffer.from(`${JSON.stringify(view, null, 2)}\n`);

const assessment = validateExecutableIfView(view, { sourceKernel, projectionSources });
if (!assessment.semantic_valid) {
  throw new TypeError(JSON.stringify(assessment.errors, null, 2));
}

if (process.argv.includes("--check")) {
  if (readFileSync(outputPath).compare(bytes) !== 0) {
    throw new TypeError("Round 4 executable IF dashboard projection is stale; run its builder");
  }
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes);
}
