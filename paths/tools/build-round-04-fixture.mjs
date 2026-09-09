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
  computeCanonicalBindingHash,
  computeOutcomeScopeHash,
  renderPublicClaimCeiling,
  validatePossiblePath,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");
const outputPath = resolve(repositoryRoot, "paths/fixtures/round-04.worker-option.synthetic.json");

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

const sources = {
  sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
  sourceEvolution: fileSource("contracts/evolution/fixtures/round-04.worker-option.synthetic.json"),
  sourceSignalRegistry: fileSource("signals/fixtures/round-04.worker-option.synthetic.json"),
  sourceAgencyMap: fileSource("contracts/agency-map/fixtures/round-04.worker-option.synthetic.json"),
};
const kernel = sources.sourceKernel.document;
const evolution = sources.sourceEvolution.document;
const registry = sources.sourceSignalRegistry.document;
const agency = sources.sourceAgencyMap.document;
const conditionId = agency.conditions[0].condition_id;
const activeState = kernel.current_state.find(({ lifecycle, condition_definition_ref: reference }) =>
  lifecycle === "active" && reference.condition_id === conditionId);
const evolutionCondition = evolution.current_state.conditions.find(({ condition_definition_ref: reference }) =>
  reference.condition_id === conditionId);
const evidenceTip = kernel.evidence_events.at(-1);
const evaluation = evaluateKernelCondition(kernel, conditionId, {
  evaluatedAt: "2026-09-09T00:00:00Z",
});
const evidenceStateRef = {
  kernel_id: kernel.kernel_id,
  kernel_manifest_hash: kernel.manifest_hash,
  event_count: kernel.evidence_events.length,
  tip_event_id: evidenceTip.evidence_event_id,
  tip_event_hash: evidenceTip.evidence_event_hash,
  state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
};
const evaluationRef = {
  evaluated_at: evaluation.evaluated_at,
  evaluator_ref: evaluation.evaluator_ref,
  condition_definition_ref: evaluation.condition_definition_ref,
  observation_hashes: evaluation.observation_hashes,
  mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
  computed_rule_state: evaluation.computed_rule_state,
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
  kernel_manifest_hash: evaluation.kernel_manifest_hash,
  evidence_state_hash: evaluation.evidence_state_hash,
  evaluation_hash: evaluation.evaluation_hash,
};
const historyTipRef = {
  sequence: evolution.source_history_ref.tip_sequence,
  event_id: evolution.source_history_ref.tip_event_id,
  event_hash: evolution.source_history_ref.tip_event_hash,
};
const canonicalBinding = {
  condition_definition_ref: structuredClone(activeState.condition_definition_ref),
  evolution_manifest_hash: evolution.manifest_hash,
  history_tip_ref: historyTipRef,
  condition_source_event_ref: structuredClone(evolutionCondition.source_event_ref),
  evidence_state_ref: evidenceStateRef,
  evaluation_ref: evaluationRef,
};
const canonicalBindingHash = computeCanonicalBindingHash(canonicalBinding);
const ledgerRef = `urn:mind-flow:evolution:${evolution.ledger_id}`;
const publicCondition = agency.conditions[0].public_if_clause;

function artifactRef(source, extras = {}) {
  return {
    id: source.document.kernel_id || source.document.ledger_id ||
      source.document.registry_id || source.document.id,
    artifact_path: source.path,
    artifact_sha256: source.sha256,
    ...extras,
  };
}

function registeredSignalRef(signalId) {
  const signal = registry.signals.find(({ signal_id: id }) => id === signalId);
  return {
    signal_id: signalId,
    metric_id: signal.metric_contract.metric_id,
    metric_checksum: signal.metric_contract.metric_checksum,
    binding_kind: signal.executable_binding?.kind || signal.supplemental_binding.kind,
  };
}

const outcomeScope = {
  who: agency.outcome_scope.people,
  verb: agency.outcome_scope.verb,
  object: agency.outcome_scope.object,
  standard: agency.outcome_scope.standard,
  place: agency.outcome_scope.place,
  period: agency.outcome_scope.period,
  if_conditions: [{ condition_id: conditionId, public_condition: publicCondition }],
  scope_hash: "",
};
outcomeScope.scope_hash = computeOutcomeScopeHash(outcomeScope);
const populationId = "population.affected-workers.nsw";
const abandonmentNode = "node.worker-option.blocked";

