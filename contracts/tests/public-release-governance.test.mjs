import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessPublicRelease,
  issuePublicRelease,
} from "../../governance/public-release-validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = readJson(join(root, "governance", "fixtures", "public-release.shadow.valid.json"));
const schema = readJson(join(root, "governance", "schema", "public-release.schema.json"));
const clone = (value) => structuredClone(value);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const GATES = [
  "authority",
  "affected_party_review",
  "uncertainty",
  "challenge",
  "accessibility",
  "security_privacy",
  "correction",
  "source_vintage",
];

function approveForConformance(record) {
  const approved = clone(record);
  approved.id = "release.synthetic-limited-public-conformance-test";
  approved.release_stage = "limited-public-signal";
  approved.circulation = "public";
  approved.operational_effect = false;
  approved.decision = {
    status: "approved",
    rationale: "Synthetic positive path used only to exercise validator invariants.",
    decided_at: "2026-09-08T01:00:00Z",
    approved_by: [{
      organisation: "Synthetic conformance authority, not a real institution",
      role: "test-only publication approver",
      evidence_ref: "review.publication-authority",
    }],
  };
  for (const gate of Object.values(approved.gates)) {
    gate.status = "complete";
    gate.gaps = [];
  }
  for (const evidence of approved.evidence_register) evidence.outcome = "passed";
  return approved;
}

test("the honest shadow record is valid but cannot become a public release", () => {
  assert.equal(validateSchema(fixture), true, ajv.errorsText(validateSchema.errors));
  const assessment = assessPublicRelease(fixture);
  assert.equal(assessment.valid, true);
  assert.equal(assessment.stage_allowed, true);
  assert.equal(assessment.public_release_allowed, false);
  assert.equal(assessment.operational_action_allowed, false);
  assert.throws(() => issuePublicRelease(fixture), { name: "PublicReleaseBlockedError" });
  assert.deepEqual(fixture.decision.approved_by, []);
});

test("a limited public signal requires every release gate and has no operational effect", () => {
  const releasable = approveForConformance(fixture);
  assert.equal(validateSchema(releasable), true, ajv.errorsText(validateSchema.errors));
  const assessment = assessPublicRelease(releasable);
  assert.deepEqual(assessment, {
    valid: true,
    stage_allowed: true,
    public_release_allowed: true,
    operational_action_allowed: false,
    blocking_gates: [],
    errors: [],
  });
  const authorization = issuePublicRelease(releasable);
  assert.equal(authorization.release_stage, "limited-public-signal");
  assert.equal(authorization.operational_effect, false);

  const approvalWithoutApprover = clone(releasable);
  approvalWithoutApprover.decision.approved_by = [];
  assert.equal(validateSchema(approvalWithoutApprover), false);
  assert.ok(assessPublicRelease(approvalWithoutApprover).errors.some(
    (error) => error.code === "PUBLICATION_APPROVER_MISSING",
  ));
  assert.throws(
    () => issuePublicRelease(approvalWithoutApprover),
    { name: "PublicReleaseBlockedError" },
  );

  const missingGate = clone(releasable);
  delete missingGate.gates.challenge;
  assert.ok(assessPublicRelease(missingGate).errors.some(
    (error) => error.code === "RELEASE_GATE_MISSING",
  ));
  assert.throws(() => issuePublicRelease(missingGate), { name: "PublicReleaseBlockedError" });

  const noSources = clone(releasable);
  noSources.sources = [];
  assert.ok(assessPublicRelease(noSources).errors.some(
    (error) => error.code === "SOURCE_REGISTER_EMPTY",
  ));

  const hiddenGap = clone(releasable);
  hiddenGap.gates.uncertainty.gaps = ["A complete gate cannot hide this gap."];
  assert.ok(assessPublicRelease(hiddenGap).errors.some(
    (error) => error.code === "COMPLETE_GATE_HAS_GAPS",
  ));

  for (const gateName of GATES) {
    const blocked = clone(releasable);
    blocked.gates[gateName].status = "incomplete";
    blocked.gates[gateName].gaps = ["Deliberately incomplete in this test."];
    const result = assessPublicRelease(blocked);
    assert.equal(result.public_release_allowed, false, `${gateName} did not block release`);
    assert.ok(result.blocking_gates.includes(gateName));
    assert.throws(() => issuePublicRelease(blocked), { name: "PublicReleaseBlockedError" });
  }
});

