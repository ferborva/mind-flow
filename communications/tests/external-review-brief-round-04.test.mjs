import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const brief = readFileSync(resolve(root, "meta/round-04-external-review-brief.md"), "utf8");

test("the review brief gives external reviewers a bounded claim and reproducible target", () => {
  assert.match(brief, /Technical capability does not become human agency automatically/i);
  assert.match(brief, /ren\/abundance-transition-program/i);
  assert.match(brief, /npm test/i);
  assert.match(brief, /build-round-04-complete-core\.mjs --check/i);
  assert.match(brief, /build-round-04-fixtures\.mjs --check/i);
});

test("independent lanes attack evidence, semantics, methods, people and operations", () => {
  for (const lane of [
    "Thesis and evidence",
    "Semantic and integrity",
    "Forecasting and causal inference",
    "Affected-party and rights",
    "Public comprehension and accessibility",
    "Security, governance and operations",
  ]) {
    assert.match(brief, new RegExp(lane, "i"));
  }
  assert.match(brief, /before seeing other reviewers/i);
});

test("review success cannot create truth, legitimacy or authority", () => {
  assert.match(brief, /cannot[\s>]+establish empirical truth/i);
  assert.match(brief, /cannot[\s\S]{0,100}approve recruitment/i);
  assert.match(brief, /cannot[\s\S]{0,100}create legal authority/i);
  assert.match(brief, /affected-party review/i);
  assert.match(brief, /rendered parity/i);
});
