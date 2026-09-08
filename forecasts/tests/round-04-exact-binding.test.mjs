import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessForecastIssueBasis,
  assertForecastSemantics,
  forecastIssueBasisHash,
  forecastScopeHash,
  renderForecastClaimCeiling,
} from "../lib/registry.mjs";
import { computeMetricContractChecksum } from "../../signals/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");

function fileSource(path) {
  const bytes = readFileSync(resolve(repositoryRoot, path));
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    path,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
}

const fixturePath = "forecasts/fixtures/round-04.worker-option.synthetic.json";
const fixture = readJson(fixturePath);
const schema = readJson("forecasts/schema/binary-forecast.schema.json");
const sources = {
  sourceKernel: fileSource("contracts/executable-if/fixtures/kernel.synthetic.json"),
  sourceSignalRegistry: fileSource("signals/fixtures/round-04.worker-option.synthetic.json"),
};
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function clone(value) {
  return structuredClone(value);
}

function resealIssueBasis(forecast) {
  forecast.issue_basis.issue_basis_hash = forecastIssueBasisHash(forecast.issue_basis);
  return forecast;
}

test("Round 4 forecast binds one exact issue-time IF basis without conflating probability", () => {
  assert.equal(validateSchema(fixture), true, ajv.errorsText(validateSchema.errors));
  assert.doesNotThrow(() => assertForecastSemantics(fixture));

  const result = assessForecastIssueBasis(fixture, sources);
  assert.equal(result.issue_basis_valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.external_bindings_verified, true);
  assert.equal(result.issue_time_computed_rule_state, "true");
  assert.equal(result.forecast_probability, 0.62);
  assert.equal(result.probability_orthogonal_to_if_state, true);
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.action_authorised, false);

  assert.equal(fixture.target.condition_id, "condition.worker-option.nsw");
  assert.equal(fixture.target.signal_id, "signal.option.coverage");
  assert.equal(fixture.target.metric_id, "metric.option.coverage");
  assert.equal(fixture.issue_basis.predicate_id, "option-coverage");
  assert.equal(
    fixture.target.resolution_source,
    sources.sourceSignalRegistry.document.sources[0].evidence_ref,
  );
  assert.equal(fixture.issue_basis.condition_scope.period.starts_at, "2026-01-01T00:00:00Z");
  assert.equal(fixture.issue_basis.condition_scope.period.ends_at, "2026-12-31T23:59:59Z");
  assert.equal(
    fixture.issue_basis.interpretation_boundaries.public_claim_ceiling,
    renderForecastClaimCeiling(fixture),
  );
});

test("hostile: a resealed condition-definition substitution fails external resolution", () => {
  const attempted = clone(fixture);
  attempted.issue_basis.condition_definition_ref.definition_hash = `sha256:${"f".repeat(64)}`;
  attempted.issue_basis.issue_evaluation_receipt.condition_definition_ref.definition_hash =
    attempted.issue_basis.condition_definition_ref.definition_hash;
  resealIssueBasis(attempted);

  const result = assessForecastIssueBasis(attempted, sources);
  assert.equal(result.issue_basis_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "CONDITION_DEFINITION_REF_MISMATCH"));
});

test("hostile: scope drift cannot hide behind a recomputed scope and basis hash", () => {
  const attempted = clone(fixture);
  attempted.issue_basis.condition_scope.cohorts = ["A silently substituted cohort"];
  attempted.target.scope.cohorts = clone(attempted.issue_basis.condition_scope.cohorts);
  attempted.target.scope_hash = attempted.issue_basis.target_scope_hash =
    forecastScopeHash(attempted.target.scope);
  resealIssueBasis(attempted);

  const result = assessForecastIssueBasis(attempted, sources);
  assert.equal(result.issue_basis_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "CONDITION_SCOPE_MISMATCH"));
});

test("hostile: a future observation window cannot escape the bound PERIOD", () => {
  const attempted = clone(fixture);
  attempted.target.observation_window_end = "2027-01-01T00:00:00Z";

  const result = assessForecastIssueBasis(attempted, sources);
  assert.equal(result.issue_basis_valid, false);
  assert.ok(result.errors.some(
    ({ code }) => code === "FORECAST_WINDOW_OUTSIDE_CONDITION_PERIOD",
  ));
});