test("passing labels do not override pending, expired or stale evidence", () => {
  const pendingChallenge = approveForConformance(fixture);
  pendingChallenge.evidence_register.find(
    (item) => item.id === "review.challenge-mechanism",
  ).outcome = "pending";
  assert.ok(assessPublicRelease(pendingChallenge).blocking_gates.includes("challenge"));

  const expiredAuthority = approveForConformance(fixture);
  expiredAuthority.evidence_register.find(
    (item) => item.id === "review.publication-authority",
  ).valid_through = "2026-09-07T23:59:59Z";
  assert.ok(assessPublicRelease(expiredAuthority).blocking_gates.includes("authority"));

  const staleSource = approveForConformance(fixture);
  staleSource.sources[0].vintage_date = "2026-01-01";
  assert.ok(assessPublicRelease(staleSource).blocking_gates.includes("source_vintage"));

  const staleBeforeDelayedApproval = approveForConformance(fixture);
  staleBeforeDelayedApproval.decision.decided_at = "2026-10-02T01:00:00Z";
  assert.ok(
    assessPublicRelease(staleBeforeDelayedApproval).blocking_gates.includes("source_vintage"),
  );

  const incompleteAccessibilityReview = approveForConformance(fixture);
  incompleteAccessibilityReview.evidence_register.find(
    (item) => item.id === "review.accessibility",
  ).coverage = ["plain-language", "disability-access", "translation", "numeracy"];
  assert.ok(
    assessPublicRelease(incompleteAccessibilityReview).blocking_gates.includes("accessibility"),
  );
});

test("an operational action needs separate action authority and a pinned action contract", () => {
  const operational = approveForConformance(fixture);
  operational.id = "release.synthetic-operational-conformance-test";
  operational.release_stage = "operational-action";
  operational.operational_effect = true;
  operational.gates.authority.evidence_refs.push("review.operational-authority");
  operational.action_contract = {
    id: "action.synthetic-conformance-test",
    version: "1.0.0",
    checksum: `sha256:${"6".repeat(64)}`,
  };
  const assessment = assessPublicRelease(operational);
  assert.equal(assessment.public_release_allowed, true);
  assert.equal(assessment.operational_action_allowed, true);

  const noActionAuthority = clone(operational);
  noActionAuthority.gates.authority.evidence_refs = ["review.publication-authority"];
  assert.ok(assessPublicRelease(noActionAuthority).blocking_gates.includes("authority"));

  const noContract = clone(operational);
  delete noContract.action_contract;
  assert.equal(assessPublicRelease(noContract).operational_action_allowed, false);
  assert.ok(assessPublicRelease(noContract).errors.some(
    (error) => error.code === "OPERATIONAL_ACTION_CONTRACT_MISSING",
  ));

  const unpinnedContract = clone(operational);
  unpinnedContract.action_contract.checksum = "sha256:unverified";
  assert.ok(assessPublicRelease(unpinnedContract).errors.some(
    (error) => error.code === "ACTION_CONTRACT_REFERENCE_INVALID",
  ));
  assert.throws(
    () => issuePublicRelease(unpinnedContract),
    { name: "PublicReleaseBlockedError" },
  );
});

test("release stage, circulation, decision and effect cannot contradict each other", () => {
  const internalApproval = clone(fixture);
  internalApproval.release_stage = "internal-prototype";
  internalApproval.circulation = "internal";
  internalApproval.decision = approveForConformance(fixture).decision;
  assert.ok(assessPublicRelease(internalApproval).errors.some(
    (error) => error.code === "NONPUBLIC_STAGE_CANNOT_BE_APPROVED_FOR_PUBLICATION",
  ));

  const publicButRestricted = approveForConformance(fixture);
  publicButRestricted.circulation = "restricted";
  assert.ok(assessPublicRelease(publicButRestricted).errors.some(
    (error) => error.code === "RELEASE_STAGE_CIRCULATION_MISMATCH",
  ));

  const signalWithEffect = approveForConformance(fixture);
  signalWithEffect.operational_effect = true;
  assert.ok(assessPublicRelease(signalWithEffect).errors.some(
    (error) => error.code === "LIMITED_SIGNAL_CANNOT_HAVE_OPERATIONAL_EFFECT",
  ));

  const unpinnedArtifact = approveForConformance(fixture);
  unpinnedArtifact.artifact.checksum = "sha256:missing";
  assert.ok(assessPublicRelease(unpinnedArtifact).errors.some(
    (error) => error.code === "RELEASE_ARTIFACT_REFERENCE_INVALID",
  ));
  assert.throws(
    () => issuePublicRelease(unpinnedArtifact),
    { name: "PublicReleaseBlockedError" },
  );
});
