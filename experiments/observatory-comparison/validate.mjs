import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { assessTransitionBundle } from "../../integration/transition-bundle/assess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const manifestSchema = JSON.parse(readFileSync(
  resolve(here, "schema/experiment-manifest.schema.json"),
  "utf8",
));
const factPackSchema = JSON.parse(readFileSync(
  resolve(here, "schema/fact-pack.schema.json"),
  "utf8",
));
const instrumentSchema = JSON.parse(readFileSync(
  resolve(here, "schema/instrument.schema.json"),
  "utf8",
));
const scriptSchema = JSON.parse(readFileSync(
  resolve(here, "schema/deliberation-script.schema.json"),
  "utf8",
));
const outcomeSchema = JSON.parse(readFileSync(
  resolve(here, "schema/outcome-contract.schema.json"),
  "utf8",
));
const protocolSchema = JSON.parse(readFileSync(
  resolve(here, "schema/protocol-contract.schema.json"),
  "utf8",
));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateManifestSchema = ajv.compile(manifestSchema);
const validateFactPackSchema = ajv.compile(factPackSchema);
const validateInstrumentSchema = ajv.compile(instrumentSchema);
const validateScriptSchema = ajv.compile(scriptSchema);
const validateOutcomeSchema = ajv.compile(outcomeSchema);
const validateProtocolSchema = ajv.compile(protocolSchema);

const REQUIRED_INSTRUMENTS = new Set([
  "conventional-release",
  "release-plus-deliberation",
  "observatory-self-serve",
  "observatory-plus-deliberation",
]);
const REQUIRED_STOP_RULES = new Map([
  ["stop.urgent-irreversible-intent", {
    measure: "urgent-irreversible-action-intention",
    operator: "any",
    threshold: 1,
    strata: ["all-participants", "directly-affected"],
  }],
  ["stop.dangerous-understanding", {
    measure: "dangerous-understanding-increase",
    operator: "gt",
    threshold: 0,
    strata: ["all-participants", "directly-affected", "low-numeracy", "limited-english"],
  }],
  ["stop.serious-reported-harm", {
    measure: "serious-anxiety-stigma-dignity-or-blame-report",
    operator: "any",
    threshold: 1,
    strata: ["all-participants", "directly-affected"],
  }],
  ["stop.missing-no-real-service-notice", {
    measure: "no-real-service-warning-or-authority-notice-missed",
    operator: "any",
    threshold: 1,
    strata: ["all-participants"],
  }],
  ["stop.critical-access-failure", {
    measure: "critical-assistive-technology-path-failure",
    operator: "any",
    threshold: 1,
    strata: ["assistive-technology"],
  }],
  ["stop.privacy-exposure", {
    measure: "personal-data-outside-approved-minimum",
    operator: "any",
    threshold: 1,
    strata: ["all-participants"],
  }],
]);
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const REQUIRED_BOUNDARIES = [
  "no-real-service",
  "no-real-warning",
  "no-action-authority",
  "uncertainty",
  "strongest-challenge",
  "correction-route",
];

