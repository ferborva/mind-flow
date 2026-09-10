import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

// This is a forward-only current admission overlay, not a new registered
// scoring plan. Its exact bytes pin its complete membership and linked error.
const CURRENT_PLAN_SHA256 = "sha256:5b4b057f2f85bf0d23b59ec4fb80a311ca21e0857c7053d1fd3c782935bc7244";
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const hash = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
function requireValue(condition, detail) {
  if (!condition) {
    const error = new Error(`NERO error disclosure invalid: ${detail}`);
    error.code = "NERO_ERROR_DISCLOSURE_INVALID";
    throw error;
  }
}
function exactKeys(value, keys, label) {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort()), `${label} requires its closed typed fields`);
}
function document(bytes, label) {
  requireValue(bytes instanceof Uint8Array, `${label} requires retained bytes`);
  try { return JSON.parse(Buffer.from(bytes).toString("utf8")); }
  catch { requireValue(false, `${label} requires valid JSON`); }
}
function instant(value, label) {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace(".000Z", "Z") === value,
  `${label} requires an exact UTC second`);
  return Date.parse(value);
}

/** Pure retained-context validation. Only the pinned loader establishes the
 * current local admission selection; hashes alone authenticate no authority. */
export function validateNeroErrorDisclosure(input) {
  requireValue(input !== null && typeof input === "object", "retained context is required");
  const plan = document(input.planBytes, "current plan");
  exactKeys(plan, ["artifact_type", "schema_version", "id", "forecast_id", "plan_effect",
    "registered_plan", "issued_record", "preregistration", "resolver_parameters", "error_disclosure"], "current plan");
  requireValue(plan.artifact_type === "forecast-current-admission-plan" && plan.schema_version === "1.0.0" &&
    plan.plan_effect === "admission-overlay-only" && typeof plan.id === "string" && plan.id.length > 0,
  "current plan type/version/effect");
  const references = [
    ["registered_plan", "evaluation-plan.json", "registeredPlanBytes"],
    ["issued_record", "issued.json", "issuedBytes"],
    ["preregistration", "preregistration.json", "protocolBytes"],
    ["resolver_parameters", "resolver-parameters.json", "resolverParameterBytes"],
    ["error_disclosure", "error-disclosure.json", "disclosureBytes"],
  ];
  const retained = {};
  for (const [key, path, field] of references) {
    exactKeys(plan[key], key === "registered_plan" ? ["path", "sha256", "registered_plan_checksum"] : ["path", "sha256"], key);
    requireValue(plan[key].path === path && SHA256.test(plan[key].sha256), `${key} reference`);
    retained[key] = document(input[field], key);
    requireValue(hash(input[field]) === plan[key].sha256, `${key} retained bytes differ from current plan`);
  }
  const { error_disclosure: disclosure, issued_record: issued, registered_plan: registered,
    preregistration: protocol, resolver_parameters: resolver } = retained;
  exactKeys(disclosure, ["artifact_type", "schema_version", "id", "forecast_id", "recorded_at", "originally_reported_at",
    "issued_record_sha256", "registered_plan_checksum", "status", "error", "effects", "appointment_gate", "next_action"], "disclosure");
  requireValue(disclosure.artifact_type === "forecast-error-disclosure" && disclosure.schema_version === "1.0.0" &&
    typeof disclosure.id === "string" && disclosure.id.length > 0 && disclosure.status === "error-disclosed-admission-blocked",
  "disclosure type/version/status");
  requireValue(typeof issued?.id === "string" && issued.id === plan.forecast_id && issued.id === disclosure.forecast_id &&
    disclosure.issued_record_sha256 === plan.issued_record.sha256 && issued.status === "issued" &&
    issued.resolution?.status === "pending", "disclosure must identify the unchanged pending issue");
  requireValue(SHA256.test(disclosure.registered_plan_checksum) &&
    disclosure.registered_plan_checksum === plan.registered_plan.registered_plan_checksum &&
    disclosure.registered_plan_checksum === registered?.registered_plan_checksum &&
    isDeepStrictEqual(registered.eligible_registry_manifest?.eligible_forecast_ids, [issued.id]) &&
    registered.cohort?.length === 1 && registered.cohort[0].forecast_id === issued.id &&
    registered.cohort_policy?.eligibility_rule?.exclusions === "none",
  "disclosure must retain the registered plan and complete one-record denominator");
  const reported = instant(disclosure.originally_reported_at, "originally_reported_at");
  const recorded = instant(disclosure.recorded_at, "recorded_at");
  requireValue(reported >= instant(issued.issued_at, "issued_at") && recorded >= reported &&
    recorded < instant(issued.target?.observation_window_start, "observation starts"), "disclosure chronology");
  exactKeys(disclosure.error, ["code", "issued_resolution_rule_sa4_code", "native_resolver_sa4_code",
    "issued_pointer", "preregistration_pointer", "resolver_parameter_pointer"], "error");
  const error = disclosure.error;
  requireValue(error.code === "NERO_NATIVE_TARGET_PROSE_CONFLICT" && error.issued_pointer === "/target/resolution_rule" &&
    error.preregistration_pointer === "/target/resolution_rule" && error.resolver_parameter_pointer === "/sa4_code",
  "error code and source selectors");
  const issuedCodes = [...String(issued.target?.resolution_rule).matchAll(/\bsa4_code ([0-9]+)\b/g)].map(match => match[1]);
  const protocolCodes = [...String(protocol?.target?.resolution_rule).matchAll(/\bsa4_code ([0-9]+)\b/g)].map(match => match[1]);
  requireValue(isDeepStrictEqual(issuedCodes, [error.issued_resolution_rule_sa4_code]) &&
    isDeepStrictEqual(protocolCodes, issuedCodes) && resolver?.sa4_code === error.native_resolver_sa4_code &&
    error.issued_resolution_rule_sa4_code !== error.native_resolver_sa4_code,
  "retained issue, protocol and native resolver must demonstrate the disclosed contradiction");
  requireValue(isDeepStrictEqual(disclosure.effects, { changes_issued_status: false, formal_void: false,
    denominator_exclusion: false, scoring_admitted: false }), "disclosure cannot authorise lifecycle or score changes");
  requireValue(isDeepStrictEqual(disclosure.appointment_gate, { status: "required-not-established",
    appointment_verified: false, identity_authenticated: false, appointed_adjudicator: null }) &&
    disclosure.next_action === "independent-authority-and-policy-review", "appointment must remain unestablished");
  return { disclosure_id: disclosure.id, forecast_id: issued.id, status: disclosure.status,
    error_code: error.code, stored_status: issued.status, stored_resolution_status: issued.resolution.status,
    registered_plan_checksum: registered.registered_plan_checksum, registered_cohort_size: registered.cohort.length,
    formal_void: false, denominator_exclusion: false, appointment_verified: false, identity_authenticated: false,
    next_action: disclosure.next_action, performance_evaluable: false, scores: { mean_brier: null, mean_log_loss: null },
    calibration_established: false };
}

