import { checksumJson } from "../contracts/semantic-validation.mjs";

const PUBLIC_STAGES = new Set(["limited-public-signal", "operational-action"]);
const ARTIFACT_KINDS = new Set([
  "dashboard", "forecast", "public-signal", "action-compact", "dataset", "document",
]);
const CIRCULATION = Object.freeze({
  "internal-prototype": "internal",
  "shadow-review": "restricted",
  "limited-public-signal": "public",
  "operational-action": "public",
});
const REQUIRED_EVIDENCE_KINDS = Object.freeze({
  authority: ["publication-authority"],
  affected_party_review: ["affected-party-review"],
  uncertainty: ["uncertainty-disclosure"],
  challenge: ["challenge-mechanism"],
  accessibility: ["accessibility-review"],
  security_privacy: ["security-review", "privacy-review"],
  correction: ["correction-process"],
  source_vintage: ["source-vintage-review"],
});
const GATE_NAMES = Object.freeze(Object.keys(REQUIRED_EVIDENCE_KINDS));
const EVIDENCE_COVERAGE = Object.freeze({
  "publication-authority": ["publication-owner", "decision-scope", "expiry"],
  "operational-authority": ["lawful-basis", "operational-owner", "funding", "appeal", "exit-test"],
  "affected-party-review": ["framing", "thresholds", "dissent", "response"],
  "uncertainty-disclosure": ["missingness", "intervals", "unknown-stale-conflicted", "calibrated-language"],
  "challenge-mechanism": ["submission-route", "independent-review", "response-sla", "disposition-record"],
  "accessibility-review": ["plain-language", "disability-access", "translation", "low-bandwidth", "numeracy"],
  "security-review": ["threat-model", "abuse-cases", "vulnerability-response"],
  "privacy-review": ["data-minimisation", "re-identification", "consent-retention"],
  "correction-process": ["public-ledger", "correction-route", "withdrawal", "response-sla"],
  "source-vintage-review": ["source-id", "checksum", "retrieval", "vintage", "licence", "maximum-age"],
});

function problem(code, path, message) {
  return { code, path, message };
}

function calendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date.getTime();
}

function instant(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value || "");
  if (!match || calendarDate(match[1]) === null) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPinnedReference(reference) {
  return (
    reference &&
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(reference.id) &&
    /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/.test(reference.version) &&
    /^sha256:[a-f0-9]{64}$/.test(reference.checksum)
  );
}

function requiredKinds(record, gateName) {
  const kinds = [...REQUIRED_EVIDENCE_KINDS[gateName]];
  if (gateName === "authority" && record.release_stage === "operational-action") {
    kinds.push("operational-authority");
  }
  return kinds;
}

function requiredCoverage(record, gateName) {
  return requiredKinds(record, gateName).flatMap((kind) => EVIDENCE_COVERAGE[kind]);
}

function evidenceIsCurrent(evidence, assessmentTime, effectiveTime) {
  const reviewed = instant(evidence.reviewed_at);
  const validThrough = instant(evidence.valid_through);
  return (
    reviewed !== null &&
    validThrough !== null &&
    reviewed <= assessmentTime &&
    assessmentTime <= effectiveTime &&
    effectiveTime <= validThrough
  );
}

function validateSources(record, errors, effectiveTime) {
  const assessmentTime = instant(record.assessed_at);
  let current = true;
  if ((record.sources || []).length === 0) {
    errors.push(problem(
      "SOURCE_REGISTER_EMPTY",
      "$.sources",
      "A public release must carry at least one checksum-pinned source record.",
    ));
    current = false;
  }
  const ids = new Set();
  for (const [index, source] of (record.sources || []).entries()) {
    const root = `$.sources[${index}]`;
    if (ids.has(source.id)) {
      errors.push(problem(
        "DUPLICATE_SOURCE_ID",
        `${root}.id`,
        `Source ID ${source.id} is duplicated.`,
      ));
      current = false;
    }
    ids.add(source.id);
    const retrieved = instant(source.retrieved_at);
    const vintage = calendarDate(source.vintage_date);
    if (
      assessmentTime === null ||
      retrieved === null ||
      vintage === null ||
      vintage > retrieved ||
      retrieved > assessmentTime
    ) {
      errors.push(problem(
        "SOURCE_DATE_ORDER_INVALID",
        root,
        "Source vintage must not follow retrieval, and retrieval must not follow assessment.",
      ));
      current = false;
      continue;
    }
    const ageDays = (effectiveTime - vintage) / 86_400_000;
    if (
      !Number.isInteger(source.maximum_age_days) ||
      source.maximum_age_days < 0 ||
      ageDays > source.maximum_age_days
    ) {
      current = false;
    }
  }
  return current;
}

