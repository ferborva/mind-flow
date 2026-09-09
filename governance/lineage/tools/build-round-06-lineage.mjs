#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assessTransitionBundle } from "../../../integration/transition-bundle/assess.mjs";
import {
  FIXED_SOURCE_REFS,
  computeExternalGovernanceContextHash,
  computeGovernanceLineageHash,
  validateGovernanceLineage,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const contextPath = FIXED_SOURCE_REFS.governance_context.path;
const lineagePath = "governance/lineage/fixtures/round-06.worker-transition.lineage.synthetic.json";
const check = process.argv.includes("--check");

function load(path) {
  const bytes = readFileSync(resolve(root, path));
  return {
    bytes,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    document: JSON.parse(bytes.toString("utf8")),
  };
}

function serialize(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function deriveBundleIf(bundle, assessment) {
  if (!assessment.machine_valid || !assessment.components_valid || !assessment.bundle_coherent) {
    throw new TypeError(`Round 04 source bundle is invalid: ${JSON.stringify(assessment.issues)}`);
  }
  const definition = bundle.canonical.executable_if_ref.active_condition_definition_refs[0];
  const evaluations = assessment.executable_if.governed_evaluations.filter((evaluation) =>
    evaluation.evaluated_at === bundle.as_of &&
    evaluation.condition_definition_ref.condition_id === definition.condition_id &&
    evaluation.condition_definition_ref.definition_version === definition.definition_version &&
    evaluation.condition_definition_ref.definition_hash === definition.definition_hash);
  if (bundle.canonical.executable_if_ref.active_condition_definition_refs.length !== 1 ||
      assessment.condition_identity.shared_by_all.length !== 1 || evaluations.length !== 1) {
    throw new TypeError("Round 06 requires one exact shared active condition and governed evaluation");
  }
  const evaluation = evaluations[0];
  return {
    condition_definition_ref: structuredClone(definition),
    bundle_evaluation_hash: evaluation.evaluation_hash,
    evaluated_at: evaluation.evaluated_at,
    mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
    computed_rule_state: evaluation.computed_rule_state.state,
  };
}

export function buildRound06Lineage() {
  const bundleSource = load(FIXED_SOURCE_REFS.round_04_bundle.path);
  const negotiationSource = load(FIXED_SOURCE_REFS.negotiation.path);
  const decisionSource = load(FIXED_SOURCE_REFS.decision.path);
  const bundleAssessment = assessTransitionBundle(bundleSource.document, { rootDir: root });
  const derivedIf = deriveBundleIf(bundleSource.document, bundleAssessment);
  const negotiation = negotiationSource.document;
  const decision = decisionSource.document;

  const context = {
    schema_version: "1.0.0",
    context_id: "governance-context.round-06.worker-transition.synthetic",
    classification: "synthetic-research-only",
    captured_at: bundleSource.document.as_of,
    source_bundle_binding: {
      bundle_id: bundleSource.document.bundle_id,
      bundle_sha256: bundleSource.sha256,
      bundle_as_of: bundleSource.document.as_of,
      evaluation_hash: derivedIf.bundle_evaluation_hash,
      condition_definition_ref: derivedIf.condition_definition_ref,
      computed_rule_state: derivedIf.computed_rule_state,
    },
    participants: structuredClone(negotiation.payload.participants),
    affected_consumers: structuredClone(negotiation.payload.affected_consumers),
    representations: structuredClone(negotiation.payload.representations),
    if_binding: structuredClone(negotiation.payload.if_binding),
    boundaries: {
      empirical_truth_established: false,
      affected_party_consent_established: false,
      authority_verified: false,
      action_authorised: false,
      publication_approved: false,
    },
    context_hash: null,
  };
  context.context_hash = computeExternalGovernanceContextHash(context);
  const contextBytes = serialize(context);
  const contextSha256 = `sha256:${createHash("sha256").update(contextBytes).digest("hex")}`;

  const lineage = {
    schema_version: "1.0.0",
    lineage_id: "lineage.round-06.worker-transition.synthetic",
    classification: "synthetic-research-only",
    effect: "records-lineage-only-no-truth-authority-publication-or-action",
    sources: {
      round_04_bundle: {
        path: FIXED_SOURCE_REFS.round_04_bundle.path,
        sha256: bundleSource.sha256,
        bundle_id: bundleSource.document.bundle_id,
        bundle_schema_version: bundleSource.document.schema_version,
        bundle_stage: bundleSource.document.bundle_stage,
      },
      governance_context: {
        path: contextPath,
        sha256: contextSha256,
        context_id: context.context_id,
        context_hash: context.context_hash,
      },
      negotiation: {
        path: FIXED_SOURCE_REFS.negotiation.path,
        sha256: negotiationSource.sha256,
        record_id: negotiation.record_id,
        version: negotiation.version,
        record_hash: negotiation.record_hash,
      },
      decision: {
        path: FIXED_SOURCE_REFS.decision.path,
        sha256: decisionSource.sha256,
        record_id: decision.record_id,
        version: decision.version,
        record_hash: decision.record_hash,
      },
    },
    derived_if: {
      ...derivedIf,
      governance_receipt_hash: context.if_binding.evaluation_receipt_ref.receipt_hash,
    },
    boundaries: structuredClone(context.boundaries),
    action_state: {
      negotiation_activation_state: negotiation.payload.outcome.activation_state,
      decision_activation_state: decision.payload.decision.activation_state,
      operational_effect: false,
    },
    lineage_hash: null,
  };
  lineage.lineage_hash = computeGovernanceLineageHash(lineage);
  return { context, contextBytes, lineage, lineageBytes: serialize(lineage) };
}

const built = buildRound06Lineage();
const contextDestination = resolve(root, contextPath);
const lineageDestination = resolve(root, lineagePath);
if (check) {
  if (readFileSync(contextDestination).compare(built.contextBytes) !== 0) {
    throw new TypeError("Round 06 external governance context is stale; run its builder");
  }
  if (readFileSync(lineageDestination).compare(built.lineageBytes) !== 0) {
    throw new TypeError("Round 06 governance lineage is stale; run its builder");
  }
  const result = validateGovernanceLineage(built.lineage, {
    rootDir: root,
    asOf: "2026-09-16T00:00:00Z",
  });
  if (!result.lineage_valid) throw new TypeError(JSON.stringify(result.errors, null, 2));
} else {
  mkdirSync(dirname(contextDestination), { recursive: true });
  writeFileSync(contextDestination, built.contextBytes);
  writeFileSync(lineageDestination, built.lineageBytes);
}
