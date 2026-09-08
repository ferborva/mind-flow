import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  checksumJson,
  validateCorrectionChain,
  validateEvaluationAttempt,
} from "../semantic-validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(here, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = (name) => readJson(join(contracts, "fixtures", name));
const schema = (name) => readJson(join(contracts, "schema", name));
const clone = (value) => structuredClone(value);

const condition = fixture("condition.valid.json");
const observations = fixture("observations.valid.json");
const completedRun = fixture("evaluation-run.valid.json");
const partialAttempt = fixture("evaluation-attempt.partial.valid.json");
const failedAttempt = fixture("evaluation-attempt.failed.valid.json");
const correctedObservation = fixture("observation.earnings-restored.corrected.json");
const correction = fixture("correction-record.valid.json");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateAttemptSchema = ajv.compile(schema("evaluation-attempt.schema.json"));
const validateCorrectionSchema = ajv.compile(schema("correction-record.schema.json"));
const validateCompletedRunSchema = ajv.compile(schema("evaluation-run.schema.json"));
const validateObservationSchema = ajv.compile(schema("predicate-observation.schema.json"));

test("partial and failed attempts remain distinct from certified completed runs", () => {
  assert.equal(validateAttemptSchema(partialAttempt), true, ajv.errorsText(validateAttemptSchema.errors));
  assert.equal(validateAttemptSchema(failedAttempt), true, ajv.errorsText(validateAttemptSchema.errors));
  assert.equal(partialAttempt.attempt_status, "partial");
  assert.ok(Object.keys(partialAttempt.gate_results).length > 0);
  assert.ok(Object.keys(partialAttempt.gate_results).length < 6);
  assert.equal(failedAttempt.attempt_status, "failed");
  assert.deepEqual(failedAttempt.gate_results, {});
  assert.equal(validateCompletedRunSchema(partialAttempt), false);
  assert.equal(validateCompletedRunSchema(failedAttempt), false);

  const emptyPartial = clone(partialAttempt);
  emptyPartial.gate_results = {};
  assert.equal(validateAttemptSchema(emptyPartial), false);

  const failedWithOutput = clone(failedAttempt);
  failedWithOutput.gate_results = { watch: partialAttempt.gate_results.watch };
  assert.equal(validateAttemptSchema(failedWithOutput), false);
});

test("attempt semantics pin inputs, dates and reproducible partial outputs", () => {
  assert.deepEqual(
    validateEvaluationAttempt(condition, observations, partialAttempt),
    { valid: true, errors: [] },
  );
  assert.deepEqual(
    validateEvaluationAttempt(condition, observations, failedAttempt),
    { valid: true, errors: [] },
  );

  const wrongInput = clone(partialAttempt);
  wrongInput.predicate_results["access-falling"].observation_id = "observation.missing";
  assert.ok(validateEvaluationAttempt(condition, observations, wrongInput).errors.some(
    (error) => error.code === "ATTEMPT_OBSERVATION_REFERENCE_MISMATCH",
  ));

  const wrongGate = clone(partialAttempt);
  wrongGate.gate_results.watch.state = "false";
  assert.ok(validateEvaluationAttempt(condition, observations, wrongGate).errors.some(
    (error) => error.code === "ATTEMPT_GATE_RESULT_MISMATCH",
  ));

  const reversedDates = clone(failedAttempt);
  reversedDates.recorded_at = "2026-09-07T23:59:59Z";
  assert.ok(validateEvaluationAttempt(condition, observations, reversedDates).errors.some(
    (error) => error.code === "ATTEMPT_RECORDED_BEFORE_START",
  ));
});

function correctionArtifacts(replacement = correctedObservation) {
  const original = observations.find(
    (observation) => observation.id === "observation.earnings-restored.2026q2",
  );
  return [
    { kind: "predicate-observation", value: original },
    { kind: "predicate-observation", value: replacement },
    { kind: "evaluation-run", value: completedRun },
    { kind: "evaluation-attempt", value: failedAttempt },
  ];
}

test("a correction is a new record over checksum-pinned artifacts", () => {
  assert.equal(
    validateObservationSchema(correctedObservation),
    true,
    ajv.errorsText(validateObservationSchema.errors),
  );
  assert.equal(validateCorrectionSchema(correction), true, ajv.errorsText(validateCorrectionSchema.errors));
  assert.equal(correction.corrects.checksum, checksumJson(correctionArtifacts()[0].value));
  assert.equal(correction.replacement.checksum, checksumJson(correctedObservation));
  assert.equal(correction.invalidates[0].checksum, checksumJson(completedRun));
  assert.deepEqual(
    validateCorrectionChain(correctionArtifacts(), [correction]),
    { valid: true, errors: [] },
  );
});

test("closed-bundle correction validation rejects drift, branches, cycles and missed impact", () => {
  const drifted = clone(correction);
  drifted.corrects.checksum = `sha256:${"0".repeat(64)}`;
  assert.ok(validateCorrectionChain(correctionArtifacts(), [drifted]).errors.some(
    (error) => error.code === "CORRECTION_ARTIFACT_CHECKSUM_MISMATCH",
  ));

  const branch = clone(correction);
  branch.id = "correction.earnings-restored.branch-test";
  assert.ok(validateCorrectionChain(correctionArtifacts(), [correction, branch]).errors.some(
    (error) => error.code === "CORRECTION_BRANCH",
  ));

  const cycle = clone(correction);
  cycle.id = "correction.earnings-restored.cycle-test";
  cycle.corrects = clone(correction.replacement);
  cycle.replacement = clone(correction.corrects);
  cycle.invalidates = [];
  cycle.recorded_at = "2026-09-08T00:20:00Z";
  assert.ok(validateCorrectionChain(correctionArtifacts(), [correction, cycle]).errors.some(
    (error) => error.code === "CORRECTION_CYCLE",
  ));

  const missedImpact = clone(correction);
  missedImpact.invalidates = [];
  assert.ok(validateCorrectionChain(correctionArtifacts(), [missedImpact]).errors.some(
    (error) => error.code === "CORRECTION_DOWNSTREAM_INVALIDATION_MISSING",
  ));

  const unrelatedImpact = clone(correction);
  unrelatedImpact.invalidates.push({
    kind: "evaluation-attempt",
    id: failedAttempt.id,
    checksum: checksumJson(failedAttempt),
  });
  assert.ok(validateCorrectionChain(correctionArtifacts(), [unrelatedImpact]).errors.some(
    (error) => error.code === "CORRECTION_DOWNSTREAM_INVALIDATION_UNRELATED",
  ));

  const changedPredicate = clone(correctedObservation);
  changedPredicate.predicate_ref = "output-rising";
  const changedCorrection = clone(correction);
  changedCorrection.replacement.checksum = checksumJson(changedPredicate);
  assert.ok(validateCorrectionChain(
    correctionArtifacts(changedPredicate),
    [changedCorrection],
  ).errors.some((error) => error.code === "CORRECTION_SCOPE_MISMATCH"));
});
