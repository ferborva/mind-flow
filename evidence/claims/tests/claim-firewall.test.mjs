import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateClaimLedger } from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const claimsRoot = resolve(here, "..");
const schema = JSON.parse(readFileSync(
  resolve(claimsRoot, "schema", "claim-ledger-v2.schema.json"),
  "utf8",
));
const policySchema = JSON.parse(readFileSync(
  resolve(claimsRoot, "schema", "claim-policy-v2.schema.json"),
  "utf8",
));
const policyBytes = readFileSync(resolve(claimsRoot, "policy-v2.json"));
const policy = JSON.parse(policyBytes.toString("utf8"));
const assessedAt = "2026-09-08T12:00:00Z";

function decodePointerPart(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function applyMutation(document, mutation) {
  const parts = mutation.path.split("/").slice(1).map(decodePointerPart);
  const key = parts.pop();
  let target = document;
  for (const part of parts) target = target[part];
  if (mutation.operation === "append") {
    target[key].push(mutation.value);
  } else {
    target[key] = mutation.value;
  }
}

function readFixture(kind, name) {
  const fixturePath = resolve(claimsRoot, "fixtures", kind, name);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  if (!fixture.$base) return fixture;

  const document = JSON.parse(readFileSync(resolve(dirname(fixturePath), fixture.$base), "utf8"));
  for (const mutation of fixture.mutations) applyMutation(document, mutation);
  return document;
}

function validate(fixture) {
  return validateClaimLedger(fixture, {
    schema,
    policy,
    policySchema,
    policyBytes,
    assessedAt,
  });
}

test("a sentence can bind multiple independently classified atomic claims", () => {
  const result = validate(readFixture("valid", "compound-sentence.json"));

  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.schema_valid, true);
  assert.equal(result.integrity_valid, true);
  assert.equal(result.truth_determined, false);
  assert.equal(result.publishability_determined, false);
});

test("even a structurally current governance disposition does not determine publishability", () => {
  const fixture = structuredClone(readFixture("valid", "compound-sentence.json"));
  fixture.claims[0].publication_disposition = "approved-by-governance-record";
  fixture.claims[0].publication_authority_refs.push("authority.publication-example");
  fixture.authorities.push({
    authority_id: "authority.publication-example",
    kind: "publication",
    issuer: "Example governance body",
    scope: "Example structural fixture only",
    valid_from: "2026-09-01T00:00:00Z",
    valid_through: "2026-12-31T23:59:59Z",
    record_uri: "authority://publication-example/001",
    checksum: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
  });

  const result = validate(fixture);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.truth_determined, false);
  assert.equal(result.publishability_determined, false);
});

test("the four claim axes cannot be collapsed into one classification field", () => {
  const result = validate(readFixture("hostile", "merged-classification.json"));

  assert.equal(result.schema_valid, false);
  assert.ok(result.errors.some(({ keyword }) => keyword === "enum"));
});

test("a supported assessment must bind direct supporting evidence", () => {
  const result = validate(readFixture("hostile", "supported-without-evidence.json"));

  assert.equal(result.schema_valid, false);
  assert.ok(result.errors.some(({ keyword }) => keyword === "minItems"));
});

test("context-only evidence cannot support a supported assessment", () => {
  const fixture = structuredClone(readFixture("valid", "compound-sentence.json"));
  fixture.claims[0].evidence_refs = fixture.claims[0].evidence_refs.map((reference) => ({
    ...reference,
    relation: "context",
  }));

  const result = validate(fixture);
  assert.equal(result.schema_valid, true);
  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "supported-without-direct-evidence"));
});

test("replacement lineage binds immutable old and new atomic claims", () => {
  const result = validate(readFixture("valid", "replacement-lineage.json"));

  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
});

test("the JSON Schema is closed at every fixture boundary", () => {
  const result = validate(readFixture("hostile", "unknown-property.json"));

  assert.equal(result.schema_valid, false);
  assert.ok(result.errors.some(({ keyword }) => keyword === "additionalProperties"));
});

test("exact UTF-8 statement hashes detect altered wording and whitespace", () => {
  const result = validate(readFixture("hostile", "tampered-statement-hash.json"));

  assert.equal(result.schema_valid, true);
  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "statement-hash-mismatch"));
});

test("counterclaim and falsifier text are hash-bound too", () => {
  for (const name of [
    "tampered-counterclaim-hash.json",
    "tampered-falsifier-hash.json",
  ]) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.integrity_valid, false, name);
    assert.ok(result.errors.some(({ code }) => code === "challenge-hash-mismatch"), name);
  }
});

test("every sentence-declared atom must exist and point back to that sentence", () => {
  const result = validate(readFixture("hostile", "collapsed-compound-claim.json"));

  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "unresolved-atomic-claim"));
});

