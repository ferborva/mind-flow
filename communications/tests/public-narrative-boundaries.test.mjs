import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const charter = readFileSync(resolve(root, "governance/public-charter.md"), "utf8");
const guide = readFileSync(resolve(root, "communications/transition-field-guide.md"), "utf8");
const programme = readFileSync(resolve(root, "meta/abundance-transition-programme.md"), "utf8");
const backlog = readFileSync(resolve(root, "meta/backlog.md"), "utf8");

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

test("the unresolved enterprise-choice diagnosis stays a question for Fernando", () => {
  assert.match(backlog, /money accrues to companies.*choice is theirs/is);
  assert.match(backlog, /survive\s+as a diagnosis/i);
  assert.match(backlog, /2026-09-09-softer-on-tax-and-remedy/i);
  assert.doesNotMatch(backlog, /His remedy now needs a portfolio case/i);
  assert.match(backlog, /frame and method.*not.*solution/is);
});
