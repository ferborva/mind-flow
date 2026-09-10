import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { reverseEditorialAmendment } from "../../meta/validate-editorial-deletions.mjs";
import { attributedSentences, proseSentences } from "../../meta/validate-draft-provenance.mjs";
import { existsSync } from "node:fs";

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

function checkLineCoverage(markdown, ranges) {
  const lines = markdown.split("\n");
  const start = lines.indexOf("---", 1) + 1;
  for (let i = start; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    assert.equal(ranges.filter(([from, to]) => from <= i + 1 && to >= i + 1).length, 1, `line ${i + 1} must have one review disposition`);
  }
}

test("Name the If line review covers every content line and fails when a passage is omitted", () => {
  const review = read("reviews/round-10-narrative-provenance.md");
  const ranges = [...review.matchAll(/^\| (\d+)-(\d+) \|/gm)].map(([, a, b]) => [Number(a), Number(b)]);
  assert.ok(ranges.length > 20, "line-by-line review, not only section summaries");
  const draft = read("drafts/name-the-if.md");
  checkLineCoverage(draft, ranges);
  assert.throws(() => checkLineCoverage(draft, ranges.slice(1)), /must have one review disposition/);
  assert.throws(() => checkLineCoverage(draft + "\nAn unreviewed new promise.\n", ranges), /must have one review disposition/);
});

test("Name the If sign-off covers all sections without recording agent approval or publication", () => {
  const sheet = read("reviews/name-the-if-sign-off.md");
  for (const [, heading] of read("drafts/name-the-if.md").matchAll(/^## (.+)$/gm)) assert.ok(sheet.includes(heading), heading);
  assert.match(sheet, /92\.0%.*2024/);
  assert.match(sheet, /census\.gov\/library\/publications\/2025\/demo\/p60-288\.html/);
  assert.match(sheet, /outside the project/);
  assert.match(sheet, /Fernando.*pending/);
  assert.equal(existsSync(resolve(root, "posts/name-the-if.md")), false);
});

test("ready-stage amendment preserves attributed wording and rejects an invented coverage claim", () => {
  const current = read("drafts/name-the-if.md");
  const audit = read("reviews/round-10-narrative-provenance.md");
  const record = [...audit.matchAll(/```editorial-amendment\n([\s\S]*?)\n```/g)]
    .map(([, value]) => JSON.parse(value)).find(entry => entry.path === "drafts/name-the-if.md");
  const previous = reverseEditorialAmendment(current, record);
  assert.match(previous, /^status: review$/m);
  assert.match(current, /^status: ready$/m);
  assert.deepEqual(attributedSentences(current), attributedSentences(previous));
  assert.throws(() => reverseEditorialAmendment(current.replace("92.0%", "99.0%"), record), /DRIFT/);
  assert.throws(() => reverseEditorialAmendment(current.replace("The restored January 2025", "The current"), record), /DRIFT/);
  assert.match(audit, /### Section 6 checklist, applied literally/);
});
