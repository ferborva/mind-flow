import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const templatePath = join(dashboard, "web", "index.template.html");
const snapshotPath = join(dashboard, "snapshots", "2026-09-08.r3.json");
const predecessorSnapshotPath = join(dashboard, "snapshots", "2026-09-08.r2.json");
const originalLegacySnapshotPath = join(dashboard, "snapshots", "2026-09-07.json");
const correctedLegacySnapshotPath = join(dashboard, "snapshots", "2026-09-07.r2.json");
const firstNextDaySnapshotPath = join(dashboard, "snapshots", "2026-09-08.json");
const snapshotIndexPath = join(dashboard, "snapshots", "index.json");
const schemaPath = join(dashboard, "schema", "snapshot.schema.json");
const timingSchemaPath = join(dashboard, "schema", "source-timing.schema.json");
const schemaReadmePath = join(dashboard, "schema", "SCHEMA.md");
const dashboardReadmePath = join(dashboard, "README.md");
const buildPath = join(dashboard, "tools", "build.mjs");
const fetchSnapshotPath = join(dashboard, "tools", "fetch_snapshot.py");
const rawInputManifestPath = join(dashboard, "evidence", "fixtures", "world-bank-input.json");
const evidencePolicyPath = join(dashboard, "evidence", "adapter-classification-policy.json");
const fetcherText = readFileSync(fetchSnapshotPath, "utf8");
const buildText = readFileSync(buildPath, "utf8");

const template = readFileSync(templatePath, "utf8");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const evidencePolicy = JSON.parse(readFileSync(evidencePolicyPath, "utf8"));

