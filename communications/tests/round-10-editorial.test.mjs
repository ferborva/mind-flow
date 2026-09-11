import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { proseSentences } from "../../meta/validate-draft-provenance.mjs";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const merged = "WHEN is a prompt for conditional work, not a date, forecast, guarantee or commitment.";

test("WHEN keeps the complete ceiling in its defining sentence", () => {
  assert.ok(proseSentences(read("drafts/every-if-is-somebodys-when.md")).includes(merged));
});

// Retired 2026-09-11. This file previously pinned `drafts/name-the-if.md` to a
// line-range disposition table and replayed it backwards through hash-anchored
// amendment records. Both broke on any edit, which made consolidating two
// overlapping drafts impossible without CI surgery. Fer's call: a test that
// enforces the wording of an essay is enforcing the wrong thing.
//
// What replaces it is in draft-integrity.test.mjs, which holds the durable
// rules: sources declared, limits linked, withdrawn claims stay withdrawn, and
// nothing reaches posts/ without his sign-off.

test("no draft has been promoted to a post without sign-off", () => {
  for (const name of ["name-the-if", "every-if-is-somebodys-when", "from-if-to-when"]) {
    assert.equal(existsSync(resolve(root, `posts/${name}.md`)), false, name);
  }
});

test("Name the If sign-off covers every current section and records no agent approval", () => {
  const sheet = read("reviews/name-the-if-sign-off.md");
  for (const [, heading] of read("drafts/name-the-if.md").matchAll(/^## (.+)$/gm)) assert.ok(sheet.includes(heading), heading);
  assert.match(sheet, /92\.0%.*2024/);
  assert.match(sheet, /census\.gov\/library\/publications\/2025\/demo\/p60-288\.html/);
  assert.match(sheet, /outside the project/);
  assert.match(sheet, /Fernando.*pending/i);
  assert.doesNotMatch(sheet, /^\| .* \| Approved \|$/m);
});
