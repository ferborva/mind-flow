import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

const template = readFileSync(templatePath, "utf8");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

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
  assert.match(snapshot.schema_version, /^1\.3\./);
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

test("the JSON schema actually validates the current snapshot contract", () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  assert.equal(validate(snapshot), true, ajv.errorsText(validate.errors));

  const malformed = structuredClone(snapshot);
  malformed.signals[0].status = "looks-good";
  assert.equal(validate(malformed), false, "invalid signal state must fail validation");
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

  const semanticallyInvalidPath = join(outDir, "semantically-invalid.json");
  const semanticallyInvalid = structuredClone(snapshot);
  semanticallyInvalid.public_update.observed.source_signal_ids.push("missing-signal");
  writeFileSync(semanticallyInvalidPath, JSON.stringify(semanticallyInvalid));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, semanticallyInvalidPath, outputPath], { stdio: "pipe" }),
    /semantic validation failed/i,
  );
});

test("operator documentation matches the governed 1.3 snapshot build", () => {
  const readme = readFileSync(dashboardReadmePath, "utf8");
  const schemaReadme = readFileSync(schemaReadmePath, "utf8");
  assert.match(readme, /public_update/);
  assert.match(readme, /build-time.*validation/i);
  assert.match(readme, /Australia evidence room/i);
  assert.match(readme, /release.*blocked/i);
  assert.doesNotMatch(readme, /Load snapshot/i);
  assert.doesNotMatch(readme, /current v2/i);
  assert.match(schemaReadme, /Version 1\.3\.0/);
  assert.match(schemaReadme, /seven-part public update/i);
  assert.match(schemaReadme, /semantic validation/i);
  assert.doesNotMatch(schemaReadme, /No page rebuild required/i);
});
