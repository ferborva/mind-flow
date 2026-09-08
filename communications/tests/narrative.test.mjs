import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const first = readFileSync(resolve(root, "drafts/abundance-has-an-if.md"), "utf8");
const second = readFileSync(resolve(root, "drafts/from-if-to-when.md"), "utf8");

test("the originating write-up preserves Fernando's argument and its visible correction boundary", () => {
  assert.match(first, /originating argument and remains in review/i);
  assert.match(first, /red team broke its corporate-discretion remedy/i);
  assert.match(first, /This draft stays intact so the evolution is visible/i);
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
