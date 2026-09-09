import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const experimentRoot = resolve(repositoryRoot, "experiments/observatory-comparison");
const renderBuilder = resolve(experimentRoot, "render.mjs");
const parityModule = resolve(experimentRoot, "render-parity.mjs");
const renderManifestPath = resolve(experimentRoot, "rendered/render-manifest.json");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("both rendered self-serve arms are reproducible", () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, [renderBuilder, "--check"], {
    cwd: repositoryRoot,
    stdio: "pipe",
  }));
});

test("template parity binds facts, states, forecast, authority and planned viewing time", async () => {
  const { assessRenderedParity } = await import(parityModule);
  const result = assessRenderedParity(readJson(renderManifestPath), { rootDir: repositoryRoot });

  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.template_parity_assessed, true);
  assert.equal(result.material_fact_parity, true);
  assert.equal(result.state_meaning_parity, true);
  assert.equal(result.forecast_boundary_parity, true);
  assert.equal(result.authority_boundary_parity, true);
  assert.equal(result.exposure_time_parity, true);
  assert.equal(result.comprehension_assessed, false);
  assert.equal(result.recruitment_allowed, false);
  assert.equal(result.authority_effect, "none");
});

test("both mock-ups lead with their fictional, non-release boundary", () => {
  const manifest = readJson(renderManifestPath);
  for (const arm of manifest.arms) {
    const html = readFileSync(resolve(repositoryRoot, arm.rendered_output_ref.path), "utf8");
    assert.match(html, /FICTIONAL TEST DATA\. NOT A PUBLIC RELEASE/i);
    assert.match(html, /Study mock-up:/i);
    assert.match(html, /Planned viewing time: 8 minutes, timer inactive/i);
    assert.match(html, /There is no real warning, service, decision or authorised action/i);
    assert.match(html, /affected-party status/i);
    assert.match(html, /have not reviewed the goal, threshold, labels or proposed response/i);
    assert.match(html, /No approved correction service exists for this mock-up/i);
    assert.doesNotMatch(html, /<h1>Conventional statistical release<\/h1>/i);
    assert.doesNotMatch(html, /<h1>Transition Observatory release<\/h1>/i);
  }
});

test("both mock-ups style the plural state material category they render", () => {
  const manifest = readJson(renderManifestPath);
  for (const arm of manifest.arms) {
    const html = readFileSync(resolve(repositoryRoot, arm.rendered_output_ref.path), "utf8");
    assert.match(html, /\.states\{/);
    assert.doesNotMatch(html, /\.state\{/);
    assert.match(html, /class="material states"/);
  }
});

test("visible fact omission fails even when embedded metadata is unchanged", async () => {
  const { assessRenderedParity } = await import(parityModule);
  const manifest = readJson(renderManifestPath);
  const conventionalPath = resolve(repositoryRoot, manifest.arms[0].rendered_output_ref.path);
  const conventional = readFileSync(conventionalPath, "utf8");
  const attacked = conventional.replace(
    /<article data-material-id="state\.unknown"[^>]*>[\s\S]*?<\/article>/,
    "",
  );
  const result = assessRenderedParity(manifest, {
    rootDir: repositoryRoot,
    renderedDocuments: new Map([[manifest.arms[0].arm_id, attacked]]),
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "VISIBLE_MATERIAL_MISMATCH"));
});

test("swapped state meaning, forecast boundary, authority or exposure fails closed", async () => {
  const { assessRenderedParity } = await import(parityModule);
  const manifest = readJson(renderManifestPath);
  const conventionalPath = resolve(repositoryRoot, manifest.arms[0].rendered_output_ref.path);
  const conventional = readFileSync(conventionalPath, "utf8");
  const attacks = [
    ["STATE_MEANING_MISMATCH", (html) => html.replace(
      "Eligible evidence is insufficient.",
      "The evidence proves the route is safe.",
    )],
    ["FORECAST_BOUNDARY_MISMATCH", (html) => html.replace(
      "forecast-probability-not-current-if-state",
      "forecast-probability-is-current-if-state",
    )],
    ["AUTHORITY_BOUNDARY_MISMATCH", (html) => html.replace(
      "There is no real warning, service, decision or authorised action.",
      "Action authorised",
    )],
    ["EXPOSURE_TIME_MISMATCH", (html) => html.replace(
      'data-exposure-seconds="480"',
      'data-exposure-seconds="120"',
    )],
  ];

  for (const [expectedCode, attack] of attacks) {
    const result = assessRenderedParity(manifest, {
      rootDir: repositoryRoot,
      renderedDocuments: new Map([[manifest.arms[0].arm_id, attack(conventional)]]),
      ignoreOutputHashes: true,
    });
    assert.equal(result.valid, false, expectedCode);
    assert.ok(result.errors.some(({ code }) => code === expectedCode),
      `${expectedCode}: ${JSON.stringify(result.errors)}`);
  }
});

test("rendered parity rejects unregistered manifest and arm claims", async () => {
  const { assessRenderedParity } = await import(parityModule);
  const attacks = [
    (manifest) => {
      manifest.public_recommendation = "Treat this synthetic path as ready.";
    },
    (manifest) => {
      manifest.arms[0].interpretation = "Preferred interface";
    },
    (manifest) => {
      manifest.arms[0].rendered_output_ref.label = "Official release";
    },
  ];

  for (const attack of attacks) {
    const manifest = readJson(renderManifestPath);
    attack(manifest);
    const result = assessRenderedParity(manifest, { rootDir: repositoryRoot });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === "RENDER_MANIFEST_SHAPE_INVALID"),
      JSON.stringify(result.errors));
  }
});

test("rendered parity rejects relabelled contract identity and classification", async () => {
  const { assessRenderedParity } = await import(parityModule);
  const attacks = [
    ["schema_version", "9.0.0"],
    ["manifest_id", "rendered-comparison.approved"],
    ["classification", "public-release"],
  ];

  for (const [field, value] of attacks) {
    const manifest = readJson(renderManifestPath);
    manifest[field] = value;
    const result = assessRenderedParity(manifest, { rootDir: repositoryRoot });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === "RENDER_MANIFEST_IDENTITY_INVALID"),
      `${field}: ${JSON.stringify(result.errors)}`);
  }
});
