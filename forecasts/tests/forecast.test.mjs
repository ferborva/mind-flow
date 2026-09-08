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

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

test("issued and resolved forecasts have a resolvable contract", () => {
  assert.equal(validate(issued), true, ajv.errorsText(validate.errors));
  assert.equal(validate(resolved), true, ajv.errorsText(validate.errors));
  assert.equal(issued.epistemic_class, "forecast");
  assert.ok(issued.target.resolution_source);
  assert.ok(issued.baseline.probability >= 0 && issued.baseline.probability <= 1);
  assert.ok(issued.probability >= 0 && issued.probability <= 1);
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

test("binary scores reward honest probability and compare with the baseline", () => {
  assert.equal(brierScore(0.8, 1), 0.04);
  assert.equal(brierScore(0.8, 0), 0.64);
  assert.ok(binaryLogLoss(0.8, 1) < binaryLogLoss(0.5, 1));
  assert.equal(brierSkillScore(0.04, 0.25), 0.84);

  const score = scoreBinaryForecast(resolved);
  assert.deepEqual(score, {
    outcome: 1,
    brier: 0.09,
    baseline_brier: 0.25,
    brier_skill: 0.64,
    log_loss: -Math.log(0.7),
    baseline_log_loss: -Math.log(0.5),
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
});

test("unresolved or void forecasts cannot be scored as outcomes", () => {
  assert.throws(() => scoreBinaryForecast(issued), /resolved forecast/);

  const voided = structuredClone(resolved);
  voided.status = "void";
  voided.resolution.outcome = null;
  assert.throws(() => scoreBinaryForecast(voided), /resolved forecast/);
});
