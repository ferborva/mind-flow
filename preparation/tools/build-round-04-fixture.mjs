#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKernelCondition } from "../../contracts/executable-if/validate.mjs";
import { checksumJson, assessPreparationRegister } from "../lib/validate.mjs";
import { renderActionSentenceV12 } from "../lib/validate-v12.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");
const outputPath = resolve(repositoryRoot, "preparation/fixtures/valid/round-04.worker-option.synthetic.json");
const asOf = "2026-09-09T00:00:00Z";

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function seal(id, content) {
  return { id, version: "1.0.0", checksum: checksumJson(content), content };
}

function pinnedRef(envelope) {
  return { id: envelope.id, version: envelope.version, checksum: envelope.checksum };
}

const sources = {
  sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
  sourceEvolution: fileSource("contracts/evolution/fixtures/round-04.worker-option.synthetic.json"),
};
const kernel = sources.sourceKernel.document;
const evolution = sources.sourceEvolution.document;
const conditionId = "condition.worker-option.nsw";
const activeState = kernel.current_state.find(({ lifecycle, condition_definition_ref: reference }) =>
  lifecycle === "active" && reference.condition_id === conditionId);
const definition = kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
  .find((candidate) => candidate.definition_hash === activeState.condition_definition_ref.definition_hash);
const projected = evolution.current_state.conditions.find(({ condition_definition_ref: reference }) =>
  reference.condition_id === conditionId);
const { who, verb, object, standard, period } = definition.claim;
const publicCondition = `${who} ${verb} ${object}, at the standard that ${standard}, from ${period.starts_at} through ${period.ends_at}`;

const conditionBinding = seal("binding.condition.worker-option.nsw", {
  condition_id: conditionId,
  public_condition: publicCondition,
  kernel: {
    artifact_ref: {
      artifact_path: sources.sourceKernel.path,
      artifact_sha256: sources.sourceKernel.sha256,
    },
    kernel_id: kernel.kernel_id,
    manifest_hash: kernel.manifest_hash,
    condition_definition_ref: structuredClone(activeState.condition_definition_ref),
  },
  evolution: {
    artifact_ref: {
      artifact_path: sources.sourceEvolution.path,
      artifact_sha256: sources.sourceEvolution.sha256,
    },
    ledger_id: evolution.ledger_id,
    manifest_hash: evolution.manifest_hash,
    source_state_version: projected.source_state_version,
    history_tip_ref: {
      sequence: evolution.source_history_ref.tip_sequence,
      event_id: evolution.source_history_ref.tip_event_id,
      event_hash: evolution.source_history_ref.tip_event_hash,
    },
    condition_source_event_ref: structuredClone(projected.source_event_ref),
  },
  condition_scope: {
    ...structuredClone(definition.scope),
    period: structuredClone(definition.claim.period),
  },
  scope_relationship: "exact",
  verification_state: "bundle-verification-required",
  authority_effect: "none",
  action_authorised: false,
});

const evaluated = evaluateKernelCondition(kernel, conditionId, { evaluatedAt: asOf });
const evaluationReceipt = seal("receipt.condition.worker-option.nsw.20260909", {
  condition_binding_ref: pinnedRef(conditionBinding),
  evaluated_at: evaluated.evaluated_at,
  clock: evaluated.clock,
  evaluator_ref: evaluated.evaluator_ref,
  condition_definition_ref: evaluated.condition_definition_ref,
  kernel_manifest_hash: evaluated.kernel_manifest_hash,
  evaluation_hash: evaluated.evaluation_hash,
  evidence_state_hash: evaluated.evidence_state_hash,
  observation_hashes: evaluated.observation_hashes,
  mechanically_valid_for_evaluation: evaluated.mechanically_valid_for_evaluation,
  computed_rule_state: evaluated.computed_rule_state,
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
  publication_approved: false,
});

const evidenceBundle = seal("evidence.preparation.worker-option.nsw", {
  purpose: "preparation-only",
  truth_effect: "none",
  as_of: asOf,
  sources: [
    "Synthetic rehearsal assumptions supplied by the fixture author, not observed implementation evidence.",
  ],
  limitations: [
    "No provider, verifier, funding, capacity, consent, empirical benefit or authority has been authenticated.",
  ],
  external_verification: "not-performed",
});

