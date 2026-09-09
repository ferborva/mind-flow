import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { auditSignalThreshold } from "../source-aware-audit.mjs";

function input(unit = "count", range = { minimum: 0 }, threshold = 1, operator = "gte") {
  const bytes = Buffer.from(JSON.stringify({ observations: [{ value: 0, unit }, { value: 10, unit }],
    domain: { unit, value_range: range } }));
  const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  return { signal: { signal_id: "signal.test", signal_definition_hash: "signal-hash", value_kind: "number", unit, value_range: range },
    predicate: { operator, threshold: { value: threshold, unit } }, retainedSources: new Map([[hash, bytes]]),
    observations: [0, 1].map((i) => ({ signal_definition_hash: "signal-hash", source_artifact_hash: hash, source_field: `/observations/${i}` })),
    domainProvenance: [] };
}

test("count cannot gain negative domain values by declaration", () => {
  const result = auditSignalThreshold(input("count", { minimum: -1e12, maximum: 1e12 }, 0));
  assert.ok(result.issues.some((issue) => issue.code === "DOMAIN_CONTRADICTS_INTRINSIC_UNIT"));
  assert.equal(result.intrinsic_domain_vacuity, "always_true");
});

test("nonnegative count domain is intrinsic, not inferred from the sample", () => {
  const result = auditSignalThreshold(input());
  assert.equal(result.domain_assessment, "intrinsic");
  assert.equal(result.intrinsic_domain_vacuity, "not_vacuous");
  assert.deepEqual(result.intrinsic_domain, { minimum: 0, maximum: null });
  assert.deepEqual(result.observed_envelope, { minimum: 0, maximum: 10, observations: 2 });
});

test("huge count lte threshold is a plausibility flag, not mathematical vacuity", () => {
  const result = auditSignalThreshold(input("count", { minimum: 0 }, 1e9, "lte"));
  assert.equal(result.intrinsic_domain_vacuity, "not_vacuous");
  assert.ok(result.issues.some((issue) => issue.code === "THRESHOLD_OUTSIDE_OBSERVED_ENVELOPE"));
  assert.equal(result.status, "flagged");
});

test("nonintrinsic domains need a retained hash-bound source field", () => {
  const value = input("months", { minimum: 0 }, 1);
  assert.equal(auditSignalThreshold(value).domain_assessment, "unassessed");
  const hash = [...value.retainedSources.keys()][0];
  value.domainProvenance = [{ signal_definition_hash: "signal-hash", source_artifact_hash: hash, source_field: "/domain" }];
  assert.equal(auditSignalThreshold(value).domain_assessment, "retained_source_field_bound");
  value.retainedSources.set(hash, Buffer.from("{}"));
  const result = auditSignalThreshold(value);
  assert.equal(result.domain_assessment, "unassessed");
  assert.equal(result.evidence_assessment, "unassessed");
});

test("missing observations remain unassessed and do not manufacture a domain", () => {
  const value = input("AUD", { minimum: 0 });
  value.observations = [];
  const result = auditSignalThreshold(value);
  assert.equal(result.status, "unassessed");
  assert.equal(result.observed_envelope, null);
  assert.equal(result.domain_assessment, "unassessed");
});

test("evidence fields and unit must match the retained bytes", () => {
  const value = input();
  value.observations[0].source_field = "/missing";
  value.observations[1].signal_definition_hash = "other-signal";
  assert.equal(auditSignalThreshold(value).evidence_assessment, "unassessed");
});

test("source domain disagreement is flagged rather than silently trusted", () => {
  const value = input("months", { minimum: 0 }, 1);
  const hash = [...value.retainedSources.keys()][0];
  value.domainProvenance = [{ signal_definition_hash: "signal-hash", source_artifact_hash: hash, source_field: "/domain" }];
  value.signal.value_range = { minimum: -10 };
  const result = auditSignalThreshold(value);
  assert.equal(result.domain_assessment, "unassessed");
  assert.ok(result.issues.some((issue) => issue.code === "DOMAIN_SOURCE_FIELD_MISMATCH"));
});
