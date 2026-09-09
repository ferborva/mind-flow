#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FIXED_EVALUATOR_REF,
  computeConditionDefinitionHash,
  computeEvidenceEventHash,
  computeEventHash,
  computeManifestHash,
  computeObservationHash,
  computeSignalDefinitionHash,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, "../fixtures/kernel.synthetic.json");

function signal(signalId, label, construct, valueKind, unit) {
  const value = {
    signal_id: signalId,
    definition_version: "1.0.0",
    label,
    construct,
    population: "Affected workers inside the complete registered observation scope",
    estimand: construct,
    aggregation: valueKind === "number"
      ? "Eligible-worker weighted ratio"
      : "All eligible scope cells report the same Boolean state",
    projection_policy: "exact-scope-only",
    source_schema_ref: "synthetic:test-panel/1.0.0",
    value_kind: valueKind,
    unit,
    signal_definition_hash: `sha256:${"0".repeat(64)}`,
  };
  value.signal_definition_hash = computeSignalDefinitionHash(value);
  return value;
}

const signals = [
  signal("signal.option.coverage", "Credible option coverage", "Share of affected workers with a credible alternative", "number", "ratio"),
  signal("signal.human-review.available", "Human review available", "Whether an accessible human review route exists", "boolean", "boolean"),
];
const signalRefs = Object.fromEntries(signals.map((item) => [item.signal_id, {
  signal_id: item.signal_id,
  definition_version: item.definition_version,
  signal_definition_hash: item.signal_definition_hash,
}]));

function scope(geographies, cohorts) {
  return {
    jurisdictions: ["Australia"],
    geographies,
    cohorts,
    services: ["Work transition support"],
  };
}

function definition(conditionId, definitionVersion, effectiveFrom, definitionScope, coverageThreshold = 0.8) {
  const value = {
    condition_id: conditionId,
    condition_category: "availability",
    definition_version: definitionVersion,
    proposition: "Affected workers have a credible alternative and an accessible human review route.",
    claim: {
      who: "Affected workers in the registered scope",
      verb: "retain",
      object: "a credible alternative and an accessible human review route",
      standard: "both registered protection predicates are satisfied",
      polarity: "affirmative",
      period: {
        starts_at: "2026-01-01T00:00:00Z",
        ends_at: "2026-12-31T23:59:59Z",
      },
    },
    effective_from: effectiveFrom,
    scope: definitionScope,
    predicates: {
      "option-coverage": {
        signal_ref: signalRefs["signal.option.coverage"],
        operator: "gte",
        threshold: { value: coverageThreshold, unit: "ratio" },
        window: { lookback_days: 90, minimum_observations: 2, persistence: 2, maximum_age_days: 30 },
        source_policy: {
          minimum_distinct_source_ids: 1,
          minimum_distinct_artifact_hashes: 1,
          minimum_coverage_ratio: 0.8,
          agreement: "unanimous-per-period",
        },
        missing_result: "unknown",
        stale_result: "stale",
        conflict_result: "conflicted",
      },
      "human-review": {
        signal_ref: signalRefs["signal.human-review.available"],
        operator: "eq",
        threshold: { value: true, unit: "boolean" },
        window: { lookback_days: 90, minimum_observations: 2, persistence: 2, maximum_age_days: 30 },
        source_policy: {
          minimum_distinct_source_ids: 1,
          minimum_distinct_artifact_hashes: 1,
          minimum_coverage_ratio: 0.8,
          agreement: "unanimous-per-period",
        },
        missing_result: "unknown",
        stale_result: "stale",
        conflict_result: "conflicted",
      },
    },
    truth_expression: {
      all: [{ predicate_ref: "option-coverage" }, { predicate_ref: "human-review" }],
    },
    evaluator_ref: FIXED_EVALUATOR_REF,
    classification: "research-draft",
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    definition_hash: `sha256:${"0".repeat(64)}`,
  };
  value.definition_hash = computeConditionDefinitionHash(value);
  return value;
}

