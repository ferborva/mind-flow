import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { computeMetricContractChecksum, validateSignalRegistry } from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const schema = JSON.parse(readFileSync(resolve(root, "schema", "signal-registry.schema.json"), "utf8"));
const fixture = JSON.parse(readFileSync(resolve(root, "fixtures", "australia-feasibility.json"), "utf8"));

function validate(document) {
  return validateSignalRegistry(document, { schema });
}

function hasCode(result, code) {
  return result.errors.some((item) => item.code === code);
}

const hash = (character) => `sha256:${character.repeat(64)}`;

function locallyBoundRegistry() {
  const document = structuredClone(fixture);
  const conditionId = document.condition_bindings[0].condition_id;
  const conditionDefinitionRef = {
    condition_id: conditionId,
    definition_version: "1.0.0",
    definition_hash: hash("a"),
  };
  document.schema_version = "1.1.0";
  document.condition_bindings[0] = {
    condition_id: conditionId,
    ledger_ref: document.condition_bindings[0].ledger_ref,
    binding_status: "locally-verified-complete",
    ledger_manifest_hash: hash("b"),
    ledger_tip_event_id: "event.worker-option.merge",
    ledger_tip_hash: hash("c"),
    condition_definition_ref: conditionDefinitionRef,
    condition_source_event_ref: {
      sequence: 5,
      event_id: "event.worker-option.merge",
      event_hash: hash("c"),
    },
    evidence_state_ref: {
      kernel_id: "kernel.worker-option.synthetic",
      kernel_manifest_hash: hash("d"),
      evidence_event_count: 2,
      evidence_tip_event_id: "evidence-event.worker-option.latest",
      evidence_tip_event_hash: hash("e"),
      evidence_state_hash: hash("f"),
    },
    next_binding: null,
  };
  for (const [index, signal] of document.signals.entries()) {
    signal.metric_contract = {
      metric_id: `metric.${signal.signal_id.slice("signal.".length)}`,
      measure: signal.estimand.quantity,
      unit: signal.estimand.unit,
      denominator: signal.estimand.denominator,
      population: signal.estimand.population,
      geography: signal.estimand.geography,
      period: signal.estimand.period,
      aggregation: signal.estimand.aggregation_level,
      collection_process_ids: signal.source_refs.map((sourceId) =>
        document.sources.find(({ source_id: id }) => id === sourceId).collection_process_id),
      source_refs: structuredClone(signal.source_refs),
      evaluation_rule: "Apply the registered measurement rule without post-hoc exclusions.",
      metric_checksum: "",
    };
    signal.metric_contract.metric_checksum = computeMetricContractChecksum(signal.metric_contract);
    signal.executable_binding = {
      kind: "executable-predicate",
      signal_definition_ref: {
        signal_id: signal.signal_id,
        definition_version: "1.0.0",
        signal_definition_hash: hash(String(index + 1)),
      },
      condition_definition_ref: conditionDefinitionRef,
      predicate_ids: [`predicate.${index + 1}`],
    };
  }
  return document;
}

