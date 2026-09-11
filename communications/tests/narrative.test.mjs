import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const second = readFileSync(resolve(root, "drafts/from-if-to-when.md"), "utf8");
const supply = readFileSync(
  resolve(root, "drafts/every-if-is-somebodys-when.md"),
  "utf8",
);
const reconstruction = readFileSync(
  resolve(root, "evidence/world-reconstruction-protocol.md"),
  "utf8",
);

// Retired 2026-09-11. `drafts/abundance-has-an-if.md` was merged into
// `drafts/name-the-if.md` on Fer's call. The claim-level guards that were worth
// keeping (withdrawn distribution inference, remedy-free observation section,
// source ceilings) now live in draft-integrity.test.mjs, stated as constraints
// on what the piece may claim rather than on how it is worded.

test("the evolved write-up uses the seven-part public update", () => {
  for (const question of [
    "What was observed?",
    "Who does this cover?",
    "What is inferred?",
    "Which IF changed?",
    "What happens now?",
    "What would change this reading?",
    "When is the next check?",
  ]) assert.match(second, new RegExp(question.replace("?", "\\?")));
  assert.doesNotMatch(second, /five questions every update/i);
  assert.match(second, /One claim in this debate can be stated so it could fail/i);
  assert.match(second, /earlier five-phase calendar has been retired/i);
  assert.doesNotMatch(second, /There is one falsifiable claim at the centre/i);
  assert.doesNotMatch(second, /Then it inverted|The catch-up was real/i);
  assert.match(second, /This proposal asks what a proposed\s+route changes, for whom, at whose cost, and what would count against its claim/i);
  assert.match(second, /commissioned proposal, not Fernando's policy position/i);
});

test("the supply-side argument treats WHEN as actor-specific hypothesis, not destiny", () => {
  assert.match(supply, /meta\/abundance-transition-programme\.md/);
  assert.match(supply, /WHEN is a prompt for conditional work/i);
  assert.match(supply, /depending on decisions held elsewhere/i);
  assert.match(supply, /linked but non-identical/i);
  assert.match(supply, /conditions can move concurrently.*unexpected order/is);
  assert.match(supply, /funder.*service operator.*rule maker/is);
  assert.doesNotMatch(supply, /a sequence you are executing/i);
  assert.doesNotMatch(supply, /Every condition sitting on the consumer's side of it is a project sitting on somebody else's side/i);
  assert.doesNotMatch(supply, /What you can do about it \| mostly nothing, alone \| most of it, over time/i);
  assert.match(supply, /Provider:\*{0,2}\s*We can offer/i);
  assert.match(supply, /working frame/i);
});

test("scenario crossings do not predict or pathologise public response", () => {
  assert.match(second, /Scenarios, not a calendar/i);
  assert.match(second, /The following situations are an incomplete, unscored scenario\s+taxonomy\. They can coexist/i);
  assert.match(second, /They can coexist, reverse or never arise/i);
  assert.match(second, /Possible public responses:.*people could welcome a change/is);
  for (const rejected of [
    /\*\*Movements:/i,
    /predicts precisely the resistance/i,
    /This is the moment politics turns/i,
    /five social crossings we can prepare for/i,
  ]) assert.doesNotMatch(second, rejected);
});

test("IF movement and action authority are explicit", () => {
  assert.match(second, /The following seven-part update makes\s+the evidence and open questions easy to find/i);
  assert.match(second, /How an IF is allowed to move/i);
  assert.match(second, /watch_if.*act_if.*pause_if.*reverse_if.*recover_if.*graduate_if/is);
  assert.match(second, /commissioned-proposal/);
  assert.match(second, /Useful preparation question.*Evidence needed before a consequential decision/i);
  assert.match(second, /accountable decision belong beside\s+the option before real-world action/i);
  assert.match(second, /If the available sources cannot\s+answer for that worker, the page should say what they do cover/i);
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