test("the corrected record preserves immutable, honestly unverified predecessors", () => {
  const originalLegacyBytes = readFileSync(originalLegacySnapshotPath);
  const correctedLegacyBytes = readFileSync(correctedLegacySnapshotPath);
  const correctedLegacy = JSON.parse(correctedLegacyBytes);
  const firstNextDay = JSON.parse(readFileSync(firstNextDaySnapshotPath, "utf8"));
  const index = JSON.parse(readFileSync(snapshotIndexPath, "utf8"));
  assert.equal(
    createHash("sha256").update(originalLegacyBytes).digest("hex"),
    "949a9d3f695f0bc2e619a3344a0c17516cf8309b3c48a27021d67e0d96772053",
    "the original public evidence record must remain byte-for-byte immutable",
  );
  assert.equal(
    correctedLegacy.correction.supersedes_snapshot_sha256,
    `sha256:${createHash("sha256").update(originalLegacyBytes).digest("hex")}`,
  );
  assert.equal(
    firstNextDay.correction.supersedes_snapshot_sha256,
    `sha256:${createHash("sha256").update(correctedLegacyBytes).digest("hex")}`,
  );
  assert.equal(
    correctedLegacy.correction.supersedes_record_id,
    "2026-09-07.r1",
  );
  assert.equal(
    correctedLegacy.reproducibility.raw_input_status,
    "not_pinned",
  );
  assert.equal(
    correctedLegacy.reproducibility.snapshot_rebuild_status,
    "not_verified",
  );
  assert.notEqual(
    createHash("sha256").update(correctedLegacyBytes).digest("hex"),
    "f6d5586b0fc60d76d6ade46ee380e74f250a8aabfae3b4a921781f0f0f3fc4f2",
    "the explicit correction envelope must have its own content address",
  );
  assert.equal(snapshot.correction?.supersedes_record_id, "2026-09-08.r2");
  assert.equal(snapshot.correction?.supersedes_snapshot_id, snapshot.snapshot_id);
  assert.equal(
    snapshot.correction?.supersedes_snapshot_sha256,
    `sha256:${createHash("sha256").update(readFileSync(predecessorSnapshotPath)).digest("hex")}`,
  );
  assert.equal(snapshot.correction?.source_values_changed, false);
  assert.equal(index.latest, snapshot.record_id);
  assert.deepEqual(index.snapshots.map(({ id }) => id), [
    "2026-09-07.r1",
    "2026-09-07.r2",
    "2026-09-08.r1",
    "2026-09-08.r2",
    snapshot.record_id,
  ]);
  assert.match(template, /id=["']snapshot-correction["']/);
  assert.match(template, /supersedes_record_id/);
});

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

test("long first-screen status labels can wrap inside a 320px viewport", () => {
  assert.match(
    template,
    /\.authority-pill\{[^}]*max-width:100%[^}]*white-space:normal[^}]*overflow-wrap:anywhere/s,
  );
  assert.match(
    template,
    /\.brandline \.sub\{[^}]*max-width:100%[^}]*overflow-wrap:anywhere/s,
  );
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
  assert.match(template, /id=["']condition-history-status["']/);
  assert.match(template, /condition history is not bound to this snapshot/i);
  assert.match(template, /current state does not prove how the wording, scope or evidence changed/i);
  assert.match(
    template,
    /<p class="plain-warning" id="condition-history-status"[^>]*>\s*<strong>History unavailable\.<\/strong>/i,
  );
  assert.match(template, /id=["']if-provenance-status["'][^>]*aria-live=["']polite["']/i);
  assert.match(template, /path\.provenance/);
  assert.match(template, /Path provenance:/i);
  assert.match(template, /registered route requires five layers.*may still omit others/i);
  assert.doesNotMatch(template, /promise holds only if five layers hold/i);
  assert.match(template, /function renderConditionMap\(/);
});

test("the first screen discloses prototype authority and the seven-part update", () => {
  for (const label of [
    "RESEARCH PROTOTYPE",
    "NOT LIVE",
    "NO SERVICE OR POLICY AUTHORITY",
    "WHAT CHANGED",
    "CURRENT READ",
    "SCOPE AND APPLICABILITY",
    "IF STATUS",
    "ACTION, HELP AND SAFETY",
    "MONITORING",
    "PROPOSED GOAL (VALUE CHOICE)",
    "EVIDENCE STATE",
    "PATH STATUS",
    "WHAT WOULD CHANGE THIS READING?",
  ]) {
    assert.ok(template.toLowerCase().includes(label.toLowerCase()), `missing ${label}`);
  }
  assert.match(template, /No authorised action/i);
  assert.match(template, /does not establish that waiting is safe/i);
  assert.match(template, /MONITORING INACTIVE/i);
  assert.match(template, /affected-party adoption.*not completed/i);
  assert.match(template, /alternative goals and dissent remain legitimate/i);
  assert.match(template, /no positive or adverse path is established/i);
  assert.match(template, /no Observatory-linked help or challenge service exists/i);
  assert.match(template, /No psychohistory/i);
  assert.match(template, /Only the record contract changed/i);
  assert.match(template, /History unavailable.*cannot support trend or decision claims/i);
  assert.match(template, /id=["']now-observed["']/i);
  assert.match(template, /function renderNow\(/);
  assert.match(template, /function publicUpdateEpistemicLabel\(/);
  assert.match(
    template,
    /cell\("now-observed","Record: "\+publicUpdateEpistemicLabel\(observed,update\.lineage\)/,
  );
  assert.ok(
    template.indexOf("CURRENT READ") < template.indexOf("Complete the promise"),
    "the current conclusion must precede the project slogan in reading order",
  );
  assert.ok(
    template.indexOf("ACTION, HELP AND SAFETY") < template.indexOf("EVIDENCE STATE"),
    "public action semantics must precede technical evidence detail",
  );
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

test("untyped future stories are withheld until possible-path assessments resolve", () => {
  assert.doesNotMatch(template, /Likely movement:/i);
  assert.doesNotMatch(template, /Crisis radar/i);
  assert.doesNotMatch(template, /warning signals live/i);
  assert.doesNotMatch(template, /id=["']crisis-chart["']/i);
  assert.doesNotMatch(template, /class=["'][^"']*orbit/i);
  assert.doesNotMatch(template, /cov\.ready\s*\+\s*["']\/["']\s*\+\s*cov\.total/);
  assert.doesNotMatch(template, /Possible failure modes/i);
  assert.doesNotMatch(template, /HORIZON [ABC]/i);
  assert.doesNotMatch(template, /function renderCrisisDetail\(/);
  assert.equal(Object.hasOwn(snapshot, "crises"), false);
  assert.equal(Object.hasOwn(snapshot, "playbooks"), false);
  assert.deepEqual(snapshot.possible_path_refs, []);
  assert.match(template, /No typed possible-path assessment is registered for this scope/i);
  assert.doesNotMatch(template, /resolved from bundle/i);
  assert.doesNotMatch(template, /synthetic, unscored hypothesis requiring human review/i);
  assert.match(template, /Byte-matched registered hypothesis/i);
  assert.match(template, /truth, probability, and fitness for action were not established/i);
});

test("scenario arithmetic cannot masquerade as a forecast or trigger", () => {
  assert.match(template, /SCENARIO, NOT A FORECAST/i);
  assert.doesNotMatch(template, /transparent projection/i);
  assert.doesNotMatch(template, /attention-worthy gap/i);
  assert.match(template, /id=["']scenario-class["']/i);
  assert.doesNotMatch(template, /scenarioSeededFor\s*!==\s*entity\)\s*seedScenario/);
});

test("public action options remain absent until typed option references resolve", () => {
  assert.doesNotMatch(template, /actor\s*=\s*null/);
  assert.doesNotMatch(template, /Choose a role to inspect options/i);
  assert.doesNotMatch(template, /function renderPlaybook\(/);
  assert.match(template, /No typed conditional options are registered for this scope/i);
  assert.match(template, /No authorised action/i);
});

test("entity selection never silently falls back to another geography", () => {
  assert.doesNotMatch(template, /if\s*\(!show\.length\)\s*show\s*=\s*series\.filter/);
  assert.doesNotMatch(template, /if\s*\(!show\.length\)\s*show\s*=\s*\[series\[0\]\]/);
  assert.match(template, /No data for this signal in/i);
  assert.match(template, /function latestForSelection\(/);
  assert.match(template, /GLOBAL UPDATE UNCHANGED/);
});

test("snapshot reserves only typed possible-path references", () => {
  assert.equal(snapshot.schema_version, "2.1.0");
  assert.equal(snapshot.source_transition_bundle.binding_state, "unbound_prototype");
  assert.deepEqual(snapshot.possible_path_refs, []);
  assert.equal(Object.hasOwn(snapshot, "crises"), false);
  assert.equal(Object.hasOwn(snapshot, "playbooks"), false);
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
    "published_statistic",
    "published_estimate",
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
        assert.equal(
          point.length,
          point[2] === "derived" ? 4 : 3,
          `${signal.id}: every point must carry its class and derived-input lineage`,
        );
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
  assert.match(template, /selectedLatest\.year\+" "\+pointEpistemicLabel\(/);
  assert.match(template, /pointEpistemicLabel\(sig,p,/);
  assert.equal(snapshot.reproducibility.raw_input_status, "not_pinned");
  assert.equal(snapshot.reproducibility.snapshot_rebuild_status, "not_verified");
  assert.match(snapshot.reproducibility.residual_gap, /bit-for-bit rebuild.*not passed/i);
});

test("published statistics and estimates are not presented as direct observations", () => {
  for (const epistemicClass of [
    "observed",
    "published_statistic",
    "published_estimate",
    "modelled_estimate",
    "nowcast",
    "forecast",
    "derived",
  ]) {
    assert.ok(evidencePolicy.class_definitions?.[epistemicClass], `${epistemicClass}: definition required`);
  }
  for (const id of ["gdp-per-capita", "inflation"]) {
    const classes = new Set(snapshot.signals.find((signal) => signal.id === id)
      .series.flatMap(({ points }) => points.map((point) => point[2])));
    assert.deepEqual(classes, new Set(["published_statistic"]), `${id}: registry statistic is revisable`);
  }
  for (const id of ["poverty-30", "poverty-830"]) {
    const classes = new Set(snapshot.signals.find((signal) => signal.id === id)
      .series.flatMap(({ points }) => points.map((point) => point[2])));
    assert.deepEqual(classes, new Set(["published_estimate", "nowcast"]), `${id}: PIP separates estimates and nowcasts`);
    assert.equal(evidencePolicy.signals[id].classification_basis_url, "https://pip.worldbank.org/home");
  }
});

test("content-addressed raw input is verified before an adapter transforms it", (t) => {
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

  const outDir = mkdtempSync(join(dashboard, "evidence", "raw", ".seldon-test-"));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));
  const mutatedRawPath = join(outDir, "mutated.json");
  const sourceRawPath = resolve(dashboard, fixture.raw_input.path);
  copyFileSync(sourceRawPath, mutatedRawPath);
  writeFileSync(mutatedRawPath, `${readFileSync(mutatedRawPath, "utf8")}not-json`);
  fixture.raw_input.path = relative(dashboard, mutatedRawPath);
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
  unsupported.raw_input.path = relative(dashboard, mutatedRawPath);
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

  const wrongIndicator = structuredClone(fixture);
  const wrongIndicatorPayload = JSON.parse(readFileSync(sourceRawPath, "utf8"));
  wrongIndicatorPayload[1][0].indicator.id = "WRONG.INDICATOR";
  const wrongIndicatorBytes = Buffer.from(JSON.stringify(wrongIndicatorPayload));
  const wrongIndicatorDigest = createHash("sha256").update(wrongIndicatorBytes).digest("hex");
  const wrongIndicatorPath = join(outDir, "wrong-indicator.json");
  writeFileSync(wrongIndicatorPath, wrongIndicatorBytes);
  wrongIndicator.raw_input.path = relative(dashboard, wrongIndicatorPath);
  wrongIndicator.raw_input.id = `sha256:${wrongIndicatorDigest}`;
  wrongIndicator.raw_input.sha256 = wrongIndicatorDigest;
  wrongIndicator.raw_input.byte_length = wrongIndicatorBytes.length;
  const wrongIndicatorManifestPath = join(outDir, "wrong-indicator-manifest.json");
  writeFileSync(wrongIndicatorManifestPath, JSON.stringify(wrongIndicator));
  assert.throws(
    () => execFileSync(
      "python3",
      [fetchSnapshotPath, "--verify-input-manifest", wrongIndicatorManifestPath],
      { encoding: "utf8", stdio: "pipe" },
    ),
    /response indicator.*does not match/i,
  );
});

test("a separately pinned policy rejects co-mutated classes, versions and selectors", () => {
  const policyBytes = readFileSync(evidencePolicyPath);
  const policyDigest = createHash("sha256").update(policyBytes).digest("hex");
  assert.match(buildText, new RegExp(policyDigest), "build must pin the external evidence policy digest");

  const outDir = mkdtempSync(join(tmpdir(), "seldon-policy-attacks-"));
  const inputPath = join(outDir, "snapshot.json");
  const outputPath = join(outDir, "index.html");

  const coMutated = structuredClone(snapshot);
  const poverty = coMutated.signals.find(({ id }) => id === "poverty-30");
  for (const point of poverty.series.flatMap(({ points }) => points)) {
    if (point[0] >= 2025) point[2] = "observed";
  }
  poverty.latest.epistemic_class = "observed";
  poverty.source.adapter.epistemic_rules.find(({ from_year }) => from_year === 2025)
    .epistemic_class = "observed";
  assertBuildRejects(coMutated, inputPath, outputPath, /pinned evidence policy/i);

  const unsupportedVersion = structuredClone(snapshot);
  unsupportedVersion.signals.find(({ id }) => id === "poverty-30")
    .source.adapter.version = "999.0.0";
  assertBuildRejects(unsupportedVersion, inputPath, outputPath, /pinned evidence policy|unsupported adapter/i);

  const wrongSelector = structuredClone(snapshot);
  const participation = wrongSelector.signals.find(({ id }) => id === "participation");
  participation.source.adapter.dataset_id = "WRONG.INDICATOR";
  participation.source.adapter.selected_fields = ["countryiso3code", "date", "wrong-value"];
  assertBuildRejects(wrongSelector, inputPath, outputPath, /pinned evidence policy|selected fields|indicator/i);
});

test("captured claims require complete, referenced and transformed raw evidence", () => {
  const outDir = mkdtempSync(join(tmpdir(), "seldon-raw-coverage-attacks-"));
  const inputPath = join(outDir, "snapshot.json");
  const outputPath = join(outDir, "index.html");
  const fixture = JSON.parse(readFileSync(rawInputManifestPath, "utf8")).raw_input;
  fixture.path = "evidence/raw/world-bank-sample.json";

  const unreferenced = structuredClone(snapshot);
  unreferenced.reproducibility.raw_input_status = "captured_local_hash_consistent";
  unreferenced.reproducibility.raw_inputs = [fixture];
  assertBuildRejects(unreferenced, inputPath, outputPath, /unreferenced raw input|missing captured raw input/i);

  const falseLineage = structuredClone(unreferenced);
  const participation = falseLineage.signals.find(({ id }) => id === "participation");
  participation.source.adapter = fixture.adapter;
  participation.source.raw_input_ids = [fixture.id];
  assertBuildRejects(falseLineage, inputPath, outputPath, /missing captured raw input|raw transform.*does not match/i);
});

test("derived series preserve input classes and are recomputed with the public arithmetic", () => {
  for (const id of ["engels-divergence", "transmission-gap"]) {
    const signal = snapshot.signals.find((candidate) => candidate.id === id);
    for (const series of signal.series) {
      for (const point of series.points) {
        assert.equal(point.length, 4, `${id}: derived points must retain input classes`);
        assert.deepEqual(
          point[3],
          series.measure === "Output per capita"
            ? ["published_statistic"]
            : ["modelled_estimate", "published_statistic"],
        );
      }
    }
  }

  const outDir = mkdtempSync(join(tmpdir(), "seldon-derived-attacks-"));
  const inputPath = join(outDir, "snapshot.json");
  const outputPath = join(outDir, "index.html");
  for (const id of ["engels-divergence", "transmission-gap"]) {
    const mutated = structuredClone(snapshot);
    mutated.signals.find((candidate) => candidate.id === id).series[0].points[2][1] += 999;
    assertBuildRejects(mutated, inputPath, outputPath, /recomputed.*derived|derived.*recomput/i);
  }

  const falsePublicArithmetic = structuredClone(snapshot);
  falsePublicArithmetic.public_update.observed.summary = "The arithmetic says something else.";
  assertBuildRejects(falsePublicArithmetic, inputPath, outputPath, /public.update.*arithmetic/i);
});

test("retained-input timing and every export surface retain epistemic class", () => {
  assert.doesNotMatch(fetcherText, /build\(args\.id,\s*args\.id\)/);
  assert.match(fetcherText, /["']retrieved_at["']\s*:.*datetime/is);
  assert.match(fetcherText, /live snapshot emission is retired.*2\.0 timing.*acquisition/is);
  assert.doesNotMatch(fetcherText, /retrieved_on\s*=/i);
  assert.match(template, /function pointEpistemicLabel\(/);
  assert.match(template, /function chartPointLabel\(/);
  assert.match(template, /lab\.textContent\s*=.*chartPointLabel\(last\)/s);
  assert.match(template, /id=["']copy-evidence["']/);
  assert.match(template, /id=["']export-evidence["']/);
  assert.match(template, /function currentEvidenceExport\(/);
  assert.match(template, /artifact_kind:["']selection_only["']/);
  assert.match(template, /reference_closure:["']external_record_binding["']/);
  assert.match(template, /source_assessment_bundle/);
  assert.match(template, /public_update:["']omitted_from_selection_export["']/);
  assert.match(template, /navigator\.clipboard\.writeText/);
  assert.match(template, /URL\.createObjectURL/);
  assert.match(template, /JSON\.stringify\(\(snap\.signals\|\|\[\]\)\[0\]/);
  assert.doesNotMatch(template, /epistemic_rules:\[\{epistemic_class:"modelled_estimate"\}\]/);
});

test("compact mobile labels cannot expand the page to the full evidence contract width", () => {
  const stateBlock = template.match(/function stateLabel\(sig\)\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(stateBlock, /pointEpistemicLabel/);
  assert.match(stateBlock, /epistemicLabel/);
  assert.match(template, /\.authority-pill\{[^}]*flex:\s*0 0 auto[^}]*max-width:\s*100%/s);
  assert.match(template, /\.val\{[^}]*min-width:\s*0[^}]*max-width:/s);
  assert.match(template, /\.val \.y\{[^}]*overflow-wrap:\s*anywhere/s);
});

test("the aggregate baseline keeps full timing evidence expandable rather than dominant", () => {
  const verdictBlock = template.match(/function renderVerdict\(\)\{([\s\S]*?)\n\}\n\nfunction renderFamilies/)?.[1] || "";
  assert.match(verdictBlock, /compactTimingLabel\(d,\[verdictYear\],ent,null,verdictContext\)/);
  assert.match(verdictBlock, /el\("details","caveats"\)/);
  assert.match(verdictBlock, /timingLabel\(d,\[verdictYear\],ent,null,verdictContext\)/);
  assert.doesNotMatch(verdictBlock, /el\("div","bigunit",[^\n]*verdictTiming/);
});

test("compare-all never borrows the World result for multi-measure signals", () => {
  const pickBlock = template.match(/function pick\(sig\)\{([\s\S]*?)\n\}/)?.[1] || "";
  const verdictBlock = template.match(/function renderVerdict\(\)\{([\s\S]*?)\n\}\n\nfunction renderFamilies/)?.[1] || "";
  const ratesBlock = template.match(/function baselineRates\(\)\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(pickBlock, /if\(hasM&&entity==="ALL"\)/);
  assert.doesNotMatch(pickBlock, /entity==="ALL"\s*\?\s*"OWID_WRL"/);
  assert.match(verdictBlock, /var ent\s*=\s*entity/);
  assert.match(ratesBlock, /if\(entity==="ALL"\) return null/);
  assert.match(template, /effective_entities:/);
});

test("every visible numeric reading carries its complete display unit", () => {
  assert.match(template, /function displayUnit\(sig\)/);
  assert.match(template, /function formattedReading\(sig,value\)/);
  assert.match(template, /formattedReading\(sig,selectedLatest\.value\)/);
  assert.match(template, /formattedReading\(sig,last\[1\]\)/);
  assert.match(template, /axisUnit\.textContent=displayUnit\(sig\)/);
});

test("the first public claim exposes release and publication state without opening details", () => {
  assert.match(template, /function compactPublicTimingState\(/);
  const renderNowBlock = template.match(/function renderNow\(\)\{([\s\S]*?)\n\}\n\nfunction renderAll/)?.[1] || "";
  assert.match(renderNowBlock, /visibleTimingState/);
  assert.match(renderNowBlock, /"\. Publisher timing: "\+visibleTimingState/);
  assert.match(renderNowBlock, /Source authenticity: unverified/);
});

test("the aggregate comparison cannot present its number as a transition verdict", () => {
  assert.match(template, /This number is not a transition score/i);
  assert.match(template, /\.bignum\{font-size:clamp\(34px,4vw,44px\)/);
  assert.doesNotMatch(template, /\.bignum\{font-size:clamp\(56px,8vw,92px\)/);
});

test("the JSON schema actually validates the current snapshot contract", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const timingSchema = JSON.parse(readFileSync(timingSchemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(timingSchema);
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

  for (const authorizationState of ["authorised", "active", "paused", "ended"]) {
    const unsupportedOperationalClaim = structuredClone(snapshot);
    unsupportedOperationalClaim.public_update.action.authorization_state = authorizationState;
    assert.equal(
      validate(unsupportedOperationalClaim),
      false,
      `schema 2.0 cannot import an unverified ${authorizationState} action claim`,
    );
  }

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
  mismatchedRawInput.reproducibility.raw_input_status = "captured_local_hash_consistent";
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

  for (const authorizationState of ["authorised", "active", "paused", "ended"]) {
    const unsupportedOperationalClaim = structuredClone(snapshot);
    Object.assign(unsupportedOperationalClaim.public_update.action, {
      authorization_state: authorizationState,
      owner: "Named owner",
      authority: "Asserted decision authority",
      help_route: "https://example.test/help",
      appeal_route: "https://example.test/appeal",
    });
    assertBuildRejects(
      unsupportedOperationalClaim,
      inputPath,
      outputPath,
      /schema validation failed/i,
    );
  }
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

  const unresolvedPossiblePath = structuredClone(snapshot);
  unresolvedPossiblePath.possible_path_refs.push({
    id: "assessment.unresolved",
    version: "1.0.0",
    checksum: `sha256:${"0".repeat(64)}`,
  });
  writeFileSync(semanticallyInvalidPath, JSON.stringify(unresolvedPossiblePath));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /snapshot schema validation failed|unbound.*possible-path/i,
  );

  const falseHelpRoute = structuredClone(snapshot);
  falseHelpRoute.public_update.action.help_route = "service-that-does-not-exist";
  writeFileSync(semanticallyInvalidPath, JSON.stringify(falseHelpRoute));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );
});

test("operator documentation matches the governed 2.1 bundle-bound build", () => {
  const readme = readFileSync(dashboardReadmePath, "utf8");
  const schemaReadme = readFileSync(schemaReadmePath, "utf8");
  assert.match(readme, /public_update/);
  assert.match(readme, /build-time.*validation/i);
  assert.match(readme, /Australia evidence room/i);
  assert.match(readme, /Transition Observatory.*Round 04/is);
  assert.match(readme, /exact synthetic seven-artifact pre-projection core/i);
  assert.match(readme, /release.*blocked/i);
  assert.match(readme, /record_id/);
  assert.match(readme, /reference\s+period.*publisher\s+vintage.*publisher\s+release.*retrieval.*byte\s+acquisition.*record\s+generation/is);
  assert.match(readme, /reported.*unverified.*retrieval/is);
  assert.match(readme, /internal.*clock.*unknown.*retained.*execution/is);
  assert.match(readme, /selection-only.*external\s+record binding/is);
  assert.match(readme, /timing-assessment-set\.schema\.json/);
  assert.match(readme, /snapshot-schema-registry\.json/);
  assert.match(readme, /live.*retired.*2\.0 timing.*acquisition/is);
  assert.match(readme, /migrate-timing-contract\.mjs/);
  assert.match(readme, /schema\/archive\/snapshot-1\.8\.schema\.json/);
  assert.match(readme, /schema\/archive\/snapshot-2\.0\.schema\.json/);
  assert.match(readme, /transition-bundle-binding\.mjs/);
  assert.doesNotMatch(readme, /Load snapshot/i);
  assert.doesNotMatch(readme, /current v2/i);
  assert.doesNotMatch(readme, /python3 dashboard\/tools\/fetch_snapshot\.py\s*$/m);
  assert.match(schemaReadme, /Version 2\.1\.0/);
  assert.match(schemaReadme, /record_id/);
  assert.match(schemaReadme, /exact selected point lineage/i);
  assert.match(schemaReadme, /unknown.*must not.*fresh/is);
  assert.match(schemaReadme, /assessment execution.*structural lineage.*input timing readiness.*evidence readiness.*publication eligibility/is);
  assert.match(schemaReadme, /IANA.*civil-date interval/is);
  assert.match(schemaReadme, /reported.*unverified.*retrieval/is);
  assert.match(schemaReadme, /internal.*clock.*unknown.*retained.*execution/is);
  assert.match(schemaReadme, /content-addressed.*schema-registry|content-addressed.*schema registry/is);
  assert.match(schemaReadme, /source_transition_bundle.*required/is);
  assert.match(schemaReadme, /WHO \+ VERB \+ OBJECT \+ STANDARD \+.*PLACE \+ PERIOD \+ IF/is);
  assert.match(schemaReadme, /selection-only.*external\s+record binding/is);
  assert.match(schemaReadme, /snapshot-1\.8\.schema\.json/);
  assert.match(schemaReadme, /seven-part public update/i);
  assert.match(schemaReadme, /semantic validation/i);
  assert.doesNotMatch(schemaReadme, /No page rebuild required/i);
});