test("hostile: a resealed replay of an earlier evidence tip fails closed", () => {
  const attempted = clone(fixture);
  const replayedEvent = sources.sourceKernel.document.evidence_events.at(-2);
  attempted.issue_basis.evidence_state_ref.event_count -= 1;
  attempted.issue_basis.evidence_state_ref.tip_event_id = replayedEvent.evidence_event_id;
  attempted.issue_basis.evidence_state_ref.tip_event_hash = replayedEvent.evidence_event_hash;
  resealIssueBasis(attempted);

  const result = assessForecastIssueBasis(attempted, sources);
  assert.equal(result.issue_basis_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "ISSUE_EVIDENCE_STATE_REPLAYED"));
});

test("hostile: certainty and IF-state conflation remain invalid after resealing", () => {
  const conflated = clone(fixture);
  conflated.issue_basis.interpretation_boundaries.current_if_state_is_forecast_probability = true;
  resealIssueBasis(conflated);
  const conflationResult = assessForecastIssueBasis(conflated, sources);
  assert.equal(conflationResult.issue_basis_valid, false);
  assert.ok(conflationResult.errors.some(({ code }) => code === "PROBABILITY_STATE_CONFLATION"));

  const certain = clone(fixture);
  certain.probability = 1;
  certain.issue_basis.interpretation_boundaries.public_claim_ceiling =
    renderForecastClaimCeiling(certain);
  resealIssueBasis(certain);
  const certaintyResult = assessForecastIssueBasis(certain, sources);
  assert.equal(certaintyResult.issue_basis_valid, false);
  assert.ok(certaintyResult.errors.some(({ code }) => code === "FALSE_CERTAINTY"));
});

test("hostile: claimed artifact digests cannot replace the retained source bytes", () => {
  const attempted = clone(fixture);
  const falseDigest = `sha256:${"a".repeat(64)}`;
  attempted.issue_basis.kernel_ref.artifact_sha256 = falseDigest;
  resealIssueBasis(attempted);
  const sourceKernel = { ...sources.sourceKernel, sha256: falseDigest };

  const result = assessForecastIssueBasis(attempted, { ...sources, sourceKernel });
  assert.equal(result.issue_basis_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "KERNEL_SOURCE_BYTES_MISMATCH"));
});

test("hostile: signal, metric, resolver and issue receipt cannot be jointly resealed", () => {
  const signalAttack = clone(fixture);
  signalAttack.issue_basis.signal_definition_ref.signal_definition_hash =
    `sha256:${"b".repeat(64)}`;
  resealIssueBasis(signalAttack);
  assert.ok(assessForecastIssueBasis(signalAttack, sources).errors.some(
    ({ code }) => code === "PREDICATE_SIGNAL_REF_MISMATCH",
  ));

  const metricAttack = clone(fixture);
  metricAttack.issue_basis.metric_contract.measure = "A substituted measure";
  metricAttack.issue_basis.metric_contract.metric_checksum =
    computeMetricContractChecksum(metricAttack.issue_basis.metric_contract);
  metricAttack.target.metric_checksum = metricAttack.issue_basis.metric_contract.metric_checksum;
  metricAttack.target.resolver.measure = metricAttack.issue_basis.metric_contract.measure;
  resealIssueBasis(metricAttack);
  assert.ok(assessForecastIssueBasis(metricAttack, sources).errors.some(
    ({ code }) => code === "SIGNAL_METRIC_BINDING_MISMATCH",
  ));

  const receiptAttack = clone(fixture);
  receiptAttack.issue_basis.issue_evaluation_receipt.computed_rule_state.state = "unknown";
  receiptAttack.issue_basis.interpretation_boundaries.public_claim_ceiling =
    renderForecastClaimCeiling(receiptAttack);
  resealIssueBasis(receiptAttack);
  assert.ok(assessForecastIssueBasis(receiptAttack, sources).errors.some(
    ({ code }) => code === "ISSUE_EVALUATION_RECEIPT_MISMATCH",
  ));

  const resolverAttack = clone(fixture);
  resolverAttack.target.resolution_source = "https://example.invalid/substituted.json";
  assert.ok(assessForecastIssueBasis(resolverAttack, sources).errors.some(
    ({ code }) => code === "RESOLUTION_SOURCE_MISMATCH",
  ));
});
