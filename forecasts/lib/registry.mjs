import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  assertFrozenResolutionResolver,
  assertResolutionOutcome,
} from "./resolution.mjs";

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

export function assertForecastSemantics(forecast) {
  if (!LIFECYCLE.has(forecast?.status)) {
    throw new TypeError("forecast has an invalid lifecycle status");
  }
  if (!FORECAST_USES.has(forecast?.forecast_use)) {
    throw new TypeError("forecast must declare research_only or decision_linked use");
  }
  probability(forecast.probability, "forecast probability");
  assertTargetBinding(forecast.target);
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
