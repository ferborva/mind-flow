import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
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
const buildPath = join(dashboard, "tools", "build.mjs");

const template = readFileSync(templatePath, "utf8");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

test("the observatory leads from trajectory to crises, action and evidence", () => {
  for (const id of [
    "trajectory",
    "crisis-radar",
    "action-deck",
    "scenario-lab",
    "signal-atlas",
  ]) {
    assert.match(template, new RegExp(`id=["']${id}["']`));
  }
  assert.match(template, /Capability is not access/);
  assert.match(template, /aria-live=["']polite["']/);
});

test("the self-contained public page has no remote font dependency", () => {
  assert.doesNotMatch(template, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
});

test("public language does not turn imperfect proxies into verdicts", () => {
  assert.doesNotMatch(template, /not yet an Engels['’] Pause/i);
  assert.doesNotMatch(template, /10-point attention line/i);
  assert.doesNotMatch(template, /choosing to work/i);

  const participation = snapshot.signals.find((signal) => signal.id === "participation");
  assert.match(participation.question, /labour.market participation/i);
  assert.match(participation.caveats.join(" "), /does not reveal why/i);

  const baseline = snapshot.signals.find((signal) => signal.id === "engels-divergence");
  assert.match(baseline.name, /baseline/i);
  assert.match(baseline.caveats.join(" "), /not.*like.for.like/i);
});

test("failure scenarios do not predict or pathologise democratic responses", () => {
  assert.doesNotMatch(template, /Likely movement:/i);
  for (const crisis of snapshot.crises) {
    assert.equal("movement" in crisis, false, `${crisis.id}: remove movement forecast`);
    assert.ok(
      crisis.possible_public_responses?.length >= 1,
      `${crisis.id}: possible responses must remain plural and unpredicted`,
    );
  }
});

test("snapshot carries actionable crisis and actor contracts", () => {
  assert.match(snapshot.schema_version, /^1\.2\./);
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
});
