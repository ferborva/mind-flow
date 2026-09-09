import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const ledger = JSON.parse(readFileSync(
  resolve(root, "reviews", "round-03-disposition-ledger.json"),
  "utf8",
));

const reports = [
  "reviews/external/round-03/first-pass-if-system.md",
  "reviews/external/round-03/first-pass-evidence-forecast.md",
  "reviews/external/round-03/first-pass-thesis-human.md",
  "reviews/external/round-03/second-pass-agency-map.md",
  "reviews/external/round-03/second-pass-integration-architecture.md",
  "reviews/external/round-03/second-pass-public-experience.md",
  "reviews/external/round-03/second-pass-thesis-evidence.md",
];

const externallyAssignedIds = [
  ...Array.from({ length: 11 }, (_, index) => `R03-EXT-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 8 }, (_, index) => `R03-EF-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 8 }, (_, index) => `R03-HUM-${String(index + 1).padStart(3, "0")}`),
];

test("round-three ledger preserves every report and every externally assigned finding ID", () => {
  assert.equal(ledger.schema_version, "1.0.0");
  assert.equal(ledger.review_ref, "review/round-03");
  assert.equal(ledger.reviewed_commit, "f5b3b643e80e0f16d7dadd13805df6accf9526ed");
  assert.deepEqual([...ledger.review_reports].sort(), [...reports].sort());

  const ids = ledger.findings.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, "finding IDs must remain unique");
  for (const id of externallyAssignedIds) {
    assert.ok(ids.includes(id), `${id} is absent from the disposition ledger`);
  }
});

test("every disposition preserves residual risk and an executable next challenge", () => {
  assert.equal(ledger.public_release_allowed, false);
  assert.ok(ledger.findings.length >= 60);

  for (const finding of ledger.findings) {
    assert.match(finding.id, /^R03-/);
    assert.ok(reports.includes(finding.report), `${finding.id} has an unknown report`);
    assert.ok(["P0", "P1", "P2"].includes(finding.severity));
    assert.ok(["accepted", "partially-accepted"].includes(finding.disposition));
    assert.ok([
      "unresolved",
      "locally-contained-awaiting-independent-retest",
      "in-progress",
    ].includes(finding.resolution_status));
    assert.notEqual(finding.resolution_status, "closed");
    assert.match(finding.owner_role, /\S/);
    assert.match(finding.residual_risk, /\S/);
    assert.match(finding.next_test, /\S/);
  }
});

test("local containment never becomes authority, truth, or independent closure", () => {
  assert.equal(ledger.boundaries.local_tests_establish_truth, false);
  assert.equal(ledger.boundaries.local_tests_establish_authority, false);
  assert.equal(ledger.boundaries.agents_can_close_findings, false);
  assert.equal(ledger.boundaries.integrated_transition_is_coherent, false);
  assert.equal(ledger.boundaries.operational_monitoring_exists, false);
});