const parentV1 = definition(
  "condition.worker-option",
  "1.0.0",
  "2026-01-01T00:00:00Z",
  scope(["New South Wales", "Queensland"], ["General Clerks", "Payroll Clerks"]),
);
const parentV11 = definition(
  "condition.worker-option",
  "1.1.0",
  "2026-02-01T00:00:00Z",
  scope(["New South Wales"], ["General Clerks", "Payroll Clerks"]),
);
const parentV2 = definition(
  "condition.worker-option",
  "2.0.0",
  "2026-03-01T00:00:00Z",
  scope(["New South Wales"], ["General Clerks", "Payroll Clerks"]),
  0.9,
);
const general = definition(
  "condition.worker-option.nsw-general",
  "1.0.0",
  "2026-04-01T00:00:00Z",
  scope(["New South Wales"], ["General Clerks"]),
  0.9,
);
const payroll = definition(
  "condition.worker-option.nsw-payroll",
  "1.0.0",
  "2026-04-01T00:00:00Z",
  scope(["New South Wales"], ["Payroll Clerks"]),
  0.9,
);
const merged = definition(
  "condition.worker-option.nsw",
  "1.0.0",
  "2026-05-01T00:00:00Z",
  scope(["New South Wales"], ["General Clerks", "Payroll Clerks"]),
  0.9,
);

function ref(item) {
  return {
    condition_id: item.condition_id,
    definition_version: item.definition_version,
    definition_hash: item.definition_hash,
  };
}

function state(item, stateVersion, lifecycle = "active") {
  return {
    condition_id: item.condition_id,
    state_version: stateVersion,
    condition_definition_ref: ref(item),
    lifecycle,
  };
}

function event(sequence, eventId, operation, recordedAt, previousStates, newStates, introducedDefinitions, identityChange) {
  return {
    sequence,
    event_id: eventId,
    operation,
    recorded_at: recordedAt,
    recorded_by: "Ren (Codex agent)",
    reason: `Synthetic ${operation} event for executable IF contract testing.`,
    previous_states: previousStates,
    new_states: newStates,
    introduced_definitions: introducedDefinitions,
    identity_change: identityChange,
    authority_effect: "none",
    action_authorised: false,
    previous_event_hash: null,
    event_hash: `sha256:${"0".repeat(64)}`,
  };
}

const events = [
  event(1, "event.worker-option.added", "added", "2026-01-01T00:00:00Z", [], [state(parentV1, 1)], [parentV1], { kind: "none" }),
  event(2, "event.worker-option.narrowed", "narrowed", "2026-02-01T00:00:00Z", [state(parentV1, 1)], [state(parentV11, 2)], [parentV11], { kind: "none" }),
  event(3, "event.worker-option.revised", "definition-revised", "2026-03-01T00:00:00Z", [state(parentV11, 2)], [state(parentV2, 3)], [parentV2], { kind: "none" }),
  event(4, "event.worker-option.split", "split", "2026-04-01T00:00:00Z", [state(parentV2, 3)], [
    state(parentV2, 4, "superseded"), state(general, 1), state(payroll, 1),
  ], [general, payroll], {
    kind: "split",
    from_condition_ids: [parentV2.condition_id],
    to_condition_ids: [general.condition_id, payroll.condition_id],
  }),
  event(5, "event.worker-option.merge", "merge", "2026-05-01T00:00:00Z", [state(general, 1), state(payroll, 1)], [
    state(general, 2, "superseded"), state(payroll, 2, "superseded"), state(merged, 1),
  ], [merged], {
    kind: "merge",
    from_condition_ids: [general.condition_id, payroll.condition_id],
    to_condition_ids: [merged.condition_id],
  }),
];
let previousEventHash = null;
for (const item of events) {
  item.previous_event_hash = previousEventHash;
  item.event_hash = computeEventHash(item);
  previousEventHash = item.event_hash;
}