const action = {
  schema_version: "1.2.0",
  action_id: "action.prepare-worker-option-support",
  version: "1.0.0",
  record_kind: "proposal",
  authorisation_effect: "none",
  public_sentence: "",
  decision_use: "research-only",
  scale: "individual",
  actor: {
    actor_id: "actor.affected-worker.candidate",
    name: "A candidate affected worker",
    identity_state: "candidate-unverified",
    authority_boundary: "May prepare their own private support file; may not represent peers, command providers or commit public resources.",
  },
  verb: "prepare",
  object: {
    object_id: "object.worker-option-support-file",
    class: "capability",
    description: "a private worker-controlled option and human-review support file",
  },
  scope: structuredClone(definition.scope),
  if_binding: {
    condition_binding_ref: pinnedRef(conditionBinding),
    evaluation_receipt_ref: pinnedRef(evaluationReceipt),
    state_trigger: {
      axis: "computed_rule_state",
      eligible_states: ["false", "unknown", "stale", "conflicted"],
      blocked_states: ["true"],
      re_evaluate_before_start: true,
    },
    effect: "eligibility-only-not-authority",
  },
  evidence_bundle_ref: pinnedRef(evidenceBundle),
  affected_party_governance: {
    coverage_state: "provisional-publicly-challengeable",
    known_omissions: ["Workers outside the registered occupations and geography are not represented."],
    challenge_route: "https://mind-flow.org/challenges/unpublished/worker-option-support",
    consent_state: "not-established",
  },
  resources: {
    reporting_basis: "caller-asserted-not-authenticated",
    funding_status: "unfunded",
    capacity_status: "unavailable",
  },
  controls: {
    start_conditions: [
      { gate: "if-state-eligible", test: "A newly computed receipt is in an eligible state.", failure_effect: "Do not start." },
      { gate: "receipt-current", test: "The receipt uses the current definition and evidence tips.", failure_effect: "Recompute before considering the proposal." },
      { gate: "resources-ready", test: "The worker confirms private time and support capacity are available.", failure_effect: "Do not start." },
      { gate: "human-approval", test: "The affected worker freely chooses to proceed.", failure_effect: "Do not start." }
    ],
    stop_conditions: [
      { gate: "condition-state-changed", test: "The computed IF state changes.", failure_effect: "Stop and reassess the trigger." },
      { gate: "receipt-invalidated", test: "Any receipt binding or source is invalidated.", failure_effect: "Stop and recompute." },
      { gate: "safeguard-failed", test: "Privacy, voluntariness or review safeguards fail.", failure_effect: "Stop and protect the worker." }
    ],
    review_conditions: [
      { gate: "weekly-worker-review", test: "The worker reviews usefulness and any information harm.", failure_effect: "Revise or abandon the rehearsal." }
    ],
  },
  reversibility: {
    class: "reversible",
    rationale: "The private draft can be paused or deleted without changing employment, services or public entitlements.",
    residual_harm: "The rehearsal could still create anxiety, false confidence or privacy risk.",
    default_rule: "reversible-unless-higher-gate-passed",
  },
  inaction_comparator: {
    baseline: "Do not create the rehearsal file and retain the current support arrangements.",
    comparison: "uncertain",
    confidence: "low",
    limitations: ["No observed causal evidence compares this preparation with inaction."],
    authorisation_effect: "none",
  },
  generated_at: asOf,
  review_by: "2026-09-16T00:00:00Z",
};
action.public_sentence = renderActionSentenceV12(action);

const document = {
  schema_version: "1.2.0",
  register_id: "register.round-04.worker-option.synthetic",
  as_of: asOf,
  authorisation_effect: "none",
  evidence_truth_assessed: false,
  condition_bindings: [conditionBinding],
  evaluation_receipts: [evaluationReceipt],
  evidence_bundles: [evidenceBundle],
  actions: [action],
};

const result = assessPreparationRegister(document, sources);
if (!result.register_consistent || !result.external_bindings_verified) {
  throw new TypeError(JSON.stringify(result.problems, null, 2));
}

const rendered = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== rendered) {
    throw new TypeError("Round 4 preparation fixture is not reproducible");
  }
} else {
  writeFileSync(outputPath, rendered);
}