test("v1.1 can bind exact local condition, evidence and executable signal identities", () => {
  const document = locallyBoundRegistry();
  const result = validate(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(document.condition_bindings[0].binding_status, "locally-verified-complete");
  assert.ok(document.signals.every(({ executable_binding: binding, signal_id: signalId }) =>
    binding.signal_definition_ref.signal_id === signalId));
});

test("condition producer and complete history tip are independent anchors", () => {
  const document = locallyBoundRegistry();
  document.condition_bindings[0].condition_source_event_ref = {
    sequence: 3,
    event_id: "event.worker-option.produced",
    event_hash: hash("9"),
  };

  const result = validate(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
});

test("v1.1 owns a self-checking metric contract for every signal", () => {
  const document = locallyBoundRegistry();
  const result = validate(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  for (const signal of document.signals) {
    assert.equal(
      signal.metric_contract.metric_checksum,
      computeMetricContractChecksum(signal.metric_contract),
    );
  }
});

test("hostile: a metric cannot drift from either its checksum or signal estimand", () => {
  const unsealed = locallyBoundRegistry();
  unsealed.signals[0].metric_contract.denominator = "selected favourable cases only";
  assert.ok(hasCode(validate(unsealed), "METRIC_CONTRACT_HASH_MISMATCH"));

  const resealed = locallyBoundRegistry();
  resealed.signals[0].metric_contract.measure = "a different quantity";
  resealed.signals[0].metric_contract.metric_checksum =
    computeMetricContractChecksum(resealed.signals[0].metric_contract);
  assert.ok(hasCode(validate(resealed), "METRIC_ESTIMAND_MISMATCH"));
});

test("the Round 4 executable signal registry is valid and reproducible", () => {
  const document = JSON.parse(readFileSync(
    resolve(root, "fixtures", "round-04.worker-option.synthetic.json"),
    "utf8",
  ));
  const result = validate(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(
    document.signals.filter(({ executable_binding: binding }) => binding)
      .map(({ executable_binding: binding }) => binding.signal_definition_ref.signal_id),
    ["signal.option.coverage", "signal.human-review.available"],
  );
  assert.deepEqual(
    document.signals.filter(({ supplemental_binding: binding }) => binding)
      .map(({ supplemental_binding: binding }) => [binding.purpose, binding.truth_expression_effect]),
    [["counter", "none"], ["information-harm", "none"]],
  );
  assert.ok(document.sources.every(({ artifact_binding: binding }) =>
    binding.status === "not-acquired" && binding.checksum === null));
});

test("hostile: executable bindings cannot borrow another signal or condition identity", () => {
  for (const mutate of [
    (document) => {
      document.signals[0].executable_binding.signal_definition_ref.signal_id = "signal.borrowed";
    },
    (document) => {
      document.signals[0].executable_binding.condition_definition_ref.condition_id =
        "condition.borrowed";
    },
  ]) {
    const document = locallyBoundRegistry();
    mutate(document);
    const result = validate(document);
    assert.equal(result.integrity_valid, false);
    assert.ok(hasCode(result, "EXECUTABLE_SIGNAL_BINDING_MISMATCH"));
  }
});

test("v1.1 distinguishes supplemental observations from executable predicate evidence", () => {
  const document = locallyBoundRegistry();
  const signal = structuredClone(document.signals[0]);
  signal.signal_id = "signal.supplemental-counter";
  const conditionDefinitionRef = structuredClone(
    document.condition_bindings[0].condition_definition_ref,
  );
  signal.condition_links[0].evidence_role = "counter";
  delete signal.executable_binding;
  signal.supplemental_binding = {
    kind: "supplemental-observation",
    purpose: "counter",
    condition_definition_ref: conditionDefinitionRef,
    truth_expression_effect: "none",
  };
  signal.metric_contract.metric_id = "metric.supplemental-counter";
  signal.metric_contract.metric_checksum = computeMetricContractChecksum(signal.metric_contract);
  document.signals.push(signal);

  const result = validate(document);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
});

test("hostile: supplemental evidence cannot masquerade as a predicate or another role", () => {
  for (const mutate of [
    (signal) => { signal.supplemental_binding.truth_expression_effect = "predicate"; },
    (signal) => { signal.supplemental_binding.purpose = "information-harm"; },
  ]) {
    const document = locallyBoundRegistry();
    const signal = structuredClone(document.signals[0]);
    signal.signal_id = "signal.supplemental-counter";
    const conditionDefinitionRef = structuredClone(
      document.condition_bindings[0].condition_definition_ref,
    );
    signal.condition_links[0].evidence_role = "counter";
    delete signal.executable_binding;
    signal.supplemental_binding = {
      kind: "supplemental-observation",
      purpose: "counter",
      condition_definition_ref: conditionDefinitionRef,
      truth_expression_effect: "none",
    };
    signal.metric_contract.metric_id = "metric.supplemental-counter";
    signal.metric_contract.metric_checksum = computeMetricContractChecksum(signal.metric_contract);
    document.signals.push(signal);
    mutate(signal);

    const result = validate(document);
    assert.equal(result.integrity_valid, false);
    assert.ok(
      hasCode(result, "SUPPLEMENTAL_SIGNAL_BINDING_MISMATCH") ||
      hasCode(result, "SCHEMA_INVALID"),
    );
  }
});

test("a bounded Australian candidate is structurally valid but proves no truth, cause or authority", () => {
  const result = validate(fixture);

  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.truth_determined, false);
  assert.equal(result.causality_determined, false);
  assert.equal(result.action_authority_determined, false);
});

test("a caller-controlled schema fork cannot manufacture operational authority", () => {
  const forkedSchema = structuredClone(schema);
  forkedSchema.properties.authority = { type: "string" };
  forkedSchema.properties.operational_effect = { type: "boolean" };
  forkedSchema.$defs.signal.properties.claim_permissions.properties.operational_effect = {
    type: "boolean",
  };
  const mutated = structuredClone(fixture);
  mutated.authority = "execute";
  mutated.operational_effect = true;
  mutated.signals[0].claim_permissions.operational_effect = true;

  const result = validateSignalRegistry(mutated, { schema: forkedSchema });
  assert.equal(result.machine_valid, false, JSON.stringify(result, null, 2));
  assert.ok(hasCode(result, "AUTHORITY_BOUNDARY_INVALID"));
});

test("every material signal boundary is required and the schema is closed", () => {
  const mutated = structuredClone(fixture);
  mutated.signals[0].confidence_score = 0.99;

  const result = validate(mutated);
  assert.equal(result.schema_valid, false);
  assert.ok(result.errors.some((item) => item.keyword === "additionalProperties"));
});

test("source, signal and condition references must resolve", () => {
  for (const mutation of [
    (doc) => { doc.signals[0].source_refs = ["source.missing"]; },
    (doc) => { doc.portfolios[0].role_assignments[0].signal_ids = ["signal.missing"]; },
    (doc) => { doc.sources[0].depends_on_source_ids = ["source.missing"]; },
    (doc) => { doc.portfolios[0].condition_id = "condition.missing"; },
  ]) {
    const mutated = structuredClone(fixture);
    mutation(mutated);
    const result = validate(mutated);
    assert.equal(result.integrity_valid, false);
    assert.ok(result.errors.some((item) => item.code.startsWith("UNRESOLVED_")));
  }
});

test("a signal cannot be assigned to a role it does not declare for that condition and scope", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].role_assignments[0].role = "outcome";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "ROLE_LINK_MISMATCH"));
});

