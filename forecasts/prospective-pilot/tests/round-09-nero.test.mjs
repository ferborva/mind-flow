import assert from "node:assert/strict";
import test from "node:test";
import { prepareNeroCandidate } from "../round-09-nero/candidate.mts";
import { buildNeroBasis } from "../round-09-nero/basis.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/round-09-validate.mjs";
import { assessFutureIssuanceBinding as originalBinding } from "../issuance-binding/validate.mjs";
import { validateExecutableIfKernel } from "../../../contracts/executable-if/validate.mjs";
import { neroOutcomePayload } from "../round-09-nero/resolver.mts";

const clocks = { sealAt: "2026-09-10T00:10:00Z", issueOpensAt: "2026-09-10T01:00:00Z",
  issuedAt: "2026-09-10T01:01:00Z", sourceCommit: "16963f8" };

test("second candidate uses the next source cell and reconstructs its baseline", () => {
  const candidate = prepareNeroCandidate(clocks);
  assert.equal(candidate.forecast.target.condition_id, "condition.nero.5311.102.stock");
  assert.match(candidate.forecast.question, /3092.*Central Coast/);
  assert.equal(candidate.forecast.probability, 0.76);
  const result = assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.baseline_execution_reproduced, true, JSON.stringify(result.issues));
  assert.equal(result.retained_resolver_artifact_bytes_matched, true, JSON.stringify(result.issues));
  assert.equal(result.binding_complete, false);
  const basis = validateExecutableIfKernel(buildNeroBasis().kernel);
  assert.equal(basis.machine_valid, true, JSON.stringify(basis.errors));
});

test("prospective candidate refuses issue at or after observation and reversed clocks", () => {
  for (const invalid of [{ issuedAt: "2026-10-01T00:00:00Z" },
    { sealAt: "2026-09-10T01:02:00Z" }, { issuedAt: "2026-09-10T00:59:59Z" }]) {
    assert.throws(() => prepareNeroCandidate({ ...clocks, ...invalid }), /clocks/);
  }
});

test("second resolver selects only Central Coast with the fixed threshold", () => {
  const { forecast } = prepareNeroCandidate(clocks);
  const row = ["1", "NSW", "102", "Central Coast", "5311", "General Clerks", "2026-10-15", "3092"];
  assert.equal(neroOutcomePayload([row], forecast).value, 0.5);
  assert.throws(() => neroOutcomePayload([[...row.slice(0, 2), "101", "Capital Region", ...row.slice(4)]], forecast));
  assert.throws(() => neroOutcomePayload([row, row], forecast));
});

test("original adapter rejects the new cell and new adapter rejects a substituted cell", () => {
  const candidate = prepareNeroCandidate(clocks);
  assert.equal(originalBinding(candidate.input).retained_resolver_artifact_bytes_matched, false);
  candidate.input.matureForecastSources.resolverArtifacts.parameters.bytes = Buffer.from(JSON.stringify({
    ...candidate.resolverParameters, sa4_code: "101", count_baseline: 4217,
  }));
  assert.equal(assessFutureIssuanceBinding(candidate.input).retained_resolver_artifact_bytes_matched, false);
});

test("complete local binding requires a pre-issue receipt and rejects a post-observation receipt", () => {
  const pending = prepareNeroCandidate(clocks);
  const receipt = { source: "https://example.invalid/test-only-receipt", checksum: "sha256:" + "a".repeat(64),
    registered_content_sha256: pending.protocol.registration.protocol_content_sha256,
    registered_at: "2026-09-10T00:11:00Z", checksum_scope: "external-receipt-bytes-not-this-protocol-record",
    verification_status: "unverified_external_review_required" };
  const candidate = prepareNeroCandidate({ ...clocks, externalReceipt: receipt });
  const result = assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.binding_complete, true, JSON.stringify(result.issues));
  assert.equal(result.independent_anchor_verified, false);
  const late = prepareNeroCandidate({ ...clocks, externalReceipt: { ...receipt, registered_at: "2026-10-01T00:00:00Z" } });
  assert.equal(assessFutureIssuanceBinding(late.input).binding_complete, false);
});
