import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const nameTheIf = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const when = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");

test("the memorable grammar expands into a bounded public claim", () => {
  for (const document of [nameTheIf, when]) {
    assert.match(document, /WHO[\s\S]{0,100}VERB[\s\S]{0,100}OUTCOME[\s\S]{0,100}STANDARD/i);
    assert.match(document, /PLACE[\s\S]{0,100}PERIOD[\s\S]{0,100}IF[\s\S]{0,100}CONDITION SET/i);
  }
});

test("the public thesis treats IFs as route-specific candidates, not diagnoses", () => {
  assert.match(nameTheIf, /candidate condition set/i);
  assert.match(nameTheIf, /not a diagnosis/i);
  assert.match(nameTheIf, /counterfactual or intervention evidence/i);
  assert.doesNotMatch(nameTheIf, /the grammar diagnoses/i);
});

test("IF evolution is visible across meaning, evidence, path, power and values", () => {
  for (const axis of ["Definition", "Evidence", "Path", "Actor and authority", "Values and loss rule"]) {
    assert.match(nameTheIf, new RegExp(axis, "i"));
    assert.match(when, new RegExp(axis, "i"));
  }
  for (const state of ["true", "false", "unknown", "stale", "conflicted"]) {
    assert.match(nameTheIf, new RegExp(`\\b${state}\\b`, "i"));
  }
});

test("public updates state what changed, what did not, what remains blocked and what comes next", () => {
  for (const document of [nameTheIf, when]) {
    assert.match(document, /what changed/i);
    assert.match(document, /what did not change/i);
    assert.match(document, /remains blocked/i);
    assert.match(document, /next observation/i);
  }
});
