import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateClaimCeilingRegistry } from "../validate-ceilings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const claimsRoot = resolve(here, "..");
const schema = JSON.parse(readFileSync(
  resolve(claimsRoot, "schema", "claim-ceiling-registry-v1.schema.json"),
  "utf8",
));
const registry = JSON.parse(readFileSync(
  resolve(claimsRoot, "records", "major-thesis-claims.json"),
  "utf8",
));

function validate(value) {
  return validateClaimCeilingRegistry(value, { schema });
}

test("the major thesis registry states every requested evidence ceiling", () => {
  const result = validate(registry);

  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.truth_determined, false);
  assert.ok(registry.claims.length >= 8);
  for (const claim of registry.claims) {
    assert.ok(claim.estimand);
    assert.ok(claim.denominator);
    assert.ok(claim.scope.population);
    assert.ok(claim.scope.geography);
    assert.ok(claim.scope.time);
    assert.ok(claim.inference_ceiling);
    assert.ok(claim.counterevidence.length > 0);
    assert.equal(claim.registered_falsifier.status, "registered-not-tested");
  }
});

test("estimand, denominator and all scope dimensions are mandatory", () => {
  for (const path of [
    ["estimand"],
    ["denominator"],
    ["scope", "population"],
    ["scope", "geography"],
    ["scope", "time"],
    ["inference_ceiling"],
  ]) {
    const candidate = structuredClone(registry);
    let target = candidate.claims[0];
    for (const part of path.slice(0, -1)) target = target[part];
    delete target[path.at(-1)];

    const result = validate(candidate);
    assert.equal(result.schema_valid, false, path.join("."));
  }
});

test("published statistics, modelled estimates and derived results require defined measurement boundaries", () => {
  for (const path of [
    ["estimand", "status"],
    ["denominator", "status"],
    ["scope", "population", "status"],
    ["scope", "geography", "status"],
    ["scope", "time", "status"],
  ]) {
    const candidate = structuredClone(registry);
    const measuredClaim = candidate.claims.find(({ epistemic_class }) => (
      ["source-observation", "modelled-estimate", "derived-result"].includes(epistemic_class)
    ));
    let target = measuredClaim;
    for (const part of path.slice(0, -1)) target = target[part];
    target[path.at(-1)] = "unknown";

    const result = validate(candidate);
    assert.equal(result.integrity_valid, false, path.join("."));
    assert.ok(result.errors.some(({ code }) => code === "measured-claim-boundary-unknown"));
  }
});

test("withdrawn claims cannot retain a positive inference ceiling", () => {
  const candidate = structuredClone(registry);
  const withdrawn = candidate.claims.find(({ claim_verdict }) => claim_verdict === "withdraw");
  withdrawn.inference_ceiling.level = "descriptive";

  const result = validate(candidate);
  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "withdrawn-claim-positive-ceiling"));
});

test("support, limitation, counterevidence and falsifier references must resolve", () => {
  for (const mutate of [
    (claim) => claim.evidence_refs.push({ evidence_id: "evidence.missing", relation: "supports" }),
    (claim) => claim.counterevidence[0].evidence_refs.push("evidence.missing"),
    (claim) => claim.registered_falsifier.evidence_refs.push("evidence.missing"),
  ]) {
    const candidate = structuredClone(registry);
    mutate(candidate.claims[0]);

    const result = validate(candidate);
    assert.equal(result.integrity_valid, false);
    assert.ok(result.errors.some(({ code }) => code === "unresolved-evidence-reference"));
  }
});

test("a supported claim needs direct supporting evidence", () => {
  const candidate = structuredClone(registry);
  const supported = candidate.claims.find(({ support_state }) => support_state === "supported");
  supported.evidence_refs = supported.evidence_refs.filter(({ relation }) => relation !== "supports");

  const result = validate(candidate);
  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "supported-without-direct-evidence"));
});

test("claim and evidence identifiers are unique", () => {
  for (const collection of ["claims", "evidence"]) {
    const candidate = structuredClone(registry);
    candidate[collection].push(structuredClone(candidate[collection][0]));

    const result = validate(candidate);
    assert.equal(result.integrity_valid, false, collection);
    assert.ok(result.errors.some(({ code }) => code === "duplicate-id"));
  }
});

test("caller-supplied schema forks cannot relax the repository contract", () => {
  const candidate = structuredClone(registry);
  candidate.claims[0].invented_authority = "publish";
  const permissiveSchema = {};

  const result = validateClaimCeilingRegistry(candidate, { schema: permissiveSchema });
  assert.equal(result.machine_valid, false);
  assert.equal(result.schema_valid, false);
});

test("official survey and model outputs remain published statistics rather than observations", () => {
  for (const claimId of [
    "healthcare.us-uninsured-2024",
    "healthcare.us-cost-unmet-2025",
    "australia.nero-measurement",
    "australia.business-ai-use-2024-25",
  ]) {
    const claim = registry.claims.find(({ claim_id: id }) => id === claimId);
    assert.equal(claim.epistemic_class, "published-statistic", claimId);
  }
});
