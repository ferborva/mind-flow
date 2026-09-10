import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { prepareNeroCandidate } from "../round-09-nero-corrected/candidate.mts";
import { assessFutureIssuanceBinding } from "../issuance-binding/round-09-corrected-validate.mjs";
import { prepareNeroEvaluationPlan } from "../round-09-nero-corrected/evaluation.mts";
import { evaluateForecastCohort } from "../../lib/evaluation.mjs";

const json = (file) => JSON.parse(readFileSync(new URL(`../round-09-nero-corrected/${file}`, import.meta.url)));

test("corrected issued record reconstructs and retains genuine pre-observation provider clocks", () => {
  const issued = json("issued.json");
  assert.equal(issued.id, "forecast.nero.5311.102.october-2026.correction-1.v1");
  assert.match(issued.target.resolution_rule, /sa4_code 102 and date 2026-10-15/);
  assert.doesNotMatch(issued.target.resolution_rule, /\b101\b/);
  assert.deepEqual(issued.target.scope.geographies, ["SA4 102: Central Coast"]);
  assert.equal(json("resolver-parameters.json").sa4_code, "102");
  assert.equal(json("resolver-parameters.json").count_baseline, 3092);
  const clocks = json("registration-clocks.json");
  const receipt = json("registration-receipt.json");
  const raw = Buffer.from(readFileSync(new URL("../round-09-nero-corrected/registration-provider-response.base64.txt", import.meta.url), "utf8").trim(), "base64");
  const provider = JSON.parse(raw);
  assert.equal("sha256:" + createHash("sha256").update(raw).digest("hex"), receipt.checksum);
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

test("the retained pre-issue source check preserves exact bytes and reports August, not an October archive", () => {
  const acquisition = json("sources/acquisition.json");
  for (const [file, field] of [["nero-landing.source.txt", "body_sha256"], ["nero-landing.response-headers.txt", "headers_sha256"]]) {
    const bytes = readFileSync(new URL(`../round-09-nero-corrected/sources/${file}`, import.meta.url));
    assert.equal("sha256:" + createHash("sha256").update(bytes).digest("hex"), acquisition[field]);
  }
  const page = readFileSync(new URL("../round-09-nero-corrected/sources/nero-landing.source.txt", import.meta.url), "utf8");
  assert.match(page, /href="[^\"]*2026-08_nero\.zip"/);
  assert.doesNotMatch(page, /href="[^\"]*2026-10_nero\.zip"/);
  assert.match(page, /4 November 2026/);
  assert.ok(Date.parse(acquisition.ended_at) <= Date.parse(json("registration-clocks.json").sealAt));
  assert.equal(acquisition.global_absence_verified, false);
});
