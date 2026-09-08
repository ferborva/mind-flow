#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migratePolicy18, migrateSnapshot18 } from "../timing/migration.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const legacyPolicyPath = resolve(dashboard, "evidence", "archive", "adapter-classification-policy-1.2.json");
const policyPath = resolve(dashboard, "evidence", "adapter-classification-policy.json");
const legacySnapshotPath = resolve(dashboard, "snapshots", "2026-09-07.json");
const predecessorPath = resolve(dashboard, "snapshots", "2026-09-08.json");
const snapshotPath = resolve(dashboard, "snapshots", "2026-09-08.r2.json");
const indexPath = resolve(dashboard, "snapshots", "index.json");
const EXPECTED_LEGACY_POLICY = "sha256:780ad6a23adfca588049841ab648d159a2c95e3e19e848bddfb82b784b56474f";
const EXPECTED_LEGACY_SNAPSHOT = "sha256:f6d5586b0fc60d76d6ade46ee380e74f250a8aabfae3b4a921781f0f0f3fc4f2";
const EXPECTED_PREDECESSOR = "sha256:f09f5b7c2cf2187bd6997921b0b48b2b9857dbf110520167037ff7b00ef8fd35";
const REVISION_AT = "2026-09-08T09:49:00Z";

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function readPinned(path, expected) {
  const bytes = readFileSync(path);
  const actual = sha256(bytes);
  if (actual !== expected) throw new Error(`${path} changed: expected ${expected}, received ${actual}`);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function serialise(value) {
  return `${JSON.stringify(value, null, 1)}\n`;
}

const legacyPolicy = readPinned(legacyPolicyPath, EXPECTED_LEGACY_POLICY);
const legacySnapshot = readPinned(legacySnapshotPath, EXPECTED_LEGACY_SNAPSHOT);
const predecessor = readPinned(predecessorPath, EXPECTED_PREDECESSOR);
const migratedSnapshot = migrateSnapshot18(predecessor.value, {
  recordId: "2026-09-08.r2",
  predecessorRecordId: "2026-09-08.r1",
  predecessorDigest: EXPECTED_PREDECESSOR,
  policyDigest: `sha256:${"0".repeat(64)}`,
  revisionAt: REVISION_AT,
});
const policyBytes = Buffer.from(serialise(migratePolicy18(legacyPolicy.value, {
  signals: migratedSnapshot.signals,
})));
const policyDigest = sha256(policyBytes);
migratedSnapshot.evidence_policy.sha256 = policyDigest;
const snapshotBytes = Buffer.from(serialise(migratedSnapshot));
const snapshotDigest = sha256(snapshotBytes);
const index = {
  schema_version: "2.0.0",
  latest: "2026-09-08.r2",
  snapshots: [
    {
      id: "2026-09-07.r1",
      snapshot_id: legacySnapshot.value.snapshot_id,
      schema_version: legacySnapshot.value.schema_version,
      path: "2026-09-07.json",
      sha256: EXPECTED_LEGACY_SNAPSHOT,
    },
    {
      id: "2026-09-08.r1",
      snapshot_id: predecessor.value.snapshot_id,
      schema_version: predecessor.value.schema_version,
      path: "2026-09-08.json",
      sha256: EXPECTED_PREDECESSOR,
    },
    {
      id: "2026-09-08.r2",
      snapshot_id: predecessor.value.snapshot_id,
      schema_version: "2.0.0",
      path: "2026-09-08.r2.json",
      sha256: snapshotDigest,
    },
  ],
};

writeFileSync(policyPath, policyBytes);
writeFileSync(snapshotPath, snapshotBytes);
writeFileSync(indexPath, serialise(index));
process.stdout.write(`Wrote ${snapshotPath}\nPolicy ${policyDigest}\nSnapshot ${snapshotDigest}\n`);