function observation(observationId, predicateId, signalId, start, end, recordedAt, value, unit) {
  const item = {
    observation_id: observationId,
    classification: "synthetic-observation",
    condition_definition_ref: ref(merged),
    predicate_id: predicateId,
    signal_ref: signalRefs[signalId],
    scope: structuredClone(merged.scope),
    period: { start, end },
    recorded_at: recordedAt,
    value,
    unit,
    source_id: "source.synthetic-employer-worker-panel",
    source_artifact_hash: `sha256:${"1".repeat(64)}`,
    source_independence: "not-verified",
    uncertainty: {
      status: "not-quantified",
      reason: "Invented test data has no real-world sampling or measurement uncertainty.",
    },
    coverage: {
      eligible_units: 100,
      observed_units: 100,
      missing_units: 0,
      unit: "synthetic affected workers",
    },
    authority_effect: "none",
    action_authorised: false,
    observation_hash: `sha256:${"0".repeat(64)}`,
  };
  item.observation_hash = computeObservationHash(item);
  return item;
}

const withdrawnJune = observation(
  "observation.option-coverage.june.withdrawn", "option-coverage", "signal.option.coverage",
  "2026-06-01T00:00:00Z", "2026-06-30T00:00:00Z", "2026-07-01T00:00:00Z", 0.91, "ratio",
);
const expiredJune = observation(
  "observation.human-review.june.expired", "human-review", "signal.human-review.available",
  "2026-06-01T00:00:00Z", "2026-06-30T00:00:00Z", "2026-07-01T00:00:00Z", true, "boolean",
);
const originalJuly = observation(
  "observation.option-coverage.july.original", "option-coverage", "signal.option.coverage",
  "2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", 0.91, "ratio",
);
const correctedJuly = observation(
  "observation.option-coverage.july", "option-coverage", "signal.option.coverage",
  "2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z", "2026-08-03T00:00:00Z", 0.94, "ratio",
);
const humanJuly = observation(
  "observation.human-review.july", "human-review", "signal.human-review.available",
  "2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z", "2026-08-01T00:00:00Z", true, "boolean",
);
const optionAugust = observation(
  "observation.option-coverage.august", "option-coverage", "signal.option.coverage",
  "2026-08-01T00:00:00Z", "2026-08-31T00:00:00Z", "2026-09-01T00:00:00Z", 0.95, "ratio",
);
const humanAugust = observation(
  "observation.human-review.august", "human-review", "signal.human-review.available",
  "2026-08-01T00:00:00Z", "2026-08-31T00:00:00Z", "2026-09-01T00:00:00Z", true, "boolean",
);
const observations = [
  withdrawnJune,
  expiredJune,
  originalJuly,
  correctedJuly,
  humanJuly,
  optionAugust,
  humanAugust,
];

function evidenceRef(item) {
  return { observation_id: item.observation_id, observation_hash: item.observation_hash };
}

function evidenceState(item, stateVersion, lifecycle = "active") {
  return {
    observation_ref: evidenceRef(item),
    state_version: stateVersion,
    lifecycle,
  };
}

function evidenceEvent(sequence, evidenceEventId, operation, recordedAt, previousStates,
  newStates, relation = { kind: "none" }) {
  return {
    sequence,
    evidence_event_id: evidenceEventId,
    operation,
    recorded_at: recordedAt,
    recorded_by: "Ren (Codex agent)",
    reason: `Synthetic ${operation} event for evidence-lifecycle testing.`,
    previous_states: previousStates,
    new_states: newStates,
    relation,
    authority_effect: "none",
    action_authorised: false,
    previous_evidence_event_hash: null,
    evidence_event_hash: `sha256:${"0".repeat(64)}`,
  };
}

