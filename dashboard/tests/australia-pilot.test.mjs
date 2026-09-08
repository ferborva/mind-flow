import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const templatePath = join(root, "pilots", "australia", "web", "index.template.html");
const baselinePath = join(root, "pilots", "australia", "data", "nero-clerical-2026-08.json");
const buildPath = join(root, "dashboard", "tools", "build-australia-pilot.mjs");

function template() {
  return readFileSync(templatePath, "utf8");
}

test("the pilot leads with authority, scope and the seven-part public update", () => {
  const html = template();
  for (const phrase of [
    "AUSTRALIA PILOT",
    "MODELLED ESTIMATE",
    "AGENT PROPOSAL",
    "NOT AN AI EFFECT",
    "OBSERVED",
    "AFFECTED",
    "INFERRED",
    "IF CHANGED",
    "ACTION AND OWNER",
    "FALSIFIER",
    "NEXT CHECK",
  ]) assert.match(html, new RegExp(phrase, "i"), `missing ${phrase}`);

  assert.match(html, /No authorised action/i);
  assert.match(html, /one occupation-region series/i);
  assert.match(html, /must not be summed or combined/i);
});

test("the evidence room supports scoped selection without synthetic ranking", () => {
  const html = template();
  for (const id of ["occupation-select", "region-select", "series-chart", "series-table", "source-contract"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /risk score|crisis score|most at risk|leaderboard/i);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
});

test("the pilot build embeds the frozen baseline and parseable application code", () => {
  const outDir = mkdtempSync(join(tmpdir(), "australia-pilot-"));
  const outputPath = join(outDir, "index.html");
  execFileSync(process.execPath, [buildPath, baselinePath, outputPath]);
  const built = readFileSync(outputPath, "utf8");

  assert.doesNotMatch(built, /__NERO_BASELINE__/);
  const data = built.match(/<script id="nero-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(data, "embedded NERO baseline is missing");
  const baseline = JSON.parse(data[1]);
  assert.equal(baseline.series.length, 440);
  assert.equal(baseline.epistemic_class, "modelled-estimate");

  const scripts = [...built.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const applicationCode = scripts.at(-1)?.[1];
  assert.ok(applicationCode, "application script is missing");
  assert.doesNotThrow(() => new Function(applicationCode));
});
