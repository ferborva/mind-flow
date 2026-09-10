import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { reverseEditorialAmendment } from "../../meta/validate-editorial-deletions.mjs";
import { proseSentences } from "../../meta/validate-draft-provenance.mjs";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const body = text => text.replace(/^---\n[\s\S]*?\n---\n/, "");
const merged = "WHEN is a prompt for conditional work, not a date, forecast, guarantee or commitment.";

test("WHEN keeps the complete ceiling in its defining sentence", () => {
  assert.ok(proseSentences(read("drafts/every-if-is-somebodys-when.md")).includes(merged));
});

test("Round 10 ceiling amendment reverses exactly and rejects hidden policy or missing limitations", () => {
  const audit = read("reviews/round-10-narrative-provenance.md");
  const records = [...audit.matchAll(/```editorial-amendment\n([\s\S]*?)\n```/g)].map(([, value]) => JSON.parse(value));
  const record = records.find(entry => entry.path === "drafts/every-if-is-somebodys-when.md");
  assert.ok(record);
  const current = body(read(record.path));
  assert.match(reverseEditorialAmendment(current, record), /conditional work\.\*\* It is not a date, forecast, guarantee or commitment\./);
  assert.throws(() => reverseEditorialAmendment(current.replace(", guarantee", ""), record), /DRIFT/);
  assert.throws(() => reverseEditorialAmendment(current + "\nThis authorises delivery.\n", record), /DRIFT/);
  assert.equal(proseSentences(current).length, 78);
  assert.match(audit, /3\/78 = 3\.85%/);
  assert.match(audit, /4\/78 = 5\.13%/);
});
