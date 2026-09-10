import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { prepareNeroCandidate as prepareOriginalCandidate } from "../round-09-nero/candidate.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/round-09-corrected-validate.mjs";
import { prepareNeroCandidate } from "../round-09-nero-corrected/candidate.mts";
import { NERO_TARGET, assertNeroTargetConsistency } from "../round-09-nero-corrected/target-policy.mjs";
import { neroOutcomePayload } from "../round-09-nero/resolver.mts";

const original = (file) => JSON.parse(readFileSync(new URL(`../round-09-nero/${file}`, import.meta.url)));
const existing = () => prepareOriginalCandidate({ ...original("registration-clocks.json"),
  issuedAt: original("issued.json").issued_at, externalReceipt: original("registration-receipt.json") });

test("current target admission rejects the originally issued prose/native-cell contradiction", () => {
  const result = assessFutureIssuanceBinding(existing().input);
  assert.equal(result.binding_complete, false,
    "SA4 101 in the resolution rule must not pass a native SA4 102 resolver binding");
  assert.ok(result.issues.some((issue) => issue.code === "NERO_NATIVE_TARGET_PROSE_CONFLICT"));
});

const clocks = { sealAt: "2026-09-10T01:00:00Z", issueOpensAt: "2026-09-10T01:10:00Z",
  issuedAt: "2026-09-10T01:11:00Z", sourceCommit: "500e74d" };
const prepared = () => {
  const pending = prepareNeroCandidate(clocks);
  return prepareNeroCandidate({ ...clocks, externalReceipt: {
    source: "https://example.invalid/test-only-receipt", checksum: "sha256:" + "a".repeat(64),
    registered_content_sha256: pending.protocol.registration.protocol_content_sha256,
    registered_at: "2026-09-10T01:01:00Z", checksum_scope: "external-receipt-bytes-not-this-protocol-record",
    verification_status: "unverified_external_review_required" } });
};

test("corrected prose, native resolver and both baselines name the same retained target", () => {
  const candidate = prepared();
  const result = assessFutureIssuanceBinding(candidate.input);
  assert.equal(result.binding_complete, true, JSON.stringify(result.issues));
  assert.equal(candidate.forecast.probability, 0.76);
  assert.match(candidate.forecast.id, /correction-1/);
  assert.notEqual(candidate.protocol.campaign.campaign_id, original("preregistration.json").campaign.campaign_id);
  assert.match(candidate.forecast.target.resolution_rule, /sa4_code 102 and date 2026-10-15/);
  assert.doesNotMatch(candidate.forecast.target.resolution_rule, /\b101\b/);
  const row = ["1", NERO_TARGET.state_name, "102", "Central Coast", "5311", "General Clerks", "2026-10-15", "3092"];
  assert.equal(neroOutcomePayload([row], candidate.forecast).value, 0.5);
  assert.throws(() => neroOutcomePayload([[...row.slice(0, 2), "101", "Capital Region", ...row.slice(4)]], candidate.forecast));
});

test("equal wrong prose cannot launder wrong geography, occupation, date or threshold", () => {
  for (const [from, to] of [["sa4_code 102", "sa4_code 101"], ["anzsco4_code 5311", "anzsco4_code 5511"],
    ["2026-10-15", "2026-11-15"], ["x+3092", "x+4217"]]) {
    const c = prepared();
    c.forecast.target.resolution_rule = c.forecast.target.resolution_rule.replace(from, to);
    c.protocol.target.resolution_rule = c.forecast.target.resolution_rule;
    assert.throws(() => assertNeroTargetConsistency(c.forecast, c.protocol, c.resolverParameters,
      [c.parameters, c.parameters]), /native target\/prose conflict/);
  }
});

test("native and baseline parameters cannot drift behind unchanged prose", () => {
  const c = prepared();
  for (const changed of [{ ...c.resolverParameters, sa4_code: "101" }, { ...c.resolverParameters, count_baseline: 4217 }]) {
    assert.throws(() => assertNeroTargetConsistency(c.forecast, c.protocol, changed, [c.parameters, c.parameters]));
  }
  assert.throws(() => assertNeroTargetConsistency(c.forecast, c.protocol, c.resolverParameters,
    [c.parameters, { ...c.parameters, sa4_code: "101" }]));
});

test("new admission requires every sealed preparation dependency and rejects changed bytes", () => {
  const c = prepared();
  const dependencies = c.input.matureForecastSources.resolverArtifacts.dependencies;
  for (const path of Object.keys(dependencies)) {
    const saved = dependencies[path];
    delete dependencies[path];
    assert.equal(assessFutureIssuanceBinding(c.input).binding_complete, false, path);
    dependencies[path] = { ...saved, bytes: Buffer.from("changed bytes") };
    assert.equal(assessFutureIssuanceBinding(c.input).binding_complete, false, path);
    dependencies[path] = saved;
  }
});

test("new preparation and receipt clocks must remain prospective", () => {
  assert.throws(() => prepareNeroCandidate({ ...clocks, sealAt: "2026-09-10T00:28:42Z" }), /clocks/);
  assert.throws(() => prepareNeroCandidate({ ...clocks, issuedAt: "2026-10-01T00:00:00Z" }), /clocks/);
  const c = prepared();
  const late = prepareNeroCandidate({ ...clocks,
    externalReceipt: { ...c.protocol.registration.external_receipt, registered_at: "2026-10-01T00:00:00Z" } });
  assert.equal(assessFutureIssuanceBinding(late.input).binding_complete, false);
});
