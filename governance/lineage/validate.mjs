import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { assessTransitionBundle } from "../../integration/transition-bundle/assess.mjs";
import {
  GOVERNANCE_BOUNDARIES,
  computeGovernanceReceiptHash,
  sameCanonical,
} from "../lib/record-contract.mjs";
import { validateDecisionRecord } from "../decision-record/validate.mjs";
import { validateNegotiationRecord } from "../negotiation-record/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const EXACT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

const schemaFiles = {
  common: new URL("../schema/governance-record-common.schema.json", import.meta.url),
  context: new URL("./schema/external-governance-context.schema.json", import.meta.url),
  lineage: new URL("./schema/governance-lineage.schema.json", import.meta.url),
};
const schemaDigests = {
  common: "34e1475fc3a0db226e6c4dc1c4675fe7d91a81d2e158c3312d221eb21764642e",
  context: "9bb5f6f830c3de003d25c6e80f535703a70f10d1444da3fdc3e82af517664876",
  lineage: "39eec336e97aa36797efa38df7f492c006c571eed5f5ea4304be47740ef9410e",
};
const schemaDocuments = {};
for (const [name, url] of Object.entries(schemaFiles)) {
  const bytes = readFileSync(url);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== schemaDigests[name]) {
    throw new Error(`${name} lineage schema bytes differ from the pinned validator contract`);
  }
  schemaDocuments[name] = JSON.parse(bytes.toString("utf8"));
}
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(schemaDocuments.common);
const validateContextSchema = ajv.compile(schemaDocuments.context);
const validateLineageSchema = ajv.compile(schemaDocuments.lineage);

const CLOSED_BOUNDARIES = Object.freeze({
  empirical_truth_established: false,
  affected_party_consent_established: false,
  authority_verified: false,
  action_authorised: false,
  publication_approved: false,
});

const UNVERIFIED_TRUST_BOUNDARIES = Object.freeze({
  as_of_clock_authenticated: false,
  external_context_authenticated: false,
  latest_lineage_anchor_verified: false,
  participant_identities_authenticated: false,
  representative_mandates_verified: false,
});

export const FIXED_SOURCE_REFS = Object.freeze({
  round_04_bundle: Object.freeze({
    path: "integration/transition-bundle/fixtures/round-04.worker-option.complete.json",
    sha256: "sha256:4533372fb8b1b1e6e097bb1d09ca53c12984cd8881f7b8986f2d59ff95685aa3",
    bundle_id: "bundle.round-04.worker-option.complete",
    bundle_schema_version: "1.2.0",
    bundle_stage: "complete-core",
  }),
  governance_context: Object.freeze({
    path: "governance/lineage/fixtures/round-06.worker-transition.governance-context.synthetic.json",
    sha256: "sha256:61d06b094612b196872c69de536a28820d26848ca4a7a1d340866bd97269cd01",
    context_id: "governance-context.round-06.worker-transition.synthetic",
    context_hash: "sha256:748f1fcc0765106a92da788a80ce74325f569256e485806570fcba01e34f36bb",
  }),
  negotiation: Object.freeze({
    path: "governance/negotiation-record/fixtures/worker-transition.negotiation.synthetic.json",
    sha256: "sha256:698215045015505bbcce4351c7698ced727a17130a3e046815441685f9123e58",
    record_id: "negotiation.worker-transition.synthetic",
    version: "1.0.0",
    record_hash: "sha256:c12f2826a2e8717f7799b64ce7c51592656e0a764cf2a381922c1556afe77ad5",
  }),
  decision: Object.freeze({
    path: "governance/decision-record/fixtures/worker-transition.decision.synthetic.json",
    sha256: "sha256:13b44ef500dd5735af66d5c8544a2613a81ee307f7e40b1f75ba536e62927c7d",
    record_id: "decision.worker-transition.synthetic",
    version: "1.0.0",
    record_hash: "sha256:2450b633f29ecc98576d15efed657bf09fb7b40cec8ceb29bd03a3eb39de7dcd",
  }),
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(domain, value) {
  return `sha256:${createHash("sha256")
    .update(`${domain}\n${canonicalJson(value)}`, "utf8")
    .digest("hex")}`;
}

function rawSha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function computeExternalGovernanceContextHash(context) {
  const retained = structuredClone(context);
  delete retained.context_hash;
  return hash("mind-flow:governance:external-context:v1", retained);
}

export function computeGovernanceLineageHash(lineage) {
  const retained = structuredClone(lineage);
  delete retained.lineage_hash;
  return hash("mind-flow:governance:round-06-lineage:v1", retained);
}

function issue(code, path, message) {
  return { code, path, message };
}

function schemaProblems(validator, value, code) {
  if (validator(value)) return [];
  return (validator.errors || []).map((error) => issue(
    code,
    error.instancePath || "/",
    error.message || "schema validation failed",
  ));
}

function isExactUtc(value) {
  if (typeof value !== "string") return false;
  const match = EXACT_UTC.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [date, time] = value.slice(0, -1).split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, secondsWithFraction] = time.split(":");
  const second = Number(secondsWithFraction.split(".")[0]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1] &&
    Number(hour) >= 0 && Number(hour) <= 23 && Number(minute) >= 0 &&
    Number(minute) <= 59 && second >= 0 && second <= 59;
}

function insideRoot(root, candidate) {
  const fromRoot = relative(root, candidate);
  return fromRoot !== "" && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromRoot);
}

