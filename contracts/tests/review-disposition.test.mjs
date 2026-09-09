import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const ledger = JSON.parse(readFileSync(
  resolve(root, "reviews", "round-02-disposition-ledger.json"),
  "utf8",
));

const expectedReports = [
  "reviews/external/round-02-evidence-first-pass.md",
  "reviews/external/round-02-system-first-pass.md",
  "reviews/external/round-02-thesis-first-pass.md",
];

test("round-two disposition ledger preserves every immutable first-pass finding", () => {
  assert.equal(ledger.schema_version, "1.0.0");
  assert.equal(ledger.review_ref, "review/round-02");
  assert.equal(ledger.reviewed_commit, "ce005e1c7fc08f05ab9493aa818f593e8397106a");
  assert.deepEqual([...ledger.review_reports].sort(), expectedReports.sort());
  assert.equal(ledger.findings.length, 24);

  const ids = ledger.findings.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, "finding IDs must remain unique");
  for (const finding of ledger.findings) {
    assert.match(finding.id, /^R02-/);
    assert.ok(expectedReports.includes(finding.report), `${finding.id} has an unknown report`);
    assert.ok(["stop-line", "major", "minor"].includes(finding.severity));
    assert.ok(["accepted", "partially-accepted", "rejected", "deferred", "superseded"].includes(
      finding.disposition,
    ));
    assert.ok(["unresolved", "in-progress", "awaiting-independent-closure", "closed"].includes(
      finding.resolution_status,
    ));
    assert.match(finding.owner_role, /\S/);
    assert.match(finding.next_test, /\S/);
  }
});

test("no round-two stop-line is represented as closed before independent re-review", () => {
  const stopLines = ledger.findings.filter(({ severity }) => severity === "stop-line");
  assert.equal(stopLines.length, 10);
  assert.ok(stopLines.every(({ resolution_status }) => resolution_status !== "closed"));
  assert.equal(ledger.public_release_allowed, false);
});

test("independent convergence is linked without deleting duplicate findings", () => {
  const convergence = ledger.convergence_groups;
  assert.ok(convergence.some(({ finding_ids }) =>
    finding_ids.includes("R02-E-001") && finding_ids.includes("R02-AD-SL-01")
  ));
  assert.ok(convergence.some(({ finding_ids }) =>
    finding_ids.includes("R02-BC-SL-03")
  ));
  for (const group of convergence) {
    assert.ok(group.finding_ids.length >= 2);
    for (const id of group.finding_ids) {
      assert.ok(ledger.findings.some((finding) => finding.id === id));
    }
  }
});
