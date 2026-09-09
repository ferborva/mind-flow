import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { normalizedIdentity } from "./identity.mjs";

import {
  assertFrozenResolutionResolver,
  assertResolutionOutcome,
} from "./resolution.mjs";
import {
  computeEvidenceStateHash,
  evaluateKernelCondition,
  validateExecutableIfKernel,
} from "../../contracts/executable-if/validate.mjs";
import {
  computeMetricContractChecksum,
  validateSignalRegistry,
} from "../../signals/validate.mjs";

export const IMMUTABLE_ISSUE_FIELDS = [
  "schema_version",
  "id",
  "epistemic_class",
  "forecast_use",
  "title",
  "question",
  "issued_at",
  "resolve_after",
  "resolve_by",
  "probability",
  "target",
  "baseline",
  "naive_baseline",
  "method",
  "data_vintages",
  "provenance",
  "assumptions",
  "counter_hypotheses",
  "void_policy",
  "decision_context",
  "issue_basis",
];

const LIFECYCLE = new Set(["issued", "resolved", "void"]);
const FORECAST_USES = new Set(["research_only", "decision_linked"]);
const RESOLUTION_STATUS = Object.freeze({
  issued: "pending",
  resolved: "resolved",
  void: "void",
});
const HISTORY_EVENTS = Object.freeze({
  issued: ["issued"],
  resolved: ["issued", "resolved"],
  void: ["issued", "voided"],
});
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const BINDING_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const MAX_ABS_UTILITY = 1_000_000_000;
const VOID_REASONS = new Set([
  "source_retired",
  "measure_materially_changed",
  "resolution_evidence_unavailable",
]);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function same(left, right) {
  return isDeepStrictEqual(left, right);
}

function without(value, field) {
  const result = structuredClone(value);
  delete result[field];
  return result;
}

function digest(domain, value) {
  return `sha256:${createHash("sha256")
    .update(`mind-flow:forecast:${domain}:v1\n${JSON.stringify(canonicalValue(value))}`, "utf8")
    .digest("hex")}`;
}

export function forecastIssueBasisHash(issueBasis) {
  return digest("issue-basis", without(issueBasis, "issue_basis_hash"));
}

function percent(value) {
  return `${Number((value * 100).toFixed(6))}%`;
}

export function renderForecastClaimCeiling(forecast) {
  const state = forecast?.issue_basis?.issue_evaluation_receipt?.computed_rule_state?.state ||
    "unknown";
  const use = (forecast?.forecast_use || "unclassified").replaceAll("_", "-");
  const provenanceClass = forecast?.provenance?.class || "unclassified";
  const event = (forecast?.target?.event || "unspecified event").replace(/[.!?]+$/, "");
  return `This ${use} forecast assigns ${percent(forecast?.probability)} to this future event: ${event}. Provenance class: ${provenanceClass}. At issue time, ${forecast?.issued_at || "unspecified"}, the executable IF rule computed ${state}. The probability and IF state answer different questions. Neither establishes empirical truth, causality, authority or permission to act.`;
}

function issue(code, path, message) {
  return { code, path, message };
}

function projectedConditionScope(definition) {
  return {
    jurisdictions: structuredClone(definition.scope.jurisdictions),
    geographies: structuredClone(definition.scope.geographies),
    cohorts: structuredClone(definition.scope.cohorts),
    services: structuredClone(definition.scope.services),
    period: structuredClone(definition.claim.period),
  };
}

function projectedTargetScope(conditionScope) {
  return {
    geographies: structuredClone(conditionScope.geographies),
    cohorts: structuredClone(conditionScope.cohorts),
    services: structuredClone(conditionScope.services),
  };
}

function projectedEvaluationReceipt(evaluation) {
  return {
    evaluated_at: evaluation.evaluated_at,
    clock: structuredClone(evaluation.clock),
    evaluator_ref: structuredClone(evaluation.evaluator_ref),
    condition_definition_ref: structuredClone(evaluation.condition_definition_ref),
    observation_hashes: structuredClone(evaluation.observation_hashes),
    mechanically_valid_for_evaluation: evaluation.mechanically_valid_for_evaluation,
    computed_rule_state: structuredClone(evaluation.computed_rule_state),
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    kernel_manifest_hash: evaluation.kernel_manifest_hash,
    evidence_state_hash: evaluation.evidence_state_hash,
    evaluation_hash: evaluation.evaluation_hash,
  };
}

function evidenceStateRef(kernel) {
  const tip = kernel.evidence_events.at(-1);
  return {
    kernel_id: kernel.kernel_id,
    kernel_manifest_hash: kernel.manifest_hash,
    event_count: kernel.evidence_events.length,
    tip_event_id: tip.evidence_event_id,
    tip_event_hash: tip.evidence_event_hash,
    state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
  };
}

function exactSource(source, reference, { idField, manifestField } = {}) {
  if (!source?.document || !source?.path || !source?.sha256) return false;
  if (source.path !== reference?.artifact_path || source.sha256 !== reference?.artifact_sha256) {
    return false;
  }
  if (idField && source.document[idField] !== reference[idField]) return false;
  if (manifestField && source.document[manifestField] !== reference[manifestField]) return false;
  return true;
}

