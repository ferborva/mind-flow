import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const charter = readFileSync(resolve(root, "governance/public-charter.md"), "utf8");
const guide = readFileSync(resolve(root, "communications/transition-field-guide.md"), "utf8");
const programme = readFileSync(resolve(root, "meta/abundance-transition-programme.md"), "utf8");

test("public proposals name proposed participation instead of claiming an institution exists", () => {
  assert.match(charter, /proposes that affected people be able to participate\s+in\s+decisions/i);
  assert.match(charter, /no such process exists yet/i);
  assert.doesNotMatch(charter, /Affected people are participants in decisions, not audiences/i);
});

test("agency and legitimacy claims expose the project choice and missing process", () => {
  assert.match(guide, /This project counts choice without a viable alternative as not being\s+agency/i);
  assert.match(guide, /readers may draw the line elsewhere/i);
  assert.match(programme, /affected-party process not yet designed/i);
  assert.doesNotMatch(programme, /goals (?:chosen|named) through a legitimate affected-party process/i);
});

test("the captured enterprise observation survives without restoring its remedy", () => {
  const seed = readFileSync(resolve(root, "seeds/the-choice-belongs-to-enterprises.md"), "utf8");
  assert.match(seed, /status: ripe/);
  assert.match(seed, /2026-09-10-where-the-money-sits-and-the-weather-station/);
  assert.match(seed, /remedy remains withdrawn/i);
  assert.match(programme, /diagnosis is now confirmed/i);
  assert.doesNotMatch(programme, /diagnosis remains a.*question/is);
});

test("world scope is captured while ranking, signals and storm definitions remain proposals", () => {
  const seed = readFileSync(resolve(root, "seeds/the-weather-station-watches-the-world.md"), "utf8");
  assert.match(seed, /2026-09-08-abundance-frame-conversation/);
  assert.match(seed, /2026-09-10-where-the-money-sits-and-the-weather-station/);
  assert.match(programme, /weather station for the approaching storms of change/);
  assert.match(programme, /at least the top 50 economies/);
  assert.match(programme, /Australian primary-care.*worked example/is);
  assert.match(programme, /ranking.*signals.*storm.*remain.*proposals/is);
  assert.match(programme, /urgency.*not.*measured.*forecast/is);
  assert.match(seed, /not.*settle.*ranking/is);
});