const evidenceEvents = [
  evidenceEvent(1, "evidence-event.june-option.added", "evidence-added", "2026-07-02T00:00:00Z",
    [], [evidenceState(withdrawnJune, 1)]),
  evidenceEvent(2, "evidence-event.june-option.withdrawn", "evidence-withdrawn", "2026-07-03T00:00:00Z",
    [evidenceState(withdrawnJune, 1)], [evidenceState(withdrawnJune, 2, "withdrawn")]),
  evidenceEvent(3, "evidence-event.june-review.added", "evidence-added", "2026-07-04T00:00:00Z",
    [], [evidenceState(expiredJune, 1)]),
  evidenceEvent(4, "evidence-event.june-review.expired", "evidence-expired", "2026-07-05T00:00:00Z",
    [evidenceState(expiredJune, 1)], [evidenceState(expiredJune, 2, "expired")]),
  evidenceEvent(5, "evidence-event.july-option.added", "evidence-added", "2026-08-02T00:00:00Z",
    [], [evidenceState(originalJuly, 1)]),
  evidenceEvent(6, "evidence-event.july-option.corrected", "evidence-corrected", "2026-08-04T00:00:00Z",
    [evidenceState(originalJuly, 1)], [
      evidenceState(originalJuly, 2, "superseded"),
      evidenceState(correctedJuly, 1),
    ], {
      kind: "correction",
      from_observation_ref: evidenceRef(originalJuly),
      to_observation_ref: evidenceRef(correctedJuly),
    }),
  evidenceEvent(7, "evidence-event.july-review.added", "evidence-added", "2026-08-05T00:00:00Z",
    [], [evidenceState(humanJuly, 1)]),
  evidenceEvent(8, "evidence-event.july-review.challenged", "evidence-challenged", "2026-08-06T00:00:00Z",
    [evidenceState(humanJuly, 1)], [evidenceState(humanJuly, 2, "challenged")]),
  evidenceEvent(9, "evidence-event.july-review.resolved", "challenge-resolved", "2026-08-07T00:00:00Z",
    [evidenceState(humanJuly, 2, "challenged")], [evidenceState(humanJuly, 3)]),
  evidenceEvent(10, "evidence-event.august-option.added", "evidence-added", "2026-09-02T00:00:00Z",
    [], [evidenceState(optionAugust, 1)]),
  evidenceEvent(11, "evidence-event.august-review.added", "evidence-added", "2026-09-03T00:00:00Z",
    [], [evidenceState(humanAugust, 1)]),
];
let previousEvidenceEventHash = null;
for (const item of evidenceEvents) {
  item.previous_evidence_event_hash = previousEvidenceEventHash;
  item.evidence_event_hash = computeEvidenceEventHash(item);
  previousEvidenceEventHash = item.evidence_event_hash;
}

const kernel = {
  schema_version: "1.1.0",
  kernel_id: "kernel.worker-option.synthetic",
  classification: "research-draft",
  empirical_truth_established: false,
  authority_effect: "none",
  action_authorised: false,
  publication_approved: false,
  evaluator: FIXED_EVALUATOR_REF,
  signals,
  events,
  observations,
  evidence_events: evidenceEvents,
  current_evidence_state: [
    evidenceState(withdrawnJune, 2, "withdrawn"),
    evidenceState(expiredJune, 2, "expired"),
    evidenceState(originalJuly, 2, "superseded"),
    evidenceState(correctedJuly, 1),
    evidenceState(humanJuly, 3),
    evidenceState(optionAugust, 1),
    evidenceState(humanAugust, 1),
  ],
  current_state: [
    state(parentV2, 4, "superseded"),
    state(general, 2, "superseded"),
    state(payroll, 2, "superseded"),
    state(merged, 1),
  ],
  manifest_hash: `sha256:${"0".repeat(64)}`,
};
kernel.manifest_hash = computeManifestHash(kernel);

const args = process.argv.slice(2);
if (args.some((argument) => argument !== "--check") || args.filter((argument) => argument === "--check").length > 1) {
  throw new Error("usage: build-synthetic-fixture.mjs [--check]");
}
const bytes = `${JSON.stringify(kernel, null, 2)}\n`;

if (args.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== bytes) {
    throw new Error("checked-in synthetic executable IF fixture is not reproducible");
  }
  process.stdout.write(`Verified synthetic executable IF fixture ${outputPath}\n`);
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes);
  process.stdout.write(`Built ${outputPath}\n`);
}
