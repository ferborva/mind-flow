import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const templatePath = join(dashboard, "web", "index.template.html");
const snapshotPath = join(dashboard, "snapshots", "2026-09-07.json");
const schemaPath = join(dashboard, "schema", "snapshot.schema.json");
const schemaReadmePath = join(dashboard, "schema", "SCHEMA.md");
const dashboardReadmePath = join(dashboard, "README.md");
const buildPath = join(dashboard, "tools", "build.mjs");
const fetchSnapshotPath = join(dashboard, "tools", "fetch_snapshot.py");
const rawInputManifestPath = join(dashboard, "evidence", "fixtures", "world-bank-input.json");

const template = readFileSync(templatePath, "utf8");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

function assertBuildRejects(value, inputPath, outputPath, expected) {
  writeFileSync(inputPath, JSON.stringify(value));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, inputPath, outputPath], { stdio: "pipe" }),
    expected,
  );
}

function relativeLuminance(rgb) {
  const channels = rgb.map((channel) => channel / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrast(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function cssValue(block, token) {
  return block.match(new RegExp(`${token}:([^;]+)`, "i"))?.[1].trim();
}

function cssColour(value, backdrop = [255, 255, 255]) {
  const hex = /^#([a-f0-9]{6})$/i.exec(value);
  if (hex) return hex[1].match(/../g).map((channel) => parseInt(channel, 16));
  const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/i.exec(value);
  assert.ok(rgba, `unsupported CSS colour ${value}`);
  const alpha = Number(rgba[4]);
  return rgba.slice(1, 4).map((channel, index) =>
    (Number(channel) * alpha) + (backdrop[index] * (1 - alpha))
  );
}

test("the public dashboard has a complete accessible HTML shell and print basics", () => {
  assert.match(template, /^<!doctype html>/i);
  assert.match(template, /<html lang=["']en["']>/i);
  assert.match(template, /<head>/i);
  assert.match(template, /<meta charset=["']utf-8["']>/i);
  assert.match(
    template,
    /<meta name=["']viewport["'] content=["']width=device-width, initial-scale=1["']>/i,
  );
  assert.match(template, /<body>/i);
  assert.match(template, /@media print/i);
  assert.match(template, /break-inside:\s*avoid/i);
  assert.match(template, /<\/body>\s*<\/html>\s*$/i);
});

test("small secondary text tokens meet WCAG AA contrast on their surfaces", () => {
  const rootBlocks = [...template.matchAll(/:root\{([^}]*)\}/gs)];
  const dark = rootBlocks.at(-1)?.[1];
  const light = [...template.matchAll(/:root\[data-theme="light"\]\{([^}]*)\}/gs)].at(-1)?.[1];
  assert.ok(light && dark, "theme token blocks must be present");
  for (const theme of [light, dark]) {
    const plane = cssColour(cssValue(theme, "--plane"));
    const foreground = cssColour(cssValue(theme, "--ink-3"), plane);
    for (const surface of ["--plane", "--surface", "--surface-2"]) {
      const background = cssColour(cssValue(theme, surface), plane);
      assert.ok(
        contrast(foreground, background) >= 4.5,
        `${surface} secondary-text contrast must be at least 4.5:1`,
      );
    }
  }
});

test("the observatory leads with status, public meaning, IFs, paths, action and evidence", () => {
  for (const id of [
    "now",
    "trajectory",
    "condition-map",
    "possible-paths",
    "action-deck",
    "scenario-lab",
    "signal-atlas",
    "accountability",
  ]) {
    assert.match(template, new RegExp(`id=["']${id}["']`));
  }
  assert.match(template, /Capability is not access/);
  assert.match(template, /aria-live=["']polite["']/);
  assert.match(template, /id=["']if-claim["']/);
  assert.match(template, /id=["']condition-decision["']/);
  assert.match(template, /function renderConditionMap\(/);
});

test("the first screen discloses prototype authority and the seven-part update", () => {
  for (const label of [
    "PROTOTYPE",
    "AGENT PROPOSAL",
    "REQUIRES FERNANDO REVIEW",
    "OBSERVED",
    "AFFECTED",
    "INFERRED",
    "IF CHANGED",
    "ACTION AND OWNER",
    "FALSIFIER",
    "NEXT CHECK",
  ]) {
    assert.match(template, new RegExp(label, "i"), `missing ${label}`);
  }
  assert.match(template, /No authorised action/i);
  assert.match(template, /No psychohistory/i);
  assert.match(template, /id=["']now-observed["']/i);
  assert.match(template, /function renderNow\(/);
  assert.doesNotMatch(template, /Six measured and two derived global signals/i);
});

test("the self-contained public page has no remote font dependency", () => {
  assert.doesNotMatch(template, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
});

test("public language does not turn imperfect proxies into verdicts", () => {
  assert.doesNotMatch(template, /not yet an Engels['’] Pause/i);
  assert.doesNotMatch(template, /10-point attention line/i);
  assert.doesNotMatch(template, /choosing to work/i);

  const sourceText = JSON.stringify(snapshot);
  for (const rejected of [
    /Abundance requires this to go negative/i,
    /wrong side of the money condition/i,
    /single clearest measure/i,
    /last mile is the hardest/i,
    /predicts that the residue gets dearer/i,
    /will people still consent to the transition/i,
    /politics turns/i,
  ]) {
    assert.doesNotMatch(sourceText, rejected);
  }

  const participation = snapshot.signals.find((signal) => signal.id === "participation");
  assert.match(participation.question, /labour.market participation/i);
  assert.match(participation.caveats.join(" "), /does not reveal why/i);

  const baseline = snapshot.signals.find((signal) => signal.id === "engels-divergence");
  assert.match(baseline.name, /baseline/i);
  assert.match(baseline.caveats.join(" "), /not.*like.for.like/i);

  const inflation = snapshot.signals.find((signal) => signal.id === "inflation");
  assert.equal(inflation.direction, "neutral");
  assert.doesNotMatch(inflation.trouble_reading, /positive|persist/i);
});

test("failure scenarios do not predict or pathologise democratic responses", () => {
  assert.doesNotMatch(template, /Likely movement:/i);
  assert.doesNotMatch(template, /Crisis radar/i);
  assert.doesNotMatch(template, /warning signals live/i);
  assert.doesNotMatch(template, /id=["']crisis-chart["']/i);
  assert.doesNotMatch(template, /class=["'][^"']*orbit/i);
  assert.doesNotMatch(template, /cov\.ready\s*\+\s*["']\/["']\s*\+\s*cov\.total/);
  assert.match(template, /Possible failure modes/i);
  for (const crisis of snapshot.crises) {
    assert.equal("movement" in crisis, false, `${crisis.id}: remove movement forecast`);
    assert.ok(
      crisis.possible_public_responses?.length >= 1,
      `${crisis.id}: possible responses must remain plural and unpredicted`,
    );
  }
});

test("scenario arithmetic cannot masquerade as a forecast or trigger", () => {
  assert.match(template, /SCENARIO, NOT A FORECAST/i);
  assert.doesNotMatch(template, /transparent projection/i);
  assert.doesNotMatch(template, /attention-worthy gap/i);
  assert.match(template, /id=["']scenario-class["']/i);
  assert.doesNotMatch(template, /scenarioSeededFor\s*!==\s*entity\)\s*seedScenario/);
});

test("public action options begin unselected and label every proposal", () => {
  assert.match(template, /actor\s*=\s*null/);
  assert.match(template, /Choose a role to inspect options/i);
  assert.match(template, /PROPOSAL, NOT AUTHORISED/i);
  assert.doesNotMatch(JSON.stringify(snapshot.playbooks), /named case owner|the appeal path/i);
});

test("entity selection never silently falls back to another geography", () => {
  assert.doesNotMatch(template, /if\s*\(!show\.length\)\s*show\s*=\s*series\.filter/);
  assert.doesNotMatch(template, /if\s*\(!show\.length\)\s*show\s*=\s*\[series\[0\]\]/);
  assert.match(template, /No data for this signal in/i);
  assert.match(template, /function latestForSelection\(/);
  assert.match(template, /public_update:\{observed:/);
});

test("snapshot carries actionable crisis and actor contracts", () => {
  assert.match(snapshot.schema_version, /^1\.5\./);
  assert.ok(snapshot.crises.length >= 5);
  assert.ok(Object.keys(snapshot.playbooks).length >= 5);

  const signalIds = new Set(snapshot.signals.map((signal) => signal.id));
  for (const crisis of snapshot.crises) {
    assert.ok(crisis.id && crisis.name && crisis.condition);
    assert.ok(["unscored", "watch", "activated"].includes(crisis.status));
    assert.ok(crisis.leading_signals.length > 0);
    for (const id of crisis.leading_signals) assert.ok(signalIds.has(id), `${crisis.id}: ${id}`);
    for (const tier of ["prepare", "protect", "recover"]) {
      assert.ok(crisis.actions[tier], `${crisis.id}: missing ${tier}`);
    }
  }

  for (const actions of Object.values(snapshot.playbooks)) {
    for (const tier of ["now", "warning", "crisis"]) {
      assert.ok(actions[tier]?.length, `playbook missing ${tier}`);
    }
  }
});

test("the IF map is a scoped decision record rather than static vocabulary", () => {
  const path = snapshot.if_path;
  assert.ok(path, "if_path is required");
  for (const field of ["who", "verb", "outcome", "standard", "place", "period"]) {
    assert.ok(path.claim[field], `if_path.claim.${field} is required`);
  }
  assert.equal(path.claim.status, "unresolved");
  assert.equal(path.conditions.length, 5);
  assert.deepEqual(
    path.conditions.map(({ id }) => id),
    snapshot.public_update.condition_change.condition_ids,
  );
  for (const condition of path.conditions) {
    assert.equal(condition.state, "unknown");
    assert.ok(condition.summary && condition.evidence_grade && condition.strongest_challenge);
    assert.ok(condition.next_observation.event && condition.next_observation.failure_handling);
  }
  assert.equal(path.decision.result, "no_decision");
  assert.deepEqual(path.decision.eligible_actions, []);
  assert.doesNotMatch(template, /<article class="condition-card"><span class="ordinal">IF 01/);
});

test("snapshot carries one complete, bounded public update contract", () => {
  const update = snapshot.public_update;
  assert.ok(update, "public_update is required");
  for (const field of [
    "observed",
    "affected",
    "inferred",
    "condition_change",
    "action",
    "falsifier",
    "next_check",
  ]) assert.ok(update[field], `public_update.${field} is required`);

  assert.equal(update.scope.entity, "OWID_WRL");
  assert.equal(update.observed.epistemic_class, "derived");
  assert.match(update.observed.uncertainty, /not quantified|no interval/i);
  assert.equal(update.affected.status, "unknown");
  assert.equal(update.inferred.inference_class, "descriptive");
  assert.equal(update.condition_change.changed, false);
  assert.equal(update.action.authorization_state, "none");
  assert.equal(update.action.owner, null);
  assert.match(update.falsifier.implication, /withdraw|narrow|reverse/i);
  assert.equal(update.next_check.related_to_inference, false);
});

test("availability is separate from point-level epistemic class", () => {
  const allowedClasses = new Set([
    "observed",
    "derived",
    "modelled_estimate",
    "nowcast",
    "forecast",
  ]);

  for (const signal of snapshot.signals) {
    assert.ok(
      ["available", "not_measured", "unavailable"].includes(signal.status),
      `${signal.id}: status must describe availability, not epistemic class`,
    );
    for (const series of signal.series) {
      for (const point of series.points) {
        assert.equal(point.length, 3, `${signal.id}: every point must carry an epistemic class`);
        assert.ok(allowedClasses.has(point[2]), `${signal.id}: invalid class ${point[2]}`);
      }
    }
    if (signal.status === "available") {
      assert.ok(signal.source.adapter?.version, `${signal.id}: adapter version is required`);
      assert.ok(signal.source.adapter?.selected_fields.length, `${signal.id}: selected fields are required`);
    }
    if (signal.latest) {
      assert.ok(allowedClasses.has(signal.latest.epistemic_class));
    }
  }

  for (const id of ["poverty-30", "poverty-830"]) {
    const signal = snapshot.signals.find((candidate) => candidate.id === id);
    const tail = signal.series.flatMap(({ points }) => points.filter(([year]) => year >= 2025));
    assert.ok(tail.length > 0, `${id}: expected a 2025/2026 tail`);
    assert.ok(tail.every(([, , epistemicClass]) => epistemicClass === "nowcast"));
  }

  const participation = snapshot.signals.find(({ id }) => id === "participation");
  const participationTail = participation.series
    .flatMap(({ points }) => points.filter(([year]) => year >= 2025));
  assert.ok(participationTail.length > 0, "participation: expected a 2025 tail");
  assert.ok(participationTail.every(([, , epistemicClass]) => epistemicClass === "modelled_estimate"));

  assert.match(template, /function epistemicLabel\(/);
  assert.match(template, /selectedLatest\.year\+" "\+epistemicLabel\(selectedLatest\.epistemic_class\)/);
  assert.match(template, /epistemicLabel\(p\[2\]\)/);
  assert.equal(snapshot.reproducibility.raw_input_status, "not_pinned");
  assert.equal(snapshot.reproducibility.snapshot_rebuild_status, "not_verified");
  assert.match(snapshot.reproducibility.residual_gap, /bit-for-bit rebuild.*not passed/i);
});

test("content-addressed raw input is verified before an adapter transforms it", () => {
  const transformed = JSON.parse(execFileSync(
    "python3",
    [fetchSnapshotPath, "--verify-input-manifest", rawInputManifestPath],
    { encoding: "utf8" },
  ));
  assert.deepEqual(transformed, {
    OWID_WRL: [[2025, 61.25, "modelled_estimate"]],
  });

  const fixture = JSON.parse(readFileSync(rawInputManifestPath, "utf8"));
  assert.match(fixture.raw_input.id, /^sha256:[a-f0-9]{64}$/);
  assert.equal(fixture.raw_input.sha256, fixture.raw_input.id.slice("sha256:".length));
  assert.ok(fixture.raw_input.adapter.version);
  assert.ok(fixture.raw_input.adapter.selected_fields.includes("value"));

  const outDir = mkdtempSync(join(tmpdir(), "seldon-raw-evidence-"));
  const mutatedRawPath = join(outDir, "mutated.json");
  const sourceRawPath = resolve(dirname(rawInputManifestPath), fixture.raw_input.path);
  copyFileSync(sourceRawPath, mutatedRawPath);
  writeFileSync(mutatedRawPath, `${readFileSync(mutatedRawPath, "utf8")}not-json`);
  fixture.raw_input.path = "mutated.json";
  const mutatedManifestPath = join(outDir, "manifest.json");
  writeFileSync(mutatedManifestPath, JSON.stringify(fixture));
  assert.throws(
    () => execFileSync(
      "python3",
      [fetchSnapshotPath, "--verify-input-manifest", mutatedManifestPath],
      { encoding: "utf8", stdio: "pipe" },
    ),
    /sha256 mismatch.*before transform/i,
  );

  const unsupported = structuredClone(fixture);
  unsupported.raw_input.path = mutatedRawPath;
  unsupported.raw_input.sha256 = fixture.raw_input.sha256;
  unsupported.raw_input.adapter.version = "999.0.0";
  const unsupportedManifestPath = join(outDir, "unsupported.json");
  copyFileSync(sourceRawPath, mutatedRawPath);
  writeFileSync(unsupportedManifestPath, JSON.stringify(unsupported));
  assert.throws(
    () => execFileSync(
      "python3",
      [fetchSnapshotPath, "--verify-input-manifest", unsupportedManifestPath],
      { encoding: "utf8", stdio: "pipe" },
    ),
    /unsupported adapter version/i,
  );
});

test("the JSON schema actually validates the current snapshot contract", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  assert.equal(validate(snapshot), true, ajv.errorsText(validate.errors));

  const malformed = structuredClone(snapshot);
  malformed.signals[0].status = "looks-good";
  assert.equal(validate(malformed), false, "invalid signal state must fail validation");

  const unclassifiedPoint = structuredClone(snapshot);
  unclassifiedPoint.signals[0].series[0].points[0].pop();
  assert.equal(validate(unclassifiedPoint), false, "a point without an epistemic class must fail validation");

  const unsupportedClosureClaim = structuredClone(snapshot);
  unsupportedClosureClaim.reproducibility.snapshot_rebuild_status = "verified_bit_for_bit";
  assert.equal(validate(unsupportedClosureClaim), false, "bit-for-bit closure cannot be claimed by this slice");

  const unknownRootField = structuredClone(snapshot);
  unknownRootField.internal_cohort_records = [{ name: "must not become public" }];
  assert.equal(validate(unknownRootField), false, "unknown root fields must fail validation");

  for (const unsafeUrl of ["http://example.test/source", "javascript:alert(1)"]) {
    const unsafeSource = structuredClone(snapshot);
    unsafeSource.signals[0].source.url = unsafeUrl;
    assert.equal(validate(unsafeSource), false, `unsafe source URL must fail validation: ${unsafeUrl}`);
  }
});

test("the build enforces series, headline, latest and action-authority semantics", () => {
  const outDir = mkdtempSync(join(tmpdir(), "seldon-observatory-semantics-"));
  const inputPath = join(outDir, "snapshot.json");
  const outputPath = join(outDir, "index.html");

  const unordered = structuredClone(snapshot);
  unordered.signals[0].series[0].points.reverse();
  assertBuildRejects(unordered, inputPath, outputPath, /semantic validation failed.*strictly increasing/i);

  const duplicatePoint = structuredClone(snapshot);
  duplicatePoint.signals[0].series[0].points.splice(
    1,
    0,
    duplicatePoint.signals[0].series[0].points[0],
  );
  assertBuildRejects(duplicatePoint, inputPath, outputPath, /semantic validation failed.*strictly increasing/i);

  const undeclaredSeriesEntity = structuredClone(snapshot);
  undeclaredSeriesEntity.signals[0].series[0].entity = "UNDECLARED";
  assertBuildRejects(undeclaredSeriesEntity, inputPath, outputPath, /semantic validation failed.*not declared/i);

  const undeclaredLatestEntity = structuredClone(snapshot);
  undeclaredLatestEntity.signals[0].latest.entity = "UNDECLARED";
  assertBuildRejects(undeclaredLatestEntity, inputPath, outputPath, /semantic validation failed.*latest entity.*not declared/i);

  const staleLatest = structuredClone(snapshot);
  staleLatest.signals[0].latest.value += 1;
  assertBuildRejects(staleLatest, inputPath, outputPath, /semantic validation failed.*latest.*last point/i);

  const staleLatestClass = structuredClone(snapshot);
  staleLatestClass.signals[0].latest.epistemic_class = "forecast";
  assertBuildRejects(staleLatestClass, inputPath, outputPath, /semantic validation failed.*latest.*last point/i);

  const contradictedNowcast = structuredClone(snapshot);
  const poverty = contradictedNowcast.signals.find(({ id }) => id === "poverty-30");
  poverty.series.flatMap(({ points }) => points).find(([year]) => year >= 2025)[2] = "observed";
  assertBuildRejects(
    contradictedNowcast,
    inputPath,
    outputPath,
    /semantic validation failed.*class observed contradicts adapter rule nowcast/i,
  );

  const fixture = JSON.parse(readFileSync(rawInputManifestPath, "utf8")).raw_input;
  const mismatchedRawInput = structuredClone(snapshot);
  fixture.path = "evidence/raw/world-bank-sample.json";
  fixture.id = `sha256:${"0".repeat(64)}`;
  fixture.sha256 = "0".repeat(64);
  mismatchedRawInput.reproducibility.raw_input_status = "captured_and_hash_verified";
  mismatchedRawInput.reproducibility.raw_inputs = [fixture];
  assertBuildRejects(
    mismatchedRawInput,
    inputPath,
    outputPath,
    /sha256 mismatch before transform/i,
  );

  const misalignedHeadline = structuredClone(snapshot);
  const headline = misalignedHeadline.signals.find(({ id }) => id === "engels-divergence");
  headline.series
    .find(({ entity, measure }) => entity === "AUS" && measure === "Labour income per capita")
    .points.pop();
  assertBuildRejects(misalignedHeadline, inputPath, outputPath, /semantic validation failed.*headline.*aligned/i);

  for (const authorizationState of ["authorised", "active"]) {
    const incompleteAuthority = structuredClone(snapshot);
    incompleteAuthority.public_update.action.authorization_state = authorizationState;
    assertBuildRejects(
      incompleteAuthority,
      inputPath,
      outputPath,
      /semantic validation failed.*complete owner, authority, help route and appeal route/i,
    );
  }

  const completeAuthority = structuredClone(snapshot);
  Object.assign(completeAuthority.public_update.action, {
    authorization_state: "active",
    owner: "Named owner",
    authority: "Recorded decision authority",
    help_route: "https://example.test/help",
    appeal_route: "https://example.test/appeal",
  });
  writeFileSync(inputPath, JSON.stringify(completeAuthority));
  assert.doesNotThrow(() => execFileSync(process.execPath, [buildPath, inputPath, outputPath]));
});

test("the build produces a self-contained page with parseable application code", () => {
  const outDir = mkdtempSync(join(tmpdir(), "seldon-observatory-"));
  const outputPath = join(outDir, "index.html");
  execFileSync(process.execPath, [buildPath, snapshotPath, outputPath]);
  const built = readFileSync(outputPath, "utf8");

  assert.doesNotMatch(built, /__SNAPSHOT__/);
  const data = built.match(/<script id="snapshot-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(data, "embedded snapshot is missing");
  assert.doesNotThrow(() => JSON.parse(data[1]));

  const scripts = [...built.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const applicationCode = scripts.at(-1)?.[1];
  assert.ok(applicationCode, "application script is missing");
  assert.doesNotThrow(() => new Function(applicationCode));

  const invalidPath = join(outDir, "invalid.json");
  const malformed = structuredClone(snapshot);
  delete malformed.public_update;
  writeFileSync(invalidPath, JSON.stringify(malformed));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, invalidPath, outputPath], { stdio: "pipe" }),
    /Dashboard build failed|validation/i,
  );

  const wrongVersion = structuredClone(snapshot);
  wrongVersion.schema_version = "1.3.0";
  writeFileSync(invalidPath, JSON.stringify(wrongVersion));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, invalidPath, outputPath], { stdio: "pipe" }),
    /Dashboard build failed|validation/i,
  );

  const semanticallyInvalidPath = join(outDir, "semantically-invalid.json");
  const semanticallyInvalid = structuredClone(snapshot);
  semanticallyInvalid.public_update.observed.source_signal_ids.push("missing-signal");
  writeFileSync(semanticallyInvalidPath, JSON.stringify(semanticallyInvalid));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );

  const invalidIfPath = structuredClone(snapshot);
  invalidIfPath.if_path.conditions[0].source_signal_ids.push("missing-signal");
  writeFileSync(semanticallyInvalidPath, JSON.stringify(invalidIfPath));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );

  const mismatchedIfPath = structuredClone(snapshot);
  mismatchedIfPath.public_update.condition_change.condition_ids.reverse();
  writeFileSync(semanticallyInvalidPath, JSON.stringify(mismatchedIfPath));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );

  const contradictoryDecision = structuredClone(snapshot);
  contradictoryDecision.if_path.decision.eligible_actions.push("act-now");
  writeFileSync(semanticallyInvalidPath, JSON.stringify(contradictoryDecision));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );

  const falseHelpRoute = structuredClone(snapshot);
  falseHelpRoute.public_update.action.help_route = "service-that-does-not-exist";
  writeFileSync(semanticallyInvalidPath, JSON.stringify(falseHelpRoute));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );
});

test("operator documentation matches the governed 1.5 snapshot build", () => {
  const readme = readFileSync(dashboardReadmePath, "utf8");
  const schemaReadme = readFileSync(schemaReadmePath, "utf8");
  assert.match(readme, /public_update/);
  assert.match(readme, /build-time.*validation/i);
  assert.match(readme, /Australia evidence room/i);
  assert.match(readme, /release.*blocked/i);
  assert.doesNotMatch(readme, /Load snapshot/i);
  assert.doesNotMatch(readme, /current v2/i);
  assert.match(schemaReadme, /Version 1\.5\.0/);
  assert.match(schemaReadme, /seven-part public update/i);
  assert.match(schemaReadme, /semantic validation/i);
  assert.doesNotMatch(schemaReadme, /No page rebuild required/i);
});
