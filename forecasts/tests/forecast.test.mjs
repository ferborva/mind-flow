import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  brierScore,
  brierSkillScore,
  binaryLogLoss,
  scoreBinaryForecast,
} from "../lib/scoring.mjs";
import {
  assertForecastSemantics,
  assertIssuedForecastImmutable,
} from "../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const forecasts = resolve(here, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const schema = readJson(join(forecasts, "schema", "binary-forecast.schema.json"));
const issued = readJson(join(forecasts, "fixtures", "binary.issued.json"));
const resolved = readJson(join(forecasts, "fixtures", "binary.resolved.json"));

function withContentAddressedResolution(record = resolved) {
  return structuredClone(record);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

test("issued and resolved forecasts have a resolvable contract", () => {
  assert.equal(validate(issued), true, ajv.errorsText(validate.errors));
  assert.equal(validate(resolved), true, ajv.errorsText(validate.errors));
  assert.equal(issued.epistemic_class, "forecast");
  assert.ok(issued.target.resolution_source);
  assert.ok(issued.baseline.probability >= 0 && issued.baseline.probability <= 1);
  assert.equal(issued.baseline.kind, "mechanical");
  assert.equal(issued.naive_baseline.kind, "mechanical");
  assert.ok(issued.probability >= 0 && issued.probability <= 1);
  assert.match(resolved.resolution.evidence.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.ok(resolved.resolution.evidence.retrieved_at);
  assert.ok(Date.parse(issued.issued_at) < Date.parse(issued.resolve_after));
  assert.ok(Date.parse(issued.resolve_after) <= Date.parse(issued.resolve_by));
  assert.doesNotThrow(() => assertForecastSemantics(issued));
  assert.doesNotThrow(() => assertForecastSemantics(resolved));
});

test("schema rejects vague, unbounded or retrospectively convenient forecasts", () => {
  const vague = structuredClone(issued);
  delete vague.target.resolution_rule;
  assert.equal(validate(vague), false, "a forecast needs a resolution rule");

  const noBaseline = structuredClone(issued);
  delete noBaseline.baseline;
  assert.equal(validate(noBaseline), false, "a forecast needs a declared baseline");

  const impossibleProbability = structuredClone(issued);
  impossibleProbability.probability = 1.2;
  assert.equal(validate(impossibleProbability), false, "probability must be bounded");
  assert.throws(
    () => assertForecastSemantics(impossibleProbability),
    /forecast probability/i,
    "semantic validation must not rely on callers running the JSON schema first",
  );

  const impossibleBaseline = structuredClone(issued);
  impossibleBaseline.baseline.probability = -0.1;
  assert.throws(() => assertForecastSemantics(impossibleBaseline), /baseline probability/i);

  const unscoped = structuredClone(issued);
  delete unscoped.target.scope.cohorts;
  assert.equal(validate(unscoped), false, "cohort scope must be explicit");

  const reversedWindow = structuredClone(issued);
  reversedWindow.resolve_after = "2026-01-01T00:00:00Z";
  assert.throws(() => assertForecastSemantics(reversedWindow), /chronology/);

  const resolvedTooEarly = structuredClone(resolved);
  resolvedTooEarly.resolution.resolved_at = "2026-10-01T00:00:00Z";
  assert.throws(() => assertForecastSemantics(resolvedTooEarly), /resolution window/);
});

test("resolution evidence is content-addressed and schema-closed", () => {
  const addressed = withContentAddressedResolution();
  assert.equal(validate(addressed), true, ajv.errorsText(validate.errors));

  for (const field of ["source", "published_at", "retrieved_at", "vintage", "checksum"]) {
    const incomplete = structuredClone(addressed);
    delete incomplete.resolution.evidence[field];
    assert.equal(validate(incomplete), false, `resolution evidence requires ${field}`);
  }

  const unpinned = structuredClone(addressed);
  unpinned.resolution.evidence.checksum = "sha256:unverified";
  assert.equal(validate(unpinned), false, "resolution evidence requires a SHA-256 content address");

  const leakedField = structuredClone(addressed);
  leakedField.resolution.evidence.internal_notes = "not registry evidence";
  assert.equal(validate(leakedField), false, "resolution evidence rejects unknown fields");
});

test("issue-time data vintages cannot look ahead and timestamps stay exact", () => {
  const lookAhead = structuredClone(issued);
  lookAhead.data_vintages[0].retrieved_at = "2026-09-08T00:00:01Z";
  assert.throws(() => assertForecastSemantics(lookAhead), /data vintage.*issued_at/i);

  const invalidCalendarDate = structuredClone(issued);
  invalidCalendarDate.data_vintages[0].retrieved_at = "2026-02-30T00:00:00Z";
  assert.throws(() => assertForecastSemantics(invalidCalendarDate), /RFC 3339.*calendar/i);

  const missingTimezone = structuredClone(issued);
  missingTimezone.issued_at = "2026-09-08T00:00:00";
  missingTimezone.history[0].at = missingTimezone.issued_at;
  assert.throws(() => assertForecastSemantics(missingTimezone), /RFC 3339.*calendar/i);

  const equivalentOffset = structuredClone(issued);
  equivalentOffset.issued_at = "2026-09-08T10:00:00+10:00";
  equivalentOffset.history[0].at = equivalentOffset.issued_at;
  assert.doesNotThrow(() => assertForecastSemantics(equivalentOffset));
});

test("history starts at issue, is chronological, and matches lifecycle status", () => {
  const wrongFirstEvent = structuredClone(issued);
  wrongFirstEvent.history[0].event = "resolved";
  assert.throws(() => assertForecastSemantics(wrongFirstEvent), /history.*begin.*issued/i);

  const wrongIssueTime = structuredClone(issued);
  wrongIssueTime.history[0].at = "2026-09-08T00:00:01Z";
  assert.throws(() => assertForecastSemantics(wrongIssueTime), /history.*issued_at/i);

  const simultaneousTransition = withContentAddressedResolution();
  simultaneousTransition.history[1].at = simultaneousTransition.history[0].at;
  assert.throws(() => assertForecastSemantics(simultaneousTransition), /history.*chronological/i);

  const mismatchedTransitionTime = withContentAddressedResolution();
  mismatchedTransitionTime.history[1].at = "2027-08-14T00:00:00Z";
  assert.throws(() => assertForecastSemantics(mismatchedTransitionTime), /history.*resolved_at/i);

  const transitionAfterResolution = withContentAddressedResolution();
  transitionAfterResolution.history.push({
    at: "2027-08-16T00:00:00Z",
    event: "voided",
    actor: "forecast test fixture",
  });
  assert.throws(() => assertForecastSemantics(transitionAfterResolution), /history.*status/i);

  const contradictoryStatus = withContentAddressedResolution();
  contradictoryStatus.status = "issued";
  assert.throws(() => assertForecastSemantics(contradictoryStatus), /status.*resolution/i);
});

test("resolution stays inside its window and cannot rely on future evidence", () => {
  const tooLate = withContentAddressedResolution();
  tooLate.resolution.resolved_at = "2027-10-01T00:00:01Z";
  tooLate.history[1].at = tooLate.resolution.resolved_at;
  assert.throws(() => assertForecastSemantics(tooLate), /resolve_by/i);

  const futureEvidence = withContentAddressedResolution();
  futureEvidence.resolution.evidence.retrieved_at = "2027-08-15T00:00:01Z";
  assert.throws(() => assertForecastSemantics(futureEvidence), /evidence.*resolved_at/i);

  const impossibleEvidenceDate = withContentAddressedResolution();
  impossibleEvidenceDate.resolution.evidence.retrieved_at = "2027-02-30T00:00:00Z";
  assert.throws(() => assertForecastSemantics(impossibleEvidenceDate), /RFC 3339.*calendar/i);

  const invalidChecksum = withContentAddressedResolution();
  invalidChecksum.resolution.evidence.checksum = "sha256:unverified";
  assert.throws(() => assertForecastSemantics(invalidChecksum), /evidence.*checksum/i);

  const boundaryResolution = withContentAddressedResolution();
  boundaryResolution.resolution.resolved_at = boundaryResolution.resolve_by;
  boundaryResolution.resolution.evidence.retrieved_at = boundaryResolution.resolve_by;
  boundaryResolution.history[1].at = boundaryResolution.resolve_by;
  assert.doesNotThrow(() => assertForecastSemantics(boundaryResolution));
});

test("binary scores reward honest probability and compare with the baseline", () => {
  assert.equal(brierScore(0.8, 1), 0.04);
  assert.equal(brierScore(0.8, 0), 0.64);
  assert.ok(binaryLogLoss(0.8, 1) < binaryLogLoss(0.5, 1));
  assert.equal(brierSkillScore(0.04, 0.25), 0.84);

  const score = scoreBinaryForecast(resolved);
  assert.deepEqual(score.resolution_reconstruction, {
    status: "reconstructed",
    reason: null,
    outcome: 1,
    observed_value: 20,
    resolver_id: "mind-flow.binary-threshold-json",
    resolver_version: "1.0.0",
    evidence_checksum: resolved.resolution.evidence.checksum,
    byte_integrity_verified: true,
    publisher_identity_verified: false,
    publisher_identity_verification_status: "unverified_external_review_required",
  });
  const { resolution_reconstruction: _reconstruction, ...properScores } = score;
  assert.deepEqual(properScores, {
    outcome: 1,
    brier: 0.09,
    reference_class_baseline_brier: 0.25,
    reference_class_brier_skill: 0.64,
    reference_class_brier_skill_state: "finite",
    naive_baseline_brier: 0.25,
    naive_brier_skill: 0.64,
    naive_brier_skill_state: "finite",
    log_loss: -Math.log(0.7),
    reference_class_baseline_log_loss: -Math.log(0.5),
    naive_baseline_log_loss: -Math.log(0.5),
  });
});

test("issued forecast substance is immutable while resolution may be appended", () => {
  assert.doesNotThrow(() => assertIssuedForecastImmutable(issued, resolved));

  const rewritten = structuredClone(resolved);
  rewritten.probability = 0.9;
  assert.throws(
    () => assertIssuedForecastImmutable(issued, rewritten),
    /probability/,
  );

  const movedGoalposts = structuredClone(resolved);
  movedGoalposts.target.resolution_rule = "A different event is easier to score.";
  assert.throws(
    () => assertIssuedForecastImmutable(issued, movedGoalposts),
    /target/,
  );

  const rewrittenHistory = structuredClone(resolved);
  rewrittenHistory.history[0].note = "Rewritten after the result.";
  assert.throws(
    () => assertIssuedForecastImmutable(issued, rewrittenHistory),
    /history/,
  );

  const invalidTransition = structuredClone(resolved);
  invalidTransition.status = "issued";
  assert.throws(
    () => assertIssuedForecastImmutable(issued, invalidTransition),
    /status.*resolution/i,
  );

  const voided = structuredClone(issued);
  voided.status = "void";
  voided.resolution = {
    status: "void",
    outcome: null,
    voided_at: "2026-10-01T00:00:00Z",
    reason_code: "source_retired",
    reason: "Synthetic source retired before the resolution window.",
    evidence: {
      source: "https://example.org/fictional-transition-survey/retirement-notice",
      published_at: "2026-10-01T00:00:00Z",
      retrieved_at: "2026-10-01T00:00:00Z",
      vintage: "fictional-retirement-notice-v1",
      checksum: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    },
    adjudication: {
      claimed_adjudicator_id: "synthetic-independent-reviewer",
      independent_of_forecaster: true,
      decision: "accepted_void",
      verification_status: "unverified_external_review_required",
      evidence: {
        source: "https://example.org/fictional-transition-survey/void-review",
        published_at: "2026-10-01T00:00:00Z",
        retrieved_at: "2026-10-01T00:00:00Z",
        vintage: "fictional-void-review-v1",
        checksum: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
    },
  };
  voided.history.push({
    at: voided.resolution.voided_at,
    event: "voided",
    actor: "forecast test fixture",
  });
  assert.equal(validate(voided), true, ajv.errorsText(validate.errors));
  assert.doesNotThrow(() => assertForecastSemantics(voided));
  assert.doesNotThrow(() => assertIssuedForecastImmutable(issued, voided));
});

test("unresolved or void forecasts cannot be scored as outcomes", () => {
  assert.throws(() => scoreBinaryForecast(issued), /resolved forecast/);

  const voided = structuredClone(resolved);
  voided.status = "void";
  voided.resolution.outcome = null;
  assert.throws(() => scoreBinaryForecast(voided), /resolved forecast/);

  const futureEvidence = structuredClone(resolved);
  futureEvidence.resolution.evidence.retrieved_at = "2027-08-15T00:00:01Z";
  assert.throws(
    () => scoreBinaryForecast(futureEvidence),
    /evidence.*resolved_at/i,
    "the standalone scorer must not bypass registry chronology",
  );
});
