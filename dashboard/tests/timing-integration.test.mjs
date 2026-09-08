import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessTimingGraph,
  validateSnapshotIndex,
  validateTimingGraph,
} from "../timing/validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const oldR1Path = join(dashboard, "snapshots", "2026-09-08.json");
const oldLegacyPath = join(dashboard, "snapshots", "2026-09-07.json");
const snapshotPath = join(dashboard, "snapshots", "2026-09-08.r2.json");
const indexPath = join(dashboard, "snapshots", "index.json");
const schemaPath = join(dashboard, "schema", "snapshot.schema.json");
const timingSchemaPath = join(dashboard, "schema", "source-timing.schema.json");
const timingAssessmentSchemaPath = join(dashboard, "schema", "timing-assessment-set.schema.json");
const timingEvaluatorPath = join(dashboard, "timing", "validation.mjs");
const snapshotSchemaRegistryPath = join(dashboard, "schema", "snapshot-schema-registry.json");
const policyPath = join(dashboard, "evidence", "adapter-classification-policy.json");
const buildPath = join(dashboard, "tools", "build.mjs");
const fetchPath = join(dashboard, "tools", "fetch_snapshot.py");
const templatePath = join(dashboard, "web", "index.template.html");

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function loadSnapshotSchemas() {
  const registry = JSON.parse(readFileSync(snapshotSchemaRegistryPath, "utf8"));
  return Object.fromEntries(registry.schemas.map((entry) => {
    const schemaBytes = readFileSync(join(dashboard, "schema", entry.path));
    assert.equal(digest(schemaBytes), entry.sha256);
    return [entry.snapshot_schema_version, {
      schema: JSON.parse(schemaBytes),
      dependencies: entry.dependencies.map((dependency) => {
        const bytes = readFileSync(join(dashboard, "schema", dependency.path));
        assert.equal(digest(bytes), dependency.sha256);
        return JSON.parse(bytes);
      }),
    }];
  }));
}

const snapshotSchemas = loadSnapshotSchemas();
const validateIndex = (index, records) => validateSnapshotIndex(index, records, snapshotSchemas);

test("frozen v1.5 and v1.8 records remain byte-identical beside the v2.0 correction", () => {
  assert.equal(
    digest(readFileSync(oldLegacyPath)),
    "sha256:f6d5586b0fc60d76d6ade46ee380e74f250a8aabfae3b4a921781f0f0f3fc4f2",
  );
  assert.equal(
    digest(readFileSync(oldR1Path)),
    "sha256:f09f5b7c2cf2187bd6997921b0b48b2b9857dbf110520167037ff7b00ef8fd35",
  );
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  assert.equal(snapshot.record_id, "2026-09-08.r2");
  assert.equal(snapshot.correction.supersedes_record_id, "2026-09-08.r1");
  assert.equal(snapshot.correction.supersedes_snapshot_sha256, digest(readFileSync(oldR1Path)));
});

