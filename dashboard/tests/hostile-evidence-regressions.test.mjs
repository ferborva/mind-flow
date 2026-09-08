import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildNeroBaseline } from "../tools/build-nero-baseline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const root = resolve(dashboard, "..");
const buildPath = join(dashboard, "tools", "build.mjs");
const fetchPath = join(dashboard, "tools", "fetch_snapshot.py");
const snapshotPath = join(dashboard, "snapshots", "2026-09-08.r3.json");
const predecessorPath = join(dashboard, "snapshots", "2026-09-08.r2.json");
const legacyPath = join(dashboard, "snapshots", "2026-09-07.json");
const indexPath = join(dashboard, "snapshots", "index.json");
const policyPath = join(dashboard, "evidence", "adapter-classification-policy.json");
const templatePath = join(dashboard, "web", "index.template.html");
const rawManifestPath = join(dashboard, "evidence", "fixtures", "world-bank-input.json");
const australiaReadmePath = join(root, "pilots", "australia", "README.md");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

function rejectsBuild(value, expected, ...args) {
  const directory = mkdtempSync(join(tmpdir(), "mind-flow-hostile-"));
  const input = join(directory, "snapshot.json");
  const output = join(directory, "index.html");
  writeFileSync(input, JSON.stringify(value));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, input, output, ...args], { stdio: "pipe" }),
    expected,
  );
}

test("research-draft evidence cannot pass the publishable build mode", () => {
  assert.equal(snapshot.publication_status, "research_draft_unverified");
  assert.equal(snapshot.reproducibility.raw_input_status, "not_pinned");
  rejectsBuild(snapshot, /MISSING_TRUSTED_ACQUISITION_BOUNDARY/, "--mode=publishable");

  const selfConsistentClaim = structuredClone(snapshot);
  selfConsistentClaim.publication_status = "publishable";
  rejectsBuild(selfConsistentClaim, /MISSING_TRUSTED_ACQUISITION_BOUNDARY/, "--mode=publishable");
});

