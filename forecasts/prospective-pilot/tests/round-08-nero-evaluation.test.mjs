import assert from "node:assert/strict";
import test from "node:test";
import { prepareNeroCandidate } from "../round-08-nero/candidate.mts";
import { prepareNeroEvaluationPlan } from "../round-08-nero/evaluation.mts";
import { assertEvaluationPlanSemantics, evaluateForecastCohort } from "../../lib/evaluation.mjs";

test("one-member plan retains the only issued forecast and withholds premature performance", () => {
  const candidate = prepareNeroCandidate({ sealAt: "2026-09-09T11:00:00Z", issueOpensAt: "2026-09-10T00:00:00Z",
    issuedAt: "2026-09-10T01:00:00Z", sourceCommit: "a206254" });
  const { plan, retained } = prepareNeroEvaluationPlan(candidate, { registeredAt: "2026-09-10T01:01:00Z", sourceCommit: "a206254" });
  assert.doesNotThrow(() => assertEvaluationPlanSemantics(plan, [candidate.forecast]));
  assert.deepEqual(plan.eligible_registry_manifest.eligible_forecast_ids, [candidate.forecast.id]);
  assert.ok(Object.values(retained).every((artifact) => artifact.bytes instanceof Uint8Array));
  assert.throws(() => assertEvaluationPlanSemantics(plan, []), /missing registered forecasts/);
  const report = evaluateForecastCohort(plan, [candidate.forecast], { asOf: "2026-09-10T01:02:00Z" });
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(report.scores.mean_brier, null);
});
