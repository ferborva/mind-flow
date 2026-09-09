import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const audit = readFileSync(
  resolve(root, "research/2026-09-09-round-04-claim-evidence-audit.md"),
  "utf8",
);

test("the audit bounds its own authority and the programme thesis", () => {
  assert.match(audit, /Agent audit\. Not a finding, forecast or public-release approval/i);
  assert.match(audit, /Technical capability does not become human agency automatically/i);
  assert.match(audit, /does not establish that:[\s\S]*abundance transition is imminent, inevitable/i);
  assert.match(audit, /discover that its own map is wrong/i);
});

test("P0 corrections preserve category boundaries", () => {
  for (const correction of [
    "candidate condition set for a registered route",
    "nowcast",
    "research projection",
    "Occupational exposure is neither adoption, automation nor job loss",
    "state graph",
    "forecast candidate",
  ]) {
    assert.match(audit, new RegExp(correction, "i"));
  }
});

test("source ceilings prohibit causal and operational overclaiming", () => {
  assert.match(audit, /cannot\s+stand in for zero out-of-pocket cost/i);
  assert.match(audit, /Use that as an analogy to test, not borrowed validation/i);
  assert.match(audit, /signal replay\*\*, not a historical\s+warning backtest/i);
  assert.match(audit, /do not establish a lawful,\s+efficient or equitable distribution mechanism/i);
});

test("forecast and falsification rules make failure observable", () => {
  assert.match(audit, /Freeze event wording, target metric, scope, PERIOD, data vintage/i);
  assert.match(audit, /Require naive and reference-class baselines/i);
  assert.match(audit, /Publish sample counts and uncertainty/i);
  assert.match(audit, /Independent encoders cannot reproduce condition sets reliably/i);
  assert.match(audit, /selectively publishes favourable forecasts/i);
  assert.match(audit, /Null, adverse and contradictory results are programme outputs/i);
});