test("evidence, review and authority references must resolve", () => {
  for (const name of [
    "unresolved-evidence-reference.json",
    "unresolved-review-reference.json",
    "unresolved-authority-reference.json",
  ]) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.integrity_valid, false, name);
    assert.ok(result.errors.some(({ code }) => code.startsWith("unresolved-")), name);
  }
});

test("a recorded publication disposition requires a current publication authority record", () => {
  for (const name of [
    "wrong-authority-kind.json",
    "expired-authority.json",
  ]) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.integrity_valid, false, name);
    assert.ok(result.errors.some(({ code }) => code.startsWith("publication-authority-")), name);
  }
});

test("expired claims fail closed unless blocked, withdrawn or superseded", () => {
  const result = validate(readFixture("hostile", "expired-review-candidate.json"));

  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "expired-claim-not-closed"));
});

test("every non-closed claim requires a current accepting review", () => {
  const acceptedFixture = structuredClone(readFixture("valid", "compound-sentence.json"));
  acceptedFixture.reviews[0].disposition = "accepted";
  assert.equal(validate(acceptedFixture).machine_valid, true);

  for (const mutate of [
    (review) => { review.disposition = "pending"; },
    (review) => { review.reviewed_at = "2026-09-09T00:00:00Z"; },
    (review) => { review.valid_through = assessedAt; },
  ]) {
    const fixture = structuredClone(readFixture("valid", "compound-sentence.json"));
    const openClaim = fixture.claims[0];
    const review = fixture.reviews.find(({ review_id: reviewId }) =>
      openClaim.review_refs.includes(reviewId));
    mutate(review);

    const result = validate(fixture);
    assert.equal(result.schema_valid, true);
    assert.equal(result.integrity_valid, false);
    assert.ok(
      result.errors.some(({ code }) => code === "non-closed-claim-without-current-acceptance"),
    );
  }
});

test("replacement lineage rejects missing claims, self-replacement and cycles", () => {
  for (const name of [
    "replacement-missing-claim.json",
    "replacement-self-loop.json",
    "replacement-cycle.json",
  ]) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.integrity_valid, false, name);
    assert.ok(result.errors.some(({ code }) => code.startsWith("replacement-")), name);
  }
});

test("replacement edges require a superseded source and review of that source", () => {
  for (const name of [
    "replacement-source-not-superseded.json",
    "replacement-review-mismatch.json",
  ]) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.integrity_valid, false, name);
    assert.ok(result.errors.some(({ code }) => code.startsWith("replacement-")), name);
  }
});

test("claim, evidence, review, authority and lineage identifiers are unique", () => {
  const result = validate(readFixture("hostile", "duplicate-identifiers.json"));

  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "duplicate-id"));
});

test("a policy checksum binds the exact policy bytes", () => {
  const result = validate(readFixture("hostile", "wrong-policy-checksum.json"));

  assert.equal(result.integrity_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "policy-hash-mismatch"));
});

test("co-mutating the policy and its ledger checksum cannot weaken fail-closed rules", () => {
  const ledger = structuredClone(readFixture("valid", "compound-sentence.json"));
  const weakenedPolicy = structuredClone(policy);
  weakenedPolicy.closed_expiry_dispositions.push("candidate-for-review");
  const weakenedBytes = Buffer.from(JSON.stringify(weakenedPolicy));
  ledger.policy_ref.checksum = `sha256:${createHash("sha256").update(weakenedBytes).digest("hex")}`;

  const result = validateClaimLedger(ledger, {
    schema,
    policy: weakenedPolicy,
    policySchema,
    policyBytes: weakenedBytes,
    assessedAt,
  });
  assert.equal(result.machine_valid, false);
  assert.ok(result.errors.some(({ code }) => code.startsWith("policy-schema-")));
});

test("a missing or invalid assessment clock fails closed with a typed error", () => {
  for (const invalidAssessedAt of [
    undefined,
    "not-an-instant",
    "2026-02-30T12:00:00Z",
  ]) {
    const result = validateClaimLedger(readFixture("valid", "compound-sentence.json"), {
      schema,
      policy,
      policySchema,
      policyBytes,
      assessedAt: invalidAssessedAt,
    });
    assert.equal(result.machine_valid, false, String(invalidAssessedAt));
    assert.equal(result.integrity_valid, false, String(invalidAssessedAt));
    assert.ok(
      result.errors.some(({ code }) => code === "ASSESSMENT_TIME_INVALID"),
      String(invalidAssessedAt),
    );
  }
});

test("all hostile fixtures are rejected", () => {
  const fixtureNames = readdirSync(resolve(claimsRoot, "fixtures", "hostile"))
    .filter((name) => name.endsWith(".json"));

  assert.ok(fixtureNames.length >= 10);
  for (const name of fixtureNames) {
    const result = validate(readFixture("hostile", name));
    assert.equal(result.machine_valid, false, `${name} unexpectedly passed`);
  }
});
