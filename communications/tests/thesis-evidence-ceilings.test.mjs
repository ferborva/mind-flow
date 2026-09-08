import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const nameTheIf = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const when = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");
const programme = readFileSync(resolve(root, "meta/abundance-transition-programme.md"), "utf8");

test("the IF grammar remains a proposed reporting method rather than a validated diagnosis", () => {
  assert.match(nameTheIf, /reporting grammar/i);
  assert.match(nameTheIf, /has not yet been shown to\s+identify the true binding condition/i);
  assert.match(nameTheIf, /register of candidate conditions, not a\s+diagnosis or forecast/i);
  assert.doesNotMatch(nameTheIf, /Every abundance promise has the shape/i);
  assert.doesNotMatch(nameTheIf, /What you get is diagnosis/i);
});

test("the poverty paragraph retains vintage, nowcast and inference ceilings", () => {
  assert.match(nameTheIf, /March\s+2026 World Bank Poverty and Inequality Platform vintage/i);
  assert.match(nameTheIf, /Values after 2024 are nowcasts/i);
  assert.match(nameTheIf, /not an\s+official World Bank global poverty line/i);
  assert.match(nameTheIf, /do not identify who abundance rhetoric addresses/i);
  assert.doesNotMatch(nameTheIf, /talking to the other fifth/i);
});

test("the supply argument keeps consumer IFs and actor WHENs linked but non-identical", () => {
  assert.match(when, /two registers are linked but non-identical/i);
  assert.match(when, /not a\s+validated linguistic test/i);
  assert.match(when, /Public, social-insurance and private delivery arrangements/i);
  assert.doesNotMatch(when, /Same conditions\. Different verb/i);
  assert.doesNotMatch(when, /there are two kinds of people/i);
  assert.doesNotMatch(when, /Nobody in a large company/i);
});

test("programme controls are described as advisory until an issuance boundary exists", () => {
  assert.match(programme, /cannot enforce that requirement at CI, hosting, identity or\s+operational issuance boundaries/i);
  assert.match(programme, /controls are advisory library and build\s+boundaries/i);
  assert.match(programme, /Current checkpoint: Round 04 complete synthetic core/i);
  assert.match(programme, /seven-artifact pre-projection core/i);
  assert.match(programme, /eight-artifact complete core/i);
  assert.match(programme, /truth, freshness,\s+authority and publication remain closed/i);
  assert.match(programme, /transition-bundle assessment/i);
  assert.doesNotMatch(programme, /repository is a provenance-safe system/i);
  assert.doesNotMatch(programme, /Block public issuance at a machine-readable governance boundary/i);
});