function loadRetainedJson(reference, rootDir) {
  if (!reference || typeof reference.path !== "string" || isAbsolute(reference.path) ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/.test(reference.path) ||
      reference.path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("source path must be a closed repository-relative JSON path");
  }
  const realRoot = realpathSync(rootDir);
  let current = realRoot;
  for (const part of reference.path.split("/")) {
    current = resolve(current, part);
    if (lstatSync(current).isSymbolicLink()) {
      throw new Error("symbolic links are not accepted in retained source paths");
    }
  }
  const candidate = realpathSync(resolve(realRoot, reference.path));
  if (!insideRoot(realRoot, candidate)) {
    throw new Error("retained source path escapes the repository root");
  }
  const descriptor = openSync(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw new Error("retained source must be a regular file");
    if (stat.size > MAX_SOURCE_BYTES) {
      throw new Error(`retained source exceeds the ${MAX_SOURCE_BYTES}-byte limit`);
    }
    bytes = readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  return {
    bytes,
    document: JSON.parse(bytes.toString("utf8")),
    sha256: rawSha256(bytes),
    path: candidate,
  };
}

function exactSet(values, expected) {
  return values.length === expected.length && new Set(values).size === values.length &&
    new Set(expected).size === expected.length && expected.every((value) => values.includes(value));
}

function sourceReferenceProblems(lineage) {
  const errors = [];
  for (const [key, fixed] of Object.entries(FIXED_SOURCE_REFS)) {
    if (!sameCanonical(lineage?.sources?.[key], fixed)) {
      errors.push(issue(
        "SOURCE_REFERENCE_MISMATCH",
        `/sources/${key}`,
        `${key} must equal the fixed Round 06 source path, byte digest and content identity`,
      ));
    }
  }
  return errors;
}

function loadSources(rootDir, errors) {
  const loaded = {};
  for (const [key, reference] of Object.entries(FIXED_SOURCE_REFS)) {
    try {
      loaded[key] = loadRetainedJson(reference, rootDir);
      if (loaded[key].sha256 !== reference.sha256) {
        errors.push(issue(
          "SOURCE_DIGEST_MISMATCH",
          `/sources/${key}/sha256`,
          `${key} retained bytes differ from the fixed Round 06 digest`,
        ));
      }
    } catch (error) {
      errors.push(issue(
        "SOURCE_LOAD_FAILED",
        `/sources/${key}/path`,
        `${key} could not be loaded safely: ${error.message}`,
      ));
    }
  }
  return loaded;
}

function deriveBundleIf(bundle, assessment, errors) {
  if (!assessment?.machine_valid || !assessment?.components_valid || !assessment?.bundle_coherent) {
    errors.push(issue(
      "SOURCE_BUNDLE_INVALID",
      "/sources/round_04_bundle",
      "the retained Round 04 bundle and all content-addressed component bytes must remain coherent",
    ));
    return null;
  }
  if (assessment.authority_effect !== "none" || assessment.action_authorised !== false ||
      assessment.publication_approved !== false || assessment.gates?.truth !== false ||
      assessment.gates?.authority !== false || assessment.gates?.publication !== false) {
    errors.push(issue(
      "SOURCE_BUNDLE_BOUNDARY_INVALID",
      "/sources/round_04_bundle",
      "the source bundle cannot establish truth, authority, publication or action permission",
    ));
  }
  const conditionIds = assessment.condition_identity?.shared_by_all || [];
  const activeRefs = bundle?.canonical?.executable_if_ref?.active_condition_definition_refs || [];
  if (conditionIds.length !== 1 || activeRefs.length !== 1 ||
      conditionIds[0] !== activeRefs[0]?.condition_id) {
    errors.push(issue(
      "SOURCE_CONDITION_AMBIGUOUS",
      "/sources/round_04_bundle",
      "Round 06 requires exactly one condition shared by every coherent Round 04 component",
    ));
    return null;
  }
  const evaluations = (assessment.executable_if?.governed_evaluations || []).filter((evaluation) =>
    evaluation.evaluated_at === bundle.as_of &&
    sameCanonical(evaluation.condition_definition_ref, activeRefs[0]));
  if (evaluations.length !== 1) {
    errors.push(issue(
      "SOURCE_EVALUATION_AMBIGUOUS",
      "/sources/round_04_bundle",
      "Round 06 requires one governed evaluation for the exact active condition at bundle as_of",
    ));
    return null;
  }
  const evaluation = evaluations[0];
  return {
    condition_definition_ref: structuredClone(activeRefs[0]),
    bundle_evaluation_hash: evaluation.evaluation_hash,
    evaluated_at: evaluation.evaluated_at,
    mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
    computed_rule_state: evaluation.computed_rule_state?.state,
  };
}

function governanceIfProjection(binding) {
  const definition = binding?.condition_definition_ref;
  const receipt = binding?.evaluation_receipt_ref;
  return {
    condition_id: definition?.condition_id,
    definition_version: definition?.definition_version,
    definition_hash: definition?.definition_hash,
    receipt_id: receipt?.receipt_id,
    receipt_version: receipt?.receipt_version,
    receipt_hash: receipt?.receipt_hash,
    evaluated_at: receipt?.evaluated_at,
    valid_until: receipt?.valid_until,
    mechanically_valid_for_evaluation: receipt?.mechanically_valid_for_evaluation,
    computed_rule_state: receipt?.computed_rule_state,
    empirical_truth_established: receipt?.empirical_truth_established,
    authority_effect: receipt?.authority_effect,
    action_authorised: receipt?.action_authorised,
  };
}

function contextProblems(context, bundle, bundleSha256, derivedIf) {
  const errors = schemaProblems(validateContextSchema, context, "CONTEXT_SCHEMA_INVALID");
  if (errors.length > 0) return errors;
  if (context.context_hash !== computeExternalGovernanceContextHash(context)) {
    errors.push(issue(
      "CONTEXT_HASH_MISMATCH",
      "/sources/governance_context/context_hash",
      "external governance context differs from its content address",
    ));
  }
  const expectedBundleBinding = derivedIf && {
    bundle_id: bundle.bundle_id,
    bundle_sha256: bundleSha256,
    bundle_as_of: bundle.as_of,
    evaluation_hash: derivedIf.bundle_evaluation_hash,
    condition_definition_ref: derivedIf.condition_definition_ref,
    computed_rule_state: derivedIf.computed_rule_state,
  };
  if (!expectedBundleBinding || !sameCanonical(context.source_bundle_binding, expectedBundleBinding)) {
    errors.push(issue(
      "CONTEXT_BUNDLE_BINDING_MISMATCH",
      "/source_bundle_binding",
      "external context must bind the exact retained bundle, condition and governed evaluation",
    ));
  }
  const participantIds = context.participants.map(({ actor_id: id }) => id);
  const consumerIds = context.affected_consumers.map(({ consumer_id: id }) => id);
  const representedIds = context.representations.map(({ consumer_id: id }) => id);
  const representationIds = context.representations.map(({ representation_id: id }) => id);
  if (new Set(participantIds).size !== participantIds.length ||
      new Set(consumerIds).size !== consumerIds.length ||
      new Set(representationIds).size !== representationIds.length ||
      !exactSet(representedIds, consumerIds) ||
      context.representations.some(({ representative_actor_id: id }) => !participantIds.includes(id))) {
    errors.push(issue(
      "CONTEXT_POPULATION_INVALID",
      "/affected_consumers",
      "external context requires unique participants, consumers and one participating representative per consumer",
    ));
  }
  const receipt = context.if_binding.evaluation_receipt_ref;
  const expectedIf = derivedIf && {
    condition_definition_ref: derivedIf.condition_definition_ref,
    evaluated_at: derivedIf.evaluated_at,
    mechanically_valid_for_evaluation: derivedIf.mechanically_valid_for_evaluation,
    computed_rule_state: derivedIf.computed_rule_state,
  };
  if (!expectedIf || !sameCanonical(context.if_binding.condition_definition_ref,
      expectedIf.condition_definition_ref) ||
      !sameCanonical({
        condition_definition_ref: {
          condition_id: receipt.condition_id,
          definition_version: receipt.definition_version,
          definition_hash: receipt.definition_hash,
        },
        evaluated_at: receipt.evaluated_at,
        mechanically_valid_for_evaluation: receipt.mechanically_valid_for_evaluation,
        computed_rule_state: receipt.computed_rule_state,
      }, expectedIf) ||
      receipt.receipt_hash !== computeGovernanceReceiptHash(receipt) ||
      receipt.empirical_truth_established !== false || receipt.authority_effect !== "none" ||
      receipt.action_authorised !== false) {
    errors.push(issue(
      "CONTEXT_IF_BINDING_MISMATCH",
      "/if_binding",
      "external context IF binding must repeat the bundle-derived definition, state and non-authorising receipt",
    ));
  }
  if (context.captured_at !== bundle.as_of ||
      !sameCanonical(context.boundaries, CLOSED_BOUNDARIES)) {
    errors.push(issue(
      "CONTEXT_BOUNDARY_INVALID",
      "/boundaries",
      "external context is a same-instant synthetic snapshot and all authority boundaries remain false",
    ));
  }
  return errors;
}

function sourceIdentityProblems(loaded, errors) {
  const bundle = loaded.round_04_bundle?.document;
  const context = loaded.governance_context?.document;
  const negotiation = loaded.negotiation?.document;
  const decision = loaded.decision?.document;
  if (bundle && !sameCanonical({
    path: FIXED_SOURCE_REFS.round_04_bundle.path,
    sha256: loaded.round_04_bundle.sha256,
    bundle_id: bundle.bundle_id,
    bundle_schema_version: bundle.schema_version,
    bundle_stage: bundle.bundle_stage,
  }, FIXED_SOURCE_REFS.round_04_bundle)) {
    errors.push(issue("SOURCE_IDENTITY_MISMATCH", "/sources/round_04_bundle",
      "retained bundle identity differs from the fixed Round 06 identity"));
  }
  if (context && !sameCanonical({
    path: FIXED_SOURCE_REFS.governance_context.path,
    sha256: loaded.governance_context.sha256,
    context_id: context.context_id,
    context_hash: context.context_hash,
  }, FIXED_SOURCE_REFS.governance_context)) {
    errors.push(issue("SOURCE_IDENTITY_MISMATCH", "/sources/governance_context",
      "retained external context identity differs from the fixed Round 06 identity"));
  }
  for (const [key, record] of [["negotiation", negotiation], ["decision", decision]]) {
    if (record && !sameCanonical({
      path: FIXED_SOURCE_REFS[key].path,
      sha256: loaded[key].sha256,
      record_id: record.record_id,
      version: record.version,
      record_hash: record.record_hash,
    }, FIXED_SOURCE_REFS[key])) {
      errors.push(issue("SOURCE_IDENTITY_MISMATCH", `/sources/${key}`,
        `retained ${key} identity differs from the fixed Round 06 identity`));
    }
  }
}

function chronologyProblems(bundle, context, negotiation, decision) {
  const errors = [];
  const contextCaptured = Date.parse(context?.captured_at);
  const negotiationCreated = Date.parse(negotiation?.payload?.created_at);
  const decisionCreated = Date.parse(decision?.payload?.created_at);
  const negotiationSignatures = (negotiation?.signatures || []).map(({ signed_at: time }) =>
    Date.parse(time));
  const deliberationEntries = [
    ...(negotiation?.payload?.positions || []),
    ...(negotiation?.payload?.dissent || []),
  ];
  const deliberationTimes = deliberationEntries.map(({ recorded_at: time }) => Date.parse(time));
  if (!Number.isFinite(negotiationCreated) || !Number.isFinite(decisionCreated) ||
      !Number.isFinite(contextCaptured) ||
      negotiationSignatures.length === 0 || negotiationSignatures.some((time) => !Number.isFinite(time)) ||
      deliberationTimes.some((time) => !Number.isFinite(time) || time < contextCaptured) ||
      Date.parse(bundle?.as_of) > contextCaptured ||
      contextCaptured > negotiationCreated ||
      negotiationCreated >= decisionCreated ||
      negotiationSignatures.some((time) => time >= decisionCreated)) {
    errors.push(issue(
      "NEGOTIATION_CHRONOLOGY_INVALID",
      "/sources/decision",
      "bundle and context must precede every deliberation entry and negotiation creation; the negotiation and every signature must precede decision creation",
    ));
  }
  return errors;
}

function prefixedGovernanceErrors(prefix, result) {
  return (result?.errors || []).map((error) => issue(
    `${prefix}_${error.code}`,
    `/sources/${prefix.toLowerCase()}${error.path || ""}`,
    error.message,
  ));
}

export function validateGovernanceLineage(lineage, {
  rootDir = defaultRoot,
  asOf,
} = {}) {
  const errors = schemaProblems(validateLineageSchema, lineage, "LINEAGE_SCHEMA_INVALID");
  if (!isExactUtc(asOf)) {
    errors.push(issue(
      "AS_OF_INVALID",
      "/",
      "lineage verification requires an external exact RFC 3339 UTC as-of instant",
    ));
  }
  if (errors.some(({ code }) => code === "LINEAGE_SCHEMA_INVALID")) {
    return {
      lineage_valid: false,
      source_bundle_coherent: false,
      context_valid: false,
      negotiation_valid: false,
      decision_valid: false,
      derived_if: null,
      action_blocked: true,
      action_authorised: false,
      authority_effect: "none",
      boundaries: CLOSED_BOUNDARIES,
      verification_boundaries: UNVERIFIED_TRUST_BOUNDARIES,
      errors,
    };
  }

  errors.push(...sourceReferenceProblems(lineage));
  if (lineage.lineage_hash !== computeGovernanceLineageHash(lineage)) {
    errors.push(issue(
      "LINEAGE_HASH_MISMATCH",
      "/lineage_hash",
      "Round 06 lineage differs from its content address",
    ));
  }
  const loaded = loadSources(rootDir, errors);
  sourceIdentityProblems(loaded, errors);
  const bundle = loaded.round_04_bundle?.document;
  const context = loaded.governance_context?.document;
  const negotiation = loaded.negotiation?.document;
  const decision = loaded.decision?.document;

  let bundleAssessment = null;
  if (bundle) {
    try {
      bundleAssessment = assessTransitionBundle(bundle, { rootDir });
    } catch (error) {
      errors.push(issue(
        "SOURCE_BUNDLE_INVALID",
        "/sources/round_04_bundle",
        `Round 04 assessment failed closed: ${error.message}`,
      ));
    }
  }
  const beforeBundleErrors = errors.length;
  const derivedIf = bundle && bundleAssessment
    ? deriveBundleIf(bundle, bundleAssessment, errors)
    : null;
  const sourceBundleCoherent = Boolean(derivedIf) &&
    !errors.slice(beforeBundleErrors).some(({ code }) => code.startsWith("SOURCE_BUNDLE") ||
      code.startsWith("SOURCE_CONDITION") || code.startsWith("SOURCE_EVALUATION"));

  const beforeContextErrors = errors.length;
  if (context && bundle) {
    errors.push(...contextProblems(context, bundle, loaded.round_04_bundle.sha256, derivedIf));
  }
  const contextValid = Boolean(context && derivedIf) && !errors.slice(beforeContextErrors)
    .some(({ code }) => code.startsWith("CONTEXT_"));
  const expectedIfBinding = context ? governanceIfProjection(context.if_binding) : null;
  const expectedGovernanceContext = context ? {
    participants: context.participants,
    affected_consumers: context.affected_consumers,
    representations: context.representations,
  } : null;

  if (derivedIf && context) {
    const expectedLineageIf = {
      ...derivedIf,
      governance_receipt_hash: context.if_binding?.evaluation_receipt_ref?.receipt_hash,
    };
    if (!sameCanonical(lineage.derived_if, expectedLineageIf)) {
      errors.push(issue(
        "DERIVED_IF_MISMATCH",
        "/derived_if",
        "lineage must retain the exact condition and rule state derived from Round 04 plus the external receipt hash",
      ));
    }
  }

  let negotiationResult = null;
  if (negotiation) {
    negotiationResult = validateNegotiationRecord(negotiation, {
      asOf,
      expectedIfBinding,
      expectedGovernanceContext,
    });
    errors.push(...prefixedGovernanceErrors("NEGOTIATION", negotiationResult));
  }
  let decisionResult = null;
  if (decision) {
    decisionResult = validateDecisionRecord(decision, {
      asOf,
      expectedIfBinding,
      expectedGovernanceContext,
      sourceNegotiation: negotiation,
    });
    errors.push(...prefixedGovernanceErrors("DECISION", decisionResult));
  }
  if (bundle && context && negotiation && decision) {
    errors.push(...chronologyProblems(bundle, context, negotiation, decision));
  }

  const recordedActionStatesBlocked = negotiation?.payload?.outcome?.activation_state === "blocked" &&
    decision?.payload?.decision?.activation_state === "blocked" &&
    negotiationResult?.activation_eligible === false && decisionResult?.activation_eligible === false;
  if (!sameCanonical(lineage.boundaries, CLOSED_BOUNDARIES) ||
      !sameCanonical(lineage.boundaries, GOVERNANCE_BOUNDARIES) ||
      lineage.action_state?.negotiation_activation_state !== "blocked" ||
      lineage.action_state?.decision_activation_state !== "blocked" ||
      lineage.action_state?.operational_effect !== false || !recordedActionStatesBlocked) {
    errors.push(issue(
      "LINEAGE_BOUNDARY_INVALID",
      "/boundaries",
      "all Round 06 boundaries remain false and both governance stages remain blocked",
    ));
  }

  const sourceIsExact = (key) => !errors.some(({ code, path }) =>
    path?.startsWith(`/sources/${key}`) &&
    (code.startsWith("SOURCE_") || code === "SOURCE_REFERENCE_MISMATCH"));

  return {
    lineage_valid: errors.length === 0,
    source_bundle_coherent: sourceBundleCoherent && sourceIsExact("round_04_bundle"),
    context_valid: contextValid && sourceIsExact("governance_context"),
    negotiation_valid: negotiationResult?.machine_valid === true && sourceIsExact("negotiation"),
    decision_valid: decisionResult?.machine_valid === true && sourceIsExact("decision"),
    derived_if: derivedIf,
    action_blocked: true,
    action_authorised: false,
    authority_effect: "none",
    boundaries: CLOSED_BOUNDARIES,
    verification_boundaries: UNVERIFIED_TRUST_BOUNDARIES,
    errors,
  };
}
