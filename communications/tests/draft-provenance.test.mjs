import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { firstPersonSentences, attributedSentences, validateDraftChangeCoverage } from "../../meta/validate-draft-provenance.mjs";

const root = resolve(import.meta.dirname, "../..");

test("draft attribution wording matches the reviewed change-detection inventory", () => {
  const result = validateDraftChangeCoverage(root);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.ok(result.reviewed_sentences > 0);
});

test("named third-person attribution is screened alongside first-person wording", () => {
  assert.deepEqual(attributedSentences("Fernando says prices will fall. Fernando's contribution is the method. A provider may offer care."),
    ["Fernando says prices will fall.", "Fernando's contribution is the method."]);
});

test("first-person screening recognises contractions and headings without treating US as a speaker", () => {
  assert.deepEqual(firstPersonSentences("## My new policy\n\nI've changed my mind. The US reports coverage."),
    ["I've changed my mind.", "My new policy"]);
});

test("an unreviewed personal claim or fabricated source snippet fails the audit", () => {
  const scratch = mkdtempSync(resolve(tmpdir(), "mind-flow-narrative-"));
  try {
    for (const directory of ["drafts", "capture", "reviews"]) {
      cpSync(resolve(root, directory), resolve(scratch, directory), { recursive: true });
    }
    const draft = resolve(scratch, "drafts/name-the-if.md");
    const original = readFileSync(draft, "utf8");
    writeFileSync(draft, `${original}\nI have decided that all countries must adopt my tax plan.\n`);
    assert.ok(validateDraftChangeCoverage(scratch).errors.some((error) => error.includes("unreviewed attributed")));
    writeFileSync(draft, `${original}\nFernando says every country must adopt a single tax plan.\n`);
    assert.ok(validateDraftChangeCoverage(scratch).errors.some((error) => error.includes("unreviewed attributed")));
    writeFileSync(draft, original);
    const capture = resolve(scratch, "capture/2026-09-08-the-benchmark-shrug.md");
    writeFileSync(capture, readFileSync(capture, "utf8").replace("Keep them as mine now.", "No category adoption recorded."));
    assert.ok(validateDraftChangeCoverage(scratch).errors.some((error) => error.includes("capture support absent")));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
