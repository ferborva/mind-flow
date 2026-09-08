import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import * as releaseValidation from "../../governance/public-release-validation.mjs";

const {
  assessReleaseReadiness,
  prepareExternalAuthorityReview,
} = releaseValidation;

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const fixture = readJson(join(root, "governance", "fixtures", "public-release.shadow.valid.json"));
const roundTwoRecordPath = join(
  root,
  "governance",
  "records",
  "observatory-round-02.blocked.json",
);
const schema = readJson(join(root, "governance", "schema", "public-release.schema.json"));
const governanceGuide = readFileSync(
  join(root, "governance", "public-release-governance.md"),
  "utf8",
);
const trustedBoundary = readFileSync(
  join(root, "governance", "trusted-issuance-boundary.md"),
  "utf8",
);
const clone = (value) => structuredClone(value);
const checksumFrozenFile = (path) => {
  const relativePath = path.slice(`${root}/`.length);
  const bytes = execFileSync("git", ["show", `review/round-02:${relativePath}`], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
};

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
  const assessment = assessReleaseReadiness(fixture);
  assert.equal(assessment.valid, true);
  assert.equal(assessment.requested_stage_structurally_consistent, true);
  assert.equal(assessment.structurally_eligible_for_external_authority_review, false);
  assert.equal(assessment.public_release_authorized, false);
  assert.equal(assessment.operational_action_authorized, false);
  assert.equal(assessment.external_authority_required, false);
  assert.throws(
    () => prepareExternalAuthorityReview(fixture),
    { name: "ReleaseReadinessBlockedError" },
  );
  assert.deepEqual(fixture.decision.approved_by, []);
});

test("the round-two Observatory record pins real files and remains blocked", () => {
  const record = readJson(roundTwoRecordPath);
  assert.equal(validateSchema(record), true, ajv.errorsText(validateSchema.errors));
  assert.equal(
    record.artifact.checksum,
    checksumFrozenFile(join(root, "dashboard", "web", "index.html")),
  );
  assert.equal(
    record.sources[0].checksum,
    checksumFrozenFile(join(root, "dashboard", "snapshots", "2026-09-07.json")),
  );
  assert.equal(
    record.evidence_register[0].checksum,
    checksumFrozenFile(join(
      root,
      "reviews",
      "public-comprehension-affected-party-protocol-round-04.md",
    )),
  );

  const assessment = assessReleaseReadiness(record);
  assert.equal(assessment.valid, true);
  assert.equal(assessment.requested_stage_structurally_consistent, true);
  assert.equal(assessment.public_release_authorized, false);
  assert.deepEqual(assessment.blocking_gates, [...GATES].sort());
  assert.throws(
    () => prepareExternalAuthorityReview(record),
    { name: "ReleaseReadinessBlockedError" },
  );
});

