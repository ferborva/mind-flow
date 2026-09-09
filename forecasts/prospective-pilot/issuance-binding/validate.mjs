import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { assessProspectivePilotProtocol } from "../validate.mjs";
import { assertForecastWithRetainedSources } from "../../lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");
const matureSchemaPath = resolve(repositoryRoot, "forecasts/schema/binary-forecast.schema.json");
const matureValidatorPath = resolve(repositoryRoot, "forecasts/lib/registry.mjs");
const matureSchemaBytes = readFileSync(matureSchemaPath);
const matureValidatorBytes = readFileSync(matureValidatorPath);
const calculationSchema = JSON.parse(readFileSync(resolve(
  here,
  "schema/baseline-calculation.schema.json",
), "utf8"));
const inputManifestSchema = JSON.parse(readFileSync(resolve(
  here,
  "schema/baseline-input-manifest.schema.json",
), "utf8"));
const matureSchema = JSON.parse(matureSchemaBytes.toString("utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateMatureSchema = ajv.compile(matureSchema);
const validateCalculationSchema = ajv.compile(calculationSchema);
const validateInputManifestSchema = ajv.compile(inputManifestSchema);
const SHA256 = /^sha256:[a-f0-9]{64}$/;

const BOUNDARIES = Object.freeze({
  empirical_truth_established: false,
  causal_truth_established: false,
  authority_verified: false,
  action_authorised: false,
  publication_approved: false,
});

function issue(code, path, message) {
  return { code, path, message };
}

export function contentSha256(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("content hashing requires exact Uint8Array bytes");
  }
  return `sha256:${createHash("sha256").update(Buffer.from(bytes)).digest("hex")}`;
}

export function matureForecastContractIdentity() {
  return {
    schema_path: "forecasts/schema/binary-forecast.schema.json",
    schema_sha256: contentSha256(matureSchemaBytes),
    validator_path: "forecasts/lib/registry.mjs",
    validator_sha256: contentSha256(matureValidatorBytes),
  };
}

function parseExactJsonBytes(bytes, label, errors) {
  if (!(bytes instanceof Uint8Array)) {
    errors.push(issue(
      `${label}_BYTES_REQUIRED`,
      "/",
      `${label.toLowerCase().replaceAll("_", " ")} must be supplied as exact Uint8Array bytes`,
    ));
    return { address: null, document: null };
  }
  const address = contentSha256(bytes);
  try {
    return {
      address,
      document: JSON.parse(Buffer.from(bytes).toString("utf8")),
    };
  } catch {
    errors.push(issue(
      `${label}_JSON_INVALID`,
      "/",
      `${label.toLowerCase().replaceAll("_", " ")} bytes must decode as one JSON document`,
    ));
    return { address, document: null };
  }
}

function assessByteAnchors(addresses, anchors, errors) {
  if (!anchors || typeof anchors !== "object") {
    errors.push(issue(
      "BYTE_ANCHORS_REQUIRED",
      "/byteAnchors",
      "separately retained exact preregistration and mature-forecast byte digests are required",
    ));
    return false;
  }
  let valid = true;
  for (const [field, code, path] of [
    ["preregistration_sha256", "PREREGISTRATION_BYTES_DRIFT", "/preregistrationBytes"],
    ["mature_forecast_sha256", "MATURE_FORECAST_BYTES_DRIFT", "/matureForecastBytes"],
  ]) {
    if (!SHA256.test(anchors[field] || "") || anchors[field] !== addresses[field]) {
      errors.push(issue(
        code,
        path,
        `supplied bytes do not match the separately retained ${field} content address`,
      ));
      valid = false;
    }
  }
  return valid;
}

function assessPreregistration(protocol, context, errors) {
  if (!protocol) return false;
  const result = assessProspectivePilotProtocol(protocol, context);
  if (!result.protocol_valid || !result.preregistration_structurally_complete_unverified) {
    errors.push(issue(
      "PREREGISTRATION_FIXED_VALIDATION_FAILED",
      "/preregistrationBytes",
      `fixed preregistration validator rejected the supplied bytes: ${[
        ...result.issues,
        ...result.context_issues,
      ].map(({ code }) => code).join(", ") || "not a complete preregistration"}`,
    ));
    return false;
  }
  if (!context || typeof context !== "object") {
    errors.push(issue(
      "PREREGISTRATION_CONTEXT_REQUIRED",
      "/preregistrationContext",
      "the fixed validator requires a separately retained campaign manifest and receipt context",
    ));
    return false;
  }
  if (!result.supplied_context_objects_match) {
    errors.push(issue(
      "PREREGISTRATION_CONTEXT_MISMATCH",
      "/preregistrationContext",
      `fixed preregistration context validation failed: ${result.context_issues
        .map(({ code }) => code).join(", ")}`,
    ));
    return false;
  }
  return true;
}

function completeRetainedSource(source) {
  return source && source.bytes instanceof Uint8Array &&
    source.document && typeof source.document === "object" &&
    typeof source.path === "string" && source.path.length > 0 &&
    SHA256.test(source.sha256 || "");
}

function assessMatureForecast(forecast, sources, errors) {
  if (!forecast) return false;
  const schemaConformant = validateMatureSchema(forecast);
  if (!schemaConformant) {
    const detail = (validateMatureSchema.errors || [])
      .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
      .join("; ");
    errors.push(issue(
      "MATURE_FORECAST_SCHEMA_INVALID",
      "/matureForecastBytes",
      `fixed mature forecast schema rejected the supplied bytes: ${detail}`,
    ));
  }
  const sourceArtifactsPresent = completeRetainedSource(sources?.sourceKernel) &&
    completeRetainedSource(sources?.sourceSignalRegistry);
  if (!sourceArtifactsPresent) {
    errors.push(issue(
      "MATURE_SOURCE_ARTIFACTS_REQUIRED",
      "/matureForecastSources",
      "exact kernel and signal-registry bytes, parsed documents, paths and digests are mandatory",
    ));
  }
  let semanticsValid = false;
  if (schemaConformant && sourceArtifactsPresent) {
    try {
      assertForecastWithRetainedSources(forecast, {
        sourceKernel: sources.sourceKernel,
        sourceSignalRegistry: sources.sourceSignalRegistry,
      });
      semanticsValid = true;
    } catch (error) {
      errors.push(issue(
        "MATURE_FORECAST_FIXED_VALIDATION_FAILED",
        "/matureForecastBytes",
        `fixed mature forecast validator rejected the supplied bytes: ${error.message}`,
      ));
    }
  }
  return schemaConformant && sourceArtifactsPresent && semanticsValid;
}

function mismatch(errors, condition, code, path, message) {
  if (!condition) errors.push(issue(code, path, message));
}

function exactUtcMillis(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(
    value || "",
  );
  if (!match) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  const parts = match.slice(1, 7).map(Number);
  if (parts[3] > 23 || parts[4] > 59 || parts[5] > 59 ||
      date.getUTCFullYear() !== parts[0] || date.getUTCMonth() + 1 !== parts[1] ||
      date.getUTCDate() !== parts[2] || date.getUTCHours() !== parts[3] ||
      date.getUTCMinutes() !== parts[4] || date.getUTCSeconds() !== parts[5]) return null;
  return parsed;
}

function assessCampaign(protocol, forecast, errors) {
  const campaignId = protocol?.campaign?.campaign_id;
  mismatch(
    errors,
    forecast?.baseline?.campaign_id === campaignId &&
      forecast?.naive_baseline?.campaign_id === campaignId,
    "CAMPAIGN_BINDING_MISMATCH",
    "/matureForecast/baseline/campaign_id",
    "both mature forecast baselines must retain the preregistered campaign identity",
  );
}

function assessTarget(protocol, forecast, sources, errors) {
  const registered = protocol?.target;
  const mature = forecast?.target;
  mismatch(errors, forecast?.question === registered?.question,
    "TARGET_QUESTION_MISMATCH", "/matureForecast/question",
    "mature forecast question differs from the preregistered question");
  mismatch(errors, mature?.event === registered?.event_definition,
    "TARGET_EVENT_MISMATCH", "/matureForecast/target/event",
    "mature event differs from the preregistered event definition");
  mismatch(errors, mature?.unit === registered?.unit,
    "TARGET_UNIT_MISMATCH", "/matureForecast/target/unit",
    "mature target unit differs from the preregistered unit");
  mismatch(errors,
    mature?.observation_window_start === registered?.observation_window?.starts_at &&
      mature?.observation_window_end === registered?.observation_window?.ends_at,
    "TARGET_WINDOW_MISMATCH", "/matureForecast/target",
    "mature observation window differs from the preregistered window");
  mismatch(errors, mature?.resolution_rule === registered?.resolution_rule,
    "TARGET_RESOLUTION_RULE_MISMATCH", "/matureForecast/target/resolution_rule",
    "mature resolution rule differs from the preregistered rule");
  mismatch(errors, mature?.independence_cluster_id === registered?.independence_cluster_id,
    "INDEPENDENCE_CLUSTER_MISMATCH", "/matureForecast/target/independence_cluster_id",
    "mature independence cluster differs from the preregistered cluster");
  mismatch(errors,
    isDeepStrictEqual(mature?.scope, registered?.scope) &&
      mature?.scope_hash === registered?.scope_hash,
    "TARGET_SCOPE_MISMATCH", "/matureForecast/target/scope",
    "mature target scope and scope digest differ from preregistration");
  mismatch(errors,
    mature?.condition_id === registered?.condition_definition_ref?.condition_id &&
      isDeepStrictEqual(
        forecast?.issue_basis?.condition_definition_ref,
        registered?.condition_definition_ref,
      ),
    "TARGET_CONDITION_BINDING_MISMATCH", "/matureForecast/issue_basis/condition_definition_ref",
    "mature condition definition differs from preregistration");
  mismatch(errors,
    mature?.signal_id === registered?.signal_definition_ref?.signal_id &&
      isDeepStrictEqual(
        forecast?.issue_basis?.signal_definition_ref,
        registered?.signal_definition_ref,
      ),
    "TARGET_SIGNAL_BINDING_MISMATCH", "/matureForecast/issue_basis/signal_definition_ref",
    "mature signal definition differs from preregistration");
  mismatch(errors,
    mature?.metric_id === registered?.metric_id &&
      mature?.metric_checksum === registered?.metric_checksum &&
      forecast?.issue_basis?.metric_contract?.metric_id === registered?.metric_id &&
      forecast?.issue_basis?.metric_contract?.metric_checksum === registered?.metric_checksum,
    "TARGET_METRIC_BINDING_MISMATCH", "/matureForecast/issue_basis/metric_contract",
    "mature metric identity or checksum differs from preregistration");
  mismatch(errors,
    isDeepStrictEqual(forecast?.issue_basis?.kernel_ref, registered?.kernel_ref),
    "TARGET_KERNEL_BINDING_MISMATCH", "/matureForecast/issue_basis/kernel_ref",
    "mature kernel artifact reference differs from preregistration");
  mismatch(errors,
    isDeepStrictEqual(
      forecast?.issue_basis?.signal_registry_ref,
      registered?.signal_registry_ref,
    ),
    "TARGET_REGISTRY_BINDING_MISMATCH", "/matureForecast/issue_basis/signal_registry_ref",
    "mature signal-registry artifact reference differs from preregistration");
  mismatch(errors,
    mature?.resolver?.resolver_id === registered?.resolver?.resolver_id &&
      mature?.resolver?.resolver_version === registered?.resolver?.resolver_version,
    "RESOLVER_IDENTITY_MISMATCH", "/matureForecast/target/resolver",
    "mature resolver identity or version differs from preregistration");

  const registeredSourceId = registered?.resolution_source_id;
  const matureSourceIds = forecast?.issue_basis?.metric_contract?.source_refs;
  const sourceRecord = sources?.sourceSignalRegistry?.document?.sources
    ?.find(({ source_id: sourceId }) => sourceId === registeredSourceId);
  mismatch(errors,
    Array.isArray(matureSourceIds) && matureSourceIds.length === 1 &&
      matureSourceIds[0] === registeredSourceId &&
      sourceRecord?.evidence_ref === mature?.resolution_source &&
      mature?.resolution_source === registered?.resolution_source_uri &&
      mature?.resolution_event_id === registered?.resolution_event_id,
    "TARGET_SOURCE_MISMATCH", "/matureForecast/target/resolution_source",
    "mature resolution source must resolve the one preregistered source ID and URI");
}

function parseCalculationSource(source, expectedChecksum, role, sourcePath, errors) {
  if (!source || !(source.bytes instanceof Uint8Array)) {
    errors.push(issue(
      "BASELINE_CALCULATION_SOURCE_REQUIRED",
      sourcePath,
      `exact retained ${role} baseline calculation bytes are mandatory`,
    ));
    return null;
  }
  const actualChecksum = contentSha256(source.bytes);
  let document;
  try {
    document = JSON.parse(Buffer.from(source.bytes).toString("utf8"));
  } catch {
    errors.push(issue(
      "BASELINE_CALCULATION_JSON_INVALID",
      sourcePath,
      `${role} baseline calculation bytes must decode as JSON`,
    ));
    return null;
  }
  if (actualChecksum !== expectedChecksum ||
      (source.document && !isDeepStrictEqual(source.document, document))) {
    errors.push(issue(
      "BASELINE_CALCULATION_BYTES_MISMATCH",
      sourcePath,
      "mature calculation checksum and supplied parsed document must reproduce the exact retained bytes",
    ));
    return null;
  }
  if (!validateCalculationSchema(document)) {
    errors.push(issue(
      "BASELINE_CALCULATION_SCHEMA_INVALID",
      sourcePath,
      ajv.errorsText(validateCalculationSchema.errors),
    ));
    return null;
  }
  return document;
}

function exactArtifactBytes(source, expectedChecksum, code, path, errors) {
  if (!source || !(source.bytes instanceof Uint8Array)) {
    errors.push(issue(code, path, "separately retained exact artifact bytes are mandatory"));
    return null;
  }
  const checksum = contentSha256(source.bytes);
  if (checksum !== expectedChecksum ||
      (source.sha256 !== undefined && source.sha256 !== checksum)) {
    errors.push(issue(code, path, "retained artifact bytes do not match the preregistered digest"));
    return null;
  }
  return source.bytes;
}

function assessBaselineArtifacts(registered, artifacts, role, errors) {
  let bytesMatched = true;
  for (const [field, sourceKey, suffix] of [
    ["implementation_sha256", "implementation", "IMPLEMENTATION"],
    ["conformance_vectors_sha256", "conformanceVectors", "CONFORMANCE_VECTORS"],
    ["parameters_sha256", "parameters", "PARAMETERS"],
  ]) {
    if (!exactArtifactBytes(
      artifacts?.[sourceKey],
      registered?.[field],
      `BASELINE_${suffix}_BYTES_MISMATCH`,
      `/matureForecastSources/${role}BaselineArtifacts/${sourceKey}`,
      errors,
    )) bytesMatched = false;
  }

  const manifestBytes = exactArtifactBytes(
    artifacts?.inputManifest,
    registered?.input_manifest_sha256,
    "BASELINE_INPUT_MANIFEST_BYTES_MISMATCH",
    `/matureForecastSources/${role}BaselineArtifacts/inputManifest`,
    errors,
  );
  if (!manifestBytes) return { bytesMatched: false, manifest: null };
  let manifest;
  try {
    manifest = JSON.parse(Buffer.from(manifestBytes).toString("utf8"));
  } catch {
    errors.push(issue(
      "BASELINE_INPUT_MANIFEST_JSON_INVALID",
      `/matureForecastSources/${role}BaselineArtifacts/inputManifest`,
      "baseline input manifest bytes must decode as one JSON document",
    ));
    return { bytesMatched: false, manifest: null };
  }
  if (!validateInputManifestSchema(manifest)) {
    errors.push(issue(
      "BASELINE_INPUT_MANIFEST_SCHEMA_INVALID",
      `/matureForecastSources/${role}BaselineArtifacts/inputManifest`,
      ajv.errorsText(validateInputManifestSchema.errors),
    ));
    return { bytesMatched: false, manifest: null };
  }
  if (artifacts.inputManifest.document &&
      !isDeepStrictEqual(artifacts.inputManifest.document, manifest)) {
    errors.push(issue(
      "BASELINE_INPUT_MANIFEST_BYTES_MISMATCH",
      `/matureForecastSources/${role}BaselineArtifacts/inputManifest`,
      "supplied input-manifest document differs from its exact retained bytes",
    ));
    bytesMatched = false;
  }
  const expectedManifest = {
    artifact_type: "prospective-baseline-input-manifest",
    schema_version: "1.0.0",
    baseline_role: registered?.baseline_role,
    baseline_id: registered?.baseline_id,
    input_source_ids: registered?.input_source_ids,
    input_checksums: manifest.input_checksums,
  };
  if (!isDeepStrictEqual(manifest, expectedManifest)) {
    errors.push(issue(
      "BASELINE_INPUT_MANIFEST_BINDING_MISMATCH",
      `/matureForecastSources/${role}BaselineArtifacts/inputManifest`,
      "input manifest must exactly bind baseline role, identity, sources and input digests",
    ));
    bytesMatched = false;
  }
  return { bytesMatched, manifest };
}

function assessBaseline(protocol, forecast, sources, role, errors) {
  const reference = role === "reference";
  const registered = reference ? protocol?.baseline : protocol?.naive_baseline;
  const mature = reference ? forecast?.baseline : forecast?.naive_baseline;
  const calculation = mature?.calculation;
  const sourcePath = `/matureForecastSources/${role}BaselineCalculation`;
  const maturePath = reference ? "/matureForecast/baseline" : "/matureForecast/naive_baseline";
  mismatch(errors, mature?.family_id === registered?.baseline_id,
    "BASELINE_ID_MISMATCH", `${maturePath}/family_id`,
    `mature ${role} baseline does not retain the preregistered baseline identity`);
  mismatch(errors, mature?.mechanical_role === registered?.baseline_role,
    "BASELINE_ROLE_MISMATCH", `${maturePath}/mechanical_role`,
    `mature ${role} baseline role differs from preregistration`);
  mismatch(errors, calculation?.algorithm_id === registered?.algorithm_id,
    "BASELINE_ALGORITHM_MISMATCH", `${maturePath}/calculation/algorithm_id`,
    `mature ${role} baseline algorithm differs from preregistration`);
  mismatch(errors, calculation?.version === registered?.algorithm_version,
    "BASELINE_VERSION_MISMATCH", `${maturePath}/calculation/version`,
    `mature ${role} baseline algorithm version differs from preregistration`);

  const artifactAssessment = assessBaselineArtifacts(
    registered,
    sources?.[`${role}BaselineArtifacts`],
    role,
    errors,
  );
  mismatch(errors,
    Array.isArray(calculation?.input_checksums) &&
      isDeepStrictEqual(calculation.input_checksums, artifactAssessment.manifest?.input_checksums),
    "BASELINE_INPUT_MANIFEST_MISMATCH", `${maturePath}/calculation/input_checksums`,
    "mature calculation input digests must exactly equal the preregistered input manifest");

  const artifact = parseCalculationSource(
    sources?.[`${role}BaselineCalculation`],
    calculation?.checksum,
    role,
    sourcePath,
    errors,
  );
  if (!artifact) return false;
  const expectedFields = {
    artifact_type: "prospective-baseline-calculation",
    schema_version: "1.0.0",
    baseline_role: registered?.baseline_role,
    protocol_id: protocol?.protocol_id,
    protocol_content_sha256: protocol?.registration?.protocol_content_sha256,
    campaign_id: protocol?.campaign?.campaign_id,
    target_id: protocol?.target?.target_id,
    baseline_id: registered?.baseline_id,
    algorithm_id: registered?.algorithm_id,
    algorithm_version: registered?.algorithm_version,
    implementation_sha256: registered?.implementation_sha256,
    conformance_vectors_sha256: registered?.conformance_vectors_sha256,
    parameters_sha256: registered?.parameters_sha256,
    input_source_ids: registered?.input_source_ids,
    input_policy: registered?.input_policy,
    input_manifest_sha256: registered?.input_manifest_sha256,
    input_checksums: calculation?.input_checksums,
    input_vintage_cutoff_at: registered?.input_vintage_cutoff_at,
    missing_input_policy: registered?.missing_input_policy,
    rounding_policy: registered?.rounding_policy,
    output_probability: mature?.probability,
    verification_status: "unverified_external_review_required",
  };
  const fieldsMatch = Object.entries(expectedFields)
    .every(([field, value]) => isDeepStrictEqual(artifact[field], value));
  const calculatedAt = exactUtcMillis(artifact.calculated_at);
  const cutoffAt = Date.parse(registered?.input_vintage_cutoff_at);
  const issuedAt = Date.parse(forecast?.issued_at);
  const bindingValid = artifactAssessment.bytesMatched && fieldsMatch &&
    calculatedAt !== null &&
      calculatedAt >= cutoffAt && calculatedAt < issuedAt;
  mismatch(errors,
    bindingValid,
    "BASELINE_CALCULATION_BINDING_MISMATCH",
    sourcePath,
    `retained ${role} calculation must reproduce every preregistered baseline input and precede forecast issue`,
  );
  return bindingValid;
}

function assessIssueWindow(protocol, forecast, errors) {
  const issuedAt = Date.parse(forecast?.issued_at);
  const opensAt = Date.parse(protocol?.clocks?.issue_opens_at);
  const closesAt = Date.parse(protocol?.clocks?.issue_closes_at);
  mismatch(errors,
    [issuedAt, opensAt, closesAt].every(Number.isFinite) &&
      opensAt <= issuedAt && issuedAt <= closesAt,
    "ISSUED_OUTSIDE_PREREGISTERED_WINDOW",
    "/matureForecast/issued_at",
    "mature forecast issue time must fall inside the preregistered issue window",
  );
  mismatch(errors, forecast?.resolve_by === protocol?.clocks?.resolution_closes_at,
    "RESOLUTION_CLOSE_MISMATCH", "/matureForecast/resolve_by",
    "mature forecast resolution deadline differs from the preregistered close");
  mismatch(errors,
    forecast?.target?.outcome_publication_not_before ===
      protocol?.clocks?.outcome_publication_not_before,
    "PUBLICATION_CLOCK_MISMATCH",
    "/matureForecast/target/outcome_publication_not_before",
    "mature outcome-publication boundary differs from preregistration",
  );
  mismatch(errors, forecast?.resolve_after === protocol?.clocks?.resolve_after,
    "RESOLVE_AFTER_MISMATCH", "/matureForecast/resolve_after",
    "mature resolve-after boundary differs from preregistration");
}

function currentSchemaBlockers(protocol, forecast) {
  if (!protocol || !forecast) return [];
  const blockers = [
    issue(
      "MATURE_PROTOCOL_REFERENCE_UNREPRESENTABLE",
      "/matureForecast",
      "binary forecast schema 1.4.0 has no typed protocol ID, protocol-content hash or preregistration-byte reference",
    ),
    issue(
      "MATURE_CAMPAIGN_MANIFEST_REFERENCE_UNREPRESENTABLE",
      "/matureForecast",
      "binary forecast schema 1.4.0 names a campaign ID but cannot bind its manifest ID and content hash",
    ),
    issue(
      "MATURE_TARGET_ID_UNREPRESENTABLE",
      "/matureForecast/target",
      "binary forecast schema 1.4.0 cannot carry the preregistered target ID",
    ),
    issue(
      "MATURE_RESOLVER_ARTIFACT_BINDING_UNREPRESENTABLE",
      "/matureForecast/target/resolver",
      "binary forecast schema 1.4.0 cannot carry resolver implementation, parameter and conformance hashes or correction policies",
    ),
    issue(
      "MATURE_CONTRACT_IDENTITY_UNREPRESENTABLE",
      "/matureForecast",
      "binary forecast schema 1.4.0 cannot bind the exact schema and semantic-validator byte identities used at issue",
    ),
    issue(
      "BASELINE_EXECUTION_NOT_INDEPENDENTLY_REPRODUCED",
      "/matureForecast/baseline",
      "retained baseline bytes match their registered digests, but no independent runner has reproduced either probability",
    ),
  ];
  return forecast.prospective_registration === undefined ? blockers : blockers.slice(-1);
}

function assessProspectiveRegistration(protocol, forecast, addresses, errors) {
  if (forecast?.prospective_registration === undefined) return;
  const expected = {
    protocol_id: protocol?.protocol_id,
    protocol_content_sha256: protocol?.registration?.protocol_content_sha256,
    preregistration_sha256: addresses.preregistration_sha256,
    campaign_manifest_id: protocol?.campaign?.manifest?.manifest_id,
    campaign_manifest_sha256: protocol?.campaign?.manifest?.manifest_sha256,
    target_id: protocol?.target?.target_id,
    resolver: protocol?.target?.resolver,
    mature_contract: matureForecastContractIdentity(),
  };
  mismatch(errors, isDeepStrictEqual(forecast.prospective_registration, expected),
    "PROSPECTIVE_REGISTRATION_MISMATCH", "/matureForecast/prospective_registration",
    "typed prospective registration must exactly bind protocol bytes, campaign, target, resolver and the fixed mature contract");
}

export function assessFutureIssuanceBinding({
  preregistrationBytes,
  matureForecastBytes,
  byteAnchors,
  preregistrationContext,
  matureForecastSources,
} = {}) {
  const errors = [];
  const parsedProtocol = parseExactJsonBytes(
    preregistrationBytes,
    "PREREGISTRATION",
    errors,
  );
  const parsedForecast = parseExactJsonBytes(
    matureForecastBytes,
    "MATURE_FORECAST",
    errors,
  );
  const contentAddresses = {
    preregistration_sha256: parsedProtocol.address,
    mature_forecast_sha256: parsedForecast.address,
  };
  const byteAnchorsValid = assessByteAnchors(contentAddresses, byteAnchors, errors);
  const preregistrationValid = assessPreregistration(
    parsedProtocol.document,
    preregistrationContext,
    errors,
  );
  const matureForecastValid = assessMatureForecast(
    parsedForecast.document,
    matureForecastSources,
    errors,
  );

  let baselineBindingsValid = false;
  if (parsedProtocol.document && parsedForecast.document) {
    assessProspectiveRegistration(parsedProtocol.document, parsedForecast.document, contentAddresses, errors);
    assessCampaign(parsedProtocol.document, parsedForecast.document, errors);
    assessTarget(
      parsedProtocol.document,
      parsedForecast.document,
      matureForecastSources,
      errors,
    );
    const referenceBaselineValid = assessBaseline(
      parsedProtocol.document,
      parsedForecast.document,
      matureForecastSources,
      "reference",
      errors,
    );
    const naiveBaselineValid = assessBaseline(
      parsedProtocol.document,
      parsedForecast.document,
      matureForecastSources,
      "naive",
      errors,
    );
    baselineBindingsValid = referenceBaselineValid && naiveBaselineValid;
    assessIssueWindow(parsedProtocol.document, parsedForecast.document, errors);
  }

  const blockers = currentSchemaBlockers(parsedProtocol.document, parsedForecast.document);
  const recordsStructurallyValidWithSuppliedContext =
    preregistrationValid && matureForecastValid && byteAnchorsValid;
  const bindingComplete = recordsStructurallyValidWithSuppliedContext &&
    baselineBindingsValid && errors.length === 0 && blockers.length === 0;
  return {
    machine_valid: bindingComplete,
    binding_complete: bindingComplete,
    records_structurally_valid_with_supplied_context:
      recordsStructurallyValidWithSuppliedContext,
    retained_baseline_artifact_bytes_matched: baselineBindingsValid,
    independent_anchor_verified: false,
    baseline_execution_independently_reproduced: false,
    preregistration_valid: preregistrationValid,
    mature_forecast_valid: matureForecastValid,
    eligible_for_issuance_review: bindingComplete,
    issuance_authorised: false,
    content_addresses: contentAddresses,
    contract_identities: {
      mature_forecast: matureForecastContractIdentity(),
      preregistration: parsedProtocol.document?.contract || null,
    },
    boundaries: { ...BOUNDARIES },
    issues: errors,
    blockers,
  };
}