// Read again on every admission so deletion, altered bytes or a removed marker
// cannot be hidden by a process-local cached success. readBytes is a test seam,
// not a persisted admission or an authority-provider interface.
export function loadCurrentNeroErrorDisclosure(readBytes = name => readFileSync(new URL(name, import.meta.url))) {
  try {
    const planBytes = readBytes("current-admission-plan.json");
    requireValue(planBytes instanceof Uint8Array && hash(planBytes) === CURRENT_PLAN_SHA256, "current plan pin mismatch");
    return validateNeroErrorDisclosure({ planBytes, disclosureBytes: readBytes("error-disclosure.json"),
      issuedBytes: readBytes("issued.json"), registeredPlanBytes: readBytes("evaluation-plan.json"),
      protocolBytes: readBytes("preregistration.json"), resolverParameterBytes: readBytes("resolver-parameters.json") });
  } catch (cause) {
    if (cause?.code === "NERO_ERROR_DISCLOSURE_INVALID") throw cause;
    const error = new Error("NERO error disclosure invalid: cannot load required retained context", { cause });
    error.code = "NERO_ERROR_DISCLOSURE_INVALID";
    throw error;
  }
}

export function rejectDisclosedNeroTargetError(forecast) {
  const disclosure = loadCurrentNeroErrorDisclosure();
  if (forecast?.id === disclosure.forecast_id) {
    const error = new Error("NERO intake blocked: disclosed SA4 101/102 target contradiction; see round-09-nero/error-notice.md");
    error.code = "NERO_TARGET_CONFLICT_RECORDED";
    error.disclosure = disclosure;
    throw error;
  }
}
