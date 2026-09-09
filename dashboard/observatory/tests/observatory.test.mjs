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
    for (const directory of ["contracts", "dashboard", "forecasts", "integration", "paths", "preparation", "signals"]) {
      cpSync(join(repoRoot, directory), join(root, directory), { recursive: true });
    }
    for (const file of ["package.json", "package-lock.json"]) {
      cpSync(join(repoRoot, file), join(root, file));
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
  assert.deepEqual(model.meta.status, {
    programmeIteration: "06",
    dataFixture: "04, synthetic",
    interfaceStudy: "05",
    publicRelease: "none",
  });
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
  assert.deepEqual(
    model.states.map(({ publicLabel }) => publicLabel),
    [
      "Registered rule passed",
      "Registered rule did not pass",
      "No eligible evidence",
      "Evidence out of date",
      "Sources conflict",
    ],
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

test("projection exposes every programme gate without collapsing readiness to a score", async () => {
  const { buildObservatoryModel } = await import(join(observatoryRoot, "build.mjs"));
  const model = buildObservatoryModel(repoRoot);

  assert.deepEqual(
    model.programmeGates.map(({ id }) => id),
    [
      "integrity",
      "scope",
      "history",
      "truth",
      "freshness",
      "evidence",
      "forecast",
      "preparation",
      "authority",
      "publication",
    ],
  );
  assert.deepEqual(
    model.programmeGates
      .filter(({ class: gateClass }) => gateClass === "real-world")
      .map(({ id, state }) => [id, state]),
    [
      ["truth", "closed"],
      ["freshness", "closed"],
      ["authority", "closed"],
      ["publication", "closed"],
    ],
  );
  assert.deepEqual(
    model.programmeGates
      .filter(({ class: gateClass }) => gateClass === "local-fixture")
      .map(({ id, state }) => [id, state]),
    [
      ["integrity", "local-check-reproduced"],
      ["scope", "local-check-reproduced"],
      ["history", "local-check-reproduced"],
      ["evidence", "local-check-reproduced"],
      ["forecast", "local-check-reproduced"],
      ["preparation", "local-check-reproduced"],
    ],
  );
  const evidence = model.programmeGates.find(({ id }) => id === "evidence");
  assert.equal(evidence.label, "Evidence-reference consistency");
  assert.match(evidence.meaning, /identifiers are joined across the synthetic fixture/i);
  assert.match(evidence.ceiling, /does not show that source evidence bytes were acquired/i);
  assert.equal("readinessScore" in model, false);
  assert.ok(model.programmeGates.every(
    ({ source }) => source.path ===
      "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json" &&
      /^sha256:[a-f0-9]{64}$/.test(source.sha256) &&
      source.assessmentOutputPath === `gates.${source.gateId}` &&
      source.assessor.path === "integration/transition-bundle/assess.mjs" &&
      /^sha256:[a-f0-9]{64}$/.test(source.assessor.sha256) &&
      source.assessor.scope === "entrypoint-in-conservative-validation-context" &&
      source.validationContextManifestSha256 === model.validationContext.manifestSha256,
  ));
  assert.equal(model.validationContext.profile, "conservative-local-validation-context-v1");
  assert.match(model.validationContext.manifestSha256, /^sha256:[a-f0-9]{64}$/);
  assert.ok(model.validationContext.files.some(
    ({ path }) => path === "contracts/executable-if/validate.mjs",
  ));
  assert.ok(model.validationContext.files.some(
    ({ path }) => path === "package-lock.json",
  ));
});

test("validation-context digest changes with an imported validator dependency", async () => {
  const { buildValidationContext } = await import(join(observatoryRoot, "build.mjs"));

  withFixtureRepository((root) => {
    const before = buildValidationContext(root);
    const dependency = join(root, "paths/validate.mjs");
    writeFileSync(dependency, `${readFileSync(dependency, "utf8")}\n`);
    const after = buildValidationContext(root);

    assert.notEqual(after.manifestSha256, before.manifestSha256);
  });
});

test("static experience is accessible, responsive and dependency-free", () => {
  const html = readFileSync(join(observatoryRoot, "index.html"), "utf8");
  const css = readFileSync(join(observatoryRoot, "styles.css"), "utf8");
  const js = readFileSync(join(observatoryRoot, "app.js"), "utf8");
  const readme = readFileSync(join(observatoryRoot, "README.md"), "utf8");

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
  assert.match(js, /Hypothetical software branch/);
  assert.doesNotMatch(html, /Crisis crossings|Real alternatives|living contract/i);
  assert.doesNotMatch(html, /Track what must remain true/i);
  assert.doesNotMatch(html, /Every surface has a source/i);
  assert.match(html, /candidate conditions/i);
  assert.match(html, /Local file lineage, not source authentication/i);
  assert.match(html, /Non-true decision gates/);
  assert.match(html, /What the local fixture checks\. What remains closed\./i);
  assert.match(html, /clock is not trusted/i);
  assert.match(html, /No real condition, warning, service, decision or authority exists/i);
  assert.match(html, /id="local-gate-grid"/);
  assert.match(html, /id="real-world-gate-grid"/);
  assert.doesNotMatch(html + js, /readiness score/i);
  assert.doesNotMatch(html + css + js, /structural pass/i);
  assert.doesNotMatch(html, />Current IF evaluation</i);
  assert.doesNotMatch(html, />Preparation review by</i);
  assert.match(js, /programmeGates/);
  assert.match(js, /source\.assessmentOutputPath/);
  assert.match(js, /source\.assessor\.path/);
  assert.match(js, /validationContextManifestSha256/);
  assert.match(js, /INVENTED TEST VALUE/);
  assert.match(html, /DEMONSTRATION ONLY/i);
  assert.match(html, /All observations and the 62% forecast are invented test data/i);
  assert.match(html, /None have reviewed the goal, threshold, labels or proposed response/i);
  assert.match(html, /<title>The Transition Observatory · Programme iteration 06<\/title>/i);
  assert.match(readme, /^# The Transition Observatory · Programme iteration 06/m);
  assert.doesNotMatch(html + readme, /Transition Observatory · Round 04/i);
  assert.match(html, /aria-label="Sample rule output, invented forecast and authority summary"/i);
  assert.match(html, /0 of 4 real-world gates met/i);
  assert.match(html, /6 local code checks passed on invented data/i);
  assert.ok(
    html.indexOf("real-world-gate-grid") < html.indexOf("local-gate-grid"),
    "real-world blockers must precede local software checks",
  );
  assert.match(js, /SAMPLE RULE OUTPUT:/);
  assert.match(js, /state\.publicLabel/);
  assert.match(js, /INVENTED TEST VALUE:/);
  assert.match(js, /There is no real warning, service, decision or authorised action/i);
  assert.match(js, /Local code\/test validation context/i);
  assert.doesNotMatch(js, /`Validation context · \$\{data\.validationContext\.files\.length\} files/);
  assert.doesNotMatch(css, /\.candidate-path\s*\{[^}]*grid-row:\s*span\s+2/i);
  assert.match(
    css,
    /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.branch-display\s*\{[^}]*grid-template-columns:\s*120px\s+minmax\(0,\s*1fr\)/i,
  );
  assert.doesNotMatch(html, /Five states\. Five responses\./i);
  assert.doesNotMatch(html, /Prepare without pretending to decide/i);
  assert.doesNotMatch(html, /Inspect the registered source chain/i);

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
