import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const source = "2026-09-10-storms-as-social-contract-shifts";
const quotes = text => [...text.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm)].map(match => match[0].replace(/^> ?/gm, "").trim());

// Read the seed list from the capture's own frontmatter. How many seeds a
// capture yields is an editorial judgement, not a contract: consolidating or
// splitting them is Fer's call and must not fail CI. What is enforced is the
// lineage, which holds at any count.
function routedSeeds(capture) {
  const declared = capture.match(/^seeds: \[([^\]]*)\]$/m);
  assert.ok(declared, "capture must declare its seeds");
  return declared[1].split(",").map(name => name.trim()).filter(Boolean);
}

// Relational provenance check: downstream quotations must be contained in a
// retained answer, not merely carry a matching filename or numeric token.
function checkSeed(seed, capture) {
  assert.match(seed, new RegExp(`^sources: \\[${source}\\]$`, "m"));
  const extracted = quotes(seed);
  assert.ok(extracted.length > 0, "seed needs retained words");
  for (const quote of extracted) assert.ok(quotes(capture).some(answer => answer.includes(quote)), `unsupported quotation: ${quote}`);
  assert.match(seed, /## What this does not settle\n\n\S/);
}

test("storm capture is processed into seeds with retained quotation lineage", () => {
  const capture = read(`capture/${source}.md`);
  assert.match(capture, /^status: processed$/m);
  const seeds = routedSeeds(capture);
  assert.ok(seeds.length > 0, "a processed substantive capture routes to at least one seed");
  for (const name of seeds) checkSeed(read(`seeds/${name}.md`), capture);
});

test("quote lineage rejects an invented threshold and an omitted source declaration", () => {
  const capture = read(`capture/${source}.md`);
  const seed = read(`seeds/${routedSeeds(capture)[0]}.md`);
  checkSeed(seed, capture);
  assert.throws(() => checkSeed(seed.replace("5%", "15%"), capture), /unsupported quotation/);
  assert.throws(() => checkSeed(seed.replace(/^sources:.*\n/m, ""), capture));
});

test("operational instruction is processed with an explicit no-seed pipeline disposition", () => {
  const capture = read("capture/2026-09-10-keep-main-unchanged.md");
  assert.match(capture, /^status: processed$/m);
  assert.match(capture, /^seeds: \[\]$/m);
  assert.match(capture, /operational instruction.*no seed/i);
});