test("every portfolio role is either evidenced once or explicitly unresolved once", () => {
  for (const mutation of [
    (doc) => { doc.portfolios[0].unresolved_roles.pop(); },
    (doc) => { doc.portfolios[0].unresolved_roles.push(structuredClone(doc.portfolios[0].unresolved_roles[0])); },
    (doc) => { doc.portfolios[0].role_assignments.push({ role: "leading", signal_ids: ["signal.nero-employment"] }); },
  ]) {
    const mutated = structuredClone(fixture);
    mutation(mutated);
    const result = validate(mutated);
    assert.equal(result.integrity_valid, false);
    assert.ok(hasCode(result, "ROLE_COVERAGE_INVALID"));
  }
});

test("dependent source families cannot masquerade as independent confirmation", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].unresolved_roles = mutated.portfolios[0].unresolved_roles
    .filter(({ role }) => role !== "confirming");
  mutated.portfolios[0].role_assignments.push({
    role: "confirming",
    signal_ids: ["signal.lfs-coherence"],
  });
  mutated.signals.find(({ signal_id }) => signal_id === "signal.lfs-coherence")
    .condition_links[0].evidence_role = "confirming";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "CONFIRMATION_NOT_INDEPENDENT"));
});

test("renaming an unacquired source cannot manufacture independent confirmation", () => {
  const mutated = structuredClone(fixture);
  const copiedSource = structuredClone(mutated.sources[0]);
  copiedSource.source_id = "source.lfs-copy";
  copiedSource.collection_process_id = "process.claimed-independent-copy";
  mutated.sources.push(copiedSource);

  const copiedSignal = structuredClone(mutated.signals[1]);
  copiedSignal.signal_id = "signal.lfs-copy";
  copiedSignal.source_refs = ["source.lfs-copy"];
  copiedSignal.condition_links[0].evidence_role = "confirming";
  mutated.signals.push(copiedSignal);
  mutated.portfolios[0].unresolved_roles = mutated.portfolios[0].unresolved_roles
    .filter(({ role }) => role !== "confirming");
  mutated.portfolios[0].role_assignments.push({
    role: "confirming",
    signal_ids: ["signal.lfs-copy"],
  });

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "CONFIRMATION_SOURCE_UNVERIFIED"));
  assert.ok(hasCode(result, "CONFIRMATION_NOT_INDEPENDENT"));
});

test("scope incompatibility cannot be hidden behind agreement", () => {
  const mutated = structuredClone(fixture);
  mutated.signals[0].condition_links[0].scope.population = "All Australian workers";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "CONDITION_SCOPE_MISMATCH"));
});

