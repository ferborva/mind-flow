import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const source = "2026-09-10-storms-as-social-contract-shifts";
// Consolidated 2026-09-11 on Fer's call: the four atomic storm seeds were each
// too thin to stand alone. Every quotation and every open question moved into
// one seed, so the lineage check below is unchanged in what it enforces.
const seeds = ["what-counts-as-a-storm"];
const quotes = text => [...text.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm)].map(match => match[0].replace(/^> ?/gm, "").trim());

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
  for (const name of seeds) {
    assert.ok(capture.includes(name), `capture does not route to ${name}`);
    checkSeed(read(`seeds/${name}.md`), capture);
  }
});

test("quote lineage rejects an invented threshold and an omitted source declaration", () => {
  const seed = read("seeds/what-counts-as-a-storm.md");
  const capture = read(`capture/${source}.md`);
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

test("programme carries retained storm answers before its commissioned operational reading", () => {
  const programme = read("meta/abundance-transition-programme.md");
  const section = programme.split("## 🌩 What a storm is\n")[1]?.split("## 📡 Signals")[0];
  assert.ok(section, "missing storm definition section");
  const capture = read(`capture/${source}.md`);
  for (const quote of quotes(section)) assert.ok(quotes(capture).includes(quote), "programme must preserve complete attributed answers");
  assert.equal(quotes(section).length, 2);
  assert.match(section, /provenance: commissioned-proposal/);
  assert.match(section, /reversible/);
  assert.match(section, /Never merge/);
  assert.match(section, /Forecasts remain separate/);
});