test("the v2.0 snapshot and timing graph fail closed under their governed policy", () => {
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const policyBytes = readFileSync(policyPath);
  const policy = JSON.parse(policyBytes);
  const snapshotSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const timingSchema = JSON.parse(readFileSync(timingSchemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(timingSchema);
  const validate = ajv.compile(snapshotSchema);
  assert.equal(validate(snapshot), true, ajv.errorsText(validate.errors));
  assert.equal(snapshot.schema_version, "2.0.0");
  assert.equal(snapshot.evidence_policy.version, "2.0.0");
  assert.equal(snapshot.evidence_policy.sha256, digest(policyBytes));
  assert.equal(Object.hasOwn(snapshot, "timing_assessments"), false);
  assert.equal(Object.hasOwn(snapshot.public_update.observed, "vintage"), false);
  assert.equal(snapshot.public_update.observed.record_id, snapshot.record_id);
  assert.equal(Object.hasOwn(snapshot.public_update.observed, "snapshot_revision"), false);
  assert.ok(snapshot.signals.every(({ source }) => source.timing));

  const graph = validateTimingGraph(snapshot.signals, {
    asOf: snapshot.as_of,
    generatedAt: snapshot.generated_at,
    rawInputs: snapshot.reproducibility.raw_inputs,
    availabilityReceipts: snapshot.reproducibility.availability_receipts,
    rules: policy.freshness_policy.signal_rules,
    publicUpdate: snapshot.public_update,
  });
  assert.equal(graph.valid, true, JSON.stringify(graph.errors));
  const assessments = assessTimingGraph(snapshot.signals, {
    asOf: snapshot.as_of,
    generatedAt: snapshot.generated_at,
    rawInputs: snapshot.reproducibility.raw_inputs,
    rules: policy.freshness_policy.signal_rules,
    publicUpdate: snapshot.public_update,
  });
  assert.deepEqual(new Set(Object.keys(assessments)), new Set(snapshot.signals.map(({ id }) => id)));
  assert.equal(assessments["engels-divergence"].inherited_from_signal_ids.length, 2);
  assert.equal(assessments["engels-divergence"].endpoint_coverage, "within_policy_window");
  assert.equal(assessments["engels-divergence"].baseline_coverage, "outside_policy_window");
  assert.deepEqual(
    new Set(snapshot.signals.find(({ id }) => id === "engels-divergence")
      .source.timing.assessment_lineage.map(({ role }) => role)),
    new Set(["baseline", "endpoint"]),
  );
  assert.deepEqual(
    new Set(snapshot.public_update.lineage.source_points.map(({ role }) => role)),
    new Set(["baseline", "endpoint"]),
  );
  const gapLineage = snapshot.signals.find(({ id }) => id === "transmission-gap")
    .source.timing.assessment_lineage;
  assert.equal(gapLineage.length, 4);
  assert.deepEqual(new Set(gapLineage.map(({ year }) => year)), new Set([2024, 2025]));
  assert.deepEqual(new Set(gapLineage.map(({ role }) => role)), new Set(["comparator", "endpoint"]));
});

test("the record index permits same-day corrections without rewriting history", () => {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  assert.equal(index.schema_version, "2.0.0");
  assert.equal(index.latest, "2026-09-08.r2");
  assert.deepEqual(index.snapshots.map(({ id }) => id), [
    "2026-09-07.r1",
    "2026-09-08.r1",
    "2026-09-08.r2",
  ]);
  for (const entry of index.snapshots) {
    const snapshot = JSON.parse(readFileSync(join(dashboard, "snapshots", entry.path), "utf8"));
    assert.equal(entry.snapshot_id, snapshot.snapshot_id);
    assert.equal(entry.schema_version, snapshot.schema_version);
    assert.equal(entry.sha256, digest(readFileSync(join(dashboard, "snapshots", entry.path))));
  }
});

test("the record index rejects false latest pointers and duplicate identities", () => {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const records = index.snapshots.map((entry) => ({
    entry,
    bytes: readFileSync(join(dashboard, "snapshots", entry.path)),
  }));
  assert.equal(validateIndex(index, records).valid, true);

  const falseLatest = structuredClone(index);
  falseLatest.latest = "2099-12-31.r999";
  assert.ok(validateIndex(falseLatest, records).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_LATEST_INVALID",
  ));

  const duplicate = structuredClone(index);
  duplicate.snapshots.push({ ...duplicate.snapshots.at(-1), sha256: `sha256:${"0".repeat(64)}` });
  const duplicateRecords = duplicate.snapshots.map((entry, position) => ({
    entry,
    bytes: records[Math.min(position, records.length - 1)].bytes,
  }));
  assert.ok(validateIndex(duplicate, duplicateRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_ID_DUPLICATE",
  ));

  const traversal = structuredClone(index);
  traversal.snapshots.at(-1).path = "../2026-09-08.r2.json";
  const traversalRecords = records.map((record, position) => ({
    entry: traversal.snapshots[position], bytes: record.bytes,
  }));
  assert.ok(validateIndex(traversal, traversalRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_PATH_INVALID",
  ));

  const fork = structuredClone(index);
  const forkSnapshot = JSON.parse(records.at(-1).bytes.toString("utf8"));
  forkSnapshot.correction.supersedes_record_id = "2026-09-07.r1";
  const forkBytes = Buffer.from(JSON.stringify(forkSnapshot));
  fork.snapshots.at(-1).sha256 = digest(forkBytes);
  const forkRecords = records.slice(0, -1).map((record, position) => ({
    entry: fork.snapshots[position], bytes: record.bytes,
  })).concat({ entry: fork.snapshots.at(-1), bytes: forkBytes });
  assert.ok(validateIndex(fork, forkRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_CORRECTION_CHAIN_INVALID",
  ));

  const forgedDigest = structuredClone(index);
  const forgedSnapshot = JSON.parse(records.at(-1).bytes.toString("utf8"));
  forgedSnapshot.correction.supersedes_snapshot_sha256 = `sha256:${"f".repeat(64)}`;
  const forgedBytes = Buffer.from(JSON.stringify(forgedSnapshot));
  forgedDigest.snapshots.at(-1).sha256 = digest(forgedBytes);
  const forgedRecords = records.slice(0, -1).map((record, position) => ({
    entry: forgedDigest.snapshots[position], bytes: record.bytes,
  })).concat({ entry: forgedDigest.snapshots.at(-1), bytes: forgedBytes });
  assert.ok(validateIndex(forgedDigest, forgedRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_PREDECESSOR_DIGEST_MISMATCH",
  ));

  const crossDateCorrection = structuredClone(index);
  const newDateSnapshot = JSON.parse(records.at(-1).bytes.toString("utf8"));
  newDateSnapshot.record_id = "2026-09-09.r1";
  newDateSnapshot.snapshot_id = "2026-09-09";
  newDateSnapshot.correction.supersedes_record_id = "2026-09-08.r2";
  newDateSnapshot.correction.supersedes_snapshot_id = "2026-09-08";
  newDateSnapshot.correction.supersedes_snapshot_sha256 = records.at(-1).entry.sha256;
  const newDateBytes = Buffer.from(JSON.stringify(newDateSnapshot));
  const newDateEntry = {
    id: "2026-09-09.r1",
    snapshot_id: "2026-09-09",
    schema_version: "2.0.0",
    path: "2026-09-09.r1.json",
    sha256: digest(newDateBytes),
  };
  crossDateCorrection.snapshots.push(newDateEntry);
  crossDateCorrection.latest = newDateEntry.id;
  const crossDateRecords = records.concat({ entry: newDateEntry, bytes: newDateBytes });
  assert.ok(validateIndex(crossDateCorrection, crossDateRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_UNEXPECTED_CORRECTION",
  ));

  const backwardsRevision = structuredClone(index);
  const backwardsSnapshot = JSON.parse(records.at(-1).bytes.toString("utf8"));
  backwardsSnapshot.generated_at = "2026-09-08T00:41:30Z";
  const backwardsBytes = Buffer.from(JSON.stringify(backwardsSnapshot));
  backwardsRevision.snapshots.at(-1).sha256 = digest(backwardsBytes);
  const backwardsRecords = records.slice(0, -1).map((record, position) => ({
    entry: backwardsRevision.snapshots[position], bytes: record.bytes,
  })).concat({ entry: backwardsRevision.snapshots.at(-1), bytes: backwardsBytes });
  assert.ok(validateIndex(backwardsRevision, backwardsRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_GENERATED_AT_ORDER_INVALID",
  ));

  const malformedHistory = structuredClone(index);
  const malformedBytes = Buffer.from(JSON.stringify({
    schema_version: "2.0.0",
    snapshot_id: "2026-09-08",
    record_id: "2026-09-08.r2",
  }));
  malformedHistory.snapshots.at(-1).sha256 = digest(malformedBytes);
  const malformedRecords = records.slice(0, -1).map((record, position) => ({
    entry: malformedHistory.snapshots[position], bytes: record.bytes,
  })).concat({ entry: malformedHistory.snapshots.at(-1), bytes: malformedBytes });
  assert.ok(validateIndex(malformedHistory, malformedRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_RECORD_SCHEMA_INVALID",
  ));

  const unknownSchema = structuredClone(index);
  unknownSchema.snapshots.at(-1).schema_version = "9.9.9";
  const unknownSchemaRecords = records.map((record, position) => ({
    entry: unknownSchema.snapshots[position], bytes: record.bytes,
  }));
  assert.ok(validateIndex(unknownSchema, unknownSchemaRecords).errors.some(
    ({ code }) => code === "SNAPSHOT_INDEX_SCHEMA_UNAVAILABLE",
  ));
});

test("the production build refuses v1.8 and injects derived timing assessments for v2.0", () => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "mind-flow-timing-integration-"));
  const outputPath = join(outputDirectory, "index.html");
  execFileSync(process.execPath, [buildPath, snapshotPath, outputPath]);
  const built = readFileSync(outputPath, "utf8");
  assert.match(built, /FROZEN ASSESSMENT, NOT LIVE/i);
  assert.doesNotMatch(built, /CURRENT AS OF|function currentnessFor\(|Vintage:/i);
  const timingData = built.match(/<script id="timing-assessment-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(timingData, "build must inject timing assessments outside the snapshot claim record");
  const bundle = JSON.parse(timingData[1]);
  assert.equal(bundle.assessment_schema_version, "1.0.0");
  assert.deepEqual(bundle.evaluator, {
    id: "timing-assessment-kernel",
    version: "1.0.0",
    code_sha256: digest(readFileSync(timingEvaluatorPath)),
  });
  const { assessment_id: assessmentId, ...assessmentPayload } = bundle;
  assert.equal(assessmentId, digest(Buffer.from(canonicalJson(assessmentPayload))));
  const assessmentAjv = new Ajv2020({
    allErrors: true, strict: true, strictRequired: false,
  });
  addFormats(assessmentAjv);
  assessmentAjv.addSchema(JSON.parse(readFileSync(timingSchemaPath, "utf8")));
  const validateAssessments = assessmentAjv.compile(JSON.parse(
    readFileSync(timingAssessmentSchemaPath, "utf8"),
  ));
  assert.equal(validateAssessments(bundle), true, assessmentAjv.errorsText(validateAssessments.errors));
  const unsignedBundle = structuredClone(bundle);
  delete unsignedBundle.evaluator;
  assert.equal(validateAssessments(unsignedBundle), false);
  assert.deepEqual(bundle.record_binding, {
    record_id: "2026-09-08.r2",
    snapshot_sha256: digest(readFileSync(snapshotPath)),
    evidence_policy_sha256: digest(readFileSync(policyPath)),
    evidence_cutoff: "2026-09-08T00:41:31Z",
    record_generated_at: "2026-09-08T09:49:00Z",
  });
  assert.ok(Object.values(bundle.signals).every(
    (assessment) => assessment.record_generated_at && !Object.hasOwn(assessment, "snapshot_revision"),
  ));
  const assessments = bundle.signals;
  assert.ok(assessments["gdp-per-capita"]);
  assert.ok(assessments["engels-divergence"].inherited_from_signal_ids);
  assert.equal(
    assessments["engels-divergence"].assessment_binding.kind,
    "public_update_source_points",
  );

  const legacyCopy = join(outputDirectory, "legacy.json");
  writeFileSync(legacyCopy, readFileSync(oldR1Path));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, legacyCopy, outputPath], { stdio: "pipe" }),
    /schema 1\.9|schema validation failed|record_id/i,
  );
});

