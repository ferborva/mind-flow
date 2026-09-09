import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const ledger = JSON.parse(readFileSync(
  resolve(root, "reviews/round-06-disposition-ledger.json"),
  "utf8",
));

const requiredIds = [
  "R06-F1-01", "R06-F1-02", "R06-F1-03",
  "R06-F2-01", "R06-F2-02", "R06-F2-03", "R06-F2-04", "R06-F2-05",
  "R06-F3-01", "R06-F3-02", "R06-F3-03",
  "R06-F4-01", "R06-F4-02", "R06-F4-03",
  "R06-F5-01", "R06-F5-02", "R06-F5-03", "R06-F5-04",
  "R06-F6-01", "R06-F6-02",
  "R06-F7-01", "R06-F7-02", "R06-F7-03",
];

const requiredP3Ids = [
  "R06-F2-06", "R06-F2-07", "R06-F2-08", "R06-F2-09", "R06-F2-10",
  "R06-F3-04", "R06-F3-05", "R06-F3-06",
  "R06-F4-04", "R06-F4-05", "R06-F4-06", "R06-F4-07", "R06-F4-08", "R06-F4-09",
  "R06-F5-05", "R06-F5-06", "R06-F5-07", "R06-F5-08", "R06-F5-09",
  "R06-F6-03", "R06-F6-04", "R06-F6-05", "R06-F6-06",
  "R06-F7-04", "R06-F7-05", "R06-F7-06",
];

test("Round 06 ledger disposes every P1 and P2 without claiming external closure", () => {
  assert.deepEqual(
    new Set(ledger.findings.map(({ id }) => id)),
    new Set(requiredIds),
  );
  for (const finding of ledger.findings) {
    assert.ok(["P1", "P2"].includes(finding.severity));
    assert.ok(["accepted", "rejected", "deferred"].includes(finding.disposition));
    assert.ok(finding.reason.length > 20);
    assert.ok(finding.owner_role.length > 3);
    assert.ok(finding.residual_risk.length > 20);
    assert.ok(finding.next_test.length > 20);
    assert.notEqual(finding.resolution_status, "independently-closed");
  }
  assert.equal(ledger.public_release_allowed, false);
  assert.equal(ledger.operational_use_allowed, false);
  assert.equal(ledger.boundaries.independent_retest_completed, false);
  assert.equal(ledger.boundaries.affected_party_review_completed, false);
});

test("the Round 07 freeze state follows unresolved P1 findings", () => {
  const openP1 = ledger.findings.filter(({ severity, resolution_status: status }) =>
    severity === "P1" && !status.startsWith("locally-contained"));
  assert.equal(ledger.round_07_freeze_allowed, openP1.length === 0);
});

test("Round 06 ledger explicitly disposes every reported P3", () => {
  assert.deepEqual(new Set(ledger.p3_findings.map(({ id }) => id)), new Set(requiredP3Ids));
  for (const finding of ledger.p3_findings) {
    assert.equal(finding.severity, "P3");
    assert.ok(["accepted", "rejected", "deferred"].includes(finding.disposition));
    assert.ok(finding.reason.length > 20);
    assert.ok(finding.residual_risk.length > 20);
    assert.ok(finding.next_test.length > 20);
    if (finding.disposition === "deferred") assert.ok(finding.review_on);
  }
});
