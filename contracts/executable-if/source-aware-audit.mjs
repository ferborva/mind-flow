import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const hash = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const intrinsic = (unit) => unit === "ratio" ? { minimum: 0, maximum: 1 }
  : unit === "percent" ? { minimum: 0, maximum: 100 }
    : unit === "count" ? { minimum: 0, maximum: null } : null;

function retainedField(reference, sources, signal) {
  if (reference?.signal_definition_hash !== signal.signal_definition_hash || !(sources instanceof Map)) return null;
  const bytes = sources.get(reference.source_artifact_hash);
  if (!(bytes instanceof Uint8Array) || hash(bytes) !== reference.source_artifact_hash ||
      typeof reference.source_field !== "string" || !reference.source_field.startsWith("/")) return null;
  try {
    let value = JSON.parse(Buffer.from(bytes).toString("utf8"));
    for (const token of reference.source_field.slice(1).split("/")) {
      if (/~(?![01])/.test(token)) return null;
      const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
      if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) return null;
      value = value[key];
    }
    return value;
  } catch { return null; }
}

function vacuity(range, operator, threshold) {
  if (!range || !Number.isFinite(threshold)) return "unassessed";
  const minimum = range.minimum ?? -Infinity;
  const maximum = range.maximum ?? Infinity;
  if (minimum >= maximum) return "unassessed";
  if (operator === "gte") return threshold <= minimum ? "always_true" : threshold > maximum ? "always_false" : "not_vacuous";
  if (operator === "gt") return threshold < minimum ? "always_true" : threshold >= maximum ? "always_false" : "not_vacuous";
  if (operator === "lte") return threshold >= maximum ? "always_true" : threshold < minimum ? "always_false" : "not_vacuous";
  if (operator === "lt") return threshold > maximum ? "always_true" : threshold <= minimum ? "always_false" : "not_vacuous";
  if (operator === "eq") return threshold < minimum || threshold > maximum ? "always_false" : "not_vacuous";
  if (operator === "neq") return threshold < minimum || threshold > maximum ? "always_true" : "not_vacuous";
  return "unassessed";
}

