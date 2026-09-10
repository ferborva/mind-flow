import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { prepareNeroCandidate } from "../round-09-nero/candidate.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/round-09-validate.mjs";
import { prepareNeroEvaluationPlan } from "../round-09-nero/evaluation.mts";
import { evaluateForecastCohort } from "../../lib/evaluation.mjs";

const json = (file) => JSON.parse(readFileSync(new URL(`../round-09-nero/${file}`, import.meta.url)));

test("second issued record reconstructs and retains genuine pre-observation provider clocks", () => {
  const issued = json("issued.json");
  const clocks = json("registration-clocks.json");
  const receipt = json("registration-receipt.json");
  const raw = Buffer.from(readFileSync(new URL("../round-09-nero/registration-provider-response.base64.txt", import.meta.url), "utf8").trim(), "base64");
  const provider = JSON.parse(raw);
  assert.equal(provider.created_at, receipt.registered_at);
  assert.equal(provider.html_url, receipt.source);
  assert.match(provider.body, new RegExp(receipt.registered_content_sha256));
  assert.ok(Date.parse(clocks.sealAt) <= Date.parse(provider.created_at));
  assert.ok(Date.parse(provider.created_at) < Date.parse(clocks.issueOpensAt));
  assert.ok(Date.parse(issued.issued_at) < Date.parse(issued.target.observation_window_start));
  const candidate = prepareNeroCandidate({ ...clocks, issuedAt: issued.issued_at, externalReceipt: receipt });
  assert.deepEqual(candidate.forecast, issued);
  assert.deepEqual(candidate.protocol, json("preregistration.json"));
  const binding = assessFutureIssuanceBinding(candidate.input);
  assert.equal(binding.binding_complete, true, JSON.stringify(binding.issues));
  const { plan } = prepareNeroEvaluationPlan(candidate, { registeredAt: issued.issued_at, sourceCommit: clocks.sourceCommit });
  assert.deepEqual(plan, json("evaluation-plan.json"));
  const report = evaluateForecastCohort(plan, [issued], { asOf: issued.issued_at });
  assert.deepEqual(report, json("evaluation-at-issue.json"));
  assert.equal(report.interpretation.performance_evaluable, false);
  assert.equal(report.scores.mean_brier, null);
});
