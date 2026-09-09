import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schema = JSON.parse(readFileSync(
  new URL("../schema/assumption-registry.schema.json", import.meta.url),
  "utf8",
));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const PUBLIC_STATE_BY_CLASS = Object.freeze({
  bounded_hypothesis: "publish_as_hypothesis",
  hard_safeguard: "publish_as_safeguard",
  legitimate_value_decision: "publish_as_value_choice",
  explicit_unknown: "publish_as_unknown",
});

const PUBLIC_PREFIX_BY_CLASS = Object.freeze({
  bounded_hypothesis: "Hypothesis:",
  hard_safeguard: "Safeguard:",
  legitimate_value_decision: "Value choice:",
  explicit_unknown: "Unknown:",
});

const NON_CURRENT_STATUSES = new Set(["expired", "replaced", "retired"]);
const TRUTH_OVERCLAIM = /\b(?:schema[- ](?:valid|conformant)|contract[- ]valid)\b.{0,40}\b(?:true|truth|proven|confirmed)\b|\b(?:proven|confirmed)\s+(?:true|fact)\b/iu;

function problem(code, path, message) {
  return { code, path, message };
}

function keyOf(reference) {
  return `${reference.assumption_id}@${reference.version}`;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function schemaProblems() {
  return (validateSchema.errors || []).map((error) => problem(
    "SCHEMA_NONCONFORMANT",
    error.instancePath || "$",
    error.message || "The record does not conform to the closed schema.",
  ));
}

function semanticProblems(registry) {
  const errors = [];
  const asOf = registry.as_of;
  const records = registry.assumptions;

  for (const duplicate of duplicateValues(records.map((record) =>
    `${record.assumption_id}@${record.version}`))) {
    errors.push(problem(
      "DUPLICATE_ASSUMPTION_VERSION",
      "$.assumptions",
      `Assumption identity ${duplicate} appears more than once.`,
    ));
  }

  const versionsByAssumption = new Map();
  for (const record of records) {
    const versions = versionsByAssumption.get(record.assumption_id) || [];
    versions.push(record);
    versionsByAssumption.set(record.assumption_id, versions);
  }
  for (const [assumptionId, versions] of versionsByAssumption) {
    const current = versions.filter(({ stewardship }) =>
      !NON_CURRENT_STATUSES.has(stewardship.status));
    if (current.length > 1) {
      errors.push(problem(
        "MULTIPLE_CURRENT_VERSIONS",
        "$.assumptions",
        `${assumptionId} has more than one current version.`,
      ));
    }
    if (new Set(versions.map((record) => record.class)).size > 1) {
      errors.push(problem(
        "ASSUMPTION_CLASS_DRIFT",
        "$.assumptions",
        `${assumptionId} changes epistemic class across versions and must use a new stable ID.`,
      ));
    }
  }

  records.forEach((assumption, index) => {
    const path = `$.assumptions[${index}]`;
    const affected = new Set(assumption.parties.affected.map(({ party_id: id }) => id));

    for (const role of ["affected", "benefited", "burdened"]) {
      for (const duplicate of duplicateValues(
        assumption.parties[role].map(({ party_id: id }) => id),
      )) {
        errors.push(problem(
          "DUPLICATE_PARTY_ROLE",
          `${path}.parties.${role}`,
          `${duplicate} appears more than once in the ${role} party list.`,
        ));
      }
    }

    for (const role of ["benefited", "burdened"]) {
      assumption.parties[role].forEach((party, partyIndex) => {
        if (!affected.has(party.party_id)) {
          errors.push(problem(
            "PARTY_NOT_AFFECTED",
            `${path}.parties.${role}[${partyIndex}].party_id`,
            `A ${role} party must also appear in the affected party list.`,
          ));
        }
      });
    }

    const evidenceIds = assumption.evidence_refs.map(({ ref_id: id }) => id);
    const counterevidenceIds = assumption.counterevidence_refs.map(({ ref_id: id }) => id);
    for (const role of ["evidence_refs", "counterevidence_refs"]) {
      for (const duplicate of duplicateValues(
        assumption[role].map(({ ref_id: id }) => id),
      )) {
        errors.push(problem(
          "DUPLICATE_EVIDENCE_REFERENCE",
          `${path}.${role}`,
          `${duplicate} appears more than once in ${role}.`,
        ));
      }
    }
    const counterevidenceSet = new Set(counterevidenceIds);
    for (const refId of evidenceIds) {
      if (counterevidenceSet.has(refId)) {
        errors.push(problem(
          "EVIDENCE_ROLE_CONFLICT",
          path,
          `${refId} cannot be both evidence and counterevidence for one assumption version.`,
        ));
      }
    }

    for (const duplicate of duplicateValues(
      assumption.decision_dependencies.map(({ decision_id: id }) => id),
    )) {
      errors.push(problem(
        "DUPLICATE_DECISION_DEPENDENCY",
        `${path}.decision_dependencies`,
        `${duplicate} appears more than once.`,
      ));
    }

    if (assumption.scope.valid_until && assumption.scope.valid_until < assumption.scope.valid_from) {
      errors.push(problem(
        "SCOPE_ENDS_BEFORE_START",
        `${path}.scope.valid_until`,
        "Scope valid_until must not precede valid_from.",
      ));
    }
    if (assumption.timebox.expires_on && assumption.timebox.next_review_on > assumption.timebox.expires_on) {
      errors.push(problem(
        "REVIEW_AFTER_EXPIRY",
        `${path}.timebox.next_review_on`,
        "The next review must occur no later than expiry.",
      ));
    }
    if (
      assumption.scope.valid_until
      && assumption.timebox.expires_on
      && assumption.timebox.expires_on > assumption.scope.valid_until
    ) {
      errors.push(problem(
        "EXPIRY_OUTSIDE_SCOPE",
        `${path}.timebox.expires_on`,
        "Assumption expiry cannot extend beyond the declared scope.",
      ));
    }
    if (!NON_CURRENT_STATUSES.has(assumption.stewardship.status)
      && assumption.timebox.next_review_on < asOf) {
      errors.push(problem(
        "REVIEW_OVERDUE",
        `${path}.timebox.next_review_on`,
        "A current assumption cannot pass its next review date without review.",
      ));
    }
    if (!NON_CURRENT_STATUSES.has(assumption.stewardship.status)
      && assumption.timebox.expires_on
      && assumption.timebox.expires_on <= asOf) {
      errors.push(problem(
        "ASSUMPTION_EXPIRED",
        `${path}.timebox.expires_on`,
        "A current assumption cannot remain current at or after expiry.",
      ));
    }
    if (assumption.stewardship.status === "expired"
      && (!assumption.timebox.expires_on || assumption.timebox.expires_on > asOf)) {
      errors.push(problem(
        "INVALID_EXPIRED_STATUS",
        `${path}.stewardship.status`,
        "Expired status requires an expiry date no later than the registry as_of date.",
      ));
    }

    const ownKey = `${assumption.assumption_id}@${assumption.version}`;
    const replacedBy = assumption.replacements.replaced_by.map(keyOf);
    const replaces = assumption.replacements.replaces.map(keyOf);
    if ([...replacedBy, ...replaces].includes(ownKey)) {
      errors.push(problem(
        "SELF_REPLACEMENT",
        `${path}.replacements`,
        "An assumption version cannot replace itself or be replaced by itself.",
      ));
    }
    for (const duplicate of duplicateValues(replacedBy)) {
      errors.push(problem(
        "DUPLICATE_REPLACEMENT_REFERENCE",
        `${path}.replacements.replaced_by`,
        `${duplicate} appears more than once.`,
      ));
    }
    for (const duplicate of duplicateValues(replaces)) {
      errors.push(problem(
        "DUPLICATE_REPLACEMENT_REFERENCE",
        `${path}.replacements.replaces`,
        `${duplicate} appears more than once.`,
      ));
    }
    if (assumption.stewardship.status === "replaced" && replacedBy.length === 0) {
      errors.push(problem(
        "REPLACEMENT_TARGET_REQUIRED",
        `${path}.replacements.replaced_by`,
        "Replaced status requires at least one replacement target.",
      ));
    }
    if (assumption.stewardship.status !== "replaced" && replacedBy.length > 0) {
      errors.push(problem(
        "REPLACEMENT_STATUS_MISMATCH",
        `${path}.stewardship.status`,
        "A record with a replacement target must have replaced status.",
      ));
    }

    const publicState = assumption.public_disposition.state;
    const expectedPublicState = PUBLIC_STATE_BY_CLASS[assumption.class];
    if (![expectedPublicState, "withhold", "retired"].includes(publicState)) {
      errors.push(problem(
        "PUBLIC_DISPOSITION_CLASS_MISMATCH",
        `${path}.public_disposition.state`,
        `Public disposition must preserve the ${assumption.class} epistemic class.`,
      ));
    }
    if (!NON_CURRENT_STATUSES.has(assumption.stewardship.status) && publicState === "retired") {
      errors.push(problem(
        "PUBLIC_DISPOSITION_STATUS_MISMATCH",
        `${path}.public_disposition.state`,
        "A current record cannot have a retired public disposition.",
      ));
    }
    if (NON_CURRENT_STATUSES.has(assumption.stewardship.status)
      && !["withhold", "retired"].includes(publicState)) {
      errors.push(problem(
        "PUBLIC_DISPOSITION_STATUS_MISMATCH",
        `${path}.public_disposition.state`,
        "A non-current record cannot be published as a current assumption.",
      ));
    }
    if (!["withhold", "retired"].includes(publicState)
      && !assumption.public_disposition.plain_language.startsWith(
        PUBLIC_PREFIX_BY_CLASS[assumption.class],
      )) {
      errors.push(problem(
        "PUBLIC_LABEL_MISSING",
        `${path}.public_disposition.plain_language`,
        `Public language must start with ${PUBLIC_PREFIX_BY_CLASS[assumption.class]}`,
      ));
    }
    if (TRUTH_OVERCLAIM.test(assumption.public_disposition.plain_language)
      || TRUTH_OVERCLAIM.test(assumption.public_disposition.rationale)) {
      errors.push(problem(
        "PUBLIC_TRUTH_OVERCLAIM",
        `${path}.public_disposition`,
        "Public disposition cannot present contract conformance as proof of truth.",
      ));
    }

    if (assumption.class === "hard_safeguard"
      && !assumption.decision_dependencies.some((dependency) =>
        dependency.relationship === "constrains" && dependency.handling === "fail_closed")) {
      errors.push(problem(
        "SAFEGUARD_NOT_FAIL_CLOSED",
        `${path}.decision_dependencies`,
        "A hard safeguard must constrain at least one decision with fail-closed handling.",
      ));
    }
  });

  return errors;
}

export function assessAssumptionRegistry(registry) {
  const schemaConformant = validateSchema(registry);
  const errors = schemaConformant ? semanticProblems(registry) : schemaProblems();
  return {
    schema_conformant: schemaConformant,
    registry_consistent: schemaConformant && errors.length === 0,
    claim_truth_assessed: false,
    errors,
  };
}

export function assertAssumptionRegistry(registry) {
  const result = assessAssumptionRegistry(registry);
  if (!result.registry_consistent) {
    const error = new Error(`Assumption registry is inconsistent:\n${JSON.stringify(result.errors, null, 2)}`);
    error.problems = result.errors;
    throw error;
  }
  return result;
}