test("a syntactically complete public record is only eligible for external authority review", () => {
  const releasable = approveForConformance(fixture);
  assert.equal(validateSchema(releasable), true, ajv.errorsText(validateSchema.errors));
  const assessment = assessReleaseReadiness(releasable);
  assert.deepEqual(assessment, {
    valid: true,
    requested_stage_structurally_consistent: true,
    structurally_eligible_for_external_authority_review: true,
    external_authority_required: true,
    public_release_authorized: false,
    operational_action_authorized: false,
    blocking_gates: [],
    errors: [],
  });
  const packet = prepareExternalAuthorityReview(releasable);
  assert.equal(packet.status, "awaiting-external-authority-review");
  assert.equal(packet.requested_release_stage, "limited-public-signal");
  assert.equal(packet.public_release_authorized, false);
  assert.equal("authorised_at" in packet, false);
  assert.equal("approved_by" in packet, false);
  assert.equal("issuePublicRelease" in releaseValidation, false);

  const approvalWithoutApprover = clone(releasable);
  approvalWithoutApprover.decision.approved_by = [];
  assert.equal(validateSchema(approvalWithoutApprover), false);
  assert.ok(assessReleaseReadiness(approvalWithoutApprover).errors.some(
    (error) => error.code === "PUBLICATION_APPROVER_MISSING",
  ));
  assert.throws(
    () => prepareExternalAuthorityReview(approvalWithoutApprover),
    { name: "ReleaseReadinessBlockedError" },
  );

  const missingGate = clone(releasable);
  delete missingGate.gates.challenge;
  assert.ok(assessReleaseReadiness(missingGate).errors.some(
    (error) => error.code === "RELEASE_GATE_MISSING",
  ));
  assert.throws(
    () => prepareExternalAuthorityReview(missingGate),
    { name: "ReleaseReadinessBlockedError" },
  );

  const noSources = clone(releasable);
  noSources.sources = [];
  assert.ok(assessReleaseReadiness(noSources).errors.some(
    (error) => error.code === "SOURCE_REGISTER_EMPTY",
  ));

  const hiddenGap = clone(releasable);
  hiddenGap.gates.uncertainty.gaps = ["A complete gate cannot hide this gap."];
  assert.ok(assessReleaseReadiness(hiddenGap).errors.some(
    (error) => error.code === "COMPLETE_GATE_HAS_GAPS",
  ));

  for (const gateName of GATES) {
    const blocked = clone(releasable);
    blocked.gates[gateName].status = "incomplete";
    blocked.gates[gateName].gaps = ["Deliberately incomplete in this test."];
    const result = assessReleaseReadiness(blocked);
    assert.equal(
      result.structurally_eligible_for_external_authority_review,
      false,
      `${gateName} did not block structural review readiness`,
    );
    assert.ok(result.blocking_gates.includes(gateName));
    assert.throws(
      () => prepareExternalAuthorityReview(blocked),
      { name: "ReleaseReadinessBlockedError" },
    );
  }
});

test("the documented terminal boundary cannot be mistaken for repository authority", () => {
  assert.doesNotMatch(governanceGuide, /`issuePublicRelease\(record\)` is/);
  assert.match(governanceGuide, /cannot authorise publication/i);
  assert.match(trustedBoundary, /public_release_authorized: false/);
  for (const control of [
    "authenticated",
    "scope",
    "signature",
    "evidence-byte",
    "expiry",
    "revocation",
    "deployment",
  ]) {
    assert.match(trustedBoundary, new RegExp(control, "i"));
  }
});

