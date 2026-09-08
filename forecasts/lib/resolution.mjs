import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const RESOLUTION_RESOLVER_ID = "mind-flow.binary-threshold-json";
export const RESOLUTION_RESOLVER_VERSION = "1.1.0";

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const PAYLOAD_FIELDS = [
  "schema_version",
  "resolution_event_id",
  "signal_id",
  "metric_id",
  "metric_checksum",
  "condition_id",
  "scope_hash",
  "measure",
  "unit",
  "scope",
  "observation_window_start",
  "observation_window_end",
  "value",
];

function withheld(reason) {
  return {
    status: "withheld_unreconstructed",
    reason,
    byte_integrity_verified: false,
    publisher_identity_verified: false,
  };
}

function strictBase64(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? bytes : null;
}

function compare(operator, value, threshold) {
  if (operator === "gt") return value > threshold;
  if (operator === "gte") return value >= threshold;
  if (operator === "lt") return value < threshold;
  if (operator === "lte") return value <= threshold;
  if (operator === "eq") return value === threshold;
  throw new TypeError(`unsupported resolution operator ${operator}`);
}

export function assertFrozenResolutionResolver(target) {
  const resolver = target?.resolver;
  if (!resolver || typeof resolver !== "object") {
    throw new TypeError("target requires a frozen versioned resolution resolver");
  }
  if (resolver.resolver_id !== RESOLUTION_RESOLVER_ID
      || resolver.resolver_version !== RESOLUTION_RESOLVER_VERSION) {
    throw new TypeError("target resolution resolver id and version are unsupported");
  }
  for (const field of ["measure", "observation_unit"]) {
    if (typeof resolver[field] !== "string" || resolver[field].length === 0) {
      throw new TypeError(`target resolution resolver ${field} must be present`);
    }
  }
  if (!Number.isFinite(resolver.threshold)) {
    throw new TypeError("target resolution resolver threshold must be finite");
  }
  if (!["gt", "gte", "lt", "lte", "eq"].includes(resolver.operator)) {
    throw new TypeError("target resolution resolver operator is unsupported");
  }
  return resolver;
}

export function reconstructResolutionOutcome(forecast) {
  const resolver = assertFrozenResolutionResolver(forecast?.target);
  const evidence = forecast?.resolution?.evidence;
  if (!evidence || typeof evidence !== "object") {
    return withheld("resolution_evidence_missing");
  }

  const retainedFields = [
    "retained_media_type",
    "retained_bytes_base64",
    "publisher_identity_verification_status",
  ];
  const present = retainedFields.filter((field) => evidence[field] !== undefined);
  if (present.length === 0) return withheld("resolution_bytes_not_retained");
  if (present.length !== retainedFields.length) {
    throw new TypeError("retained resolution evidence fields must be supplied together");
  }
  if (evidence.retained_media_type !== "application/json") {
    throw new TypeError("retained resolution evidence must be application/json");
  }
  if (evidence.publisher_identity_verification_status
      !== "unverified_external_review_required") {
    throw new Error("retained bytes cannot self-assert verified publisher identity");
  }

  const bytes = strictBase64(evidence.retained_bytes_base64);
  if (!bytes) throw new TypeError("retained resolution bytes must use canonical base64");
  if (!SHA256.test(evidence.checksum || "")) {
    throw new TypeError("resolution evidence checksum must be a SHA-256 content address");
  }
  const checksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (checksum !== evidence.checksum) {
    throw new Error("retained bytes do not match the resolution evidence checksum");
  }

  let payload;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new TypeError("retained resolution bytes must contain valid JSON");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || !isDeepStrictEqual(Object.keys(payload).sort(), [...PAYLOAD_FIELDS].sort())) {
    throw new TypeError("retained resolution payload must use the closed resolver shape");
  }
  if (payload.schema_version !== "1.1.0") {
    throw new TypeError("retained resolution payload schema version is unsupported");
  }
  if (!Number.isFinite(payload.value)) {
    throw new TypeError("retained resolution payload value must be finite");
  }

  const expected = {
    resolution_event_id: forecast.target.resolution_event_id,
    signal_id: forecast.target.signal_id,
    metric_id: forecast.target.metric_id,
    metric_checksum: forecast.target.metric_checksum,
    condition_id: forecast.target.condition_id,
    scope_hash: forecast.target.scope_hash,
    measure: resolver.measure,
    unit: resolver.observation_unit,
    scope: forecast.target.scope,
    observation_window_start: forecast.target.observation_window_start,
    observation_window_end: forecast.target.observation_window_end,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (!isDeepStrictEqual(payload[field], value)) {
      throw new Error(`retained resolution payload ${field} does not match the frozen target`);
    }
  }

  return {
    status: "reconstructed",
    reason: null,
    outcome: compare(resolver.operator, payload.value, resolver.threshold) ? 1 : 0,
    observed_value: payload.value,
    resolver_id: resolver.resolver_id,
    resolver_version: resolver.resolver_version,
    evidence_checksum: checksum,
    byte_integrity_verified: true,
    publisher_identity_verified: false,
    publisher_identity_verification_status:
      evidence.publisher_identity_verification_status,
  };
}

export function assertResolutionOutcome(forecast) {
  const reconstruction = reconstructResolutionOutcome(forecast);
  if (reconstruction.status === "reconstructed"
      && reconstruction.outcome !== forecast.resolution.outcome) {
    throw new Error(
      `derived outcome ${reconstruction.outcome} does not match declared outcome ${forecast.resolution.outcome}`,
    );
  }
  return reconstruction;
}

export class ForecastScoringWithheldError extends Error {
  constructor(forecastId, reason) {
    super(`scoring withheld for ${forecastId}: ${reason}; retained resolution bytes are required`);
    this.name = "ForecastScoringWithheldError";
    this.forecastId = forecastId;
    this.reason = reason;
  }
}

export function requireReconstructedResolution(forecast) {
  const reconstruction = assertResolutionOutcome(forecast);
  if (reconstruction.status !== "reconstructed") {
    throw new ForecastScoringWithheldError(forecast?.id, reconstruction.reason);
  }
  return reconstruction;
}
