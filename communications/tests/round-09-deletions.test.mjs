import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateDeletionRecord } from "../../meta/validate-editorial-deletions.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
const before = "I want agency.\n\nRepeated status.\n\n<!-- GAP: His question. -->\n";
const cut = "Repeated status.\n\n";
const record = { before_sha256: hash(before), deletions: [{ offset: before.indexOf(cut), text: cut, reason: "Duplicate status; the single opening boundary remains." }] };
const after = before.replace(cut, "");

test("deletion replay accepts a logged cut but rejects hidden edits and invalid logs", () => {
  assert.deepEqual(validateDeletionRecord(after, record), []);
  assert.ok(validateDeletionRecord(after.replace("agency", "tax cuts"), record).length);
  assert.ok(validateDeletionRecord(after + "New position.\n", record).length);
  assert.ok(validateDeletionRecord(after, { ...record, deletions: [] }).length);
  assert.ok(validateDeletionRecord(after, { ...record, deletions: [record.deletions[0], record.deletions[0]] }).length);
  assert.ok(validateDeletionRecord(after, { ...record, deletions: [{ ...record.deletions[0], reason: "" }] }).length);
});

test("even correctly logged first-person or GAP deletions fail the voice boundary", () => {
  for (const text of ["I want agency.\n\n", "<!-- GAP: His question. -->\n"]) {
    const altered = before.replace(text, "");
    const log = { before_sha256: hash(before), deletions: [{ offset: before.indexOf(text), text, reason: "A proposed cut that is not permitted." }] };
    assert.ok(validateDeletionRecord(altered, log).some(error => /first-person|GAP/.test(error)));
  }
});

test("Round 09 logged prose cuts reconstruct their pre-edit documents", () => {
  const root = resolve(import.meta.dirname, "../..");
  const review = readFileSync(resolve(root, "reviews/round-09-narrative-provenance.md"), "utf8");
  const blocks = [...review.matchAll(/```deletion-log\n([\s\S]*?)\n```/g)];
  assert.equal(blocks.length, 4, "three named drafts and the dashboard README must each be accounted for");
  for (const [, json] of blocks) {
    const record = JSON.parse(json);
    let body = readFileSync(resolve(root, record.path), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
    if (record.navigation_addition) {
      assert.equal(record.path, "dashboard/README.md", "draft additions are forbidden");
      assert.equal(record.navigation_addition, "[Operator details](OPERATIONS.md) covers validation, evidence acquisition, synthetic fixtures and release governance.\n\n");
      assert.equal(body.split(record.navigation_addition).length, 2);
      body = body.replace(record.navigation_addition, "");
    }
    assert.deepEqual(validateDeletionRecord(body, record), [], record.path);
  }
});
