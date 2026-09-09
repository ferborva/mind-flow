import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const templatePath = join(root, "pilots", "australia", "web", "index.template.html");
const baselinePath = join(root, "pilots", "australia", "data", "nero-clerical-2026-08.r2.json");
const policyPath = join(root, "pilots", "australia", "schema", "nero-baseline-policy.json");
const buildPath = join(root, "dashboard", "tools", "build-australia-pilot.mjs");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

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
    "UNVERIFIED SOURCE BYTES",
    "WHAT THE DATA SHOW",
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

test("every public metric and evidence export carries adjacent source-byte status", () => {
  const html = template();
  assert.doesNotMatch(html, /\bVERIFIED SOURCE BYTES\b/);
  assert.match(html, /function sourceBytesLabel\(/);
  assert.match(html, /latest-date[\s\S]*UNVERIFIED SOURCE BYTES/i);
  assert.match(html, /function renderChange[\s\S]*sourceBytesLabel\(\)/i);
  assert.match(html, /function renderTable[\s\S]*sourceBytesLabel\(\)/i);
  assert.match(html, /chart-byte-status/);
  assert.match(html, /function currentEvidenceExport\(/);
  assert.match(html, /source_bytes_status:data\.source_bytes_status/);
  assert.match(html, /publication_status:data\.publication_status/);
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

test("the pilot build fully validates schema and time-series semantics", () => {
  const outDir = mkdtempSync(join(tmpdir(), "australia-pilot-validation-"));
  const inputPath = join(outDir, "baseline.json");
  const outputPath = join(outDir, "index.html");
  const assertRejected = (value, expected) => {
    writeFileSync(inputPath, JSON.stringify(value));
    assert.throws(
      () => execFileSync(process.execPath, [buildPath, inputPath, outputPath], { stdio: "pipe" }),
      expected,
    );
  };

  const unknownRootField = structuredClone(baseline);
  unknownRootField.internal_notes = "must not become public";
  assertRejected(unknownRootField, /schema validation failed/i);

  for (const unsafeUrl of ["http://example.test/source", "javascript:alert(1)"]) {
    const unsafeSource = structuredClone(baseline);
    unsafeSource.source.archive_url = unsafeUrl;
    assertRejected(unsafeSource, /schema validation failed/i);
  }

  const wrongSeriesCount = structuredClone(baseline);
  wrongSeriesCount.scope.series_count += 1;
  assertRejected(wrongSeriesCount, /semantic validation failed.*series_count/i);

  const duplicateSeries = structuredClone(baseline);
  duplicateSeries.series.push(structuredClone(duplicateSeries.series[0]));
  duplicateSeries.scope.series_count += 1;
  assertRejected(duplicateSeries, /semantic validation failed.*unique/i);

  const undeclaredOccupation = structuredClone(baseline);
  undeclaredOccupation.series[0].occupation_code = "9999";
  assertRejected(undeclaredOccupation, /semantic validation failed.*not declared in scope/i);

  const unordered = structuredClone(baseline);
  unordered.series[0].recent_observations.reverse();
  assertRejected(unordered, /semantic validation failed.*strictly increasing/i);

  const duplicatePoint = structuredClone(baseline);
  duplicatePoint.series[0].recent_observations.splice(
    1,
    0,
    structuredClone(duplicatePoint.series[0].recent_observations[0]),
  );
  assertRejected(duplicatePoint, /semantic validation failed.*strictly increasing/i);

  const staleLatest = structuredClone(baseline);
  staleLatest.series[0].latest.value += 1;
  assertRejected(staleLatest, /semantic validation failed.*latest.*last observation/i);

  const falseTwelveMonth = structuredClone(baseline);
  falseTwelveMonth.series[0].change_12m.absolute += 1;
  assertRejected(falseTwelveMonth, /semantic validation failed.*change_12m.*observations/i);

  const falseSixtyMonth = structuredClone(baseline);
  falseSixtyMonth.series[0].change_60m.absolute += 1;
  assertRejected(falseSixtyMonth, /semantic validation failed.*change_60m.*observations/i);

  const lateRelease = structuredClone(baseline);
  lateRelease.source.released_at = "2099-01-01";
  assertRejected(lateRelease, /semantic validation failed.*released_at.*retrieved_at/i);

  const lateAvailability = structuredClone(baseline);
  lateAvailability.source.release_availability.first_seen_at_utc = "2099-01-01T00:00:00Z";
  assertRejected(lateAvailability, /semantic validation failed.*release availability.*retrieved_at/i);

  const missingAvailability = structuredClone(baseline);
  delete missingAvailability.source.release_availability;
  assertRejected(missingAvailability, /schema validation failed/i);

  const forgedSource = structuredClone(baseline);
  forgedSource.source.title = "Official observed employment census";
  assertRejected(forgedSource, /schema validation failed|semantic validation failed.*source metadata.*pinned policy/i);

  const forgedDisplay = structuredClone(baseline);
  forgedDisplay.public_warning = "No limitations.";
  assertRejected(forgedDisplay, /semantic validation failed.*display metadata.*pinned policy/i);
});

test("the Australia baseline pins unverified publication and display/source identity", () => {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  assert.equal(baseline.publication_status, "research_draft_unverified");
  assert.equal(baseline.source_bytes_status, "not_retained_unverified");
  assert.equal(policy.publication_status, baseline.publication_status);
  assert.equal(policy.source_bytes_status, baseline.source_bytes_status);
  assert.equal(policy.source.title, baseline.source.title);
  assert.equal(policy.display.public_warning, baseline.public_warning);
});
