import assert from "node:assert/strict";
import test from "node:test";
import { buildNeroBasis, boundedEmploymentIndex } from "../round-08-nero/basis.mts";
import { validateExecutableIfKernel } from "../../../contracts/executable-if/validate.mjs";
import { validateSignalRegistry } from "../../../signals/validate.mjs";
import { neroOutcomePayload } from "../round-08-nero/resolver.mts";
import { prepareNeroCandidate } from "../round-08-nero/candidate.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/validate.mjs";

test("bounded employment index preserves the exact count threshold without posing as a population share", () => {
  for (const value of [0, 4216, 4217, 4218, 100000]) {
    assert.equal(boundedEmploymentIndex(value) >= 0.5, value >= 4217);
    assert.ok(boundedEmploymentIndex(value) >= 0 && boundedEmploymentIndex(value) < 1);
  }
  assert.throws(() => boundedEmploymentIndex(-1));
  assert.throws(() => boundedEmploymentIndex(Infinity));
});

test("the prospective NERO candidate reconstructs both baselines and remains blocked without a provider receipt", () => {
  const candidate = prepareNeroCandidate({ sealAt: "2026-09-09T11:00:00Z",
    issueOpensAt: "2026-09-10T00:00:00Z", issuedAt: "2026-09-10T01:00:00Z", sourceCommit: "a206254" });
  const result = assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.baseline_execution_reproduced, true, JSON.stringify(result.issues));
  assert.equal(result.retained_resolver_artifact_bytes_matched, true, JSON.stringify(result.issues));
  assert.equal(result.binding_complete, false);
  assert.equal(candidate.forecast.probability, candidate.forecast.baseline.probability);
  assert.equal(candidate.forecast.naive_baseline.probability, 0.5);
  assert.ok((Date.parse(candidate.forecast.resolve_by) - Date.parse(candidate.forecast.issued_at)) / 86400000 <= 90);
  assert.equal(candidate.protocol.forecast_issuance.status, "not-issued");
  assert.doesNotMatch(JSON.stringify(candidate.forecast), /synthetic|example\.invalid|worker-option/);
});

test("native resolver dependencies and fixed source parameters cannot drift after registration", () => {
  for (const mode of ["missing-dependency", "changed-dependency"]) {
    const candidate = prepareNeroCandidate({ sealAt: "2026-09-09T11:00:00Z",
      issueOpensAt: "2026-09-10T00:00:00Z", issuedAt: "2026-09-10T01:00:00Z", sourceCommit: "a206254" });
    const artifacts = candidate.input.matureForecastSources.resolverArtifacts;
    const path = Object.keys(artifacts.dependencies)[0];
    if (mode === "missing-dependency") delete artifacts.dependencies[path];
    else artifacts.dependencies[path].bytes = Buffer.from("changed dependency");
    const result = assessFutureIssuanceBinding(candidate.input);
    assert.equal(result.retained_resolver_artifact_bytes_matched, false);
    assert.ok(result.issues.some((entry) => entry.code === "RESOLVER_ARTIFACT_DEPENDENCY_MISMATCH"));
  }
});

test("a test-only later receipt completes the candidate binding without claiming issuance authority", () => {
  const clocks = { sealAt: "2026-09-09T11:00:00Z", issueOpensAt: "2026-09-10T00:00:00Z",
    issuedAt: "2026-09-10T01:00:00Z", sourceCommit: "a206254" };
  const pending = prepareNeroCandidate(clocks);
  const candidate = prepareNeroCandidate({ ...clocks, externalReceipt: {
    source: "https://example.invalid/test-only-receipt", checksum: `sha256:${"a".repeat(64)}`,
    registered_content_sha256: pending.protocol.registration.protocol_content_sha256,
    registered_at: "2026-09-09T11:01:00Z", checksum_scope: "external-receipt-bytes-not-this-protocol-record",
    verification_status: "unverified_external_review_required",
  } });
  const result = assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.binding_complete, true, JSON.stringify(result.issues));
  assert.equal(result.issuance_authorised, false);
  assert.equal(result.independent_anchor_verified, false);
  assert.equal(candidate.protocol.registration.protocol_content_sha256, pending.protocol.registration.protocol_content_sha256);
});

test("native NERO resolution selects one exact October cell and rejects unavailable or conflicting counts", () => {
  const forecast = { target: { observation_window_start: "2026-10-01T00:00:00Z",
    signal_id: "signal.nero.5311.101.bounded-stock", condition_id: "condition.nero.5311.101.stock",
    observation_window_end: "2026-10-31T23:59:59Z", resolver: { operator: "gte", threshold: 0.5,
      measure: "bounded stock", observation_unit: "bounded employment index" } } };
  const row = ["1", "NSW", "101", "Capital Region", "5311", "General Clerks", "2026-10-15", "4217"];
  assert.equal(neroOutcomePayload([row], forecast).value, 0.5);
  for (const rows of [[], [row, row], [[...row.slice(0, -1), ""]], [[...row.slice(0, -1), "NaN"]],
    [[...row.slice(0, 6), "2026-09-15", "4217"]]]) {
    assert.throws(() => neroOutcomePayload(rows, forecast));
  }
});

test("the NERO research basis validates under existing kernel and registry contracts", () => {
  const { kernel, registry } = buildNeroBasis();
  const result = validateExecutableIfKernel(kernel);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors));
  const signalResult = validateSignalRegistry(registry);
  assert.equal(signalResult.machine_valid, true, JSON.stringify(signalResult.errors));
  assert.equal(kernel.observations[0].value, 0.5);
  assert.equal(kernel.observations[0].classification, "measured-observation");
  assert.equal(kernel.events[0].introduced_definitions[0].condition_category, "availability");
  assert.doesNotMatch(JSON.stringify({ kernel, registry }), /synthetic|example\.invalid|worker-option/i);
});
