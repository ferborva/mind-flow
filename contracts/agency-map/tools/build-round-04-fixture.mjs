#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { computeEvidenceStateHash } from "../../executable-if/validate.mjs";
import {
  computeMetricChecksum,
  computeOutcomeScopeHash,
  computePublicProjection,
  renderBoundPublicIfClause,
  validateConditionAgencyMap,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const registryPath = "signals/fixtures/round-04.worker-option.synthetic.json";
const outputPath = resolve(
  repositoryRoot,
  "contracts/agency-map/fixtures/round-04.worker-option.synthetic.json",
);
const kernel = JSON.parse(readFileSync(resolve(
  repositoryRoot,
  "contracts/executable-if/fixtures/kernel.synthetic.json",
), "utf8"));
const evolution = JSON.parse(readFileSync(resolve(
  repositoryRoot,
  "contracts/evolution/fixtures/round-04.worker-option.synthetic.json",
), "utf8"));
const registryBytes = readFileSync(resolve(repositoryRoot, registryPath));
const registry = JSON.parse(registryBytes.toString("utf8"));
const registryArtifactSha256 = `sha256:${createHash("sha256")
  .update(registryBytes).digest("hex")}`;
const activeState = kernel.current_state.find(({ lifecycle }) => lifecycle === "active");
const activeDefinition = kernel.events.flatMap(({ introduced_definitions: values }) => values)
  .find(({ definition_hash: hash }) =>
    hash === activeState.condition_definition_ref.definition_hash);
const evolutionCondition = evolution.current_state.conditions.find(({ condition_definition_ref: ref }) =>
  ref.definition_hash === activeState.condition_definition_ref.definition_hash);
const evidenceTip = kernel.evidence_events.at(-1);
const evidenceStateRef = {
  kernel_id: kernel.kernel_id,
  kernel_manifest_hash: kernel.manifest_hash,
  event_count: kernel.evidence_events.length,
  tip_event_id: evidenceTip.evidence_event_id,
  tip_event_hash: evidenceTip.evidence_event_hash,
  state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
};
const historyTipRef = {
  sequence: evolution.source_history_ref.tip_sequence,
  event_id: evolution.source_history_ref.tip_event_id,
  event_hash: evolution.source_history_ref.tip_event_hash,
};

function sourceEvidenceUris(signal) {
  const sourceById = new Map(registry.sources.map((source) => [source.source_id, source]));
  return signal.source_refs.map((sourceId) => sourceById.get(sourceId).evidence_ref).sort();
}

function agencySignal(signal) {
  const link = signal.condition_links.find(({ condition_id: conditionId }) =>
    conditionId === activeDefinition.condition_id);
  const contract = signal.metric_contract;
  const processes = [...new Set(contract.collection_process_ids)];
  if (processes.length !== 1) {
    throw new Error(`${signal.signal_id} cannot project to the single-process agency profile`);
  }
  const metric = {
    metric_id: contract.metric_id,
    measure: contract.measure,
    unit: contract.unit,
    denominator: contract.denominator,
    population: contract.population,
    geography: contract.geography,
    period: contract.period,
    aggregation: contract.aggregation,
    direction: ["counter", "information-harm"].includes(link.evidence_role)
      ? "decrease"
      : link.evidence_role === "readiness" ? "maintain" : "increase",
    collection_process_id: processes[0],
    source_refs: sourceEvidenceUris(signal),
    evaluation_rule: contract.evaluation_rule,
    verification: "external-unverified",
    metric_checksum: "",
  };
  metric.metric_checksum = computeMetricChecksum(metric);
  return {
    signal_ref: signal.signal_id,
    label: signal.label,
    condition_id: activeDefinition.condition_id,
    role: link.evidence_role,
    verification: "external-unverified",
    metric,
    registered_metric_ref: {
      registry_id: registry.registry_id,
      signal_id: signal.signal_id,
      metric_id: contract.metric_id,
      metric_checksum: contract.metric_checksum,
      binding_kind: signal.executable_binding?.kind || signal.supplemental_binding.kind,
      projection_profile: "signal-registry-estimand-to-agency-metric-v1",
    },
  };
}

const signalRecords = registry.signals.map(agencySignal);
const providerActor = "actor.worker-transition-provider.candidate";
const affectedActor = "actor.affected-workers.nsw";
const verifierActor = "actor.independent-verifier.candidate";
const geography = activeDefinition.scope.geographies[0];
const service = activeDefinition.scope.services[0];
const period = `${activeDefinition.claim.period.starts_at} to ${activeDefinition.claim.period.ends_at}`;
const people = registry.signals[0].metric_contract.population;
const place = registry.signals[0].metric_contract.geography;
const conditionId = activeDefinition.condition_id;
const producer = evolutionCondition.source_event_ref;

const document = {
  schema_version: "1.1.0",
  id: "agency-map.round-04.worker-option.synthetic",
  provenance: "commissioned-agent-proposal",
  created_at: "2026-09-08T00:00:00Z",
  as_of: "2026-09-09T00:00:00Z",
  authority_effect: "none",
  condition_truth_assessed: false,
  actor_identity_verified: false,
  control_verified: false,
  forecast_produced: false,
  commitment_created: false,
  action_authorised: false,
  goal: {
    statement: "Affected people gain durable agency and share in technological abundance without involuntary loss of real earnings or essential conditions.",
    classification: "value-choice",
    selection_authority: "external-unverified",
  },
  outcome_scope: {
    people,
    verb: "navigate",
    object: "automation-related work change",
    standard: "without involuntary loss of real earnings or essential conditions, while retaining a credible alternative and accessible human review",
    place,
    period,
    jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
    geographies: structuredClone(activeDefinition.scope.geographies),
    services: structuredClone(activeDefinition.scope.services),
    starts_at: activeDefinition.claim.period.starts_at,
    ends_at: activeDefinition.claim.period.ends_at,
    affected_actor_refs: [affectedActor],
    condition_ids: [conditionId],
    condition_logic: { condition_ref: conditionId },
    scope_hash: "",
  },
  condition_loci: [
    "technical", "organisational", "market", "legal-institutional", "infrastructure",
    "ecological", "personal-capacity", "shared-system", "unknown",
  ],
  actors: [
    {
      actor_ref: affectedActor,
      label: "Affected General Clerks and Payroll Clerks in New South Wales",
      actor_class: "affected-people",
      identity_verification: "external-unverified",
      jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
      capabilities: [{
        verb: "challenge",
        object_class: "record",
        geographies: [geography],
        services: [service],
        status: "caller-asserted",
      }],
    },
    {
      actor_ref: providerActor,
      label: "Candidate worker transition provider",
      actor_class: "institution",
      identity_verification: "external-unverified",
      jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
      capabilities: [{
        verb: "prepare",
        object_class: "service",
        geographies: [geography],
        services: [service],
        status: "caller-asserted",
      }],
    },
    {
      actor_ref: verifierActor,
      label: "Candidate independent worker-selected verifier",
      actor_class: "worker-representative",
      identity_verification: "external-unverified",
      jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
      capabilities: [{
        verb: "audit",
        object_class: "record",
        geographies: [geography],
        services: [service],
        status: "caller-asserted",
      }],
    },
  ],
  signals: signalRecords,
  signal_registry_ref: {
    registry_id: registry.registry_id,
    schema_version: registry.schema_version,
    artifact_path: registryPath,
    artifact_sha256: registryArtifactSha256,
  },
  condition_ledger_ref: {
    ledger_id: evolution.ledger_id,
    ledger_version: evolution.schema_version,
    tip_event_id: historyTipRef.event_id,
    tip_hash: historyTipRef.event_hash,
    uri: `https://example.invalid/mind-flow/evolution/${evolution.ledger_id}.json`,
    verification: "external-unverified",
  },
  conditions: [{
    condition_id: conditionId,
    ledger_anchor: {
      condition_id: conditionId,
      condition_version: activeDefinition.definition_version,
      tip_event_id: producer.event_id,
      tip_hash: producer.event_hash,
    },
    public_if_clause: renderBoundPublicIfClause(activeDefinition),
    category_prompts: ["availability", "capability", "permission", "proximity", "other"],
    locus: "shared-system",
    signal_refs: signalRecords.map(({ signal_ref: signalRef }) => signalRef),
    canonical_binding: {
      condition_definition_ref: structuredClone(activeState.condition_definition_ref),
      evolution_ref: {
        ledger_id: evolution.ledger_id,
        schema_version: evolution.schema_version,
        manifest_hash: evolution.manifest_hash,
      },
      history_tip_ref: historyTipRef,
      condition_source_event_ref: structuredClone(producer),
      evidence_state_ref: evidenceStateRef,
    },
    relations: [
      {
        actor_ref: affectedActor,
        roles: ["affected"],
        evidence_refs: [],
        verification: "external-unverified",
      },
      {
        actor_ref: providerActor,
        roles: ["influences", "delivers", "observes"],
        evidence_refs: [],
        verification: "external-unverified",
      },
      {
        actor_ref: verifierActor,
        roles: ["verifies", "observes"],
        evidence_refs: [],
        verification: "external-unverified",
      },
    ],
  }],
  provider_plans: [{
    plan_id: "plan.worker-transition-provider.round-04.synthetic",
    actor_ref: providerActor,
    offered_verb: "prepare",
    offered_object: "a reversible worker-controlled transition-support rehearsal",
    object_class: "service",
    standard: "the registered option, accessibility, refusal, review and information-safety checks",
    place,
    period,
    jurisdictions: structuredClone(activeDefinition.scope.jurisdictions),
    geographies: structuredClone(activeDefinition.scope.geographies),
    services: structuredClone(activeDefinition.scope.services),
    starts_at: activeDefinition.claim.period.starts_at,
    ends_at: activeDefinition.claim.period.ends_at,
    ordering: "concurrent-or-dependency-bound",
    when_clauses: [{
      condition_id: conditionId,
      condition_anchor_hash: producer.event_hash,
      mode: "prepare",
      completion_criterion: "A bounded rehearsal demonstrates access, refusal, human review and worker challenge paths without worsening the registered counter or information-harm measures.",
      completion_test: {
        measure: "registered rehearsal, safeguard and independent worker review checks passed",
        operator: "human-review",
        threshold: true,
        unit: "pass-fail",
        verifier_actor_ref: verifierActor,
        verification: "external-unverified",
      },
      evidence_refs: [],
      dependency_actor_refs: [],
      next_review: "2026-12-01T00:00:00Z",
      claim_state: "proposal-only",
    }],
  }],
  action_hypotheses: [{
    hypothesis_id: "action-hypothesis.prepare-worker-option-rehearsal",
    actor_ref: providerActor,
    verb: "prepare",
    object: "a reversible worker-controlled transition-support rehearsal",
    object_class: "service",
    geography,
    service,
    target_condition_id: conditionId,
    intended_signal_ref: "signal.option.coverage",
    expected_direction: "increase",
    counter_signal_refs: ["signal.worker-option.counter.synthetic"],
    harm_signal_refs: ["signal.worker-option.information-harm.synthetic"],
    mechanism: "A worker-controlled rehearsal may expose access, refusal and review failures before any consequential transition decision.",
    falsifier: "Option coverage or review access does not improve, adverse outcomes rise, information harm rises, or affected workers reject the mechanism.",
    expires_at: "2026-12-01T00:00:00Z",
    reversibility: "reversible",
    status: "proposal-only",
    authority_verification: "external-unverified",
    action_authorised: false,
  }],
  public_projection: null,
};

document.outcome_scope.scope_hash = computeOutcomeScopeHash(document);
document.public_projection = computePublicProjection(document);

const result = validateConditionAgencyMap(document, {
  evaluatedAt: document.as_of,
  sourceKernel: kernel,
  sourceEvolution: evolution,
  sourceSignalRegistry: registry,
  sourceSignalRegistryArtifactPath: registryPath,
  sourceSignalRegistryArtifactSha256: registryArtifactSha256,
});
if (!result.machine_valid) {
  throw new Error(`generated Round 4 agency map is invalid:\n${JSON.stringify(result.errors, null, 2)}`);
}

const rendered = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== rendered) {
    throw new Error("Round 4 agency fixture is stale; run the builder");
  }
  console.log("Round 4 agency fixture is reproducible");
} else {
  writeFileSync(outputPath, rendered);
  console.log(`Built ${outputPath}`);
}
