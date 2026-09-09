import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const nameTheIf = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const when = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");

test("the memorable grammar expands into a bounded public claim", () => {
  assert.match(nameTheIf, /person.*Where are they.*What would count/is);
  assert.match(when, /which consultation, for whom, in which place,\s+to what standard and within what time/i);
});

test("the public thesis treats IFs as route-specific candidates, not diagnoses", () => {
  assert.match(nameTheIf, /proposed reporting method/i);
  assert.match(nameTheIf, /evidence boundaries/);
  assert.doesNotMatch(nameTheIf, /the grammar diagnoses/i);
});

test("IF evolution is visible across meaning, evidence, path, power and values", () => {
  for (const axis of ["Definition", "Evidence", "Path", "Actor and authority", "Values and loss rule"]) {
    assert.match(when, new RegExp(axis, "i"));
  }
  assert.match(nameTheIf, /which condition moved/i);
});

test("public updates state what changed, what did not, what remains blocked and what comes next", () => {
  for (const document of [when]) {
    assert.match(document, /what changed/i);
    assert.match(document, /what did not change/i);
    assert.match(document, /remains blocked/i);
    assert.match(document, /next observation/i);
  }
});
