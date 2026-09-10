import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { proseSentences } from "../../meta/validate-draft-provenance.mjs";
import { beforeRound10Amendment } from "./helpers/round-10-history.mjs";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");

test("WHEN retains its explicit date, forecast and commitment ceiling", () => {
  assert.match(read("drafts/every-if-is-somebodys-when.md"), /WHEN is a prompt for conditional work, not a date, forecast, guarantee or commitment\./);
});

test("WHEN records the date of the restored claim ceiling", () => {
  assert.match(read("drafts/every-if-is-somebodys-when.md"), /^updated: 2026-09-10$/m);
});

test("the naughty-kid interpretation is Ren's reading, not an attributed new author instruction", () => {
  const seed = read("seeds/the-choice-belongs-to-enterprises.md");
  assert.match(seed, /Ren's reading, permitted by the forwarded Round 09 brief/);
  assert.doesNotMatch(seed, /instruction\s+(?:expressly permits|now expressly permits)/);
  assert.match(read("meta/backlog.md"), /\[ \] \*\*Is the naughty-kid line an observation or an imperative\?/);
});

test("storms capture preserves conversation after processing, with analysis in the backlog", () => {
  const capture = read("capture/2026-09-10-storms-as-social-contract-shifts.md");
  assert.match(capture, /^status: processed$/m);
  assert.doesNotMatch(capture, /Ren's notes|calibrated probability|independent or disjoint/);
  assert.match(capture, /also household members who depend on that income\?/);
  assert.match(read("meta/backlog.md"), /Country-specific, regional and global events may overlap/);
});

test("the extracted money capture is processed without altering its quoted answers", () => {
  const capture = read("capture/2026-09-10-where-the-money-sits-and-the-weather-station.md");
  assert.match(capture, /^status: processed$/m);
  assert.match(capture, /> indeed that is just a plain observation at this point of where the money accrues to\n> and we can dismiss it as bound to any solutions\./);
});

test("the main-unchanged policy has an exact captured instruction and stays limited to Round 9 integration", () => {
  const capture = read("capture/2026-09-10-keep-main-unchanged.md");
  assert.match(capture, /> Keep main unchanged; integrate the capture on Round 9 only/);
  assert.match(read("meta/backlog.md"), /2026-09-10-keep-main-unchanged\.md/);
});

test("the current disclaimer inventory pins its count scope and reports the restored ceiling's threshold miss", () => {
  const review = read("reviews/round-09.1-editorial-repairs.md");
  const block = review.match(/```disclaimer-inventory\n([\s\S]*?)\n```/);
  assert.ok(block, "the current reader and repaired drafts must be in the inventory");
  const inventory = JSON.parse(block[1]);
  for (const entry of inventory) {
    const units = proseSentences(beforeRound10Amendment(root, entry.path, read(entry.path)));
    assert.equal(units.length, entry.lexical_units, entry.path);
    assert.equal(units.filter(unit => !/^\d+\.$/.test(unit)).length, entry.conservative_units, entry.path);
  }
  const reader = inventory.find(entry => entry.path === "signals/countries/measurement-view.md");
  const units = proseSentences(read(reader.path));
  assert.equal(reader.non_templated_counted_units.length, 18);
  for (const { number, starts_with } of reader.non_templated_counted_units) assert.ok(units[number - 1].startsWith(starts_with));
  assert.equal(new Set(reader.non_templated_counted_units.map(entry => entry.number)).size, 18);
  assert.equal(units.filter(unit => unit === "Binding category: unknown.").length, 50);
  assert.equal(units.filter(unit => unit === "The national indicators below do not identify which condition prevents access to the covered essentials.").length, 50);
  assert.equal(reader.binding_assessment_units, 100);
  const when = inventory.find(entry => entry.path === "drafts/every-if-is-somebodys-when.md");
  assert.equal(when.disclaimer_units, 4);
  assert.ok(when.disclaimer_units / when.conservative_units > .05);
  assert.match(review, /5\.06%.*not less than 5%/s);
});
