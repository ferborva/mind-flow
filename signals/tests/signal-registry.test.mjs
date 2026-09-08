import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateSignalRegistry } from "../validate.mjs";

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
