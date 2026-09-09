import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "schema/prospective-pilot-preregistration.schema.json");
const validatorPath = fileURLToPath(import.meta.url);
const schemaBytes = readFileSync(schemaPath);
const validatorBytes = readFileSync(validatorPath);
const schema = JSON.parse(schemaBytes.toString("utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const SHA256 = /^sha256:[a-f0-9]{64}$/;

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function same(left, right) {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

export function prospectivePilotContractIdentity() {
  return {
    schema_path: "forecasts/prospective-pilot/schema/prospective-pilot-preregistration.schema.json",
    schema_sha256: digest(schemaBytes),
    validator_path: "forecasts/prospective-pilot/validate.mjs",
    validator_sha256: digest(validatorBytes),
  };
}

function issue(code, path, message) {
  return { code, path, message };
}

function asTime(value) {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

function isUtcInstant(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
    Number.isFinite(asTime(value));
}

export function campaignManifestSha256(manifest) {
  const content = structuredClone(manifest);
  delete content.manifest_sha256;
  return `sha256:${createHash("sha256")
    .update(
      `mind-flow:prospective-pilot:campaign-manifest:v1\n${JSON.stringify(canonicalValue(content))}`,
      "utf8",
    )
    .digest("hex")}`;
}

export function protocolContentSha256(protocol) {
  const content = structuredClone(protocol);
  delete content.registration.protocol_content_sha256;
  delete content.registration.external_receipt;
  delete content.source_chronology.events;
  return `sha256:${createHash("sha256")
    .update(
      `mind-flow:prospective-pilot:protocol-content:v1\n${JSON.stringify(canonicalValue(content))}`,
      "utf8",
    )
    .digest("hex")}`;
}

export function sourceChronologyEventSha256(event) {
  const content = structuredClone(event);
  delete content.event_sha256;
  return `sha256:${createHash("sha256")
    .update(
      `mind-flow:prospective-pilot:source-chronology-event:v1\n${JSON.stringify(canonicalValue(content))}`,
      "utf8",
    )
    .digest("hex")}`;
}

function assessBlankTemplate(protocol, issues) {
  const expectedNulls = [
    ["/protocol_id", protocol.protocol_id],
    ["/contract/schema_sha256", protocol.contract.schema_sha256],
    ["/contract/validator_sha256", protocol.contract.validator_sha256],
    ["/registration/registered_at", protocol.registration.registered_at],
    ["/registration/protocol_content_sha256", protocol.registration.protocol_content_sha256],
    ["/registration/external_receipt", protocol.registration.external_receipt],
    ["/campaign/campaign_id", protocol.campaign.campaign_id],
    ["/campaign/manifest/manifest_id", protocol.campaign.manifest.manifest_id],
    ["/campaign/manifest/campaign_id", protocol.campaign.manifest.campaign_id],
    ["/campaign/manifest/sealed_at", protocol.campaign.manifest.sealed_at],
    ["/campaign/manifest/manifest_sha256", protocol.campaign.manifest.manifest_sha256],
    ["/target/target_id", protocol.target.target_id],
    ["/target/question", protocol.target.question],
    ["/target/event_definition", protocol.target.event_definition],
    ["/target/unit", protocol.target.unit],
    ["/target/observation_window/starts_at", protocol.target.observation_window.starts_at],
    ["/target/observation_window/ends_at", protocol.target.observation_window.ends_at],
    ["/target/resolution_rule", protocol.target.resolution_rule],
    ["/target/resolution_source_id", protocol.target.resolution_source_id],
    ["/target/resolution_source_uri", protocol.target.resolution_source_uri],
    ["/target/resolution_event_id", protocol.target.resolution_event_id],
    ["/target/independence_cluster_id", protocol.target.independence_cluster_id],
    ["/target/condition_definition_ref", protocol.target.condition_definition_ref],
    ["/target/signal_definition_ref", protocol.target.signal_definition_ref],
    ["/target/metric_id", protocol.target.metric_id],
    ["/target/metric_checksum", protocol.target.metric_checksum],
    ["/target/scope", protocol.target.scope],
    ["/target/scope_hash", protocol.target.scope_hash],
    ["/target/kernel_ref", protocol.target.kernel_ref],
    ["/target/signal_registry_ref", protocol.target.signal_registry_ref],
    ["/target/resolver/resolver_id", protocol.target.resolver.resolver_id],
    ["/target/resolver/resolver_version", protocol.target.resolver.resolver_version],
    ["/target/resolver/implementation_sha256", protocol.target.resolver.implementation_sha256],
    ["/target/resolver/parameters_sha256", protocol.target.resolver.parameters_sha256],
    ["/target/resolver/conformance_vectors_sha256", protocol.target.resolver.conformance_vectors_sha256],
    ["/target/resolver/conflict_policy", protocol.target.resolver.conflict_policy],
    ["/target/resolver/correction_policy", protocol.target.resolver.correction_policy],
    ["/baseline/baseline_id", protocol.baseline.baseline_id],
    ["/baseline/baseline_role", protocol.baseline.baseline_role],
    ["/baseline/target_id", protocol.baseline.target_id],
    ["/baseline/algorithm_id", protocol.baseline.algorithm_id],
    ["/baseline/algorithm_version", protocol.baseline.algorithm_version],
    ["/baseline/input_policy", protocol.baseline.input_policy],
    ["/baseline/calculation_timing", protocol.baseline.calculation_timing],
    ["/baseline/implementation_sha256", protocol.baseline.implementation_sha256],
    ["/baseline/conformance_vectors_sha256", protocol.baseline.conformance_vectors_sha256],
    ["/baseline/parameters_sha256", protocol.baseline.parameters_sha256],
    ["/baseline/input_manifest_sha256", protocol.baseline.input_manifest_sha256],
    ["/baseline/input_vintage_cutoff_at", protocol.baseline.input_vintage_cutoff_at],
    ["/baseline/missing_input_policy", protocol.baseline.missing_input_policy],
    ["/baseline/rounding_policy", protocol.baseline.rounding_policy],
    ["/naive_baseline/baseline_id", protocol.naive_baseline.baseline_id],
    ["/naive_baseline/baseline_role", protocol.naive_baseline.baseline_role],
    ["/naive_baseline/target_id", protocol.naive_baseline.target_id],
    ["/naive_baseline/algorithm_id", protocol.naive_baseline.algorithm_id],
    ["/naive_baseline/algorithm_version", protocol.naive_baseline.algorithm_version],
    ["/naive_baseline/input_policy", protocol.naive_baseline.input_policy],
    ["/naive_baseline/calculation_timing", protocol.naive_baseline.calculation_timing],
    ["/naive_baseline/implementation_sha256", protocol.naive_baseline.implementation_sha256],
    ["/naive_baseline/conformance_vectors_sha256", protocol.naive_baseline.conformance_vectors_sha256],
    ["/naive_baseline/parameters_sha256", protocol.naive_baseline.parameters_sha256],
    ["/naive_baseline/input_manifest_sha256", protocol.naive_baseline.input_manifest_sha256],
    ["/naive_baseline/input_vintage_cutoff_at", protocol.naive_baseline.input_vintage_cutoff_at],
    ["/naive_baseline/missing_input_policy", protocol.naive_baseline.missing_input_policy],
    ["/naive_baseline/rounding_policy", protocol.naive_baseline.rounding_policy],
    ["/scoring/baseline_id", protocol.scoring.baseline_id],
    ["/scoring/naive_baseline_id", protocol.scoring.naive_baseline_id],
    ["/scoring/implementation_sha256", protocol.scoring.implementation_sha256],
    ["/scoring/conformance_vectors_sha256", protocol.scoring.conformance_vectors_sha256],
    ["/clocks/preregistered_at", protocol.clocks.preregistered_at],
    ["/clocks/issue_opens_at", protocol.clocks.issue_opens_at],
    ["/clocks/issue_closes_at", protocol.clocks.issue_closes_at],
    ["/clocks/observation_starts_at", protocol.clocks.observation_starts_at],
    ["/clocks/observation_ends_at", protocol.clocks.observation_ends_at],
    ["/clocks/outcome_publication_not_before", protocol.clocks.outcome_publication_not_before],
    ["/clocks/resolve_after", protocol.clocks.resolve_after],
    ["/clocks/resolution_closes_at", protocol.clocks.resolution_closes_at],
  ];
  for (const [path, value] of expectedNulls) {
    if (value !== null) {
      issues.push(issue(
        "DRAFT_TEMPLATE_VALUE_PRESENT",
        path,
        "a draft template must not contain a preregistered or empirical value",
      ));
    }
  }
  if (protocol.registration.verification_status !== "not-submitted" ||
      protocol.campaign.manifest.status !== "unsealed" ||
      protocol.campaign.manifest.verification_status !== "not-submitted" ||
      protocol.campaign.manifest.protocol_ids.length !== 0 ||
      protocol.target.registration_status !== "unresolved" ||
      protocol.baseline.registration_status !== "unresolved" ||
      protocol.baseline.input_source_ids.length !== 0 ||
      protocol.naive_baseline.registration_status !== "unresolved" ||
      protocol.naive_baseline.input_source_ids.length !== 0 ||
      protocol.clocks.registration_status !== "unresolved" ||
      protocol.source_chronology.required_source_ids.length !== 0 ||
      protocol.source_chronology.preregistered_event_count !== 0 ||
      protocol.source_chronology.preregistered_tip_sha256 !== null ||
      protocol.source_chronology.events.length !== 0) {
    issues.push(issue(
      "DRAFT_TEMPLATE_NOT_BLANK",
      "/status",
      "draft-template state must remain unresolved, unsealed and free of source events",
    ));
  }
}

function requireFixedRegistration(protocol, issues) {
  const {
    registration,
    campaign,
    target,
    baseline,
    naive_baseline: naiveBaseline,
    clocks,
    source_chronology: chronology,
  } = protocol;
  const manifest = campaign.manifest;
  if (!same(protocol.contract, prospectivePilotContractIdentity())) {
    issues.push(issue(
      "CONTRACT_IDENTITY_MISMATCH",
      "/contract",
      "preregistration must bind the exact schema and validator bytes used for validation",
    ));
  }
  const requiredText = [
    ["/protocol_id", protocol.protocol_id],
    ["/registration/registered_at", registration.registered_at],
    ["/campaign/campaign_id", campaign.campaign_id],
    ["/campaign/manifest/manifest_id", manifest.manifest_id],
    ["/campaign/manifest/campaign_id", manifest.campaign_id],
    ["/campaign/manifest/sealed_at", manifest.sealed_at],
    ["/target/target_id", target.target_id],
    ["/target/question", target.question],
    ["/target/event_definition", target.event_definition],
    ["/target/unit", target.unit],
    ["/target/observation_window/starts_at", target.observation_window.starts_at],
    ["/target/observation_window/ends_at", target.observation_window.ends_at],
    ["/target/resolution_rule", target.resolution_rule],
    ["/target/resolution_source_id", target.resolution_source_id],
    ["/target/resolution_source_uri", target.resolution_source_uri],
    ["/target/resolution_event_id", target.resolution_event_id],
    ["/target/independence_cluster_id", target.independence_cluster_id],
    ["/target/metric_id", target.metric_id],
    ["/target/metric_checksum", target.metric_checksum],
    ["/target/scope_hash", target.scope_hash],
    ["/target/resolver/resolver_id", target.resolver.resolver_id],
    ["/target/resolver/resolver_version", target.resolver.resolver_version],
    ["/target/resolver/implementation_sha256", target.resolver.implementation_sha256],
    ["/target/resolver/parameters_sha256", target.resolver.parameters_sha256],
    ["/target/resolver/conformance_vectors_sha256", target.resolver.conformance_vectors_sha256],
    ["/target/resolver/conflict_policy", target.resolver.conflict_policy],
    ["/target/resolver/correction_policy", target.resolver.correction_policy],
    ["/baseline/baseline_id", baseline.baseline_id],
    ["/baseline/baseline_role", baseline.baseline_role],
    ["/baseline/target_id", baseline.target_id],
    ["/baseline/algorithm_id", baseline.algorithm_id],
    ["/baseline/algorithm_version", baseline.algorithm_version],
    ["/baseline/input_policy", baseline.input_policy],
    ["/baseline/calculation_timing", baseline.calculation_timing],
    ["/baseline/implementation_sha256", baseline.implementation_sha256],
    ["/baseline/conformance_vectors_sha256", baseline.conformance_vectors_sha256],
    ["/baseline/parameters_sha256", baseline.parameters_sha256],
    ["/baseline/input_manifest_sha256", baseline.input_manifest_sha256],
    ["/baseline/input_vintage_cutoff_at", baseline.input_vintage_cutoff_at],
    ["/baseline/missing_input_policy", baseline.missing_input_policy],
    ["/baseline/rounding_policy", baseline.rounding_policy],
    ["/naive_baseline/baseline_id", naiveBaseline.baseline_id],
    ["/naive_baseline/baseline_role", naiveBaseline.baseline_role],
    ["/naive_baseline/target_id", naiveBaseline.target_id],
    ["/naive_baseline/algorithm_id", naiveBaseline.algorithm_id],
    ["/naive_baseline/algorithm_version", naiveBaseline.algorithm_version],
    ["/naive_baseline/input_policy", naiveBaseline.input_policy],
    ["/naive_baseline/calculation_timing", naiveBaseline.calculation_timing],
    ["/naive_baseline/implementation_sha256", naiveBaseline.implementation_sha256],
    ["/naive_baseline/conformance_vectors_sha256", naiveBaseline.conformance_vectors_sha256],
    ["/naive_baseline/parameters_sha256", naiveBaseline.parameters_sha256],
    ["/naive_baseline/input_manifest_sha256", naiveBaseline.input_manifest_sha256],
    ["/naive_baseline/input_vintage_cutoff_at", naiveBaseline.input_vintage_cutoff_at],
    ["/naive_baseline/missing_input_policy", naiveBaseline.missing_input_policy],
    ["/naive_baseline/rounding_policy", naiveBaseline.rounding_policy],
    ["/scoring/baseline_id", protocol.scoring.baseline_id],
    ["/scoring/naive_baseline_id", protocol.scoring.naive_baseline_id],
    ["/scoring/implementation_sha256", protocol.scoring.implementation_sha256],
    ["/scoring/conformance_vectors_sha256", protocol.scoring.conformance_vectors_sha256],
    ["/clocks/preregistered_at", clocks.preregistered_at],
    ["/clocks/issue_opens_at", clocks.issue_opens_at],
    ["/clocks/issue_closes_at", clocks.issue_closes_at],
    ["/clocks/observation_starts_at", clocks.observation_starts_at],
    ["/clocks/observation_ends_at", clocks.observation_ends_at],
    ["/clocks/outcome_publication_not_before", clocks.outcome_publication_not_before],
    ["/clocks/resolve_after", clocks.resolve_after],
    ["/clocks/resolution_closes_at", clocks.resolution_closes_at],
  ];
  for (const [path, value] of requiredText) {
    if (typeof value !== "string" || value.length === 0) {
      issues.push(issue(
        "PREREGISTRATION_FIELD_UNRESOLVED",
        path,
        `${path.split("/")[1] || "protocol"} must be fixed before issue`,
      ));
    }
  }
  for (const [path, value] of [
    ["/target/condition_definition_ref", target.condition_definition_ref],
    ["/target/signal_definition_ref", target.signal_definition_ref],
    ["/target/scope", target.scope],
    ["/target/kernel_ref", target.kernel_ref],
    ["/target/signal_registry_ref", target.signal_registry_ref],
  ]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push(issue(
        "PREREGISTRATION_FIELD_UNRESOLVED",
        path,
        `${path.split("/")[1] || "protocol"} must be fixed before issue`,
      ));
    }
  }
  if (target.condition_definition_ref?.condition_id === undefined ||
      target.signal_definition_ref?.signal_id === undefined ||
      target.metric_id === undefined) {
    issues.push(issue(
      "TARGET_BINDINGS_UNRESOLVED",
      "/target",
      "condition, signal and metric bindings must be fixed before issue",
    ));
  }
  if (target.registration_status !== "fixed_before_issue") {
    issues.push(issue("TARGET_NOT_FIXED", "/target", "target must be fixed before issue"));
  }
  if (baseline.registration_status !== "fixed_before_issue" || baseline.input_source_ids.length === 0) {
    issues.push(issue("BASELINE_NOT_FIXED", "/baseline", "baseline must be fixed before issue"));
  }
  if (naiveBaseline.registration_status !== "fixed_before_issue" ||
      naiveBaseline.input_source_ids.length === 0) {
    issues.push(issue(
      "NAIVE_BASELINE_NOT_FIXED",
      "/naive_baseline",
      "naive baseline must be fixed before issue",
    ));
  }
  if (baseline.baseline_role !== "reference_class" || naiveBaseline.baseline_role !== "naive") {
    issues.push(issue(
      "BASELINE_ROLES_INVALID",
      "/baseline",
      "reference and naive baseline roles must be fixed and distinct",
    ));
  }
  if (baseline.target_id !== target.target_id) {
    issues.push(issue(
      "BASELINE_TARGET_MISMATCH",
      "/baseline/target_id",
      "baseline must bind the exact preregistered target",
    ));
  }
  if (naiveBaseline.target_id !== target.target_id) {
    issues.push(issue(
      "NAIVE_BASELINE_TARGET_MISMATCH",
      "/naive_baseline/target_id",
      "naive baseline must bind the exact preregistered target",
    ));
  }
  if (protocol.scoring.baseline_id !== baseline.baseline_id) {
    issues.push(issue(
      "SCORING_BASELINE_MISMATCH",
      "/scoring/baseline_id",
      "scoring baseline must bind the exact preregistered baseline",
    ));
  }
  if (protocol.scoring.naive_baseline_id !== naiveBaseline.baseline_id) {
    issues.push(issue(
      "SCORING_NAIVE_BASELINE_MISMATCH",
      "/scoring/naive_baseline_id",
      "scoring must bind the exact preregistered naive baseline",
    ));
  }
  if (clocks.registration_status !== "fixed_before_issue") {
    issues.push(issue("CLOCKS_NOT_FIXED", "/clocks", "issue and close clocks must be fixed before issue"));
  }
  if (registration.verification_status !== "unverified_external_review_required" ||
      registration.external_receipt === null) {
    issues.push(issue(
      "REGISTRATION_RECEIPT_REQUIRED",
      "/registration",
      "a preregistration requires a claimed external receipt and remains unverified",
    ));
  }
  if (!SHA256.test(registration.protocol_content_sha256 || "") ||
      registration.protocol_content_sha256 !== protocolContentSha256(protocol)) {
    issues.push(issue(
      "PROTOCOL_CONTENT_CHECKSUM_MISMATCH",
      "/registration/protocol_content_sha256",
      "protocol content checksum does not match the complete preregistered substance",
    ));
  }
  if (registration.external_receipt?.registered_content_sha256 !==
      registration.protocol_content_sha256) {
    issues.push(issue(
      "RECEIPT_CONTENT_BINDING_MISMATCH",
      "/registration/external_receipt/registered_content_sha256",
      "registration receipt must name the exact protocol content checksum",
    ));
  }
  if (registration.external_receipt?.registered_at !== registration.registered_at) {
    issues.push(issue(
      "RECEIPT_TIME_MISMATCH",
      "/registration/external_receipt/registered_at",
      "registration receipt timestamp must equal the preregistration timestamp",
    ));
  }
  if (manifest.status !== "sealed" ||
      manifest.verification_status !== "unverified_external_review_required") {
    issues.push(issue(
      "CAMPAIGN_MANIFEST_NOT_SEALED",
      "/campaign/manifest",
      "campaign manifest must be sealed before issue and remain externally unverified",
    ));
  }
  if (campaign.campaign_id !== manifest.campaign_id) {
    issues.push(issue(
      "CAMPAIGN_ID_MISMATCH",
      "/campaign/manifest/campaign_id",
      "campaign ID must match its manifest",
    ));
  }
  if (!manifest.protocol_ids.includes(protocol.protocol_id)) {
    issues.push(issue(
      "MANIFEST_PROTOCOL_MISSING",
      "/campaign/manifest/protocol_ids",
      "campaign manifest must contain this protocol ID",
    ));
  }
  if (!SHA256.test(manifest.manifest_sha256 || "") ||
      manifest.manifest_sha256 !== campaignManifestSha256(manifest)) {
    issues.push(issue(
      "MANIFEST_CHECKSUM_MISMATCH",
      "/campaign/manifest/manifest_sha256",
      "campaign manifest checksum does not match its non-circular canonical content",
    ));
  }
  if (registration.registered_at !== clocks.preregistered_at) {
    issues.push(issue(
      "PREREGISTRATION_TIME_MISMATCH",
      "/clocks/preregistered_at",
      "registration and clock preregistration times must match",
    ));
  }
  if (target.observation_window.starts_at !== clocks.observation_starts_at ||
      target.observation_window.ends_at !== clocks.observation_ends_at) {
    issues.push(issue(
      "OBSERVATION_CLOCK_MISMATCH",
      "/clocks",
      "target and protocol observation clocks must match exactly",
    ));
  }
  if (!same(chronology.required_source_ids, [target.resolution_source_id])) {
    issues.push(issue(
      "RESOLUTION_SOURCE_UNTRACKED",
      "/source_chronology/required_source_ids",
      "this bounded pilot must track exactly its one registered resolution source",
    ));
  }
}

function assessClockChronology(protocol, issues) {
  const { clocks } = protocol;
  const ordered = [
    ["preregistered_at", clocks.preregistered_at],
    ["issue_opens_at", clocks.issue_opens_at],
    ["issue_closes_at", clocks.issue_closes_at],
    ["observation_starts_at", clocks.observation_starts_at],
    ["observation_ends_at", clocks.observation_ends_at],
    ["outcome_publication_not_before", clocks.outcome_publication_not_before],
    ["resolve_after", clocks.resolve_after],
    ["resolution_closes_at", clocks.resolution_closes_at],
  ];
  const additionalInstants = [
    protocol.campaign.manifest.sealed_at,
    protocol.registration.external_receipt?.registered_at,
    protocol.baseline.input_vintage_cutoff_at,
    protocol.naive_baseline.input_vintage_cutoff_at,
  ];
  if (ordered.some(([, value]) => !isUtcInstant(value)) ||
      additionalInstants.some((value) => !isUtcInstant(value))) {
    issues.push(issue(
      "CLOCK_NOT_UTC",
      "/clocks",
      "every preregistered clock must be an exact RFC 3339 UTC instant ending in Z",
    ));
    return;
  }
  const times = Object.fromEntries(ordered.map(([key, value]) => [key, asTime(value)]));
  if (!(times.preregistered_at <= times.issue_opens_at &&
      times.issue_opens_at < times.issue_closes_at &&
      times.issue_closes_at < times.observation_starts_at &&
      times.observation_starts_at < times.observation_ends_at &&
      times.observation_ends_at <= times.outcome_publication_not_before &&
      times.outcome_publication_not_before <= times.resolve_after &&
      times.resolve_after <= times.resolution_closes_at)) {
    issues.push(issue(
      "CLOCK_CHRONOLOGY_INVALID",
      "/clocks",
      "registration and issue clocks must precede observation; publication, resolve-after and resolution-close boundaries must then remain ordered",
    ));
  }
  const sealedAt = asTime(protocol.campaign.manifest.sealed_at);
  if (!(sealedAt <= times.preregistered_at && times.preregistered_at < times.issue_opens_at)) {
    issues.push(issue(
      "MANIFEST_SEAL_TIME_INVALID",
      "/campaign/manifest/sealed_at",
      "campaign manifest must be sealed no later than registration and before issue opens",
    ));
  }
  if (asTime(protocol.baseline.input_vintage_cutoff_at) > times.issue_opens_at) {
    issues.push(issue(
      "BASELINE_INPUT_CUTOFF_LATE",
      "/baseline/input_vintage_cutoff_at",
      "baseline input vintage must close no later than forecast issue opens",
    ));
  }
  if (asTime(protocol.naive_baseline.input_vintage_cutoff_at) > times.issue_opens_at) {
    issues.push(issue(
      "NAIVE_BASELINE_INPUT_CUTOFF_LATE",
      "/naive_baseline/input_vintage_cutoff_at",
      "naive baseline input vintage must close no later than forecast issue opens",
    ));
  }
}

function assessSourceChronology(protocol, issues) {
  const chronology = protocol.source_chronology;
  const required = new Set(chronology.required_source_ids);
  if (required.size === 0) {
    issues.push(issue(
      "SOURCE_CHRONOLOGY_EMPTY",
      "/source_chronology/required_source_ids",
      "preregistration requires at least one tracked resolution source",
    ));
    return;
  }
  const bySource = new Map([...required].map((id) => [id, []]));
  let previousTime = Number.NEGATIVE_INFINITY;
  let previousEventSha256 = null;
  chronology.events.forEach((event, index) => {
    if (event.sequence !== index + 1) {
      issues.push(issue(
        "SOURCE_SEQUENCE_INVALID",
        `/source_chronology/events/${index}/sequence`,
        "source chronology sequence must be contiguous and append-only",
      ));
    }
    if (event.previous_event_sha256 !== previousEventSha256 ||
        event.event_sha256 !== sourceChronologyEventSha256(event)) {
      issues.push(issue(
        "SOURCE_EVENT_CHAIN_INVALID",
        `/source_chronology/events/${index}`,
        "source chronology event hash or previous-event link is invalid",
      ));
    }
    previousEventSha256 = event.event_sha256;
    if (!required.has(event.source_id)) {
      issues.push(issue(
        "SOURCE_NOT_REGISTERED",
        `/source_chronology/events/${index}/source_id`,
        "source event must name a preregistered required source",
      ));
      return;
    }
    if (!isUtcInstant(event.observed_at) || asTime(event.observed_at) < previousTime) {
      issues.push(issue(
        "SOURCE_TIME_INVALID",
        `/source_chronology/events/${index}/observed_at`,
        "source chronology must use nondecreasing RFC 3339 UTC instants",
      ));
    }
    previousTime = asTime(event.observed_at);
    if (event.state === "reported_absent" && event.artifact_sha256 !== null) {
      issues.push(issue(
        "ABSENT_SOURCE_HAS_BYTES",
        `/source_chronology/events/${index}/artifact_sha256`,
        "an absent source cannot carry an artifact checksum",
      ));
    }
    if (event.state === "reported_present_checksum_only" &&
        !SHA256.test(event.artifact_sha256 || "")) {
      issues.push(issue(
        "PRESENT_SOURCE_BYTES_MISSING",
        `/source_chronology/events/${index}/artifact_sha256`,
        "a reported source presence requires a SHA-256 checksum",
      ));
    }
    bySource.get(event.source_id).push(event);
  });

  if (chronology.preregistered_event_count !== required.size ||
      chronology.preregistered_event_count > chronology.events.length ||
      chronology.preregistered_event_count === 0) {
    issues.push(issue(
      "PREREGISTERED_SOURCE_PREFIX_INVALID",
      "/source_chronology/preregistered_event_count",
      "preregistered source prefix must contain exactly one initial event per required source",
    ));
  } else {
    const initialEvents = chronology.events.slice(0, chronology.preregistered_event_count);
    const initialIds = new Set(initialEvents.map(({ source_id: sourceId }) => sourceId));
    if (initialEvents.some(({ state }) => state !== "reported_absent") ||
        initialIds.size !== required.size ||
        [...required].some((sourceId) => !initialIds.has(sourceId)) ||
        chronology.preregistered_tip_sha256 !== initialEvents.at(-1).event_sha256) {
      issues.push(issue(
        "PREREGISTERED_SOURCE_TIP_INVALID",
        "/source_chronology/preregistered_tip_sha256",
        "preregistered chronology tip must seal one absent event for every required source",
      ));
    }
  }

  for (const [sourceId, events] of bySource) {
    if (events.length === 0 || events[0].state !== "reported_absent") {
      issues.push(issue(
        "SOURCE_DID_NOT_BEGIN_ABSENT",
        "/source_chronology/events",
        `source ${sourceId} chronology must begin absent`,
      ));
      continue;
    }
    if (asTime(events[0].observed_at) > asTime(protocol.clocks.preregistered_at)) {
      issues.push(issue(
        "INITIAL_ABSENCE_TOO_LATE",
        "/source_chronology/events",
        `source ${sourceId} absence must be recorded by preregistration`,
      ));
    }
    let present = false;
    for (const event of events) {
      if (present && event.state === "reported_absent") {
        issues.push(issue(
          "SOURCE_PRESENCE_REVERSED",
          "/source_chronology/events",
          `source ${sourceId} cannot return to reported absence after presence is reported`,
        ));
      }
      if (event.state === "reported_present_checksum_only") {
        present = true;
        if (asTime(event.observed_at) < asTime(protocol.clocks.observation_ends_at)) {
          issues.push(issue(
            "SOURCE_PRESENT_TOO_EARLY",
            "/source_chronology/events",
            `source ${sourceId} cannot be present before the observation window ends`,
          ));
        }
        if (asTime(event.observed_at) > asTime(protocol.clocks.resolution_closes_at)) {
          issues.push(issue(
            "SOURCE_PRESENT_TOO_LATE",
            "/source_chronology/events",
            `source ${sourceId} presence cannot be selected after resolution closes`,
          ));
        }
      }
    }
    if (events.filter(({ state }) => state === "reported_present_checksum_only").length > 1) {
      issues.push(issue(
        "MULTIPLE_SOURCE_PRESENCE_EVENTS",
        "/source_chronology/events",
        `source ${sourceId} may contribute only the first retained presence before resolution closes`,
      ));
    }
  }
}

function assessExternalContext(protocol, {
  expectedCampaignManifest,
  expectedExternalReceipt,
  expectedSourceChronologyTip,
} = {}) {
  if (protocol?.status !== "preregistered-unverified") return [];
  const issues = [];
  if (!expectedCampaignManifest ||
      !same(expectedCampaignManifest, protocol.campaign.manifest)) {
    issues.push(issue(
      "CAMPAIGN_CONTEXT_MISMATCH",
      "/campaign/manifest",
      "complete preregistration requires a separately supplied exact campaign manifest",
    ));
  }
  if (!expectedExternalReceipt ||
      !same(expectedExternalReceipt, protocol.registration.external_receipt)) {
    issues.push(issue(
      "RECEIPT_CONTEXT_MISMATCH",
      "/registration/external_receipt",
      "complete preregistration requires a separately supplied exact receipt context",
    ));
  }
  const chronology = protocol.source_chronology;
  const expectedTip = {
    event_count: chronology.events.length,
    tip_sha256: chronology.events.at(-1)?.event_sha256 || null,
  };
  const hasPostRegistrationTail = chronology.events.length >
    chronology.preregistered_event_count;
  if ((hasPostRegistrationTail && !expectedSourceChronologyTip) ||
      (expectedSourceChronologyTip && !same(expectedSourceChronologyTip, expectedTip))) {
    issues.push(issue(
      "SOURCE_TIP_ANCHOR_MISMATCH",
      "/source_chronology/events",
      "a supplied chronology anchor must match the exact current event count and tip; every post-registration tail requires one",
    ));
  }
  return issues;
}

export function assessProspectivePilotProtocol(protocol, externalContext) {
  const schemaConformant = validateSchema(protocol);
  const issues = schemaConformant ? [] : (validateSchema.errors || []).map((error) => issue(
    "SCHEMA_INVALID",
    error.instancePath || "/",
    error.message || "schema validation failed",
  ));

  if (schemaConformant) {
    if (protocol.status === "draft-template") {
      assessBlankTemplate(protocol, issues);
    } else {
      requireFixedRegistration(protocol, issues);
      assessClockChronology(protocol, issues);
      assessSourceChronology(protocol, issues);
    }
  }

  const contextIssues = schemaConformant
    ? assessExternalContext(protocol, externalContext)
    : [];
  const internallyValid = schemaConformant && issues.length === 0;
  const structurallyComplete = internallyValid &&
    protocol?.status === "preregistered-unverified";

  return {
    schema_conformant: schemaConformant,
    semantics_valid: internallyValid,
    protocol_valid: internallyValid,
    preregistration_structurally_complete_unverified: structurallyComplete,
    supplied_context_objects_match: structurallyComplete && contextIssues.length === 0,
    status: protocol?.status || null,
    forecast_issued: false,
    authority_effect: "none",
    action_authorised: false,
    operational_effect: false,
    external_registration_verified: false,
    independent_anchor_verified: false,
    issues,
    context_issues: contextIssues,
  };
}

export function assertProspectivePilotProtocol(protocol) {
  const result = assessProspectivePilotProtocol(protocol);
  if (!result.protocol_valid) {
    const detail = result.issues.map(({ code, path, message }) =>
      `${code} ${path}: ${message}`).join("\n");
    throw new Error(`Prospective pilot protocol is invalid:\n${detail}`);
  }
  return result;
}

export function assertProspectivePilotPreregistration(protocol, externalContext) {
  assertProspectivePilotProtocol(protocol);
  const result = assessProspectivePilotProtocol(protocol, externalContext);
  if (!result.preregistration_structurally_complete_unverified) {
    throw new Error("Prospective pilot document is not a structurally complete preregistration");
  }
  if (!result.supplied_context_objects_match) {
    const detail = result.context_issues.map(({ code, path, message }) =>
      `${code} ${path}: ${message}`).join("\n");
    throw new Error(`Prospective pilot external context is incomplete or mismatched:\n${detail}`);
  }
  return result;
}
