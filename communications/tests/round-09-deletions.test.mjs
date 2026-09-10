import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateDeletionRecord } from "../../meta/validate-editorial-deletions.mjs";
import * as editorial from "../../meta/validate-editorial-deletions.mjs";
import { firstPersonSentences } from "../../meta/validate-draft-provenance.mjs";

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

// One explicit captured amendment, not a general permission to change voice.
// Reverse it first; the original deletion-only validator remains unchanged.
function beforeCapturedAmendment(body, sourceBytes) {
  const amendedBody = body;
  const blocks = [...review.matchAll(/```capture-amendment\n([\s\S]*?)\n```/g)];
  assert.equal(blocks.length, 1, "exactly one reviewed author amendment");
  const amendment = JSON.parse(blocks[0][1]);
  assert.equal(amendment.path, "drafts/abundance-has-an-if.md");
  assert.equal(amendment.source, "capture/2026-09-10-where-the-money-sits-and-the-weather-station.md");
  assert.equal(amendment.source_sha256, "b7e3851b2d780939ea37ee876212c3fa7042f22638f944b1e625fb4204ea9338");
  const historicalSource = beforeRound091Amendment(amendment.source, sourceBytes ?? readFileSync(resolve(root, amendment.source), "utf8"));
  assert.equal(hash(historicalSource), amendment.source_sha256);
  assert.equal(amendment.after_sha256, "190aae127df5225303f90e0dff4a733a2c9edbf24cd6e75cd66ebae7f14c873e");
  assert.equal(hash(body), amendment.after_sha256, "unreviewed post-amendment prose change");
  assert.equal(amendment.changes.length, 2);
  for (const change of amendment.changes) {
    assert.ok(change.reason?.trim());
    assert.equal(body.split(change.after).length, 2, "amendment anchor is unique");
    body = body.replace(change.after, change.before);
  }
  assert.equal(amendment.before_sha256, "6cee4b3afed454abb9bf62683948144cc7e5832f341b8b475fa92e7de41b60f4");
  assert.equal(hash(body), amendment.before_sha256, "amendment must restore the original deletion checkpoint");
  assert.deepEqual(firstPersonSentences(amendedBody), firstPersonSentences(body), "this amendment adds no first-person stance");
  return body;
}

test("captured amendment rejects extra policy, source substitution and hidden changes", () => {
  const body = readFileSync(resolve(root, "drafts/abundance-has-an-if.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
  assert.doesNotThrow(() => beforeCapturedAmendment(body));
  assert.throws(() => beforeCapturedAmendment(body + "\nI now endorse a tax plan.\n"));
  assert.throws(() => beforeCapturedAmendment(body.replace("The money accrues", "The choice belongs")));
  assert.throws(() => beforeCapturedAmendment(body, "A substituted capture."));
});

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
  assert.equal(blocks.length, 4, "three named drafts and the dashboard README must each be accounted for");
  for (const [, json] of blocks) {
    const record = JSON.parse(json);
    let body = readFileSync(resolve(root, record.path), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
    if (record.path === "drafts/abundance-has-an-if.md") body = beforeCapturedAmendment(body);
    if (record.path === "drafts/every-if-is-somebodys-when.md") body = beforeRound091Amendment(record.path, body);
    if (record.navigation_addition) {
      assert.equal(record.path, "dashboard/README.md", "draft additions are forbidden");
      assert.equal(record.navigation_addition, "[Operator details](OPERATIONS.md) covers validation, evidence acquisition, synthetic fixtures and release governance.\n\n");
      assert.equal(body.split(record.navigation_addition).length, 2);
      body = body.replace(record.navigation_addition, "");
    }
    assert.deepEqual(validateDeletionRecord(body, record), [], record.path);
  }
});
