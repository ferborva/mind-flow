import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateDeletionRecord } from "../../meta/validate-editorial-deletions.mjs";
import * as editorial from "../../meta/validate-editorial-deletions.mjs";
import { firstPersonSentences } from "../../meta/validate-draft-provenance.mjs";
import { beforeRound10Amendment } from "./helpers/round-10-history.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
const before = "I want agency.\n\nRepeated status.\n\n<!-- GAP: His question. -->\n";
const cut = "Repeated status.\n\n";
const record = { before_sha256: hash(before), deletions: [{ offset: before.indexOf(cut), text: cut, reason: "Duplicate status; the single opening boundary remains." }] };
const after = before.replace(cut, "");
const root = resolve(import.meta.dirname, "../..");
const review = readFileSync(resolve(root, "reviews/round-09-narrative-provenance.md"), "utf8");

function beforeRound091Amendment(path, bytes) {
  const review091 = readFileSync(resolve(root, "reviews/round-09.1-editorial-repairs.md"), "utf8");
  const amendments = [...review091.matchAll(/```editorial-amendment\n([\s\S]*?)\n```/g)].map(([, json]) => JSON.parse(json));
  assert.equal(amendments.length, 2, "only the WHEN restoration and capture-status transition are authorised here");
  const matching = amendments.filter(record => record.path === path);
  assert.equal(matching.length, 1);
  const endpoints = {
    "drafts/every-if-is-somebodys-when.md": ["5e22a3fe71206a85531aa9b2533c9b60e507a9849e152b25998cad06c3ba529b", "ca97eee88dc16b34030c0bc4ada4696152864ea004278cfece17d6c192fa878d"],
    "capture/2026-09-10-where-the-money-sits-and-the-weather-station.md": ["b7e3851b2d780939ea37ee876212c3fa7042f22638f944b1e625fb4204ea9338", "9fb0c7652ad86e383bdf4b106b69c78d6b736c572cd7eeab712b35bb96e4a52d"],
  };
  assert.deepEqual([matching[0].before_sha256, matching[0].after_sha256], endpoints[path]);
  return editorial.reverseEditorialAmendment(bytes, matching[0]);
}

test("forward editorial amendments reject hidden changes and invalid restoration anchors", () => {
  const restored = "I want agency.\n\nA forecast is not a commitment.\n";
  const original = "I want agency.\n";
  const repair = { before_sha256: hash(original), after_sha256: hash(restored), changes: [{ before: "agency.\n", after: "agency.\n\nA forecast is not a commitment.\n", reason: "Restore the explicit claim ceiling." }] };
  assert.equal(editorial.reverseEditorialAmendment(restored, repair), original);
  assert.throws(() => editorial.reverseEditorialAmendment(restored + "Hidden policy.\n", repair));
  assert.throws(() => editorial.reverseEditorialAmendment(restored, { ...repair, before_sha256: "0".repeat(64) }));
  assert.throws(() => editorial.reverseEditorialAmendment(restored, { ...repair, changes: [{ ...repair.changes[0], reason: "" }] }));
  assert.throws(() => editorial.reverseEditorialAmendment(restored, { ...repair, changes: [{ ...repair.changes[0], after: "" }] }));
  assert.throws(() => editorial.reverseEditorialAmendment(restored, { ...repair, changes: [{ ...repair.changes[0], after: "." }] }));
});

// Retired 2026-09-11. The captured-amendment replay below was keyed entirely to
// `drafts/abundance-has-an-if.md`, which was merged into `drafts/name-the-if.md`
// on Fer's call. It pinned that draft to three sha256 checkpoints, which is why
// the merge could not happen without this surgery. The amendment record stays in
// reviews/round-09-narrative-provenance.md as history. The forward-direction
// validator tests above still cover the mechanism on synthetic fixtures.

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
  const blocks = [...review.matchAll(/```deletion-log\n([\s\S]*?)\n```/g)];
  assert.equal(blocks.length, 4, "the Round 09 drafts and the dashboard README must each be accounted for");
  for (const [, json] of blocks) {
    const record = JSON.parse(json);
    if (record.path === "drafts/abundance-has-an-if.md") continue; // merged into name-the-if on 2026-09-11
    let body = readFileSync(resolve(root, record.path), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
    if (record.path === "drafts/every-if-is-somebodys-when.md") body = beforeRound091Amendment(record.path, beforeRound10Amendment(root, record.path, body));
    if (record.navigation_addition) {
      assert.equal(record.path, "dashboard/README.md", "draft additions are forbidden");
      assert.equal(record.navigation_addition, "[Operator details](OPERATIONS.md) covers validation, evidence acquisition, synthetic fixtures and release governance.\n\n");
      assert.equal(body.split(record.navigation_addition).length, 2);
      body = body.replace(record.navigation_addition, "");
    }
    assert.deepEqual(validateDeletionRecord(body, record), [], record.path);
  }
});
