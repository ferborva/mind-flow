import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { auditPrimaryCareThresholds } from "../tools/audit-primary-care.mts";

const path = new URL("../basket/primary-care.kernel.r3.json", import.meta.url);
test("AU current review invokes source-aware threshold and strict schema-profile audits", () => {
  const bytes = readFileSync(path);
  const kernel = JSON.parse(bytes);
  const result = auditPrimaryCareThresholds(kernel);
  assert.equal(result.formal_kernel_valid, true);
  assert.equal(result.schema_profile.schema_profile_valid, true);
  assert.ok(result.threshold_audits.length > 0);
  assert.ok(result.threshold_audits.some((item) => item.audit.domain_assessment === "unassessed"));
  assert.ok(result.threshold_audits.some((item) => item.audit.issues.some((issue) => issue.code === "THRESHOLD_OUTSIDE_OBSERVED_ENVELOPE")));
  assert.notEqual(result.status, "assessed_no_flags");
  assert.ok(result.retained_measurements_sha256.startsWith("sha256:"));
  assert.deepEqual(readFileSync(path), bytes, "the audit never rewrites an old kernel");
  const urgent = result.threshold_audits.find((item) => item.condition_id.endsWith("telehealth-urgent"));
  assert.equal(urgent.audit.evidence_assessment, "unassessed", "routine rule values cannot fill the urgent exemption's missing observations");
});
