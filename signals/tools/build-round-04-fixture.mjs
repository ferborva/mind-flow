#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { computeEvidenceStateHash } from "../../contracts/executable-if/validate.mjs";
import {
  computeMetricContractChecksum,
  renderPublicClaimCeiling,
  validateSignalRegistry,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const kernel = JSON.parse(readFileSync(
  resolve(root, "contracts/executable-if/fixtures/kernel.synthetic.json"), "utf8",
));
const evolution = JSON.parse(readFileSync(
  resolve(root, "contracts/evolution/fixtures/round-04.worker-option.synthetic.json"), "utf8",
));
const outputPath = resolve(root, "signals/fixtures/round-04.worker-option.synthetic.json");
const activeState = kernel.current_state.find(({ lifecycle }) => lifecycle === "active");
const activeDefinition = kernel.events.flatMap(({ introduced_definitions: definitions }) => definitions)
  .find(({ definition_hash: hash }) =>
    hash === activeState.condition_definition_ref.definition_hash);
const producer = kernel.events.find((event) => event.new_states.some((state) =>
  state.condition_definition_ref.definition_hash === activeState.condition_definition_ref.definition_hash &&
  state.lifecycle === "active"));
const evidenceTip = kernel.evidence_events.at(-1);
const ledgerRef = `urn:mind-flow:evolution:${evolution.ledger_id}`;
const evidenceStateRef = {
  kernel_id: kernel.kernel_id,
  kernel_manifest_hash: kernel.manifest_hash,
  evidence_event_count: kernel.evidence_events.length,
  evidence_tip_event_id: evidenceTip.evidence_event_id,
  evidence_tip_event_hash: evidenceTip.evidence_event_hash,
  evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
};
const sourceId = "source.synthetic-employer-worker-panel";
const geography = `${activeDefinition.scope.geographies.join(", ")}, ${activeDefinition.scope.jurisdictions.join(", ")}`;
const period = `${activeDefinition.claim.period.starts_at} to ${activeDefinition.claim.period.ends_at}`;

function signal(source, predicateId, role, epistemicClass, statisticalUnit, denominator) {
  const item = {
    signal_id: source.signal_id,
    label: source.label,
    status: "candidate",
    construct: {
      construct_id: `construct.${source.signal_id.slice("signal.".length)}`,
      name: source.label,
      definition: source.construct,
      statistical_unit: statisticalUnit,
    },
    estimand: {
      quantity: source.estimand,
      population: source.population,
      geography,
      period,
      unit: source.unit,
      denominator,
      aggregation_level: source.aggregation,
    },
    epistemic_class: epistemicClass,
    source_refs: [sourceId],
    condition_links: [{
      condition_id: activeDefinition.condition_id,
      ledger_ref: ledgerRef,
      evidence_role: role,
      edge_type: "necessary",
      scope: {
        construct_id: `construct.${source.signal_id.slice("signal.".length)}`,
        population: source.population,
        geography,
        statistical_unit: statisticalUnit,
        period,
        unit: source.unit,
        denominator,
        aggregation_level: source.aggregation,
      },
    }],
    timing: {
      cadence: "monthly synthetic observation window",
      publication_lag_max_days: 2,
      prospective_decision_lead_min_days: 30,
      revision_behaviour: "Corrections, challenges, withdrawals and expiry remain in the executable evidence chain.",
    },
    uncertainty: {
      representation: "Synthetic contract fixture; no population uncertainty is estimated.",
      interval_available: false,
      known_limits: [
        "Invented observations cannot establish real-world prevalence or service accessibility.",
      ],
    },
    missingness: {
      mechanism: "Synthetic source cells may be absent, incomplete, stale, challenged or withdrawn.",
      reporting_rule: "Preserve unknown, stale and conflicted states. Never coerce them to false or zero.",
    },
    exclusions: ["real-world causal inference", "individual entitlement or eligibility"],
    confounders: ["selection into the synthetic panel", "unverified source independence"],
    negative_controls: ["a held-out synthetic scope cell with no registered intervention"],
    gaming: {
      risks: ["reporting only favourable cells", "renaming one source as multiple independent sources"],
      detection: "Compare exact source IDs, artifact hashes, scope cells and evidence lifecycle events.",
      suspension_rule: "Suspend interpretation when any source, scope or evidence-state binding drifts.",
    },
    reflexivity: {
      risk: "A favourable indicator may be mistaken for a promise or entitlement.",
      monitor: "Test comprehension of computed state, empirical truth and authority as separate concepts.",
    },
    value_of_information: {
      decision_ref: null,
      learning_value: "Tests whether an exact predicate signal can move through the programme without changing meaning.",
      next_observation: "Replace synthetic observations with approved, scope-compatible and independently auditable evidence.",
    },
    public_claim_ceiling: "",
    claim_permissions: {
      causal_claim: false,
      individual_inference: false,
      operational_effect: false,
    },
    executable_binding: {
      kind: "executable-predicate",
      signal_definition_ref: {
        signal_id: source.signal_id,
        definition_version: source.definition_version,
        signal_definition_hash: source.signal_definition_hash,
      },
      condition_definition_ref: structuredClone(activeState.condition_definition_ref),
      predicate_ids: [predicateId],
    },
  };
  item.metric_contract = {
    metric_id: `metric.${source.signal_id.slice("signal.".length)}`,
    measure: item.estimand.quantity,
    unit: item.estimand.unit,
    denominator: item.estimand.denominator,
    population: item.estimand.population,
    geography: item.estimand.geography,
    period: item.estimand.period,
    aggregation: item.estimand.aggregation_level,
    collection_process_ids: ["process.synthetic-employer-worker-panel"],
    source_refs: [sourceId],
    evaluation_rule: "Apply the immutable executable predicate to exact-scope observations. Preserve missing, stale and conflicted states.",
    metric_checksum: "",
  };
  item.metric_contract.metric_checksum = computeMetricContractChecksum(item.metric_contract);
  item.public_claim_ceiling = renderPublicClaimCeiling(item);
  return item;
}

const optionSignal = signal(
  kernel.signals.find(({ signal_id: id }) => id === "signal.option.coverage"),
  "option-coverage",
  "confirming",
  "participant-report",
  "affected worker",
  "eligible affected workers in the exact registered scope",
);
const reviewSignal = signal(
  kernel.signals.find(({ signal_id: id }) => id === "signal.human-review.available"),
  "human-review",
  "readiness",
  "source-observation",
  "eligible scope cell",
  "all eligible scope cells in the exact registered scope",
);

function supplementalSignal({ signalId, label, role, definition, quantity }) {
  const item = structuredClone(optionSignal);
  const constructId = `construct.${signalId.slice("signal.".length)}`;
  item.signal_id = signalId;
  item.label = label;
  item.construct = {
    ...item.construct,
    construct_id: constructId,
    name: label,
    definition,
  };
  item.estimand.quantity = quantity;
  item.metric_contract = {
    ...item.metric_contract,
    metric_id: `metric.${signalId.slice("signal.".length)}`,
    measure: quantity,
    evaluation_rule: `Measure the registered ${role} construct independently. Missing observations remain unknown and this metric never changes executable truth.`,
    metric_checksum: "",
  };
  item.metric_contract.metric_checksum = computeMetricContractChecksum(item.metric_contract);
  item.condition_links[0] = {
    ...item.condition_links[0],
    evidence_role: role,
    edge_type: role === "counter" ? "inhibiting" : "correlated-only",
    scope: {
      ...item.condition_links[0].scope,
      construct_id: constructId,
    },
  };
  item.uncertainty.known_limits = [
    "This invented supplemental observation is not executable predicate evidence.",
    "No causal, prevalence or individual-level conclusion can be drawn.",
  ];
  item.value_of_information = {
    decision_ref: null,
    learning_value: `Tests whether ${role} evidence remains visible without changing the IF predicate.`,
    next_observation: "Design and independently validate a scope-compatible measurement protocol before operational use.",
  };
  delete item.executable_binding;
  item.supplemental_binding = {
    kind: "supplemental-observation",
    purpose: role,
    condition_definition_ref: structuredClone(activeState.condition_definition_ref),
    truth_expression_effect: "none",
  };
  item.public_claim_ceiling = renderPublicClaimCeiling(item);
  return item;
}

const counterSignal = supplementalSignal({
  signalId: "signal.worker-option.counter.synthetic",
  label: "Reported earnings or essential-condition deterioration",
  role: "counter",
  definition: "The share of affected workers reporting lower real earnings or worse essential conditions after a transition-support exposure.",
  quantity: "share reporting lower real earnings or worse essential conditions",
});
const informationHarmSignal = supplementalSignal({
  signalId: "signal.worker-option.information-harm.synthetic",
  label: "Reported transition-information harm",
  role: "information-harm",
  definition: "The share of affected workers reporting that transition communication made options, evidence status or authority boundaries less clear.",
  quantity: "share reporting reduced clarity after transition communication",
});

const registry = {
  schema_version: "1.1.0",
  registry_id: "registry.round-04.worker-option.synthetic",
  status: "agent-proposal",
  authority: "none",
  operational_effect: false,
  as_of: "2026-09-09T00:00:00Z",
  condition_bindings: [{
    condition_id: activeDefinition.condition_id,
    ledger_ref: ledgerRef,
    binding_status: "locally-verified-complete",
    ledger_manifest_hash: evolution.manifest_hash,
    ledger_tip_event_id: producer.event_id,
    ledger_tip_hash: producer.event_hash,
    condition_definition_ref: structuredClone(activeState.condition_definition_ref),
    condition_source_event_ref: {
      sequence: producer.sequence,
      event_id: producer.event_id,
      event_hash: producer.event_hash,
    },
    evidence_state_ref: evidenceStateRef,
    next_binding: null,
  }],
  sources: [{
    source_id: sourceId,
    label: "Synthetic employer-worker panel",
    publisher: "Mind Flow contract fixture",
    collection_process_id: "process.synthetic-employer-worker-panel",
    depends_on_source_ids: [],
    evidence_ref: "https://example.invalid/mind-flow/round-04/employer-worker-panel.synthetic.json",
    artifact_binding: {
      status: "not-acquired",
      checksum: null,
      next_acquisition: "Create a governed synthetic source artifact or acquire approved external bytes before interpreting the candidate signals.",
    },
  }],
  signals: [optionSignal, reviewSignal, counterSignal, informationHarmSignal],
  portfolios: [{
    condition_id: activeDefinition.condition_id,
    ledger_ref: ledgerRef,
    scope: structuredClone(optionSignal.condition_links[0].scope),
    decision_context: {
      use: "research-only",
      owner_ref: null,
      minimum_useful_lead_days: 0,
    },
    role_assignments: [{ role: "confirming", signal_ids: [optionSignal.signal_id] }],
    unresolved_roles: [
      ["leading", "No validated pre-threshold precursor is registered."],
      ["counter", "A supplemental adverse-outcome construct is registered, but no independent empirical measure is validated."],
      ["outcome", "The protected human outcome is not yet measured independently."],
      ["readiness", "Human-review availability is executable evidence, but operational capacity is not validated."],
      ["intervention-exposure", "No governed programme exposure record is registered."],
      ["information-harm", "A supplemental communication-harm construct is registered, but no independent empirical measure is validated."],
    ].map(([role, reason]) => ({
      role,
      reason,
      next_acquisition: `Acquire a scope-compatible ${role} signal before decision-linked or public use.`,
    })),
    public_disposition: "methods-only",
  }],
};

const result = validateSignalRegistry(registry);
if (!result.machine_valid) {
  throw new Error(`generated Round 4 signal registry is invalid:\n${JSON.stringify(result.errors, null, 2)}`);
}
const rendered = `${JSON.stringify(registry, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== rendered) {
    throw new Error("Round 4 signal registry fixture is stale; run the builder");
  }
  console.log("Round 4 signal registry fixture is reproducible");
} else {
  writeFileSync(outputPath, rendered);
  console.log(`Built ${outputPath}`);
}