const document = {
  schema_version: "1.2",
  path_id: "path.round-04.worker-option.synthetic",
  classification: "synthetic-example-not-a-finding",
  title: "A worker-controlled route through automation-related work change",
  hypothesis_summary: "A reversible support rehearsal may help affected workers preserve meaningful choice while institutions learn where access, refusal, review and communication safeguards fail.",
  epistemic_contract: {
    kind: "possible-path-hypothesis",
    world_model: "open-world",
    quantification: "unscored",
    selection_status: "one-revisable-path-among-named-and-unnamed-possibilities",
    truth_status: "not-assessed",
  },
  outcome_scope: outcomeScope,
  source_refs: {
    kernel: artifactRef(sources.sourceKernel, { manifest_hash: kernel.manifest_hash }),
    evolution: artifactRef(sources.sourceEvolution, { manifest_hash: evolution.manifest_hash }),
    signal_registry: artifactRef(sources.sourceSignalRegistry),
    agency_map: artifactRef(sources.sourceAgencyMap, {
      outcome_scope_hash: agency.outcome_scope.scope_hash,
    }),
  },
  condition_anchors: [{
    condition_id: conditionId,
    ledger_ref: ledgerRef,
    ledger_manifest_hash: evolution.manifest_hash,
    condition_version: evolutionCondition.source_state_version,
    as_of_sequence: historyTipRef.sequence,
    as_of_event_id: historyTipRef.event_id,
    as_of_event_hash: historyTipRef.event_hash,
    rendered_if: `IF ${publicCondition}`,
    verification: "external-unverified-anchor",
    canonical_binding: canonicalBinding,
    canonical_binding_hash: canonicalBindingHash,
  }],
  graph: {
    entry_node_id: "node.worker-option.context",
    nodes: [
      {
        node_id: "node.worker-option.context",
        kind: "context",
        label: "Automation-related work change reaches the registered worker scope",
        affected_population_ids: [populationId],
      },
      {
        node_id: "node.worker-option.protected-outcome",
        kind: "outcome",
        label: "Affected workers reach the chosen protection standard after human review",
        affected_population_ids: [populationId],
      },
      {
        node_id: abandonmentNode,
        kind: "abandonment",
        label: "This candidate route stops while evidence, freshness or disagreement is resolved",
        affected_population_ids: [populationId],
      },
    ],
    edges: [{
      edge_id: "edge.worker-option.consider-protected-route",
      from_node_id: "node.worker-option.context",
      to_node_id: "node.worker-option.protected-outcome",
      kind: "consequential-decision",
      label: "Consider the protected route only after the exact IF receipt is reviewed",
      condition_bindings: [{
        condition_id: conditionId,
        ledger_ref: ledgerRef,
        ledger_manifest_hash: evolution.manifest_hash,
        condition_version: evolutionCondition.source_state_version,
        as_of_sequence: historyTipRef.sequence,
        as_of_event_id: historyTipRef.event_id,
        as_of_event_hash: historyTipRef.event_hash,
        outcome_scope_hash: outcomeScope.scope_hash,
        canonical_binding_hash: canonicalBindingHash,
      }],
      branches: {
        if_true: {
          target_node_id: "node.worker-option.protected-outcome",
          action: "human-decision-required",
          recovery: "human-review",
          public_explanation: "The registered rule matches its synthetic evidence. A human must still assess empirical truth, values, consent and authority.",
        },
        if_false: {
          target_node_id: abandonmentNode,
          action: "block-edge-traversal",
          recovery: "repair-or-alternate",
          public_explanation: "The registered predicates do not hold. Stop this route and examine alternatives or repair the failed protection.",
        },
        if_unknown: {
          target_node_id: abandonmentNode,
          action: "block-edge-traversal",
          recovery: "acquire-missing-evidence",
          public_explanation: "Eligible evidence is insufficient. Stop this route and collect the missing observations without presuming safety.",
        },
        if_stale: {
          target_node_id: abandonmentNode,
          action: "block-edge-traversal",
          recovery: "refresh-and-re-evaluate",
          public_explanation: "Eligible evidence is too old. Stop this route, reacquire evidence and evaluate again.",
        },
        if_conflicted: {
          target_node_id: abandonmentNode,
          action: "block-edge-traversal",
          recovery: "adjudicate-conflict",
          public_explanation: "Eligible evidence conflicts. Stop this route and adjudicate the disagreement without averaging it away.",
        },
      },
    }],
  },
  condition_evolution_policies: [{
    condition_id: conditionId,
    ledger_ref: ledgerRef,
    ledger_manifest_hash: evolution.manifest_hash,
    anchor_event_hash: historyTipRef.event_hash,
    history_requirement: "complete-append-only-hash-bound",
    on_event: [
      "added", "narrowed", "definition-revised", "split", "merge", "challenged",
      "satisfied", "failed", "expired", "superseded", "disputed", "withdrawn",
    ].map((operation) => ({
      operation,
      disposition: "fail-closed",
      reason: `${operation} changes or may change the evidence needed to defend this candidate path.`,
      next_action: "re-register-and-review",
    })),
  }],
  competing_paths: [
    {
      path_id: "path.competitor.in-place-redesign",
      label: "Work is redesigned in place with protected roles",
      selection_reason: "It could preserve the chosen outcome without occupational transition support as the main mechanism.",
      incompatible_claim: "Most adaptation occurs inside retained roles rather than through the candidate support route.",
      discriminating_observations: [{
        observation_id: "observation.role-retention-mechanism",
        construct: "Worker-level role retention, task redesign and use of transition support",
        possible_path_pattern: "Affected workers voluntarily use a credible option and accessible review route.",
        competing_path_pattern: "Affected workers retain redesigned roles and rarely use transition support.",
        period: outcomeScope.period,
        source_plan: "Pre-register consented worker observations and independently audited employer task records. No source is acquired here.",
        status: "unresolved",
      }],
    },
    {
      path_id: "path.competitor.unsupported-contraction",
      label: "Work contracts without a protected route",
      selection_reason: "It tests whether apparent adaptation hides exits, lost earnings or constrained choice.",
      incompatible_claim: "Affected workers leave or lose work without the registered option and review safeguards.",
      discriminating_observations: [{
        observation_id: "observation.unsupported-exit-mechanism",
        construct: "Worker exits, real earnings, essential conditions and registered support exposure",
        possible_path_pattern: "Affected workers retain the chosen standard with a recorded credible option and review route.",
        competing_path_pattern: "Affected workers exit without the safeguards or do not retain the chosen standard.",
        period: outcomeScope.period,
        source_plan: "Acquire consented longitudinal worker records with independent access and harm audits. No source is acquired here.",
        status: "unresolved",
      }],
    },
  ],
  strongest_competing_path_id: "path.competitor.in-place-redesign",
  signal_portfolio: {
    condition_ids: [conditionId],
    portfolio_status: "research-only-unverified",
    roles: [
      ["leading", null, "No validated precursor is registered."],
      ["confirming", "signal.option.coverage", null],
      ["counter", "signal.worker-option.counter.synthetic", null],
      ["outcome", null, "The chosen human outcome has no independently validated measure."],
      ["readiness", "signal.human-review.available", null],
      ["intervention-exposure", null, "The proposed rehearsal has not started and no governed exposure record exists."],
      ["information-harm", "signal.worker-option.information-harm.synthetic", null],
    ].map(([role, signalId, unresolvedReason]) => signalId ? {
      role,
      status: "assigned",
      signal_ids: [signalId],
      registered_signal_refs: [registeredSignalRef(signalId)],
    } : {
      role,
      status: "unresolved",
      unresolved_reason: unresolvedReason,
    }),
  },
  population_accounting: {
    affected_populations: [
      {
        population_id: populationId,
        label: "General Clerks and Payroll Clerks in the registered New South Wales scope",
        effect_channel: "Work, real earnings, essential conditions, choice, review access and information harm",
        voice_status: "not-consulted",
      },
      {
        population_id: "population.dependent-households",
        label: "Households that depend on earnings from affected workers",
        effect_channel: "Income stability, care responsibilities and mobility burden",
        voice_status: "not-consulted",
      },
    ],
    omissions: {
      status: "identified",
      entries: [{
        population_id: "population.omitted.precarious-workers",
        label: "Workers with temporary, visa-linked, casual or otherwise precarious bargaining positions",
        omission_reason: "The registered aggregate scope does not separately represent constraints on refusal, appeal or mobility.",
        consequence: "A route described as voluntary for the aggregate may remain coercive for these workers.",
        remedy: "Co-design separate refusal, continuity and review tests with affected workers and qualified advocates before use.",
        public_notice: "Workers with precarious bargaining positions are not adequately represented by this synthetic path.",
      }],
      search_method: "Synthetic enumeration across worker, household, employer, service, legal-status and communication channels.",
      search_limitations: "No affected-party consultation or representative sampling has occurred. Further omissions are expected.",
    },
  },
  gaming_and_reflexivity: [
    {
      risk_id: "risk.option-relabeling",
      mechanism: "A provider or employer could relabel constrained redeployment as a credible option.",
      early_observation: "Audit refusal, appeal use, adverse employment events and worker comprehension before interpreting coverage.",
      response: "Pause the path, retain records and require worker-accessible independent review.",
      residual_unknown: "Informal coercion may remain hidden even when formal refusal is recorded.",
    },
    {
      risk_id: "risk.communication-certainty",
      mechanism: "Publishing a favourable rule state could be mistaken for empirical truth, entitlement or permission.",
      early_observation: "Test whether affected people can distinguish rule state, evidence quality, freshness and authority.",
      response: "Withdraw or redesign communication when misunderstanding or pressure rises.",
      residual_unknown: "Public interpretation may change as institutions respond to the signal.",
    },
  ],
  intervention_state: {
    state: "proposed-not-started",
    exposure_status: "none",
    evidence_status: "synthetic-unverified",
    last_checked_at: "2026-09-09T00:00:00Z",
  },
  expiry: {
    expires_at: "2026-12-31T23:59:59Z",
    disposition: "abandon-unless-reregistered",
    reason: "Evidence, definitions, worker preferences and institutional capability may change.",
  },
  abandonment: {
    default: "stop-and-retain-history",
    triggers: [
      {
        trigger_id: "trigger.non-true-or-invalid-state",
        condition: "The exact IF receipt is false, unknown, stale, conflicted or mechanically invalid.",
        disposition: "abandon-path-and-retain-record",
        reason: "No consequential route may inherit assurance from missing, old or disputed evidence.",
      },
      {
        trigger_id: "trigger.unrepresented-harm",
        condition: "An affected or omitted population reports material harm that the registered scope does not cover.",
        disposition: "abandon-path-and-retain-record",
        reason: "Aggregate progress cannot silently trade away an under-represented population.",
      },
    ],
    public_notice: "Stopping this candidate path does not establish a competitor. It records what failed and what must be learned next.",
  },
  governance: {
    auto_action: false,
    authority_status: "externally-unverified",
    action_authorised: false,
    human_decision_required: true,
    owner_ref: null,
    authority_next_check: "Name and independently verify a lawful owner with affected-party challenge before any decision-linked use.",
  },
  provenance: {
    author_class: "commissioned-agent-proposal",
    evidence_status: "synthetic-unverified",
    created_at: "2026-09-09T00:00:00Z",
    updated_at: "2026-09-09T00:00:00Z",
  },
  public_claim_ceiling: "",
};
document.public_claim_ceiling = renderPublicClaimCeiling(document);

const result = validatePossiblePath(document, sources);
if (!result.machine_valid) {
  throw new Error(`generated Round 4 path is invalid:\n${JSON.stringify(result.errors, null, 2)}`);
}
const rendered = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== rendered) {
    throw new Error("Round 4 path fixture is stale; run the builder");
  }
  console.log("Round 4 path fixture is reproducible");
} else {
  writeFileSync(outputPath, rendered);
  console.log(`Built ${outputPath}`);
}
