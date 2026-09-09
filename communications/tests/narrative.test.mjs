import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const first = readFileSync(resolve(root, "drafts/abundance-has-an-if.md"), "utf8");
const second = readFileSync(resolve(root, "drafts/from-if-to-when.md"), "utf8");
const short = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const supply = readFileSync(
  resolve(root, "drafts/every-if-is-somebodys-when.md"),
  "utf8",
);
const healthcareValidation = readFileSync(
  resolve(root, "research/2026-09-09-healthcare-if-validation.md"),
  "utf8",
);
const reconstruction = readFileSync(
  resolve(root, "evidence/world-reconstruction-protocol.md"),
  "utf8",
);

test("the originating write-up preserves Fernando's argument and its visible correction boundary", () => {
  assert.match(first, /originating argument and remains in review/i);
  assert.match(first, /red team broke its corporate-discretion remedy/i);
  assert.match(first, /preserves the original argument while.*correcting claims/is);
});

test("the evolved write-up uses the seven-part public update", () => {
  for (const question of [
    "What was observed?",
    "Who does this cover?",
    "What is inferred?",
    "Which IF changed?",
    "What happens now?",
    "What would change this reading?",
    "When will we check again?",
  ]) assert.match(second, new RegExp(question.replace("?", "\\?")));
  assert.doesNotMatch(second, /five questions every update/i);
});

test("the short public argument keeps its healthcare example inside source ceilings", () => {
  assert.match(short, /2026-09-09-healthcare-if-validation\.md/);
  assert.match(short, /27\.1 million.*uninsured/is);
  assert.match(short, /6%.*needed medical care.*cost/is);
  assert.match(short, /102(?:-day| days).*61\.5%.*60 days/is);
  assert.match(short, /81\.4%.*bulk billed/is);
  assert.match(short, /partial reimbursement.*co-payment.*supplement/is);
  assert.match(short, /composite.*not.*attributed anecdote/is);
  assert.doesNotMatch(short, /technology in all four countries is identical/i);
  assert.doesNotMatch(short, /diagnosis genuinely does go towards zero/i);
  assert.doesNotMatch(short, /cannot prescribe, refer or order a scan in almost any jurisdiction/i);
  assert.match(healthcareValidation, /source-by-source claim ceiling/i);
  assert.match(healthcareValidation, /does not establish.*binding condition/is);
});

test("the supply-side argument treats WHEN as actor-specific hypothesis, not destiny", () => {
  assert.match(supply, /contracts\/agency-map\/README\.md/);
  assert.match(supply, /WHEN.*not a date.*forecast.*guarantee.*commitment/is);
  assert.match(supply, /actionable IF.*one or more.*WHEN/is);
  assert.match(supply, /no\s+universal sequence/i);
  assert.match(supply, /control.*influence.*duty.*fund.*deliver.*affected/is);
  assert.match(supply, /act.*prepare.*watch.*negotiate.*coordinate.*investigate.*cannot move/is);
  assert.doesNotMatch(supply, /a sequence you are executing/i);
  assert.doesNotMatch(supply, /Every condition sitting on the consumer's side of it is a project sitting on somebody else's side/i);
  assert.doesNotMatch(supply, /What you can do about it \| mostly nothing, alone \| most of it, over time/i);
  assert.doesNotMatch(supply, /Provider:\s*We will be able to offer/i);
  assert.match(supply, /Provider:\*{0,2}\s*We propose we could attempt to offer/i);
  assert.doesNotMatch(short, /defeats every viable route/i);
  assert.match(short, /registered routes.*current evidence/is);
});

test("scenario crossings do not predict or pathologise public response", () => {
  assert.match(second, /incomplete, unscored scenario taxonomy/i);
  assert.match(second, /Possible public responses, not predictions:/i);
  for (const rejected of [
    /\*\*Movements:/i,
    /predicts precisely the resistance/i,
    /This is the moment politics turns/i,
    /five social crossings we can prepare for/i,
  ]) assert.doesNotMatch(second, rejected);
});

test("IF movement and action authority are explicit", () => {
  assert.match(second, /How an IF is allowed to move/i);
  assert.match(second, /watch_if.*act_if.*pause_if.*reverse_if.*recover_if.*graduate_if/is);
  assert.match(second, /agent-proposed preparation options/i);
  assert.match(second, /cannot authorise the option by itself/i);
  assert.doesNotMatch(second, /activates automatically|Legislate the triggers|make it irreversible/i);
});

test("the World reconstruction protocol cannot promote arithmetic into welfare or agency evidence", () => {
  assert.match(reconstruction, /status: proposed/i);
  assert.match(reconstruction, /I_L - I_Y = I_Y/i);
  for (const estimand of [
    "replication estimand",
    "production-allocation estimand",
    "worker purchasing-power estimand",
    "household agency estimand",
  ]) assert.match(reconstruction, new RegExp(estimand, "i"));
  for (const panel of ["P0", "P1", "P2", "P3"]) {
    assert.match(reconstruction, new RegExp(`\\b${panel}\\b`));
  }
  assert.match(reconstruction, /governance choices.*before.*results/is);
  assert.match(reconstruction, /permitted public wording/i);
  assert.match(reconstruction, /prohibited public wording/i);
  assert.match(reconstruction, /both[\s>]*indexed to 100 in 2004/i);
  assert.match(reconstruction, /snapshot contains no uncertainty interval/i);
  assert.match(reconstruction, /E2a[\s\S]*E2b[\s\S]*E2c/);
  assert.match(reconstruction, /contemporaneous market exchange rates/i);
  assert.match(reconstruction, /same unit and period/i);
  assert.match(reconstruction, /continuity_floor_met\(u\)/i);
  assert.match(reconstruction, /household-price-deflated gross compensation per hour/i);
  assert.match(reconstruction, /Evidence capabilities are typed and non-substitutable/i);
  assert.match(reconstruction, /Forecast skill and causal identification remain orthogonal/i);
  assert.match(reconstruction, /first_release_status: unknown/i);
  assert.match(reconstruction, /logical digest[\s\S]*physical\s+digest/i);
  assert.match(reconstruction, /result dependency graph derives the complete required\s+artifact set/i);
  assert.match(reconstruction, /equivalised\(disposable cash resources\(u\), registered_scale\)/i);
  assert.match(reconstruction, /cash_co_payment_total\(u\)/i);
  assert.match(reconstruction, /travel_time\(u, j\)[\s\S]*wait_time\(u, j\)[\s\S]*complement_available\(u, j\)/i);
  assert.doesNotMatch(reconstruction, /total_money_time_and_complement_cost/i);
  assert.match(reconstruction, /D_world = SUM_i\(w_i,0 \* D_i\)/i);
  assert.match(reconstruction, /publisher signing key is independently authenticated/i);
  assert.match(reconstruction, /content-address the exact dependency-graph version/i);
  assert.match(reconstruction, /must replace the current population label/i);
  assert.match(reconstruction, /Predicate truth is `true`, `false`, `unknown`,\s*`not-applicable` or `disputed`/i);
  assert.doesNotMatch(reconstruction, /predicate remains five-valued.*stale.*conflicted/is);
  assert.match(reconstruction, /maximum claim is `local capture\s+reproduced`/i);
  assert.match(reconstruction, /does not authorise action/i);
});
