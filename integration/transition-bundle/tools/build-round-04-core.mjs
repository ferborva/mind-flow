#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { computeEvidenceStateHash } from "../../../contracts/executable-if/validate.mjs";
import { assessTransitionBundle } from "../assess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const scopePath = "integration/transition-bundle/fixtures/round-04.worker-option.scope-manifest.json";
const bundlePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";
const scopeOutput = resolve(repositoryRoot, scopePath);
const bundleOutput = resolve(repositoryRoot, bundlePath);

function canonicalise(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalise(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function checksumJson(value) {
  return sha256(Buffer.from(canonicalise(value)));
}

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return { path, bytes, document: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
}

const sourcePaths = {
  "agency-map": "contracts/agency-map/fixtures/round-04.worker-option.synthetic.json",
  "evolution-ledger": "contracts/evolution/fixtures/round-04.worker-option.synthetic.json",
  "signal-registry": "signals/fixtures/round-04.worker-option.synthetic.json",
  "possible-path": "paths/fixtures/round-04.worker-option.synthetic.json",
  "preparation-register": "preparation/fixtures/valid/round-04.worker-option.synthetic.json",
  forecast: "forecasts/fixtures/round-04.worker-option.synthetic.json",
  "executable-if-kernel": "contracts/executable-if/fixtures/kernel.synthetic.json",
};
const sources = Object.fromEntries(Object.entries(sourcePaths).map(([role, path]) =>
  [role, fileSource(path)]));
const agency = sources["agency-map"].document;
const path = sources["possible-path"].document;
const kernel = sources["executable-if-kernel"].document;
const conditionIds = agency.outcome_scope.condition_ids;

const agencyMapping = {
  mapping_id: "scope-mapping.round-04.worker-option.agency-map",
  role: "agency-map",
  native_scope_hash: agency.outcome_scope.scope_hash,
  relationship: "canonical-source",
  rationale: "The canonical scope reproduces the agency outcome scope without changing its native hash domain.",
  unresolved_differences: [],
  mapping_truth_assessed: false,
};
const pathMapping = {
  mapping_id: "scope-mapping.round-04.worker-option.possible-path",
  role: "possible-path",
  native_scope_hash: path.outcome_scope.scope_hash,
  relationship: "declared-correspondence-unverified",
  rationale: "The possible path uses the same public outcome fields and condition, represented in its own closed native scope.",
  unresolved_differences: [
    "The two contracts use different native scope shapes and hashes; structural equality does not establish real-world mapping truth.",
  ],
  mapping_truth_assessed: false,
};

const scopeManifest = {
  schema_version: "1.0.0",
  scope_manifest_id: "scope-manifest.round-04.worker-option.synthetic",
  classification: "research-draft",
  canonical_scope: {
    source_role: "agency-map",
    native_scope_hash: agency.outcome_scope.scope_hash,
    people: agency.outcome_scope.people,
    verb: agency.outcome_scope.verb,
    object: agency.outcome_scope.object,
    standard: agency.outcome_scope.standard,
    place: agency.outcome_scope.place,
    period: agency.outcome_scope.period,
    jurisdictions: agency.outcome_scope.jurisdictions,
    geographies: agency.outcome_scope.geographies,
    services: agency.outcome_scope.services,
    starts_at: agency.outcome_scope.starts_at,
    ends_at: agency.outcome_scope.ends_at,
  },
  mappings: [agencyMapping, pathMapping],
  mapping_truth_assessed: false,
  authority_effect: "none",
  action_authorised: false,
};
const scopeBytes = Buffer.from(`${JSON.stringify(scopeManifest, null, 2)}\n`);
const scopeRef = {
  scope_manifest_id: scopeManifest.scope_manifest_id,
  path: scopePath,
  sha256: sha256(scopeBytes),
};
const evidenceTip = kernel.evidence_events.at(-1);
const bundle = {
  schema_version: "1.2.0",
  bundle_id: "bundle.round-04.worker-option.pre-projection",
  bundle_stage: "pre-projection-core",
  classification: "research-draft",
  as_of: "2026-09-09T00:00:00Z",
  evaluation_clock: {
    evaluated_at: "2026-09-09T00:00:00Z",
    source: "operator-supplied",
    trusted: false,
  },
  authority_effect: "none",
  publication_approved: false,
  action_authorised: false,
  canonical: {
    condition_ids: conditionIds,
    outcome_logic_ref: {
      artifact_role: "agency-map",
      json_pointer: "/outcome_scope/condition_logic",
      sha256: checksumJson(agency.outcome_scope.condition_logic),
    },
    scope_manifest_ref: scopeRef,
    executable_if_ref: {
      artifact_role: "executable-if-kernel",
      kernel_id: kernel.kernel_id,
      manifest_hash: kernel.manifest_hash,
      evaluator_ref: kernel.evaluator,
      active_condition_definition_refs: kernel.current_state
        .filter(({ lifecycle }) => lifecycle === "active")
        .map(({ condition_definition_ref: reference }) => reference),
      evidence_state_ref: {
        kernel_id: kernel.kernel_id,
        kernel_manifest_hash: kernel.manifest_hash,
        evidence_event_count: kernel.evidence_events.length,
        evidence_tip_event_id: evidenceTip.evidence_event_id,
        evidence_tip_event_hash: evidenceTip.evidence_event_hash,
        evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
      },
    },
    root_role: "agency-map",
  },
  scope_bindings: [agencyMapping, pathMapping].map((mapping) => ({
    role: mapping.role,
    canonical_scope_manifest_ref: scopeRef,
    native_scope_hash: mapping.native_scope_hash,
    mapping_ref: {
      mapping_id: mapping.mapping_id,
      sha256: checksumJson(mapping),
    },
  })),
  artifacts: Object.entries(sources).map(([role, source]) => ({
    role,
    path: source.path,
    sha256: source.sha256,
  })),
};
const bundleBytes = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`);

function checkFile(output, expected, name) {
  if (readFileSync(output).compare(expected) !== 0) {
    throw new TypeError(`${name} is stale; run the Round 4 core builder`);
  }
}

if (process.argv.includes("--check")) {
  checkFile(scopeOutput, scopeBytes, "Round 4 scope manifest");
  checkFile(bundleOutput, bundleBytes, "Round 4 pre-projection bundle");
} else {
  writeFileSync(scopeOutput, scopeBytes);
  writeFileSync(bundleOutput, bundleBytes);
}

const assessment = assessTransitionBundle(bundle, { rootDir: repositoryRoot });
if (!assessment.bundle_coherent) {
  throw new TypeError(JSON.stringify(assessment.issues, null, 2));
}