test("local hashes never become publisher authentication wording", () => {
  const template = readFileSync(templatePath, "utf8");
  assert.match(template, /UNVERIFIED SOURCE BYTES/);
  assert.match(template, /function sourceBytesLabel\(/);
  assert.match(template, /LOCAL HASH CONSISTENCY ONLY/);
  assert.doesNotMatch(template, /\bVERIFIED SOURCE BYTES\b/);
  for (const field of [
    "publication_status", "record_id", "as_of", "generated_at", "correction", "reproducibility",
    "evidence_policy", "provenance", "source_bytes_status", "timing_assessments",
  ]) assert.match(template, new RegExp(`${field}:`), `export omits ${field}`);
  assert.match(template, /governance_state:\{/);
  assert.match(template, /if_path:"omitted_from_selection_export"/);
  assert.match(template, /possible_path_refs:"omitted_from_selection_export"/);
  assert.match(template, /action_authority:"none_in_selection_export"/);
  for (const epistemicClass of [
    "observed", "published_statistic", "published_estimate", "modelled_estimate",
    "nowcast", "forecast", "derived", "not_measured", "unavailable",
  ]) assert.match(template, new RegExp(`${epistemicClass}:`), `coverage omits ${epistemicClass}`);
});

test("the Australian feasibility note does not overstate an unretained archive as reproducible", () => {
  const note = readFileSync(australiaReadmePath, "utf8");
  assert.doesNotMatch(note, /proves that one public source can be reduced reproducibly/i);
  assert.match(note, /locally recomputable.*archive can be recovered/i);
});

test("captured local inputs require successful HTTP and matching media metadata", () => {
  const fixture = JSON.parse(readFileSync(rawManifestPath, "utf8")).raw_input;
  fixture.path = "evidence/raw/world-bank-sample.json";
  const failedHttp = structuredClone(snapshot);
  failedHttp.reproducibility.raw_input_status = "captured_local_hash_consistent";
  failedHttp.reproducibility.raw_inputs = [fixture];
  failedHttp.reproducibility.raw_inputs[0].response_metadata.http_status = 599;
  rejectsBuild(failedHttp, /schema validation failed|HTTP status must be 2xx/i);

  const wrongMedia = structuredClone(failedHttp);
  wrongMedia.reproducibility.raw_inputs[0].response_metadata.http_status = 200;
  wrongMedia.reproducibility.raw_inputs[0].response_metadata.content_type = "text/html";
  rejectsBuild(wrongMedia, /media.type.*content.type|content.type.*media.type/i);
});

test("raw input verification rejects symlinks that escape the governed evidence root", () => {
  const directory = mkdtempSync(join(tmpdir(), "mind-flow-outside-evidence-"));
  const outsidePath = join(directory, "private.bin");
  const bytes = Buffer.from("outside governed evidence root");
  writeFileSync(outsidePath, bytes);
  const linkName = `hostile-symlink-${process.pid}-${Date.now()}.bin`;
  const linkPath = join(dashboard, "evidence", "raw", linkName);
  symlinkSync(outsidePath, linkPath);

  try {
    const rawInput = JSON.parse(readFileSync(rawManifestPath, "utf8")).raw_input;
    rawInput.path = `evidence/raw/${linkName}`;
    rawInput.byte_length = bytes.length;
    rawInput.sha256 = createHash("sha256").update(bytes).digest("hex");
    rawInput.id = `sha256:${rawInput.sha256}`;
    const changed = structuredClone(snapshot);
    changed.reproducibility.raw_input_status = "captured_local_hash_consistent";
    changed.reproducibility.raw_inputs = [rawInput];

    rejectsBuild(changed, /symbolic link|escapes dashboard\/evidence\/raw/i);
  } finally {
    unlinkSync(linkPath);
  }
});

test("the pinned policy rejects co-mutated displayed identity, units and evidence prose", () => {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  assert.deepEqual(new Set(Object.keys(policy.signals)), new Set(snapshot.signals.map(({ id }) => id)));
  assert.ok(Object.values(policy.signals).every(({ display_contract_sha256 }) =>
    /^sha256:[a-f0-9]{64}$/.test(display_contract_sha256)));

  for (const mutate of [
    (value) => { value.signals[0].name = "Co-mutated identity"; },
    (value) => { value.signals[0].unit = "invented-units"; },
    (value) => { value.signals[0].question = "Co-mutated evidence question"; },
    (value) => { value.signals[0].source.note = "Co-mutated source prose"; },
    (value) => { value.signals[0].source.adapter.epistemic_rules[0].uncertainty = "None"; },
  ]) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    rejectsBuild(changed, /display contract.*pinned evidence policy/i);
  }
});

test("the public update carries a fully derived point and raw-input lineage", () => {
  const lineage = snapshot.public_update.lineage;
  assert.equal(lineage.entity, snapshot.public_update.scope.entity);
  assert.ok(lineage.source_points.length >= 4);
  assert.ok(lineage.derived_points.length >= 4);
  assert.deepEqual(lineage.raw_input_ids, []);

  const changed = structuredClone(snapshot);
  changed.public_update.lineage.source_points[0].value += 1;
  rejectsBuild(changed, /public.update lineage.*recomputed/i);
});

test("a correction is bound to predecessor bytes and its changed fields are derived", () => {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const legacyDigest = `sha256:${createHash("sha256").update(readFileSync(legacyPath)).digest("hex")}`;
  const predecessorDigest = `sha256:${createHash("sha256").update(readFileSync(predecessorPath)).digest("hex")}`;
  const legacyEntry = index.snapshots.find(({ id }) => id === "2026-09-07.r1");
  assert.equal(legacyEntry.sha256, legacyDigest);
  for (const entry of index.snapshots) {
    const bytes = readFileSync(join(dashboard, "snapshots", entry.path));
    assert.equal(entry.sha256, `sha256:${createHash("sha256").update(bytes).digest("hex")}`);
  }
  assert.equal(snapshot.correction.supersedes_snapshot_sha256, predecessorDigest);
  assert.equal(snapshot.correction.supersedes_record_id, "2026-09-08.r2");
  assert.ok(snapshot.correction.changed_fields.length > 0);

  const falseFlag = structuredClone(snapshot);
  falseFlag.correction.source_values_changed = true;
  rejectsBuild(falseFlag, /correction source.values.changed.*predecessor/i);

  const falseFields = structuredClone(snapshot);
  falseFields.correction.changed_fields = ["invented"];
  rejectsBuild(falseFields, /correction changed.fields.*predecessor/i);

  const backwards = structuredClone(snapshot);
  backwards.correction.supersedes_record_id = "2026-09-08.r9";
  rejectsBuild(backwards, /correction predecessor.*absent|strictly earlier/i);
});

test("every buildable snapshot is registered and bound to its canonical path and bytes", () => {
  const changed = structuredClone(snapshot);
  changed.notes = "Self-authored replacement with the current id";
  rejectsBuild(changed, /snapshot must match indexed id, path and SHA/i);

  const unregistered = structuredClone(snapshot);
  unregistered.snapshot_id = "2026-09-09";
  unregistered.record_id = "2026-09-09.r1";
  unregistered.as_of = "2026-09-09T00:41:31Z";
  unregistered.generated_at = "2026-09-09T00:41:31Z";
  delete unregistered.correction;
  unregistered.public_update.observed.record_id = "2026-09-09.r1";
  unregistered.public_update.update_id = "world-aggregate-transmission-2026-09-09.r1";
  rejectsBuild(unregistered, /snapshot is not registered in the snapshot index/i);
});

test("timing is policy-governed from exact lineage and exposed beside values", () => {
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  assert.equal(policy.freshness_policy.basis, "exact_selected_lineage");
  assert.equal(policy.freshness_policy.signal_rules.inflation.kind, "external_dataset");
  const template = readFileSync(templatePath, "utf8");
  assert.match(template, /function timingLabel\(/);
  assert.match(template, /FROZEN ASSESSMENT, NOT LIVE/);
  assert.doesNotMatch(template, /CURRENT AS OF|currentnessFor/);
  assert.match(template, /pointEpistemicLabel\(sig,/);
});

test("public observed content and entity identity are wholly bound to policy and lineage", () => {
  const attacks = [
    (value) => { value.public_update.scope.population = "Every household directly observed"; },
    (value) => { value.public_update.scope.place = "Official global census"; },
    (value) => { value.public_update.observed.measure = "Direct publisher observation"; },
    (value) => { value.public_update.observed.source_signal_ids = ["inflation"]; },
    (value) => { value.public_update.observed.uncertainty = "None"; },
    (value) => { value.public_update.observed.epistemic_class = "observed"; },
    (value) => { value.entities.find(({ code }) => code === "OWID_WRL").name = "Official households"; },
  ];
  for (const attack of attacks) {
    const changed = structuredClone(snapshot);
    attack(changed);
    rejectsBuild(changed, /public_update (scope|observed).*policy.*lineage|entity contract.*policy/i);
  }
});

test("as-of chronology is strict and future points require forecast class", () => {
  assert.match(snapshot.as_of, /Z$/);
  const wrongSnapshotDay = structuredClone(snapshot);
  wrongSnapshotDay.as_of = "2026-09-07T23:59:59Z";
  rejectsBuild(wrongSnapshotDay, /snapshot.id.*as.of/i);

  const earlyGeneration = structuredClone(snapshot);
  earlyGeneration.generated_at = "2026-09-07T23:59:59Z";
  rejectsBuild(earlyGeneration, /generated.at.*as.of/i);

  const futureRetrieval = structuredClone(snapshot);
  futureRetrieval.signals[0].source.retrieved = "2026-09-09";
  rejectsBuild(futureRetrieval, /retrieval date.*as.of|retrieval date.*generated.at/i);

  const futureNowcast = structuredClone(snapshot);
  const poverty = futureNowcast.signals.find(({ id }) => id === "poverty-30");
  const world = poverty.series.find(({ entity }) => entity === "OWID_WRL");
  world.points.push([2027, world.points.at(-1)[1], "nowcast"]);
  poverty.latest = {
    entity: "OWID_WRL", year: 2027, value: world.points.at(-1)[1], epistemic_class: "nowcast",
  };
  rejectsBuild(futureNowcast, /future point.*forecast/i);
});

test("global and Australian evidence builders enforce exact source-host allowlists", () => {
  const hostileGlobal = structuredClone(snapshot);
  hostileGlobal.signals[0].source.url = "https://attacker.example/data";
  rejectsBuild(hostileGlobal, /source host.*allowlist/i);

  const manifest = JSON.parse(readFileSync(rawManifestPath, "utf8"));
  manifest.raw_input.source_url = "https://attacker.example/data";
  const directory = mkdtempSync(join(tmpdir(), "mind-flow-hostile-source-"));
  const manifestPath = join(directory, "manifest.json");
  const rawPath = resolve(dirname(rawManifestPath), manifest.raw_input.path);
  manifest.raw_input.path = rawPath;
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(
    () => execFileSync("python3", [fetchPath, "--verify-input-manifest", manifestPath], { stdio: "pipe" }),
    /source host.*allowlist/i,
  );

  const source = {
    archive_url: "https://attacker.example/2026-08_nero.zip",
    release_period: "2026-08",
    released_at: "2026-09-02",
    retrieved_at: "2026-09-08T00:00:00Z",
    checksum: `sha256:${"a".repeat(64)}`,
    release_availability: {
      kind: "first-seen-interval",
      not_seen_as_of_utc: null,
      first_seen_at_utc: "2026-09-08T00:00:00Z",
      evidence: "First recorded during retrieval; no independently evidenced earlier absence check.",
    },
  };
  assert.throws(
    () => buildNeroBaseline([
      ["1", "NSW", "117", "Sydney", "5311", "General Clerks", "2026-08-15", "100"],
    ], { occupationCodes: ["5311"], source }),
    /source host.*allowlist/i,
  );

  assert.equal(root.endsWith("mind-flow"), true);
});