// This audit deliberately does not alter or reseal a kernel, infer a population
// domain from a sample, or claim the frozen formal validator performed this check.
export function auditSignalThreshold({ signal, predicate, observations = [], domainProvenance = [], retainedSources = new Map() }) {
  const issues = [];
  const add = (code, severity, message) => issues.push({ code, severity, message });
  if (signal?.value_kind !== "number") return { signal_id: signal?.signal_id, status: "not_applicable", issues };
  const inherent = intrinsic(signal.unit);
  const rawRange = signal.value_range || inherent;
  // Frozen signalRange rejects explicit null bounds. Only omitted ratio/percent
  // bounds inherit their unit limits; null in our internal count description is
  // an infinity marker, not permission to put null in a declared definition.
  const boundedIntrinsic = inherent?.maximum !== null ? inherent : null;
  const declared = rawRange && {
    minimum: rawRange.minimum ?? boundedIntrinsic?.minimum ?? -Infinity,
    maximum: rawRange.maximum ?? boundedIntrinsic?.maximum ?? Infinity,
  };
  const validRange = rawRange && (rawRange.minimum !== undefined || rawRange.maximum !== undefined) &&
    (!signal.value_range ||
      ((rawRange.minimum === undefined || Number.isFinite(rawRange.minimum)) &&
       (rawRange.maximum === undefined || Number.isFinite(rawRange.maximum)))) &&
    declared.minimum < declared.maximum;
  if (!validRange) add("DOMAIN_UNASSESSED", "unassessed", "No valid declared numeric domain is available for source-aware review.");
  if (inherent && signal.value_range && validRange &&
      (declared.minimum < inherent.minimum ||
       (inherent.maximum !== null && declared.maximum > inherent.maximum))) {
    add("DOMAIN_CONTRADICTS_INTRINSIC_UNIT", "error", "A declared domain cannot add values excluded by the intrinsic unit, including negative counts.");
  }
  const sameIntrinsic = inherent && validRange &&
    declared.minimum === inherent.minimum &&
    declared.maximum === (inherent.maximum ?? Infinity);
  let domainAssessment = sameIntrinsic ? "intrinsic" : "unassessed";
  const domainSources = [];
  if (!sameIntrinsic && validRange) {
    for (const reference of domainProvenance) {
      const field = retainedField(reference, retainedSources, signal);
      if (field?.unit === signal.unit && isDeepStrictEqual(field.value_range, signal.value_range)) domainSources.push(reference);
      else if (field?.unit === signal.unit && field.value_range) {
        add("DOMAIN_SOURCE_FIELD_MISMATCH", "error", "The declared domain disagrees with the supplied hash-bound source domain field.");
      }
    }
    if (domainSources.length) domainAssessment = "retained_source_field_bound";
    else add("DOMAIN_PROVENANCE_UNASSESSED", "unassessed", "A non-intrinsic domain or extra bound needs a matching retained source field and exact artifact hash; a declared range alone is not provenance.");
  }
  const values = [];
  const boundObservations = [];
  for (const reference of observations) {
    const field = retainedField(reference, retainedSources, signal);
    if (!field || field.unit !== signal.unit || !Number.isFinite(field.value)) {
      add("OBSERVATION_BINDING_UNASSESSED", "unassessed", "An observation is missing, has a wrong unit/signal, or does not resolve to exact retained bytes.");
      continue;
    }
    values.push(field.value);
    boundObservations.push(reference);
    if (inherent && (field.value < inherent.minimum || (inherent.maximum !== null && field.value > inherent.maximum) ||
        (signal.unit === "count" && !Number.isSafeInteger(field.value)))) {
      add("OBSERVATION_CONTRADICTS_INTRINSIC_UNIT", "error", "A retained value contradicts the intrinsic numeric unit.");
    }
    if (validRange && (field.value < (declared.minimum ?? -Infinity) || field.value > (declared.maximum ?? Infinity))) {
      add("OBSERVATION_OUTSIDE_DECLARED_DOMAIN", "error", "A retained value lies outside the declared definition domain.");
    }
  }
  if (!values.length) add("OBSERVED_ENVELOPE_UNASSESSED", "unassessed", "No matching retained observations establish even a historical evidence envelope.");
  const envelope = values.length ? { minimum: Math.min(...values), maximum: Math.max(...values), observations: values.length } : null;
  const threshold = predicate?.threshold?.value;
  if (!Number.isFinite(threshold) || predicate.threshold.unit !== signal.unit) {
    add("THRESHOLD_TYPE_OR_UNIT_INVALID", "error", "A threshold must have the signal's exact numeric type and unit.");
  } else if (envelope && (threshold < envelope.minimum || threshold > envelope.maximum)) {
    add("THRESHOLD_OUTSIDE_OBSERVED_ENVELOPE", "review", "The threshold is outside these retained historical values. This flags contextual plausibility, not logical vacuity, invalidity, or an inferred population bound.");
  }
  const intrinsicVacuity = vacuity(inherent, predicate?.operator, threshold);
  const declaredVacuity = validRange ? vacuity(declared, predicate?.operator, threshold) : "unassessed";
  if ([intrinsicVacuity, declaredVacuity].some((value) => ["always_true", "always_false"].includes(value))) {
    add("THRESHOLD_MATHEMATICAL_VACUITY", "review", "The threshold is constant over an explicitly identified domain; declared-domain results remain conditional on domain provenance.");
  }
  const unassessed = domainAssessment === "unassessed" || issues.some((issue) => issue.severity === "unassessed");
  return { signal_id: signal.signal_id, signal_definition_hash: signal.signal_definition_hash,
    status: issues.some((issue) => ["error", "review"].includes(issue.severity)) ? "flagged" : unassessed ? "unassessed" : "assessed_no_flags",
    domain_assessment: domainAssessment, domain_source_refs: domainSources, intrinsic_domain: inherent,
    declared_domain: signal.value_range || null, intrinsic_domain_vacuity: intrinsicVacuity,
    declared_domain_vacuity: declaredVacuity, evidence_assessment: values.length === observations.length && values.length ? "retained_fields_bound" : "unassessed",
    observed_envelope: envelope, observation_source_refs: boundObservations, issues,
    domain_inferred_from_sample: false, empirical_plausibility_established: false,
    publisher_identity_verified: false, authority_effect: "none", action_authorised: false };
}
