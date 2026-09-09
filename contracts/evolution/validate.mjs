import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { validateExecutableIfEvolution } from "./project-executable-if.mjs";

const schema = JSON.parse(readFileSync(
  new URL("./schema/condition-evolution-ledger.schema.json", import.meta.url),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const ACTIVE_STATES = new Set(["open", "challenged", "disputed"]);
const HASH = /^sha256:[a-f0-9]{64}$/;
const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SCOPE_DIMENSIONS = ["jurisdictions", "geographies", "cohorts", "services"];
const HASH_DOMAIN = "mind-flow:condition-evolution:v1";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumText(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function checksumDomain(kind, value) {
  return checksumText(`${HASH_DOMAIN}:${kind}\n${value}`);
}

export function computeStateHash(conditions) {
  const sorted = structuredClone(conditions).sort((left, right) =>
    compareId(left?.state?.condition_id || "", right?.state?.condition_id || ""));
  return checksumDomain("base-state", canonicalJson(sorted));
}

export function computeEventHash(event) {
  const value = structuredClone(event);
  delete value.event_hash;
  return checksumDomain("event", canonicalJson(value));
}

export function computeChallengeHash(statement) {
  return checksumDomain("challenge-statement", statement);
}

export function computeConditionDefinitionRef(state) {
  return {
    condition_id: state?.condition_id,
    definition_hash: checksumDomain("condition-definition", canonicalJson({
      condition_id: state?.condition_id,
      wording: state?.wording,
      scope: state?.scope,
    })),
  };
}

export function renderConditionIf(state) {
  const scope = SCOPE_DIMENSIONS
    .map((dimension) => `${dimension}: ${(state?.scope?.[dimension] || []).join(", ")}`)
    .join("; ");
  return `IF ${state?.wording || ""} [${scope}]`;
}

export function computeManifestHash(ledger) {
  const value = structuredClone(ledger);
  delete value.manifest_hash;
  return checksumDomain("ledger-manifest", canonicalJson(value));
}

function problem(code, path, message) {
  return { code, path, message };
}

function instant(value) {
  if (!STRICT_UTC.test(value || "")) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function producerFromEvent(event) {
  return {
    event_id: event.event_id,
    event_version: event.event_version,
    event_hash: event.event_hash,
    sequence: event.sequence,
    effective_at: event.effective_at,
    recorded_at: event.recorded_at,
  };
}

function parentFromProducer(producer) {
  return {
    event_id: producer.event_id,
    event_version: producer.event_version,
    event_hash: producer.event_hash,
  };
}

function compareId(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortedStates(stateMap) {
  return [...stateMap.values()]
    .map(({ state }) => structuredClone(state))
    .sort((left, right) => compareId(left.condition_id, right.condition_id));
}

function initialFold(ledger) {
  const state = new Map();
  for (const entry of ledger?.history?.base?.conditions || []) {
    if (entry?.state?.condition_id) state.set(entry.state.condition_id, structuredClone(entry));
  }
  return state;
}

function foldUnchecked(ledger) {
  const state = initialFold(ledger);
  for (const event of ledger?.events || []) {
    const producer = producerFromEvent(event);
    for (const next of event?.new_states || []) {
      if (next?.condition_id) {
        state.set(next.condition_id, { state: structuredClone(next), producer });
      }
    }
  }
  const last = ledger?.events?.at(-1);
  return {
    as_of_sequence: last?.sequence,
    as_of_event_id: last?.event_id,
    as_of_event_hash: last?.event_hash,
    conditions: sortedStates(state),
  };
}

const STATUS_LABELS = {
  open: "Open; not evaluated",
  challenged: "Challenged; unresolved",
  disputed: "Disputed; unresolved",
  satisfied: "Satisfaction recorded; truth not established by this ledger",
  failed: "Failure recorded; causal explanation not established by this ledger",
  expired: "Expired; unresolved challenges remain visible",
  superseded: "Superseded; inspect its named successors or replacement record",
  withdrawn: "Withdrawn; unresolved challenges remain visible",
};

export function computePublicProjection(ledger) {
  const challenges = new Map();
  const state = initialFold(ledger);
  const latest = new Map();
  for (const entry of ledger?.history?.base?.conditions || []) {
    latest.set(entry.state.condition_id, {
      event_id: entry.producer.event_id,
      actor_id: "actor.omitted-history",
      reason: "The producing event is in omitted, locally unverified history.",
      effective_at: entry.producer.effective_at,
      recorded_at: entry.producer.recorded_at,
    });
  }
  for (const event of ledger?.events || []) {
    for (const challenge of event?.challenges?.entries || []) {
      challenges.set(challenge.challenge_id, challenge);
    }
    const producer = producerFromEvent(event);
    for (const next of event?.new_states || []) {
      state.set(next.condition_id, { state: structuredClone(next), producer });
      latest.set(next.condition_id, {
        event_id: event.event_id,
        actor_id: event.actor?.actor_id,
        reason: event.reason,
        effective_at: event.effective_at,
        recorded_at: event.recorded_at,
      });
    }
  }
  const currentConditions = [...state.values()]
    .map(({ state: condition }) => ({
      condition_id: condition.condition_id,
      condition_version: condition.condition_version,
      condition_definition_ref: structuredClone(condition.condition_definition_ref),
      rendered_if: condition.rendered_if,
      status: condition.status,
      status_label: STATUS_LABELS[condition.status] || "Unknown status",
      unresolved_challenges: [...(condition.unresolved_challenge_ids || [])]
        .sort(compareId)
        .map((challengeId) => {
          const challenge = challenges.get(challengeId);
          return challenge
            ? {
                challenge_id: challengeId,
                details_status: "redacted-hash-only",
                statement_sha256: challenge.statement_sha256,
                raised_at: challenge.raised_at,
              }
            : {
                challenge_id: challengeId,
                details_status: "omitted-unverified",
                statement_sha256: null,
                raised_at: null,
              };
        }),
      last_change: latest.get(condition.condition_id),
    }))
    .sort((left, right) => compareId(left.condition_id, right.condition_id));
  const complete = ledger?.history?.mode === "complete";
  return {
    history: {
      status: complete ? "complete" : "cropped-unverified",
      notice: complete
        ? "The disclosed event history begins at sequence 1. External checkpoint verification remains separate."
        : "Only a disclosed suffix is locally reproducible. Omitted history and its external anchor are not locally verified.",
      omitted_event_count: ledger?.history?.omitted_event_count || 0,
    },
    boundaries: {
      condition_truth_assessed: false,
      authority_granted: false,
      action_authorised: false,
      challenge_details_disclosure: "hash-only-redacted",
    },
    changes: (ledger?.events || []).map((event) => ({
      sequence: event.sequence,
      event_id: event.event_id,
      operation: event.operation,
      condition_ids: [...new Set([
        ...(event.previous_states || []).map(({ condition_id: id }) => id),
        ...(event.new_states || []).map(({ condition_id: id }) => id),
      ])].sort(compareId),
      identity_change: structuredClone(event.identity_change),
      actor_id: event.actor?.actor_id,
      reason: event.reason,
      effective_at: event.effective_at,
      recorded_at: event.recorded_at,
      retroactivity: structuredClone(event.retroactivity),
      challenge_ids: (event.challenges?.entries || []).map(({ challenge_id: id }) => id).sort(compareId),
      resolution_ids: (event.challenges?.resolutions || []).map(({ challenge_id: id }) => id).sort(compareId),
      challenge_records: (event.challenges?.entries || []).map((challenge) => ({
        challenge_id: challenge.challenge_id,
        details_status: "redacted-hash-only",
        statement_sha256: challenge.statement_sha256,
        raised_at: challenge.raised_at,
      })),
      resolution_records: (event.challenges?.resolutions || []).map((resolution) => ({
        challenge_id: resolution.challenge_id,
        outcome: resolution.outcome,
        details_status: "redacted-hash-only",
        statement_sha256: resolution.statement_sha256,
        resolved_at: resolution.resolved_at,
      })),
    })),
    current_conditions: currentConditions,
  };
}

export function foldConditionEvolutionLedger(ledger) {
  const result = validateConditionEvolutionLedger(ledger);
  if (!result.ledger_valid) {
    const reason = result.history_complete
      ? "Condition evolution ledger is invalid."
      : "Condition evolution ledger is incomplete; only its disclosed suffix was checked.";
    throw new TypeError(reason);
  }
  return result.current_state;
}

function uniqueBy(values, select) {
  const seen = new Set();
  for (const value of values || []) {
    const key = select(value);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function sameExcept(left, right, ignored) {
  const a = structuredClone(left);
  const b = structuredClone(right);
  for (const key of ignored) {
    delete a[key];
    delete b[key];
  }
  return isDeepStrictEqual(a, b);
}

function exactEvidencePrefix(previous, next) {
  if ((next || []).length < (previous || []).length) return false;
  return previous.every((entry, index) => isDeepStrictEqual(entry, next[index]));
}

function isScopeSubset(next, previous) {
  let strict = false;
  for (const dimension of SCOPE_DIMENSIONS) {
    const before = new Set(previous?.[dimension] || []);
    const after = next?.[dimension] || [];
    if (!after.every((entry) => before.has(entry))) return false;
    if (after.length < before.size) strict = true;
  }
  return strict;
}

function sortedUnique(values) {
  return [...new Set(values || [])].sort(compareId);
}

function sameStringSet(left, right) {
  return isDeepStrictEqual(sortedUnique(left), sortedUnique(right));
}

function splitCoverageValid(event, source, children) {
  const identity = event.identity_change || {};
  const partition = identity.partition_dimension;
  if (!SCOPE_DIMENSIONS.includes(partition)) return false;
  for (const child of children) {
    for (const dimension of SCOPE_DIMENSIONS) {
      if (dimension !== partition && !sameStringSet(child.scope?.[dimension], source.scope?.[dimension])) {
        return false;
      }
    }
  }
  const sourceMembers = sortedUnique(source.scope?.[partition]);
  const occurrences = new Map(sourceMembers.map((member) => [member, 0]));
  for (const child of children) {
    for (const member of child.scope?.[partition] || []) {
      if (!occurrences.has(member)) return false;
      occurrences.set(member, occurrences.get(member) + 1);
    }
  }
  const uncovered = sourceMembers.filter((member) => occurrences.get(member) === 0);
  const overlap = [...occurrences.values()].some((count) => count > 1);
  if (!sameStringSet(identity.uncovered_members, uncovered)) return false;
  if (identity.coverage_mode === "exhaustive" && uncovered.length !== 0) return false;
  if (identity.coverage_mode === "intentionally-partial" && uncovered.length === 0) return false;
  if (identity.overlap_mode === "disjoint" && overlap) return false;
  if (identity.overlap_mode === "declared-overlap" && !overlap) return false;
  return true;
}

function assessmentValid(event, state) {
  const assessment = state?.assessment;
  if (!assessment) return false;
  const evidenceIds = new Set((state.evidence || []).map(({ evidence_id: id }) => id));
  return (assessment.evidence_ids || []).length > 0 &&
    assessment.evidence_ids.every((id) => evidenceIds.has(id)) &&
    instant(assessment.evaluated_at) !== null &&
    instant(assessment.evaluated_at) <= instant(event.recorded_at);
}

function conditionStateSemanticErrors(candidate, path, recordedAt) {
  const errors = [];
  const unresolvedIds = candidate?.unresolved_challenge_ids || [];
  if (!isDeepStrictEqual(
    candidate?.condition_definition_ref,
    computeConditionDefinitionRef(candidate),
  )) {
    errors.push(problem(
      "CONDITION_DEFINITION_REF_MISMATCH",
      `${path}.condition_definition_ref`,
      "Condition definition reference must bind the exact condition identity, wording and structured scope.",
    ));
  }
  if (candidate?.rendered_if !== renderConditionIf(candidate)) {
    errors.push(problem(
      "RENDERED_IF_MISMATCH",
      `${path}.rendered_if`,
      "Rendered IF wording must be regenerated exactly from wording and structured scope.",
    ));
  }
  if (!isDeepStrictEqual(candidate?.unresolved_challenge_ids, sortedUnique(unresolvedIds))) {
    errors.push(problem(
      "CHALLENGE_STATE_MISMATCH",
      `${path}.unresolved_challenge_ids`,
      "Unresolved challenge IDs must be unique and canonically sorted.",
    ));
  }
  const evaluated = ["satisfied", "failed"].includes(candidate?.status);
  if (evaluated !== Boolean(candidate?.assessment)) {
    errors.push(problem(
      "STATUS_ASSESSMENT_REQUIRED",
      `${path}.assessment`,
      "Satisfied and failed states require an assessment; all other states must not imply one.",
    ));
  }
  if ((candidate?.status === "open" && unresolvedIds.length > 0) ||
      (["challenged", "disputed"].includes(candidate?.status) && unresolvedIds.length === 0)) {
    errors.push(problem(
      "CHALLENGE_STATE_MISMATCH",
      `${path}.status`,
      "Open means no unresolved challenge; challenged and disputed require at least one unresolved challenge.",
    ));
  }
  if (candidate?.assessment) {
    const evidenceIds = (candidate.evidence || []).map(({ evidence_id: id }) => id);
    if (!uniqueBy(candidate.evidence, ({ evidence_id: id }) => id) ||
        !candidate.assessment.evidence_ids?.every((id) => evidenceIds.includes(id)) ||
        instant(candidate.assessment.evaluated_at) === null ||
        instant(candidate.assessment.evaluated_at) > instant(recordedAt)) {
      errors.push(problem(
        "STATUS_ASSESSMENT_REQUIRED",
        `${path}.assessment`,
        "An assessment must bind unambiguous evidence identities and cannot postdate its producing record.",
      ));
    }
  }
  return errors;
}

function challengeStateErrors(event, previous, next, path) {
  const errors = [];
  const challengeIds = (event.challenges?.entries || []).map(({ challenge_id: id }) => id);
  const resolutionIds = (event.challenges?.resolutions || []).map(({ challenge_id: id }) => id);
  const beforeIds = sortedUnique(previous.flatMap(({ unresolved_challenge_ids: ids }) => ids || []));
  const expected = sortedUnique([
    ...beforeIds.filter((id) => !resolutionIds.includes(id)),
    ...challengeIds,
  ]);
  if (resolutionIds.some((id) => !beforeIds.includes(id)) ||
      challengeIds.some((id) => beforeIds.includes(id))) {
    errors.push(problem(
      "CHALLENGE_DISPOSITION_INVALID",
      `${path}.challenges`,
      "A resolution must name an unresolved challenge, and a challenge ID cannot be recorded twice.",
    ));
  }
  for (const [index, state] of next.entries()) {
    const required = ["split", "merged"].includes(event.operation) &&
      previous.some(({ condition_id: id }) => id === state.condition_id)
      ? sortedUnique(previous.find(({ condition_id: id }) => id === state.condition_id)?.unresolved_challenge_ids)
      : expected;
    if (!isDeepStrictEqual(state?.unresolved_challenge_ids, required)) {
      errors.push(problem(
        "CHALLENGE_STATE_MISMATCH",
        `${path}.new_states[${index}].unresolved_challenge_ids`,
        "Every unresolved challenge must persist until an explicit resolution removes it.",
      ));
    }
  }
  return errors;
}

function stateTransitionErrors(event, state, eventIndex) {
  const path = `$.events[${eventIndex}]`;
  const errors = [];
  const previous = event.previous_states || [];
  const next = event.new_states || [];
  const previousIds = previous.map(({ condition_id: id }) => id);
  const nextIds = next.map(({ condition_id: id }) => id);
  const operation = event.operation;
  const invalidPair = (message) => errors.push(problem(
    "ILLEGAL_OPERATION_STATE_PAIR",
    path,
    message,
  ));
  const identityError = (message) => errors.push(problem(
    "SILENT_IDENTITY_CHANGE",
    `${path}.identity_change`,
    message,
  ));

  if (!uniqueBy(previous, ({ condition_id: id }) => id) ||
      !uniqueBy(next, ({ condition_id: id }) => id)) {
    invalidPair("An event cannot contain duplicate condition identities.");
  }

  if (["challenged", "disputed"].includes(operation) &&
      event.challenges?.disposition !== "recorded") {
    errors.push(problem(
      "CHALLENGE_REQUIRED",
      `${path}.challenges`,
      "A challenged or disputed event must carry at least one hash-bound challenge.",
    ));
  }
  errors.push(...challengeStateErrors(event, previous, next, path));
  for (const [stateIndex, candidate] of [...previous, ...next].entries()) {
    errors.push(...conditionStateSemanticErrors(
      candidate,
      `${path}.states[${stateIndex}]`,
      event.recorded_at,
    ));
  }

  const beforeChallengeIds = sortedUnique(previous.flatMap(({ unresolved_challenge_ids: ids }) => ids || []));
  const resolutionIds = sortedUnique(
    (event.challenges?.resolutions || []).map(({ challenge_id: id }) => id),
  );
  if (["satisfied", "failed"].includes(operation)) {
    const expectedDisposition = beforeChallengeIds.length > 0 ? "resolved" : "none";
    if (event.challenges?.disposition !== expectedDisposition ||
        !isDeepStrictEqual(resolutionIds, beforeChallengeIds) ||
        (event.challenges?.entries || []).length !== 0) {
      errors.push(problem(
        "CHALLENGE_DISPOSITION_INVALID",
        `${path}.challenges`,
        "An evaluated terminal status must explicitly resolve every outstanding challenge and record no new one.",
      ));
    }
  } else if (!["challenged", "disputed"].includes(operation) &&
      event.challenges?.disposition !== "none") {
    errors.push(problem(
      "CHALLENGE_DISPOSITION_INVALID",
      `${path}.challenges`,
      "Only challenged or disputed events record challenges; only satisfied or failed events resolve them.",
    ));
  }

  if (operation === "added") {
    if (previous.length !== 0 || next.length !== 1 || event.parent_events?.length !== 0 ||
        event.identity_change?.kind !== "none" || next[0]?.condition_version !== 1 ||
        next[0]?.status !== "open" || next[0]?.unresolved_challenge_ids?.length !== 0 ||
        next[0]?.assessment !== null || state.has(next[0]?.condition_id)) {
      invalidPair("added requires no predecessor and creates one previously unseen open version 1 condition.");
    }
    return errors;
  }

  if (operation === "split") {
    const source = previous[0];
    const retained = next.find(({ condition_id: id }) => id === source?.condition_id);
    const children = next.filter(({ condition_id: id }) => id !== source?.condition_id);
    const mapping = event.identity_change?.mappings?.[0];
    const childSemanticsInvalid = children.some((child) => !sameExcept(source || {}, child, [
      "condition_id",
      "condition_version",
      "condition_definition_ref",
      "scope",
      "rendered_if",
    ]));
    if (childSemanticsInvalid) {
      errors.push(problem(
        "SPLIT_SEMANTICS_INVALID",
        `${path}.new_states`,
        "A scope-only split must preserve wording, evidence, status, challenges and assessment exactly.",
      ));
    }
    if (previous.length !== 1 || !ACTIVE_STATES.has(source?.status) ||
        event.identity_change?.kind !== "split" || children.length < 2 ||
        retained?.condition_version !== source?.condition_version + 1 ||
        retained?.status !== "superseded" ||
        !sameExcept(source, retained || {}, ["condition_version", "status"]) ||
        !isDeepStrictEqual(mapping?.from_condition_ids, [source?.condition_id]) ||
        !isDeepStrictEqual(new Set(mapping?.to_condition_ids), new Set(children.map(({ condition_id: id }) => id))) ||
        !splitCoverageValid(event, source, children) ||
        childSemanticsInvalid ||
        children.some((child) => child.condition_version !== 1 || child.status !== source?.status ||
          state.has(child.condition_id) || !isScopeSubset(child.scope, source.scope) ||
          !isDeepStrictEqual(source.evidence, child.evidence))) {
      errors.push(problem(
        "SPLIT_COVERAGE_INVALID",
        `${path}.identity_change`,
        "A split must declare one partition dimension, exact coverage gaps and any overlap.",
      ));
      invalidPair("split must supersede one active source and explicitly create at least two scoped, evidence-preserving child identities.");
    }
    return errors;
  }

  if (operation === "merged") {
    const previousSet = new Set(previousIds);
    const retained = next.filter(({ condition_id: id }) => previousSet.has(id));
    const created = next.filter(({ condition_id: id }) => !previousSet.has(id));
    const mapping = event.identity_change?.mappings?.[0];
    const allPriorEvidence = previous.flatMap(({ evidence }) => evidence);
    const mergedStatus = previous.some(({ status }) => status === "disputed")
      ? "disputed"
      : previous.some(({ status }) => status === "challenged") ? "challenged" : "open";
    if (previous.length < 2 || previous.some(({ status }) => !ACTIVE_STATES.has(status)) ||
        event.identity_change?.kind !== "merge" || retained.length !== previous.length ||
        created.length !== 1 || created[0]?.condition_version !== 1 || created[0]?.status !== mergedStatus ||
        state.has(created[0]?.condition_id) ||
        !isDeepStrictEqual(new Set(mapping?.from_condition_ids), previousSet) ||
        !isDeepStrictEqual(mapping?.to_condition_ids, [created[0]?.condition_id]) ||
        previous.some((before) => before.wording !== created[0]?.wording ||
          !isDeepStrictEqual(before.scope, created[0]?.scope)) ||
        event.identity_change?.semantic_effect !== "identity-consolidation-only" ||
        !allPriorEvidence.every((evidence) => created[0]?.evidence?.some((candidate) =>
          isDeepStrictEqual(candidate, evidence))) ||
        previous.some((before) => {
          const after = retained.find(({ condition_id: id }) => id === before.condition_id);
          return after?.condition_version !== before.condition_version + 1 ||
            after?.status !== "superseded" ||
            !sameExcept(before, after || {}, ["condition_version", "status"]);
        })) {
      errors.push(problem(
        "MERGE_SEMANTICS_INVALID",
        `${path}.identity_change`,
        "A merge may consolidate identities only when wording and scope are identical; semantic change needs a separate supersede-and-add event.",
      ));
      invalidPair("merged must supersede at least two semantically identical active sources and explicitly create one evidence-preserving version 1 identity.");
    }
    return errors;
  }

  if (previous.length !== 1 || next.length !== 1 || event.identity_change?.kind !== "none") {
    invalidPair(`${operation} requires one predecessor, one successor and no identity mapping.`);
    return errors;
  }
  const before = previous[0];
  const after = next[0];
  if (before.condition_id !== after.condition_id) {
    identityError("Only split and merged events may change a condition identity.");
  }
  if (after.condition_version !== before.condition_version + 1 ||
      !ACTIVE_STATES.has(before.status)) {
    invalidPair("A non-identity event must advance the current active condition by exactly one version.");
  }

  if (operation === "narrowed") {
    if (after.status !== before.status || after.wording !== before.wording ||
        !isDeepStrictEqual(after.evidence, before.evidence) ||
        !isScopeSubset(after.scope, before.scope)) {
      invalidPair("narrowed preserves wording, evidence and status while making scope a strict subset.");
    }
    return errors;
  }

  const targetStatus = {
    challenged: "challenged",
    disputed: "disputed",
    satisfied: "satisfied",
    failed: "failed",
    expired: "expired",
    superseded: "superseded",
    withdrawn: "withdrawn",
  }[operation];
  if (!targetStatus || after.status !== targetStatus || after.wording !== before.wording ||
      !isDeepStrictEqual(after.scope, before.scope)) {
    invalidPair(`${operation} must preserve identity, wording and scope and enter its named state.`);
    return errors;
  }
  const canAppendEvidence = ["challenged", "disputed", "satisfied", "failed"].includes(operation);
  if (canAppendEvidence
    ? !exactEvidencePrefix(before.evidence, after.evidence)
    : !isDeepStrictEqual(before.evidence, after.evidence)) {
    invalidPair(`${operation} cannot remove or silently rewrite an evidence binding.`);
  }
  if (["satisfied", "failed"].includes(operation) && !assessmentValid(event, after)) {
    errors.push(problem(
      "STATUS_ASSESSMENT_REQUIRED",
      `${path}.new_states[0].assessment`,
      "Satisfied and failed states require an evidence-bound assessment recorded no later than the event.",
    ));
  }
  return errors;
}

function graphErrors(events) {
  const errors = [];
  const byId = new Map((events || []).map((event) => [event.event_id, event]));
  const visiting = new Set();
  const visited = new Set();
  let cycleReported = false;
  function visit(id) {
    if (visiting.has(id)) {
      if (!cycleReported) {
        errors.push(problem(
          "EVENT_GRAPH_CYCLE",
          "$.events",
          "Parent-event references form a cycle.",
        ));
        cycleReported = true;
      }
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of byId.get(id)?.parent_events || []) {
      if (byId.has(parent.event_id)) visit(parent.event_id);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return errors;
}

function cropErrors(history) {
  const errors = [];
  const base = history?.base || {};
  if (history?.mode === "complete") {
    if (base.after_sequence !== 0 || base.after_event_id !== null ||
        base.after_event_version !== null || base.tip_hash !== null ||
        base.tip_effective_at !== null || base.tip_recorded_at !== null ||
        base.state_hash !== null ||
        base.conditions?.length !== 0 || history.omitted_event_count !== 0 ||
        history.omitted_ranges?.length !== 0 || history.external_record !== null) {
      errors.push(problem(
        "COMPLETE_HISTORY_BASE_INVALID",
        "$.history",
        "Complete history must start from the empty sequence-zero base with no omission binding.",
      ));
    }
    return errors;
  }
  if (history?.mode !== "cropped") return errors;
  const ranges = history.omitted_ranges || [];
  let expected = 1;
  let total = 0;
  for (const [index, range] of ranges.entries()) {
    if (range.from_sequence !== expected || range.through_sequence < range.from_sequence) {
      errors.push(problem(
        "CROP_RANGE_INVALID",
        `$.history.omitted_ranges[${index}]`,
        "Omitted ranges must be ordered, non-overlapping and contiguous from sequence 1.",
      ));
      break;
    }
    total += range.through_sequence - range.from_sequence + 1;
    expected = range.through_sequence + 1;
  }
  if (total !== history.omitted_event_count || base.after_sequence !== total ||
      base.after_event_id === null || base.after_event_version === null ||
      !HASH.test(base.tip_hash || "") ||
      instant(base.tip_effective_at) === null || instant(base.tip_recorded_at) === null ||
      !history.external_record || (base.conditions || []).length === 0) {
    errors.push(problem(
      "CROP_DISCLOSURE_INVALID",
      "$.history",
      "A crop must disclose and externally bind every omitted sequence and the exact fold base.",
    ));
  }
  if (base.state_hash !== computeStateHash(base.conditions || [])) {
    errors.push(problem(
      "CROP_BASE_HASH_MISMATCH",
      "$.history.base.state_hash",
      "The cropped base-state hash does not match its exact canonical condition and producer records.",
    ));
  }
  if (!uniqueBy(base.conditions, ({ state }) => state?.condition_id)) {
    errors.push(problem(
      "CROP_BASE_IDENTITY_DUPLICATE",
      "$.history.base.conditions",
      "A cropped base may contain only one current version of each condition.",
    ));
  }
  const producersById = new Map();
  for (const [index, entry] of (base.conditions || []).entries()) {
    const producer = entry?.producer;
    const prior = producersById.get(producer?.event_id);
    if (prior && !isDeepStrictEqual(prior, producer)) {
      errors.push(problem(
        "CROP_PRODUCER_CONFLICT",
        `$.history.base.conditions[${index}].producer`,
        "One omitted event ID cannot have conflicting immutable producer metadata.",
      ));
    }
    if (producer?.event_id) producersById.set(producer.event_id, producer);
    if (producer?.sequence > base.after_sequence ||
        instant(producer?.effective_at) > instant(producer?.recorded_at) ||
        instant(producer?.recorded_at) > instant(base.tip_recorded_at)) {
      errors.push(problem(
        "CROP_PRODUCER_CHRONOLOGY_INVALID",
        `$.history.base.conditions[${index}].producer`,
        "A base-state producer cannot follow the disclosed crop boundary.",
      ));
    }
  }
  const tipProducer = [...producersById.values()].find((producer) =>
    producer.sequence === base.after_sequence &&
    producer.event_id === base.after_event_id &&
    producer.event_version === base.after_event_version &&
    producer.event_hash === base.tip_hash &&
    producer.effective_at === base.tip_effective_at &&
    producer.recorded_at === base.tip_recorded_at);
  if (!tipProducer) {
    errors.push(problem(
      "CROP_TIP_NOT_IN_BASE",
      "$.history.base",
      "At least one retained base condition must bind the last omitted event and both boundary clocks.",
    ));
  }
  return errors;
}

export function validateConditionEvolutionLedger(ledger, options = {}) {
  if (ledger?.schema_version === "2.0.0") {
    return validateExecutableIfEvolution(ledger, options);
  }
  const errors = [];
  const schemaValid = validateSchema(ledger);
  if (!schemaValid) {
    errors.push(...(validateSchema.errors || []).map((error) => ({
      code: "SCHEMA_INVALID",
      path: error.instancePath || "$",
      message: error.message,
      keyword: error.keyword,
    })));
  }

  errors.push(...cropErrors(ledger?.history));
  for (const [index, entry] of (ledger?.history?.base?.conditions || []).entries()) {
    errors.push(...conditionStateSemanticErrors(
      entry?.state,
      `$.history.base.conditions[${index}].state`,
      entry?.producer?.recorded_at,
    ));
  }
  errors.push(...graphErrors(ledger?.events));

  const events = ledger?.events || [];
  if (ledger?.history?.mode === "complete" &&
      (events[0]?.sequence !== 1 || events[0]?.previous_event_hash !== null ||
       events[0]?.chain_predecessor !== null)) {
    errors.push(problem(
      "COMPLETE_HISTORY_BASE_INVALID",
      "$.events[0]",
      "A complete export must begin with sequence 1 and a null prior ledger tip.",
    ));
  }
  const byId = new Map();
  for (const [index, event] of events.entries()) {
    if (byId.has(event?.event_id)) {
      errors.push(problem(
        "DUPLICATE_EVENT_ID",
        `$.events[${index}].event_id`,
        "Event identifiers are immutable and unique within a ledger.",
      ));
    }
    if (event?.event_id) byId.set(event.event_id, { event, index });
  }
  const baseProducers = new Map();
  for (const entry of ledger?.history?.base?.conditions || []) {
    if (entry?.producer?.event_id) baseProducers.set(entry.producer.event_id, entry.producer);
  }
  for (const [index, event] of events.entries()) {
    if (baseProducers.has(event?.event_id)) {
      errors.push(problem(
        "EVENT_ID_REUSED_FROM_BASE",
        `$.events[${index}].event_id`,
        "An included event cannot reuse an identifier already present in the cropped base.",
      ));
    }
  }

  const state = initialFold(ledger);
  let previousHash = ledger?.history?.base?.tip_hash ?? null;
  let previousEvent = ledger?.history?.base?.after_event_id === null
    ? null
    : {
        event_id: ledger.history.base.after_event_id,
        event_version: ledger.history.base.after_event_version,
        event_hash: ledger.history.base.tip_hash,
      };
  let previousSequence = ledger?.history?.base?.after_sequence ?? 0;
  let previousRecorded = instant(ledger?.history?.base?.tip_recorded_at);
  const challengeRegistry = new Map();
  const resolvedChallenges = new Set();
  for (const entry of ledger?.history?.base?.conditions || []) {
    for (const challengeId of entry?.state?.unresolved_challenge_ids || []) {
      challengeRegistry.set(challengeId, { omitted: true });
    }
  }

  for (const [index, event] of events.entries()) {
    const path = `$.events[${index}]`;
    const effective = instant(event?.effective_at);
    const recorded = instant(event?.recorded_at);
    if (event?.sequence !== previousSequence + 1 || effective === null || recorded === null ||
        effective > recorded || (previousRecorded !== null && recorded <= previousRecorded)) {
      errors.push(problem(
        "CHRONOLOGY_INVALID",
        path,
        "Sequence and recorded time must advance strictly; effective time cannot follow recording.",
      ));
    }
    const retroactive = effective !== null && previousRecorded !== null && effective < previousRecorded;
    const disclosure = event?.retroactivity;
    if (retroactive) {
      const from = instant(disclosure?.affected_window?.from);
      const through = instant(disclosure?.affected_window?.through);
      if (disclosure?.status !== "retrospective-correction" || from === null || through === null ||
          from > effective || through < previousRecorded || through > recorded ||
          !disclosure?.reason || !disclosure?.public_notice) {
        errors.push(problem(
          "RETROACTIVITY_DISCLOSURE_REQUIRED",
          `${path}.retroactivity`,
          "A retroactive event must disclose its reason, affected historical window, public notice and affected publication and decision references.",
        ));
      }
    } else if (disclosure?.status !== "not-retroactive") {
      errors.push(problem(
        "RETROACTIVITY_DISCLOSURE_INVALID",
        `${path}.retroactivity`,
        "An event that does not predate the previous public record cannot claim a retrospective correction.",
      ));
    }
    if (event?.previous_event_hash !== previousHash) {
      errors.push(problem(
        "EVENT_CHAIN_MISMATCH",
        `${path}.previous_event_hash`,
        "The event does not bind the immediately preceding ledger tip.",
      ));
    }
    if (!isDeepStrictEqual(event?.chain_predecessor, previousEvent)) {
      errors.push(problem(
        "EVENT_CHAIN_PREDECESSOR_MISMATCH",
        `${path}.chain_predecessor`,
        "The event must bind the preceding ledger event ID, version and hash.",
      ));
    }
    if (event && event.event_hash !== computeEventHash(event)) {
      errors.push(problem(
        "EVENT_HASH_MISMATCH",
        `${path}.event_hash`,
        "The event hash does not match its exact canonical content.",
      ));
    }

    const expectedParents = [];
    for (const [stateIndex, previousState] of (event?.previous_states || []).entries()) {
      const current = state.get(previousState?.condition_id);
      if (!current) {
        errors.push(problem(
          "MISSING_CONDITION_PREDECESSOR",
          `${path}.previous_states[${stateIndex}]`,
          "The prior condition state is absent from the current fold.",
        ));
        continue;
      }
      expectedParents.push(parentFromProducer(current.producer));
      if (effective !== null && effective < instant(current.producer.effective_at)) {
        errors.push(problem(
          "LINEAGE_CHRONOLOGY_INVALID",
          `${path}.effective_at`,
          "A condition transition cannot take effect before the state version it consumes.",
        ));
      }
      if (!isDeepStrictEqual(current.state, previousState)) {
        errors.push(problem(
          "PREVIOUS_STATE_MISMATCH",
          `${path}.previous_states[${stateIndex}]`,
          "Previous wording, scope, evidence, status and version must exactly match the current fold.",
        ));
        if ((previousState?.condition_version || 0) < (current.state?.condition_version || 0)) {
          errors.push(problem(
            "PREDECESSOR_NOT_CURRENT",
            `${path}.previous_states[${stateIndex}].condition_version`,
            "The event consumes a stale condition version.",
          ));
          if (!["split", "merged"].includes(event.operation)) {
            errors.push(problem(
              "UNDECLARED_FORK",
              path,
              "Only an explicit split or merged event may branch condition lineage.",
            ));
          }
        }
      }
    }
    const uniqueExpectedParents = expectedParents.filter((parent, parentIndex, parents) =>
      parents.findIndex((candidate) => isDeepStrictEqual(candidate, parent)) === parentIndex);
    if (!isDeepStrictEqual(
      new Set((event?.parent_events || []).map((parent) => canonicalJson(parent))),
      new Set(uniqueExpectedParents.map((parent) => canonicalJson(parent))),
    )) {
      errors.push(problem(
        "PARENT_BINDING_MISMATCH",
        `${path}.parent_events`,
        "Parent-event references must exactly name the events that produced every previous state.",
      ));
    }

    for (const [parentIndex, parent] of (event?.parent_events || []).entries()) {
      const included = byId.get(parent.event_id);
      const base = baseProducers.get(parent.event_id);
      const resolved = included?.event || base;
      if (!resolved) {
        errors.push(problem(
          "MISSING_PREDECESSOR",
          `${path}.parent_events[${parentIndex}]`,
          "The named parent event is neither included nor represented in the disclosed crop base.",
        ));
        continue;
      }
      if (included && included.index >= index) {
        errors.push(problem(
          "PREDECESSOR_NOT_PRIOR",
          `${path}.parent_events[${parentIndex}]`,
          "A parent event must precede its child in the append-only sequence.",
        ));
      }
      if (parent.event_version !== resolved.event_version) {
        errors.push(problem(
          "PARENT_VERSION_MISMATCH",
          `${path}.parent_events[${parentIndex}].event_version`,
          "The parent event version does not match immutable history.",
        ));
      }
      if (parent.event_hash !== resolved.event_hash) {
        errors.push(problem(
          "PARENT_HASH_MISMATCH",
          `${path}.parent_events[${parentIndex}].event_hash`,
          "The parent event hash does not match immutable history.",
        ));
      }
    }

    for (const [challengeIndex, challenge] of (event?.challenges?.entries || []).entries()) {
      if (challenge.statement_sha256 !== computeChallengeHash(challenge.statement || "")) {
        errors.push(problem(
          "CHALLENGE_HASH_MISMATCH",
          `${path}.challenges.entries[${challengeIndex}].statement_sha256`,
          "A challenge must bind the exact UTF-8 statement bytes.",
        ));
      }
      const raised = instant(challenge.raised_at);
      if (raised === null || (recorded !== null && raised > recorded)) {
        errors.push(problem(
          "CHALLENGE_CHRONOLOGY_INVALID",
          `${path}.challenges.entries[${challengeIndex}].raised_at`,
          "A challenge cannot be raised after the event that records it.",
        ));
      }
      if (challengeRegistry.has(challenge.challenge_id)) {
        errors.push(problem(
          "CHALLENGE_ID_REUSED",
          `${path}.challenges.entries[${challengeIndex}].challenge_id`,
          "Challenge identifiers are immutable and unique across the included ledger.",
        ));
      } else {
        challengeRegistry.set(challenge.challenge_id, challenge);
      }
    }
    for (const [resolutionIndex, resolution] of (event?.challenges?.resolutions || []).entries()) {
      if (resolution.statement_sha256 !== computeChallengeHash(resolution.statement || "")) {
        errors.push(problem(
          "CHALLENGE_RESOLUTION_HASH_MISMATCH",
          `${path}.challenges.resolutions[${resolutionIndex}].statement_sha256`,
          "A challenge resolution must bind the exact domain-separated UTF-8 statement bytes.",
        ));
      }
      const challenge = challengeRegistry.get(resolution.challenge_id);
      const resolved = instant(resolution.resolved_at);
      if (!challenge || resolvedChallenges.has(resolution.challenge_id)) {
        errors.push(problem(
          "CHALLENGE_RESOLUTION_INVALID",
          `${path}.challenges.resolutions[${resolutionIndex}].challenge_id`,
          "A resolution must name one included, unresolved challenge exactly once.",
        ));
      }
      if (resolved === null || (recorded !== null && resolved > recorded) ||
          (challenge && !challenge.omitted && resolved < instant(challenge.raised_at))) {
        errors.push(problem(
          "CHALLENGE_RESOLUTION_CHRONOLOGY_INVALID",
          `${path}.challenges.resolutions[${resolutionIndex}].resolved_at`,
          "A resolution must follow its challenge and cannot follow the event that records it.",
        ));
      }
      if (challenge) resolvedChallenges.add(resolution.challenge_id);
    }

    errors.push(...stateTransitionErrors(event || {}, state, index));
    const producer = producerFromEvent(event || {});
    for (const next of event?.new_states || []) {
      if (next?.condition_id) state.set(next.condition_id, { state: structuredClone(next), producer });
    }
    previousHash = event?.event_hash;
    previousEvent = {
      event_id: event?.event_id,
      event_version: event?.event_version,
      event_hash: event?.event_hash,
    };
    previousSequence = event?.sequence;
    previousRecorded = recorded;
  }

  const computedState = {
    as_of_sequence: events.at(-1)?.sequence,
    as_of_event_id: events.at(-1)?.event_id,
    as_of_event_hash: events.at(-1)?.event_hash,
    conditions: sortedStates(state),
  };
  if (!isDeepStrictEqual(computedState, ledger?.current_state)) {
    errors.push(problem(
      "CURRENT_STATE_MISMATCH",
      "$.current_state",
      "Declared current state does not equal the deterministic fold of the disclosed base and events.",
    ));
  }

  const anchor = ledger?.publication_anchor;
  if (anchor?.event_count !== computedState.as_of_sequence ||
      anchor?.tip_event_id !== computedState.as_of_event_id ||
      anchor?.tip_event_version !== events.at(-1)?.event_version ||
      anchor?.tip_hash !== computedState.as_of_event_hash) {
    errors.push(problem(
      "PUBLICATION_ANCHOR_MISMATCH",
      "$.publication_anchor",
      "The local publication-anchor declaration does not match the current ledger tip.",
    ));
  }
  const generated = instant(ledger?.generated_at);
  if (generated === null || (previousRecorded !== null && generated < previousRecorded)) {
    errors.push(problem(
      "GENERATION_CHRONOLOGY_INVALID",
      "$.generated_at",
      "Ledger generation cannot precede the latest recorded event.",
    ));
  }

  const publicProjection = computePublicProjection(ledger);
  if (!isDeepStrictEqual(publicProjection, ledger?.public_projection)) {
    errors.push(problem(
      "PUBLIC_PROJECTION_MISMATCH",
      "$.public_projection",
      "The public projection must be regenerated exactly from the disclosed base and event sequence.",
    ));
  }
  if (ledger?.manifest_hash !== computeManifestHash(ledger)) {
    errors.push(problem(
      "MANIFEST_HASH_MISMATCH",
      "$.manifest_hash",
      "The manifest hash must bind the ledger identity, schema profile, history disclosure, events, current state, public projection and publication anchor.",
    ));
  }

  const integrityValid = errors.length === 0;
  const suffixValid = schemaValid && integrityValid;
  const historyComplete = ledger?.history?.mode === "complete";
  const ledgerValid = suffixValid && historyComplete;
  return {
    machine_valid: ledgerValid,
    ledger_valid: ledgerValid,
    disclosed_suffix_structurally_valid: suffixValid,
    schema_valid: schemaValid,
    integrity_valid: integrityValid,
    history_complete: historyComplete,
    omitted_history_verified: false,
    external_anchor_verified: false,
    condition_truth_assessed: false,
    authority_granted: false,
    action_authorised: false,
    current_state: computedState,
    errors,
  };
}

export function assertConditionEvolutionLedger(ledger) {
  const result = validateConditionEvolutionLedger(ledger);
  if (!result.ledger_valid) {
    const messages = result.errors.map(({ code, path, message }) =>
      `${code} at ${path}: ${message}`);
    if (!result.history_complete) {
      messages.push("INCOMPLETE_HISTORY at $.history: only the disclosed suffix was checked.");
    }
    const detail = messages.join("\n");
    throw new TypeError(`Condition evolution ledger is invalid:\n${detail}`);
  }
  return result;
}