function retainedSourceBytesMatch(source) {
  if (!(source?.bytes instanceof Uint8Array)) return false;
  const bytes = Buffer.from(source.bytes);
  const sha256 = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (sha256 !== source.sha256) return false;
  try {
    return same(JSON.parse(bytes.toString("utf8")), source.document);
  } catch {
    return false;
  }
}

function requiredInterpretationBoundaries(forecast) {
  return {
    probability_relation: "orthogonal-to-current-computed-if-state",
    current_if_state_is_forecast_probability: false,
    probability_establishes_empirical_truth: false,
    probability_establishes_causality: false,
    probability_establishes_authority: false,
    empirical_truth_established: false,
    causality_established: false,
    authority_effect: "none",
    action_authorised: false,
    public_claim_ceiling: renderForecastClaimCeiling(forecast),
  };
}

export function assessForecastIssueBasis(forecast, sources = {}) {
  const errors = [];
  const basis = forecast?.issue_basis;
  const target = forecast?.target;
  const externalRequested = sources.sourceKernel !== undefined ||
    sources.sourceSignalRegistry !== undefined;

  if (forecast?.schema_version !== "1.4.0" || !basis) {
    errors.push(issue(
      "ISSUE_BASIS_REQUIRED",
      "/issue_basis",
      "forecast schema 1.4.0 requires an exact issue-time basis",
    ));
  } else {
    if (basis.issue_basis_hash !== forecastIssueBasisHash(basis)) {
      errors.push(issue(
        "ISSUE_BASIS_HASH_MISMATCH",
        "/issue_basis/issue_basis_hash",
        "issue basis hash does not match its canonical content",
      ));
    }
    if (basis.issued_at !== forecast.issued_at ||
        basis.issue_evaluation_receipt?.evaluated_at !== forecast.issued_at) {
      errors.push(issue(
        "ISSUE_TIME_MISMATCH",
        "/issue_basis/issued_at",
        "the condition receipt must be evaluated at the immutable forecast issue time",
      ));
    }
    if (target?.condition_id !== basis.condition_definition_ref?.condition_id ||
        !same(
          basis.issue_evaluation_receipt?.condition_definition_ref,
          basis.condition_definition_ref,
        )) {
      errors.push(issue(
        "CONDITION_DEFINITION_REF_MISMATCH",
        "/issue_basis/condition_definition_ref",
        "target and issue receipt must name one exact condition definition",
      ));
    }
    if (target?.signal_id !== basis.signal_definition_ref?.signal_id ||
        target?.metric_id !== basis.metric_contract?.metric_id ||
        target?.metric_checksum !== basis.metric_contract?.metric_checksum) {
      errors.push(issue(
        "FORECAST_TARGET_SUBSTITUTED",
        "/target",
        "target must resolve the exact issue-basis signal and metric contract",
      ));
    }
    if (basis.metric_contract?.metric_checksum !==
        computeMetricContractChecksum(basis.metric_contract || {})) {
      errors.push(issue(
        "METRIC_CONTRACT_HASH_MISMATCH",
        "/issue_basis/metric_contract/metric_checksum",
        "the issue-basis metric contract must retain its canonical registry checksum",
      ));
    }
    const targetScope = basis.condition_scope
      ? projectedTargetScope(basis.condition_scope)
      : null;
    if (!targetScope || !same(target?.scope, targetScope) ||
        basis.target_scope_hash !== target?.scope_hash ||
        target?.scope_hash !== forecastScopeHash(target?.scope)) {
      errors.push(issue(
        "CONDITION_SCOPE_MISMATCH",
        "/issue_basis/condition_scope",
        "target scope must be the exact forecast projection of the bound condition scope",
      ));
    }
    const conditionStartsAt = Date.parse(basis.condition_scope?.period?.starts_at);
    const conditionEndsAt = Date.parse(basis.condition_scope?.period?.ends_at);
    const observationStartsAt = Date.parse(target?.observation_window_start);
    const observationEndsAt = Date.parse(target?.observation_window_end);
    if (![conditionStartsAt, conditionEndsAt, observationStartsAt, observationEndsAt]
      .every(Number.isFinite) || observationStartsAt < conditionStartsAt ||
        observationEndsAt > conditionEndsAt) {
      errors.push(issue(
        "FORECAST_WINDOW_OUTSIDE_CONDITION_PERIOD",
        "/target/observation_window_start",
        "the complete future observation window must stay inside the bound condition PERIOD",
      ));
    }
    const receipt = basis.issue_evaluation_receipt;
    if (receipt?.kernel_manifest_hash !== basis.kernel_ref?.manifest_hash ||
        receipt?.kernel_manifest_hash !== basis.evidence_state_ref?.kernel_manifest_hash ||
        receipt?.evidence_state_hash !== basis.evidence_state_ref?.state_hash) {
      errors.push(issue(
        "ISSUE_RECEIPT_INTERNAL_MISMATCH",
        "/issue_basis/issue_evaluation_receipt",
        "issue receipt must bind the same kernel manifest and evidence state as the issue basis",
      ));
    }
    if (!same(basis.interpretation_boundaries, requiredInterpretationBoundaries(forecast))) {
      errors.push(issue(
        "PROBABILITY_STATE_CONFLATION",
        "/issue_basis/interpretation_boundaries",
        "forecast probability must remain orthogonal to current IF state, truth and authority",
      ));
    }
    if (forecast.probability === 0 || forecast.probability === 1) {
      errors.push(issue(
        "FALSE_CERTAINTY",
        "/probability",
        "exact-binding forecasts must not communicate an uncertain future event as certainty",
      ));
    }
  }

  if (externalRequested && basis) {
    const kernelSource = sources.sourceKernel;
    const registrySource = sources.sourceSignalRegistry;
    if (!retainedSourceBytesMatch(kernelSource)) {
      errors.push(issue(
        "KERNEL_SOURCE_BYTES_MISMATCH",
        "/issue_basis/kernel_ref/artifact_sha256",
        "kernel document and claimed digest must reproduce the retained source bytes",
      ));
    }
    if (!retainedSourceBytesMatch(registrySource)) {
      errors.push(issue(
        "SIGNAL_REGISTRY_SOURCE_BYTES_MISMATCH",
        "/issue_basis/signal_registry_ref/artifact_sha256",
        "signal registry document and claimed digest must reproduce the retained source bytes",
      ));
    }
    if (!exactSource(kernelSource, basis.kernel_ref, {
      idField: "kernel_id",
      manifestField: "manifest_hash",
    })) {
      errors.push(issue(
        "KERNEL_ARTIFACT_REF_MISMATCH",
        "/issue_basis/kernel_ref",
        "kernel path, artifact hash, identity and manifest must resolve exactly",
      ));
    }
    if (!exactSource(registrySource, basis.signal_registry_ref, { idField: "registry_id" }) ||
        registrySource?.document?.schema_version !== basis.signal_registry_ref?.schema_version) {
      errors.push(issue(
        "SIGNAL_REGISTRY_ARTIFACT_REF_MISMATCH",
        "/issue_basis/signal_registry_ref",
        "signal registry path, artifact hash, identity and version must resolve exactly",
      ));
    }

    const kernel = kernelSource?.document;
    const registry = registrySource?.document;
    const kernelValidation = kernel ? validateExecutableIfKernel(kernel) : null;
    if (!kernelValidation?.machine_valid) {
      errors.push(issue(
        "SOURCE_KERNEL_INVALID",
        "/issue_basis/kernel_ref",
        "the bound executable IF kernel is not machine valid",
      ));
    }
    const registryValidation = registry ? validateSignalRegistry(registry) : null;
    if (!registryValidation?.machine_valid) {
      errors.push(issue(
        "SOURCE_SIGNAL_REGISTRY_INVALID",
        "/issue_basis/signal_registry_ref",
        "the bound signal registry is not machine valid",
      ));
    }

    if (kernelValidation?.machine_valid && registryValidation?.machine_valid) {
      const activeState = kernel.current_state.find(({ lifecycle, condition_definition_ref: ref }) =>
        lifecycle === "active" && ref.condition_id === target?.condition_id);
      const definition = kernel.events.flatMap(({ introduced_definitions: values }) => values)
        .find(({ definition_hash: hash }) =>
          hash === activeState?.condition_definition_ref?.definition_hash);
      if (!activeState || !definition ||
          !same(activeState.condition_definition_ref, basis.condition_definition_ref)) {
        errors.push(issue(
          "CONDITION_DEFINITION_REF_MISMATCH",
          "/issue_basis/condition_definition_ref",
          "the issue basis does not resolve the active immutable condition definition",
        ));
      } else {
        if (!same(projectedConditionScope(definition), basis.condition_scope)) {
          errors.push(issue(
            "CONDITION_SCOPE_MISMATCH",
            "/issue_basis/condition_scope",
            "condition scope and PERIOD must reproduce the active definition exactly",
          ));
        }
        const predicate = definition.predicates?.[basis.predicate_id];
        if (!predicate || !same(predicate.signal_ref, basis.signal_definition_ref)) {
          errors.push(issue(
            "PREDICATE_SIGNAL_REF_MISMATCH",
            "/issue_basis/predicate_id",
            "predicate must resolve the exact active signal definition",
          ));
        } else if (target?.resolver?.operator !== predicate.operator ||
            !same(target?.resolver?.threshold, predicate.threshold.value) ||
            target?.resolver?.observation_unit !== predicate.threshold.unit ||
            target?.resolver?.measure !== basis.metric_contract?.measure) {
          errors.push(issue(
            "RESOLUTION_RULE_MISMATCH",
            "/target/resolver",
            "frozen resolver must preserve the bound predicate operator, threshold, unit and measure",
          ));
        }
      }

      const registeredSignal = registry.signals.find(({ signal_id: id }) =>
        id === target?.signal_id);
      const executable = registeredSignal?.executable_binding;
      if (!registeredSignal || !executable ||
          !same(executable.signal_definition_ref, basis.signal_definition_ref) ||
          !same(executable.condition_definition_ref, basis.condition_definition_ref) ||
          !executable.predicate_ids.includes(basis.predicate_id) ||
          !same(registeredSignal.metric_contract, basis.metric_contract)) {
        errors.push(issue(
          "SIGNAL_METRIC_BINDING_MISMATCH",
          "/issue_basis/metric_contract",
          "signal definition, predicate and complete metric contract must resolve exactly in the registry",
        ));
      }

      const registeredSourceUris = (registeredSignal?.source_refs || []).map((sourceId) =>
        registry.sources.find(({ source_id: id }) => id === sourceId)?.evidence_ref)
        .filter(Boolean);
      if (!registeredSourceUris.includes(target?.resolution_source)) {
        errors.push(issue(
          "RESOLUTION_SOURCE_MISMATCH",
          "/target/resolution_source",
          "future resolution must use a source registered for the bound signal",
        ));
      }

      const expectedEvidenceState = evidenceStateRef(kernel);
      const registryConditionBinding = registry.condition_bindings.find(({ condition_id: id }) =>
        id === target?.condition_id);
      const expectedRegistryEvidenceRef = {
        kernel_id: expectedEvidenceState.kernel_id,
        kernel_manifest_hash: expectedEvidenceState.kernel_manifest_hash,
        evidence_event_count: expectedEvidenceState.event_count,
        evidence_tip_event_id: expectedEvidenceState.tip_event_id,
        evidence_tip_event_hash: expectedEvidenceState.tip_event_hash,
        evidence_state_hash: expectedEvidenceState.state_hash,
      };
      if (!registryConditionBinding ||
          !same(registryConditionBinding.condition_definition_ref, basis.condition_definition_ref) ||
          !same(registryConditionBinding.evidence_state_ref, expectedRegistryEvidenceRef)) {
        errors.push(issue(
          "REGISTRY_CONDITION_BINDING_MISMATCH",
          "/issue_basis/signal_registry_ref",
          "signal registry must bind the exact condition definition and complete kernel evidence state",
        ));
      }
      if (!same(expectedEvidenceState, basis.evidence_state_ref)) {
        errors.push(issue(
          "ISSUE_EVIDENCE_STATE_REPLAYED",
          "/issue_basis/evidence_state_ref",
          "issue basis must bind the complete evidence history tip of its pinned kernel snapshot",
        ));
      }
      if (kernel.evidence_events.some(({ recorded_at: recordedAt }) =>
        Date.parse(recordedAt) > Date.parse(forecast.issued_at))) {
        errors.push(issue(
          "ISSUE_EVIDENCE_FROM_FUTURE",
          "/issue_basis/evidence_state_ref",
          "issue basis cannot include evidence recorded after the forecast was issued",
        ));
      }
      const expectedEvaluation = projectedEvaluationReceipt(evaluateKernelCondition(
        kernel,
        target.condition_id,
        { evaluatedAt: forecast.issued_at },
      ));
      if (!same(expectedEvaluation, basis.issue_evaluation_receipt)) {
        errors.push(issue(
          "ISSUE_EVALUATION_RECEIPT_MISMATCH",
          "/issue_basis/issue_evaluation_receipt",
          "issue-time receipt must reproduce the governed evaluator result exactly",
        ));
      }
      const expectedMetricPeriod = `${basis.condition_scope?.period?.starts_at} to ${basis.condition_scope?.period?.ends_at}`;
      if (basis.metric_contract?.period !== expectedMetricPeriod) {
        errors.push(issue(
          "METRIC_PERIOD_MISMATCH",
          "/issue_basis/metric_contract/period",
          "metric contract PERIOD must equal the active condition PERIOD",
        ));
      }
    }
  }

  const valid = errors.length === 0;
  return {
    issue_basis_valid: valid,
    external_bindings_verified: externalRequested && valid,
    issue_time_computed_rule_state:
      basis?.issue_evaluation_receipt?.computed_rule_state?.state || null,
    forecast_probability: forecast?.probability ?? null,
    probability_orthogonal_to_if_state: valid,
    empirical_truth_established: false,
    causality_established: false,
    authority_effect: "none",
    action_authorised: false,
    errors,
  };
}