export function assessPublicRelease(record) {
  const errors = [];
  const blockingGates = new Set();
  const assessmentTime = instant(record.assessed_at);
  const effectiveTime = record.decision?.status === "approved"
    ? instant(record.decision.decided_at)
    : assessmentTime;
  if (assessmentTime === null || effectiveTime === null) {
    errors.push(problem(
      "RELEASE_DATE_INVALID",
      "$.assessed_at",
      "Assessment and approval dates must be machine-readable.",
    ));
  } else if (effectiveTime < assessmentTime) {
    errors.push(problem(
      "RELEASE_DECIDED_BEFORE_ASSESSMENT",
      "$.decision.decided_at",
      "A release decision cannot precede its assessment.",
    ));
  }

  if (
    !isPinnedReference(record.artifact) ||
    !ARTIFACT_KINDS.has(record.artifact?.kind) ||
    typeof record.artifact?.title !== "string" ||
    record.artifact.title.length === 0
  ) {
    errors.push(problem(
      "RELEASE_ARTIFACT_REFERENCE_INVALID",
      "$.artifact",
      "A release must pin a titled artifact with a valid kind, ID, version and SHA-256 checksum.",
    ));
  }

  if (CIRCULATION[record.release_stage] !== record.circulation) {
    errors.push(problem(
      "RELEASE_STAGE_CIRCULATION_MISMATCH",
      "$.circulation",
      `Stage ${record.release_stage} requires ${CIRCULATION[record.release_stage]} circulation.`,
    ));
  }
  if (
    record.release_stage === "limited-public-signal" &&
    record.operational_effect !== false
  ) {
    errors.push(problem(
      "LIMITED_SIGNAL_CANNOT_HAVE_OPERATIONAL_EFFECT",
      "$.operational_effect",
      "A limited public signal must remain informational and non-operational.",
    ));
  }
  if (
    record.release_stage === "operational-action" &&
    record.operational_effect !== true
  ) {
    errors.push(problem(
      "OPERATIONAL_STAGE_REQUIRES_OPERATIONAL_EFFECT",
      "$.operational_effect",
      "An operational-action record must declare its operational effect.",
    ));
  }
  if (
    !PUBLIC_STAGES.has(record.release_stage) &&
    record.operational_effect !== false
  ) {
    errors.push(problem(
      "NONPUBLIC_STAGE_CANNOT_HAVE_OPERATIONAL_EFFECT",
      "$.operational_effect",
      "Internal and shadow stages cannot have operational effect.",
    ));
  }
  if (
    !PUBLIC_STAGES.has(record.release_stage) &&
    record.decision?.status === "approved"
  ) {
    errors.push(problem(
      "NONPUBLIC_STAGE_CANNOT_BE_APPROVED_FOR_PUBLICATION",
      "$.decision.status",
      "Internal and shadow records cannot carry a public-release approval.",
    ));
  }
  if (record.release_stage === "operational-action" && !record.action_contract) {
    errors.push(problem(
      "OPERATIONAL_ACTION_CONTRACT_MISSING",
      "$.action_contract",
      "An operational action must pin its action contract.",
    ));
  }
  if (
    record.release_stage === "operational-action" &&
    record.action_contract &&
    !isPinnedReference(record.action_contract)
  ) {
    errors.push(problem(
      "ACTION_CONTRACT_REFERENCE_INVALID",
      "$.action_contract",
      "The operational action contract must pin a valid ID, semantic version and SHA-256 checksum.",
    ));
  }
  if (record.release_stage !== "operational-action" && record.action_contract) {
    errors.push(problem(
      "NONOPERATIONAL_STAGE_HAS_ACTION_CONTRACT",
      "$.action_contract",
      "Only an operational-action release may bind an action contract.",
    ));
  }

  const evidenceById = new Map();
  for (const [index, evidence] of (record.evidence_register || []).entries()) {
    if (evidenceById.has(evidence.id)) {
      errors.push(problem(
        "DUPLICATE_REVIEW_EVIDENCE_ID",
        `$.evidence_register[${index}].id`,
        `Review evidence ID ${evidence.id} is duplicated.`,
      ));
    }
    evidenceById.set(evidence.id, evidence);
    const reviewedAt = instant(evidence.reviewed_at);
    const validThrough = instant(evidence.valid_through);
    if (reviewedAt === null || validThrough === null) {
      errors.push(problem(
        "REVIEW_EVIDENCE_DATE_INVALID",
        `$.evidence_register[${index}]`,
        "Review and validity timestamps must be exact RFC 3339 instants on real calendar dates.",
      ));
    } else if (validThrough < reviewedAt) {
      errors.push(problem(
        "REVIEW_EVIDENCE_DATE_ORDER_INVALID",
        `$.evidence_register[${index}].valid_through`,
        "Review evidence cannot expire before it was reviewed.",
      ));
    }
    const permittedCoverage = new Set(EVIDENCE_COVERAGE[evidence.kind] || []);
    for (const item of evidence.coverage || []) {
      if (!permittedCoverage.has(item)) {
        errors.push(problem(
          "REVIEW_EVIDENCE_COVERAGE_UNEXPECTED",
          `$.evidence_register[${index}].coverage`,
          `Coverage ${item} is not valid for ${evidence.kind} evidence.`,
        ));
      }
    }
  }

  for (const gateName of GATE_NAMES) {
    if (!record.gates?.[gateName]) {
      errors.push(problem(
        "RELEASE_GATE_MISSING",
        `$.gates.${gateName}`,
        `Mandatory release gate ${gateName} is missing.`,
      ));
      blockingGates.add(gateName);
    }
  }

  for (const [gateName, gate] of Object.entries(record.gates || {})) {
    if (!GATE_NAMES.includes(gateName)) {
      errors.push(problem(
        "UNEXPECTED_RELEASE_GATE",
        `$.gates.${gateName}`,
        `Release gate ${gateName} is not part of this contract version.`,
      ));
      blockingGates.add(gateName);
      continue;
    }
    if (gate.status !== "complete") blockingGates.add(gateName);
    if (gate.status === "complete" && (gate.gaps || []).length > 0) {
      errors.push(problem(
        "COMPLETE_GATE_HAS_GAPS",
        `$.gates.${gateName}.gaps`,
        `Gate ${gateName} cannot be complete while gaps remain.`,
      ));
      blockingGates.add(gateName);
    }
    const referencedKinds = new Set();
    const referencedCoverage = new Set();
    for (const [index, evidenceRef] of (gate.evidence_refs || []).entries()) {
      const evidence = evidenceById.get(evidenceRef);
      if (!evidence) {
        errors.push(problem(
          "RELEASE_EVIDENCE_REFERENCE_MISSING",
          `$.gates.${gateName}.evidence_refs[${index}]`,
          `Review evidence ${evidenceRef} is missing.`,
        ));
        blockingGates.add(gateName);
        continue;
      }
      referencedKinds.add(evidence.kind);
      for (const item of evidence.coverage || []) referencedCoverage.add(item);
      if (
        evidence.outcome !== "passed" ||
        !evidenceIsCurrent(evidence, assessmentTime, effectiveTime)
      ) {
        blockingGates.add(gateName);
        if (gate.status === "complete") {
          errors.push(problem(
            "COMPLETE_GATE_HAS_UNPASSED_OR_EXPIRED_EVIDENCE",
            `$.gates.${gateName}.evidence_refs[${index}]`,
            `Gate ${gateName} cannot be complete with pending, failed or expired evidence.`,
          ));
        }
      }
    }
    for (const kind of requiredKinds(record, gateName)) {
      if (!referencedKinds.has(kind)) {
        blockingGates.add(gateName);
        if (gate.status === "complete") {
          errors.push(problem(
            "RELEASE_GATE_EVIDENCE_KIND_MISSING",
            `$.gates.${gateName}.evidence_refs`,
            `Gate ${gateName} requires ${kind} evidence.`,
          ));
        }
      }
    }
    for (const item of requiredCoverage(record, gateName)) {
      if (!referencedCoverage.has(item)) {
        blockingGates.add(gateName);
        if (gate.status === "complete") {
          errors.push(problem(
            "RELEASE_GATE_COVERAGE_MISSING",
            `$.gates.${gateName}.evidence_refs`,
            `Gate ${gateName} evidence does not cover ${item}.`,
          ));
        }
      }
    }
  }

  if (!validateSources(record, errors, effectiveTime)) blockingGates.add("source_vintage");

  if (record.decision?.status === "approved") {
    if ((record.decision.approved_by || []).length === 0) {
      errors.push(problem(
        "PUBLICATION_APPROVER_MISSING",
        "$.decision.approved_by",
        "An approved public release must name at least one publication approver.",
      ));
      blockingGates.add("authority");
    }
    for (const [index, approval] of (record.decision.approved_by || []).entries()) {
      const evidence = evidenceById.get(approval.evidence_ref);
      if (
        !record.gates?.authority?.evidence_refs?.includes(approval.evidence_ref) ||
        evidence?.kind !== "publication-authority" ||
        evidence.outcome !== "passed" ||
        !evidenceIsCurrent(evidence, assessmentTime, effectiveTime)
      ) {
        errors.push(problem(
          "PUBLICATION_APPROVAL_EVIDENCE_INVALID",
          `$.decision.approved_by[${index}].evidence_ref`,
          "Every approver must cite current, passed publication-authority evidence used by the authority gate.",
        ));
        blockingGates.add("authority");
      }
    }
    if (blockingGates.size > 0) {
      errors.push(problem(
        "APPROVAL_WITH_BLOCKING_GATES",
        "$.decision.status",
        "A public-release approval is invalid while any mandatory gate is blocked.",
      ));
    }
  }

  const valid = errors.length === 0;
  const publicStage = PUBLIC_STAGES.has(record.release_stage);
  const stageAllowed = publicStage
    ? valid && record.decision?.status === "approved" && blockingGates.size === 0
    : valid;
  const publicReleaseAllowed = publicStage && stageAllowed;
  return {
    valid,
    stage_allowed: stageAllowed,
    public_release_allowed: publicReleaseAllowed,
    operational_action_allowed:
      publicReleaseAllowed && record.release_stage === "operational-action",
    blocking_gates: [...blockingGates].sort(),
    errors,
  };
}

export class PublicReleaseBlockedError extends Error {
  constructor(assessment) {
    super("Public release is blocked by governance validation.");
    this.name = "PublicReleaseBlockedError";
    this.assessment = assessment;
  }
}

export function issuePublicRelease(record) {
  const assessment = assessPublicRelease(record);
  if (!assessment.public_release_allowed) {
    throw new PublicReleaseBlockedError(assessment);
  }
  return {
    schema_version: "1.0.0",
    release_record_id: record.id,
    release_record_checksum: checksumJson(record),
    release_stage: record.release_stage,
    artifact: structuredClone(record.artifact),
    operational_effect: record.operational_effect,
    authorised_at: record.decision.decided_at,
    approved_by: structuredClone(record.decision.approved_by),
  };
}