test("a condition link cannot claim a narrower scope than the signal estimand", () => {
  const mutated = structuredClone(fixture);
  mutated.signals[0].estimand.population = "All employed Australians";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "ESTIMAND_SCOPE_MISMATCH"));
});

test("construct, period, denominator, unit and aggregation cannot drift at a condition edge", () => {
  for (const mutate of [
    (signal) => { signal.construct.construct_id = "construct.unrelated"; },
    (signal) => { signal.estimand.period = "1900"; },
    (signal) => { signal.estimand.denominator = "all businesses"; },
    (signal) => { signal.estimand.unit = "percentage points"; },
    (signal) => { signal.estimand.aggregation_level = "national business"; },
  ]) {
    const mutated = structuredClone(fixture);
    mutate(mutated.signals[0]);
    const result = validate(mutated);
    assert.equal(result.integrity_valid, false);
    assert.ok(hasCode(result, "ESTIMAND_SCOPE_MISMATCH"));
  }
});

test("decision-linked leading signals must arrive before the minimum useful lead time", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].decision_context.use = "shadow-decision";
  mutated.portfolios[0].decision_context.owner_ref = "owner://external-human-reviewer";
  mutated.portfolios[0].decision_context.minimum_useful_lead_days = 45;
  mutated.signals[0].timing.prospective_decision_lead_min_days = 30;

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "INSUFFICIENT_DECISION_LEAD"));
});

test("candidate signals cannot assert causality, individual inference or operational effect", () => {
  for (const field of ["causal_claim", "individual_inference", "operational_effect"]) {
    const mutated = structuredClone(fixture);
    mutated.signals[0].claim_permissions[field] = true;
    const result = validate(mutated);
    assert.equal(result.integrity_valid, false);
    assert.ok(hasCode(result, "CLAIM_PERMISSION_FORBIDDEN"));
  }
});

test("the public claim ceiling is deterministically rendered from typed signal boundaries", () => {
  const mutated = structuredClone(fixture);
  mutated.signals[0].public_claim_ceiling = "AI caused Alice to lose her job. Trigger payments now.";
  mutated.portfolios[0].public_disposition = "public-with-unknowns";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "PUBLIC_CLAIM_CEILING_MISMATCH"));
});

test("a public disposition cannot outrun source acquisition or condition-history verification", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].public_disposition = "public-with-unknowns";

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "PUBLIC_DISPOSITION_UNVERIFIED"));
});

test("retired or suspended signals cannot fill an active portfolio role", () => {
  for (const status of ["retired", "suspended"]) {
    const mutated = structuredClone(fixture);
    mutated.signals[0].status = status;
    const result = validate(mutated);
    assert.equal(result.integrity_valid, false);
    assert.ok(hasCode(result, "SIGNAL_STATUS_INELIGIBLE"));
  }
});

test("one signal cannot be laundered across multiple portfolio roles", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].unresolved_roles = mutated.portfolios[0].unresolved_roles
    .filter(({ role }) => role !== "confirming");
  mutated.portfolios[0].role_assignments.push({
    role: "confirming",
    signal_ids: ["signal.nero-employment"],
  });
  mutated.signals[0].condition_links.push({
    ...structuredClone(mutated.signals[0].condition_links[0]),
    evidence_role: "confirming",
  });

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "SIGNAL_ROLE_REUSE"));
});

test("decision use cannot outrun an externally unverified condition ledger", () => {
  const mutated = structuredClone(fixture);
  mutated.portfolios[0].decision_context = {
    use: "public-decision",
    owner_ref: "owner://external-human-reviewer",
    minimum_useful_lead_days: 20,
  };
  mutated.signals[0].timing.prospective_decision_lead_min_days = 30;

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "CONDITION_LEDGER_UNVERIFIED"));
});

test("source lineage cycles fail closed", () => {
  const mutated = structuredClone(fixture);
  mutated.sources[0].depends_on_source_ids = ["source.lfs"];

  const result = validate(mutated);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "SOURCE_LINEAGE_CYCLE"));
});

test("the public contract forbids a single transition score and says what unknown means", () => {
  const readme = readFileSync(resolve(root, "README.md"), "utf8");

  assert.match(readme, /never compress(?:es|ed)?[\s\S]*?single\s+score/i);
  assert.match(readme, /unknown[\s\S]*?not[\s\S]*?safe/i);
  assert.match(readme, /modelled estimate[\s\S]*?not[\s\S]*?observation/i);
  assert.match(readme, /agent proposal[\s\S]*?authority/i);
});