function error(code, path, message) {
  return { code, path, message };
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sameReference(left, right) {
  return left?.fact_pack_id === right?.fact_pack_id
    && left?.path === right?.path
    && left?.sha256 === right?.sha256;
}

function sameFileReference(left, right) {
  return left?.artifact_id === right?.artifact_id
    && left?.path === right?.path
    && left?.sha256 === right?.sha256;
}

function loadArtifact(ref, rootDir) {
  if (!ref || typeof ref.path !== "string" || isAbsolute(ref.path)
    || ref.path.split("/").some((part) => part === "" || part === "..")) {
    throw new Error("path must be a closed repository-relative file path");
  }
  const realRoot = realpathSync(rootDir);
  const candidate = resolve(realRoot, ref.path);
  let traversed = realRoot;
  for (const part of ref.path.split("/")) {
    traversed = resolve(traversed, part);
    if (lstatSync(traversed).isSymbolicLink()) {
      throw new Error("symbolic links are not accepted in experiment artifact paths");
    }
  }
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(realRoot, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)
    || isAbsolute(fromRoot)) {
    throw new Error("artifact path escapes the repository root");
  }
  const metadata = lstatSync(realCandidate);
  if (!metadata.isFile()) throw new Error("experiment artifacts must be regular files");
  if (metadata.size > MAX_ARTIFACT_BYTES) {
    throw new Error(`experiment artifact exceeds ${MAX_ARTIFACT_BYTES} bytes`);
  }
  const bytes = readFileSync(realCandidate);
  return { bytes, path: realCandidate };
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sameSet(left, right) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function pointerValue(document, pointer) {
  if (!document || typeof pointer !== "string" || !pointer.startsWith("/")) {
    return undefined;
  }
  return pointer.slice(1).split("/").reduce((value, rawPart) => {
    if (value === undefined || value === null) return undefined;
    const part = rawPart.replaceAll("~1", "/").replaceAll("~0", "~");
    return Object.hasOwn(value, part) ? value[part] : undefined;
  }, document);
}

export function assessSourceFactBinding(sourceBundle, factPack) {
  const errors = [];
  const sourceCanonical = sourceBundle?.canonical;
  const factCanonical = factPack?.canonical;
  if (sourceBundle?.bundle_stage !== "complete-core"
    || sourceCanonical?.root_role !== "agency-map"
    || !Array.isArray(sourceCanonical?.condition_ids)
    || sourceCanonical.condition_ids.length === 0
    || sourceCanonical?.outcome_logic_ref?.artifact_role !== "agency-map"
    || sourceCanonical?.outcome_logic_ref?.json_pointer
      !== "/outcome_scope/condition_logic"
    || !sourceCanonical?.scope_manifest_ref?.scope_manifest_id
    || !sourceCanonical?.scope_manifest_ref?.path
    || !sourceCanonical?.scope_manifest_ref?.sha256) {
    errors.push(error(
      "SOURCE_CANONICAL_CONTRACT_INVALID",
      "$.source_transition_bundle.canonical",
      "The source must expose the fixed complete-core condition and scope reference contract.",
    ));
  }
  if (!sourceCanonical || !factCanonical
    || !sameSet(sourceCanonical.condition_ids, factCanonical.condition_ids)
    || !isDeepStrictEqual(
      sourceCanonical.outcome_logic_ref,
      factCanonical.outcome_logic_ref,
    )
    || !isDeepStrictEqual(sourceCanonical.scope_manifest_ref, factCanonical.scope_manifest_ref)) {
    errors.push(error(
      "FACT_PACK_CANONICAL_MISMATCH",
      "$.fact_pack.canonical",
      "The fact pack must bind the source bundle's exact condition set, outcome logic and scope manifest.",
    ));
  }
  const factConditionIds = factCanonical?.condition_ids || [];
  const displayedConditionIds = Array.isArray(factPack?.if_conditions)
    ? factPack.if_conditions
      .filter((condition) => condition && typeof condition === "object"
        && !Array.isArray(condition) && typeof condition.condition_id === "string")
      .map(({ condition_id: id }) => id)
    : [];
  if (displayedConditionIds.length !== factPack?.if_conditions?.length
    || !unique(displayedConditionIds)
    || !sameSet(factConditionIds, displayedConditionIds)) {
    errors.push(error(
      "FACT_PACK_IF_COVERAGE_MISMATCH",
      "$.fact_pack.if_conditions",
      "The public fact pack must expose every canonical condition exactly once.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

export function assessFactPackSemantics(factPack) {
  const errors = [];
  const schemaValid = validateFactPackSchema(factPack);
  if (!schemaValid) {
    errors.push(error(
      "FACT_PACK_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateFactPackSchema.errors, { separator: "; " }),
    ));
  }
  const claims = Array.isArray(factPack?.claims)
    ? factPack.claims.filter((claim) => claim && typeof claim === "object"
      && !Array.isArray(claim))
    : [];
  const ids = claims.map(({ claim_id: id }) => id);
  if (claims.length !== factPack?.claims?.length || !unique(ids)) {
    errors.push(error(
      "FACT_PACK_CLAIM_ID_DUPLICATE",
      "$.claims",
      "Fact-pack claim identities must be unique and structurally valid.",
    ));
  }
  return { schema_valid: schemaValid, valid: errors.length === 0, errors };
}

export function assessExperimentManifest(manifest, { rootDir = defaultRoot } = {}) {
  const errors = [];
  const schemaValid = validateManifestSchema(manifest);
  if (!schemaValid) {
    errors.push(error(
      "MANIFEST_SCHEMA_INVALID",
      "$",
      ajv.errorsText(validateManifestSchema.errors, { separator: "; " }),
    ));
  }

  const arms = Array.isArray(manifest?.arms) ? manifest.arms : [];
  const semanticArms = arms.filter((arm) => arm && typeof arm === "object"
    && !Array.isArray(arm));
  const stopRules = Array.isArray(manifest?.safety?.stop_rules)
    ? manifest.safety.stop_rules
    : [];
  const semanticStopRules = stopRules.filter((rule) => rule && typeof rule === "object"
    && !Array.isArray(rule));
  const references = [
    ["$.protocol_ref", manifest?.protocol_ref],
    ["$.source_transition_bundle", manifest?.source_transition_bundle],
    ["$.fact_pack", manifest?.fact_pack],
    ...arms.flatMap((arm, index) => [
      ...(arm?.instrument_ref
        ? [[`$.arms[${index}].instrument_ref`, arm.instrument_ref]]
        : []),
      [`$.arms[${index}].fact_pack_ref`, arm?.fact_pack_ref],
      [`$.arms[${index}].outcome_contract_ref`, arm?.outcome_contract_ref],
      ...(arm?.deliberation_script_ref
        ? [[`$.arms[${index}].deliberation_script_ref`, arm.deliberation_script_ref]]
        : []),
    ]),
  ];

  let artifactIntegrity = true;
  const loadedByPath = new Map();
  for (const [path, ref] of references) {
    try {
      const loaded = loadedByPath.get(ref?.path) || loadArtifact(ref, rootDir);
      if (ref?.path) loadedByPath.set(ref.path, loaded);
      if (digest(loaded.bytes) !== ref.sha256) {
        artifactIntegrity = false;
        errors.push(error(
          "ARTIFACT_HASH_MISMATCH",
          `${path}.sha256`,
          "Retained artifact bytes do not match the manifest content address.",
        ));
      }
    } catch (cause) {
      artifactIntegrity = false;
      errors.push(error("ARTIFACT_PATH_INVALID", path, cause.message));
    }
  }

  let sourceDocument = null;
  let factPack = null;
  let artifactContractsValid = true;
  const parseJsonArtifact = (ref, code, path) => {
    try {
      const bytes = loadedByPath.get(ref?.path)?.bytes;
      return bytes ? JSON.parse(bytes.toString("utf8")) : null;
    } catch (cause) {
      artifactContractsValid = false;
      errors.push(error(code, path, cause.message));
      return null;
    }
  };
  try {
    const sourceBytes = loadedByPath.get(manifest?.source_transition_bundle?.path)?.bytes;
    if (sourceBytes) sourceDocument = JSON.parse(sourceBytes.toString("utf8"));
  } catch (cause) {
    errors.push(error("SOURCE_BUNDLE_JSON_INVALID", "$.source_transition_bundle", cause.message));
  }
  try {
    const factBytes = loadedByPath.get(manifest?.fact_pack?.path)?.bytes;
    if (factBytes) factPack = JSON.parse(factBytes.toString("utf8"));
  } catch (cause) {
    errors.push(error("FACT_PACK_JSON_INVALID", "$.fact_pack", cause.message));
  }

  const factPackSchemaValid = Boolean(factPack) && validateFactPackSchema(factPack);
  if (factPack && !factPackSchemaValid) {
    artifactContractsValid = false;
    errors.push(error(
      "FACT_PACK_SCHEMA_INVALID",
      "$.fact_pack",
      ajv.errorsText(validateFactPackSchema.errors, { separator: "; " }),
    ));
  }

  const protocol = parseJsonArtifact(
    manifest?.protocol_ref,
    "PROTOCOL_JSON_INVALID",
    "$.protocol_ref",
  );
  if (!protocol || !validateProtocolSchema(protocol)
    || protocol.protocol_id !== manifest?.protocol_ref?.artifact_id) {
    artifactContractsValid = false;
    errors.push(error(
      "ARTIFACT_TYPE_INVALID",
      "$.protocol_ref",
      "The protocol reference must resolve to the fixed structured protocol and matching inner ID.",
    ));
  }
  if (sourceDocument
    && sourceDocument.bundle_id !== manifest?.source_transition_bundle?.bundle_id) {
    errors.push(error(
      "SOURCE_BUNDLE_ID_MISMATCH",
      "$.source_transition_bundle.bundle_id",
      "The source bundle ID does not match the retained source-bundle bytes.",
    ));
  }
  if (factPack && factPack.fact_pack_id !== manifest?.fact_pack?.fact_pack_id) {
    errors.push(error(
      "FACT_PACK_ID_MISMATCH",
      "$.fact_pack.fact_pack_id",
      "The fact-pack ID does not match the retained fact-pack bytes.",
    ));
  }
  if (factPack && factPack.source_transition_bundle_id
    !== manifest?.source_transition_bundle?.bundle_id) {
    errors.push(error(
      "FACT_PACK_SOURCE_MISMATCH",
      "$.fact_pack",
      "The fact pack does not name the manifest's exact source transition bundle.",
    ));
  }
  const sourceFactBinding = assessSourceFactBinding(sourceDocument, factPack);
  errors.push(...sourceFactBinding.errors);

  let sourceAssessment = null;
  let sourceCoreEligible = false;
  if (sourceDocument) {
    try {
      sourceAssessment = assessTransitionBundle(sourceDocument, { rootDir });
      sourceCoreEligible = sourceDocument.bundle_stage === "complete-core"
        && sourceAssessment.bundle_coherent === true;
      if (!sourceCoreEligible) {
        errors.push(error(
          "SOURCE_CORE_INELIGIBLE",
          "$.source_transition_bundle",
          "The pinned source must be a coherent seven-artifact complete core before an experiment can be eligible.",
        ));
      }
    } catch (cause) {
      errors.push(error("SOURCE_CORE_ASSESSMENT_FAILED", "$.source_transition_bundle", cause.message));
    }
  }

  let claimSourceBindingsValid = Boolean(sourceDocument && factPackSchemaValid);
  const claims = Array.isArray(factPack?.claims)
    ? factPack.claims.filter((claim) => claim && typeof claim === "object"
      && !Array.isArray(claim))
    : [];
  const claimIds = claims.map(({ claim_id: id }) => id);
  if (!unique(claimIds) || claims.length !== factPack?.claims?.length) {
    claimSourceBindingsValid = false;
    errors.push(error(
      "FACT_PACK_CLAIM_ID_DUPLICATE",
      "$.fact_pack.claims",
      "Fact-pack claim identities must be unique and structurally valid.",
    ));
  }
  for (const [claimIndex, claim] of claims.entries()) {
    const sourceRefs = Array.isArray(claim.source_refs) ? claim.source_refs : [];
    for (const [sourceIndex, ref] of sourceRefs.entries()) {
      const expected = ref?.artifact_role === "transition-bundle"
        ? manifest?.source_transition_bundle
        : sourceDocument?.artifacts?.find(({ role }) => role === ref?.artifact_role);
      const refPath = `$.fact_pack.claims[${claimIndex}].source_refs[${sourceIndex}]`;
      if (!expected || expected.path !== ref?.path || expected.sha256 !== ref?.sha256) {
        claimSourceBindingsValid = false;
        errors.push(error(
          "FACT_PACK_SOURCE_REF_MISMATCH",
          refPath,
          "A fact-pack source must resolve exactly to the pinned source core or one of its content-addressed artifacts.",
        ));
        continue;
      }
      try {
        const loaded = loadedByPath.get(ref.path) || loadArtifact(ref, rootDir);
        loadedByPath.set(ref.path, loaded);
        if (digest(loaded.bytes) !== ref.sha256) {
          artifactIntegrity = false;
          claimSourceBindingsValid = false;
          errors.push(error("ARTIFACT_HASH_MISMATCH", `${refPath}.sha256`,
            "Fact-pack source bytes do not match their content address."));
          continue;
        }
        const document = JSON.parse(loaded.bytes.toString("utf8"));
        if (pointerValue(document, ref.json_pointer) === undefined) {
          claimSourceBindingsValid = false;
          errors.push(error(
            "FACT_PACK_SOURCE_POINTER_INVALID",
            `${refPath}.json_pointer`,
            "The source pointer does not resolve inside the retained artifact bytes.",
          ));
        }
      } catch (cause) {
        artifactIntegrity = false;
        claimSourceBindingsValid = false;
        errors.push(error("ARTIFACT_PATH_INVALID", refPath, cause.message));
      }
    }
  }

  let factParity = semanticArms.length === 4;
  for (const [index, arm] of semanticArms.entries()) {
    if (!sameReference(arm.fact_pack_ref, manifest?.fact_pack)) {
      factParity = false;
      errors.push(error(
        "ARM_FACT_PACK_MISMATCH",
        `$.arms[${index}].fact_pack_ref`,
        "Every arm must bind the exact same fact-pack ID, path and content hash.",
      ));
    }
  }

  const factClaimIds = claims.map(({ claim_id: id }) => id);
  const factConditionIds = factPack?.canonical?.condition_ids || [];
  for (const [index, arm] of semanticArms.entries()) {
    const instrument = parseJsonArtifact(
      arm.instrument_ref,
      "INSTRUMENT_JSON_INVALID",
      `$.arms[${index}].instrument_ref`,
    );
    if (!instrument || !validateInstrumentSchema(instrument)
      || instrument.instrument_id !== arm.instrument_ref?.artifact_id
      || instrument.instrument_kind !== arm.instrument_kind
      || !sameReference(instrument.fact_pack_ref, manifest?.fact_pack)
      || !sameSet(instrument.render_contract?.claim_ids, factClaimIds)
      || !sameSet(instrument.render_contract?.condition_ids, factConditionIds)
      || !sameSet(instrument.render_contract?.boundary_ids, REQUIRED_BOUNDARIES)) {
      artifactContractsValid = false;
      errors.push(error(
        "ARTIFACT_TYPE_INVALID",
        `$.arms[${index}].instrument_ref`,
        "An instrument must match its inner ID and arm kind, bind the shared fact pack, and render every claim, condition and public boundary.",
      ));
    }

    const outcome = parseJsonArtifact(
      arm.outcome_contract_ref,
      "OUTCOME_CONTRACT_JSON_INVALID",
      `$.arms[${index}].outcome_contract_ref`,
    );
    if (!outcome || !validateOutcomeSchema(outcome)
      || outcome.outcome_contract_id !== arm.outcome_contract_ref?.artifact_id
      || outcome.outcome_contract_id !== protocol?.analysis?.outcome_contract_id
      || outcome.estimand_id !== protocol?.analysis?.estimand_id) {
      artifactContractsValid = false;
      errors.push(error(
        "ARTIFACT_TYPE_INVALID",
        `$.arms[${index}].outcome_contract_ref`,
        "The outcome artifact must satisfy its fixed schema and bind the protocol's exact outcome and estimand identities.",
      ));
    }

    if (arm.deliberation_script_ref) {
      const script = parseJsonArtifact(
        arm.deliberation_script_ref,
        "DELIBERATION_SCRIPT_JSON_INVALID",
        `$.arms[${index}].deliberation_script_ref`,
      );
      if (!script || !validateScriptSchema(script)
        || script.script_id !== arm.deliberation_script_ref.artifact_id) {
        artifactContractsValid = false;
        errors.push(error(
          "ARTIFACT_TYPE_INVALID",
          `$.arms[${index}].deliberation_script_ref`,
          "The deliberation reference must resolve to a fixed-script artifact with the matching inner ID.",
        ));
      }
    }
  }

  let protocolConstraintsValid = true;
  const armIds = semanticArms.map(({ arm_id: id }) => id);
  const instruments = semanticArms.map(({ instrument_kind: kind }) => kind);
  if (!unique(armIds) || !unique(instruments)
    || instruments.length !== REQUIRED_INSTRUMENTS.size
    || instruments.some((kind) => !REQUIRED_INSTRUMENTS.has(kind))) {
    protocolConstraintsValid = false;
    errors.push(error(
      "EXPERIMENT_ARM_SET_INVALID",
      "$.arms",
      "The manifest requires one unique arm for each preregistered comparator.",
    ));
  }
  if (semanticArms.some((arm) =>
    arm.allocation_weight !== protocol?.design?.allocation_ratio_by_instrument?.[arm.instrument_kind])) {
    protocolConstraintsValid = false;
    errors.push(error(
      "ALLOCATION_CONTRACT_MISMATCH",
      "$.arms",
      "Every arm allocation weight must equal the fixed balanced ratio in the structured protocol.",
    ));
  }
  const conventional = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "conventional-release");
  const releaseDeliberation = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "release-plus-deliberation");
  const observatoryDeliberation = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "observatory-plus-deliberation");
  const observatorySelfServe = semanticArms.find(({ instrument_kind: kind }) =>
    kind === "observatory-self-serve");
  if (conventional?.deliberation_script_ref !== null
    || observatorySelfServe?.deliberation_script_ref !== null
    || !releaseDeliberation?.deliberation_script_ref
    || !sameFileReference(
      releaseDeliberation?.deliberation_script_ref,
      observatoryDeliberation?.deliberation_script_ref,
    )) {
    protocolConstraintsValid = false;
    errors.push(error(
      "DELIBERATION_SCRIPT_PARITY_INVALID",
      "$.arms",
      "Only the two deliberation arms may use a script, and both must bind the same script bytes.",
    ));
  }
  const outcomeRef = semanticArms[0]?.outcome_contract_ref;
  if (!outcomeRef || semanticArms.length !== 4
    || semanticArms.some((arm) => !sameFileReference(arm.outcome_contract_ref, outcomeRef))) {
    protocolConstraintsValid = false;
    errors.push(error(
      "OUTCOME_CONTRACT_PARITY_INVALID",
      "$.arms",
      "Every arm must bind the exact same outcome contract.",
    ));
  }

  const stopRuleIds = semanticStopRules.map(({ rule_id: id }) => id);
  for (const [required, specification] of REQUIRED_STOP_RULES) {
    if (!stopRuleIds.includes(required)) {
      protocolConstraintsValid = false;
      errors.push(error(
        "SAFETY_STOP_RULE_MISSING",
        "$.safety.stop_rules",
        `The preregistered ${required} stop line is missing.`,
      ));
      continue;
    }
    const declared = semanticStopRules.find(({ rule_id: id }) => id === required);
    if (declared.measure !== specification.measure
      || declared.operator !== specification.operator
      || declared.threshold !== specification.threshold
      || !sameSet(declared.strata, specification.strata)
      || declared.effect !== "pause-and-independent-review"
      || declared.compensation_across_strata !== "forbidden") {
      protocolConstraintsValid = false;
      errors.push(error(
        "SAFETY_STOP_RULE_MISMATCH",
        "$.safety.stop_rules",
        `The preregistered ${required} stop line has been weakened or reinterpreted.`,
      ));
    }
  }
  if (!unique(stopRuleIds)) {
    protocolConstraintsValid = false;
    errors.push(error(
      "SAFETY_STOP_RULE_DUPLICATE",
      "$.safety.stop_rules",
      "Safety stop-rule identities must be unique.",
    ));
  }

  const contractErrors = errors.filter(({ code }) => code !== "SOURCE_CORE_INELIGIBLE");
  const manifestContractValid = schemaValid
    && artifactIntegrity
    && factPackSchemaValid
    && sourceFactBinding.valid
    && claimSourceBindingsValid
    && factParity
    && protocolConstraintsValid
    && artifactContractsValid
    && contractErrors.length === 0;
  const manifestValid = manifestContractValid && sourceCoreEligible;

  return {
    schema_version: "1.0.0",
    manifest_id: manifest?.manifest_id || null,
    schema_valid: schemaValid,
    artifact_integrity: artifactIntegrity,
    artifact_contracts_valid: artifactContractsValid,
    fact_pack_schema_valid: factPackSchemaValid,
    source_fact_binding_valid: sourceFactBinding.valid,
    claim_source_bindings_valid: claimSourceBindingsValid,
    source_core_eligible: sourceCoreEligible,
    source_core_assessment: sourceAssessment ? {
      bundle_id: sourceAssessment.bundle_id,
      bundle_stage: sourceAssessment.bundle_stage,
      machine_valid: sourceAssessment.machine_valid,
      components_valid: sourceAssessment.components_valid,
      bundle_coherent: sourceAssessment.bundle_coherent,
      coherence_blocker_codes: sourceAssessment.coherence_blockers
        .map(({ code }) => code),
    } : null,
    fact_parity: factParity,
    rendered_parity_assessed: false,
    protocol_constraints_valid: protocolConstraintsValid,
    manifest_contract_valid: manifestContractValid,
    manifest_valid: manifestValid,
    analysis_ready: false,
    recruitment_allowed: false,
    truth_effect: "none",
    authority_effect: "none",
    errors,
  };
}

export function assertExperimentManifest(manifest, options) {
  const result = assessExperimentManifest(manifest, options);
  if (!result.manifest_valid) {
    const detail = result.errors.map(({ code, path, message }) =>
      `${code} (${path}): ${message}`).join("\n");
    throw new Error(`Experiment manifest is invalid:\n${detail}`);
  }
  return result;
}