export function assertForecastIssueBasis(forecast, sources = {}) {
  const assessment = assessForecastIssueBasis(forecast, sources);
  if (!assessment.issue_basis_valid) {
    throw new Error(assessment.errors.map(({ code, path, message }) =>
      `[${code}] ${path}: ${message}`).join("\n"));
  }
  return assessment;
}

export function assertForecastWithRetainedSources(forecast, sources) {
  if (forecast?.schema_version === "1.4.0" &&
      (sources?.sourceKernel === undefined ||
       sources?.sourceSignalRegistry === undefined)) {
    throw new Error(
      "forecast schema 1.4.0 requires exact retained kernel and signal-registry sources",
    );
  }
  assertForecastSemantics(forecast, sources);
  if (forecast?.schema_version === "1.4.0") {
    const assessment = assessForecastIssueBasis(forecast, sources);
    if (!assessment.external_bindings_verified) {
      throw new Error("forecast retained-source bindings were not verified");
    }
  }
  return true;
}

export function forecastScopeHash(scope) {
  const bytes = JSON.stringify(canonicalValue(scope));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function assertTargetBinding(target) {
  if (!target?.scope || typeof target.scope !== "object" || Array.isArray(target.scope)) {
    throw new TypeError("target.scope must be present before its scope_hash can be verified");
  }
  for (const field of ["signal_id", "metric_id", "condition_id"]) {
    if (!BINDING_ID.test(target?.[field] || "")) {
      throw new TypeError(`target.${field} must be a non-empty binding identifier`);
    }
  }
  if (!SHA256.test(target?.metric_checksum || "")) {
    throw new TypeError("target.metric_checksum must be a SHA-256 content address");
  }
  if (!SHA256.test(target?.scope_hash || "")) {
    throw new TypeError("target.scope_hash must be a SHA-256 content address");
  }
  if (target.scope_hash !== forecastScopeHash(target.scope)) {
    throw new Error("target.scope_hash does not match the canonical target scope");
  }
}

function probability(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be a finite probability between 0 and 1`);
  }
  return value;
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
  ) {
    return null;
  }
  return date.getTime();
}

function instant(value, label) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(
    value || "",
  );
  if (!match || calendarDate(match[1]) === null) {
    throw new TypeError(`${label} must be an exact RFC 3339 instant on a real calendar date`);
  }
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  const zone = match[5];
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  const parsed = Date.parse(value);
  if (
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    zoneHour > 23 ||
    zoneMinute > 59 ||
    !Number.isFinite(parsed)
  ) {
    throw new TypeError(`${label} must be an exact RFC 3339 instant on a real calendar date`);
  }
  return parsed;
}

function contentAddressedEvidence(evidence, label, { publicationRequired = false } = {}) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError(`${label} must be content-addressed evidence`);
  }
  if (typeof evidence.source !== "string" || evidence.source.length === 0) {
    throw new TypeError(`${label} source must be present`);
  }
  try {
    new URL(evidence.source);
  } catch {
    throw new TypeError(`${label} source must be an absolute URI`);
  }
  if (typeof evidence.vintage !== "string" || evidence.vintage.length === 0) {
    throw new TypeError(`${label} vintage must be present`);
  }
  if (!SHA256.test(evidence.checksum || "")) {
    throw new TypeError(`${label} checksum must be a SHA-256 content address`);
  }
  const retrievedAt = instant(evidence.retrieved_at, `${label} retrieved_at`);
  let publishedAt = null;
  if (evidence.published_at !== undefined) {
    publishedAt = instant(evidence.published_at, `${label} published_at`);
    if (publishedAt > retrievedAt) {
      throw new Error(`${label} cannot be retrieved before it is published`);
    }
  } else if (publicationRequired) {
    throw new TypeError(`${label} must declare published_at`);
  }
  return { retrievedAt, publishedAt };
}

function mechanicalBaseline(value, label, issuedAt) {
  probability(value?.probability, `${label} probability`);
  if (value?.kind !== "mechanical") {
    throw new TypeError(`${label} must be mechanical`);
  }
  for (const field of ["campaign_id", "family_id", "name", "method"]) {
    if (typeof value?.[field] !== "string" || value[field].length === 0) {
      throw new TypeError(`${label} ${field} must be present`);
    }
  }
  const declaredAt = instant(value.declared_at, `${label} declared_at`);
  if (declaredAt >= issuedAt) {
    throw new Error(`${label} must be independently declared before issued_at`);
  }
  const policyEvidence = contentAddressedEvidence(value.policy_snapshot, `${label} policy snapshot`);
  if (policyEvidence.retrievedAt > declaredAt) {
    throw new Error(`${label} policy snapshot cannot follow its declaration`);
  }
  const calculation = value.calculation || {};
  if (
    typeof calculation.algorithm_id !== "string" || !calculation.algorithm_id ||
    typeof calculation.version !== "string" || !calculation.version ||
    !Array.isArray(calculation.input_checksums) || calculation.input_checksums.length === 0 ||
    calculation.input_checksums.some((checksum) => !SHA256.test(checksum)) ||
    !SHA256.test(calculation.checksum || "") ||
    calculation.verification_status !== "unverified_external_review_required"
  ) {
    throw new TypeError(`${label} needs a content-addressed mechanical calculation`);
  }
  return value;
}

function decisionContext(forecast, issuedAt, resolveAfter) {
  const context = forecast.decision_context;
  if (!context || typeof context !== "object") {
    throw new TypeError("decision-linked forecast requires a decision context");
  }

  const owner = context.claimed_accountable_owner;
  if (!owner || typeof owner.claimed_owner_id !== "string" || owner.claimed_owner_id.length === 0) {
    throw new TypeError("decision-linked forecast requires a claimed accountable owner");
  }
  const acknowledgedAt = instant(owner.acknowledged_at, "decision accountable owner acknowledged_at");
  if (acknowledgedAt > issuedAt) {
    throw new Error("decision accountable owner acknowledgement cannot follow issued_at");
  }
  if (owner.verification_status !== "unverified_external_review_required") {
    throw new Error("claimed owner authority must remain explicitly unverified");
  }
  const acknowledgement = contentAddressedEvidence(
    owner.acknowledgement_evidence,
    "claimed owner acknowledgement evidence",
  );
  if (acknowledgement.retrievedAt > acknowledgedAt) {
    throw new Error("claimed owner acknowledgement evidence cannot follow acknowledged_at");
  }

  const decisionDueAt = instant(context.decision_due_at, "decision_context.decision_due_at");
  if (!(issuedAt < decisionDueAt && decisionDueAt <= resolveAfter)) {
    throw new Error("decision due time must follow issued_at and not follow resolve_after");
  }

  const actions = context.eligible_actions || [];
  const actionSet = new Set(actions);
  if (actions.length < 2 || actionSet.size !== actions.length) {
    throw new Error("decision-linked forecast needs at least two unique eligible actions");
  }

  const policy = context.forecast_policy || {};
  for (const action of [policy.action_at_or_above, policy.action_below]) {
    if (!actionSet.has(action)) {
      throw new Error("forecast policy must select an eligible action");
    }
  }
  if (policy.role !== "evaluation_only_human_authorisation_required") {
    throw new Error("forecast policy cannot authorise action");
  }
  if (
    typeof policy.probability_threshold !== "number" ||
    !Number.isFinite(policy.probability_threshold) ||
    policy.probability_threshold < 0 ||
    policy.probability_threshold > 1
  ) {
    throw new TypeError("forecast policy threshold must be a finite probability");
  }

  const noModel = context.no_model_baseline || {};
  if (!actionSet.has(noModel.action)) {
    throw new Error("no-model baseline must select an eligible action");
  }
  const baselineDeclaredAt = instant(
    noModel.declared_at,
    "decision_context.no_model_baseline.declared_at",
  );
  if (baselineDeclaredAt > issuedAt) {
    throw new Error("no-model baseline declared_at cannot follow issued_at");
  }
  const baselineEvidence = contentAddressedEvidence(
    noModel.policy_snapshot,
    "no-model baseline policy snapshot",
  );
  if (baselineEvidence.retrievedAt > baselineDeclaredAt) {
    throw new Error("no-model baseline policy snapshot cannot follow baseline declared_at");
  }

  const utility = context.utility_model || {};
  const utilityBasis = utility.basis || {};
  const utilityDeclaredAt = instant(
    utilityBasis.declared_at,
    "decision_context.utility_model.basis.declared_at",
  );
  if (utilityDeclaredAt > issuedAt) {
    throw new Error("utility basis declared_at cannot follow issued_at");
  }
  const utilityEvidence = contentAddressedEvidence(
    utilityBasis.evidence,
    "utility basis evidence",
  );
  if (utilityEvidence.retrievedAt > utilityDeclaredAt) {
    throw new Error("utility basis evidence cannot follow utility basis declared_at");
  }
  if (!["agent_hypothesis", "affected_party_governed", "authorised_policy"].includes(utilityBasis.class)) {
    throw new TypeError("utility basis class is invalid");
  }
  if (
    typeof utility.lower_bound !== "number" || !Number.isFinite(utility.lower_bound) ||
    typeof utility.upper_bound !== "number" || !Number.isFinite(utility.upper_bound) ||
    utility.lower_bound >= utility.upper_bound ||
    Math.abs(utility.lower_bound) > MAX_ABS_UTILITY ||
    Math.abs(utility.upper_bound) > MAX_ABS_UTILITY
  ) {
    throw new TypeError(`utility bounds must be finite, ordered and within ${MAX_ABS_UTILITY}`);
  }
  const entries = utility.entries || [];
  const utilityKeys = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!actionSet.has(entry.action) || (entry.outcome !== 0 && entry.outcome !== 1)) {
      throw new Error(`utility entry ${index} must map an eligible action and binary outcome`);
    }
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
      throw new TypeError(`utility entry ${index} value must be finite`);
    }
    if (entry.value < utility.lower_bound || entry.value > utility.upper_bound) {
      throw new Error("utility value must remain inside the declared utility bounds");
    }
    const key = `${entry.action}\u0000${entry.outcome}`;
    if (utilityKeys.has(key)) {
      throw new Error("utility table cannot contain duplicate action-outcome entries");
    }
    utilityKeys.add(key);
  }
  const expectedUtilityKeys = actions.flatMap((action) => [0, 1].map((y) => `${action}\u0000${y}`));
  if (
    utilityKeys.size !== expectedUtilityKeys.length ||
    expectedUtilityKeys.some((key) => !utilityKeys.has(key))
  ) {
    throw new Error("utility table must be complete for every eligible action and binary outcome");
  }

  return { actionSet, decisionDueAt, owner };
}

function validateDecisionObservation(observation, decision, issuedAt, terminalAt) {
  if (!observation || typeof observation !== "object") return false;
  const decidedAt = instant(observation.decided_at, "decision observation decided_at");
  if (decidedAt < issuedAt || decidedAt > decision.decisionDueAt || decidedAt >= terminalAt) {
    throw new Error("decision observation must follow issue and precede decision due time and resolution or void");
  }
  const decisionEvidence = contentAddressedEvidence(
    observation.evidence,
    "decision observation evidence",
    { publicationRequired: true },
  );
  if (
    decisionEvidence.publishedAt < decidedAt ||
    decisionEvidence.retrievedAt < decidedAt ||
    decisionEvidence.retrievedAt > decision.decisionDueAt ||
    decisionEvidence.retrievedAt > terminalAt
  ) {
    throw new Error("decision observation evidence must be pinned after the decision and before its due time and terminal event");
  }
  if (observation.claimed_authoriser_id !== decision.owner.claimed_owner_id) {
    throw new Error("decision observation must name the claimed accountable owner");
  }
  if (observation.authority_verification_status !== "unverified_external_review_required") {
    throw new Error("decision authority must remain explicitly unverified");
  }
  if (!decision.actionSet.has(observation.action_taken)) {
    throw new Error("decision observation must record an eligible action");
  }
  return true;
}

export function assertIssuedForecastImmutable(issued, later) {
  if (issued?.status !== "issued") {
    throw new TypeError("the original record must have issued status");
  }
  if (!LIFECYCLE.has(later?.status)) {
    throw new TypeError("the later record has an invalid lifecycle status");
  }

  assertForecastSemantics(issued);
  assertForecastSemantics(later);

  const changed = IMMUTABLE_ISSUE_FIELDS.filter(
    (field) => !isDeepStrictEqual(issued[field], later[field]),
  );
  if (changed.length) {
    throw new Error(`issued forecast fields are immutable: ${changed.join(", ")}`);
  }

  const originalHistory = issued.history || [];
  const laterPrefix = (later.history || []).slice(0, originalHistory.length);
  if (!isDeepStrictEqual(originalHistory, laterPrefix)) {
    throw new Error("issued forecast history is append-only");
  }
  return true;
}

export function assertForecastSemantics(forecast, sources) {
  if (!LIFECYCLE.has(forecast?.status)) {
    throw new TypeError("forecast has an invalid lifecycle status");
  }
  if (!FORECAST_USES.has(forecast?.forecast_use)) {
    throw new TypeError("forecast must declare research_only or decision_linked use");
  }
  probability(forecast.probability, "forecast probability");
  assertTargetBinding(forecast.target);
  if (forecast.schema_version === "1.4.0") {
    assertForecastIssueBasis(forecast, sources);
  }
  const issuedAt = instant(forecast.issued_at, "issued_at");
  const resolveAfter = instant(forecast.resolve_after, "resolve_after");
  const resolveBy = instant(forecast.resolve_by, "resolve_by");
  if (!(issuedAt < resolveAfter && resolveAfter <= resolveBy)) {
    throw new Error("forecast chronology must be issued_at < resolve_after <= resolve_by");
  }
  const observationStart = instant(
    forecast.target?.observation_window_start,
    "target.observation_window_start",
  );
  const observationEnd = instant(
    forecast.target?.observation_window_end,
    "target.observation_window_end",
  );
  const publicationNotBefore = instant(
    forecast.target?.outcome_publication_not_before,
    "target.outcome_publication_not_before",
  );
  if (!(issuedAt < observationStart && observationStart <= observationEnd &&
        observationEnd <= publicationNotBefore && publicationNotBefore <= resolveAfter)) {
    throw new Error("forecast must be issued before its observation and publication boundaries");
  }
  for (const field of ["resolution_event_id", "independence_cluster_id"]) {
    if (typeof forecast.target?.[field] !== "string" || forecast.target[field].length === 0) {
      throw new TypeError(`target.${field} must be present`);
    }
  }
  assertFrozenResolutionResolver(forecast.target);

  const referenceBaseline = mechanicalBaseline(forecast.baseline, "reference-class baseline", issuedAt);
  const naiveBaseline = mechanicalBaseline(forecast.naive_baseline, "naive baseline", issuedAt);
  if (referenceBaseline.mechanical_role !== "reference_class" ||
      naiveBaseline.mechanical_role !== "naive") {
    throw new Error("baseline fields must declare their mechanical reference-class or naive role");
  }
  if (referenceBaseline.campaign_id !== naiveBaseline.campaign_id) {
    throw new Error("mechanical baselines must share one campaign_id");
  }

  const voidPolicy = forecast.void_policy;
  if (
    !voidPolicy ||
    voidPolicy.evidence_required !== true ||
    !Array.isArray(voidPolicy.allowed_reason_codes) ||
    voidPolicy.allowed_reason_codes.length === 0 ||
    voidPolicy.allowed_reason_codes.some((reason) => !VOID_REASONS.has(reason))
  ) {
    throw new TypeError("forecast must predeclare an evidence-required void policy");
  }

  if (forecast.forecast_use === "research_only" && forecast.decision_context !== undefined) {
    throw new Error("research-only forecast cannot carry a decision context");
  }
  const decision = forecast.forecast_use === "decision_linked"
    ? decisionContext(forecast, issuedAt, resolveAfter)
    : null;

  for (const [index, vintage] of (forecast.data_vintages || []).entries()) {
    const vintageEvidence = contentAddressedEvidence(vintage, `data vintage ${index}`);
    if (vintageEvidence.retrievedAt > issuedAt) {
      throw new Error(`data vintage ${index} retrieved_at cannot follow issued_at`);
    }
  }

  const expectedResolutionStatus = RESOLUTION_STATUS[forecast.status];
  if (forecast.resolution?.status !== expectedResolutionStatus) {
    throw new Error(
      `forecast status ${forecast.status} must match resolution status ${expectedResolutionStatus}`,
    );
  }

  const history = forecast.history || [];
  if (!history.length || history[0].event !== "issued") {
    throw new Error("forecast history must begin with issued");
  }
  const historyTimes = history.map((entry, index) => instant(entry.at, `history[${index}].at`));
  if (historyTimes[0] !== issuedAt) {
    throw new Error("forecast history issued event must match issued_at");
  }
  for (let index = 1; index < historyTimes.length; index += 1) {
    if (historyTimes[index] <= historyTimes[index - 1]) {
      throw new Error("forecast history must be strictly chronological");
    }
  }
  const expectedEvents = HISTORY_EVENTS[forecast.status];
  if (history.length !== expectedEvents.length ||
      history.some((entry, index) => entry.event !== expectedEvents[index])) {
    throw new Error(`forecast history events must match status ${forecast.status}`);
  }

  if (forecast.status === "resolved") {
    if (forecast.resolution.outcome !== 0 && forecast.resolution.outcome !== 1) {
      throw new TypeError("resolved forecast outcome must be 0 or 1");
    }
    const resolvedAt = instant(forecast.resolution.resolved_at, "resolution.resolved_at");
    if (resolvedAt < resolveAfter) {
      throw new Error("forecast cannot resolve before its resolution window");
    }
    if (resolvedAt > resolveBy) {
      throw new Error("forecast resolution.resolved_at cannot follow resolve_by");
    }
    const resolutionEvidence = contentAddressedEvidence(
      forecast.resolution.evidence,
      "resolution evidence",
      { publicationRequired: true },
    );
    if (resolutionEvidence.publishedAt < publicationNotBefore ||
        resolutionEvidence.publishedAt <= issuedAt) {
      throw new Error("resolution evidence publication cannot predate its declared publication boundary or issued_at");
    }
    if (resolutionEvidence.retrievedAt > resolvedAt) {
      throw new Error("resolution evidence retrieved_at cannot follow resolved_at");
    }
    assertResolutionOutcome(forecast);
    if (historyTimes.at(-1) !== resolvedAt) {
      throw new Error("forecast history resolved event must match resolution.resolved_at");
    }
    const observation = forecast.resolution.decision_observation;
    if (!decision && observation !== undefined) {
      throw new Error("research-only forecast cannot carry a decision observation");
    }
    if (decision) {
      if (!validateDecisionObservation(observation, decision, issuedAt, resolvedAt)) {
        throw new Error("decision-linked resolution requires a decision observation");
      }
    }
  }
  if (forecast.status === "void") {
    const voidedAt = instant(forecast.resolution.voided_at, "resolution.voided_at");
    if (voidedAt < issuedAt) {
      throw new Error("forecast cannot be voided before it was issued");
    }
    if (historyTimes.at(-1) !== voidedAt) {
      throw new Error("forecast history voided event must match resolution.voided_at");
    }
    if (voidedAt > resolveBy) {
      throw new Error("forecast cannot be voided after resolve_by");
    }
    if (!voidPolicy.allowed_reason_codes.includes(forecast.resolution.reason_code)) {
      throw new Error("void reason must be declared in the issue-time void policy");
    }
    const voidEvidence = contentAddressedEvidence(
      forecast.resolution.evidence,
      "void evidence",
      { publicationRequired: true },
    );
    if (voidEvidence.publishedAt < issuedAt) {
      throw new Error("void evidence cannot have been published before issued_at");
    }
    if (voidEvidence.retrievedAt > voidedAt) {
      throw new Error("void evidence retrieved_at cannot follow voided_at");
    }
    const adjudication = forecast.resolution.adjudication;
    if (
      !adjudication || adjudication.independent_of_forecaster !== true ||
      adjudication.decision !== "accepted_void" ||
      adjudication.verification_status !== "unverified_external_review_required" ||
      typeof adjudication.claimed_adjudicator_id !== "string" || !adjudication.claimed_adjudicator_id
    ) {
      throw new Error("void requires a claimed independent adjudication with unverified authority");
    }
    const adjudicationEvidence = contentAddressedEvidence(
      adjudication.evidence,
      "void adjudication evidence",
      { publicationRequired: true },
    );
    if (adjudicationEvidence.publishedAt < issuedAt || adjudicationEvidence.retrievedAt > voidedAt) {
      throw new Error("void adjudication evidence must be published after issue and retrieved by void time");
    }
    if (adjudicationEvidence.publishedAt < voidEvidence.publishedAt ||
        adjudicationEvidence.retrievedAt < voidEvidence.retrievedAt) {
      throw new Error("void adjudication must occur after the void evidence it adjudicates");
    }
    const adjudicatorIdentity = normalizedIdentity(adjudication.claimed_adjudicator_id);
    if (!adjudicatorIdentity) {
      throw new Error("claimed void adjudicator must have a nonempty printable identity");
    }
    const forecasterIdentities = [forecast.provenance?.author, history[0]?.actor]
      .map(normalizedIdentity)
      .filter(Boolean);
    if (forecasterIdentities.includes(adjudicatorIdentity)) {
      throw new Error("claimed void adjudicator must be distinct from the forecaster");
    }
    const observation = forecast.resolution.decision_observation;
    if (!decision && observation !== undefined) {
      throw new Error("research-only forecast cannot carry a decision observation");
    }
    if (decision) {
      const observed = validateDecisionObservation(observation, decision, issuedAt, voidedAt);
      if (voidedAt >= decision.decisionDueAt && !observed) {
        throw new Error("decision-linked void after its decision deadline requires a decision observation");
      }
    }
  }
  return true;
}

export function parseExactInstant(value, label = "timestamp") {
  return instant(value, label);
}

export function assertContentAddressedEvidence(evidence, label = "evidence") {
  return contentAddressedEvidence(evidence, label);
}