test("passing labels do not override pending, expired or stale evidence", () => {
  const pendingChallenge = approveForConformance(fixture);
  pendingChallenge.evidence_register.find(
    (item) => item.id === "review.challenge-mechanism",
  ).outcome = "pending";
  assert.ok(assessReleaseReadiness(pendingChallenge).blocking_gates.includes("challenge"));

  const expiredAuthority = approveForConformance(fixture);
  expiredAuthority.evidence_register.find(
    (item) => item.id === "review.publication-authority",
  ).valid_through = "2026-09-07T23:59:59Z";
  assert.ok(assessReleaseReadiness(expiredAuthority).blocking_gates.includes("authority"));

  const staleSource = approveForConformance(fixture);
  staleSource.sources[0].vintage_date = "2026-01-01";
  assert.ok(assessReleaseReadiness(staleSource).blocking_gates.includes("source_vintage"));

  const staleBeforeDelayedApproval = approveForConformance(fixture);
  staleBeforeDelayedApproval.decision.decided_at = "2026-10-02T01:00:00Z";
  assert.ok(
    assessReleaseReadiness(staleBeforeDelayedApproval).blocking_gates.includes("source_vintage"),
  );

  const incompleteAccessibilityReview = approveForConformance(fixture);
  incompleteAccessibilityReview.evidence_register.find(
    (item) => item.id === "review.accessibility",
  ).coverage = ["plain-language", "disability-access", "translation", "numeracy"];
  assert.ok(
    assessReleaseReadiness(incompleteAccessibilityReview).blocking_gates.includes("accessibility"),
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
  const assessment = assessReleaseReadiness(operational);
  assert.equal(assessment.structurally_eligible_for_external_authority_review, true);
  assert.equal(assessment.public_release_authorized, false);
  assert.equal(assessment.operational_action_authorized, false);
  assert.equal(assessment.external_authority_required, true);

  const noActionAuthority = clone(operational);
  noActionAuthority.gates.authority.evidence_refs = ["review.publication-authority"];
  assert.ok(assessReleaseReadiness(noActionAuthority).blocking_gates.includes("authority"));

  const noContract = clone(operational);
  delete noContract.action_contract;
  assert.equal(assessReleaseReadiness(noContract).operational_action_authorized, false);
  assert.ok(assessReleaseReadiness(noContract).errors.some(
    (error) => error.code === "OPERATIONAL_ACTION_CONTRACT_MISSING",
  ));

  const unpinnedContract = clone(operational);
  unpinnedContract.action_contract.checksum = "sha256:unverified";
  assert.ok(assessReleaseReadiness(unpinnedContract).errors.some(
    (error) => error.code === "ACTION_CONTRACT_REFERENCE_INVALID",
  ));
  assert.throws(
    () => prepareExternalAuthorityReview(unpinnedContract),
    { name: "ReleaseReadinessBlockedError" },
  );
});

test("release stage, circulation, decision and effect cannot contradict each other", () => {
  const internalApproval = clone(fixture);
  internalApproval.release_stage = "internal-prototype";
  internalApproval.circulation = "internal";
  internalApproval.decision = approveForConformance(fixture).decision;
  assert.ok(assessReleaseReadiness(internalApproval).errors.some(
    (error) => error.code === "NONPUBLIC_STAGE_CANNOT_BE_APPROVED_FOR_PUBLICATION",
  ));

  const publicButRestricted = approveForConformance(fixture);
  publicButRestricted.circulation = "restricted";
  assert.ok(assessReleaseReadiness(publicButRestricted).errors.some(
    (error) => error.code === "RELEASE_STAGE_CIRCULATION_MISMATCH",
  ));

  const signalWithEffect = approveForConformance(fixture);
  signalWithEffect.operational_effect = true;
  assert.ok(assessReleaseReadiness(signalWithEffect).errors.some(
    (error) => error.code === "LIMITED_SIGNAL_CANNOT_HAVE_OPERATIONAL_EFFECT",
  ));

  const unpinnedArtifact = approveForConformance(fixture);
  unpinnedArtifact.artifact.checksum = "sha256:missing";
  assert.ok(assessReleaseReadiness(unpinnedArtifact).errors.some(
    (error) => error.code === "RELEASE_ARTIFACT_REFERENCE_INVALID",
  ));
  assert.throws(
    () => prepareExternalAuthorityReview(unpinnedArtifact),
    { name: "ReleaseReadinessBlockedError" },
  );
});

test("semantic release validation rejects normalised and timezone-ambiguous dates", () => {
  const impossibleAssessment = clone(fixture);
  impossibleAssessment.assessed_at = "2026-02-30T00:30:00Z";
  assert.ok(assessReleaseReadiness(impossibleAssessment).errors.some(
    (error) => error.code === "RELEASE_DATE_INVALID",
  ));

  const localTimeAssessment = clone(fixture);
  localTimeAssessment.assessed_at = "2026-09-08T00:30:00";
  assert.ok(assessReleaseReadiness(localTimeAssessment).errors.some(
    (error) => error.code === "RELEASE_DATE_INVALID",
  ));

  const impossibleVintage = clone(fixture);
  impossibleVintage.sources[0].vintage_date = "2026-02-30";
  const impossibleVintageResult = assessReleaseReadiness(impossibleVintage);
  assert.ok(impossibleVintageResult.errors.some(
    (error) => error.code === "SOURCE_DATE_ORDER_INVALID",
  ));
  assert.ok(impossibleVintageResult.blocking_gates.includes("source_vintage"));

  const impossibleEvidenceDate = approveForConformance(fixture);
  impossibleEvidenceDate.evidence_register[0].reviewed_at = "2026-02-30T00:00:00Z";
  const impossibleEvidenceResult = assessReleaseReadiness(impossibleEvidenceDate);
  assert.ok(impossibleEvidenceResult.blocking_gates.includes("authority"));
  assert.ok(impossibleEvidenceResult.errors.some(
    (error) => error.code === "REVIEW_EVIDENCE_DATE_INVALID",
  ));
});
