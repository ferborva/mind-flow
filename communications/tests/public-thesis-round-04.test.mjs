import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const nameTheIf = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const when = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");

test("the memorable grammar expands into a bounded public claim", () => {
  assert.match(when, /which consultation, for whom, in which place,\s+to what standard and within what time/i);
});

// The claim-level guards on name-the-if moved to draft-integrity.test.mjs on
// 2026-09-11, stated without pinning its wording.

test("IF evolution is visible across meaning, evidence, path, power and values", () => {
  for (const axis of ["Definition", "Evidence", "Path", "Actor and authority", "Values and loss rule"]) {
    assert.match(when, new RegExp(axis, "i"));
  }
});

test("public updates state what changed, what did not, what remains blocked and what comes next", () => {
  for (const document of [when]) {
    assert.match(document, /what changed/i);
    assert.match(document, /what did not change/i);
    assert.match(document, /remains blocked/i);
    assert.match(document, /next observation/i);
  }
});