test("the public template exposes all clocks without browser-side date arithmetic", () => {
  const template = readFileSync(templatePath, "utf8");
  assert.match(template, /FROZEN ASSESSMENT, NOT LIVE/i);
  assert.match(template, /reference_coverage|publisher_vintage|publisher_release|retrieval_recency|byte_acquisition|record_generated_at/i);
  assert.match(template, /<dt>Record<\/dt><dd[^>]+id="m-id"/i);
  assert.match(template, /<dt>Evidence cut-off<\/dt><dd[^>]+id="m-cutoff"/i);
  assert.match(template, /<dt>Record revised<\/dt><dd[^>]+id="m-gen"/i);
  assert.match(template, /record generation are separate clocks/i);
  assert.doesNotMatch(template, /snapshot revision are separate clocks/i);
  assert.match(template, /__TIMING_ASSESSMENTS__/);
  assert.match(template, /DERIVED TIMING NOT ASSESSED FOR THIS POINT/);
  assert.match(template, /function fullPointEvidenceLabel\(/);
  assert.match(template, /RELEASE READING.*RETRIEVAL READING.*ACQUISITION READING/is);
  assert.match(template, /createElementNS\(NS,"desc"\)/);
  assert.match(template, /fullPointEvidenceLabel\(sig,last,/);
  assert.doesNotMatch(template, /CURRENT AS OF|function currentnessFor\(|signal_max_age_years|Date\.UTC\(/i);
  assert.doesNotMatch(template, /—/);
});

test("selection exports disclose their boundary and retain assessment identity without a hard-coded signal", () => {
  const template = readFileSync(templatePath, "utf8");
  assert.match(template, /artifact_kind:["']selection_only["']/);
  assert.match(template, /reference_closure:["']external_record_binding["']/);
  assert.match(template, /source_assessment_bundle/);
  assert.match(template, /assessment_schema_version:timingAssessmentBundle\.assessment_schema_version/);
  assert.match(template, /assessment_id:timingAssessmentBundle\.assessment_id/);
  assert.match(template, /evaluator:timingAssessmentBundle\.evaluator/);
  assert.match(template, /record_binding:timingAssessmentBundle\.record_binding/);
  assert.match(template, /public_update:["']omitted_from_selection_export["']/);
  assert.doesNotMatch(template, /public_update_timing_assessment:timingAssessments\[["']engels-divergence["']\]/);
});

test("the retired v1.8 live fetch path cannot rewrite the v2.0 record index", () => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "mind-flow-retired-fetch-"));
  assert.throws(
    () => execFileSync("python3", [
      fetchPath,
      "--id", "2026-09-07",
      "--out", outputDirectory,
    ], { stdio: "pipe" }),
    /live snapshot emission is retired.*2\.0 timing and acquisition contract/i,
  );
});

test("the production build rejects timing-policy and exact-lineage drift", () => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "mind-flow-timing-attacks-"));
  const outputPath = join(outputDirectory, "index.html");
  const candidatePath = join(outputDirectory, "candidate.json");
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

  const dependencyDrift = structuredClone(snapshot);
  dependencyDrift.signals.find(({ id }) => id === "engels-divergence")
    .source.timing.inherits_from_signal_ids = ["labour-share", "inflation"];
  writeFileSync(candidatePath, JSON.stringify(dependencyDrift));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, candidatePath, outputPath], { stdio: "pipe" }),
    /timing contract.*DERIVATION_CONTRACT_MISMATCH/i,
  );

  const pointDrift = structuredClone(snapshot);
  pointDrift.signals.find(({ id }) => id === "transmission-gap")
    .source.timing.assessment_lineage[0].year = 2023;
  writeFileSync(candidatePath, JSON.stringify(pointDrift));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, candidatePath, outputPath], { stdio: "pipe" }),
    /timing contract.*DERIVED_ASSESSMENT_BINDING_MISMATCH/i,
  );

  const updateLineageDrift = structuredClone(snapshot);
  updateLineageDrift.signals.find(({ id }) => id === "engels-divergence")
    .source.timing.assessment_lineage[1].year = 2024;
  writeFileSync(candidatePath, JSON.stringify(updateLineageDrift));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, candidatePath, outputPath], { stdio: "pipe" }),
    /timing contract.*DERIVED_ASSESSMENT_BINDING_MISMATCH/i,
  );

  const retrievalDrift = structuredClone(snapshot);
  retrievalDrift.signals.find(({ id }) => id === "gdp-per-capita")
    .source.timing.retrieval.on = "2026-09-09";
  writeFileSync(candidatePath, JSON.stringify(retrievalDrift));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, candidatePath, outputPath], { stdio: "pipe" }),
    /timing contract.*RETRIEVAL_AFTER_EVIDENCE_CUTOFF/i,
  );

  const recordDateDrift = structuredClone(snapshot);
  recordDateDrift.record_id = "2099-12-31.r7";
  recordDateDrift.public_update.observed.record_id = recordDateDrift.record_id;
  recordDateDrift.public_update.update_id = recordDateDrift.public_update.update_id
    .replace(snapshot.record_id, recordDateDrift.record_id);
  writeFileSync(candidatePath, JSON.stringify(recordDateDrift));
  assert.throws(
    () => execFileSync(process.execPath, [buildPath, candidatePath, outputPath], { stdio: "pipe" }),
    /record_id date must equal snapshot_id/i,
  );
});
