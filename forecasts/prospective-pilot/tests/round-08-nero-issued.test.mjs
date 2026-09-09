import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { prepareNeroCandidate } from "../round-08-nero/candidate.mts";
import { source, sha256 } from "../round-08-nero/basis.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/validate.mjs";
import { assertIssuedForecastImmutable } from "../../lib/registry.mjs";
import { assertEvaluationPlanSemantics, evaluateForecastCohort } from "../../lib/evaluation.mjs";

test("retained NERO issuance exactly matches its sealed dependency and cohort records", () => {
  const dir = "forecasts/prospective-pilot/round-08-nero/";
  const issued = source(dir + "issued.json");
  const preregistration = source(dir + "preregistration.json");
  const clocks = source(dir + "registration-clocks.json").document;
  const receipt = source(dir + "registration-receipt.json").document;
  const candidate = prepareNeroCandidate({ ...clocks, issuedAt: issued.document.issued_at, externalReceipt: receipt });
  assert.equal(issued.sha256, "sha256:bc230310d6edb9814ef350dd58f683ca26f7fd60a9a43cd48c1ed2aacf995053");
  assert.deepEqual(candidate.input.matureForecastBytes, issued.bytes);
  assert.deepEqual(candidate.input.preregistrationBytes, preregistration.bytes);
  assert.equal(assessFutureIssuanceBinding(candidate.input).binding_complete, true);
  for (const role of ["reference", "naive"]) {
    const registered = preregistration.document[role === "reference" ? "baseline" : "naive_baseline"];
    const baseline = issued.document[role === "reference" ? "baseline" : "naive_baseline"];
    assert.equal(source(dir + role + "-baseline-calculation.json").sha256, baseline.calculation.checksum);
    assert.equal(source(dir + role + "-input-manifest.json").sha256, registered.input_manifest_sha256);
    assert.equal(source(dir + "baseline-parameters.json").sha256, registered.parameters_sha256);
  }
  assert.equal(source(dir + "resolver-parameters.json").sha256, preregistration.document.target.resolver.parameters_sha256);
  assert.doesNotThrow(() => assertIssuedForecastImmutable(issued.document, candidate.forecast));
  const response = Buffer.from(readFileSync(new URL("../round-08-nero/registration-provider-response.base64.txt", import.meta.url), "utf8").trim(), "base64");
  assert.equal(sha256(response), receipt.checksum);
  assert.equal(JSON.parse(response).created_at, receipt.registered_at);
  assert.ok(Date.parse(receipt.registered_at) < Date.parse(clocks.issueOpensAt));
  assert.ok(Date.parse(issued.document.issued_at) >= Date.parse(clocks.issueOpensAt));
  const plan = source(dir + "evaluation-plan.json").document;
  assert.equal(source(dir + "cohort-policy.json").sha256, plan.cohort_policy.anchor.checksum);
  assert.equal(source(dir + "eligible-registry-manifest.json").sha256, plan.eligible_registry_manifest.checksum);
  assert.equal(source(dir + "evaluation-registration.json").sha256, plan.registration_anchor.checksum);
  assert.doesNotThrow(() => assertEvaluationPlanSemantics(plan, [issued.document]));
  const report = evaluateForecastCohort(plan, [issued.document], { asOf: issued.document.issued_at });
  assert.deepEqual(report, source(dir + "evaluation-at-issue.json").document);
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(report.scores.mean_brier, null);
});
