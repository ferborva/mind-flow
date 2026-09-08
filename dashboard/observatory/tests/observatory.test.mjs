import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = process.cwd();
const observatoryRoot = join(repoRoot, "dashboard/observatory");
const bundlePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function withFixtureRepository(run) {
  const root = mkdtempSync(join(tmpdir(), "mind-flow-observatory-"));
  try {
    for (const directory of ["contracts", "forecasts", "integration", "paths", "preparation", "signals"]) {
      cpSync(join(repoRoot, directory), join(root, directory), { recursive: true });
    }
    return run(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("the Round 4 projection builds reproducibly from exact bundle artifacts", () => {
  execFileSync(process.execPath, [join(observatoryRoot, "build.mjs"), "--check"], {
    cwd: repoRoot,
    stdio: "pipe",
  });
});

test("projection keeps current evidence, forecast and authority separate", async () => {
  const { buildObservatoryModel } = await import(join(observatoryRoot, "build.mjs"));
  const model = buildObservatoryModel(repoRoot);

  assert.equal(model.meta.sourceBundleId, "bundle.round-04.worker-option.pre-projection");
  assert.equal(model.condition.currentState, "true");
  assert.equal(model.condition.empiricalTruthEstablished, false);
  assert.equal(model.forecast.probability, 0.62);
  assert.equal(model.forecast.relationToCurrentState, "orthogonal-to-current-computed-if-state");
  assert.equal(model.authority.effect, "none");
  assert.equal(model.authority.actionAuthorised, false);
  assert.equal(model.preparation.currentlyEligible, false);
  assert.equal(model.meta.bundleCoherent, true);
  assert.equal(model.condition.evaluationSource, "recomputed-from-executable-if-kernel");
  assert.equal(model.paths.crisisVerdictProduced, false);
});

test("projection rejects a copied forecast receipt co-mutated with its bundle digest", async () => {
  const { buildObservatoryModel } = await import(join(observatoryRoot, "build.mjs"));

  withFixtureRepository((root) => {
    const bundleFile = join(root, bundlePath);
    const bundle = JSON.parse(readFileSync(bundleFile, "utf8"));
    const forecastRef = bundle.artifacts.find(({ role }) => role === "forecast");
    const forecastFile = join(root, forecastRef.path);
    const forecast = JSON.parse(readFileSync(forecastFile, "utf8"));
    forecast.issue_basis.issue_evaluation_receipt.computed_rule_state.state = "false";
    const forecastBytes = `${JSON.stringify(forecast, null, 2)}\n`;
    writeFileSync(forecastFile, forecastBytes);
    forecastRef.sha256 = digest(forecastBytes);
    writeFileSync(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`);

    assert.throws(
      () => buildObservatoryModel(root),
      /Transition bundle is not coherent|Forecast receipt drifted from recomputed kernel evaluation/,
    );
  });
});

test("projection exposes the complete outcome grammar and five-state branch partition", async () => {
  const { buildObservatoryModel } = await import(join(observatoryRoot, "build.mjs"));
  const model = buildObservatoryModel(repoRoot);

  assert.deepEqual(Object.keys(model.condition.grammar), [
    "who",
    "verb",
    "outcome",
    "standard",
    "place",
    "period",
    "if",
  ]);
  assert.deepEqual(
    model.states.map(({ id }) => id),
    ["true", "false", "unknown", "stale", "conflicted"],
  );
  assert.equal(model.evolution.definition.changeCount, 5);
  assert.equal(model.evolution.evidence.eventCount, 11);
  assert.equal(model.paths.competitors.length, 2);
  assert.deepEqual(
    model.paths.nonTrueDecisionGates.map(({ id }) => id),
    ["false", "unknown", "stale", "conflicted"],
  );
  assert.equal("crisisCrossings" in model.paths, false);
});

test("static experience is accessible, responsive and dependency-free", () => {
  const html = readFileSync(join(observatoryRoot, "index.html"), "utf8");
  const css = readFileSync(join(observatoryRoot, "styles.css"), "utf8");
  const js = readFileSync(join(observatoryRoot, "app.js"), "utf8");

  assert.match(html, /<main id="main-content"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<script src="\.\/data\.js"><\/script>/);
  assert.match(html, /<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html + css + js, /https?:\/\//);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
  assert.match(js, /ArrowLeft/);
  assert.match(js, /aria-labelledby/);
  assert.match(js, /Hypothetical branch/);
  assert.doesNotMatch(html, /Crisis crossings|Real alternatives|living contract/i);
  assert.doesNotMatch(html, /Track what must remain true/i);
  assert.doesNotMatch(html, /Every surface has a source/i);
  assert.match(html, /candidate conditions/i);
  assert.match(html, /Inspect the registered source chain/i);
  assert.match(html, /Non-true decision gates/);

  const dim = css.match(/--dim:\s*(#[a-f\d]{6})/i)[1];
  assert.ok(contrastRatio(dim, "#08100e") >= 4.5, "dim text must meet WCAG AA contrast");
  assert.doesNotMatch(css, /(?:font|font-size):\s*(?:8|9|10)px/);
});

test("missing generated data fails closed with an accessible diagnostic", () => {
  const js = readFileSync(join(observatoryRoot, "app.js"), "utf8");
  const alert = { hidden: true, textContent: "" };
  const document = {
    body: { dataset: {} },
    querySelector: (selector) => selector === "#observatory-error" ? alert : null,
  };

  vm.runInNewContext(js, { document, window: {} });

  assert.equal(document.body.dataset.projectionState, "failed");
  assert.equal(alert.hidden, false);
  assert.match(alert.textContent, /could not be verified/i);
});
