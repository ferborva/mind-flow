import {
  computeChallengeHash,
  computeConditionDefinitionRef,
  computeEventHash,
  computeManifestHash,
  computePublicProjection,
  computeStateHash,
  renderConditionIf,
} from "../validate.mjs";
import { writeFileSync } from "node:fs";

const copy = (value) => structuredClone(value);
const hash = (character) => `sha256:${character.repeat(64)}`;
const evidence = (id, character, role = "supports") => ({
  evidence_id: id,
  version: "1.0.0",
  checksum: hash(character),
  role,
});
const source = {
  source_id: "capture.round-03",
  source_uri: "capture://round-03/condition-evolution",
  checksum: hash("a"),
};
const actor = {
  actor_id: "actor.fixture-author",
  display_name: "Fixture author",
  capacity: "author",
};
const provenance = {
  classification: "commissioned-proposal",
  source_refs: [source],
};
const noChallenges = { disposition: "none", entries: [], resolutions: [] };
const noRetroactivity = {
  status: "not-retroactive",
  reason: null,
  affected_window: null,
  superseded_publication_refs: [],
  affected_decision_refs: [],
  public_notice: null,
};
const scope = (geographies = ["Australia"]) => ({
  jurisdictions: ["Australia"],
  geographies,
  cohorts: ["working-age people"],
  services: ["income transition support"],
});
const state = (id, version, status = "open", options = {}) => {
  const value = {
    condition_id: id,
    condition_version: version,
    wording: options.wording || `${id} is evidenced under its declared scope`,
    scope: copy(options.scope || scope()),
    evidence: copy(options.evidence || []),
    status,
    unresolved_challenge_ids: copy(options.unresolved_challenge_ids || []),
    assessment: copy(options.assessment || null),
  };
  value.condition_definition_ref = computeConditionDefinitionRef(value);
  value.rendered_if = renderConditionIf(value);
  return value;
};
const assessment = (id, character, evaluatedAt, evidenceIds) => ({
  assessment_id: id,
  version: "1.0.0",
  checksum: hash(character),
  evaluator_id: "actor.fixture-evaluator",
  method_id: "method.fixture-threshold",
  threshold_id: "threshold.fixture-v1",
  evaluated_at: evaluatedAt,
  evidence_ids: evidenceIds,
});
const resolution = (challengeId, statement, resolvedAt) => ({
  challenge_id: challengeId,
  outcome: "rejected",
  statement,
  statement_sha256: computeChallengeHash(statement),
  resolved_by: "actor.fixture-evaluator",
  resolved_at: resolvedAt,
  evidence_refs: [{
    evidence_id: "evidence.alpha",
    version: "1.0.0",
    checksum: hash("b"),
  }],
});
const parent = (event) => ({
  event_id: event.event_id,
  event_version: event.event_version,
  event_hash: event.event_hash,
});
const producer = (event) => ({
  ...parent(event),
  sequence: event.sequence,
  effective_at: event.effective_at,
  recorded_at: event.recorded_at,
});
const compareId = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function buildComplete() {
  const events = [];
  const current = new Map();
  const producingEvent = new Map();
  const append = ({ operation, previous = [], next, identity = { kind: "none", mappings: [] }, challenges = noChallenges }) => {
    const sequence = events.length + 1;
    const minute = String(sequence).padStart(2, "0");
    const parents = [...new Set(previous.map(({ condition_id: id }) => producingEvent.get(id)))]
      .map(parent);
    const event = {
      sequence,
      event_id: `event.${String(sequence).padStart(2, "0")}.${operation}`,
      event_version: "1.0.0",
      operation,
      parent_events: parents,
      previous_states: copy(previous),
      new_states: copy(next),
      identity_change: copy(identity),
      actor: copy(actor),
      provenance: copy(provenance),
      reason: `Exercise the ${operation} transition without claiming condition truth or action authority.`,
      effective_at: `2026-09-08T00:${minute}:00Z`,
      recorded_at: `2026-09-08T00:${minute}:00Z`,
      retroactivity: copy(noRetroactivity),
      challenges: copy(challenges),
      chain_predecessor: events.length === 0 ? null : parent(events.at(-1)),
      previous_event_hash: events.at(-1)?.event_hash || null,
      event_hash: "",
    };
    event.event_hash = computeEventHash(event);
    events.push(event);
    for (const nextState of next) {
      current.set(nextState.condition_id, copy(nextState));
      producingEvent.set(nextState.condition_id, event);
    }
    return event;
  };
  const add = (id, options) => {
    const next = state(id, 1, "open", options);
    return append({ operation: "added", next: [next] });
  };
  const latest = (id) => copy(current.get(id));
  const change = (id, operation, status, options = {}) => {
    const before = latest(id);
    const after = copy(before);
    after.condition_version += 1;
    after.status = status;
    if (options.scope) after.scope = copy(options.scope);
    if (options.evidence) after.evidence = copy(options.evidence);
    const newChallengeIds = (options.challenges?.entries || []).map(({ challenge_id: id }) => id);
    const resolvedIds = (options.challenges?.resolutions || []).map(({ challenge_id: id }) => id);
    after.unresolved_challenge_ids = [...new Set([
      ...before.unresolved_challenge_ids.filter((id) => !resolvedIds.includes(id)),
      ...newChallengeIds,
    ])].sort(compareId);
    if (Object.hasOwn(options, "assessment")) after.assessment = copy(options.assessment);
    after.condition_definition_ref = computeConditionDefinitionRef(after);
    after.rendered_if = renderConditionIf(after);
    return append({
      operation,
      previous: [before],
      next: [after],
      challenges: options.challenges || noChallenges,
    });
  };

  add("condition.alpha", { scope: scope(["New South Wales", "Victoria"]) });
  const challengeOne = "The indicator may reflect sector composition rather than technological displacement.";
  change("condition.alpha", "challenged", "challenged", {
    evidence: [evidence("evidence.alpha", "b")],
    challenges: {
      disposition: "recorded",
      entries: [{
        challenge_id: "challenge.alpha.composition",
        statement: challengeOne,
        statement_sha256: computeChallengeHash(challengeOne),
        raised_by: "actor.affected-worker",
        raised_at: "2026-09-08T00:01:30Z",
        evidence_refs: [{
          evidence_id: "evidence.alpha",
          version: "1.0.0",
          checksum: hash("b"),
        }],
      }],
      resolutions: [],
    },
  });
  const challengeTwo = "Affected parties dispute whether the selected geography represents their experience.";
  change("condition.alpha", "disputed", "disputed", {
    evidence: [evidence("evidence.alpha", "b")],
    challenges: {
      disposition: "recorded",
      entries: [{
        challenge_id: "challenge.alpha.scope",
        statement: challengeTwo,
        statement_sha256: computeChallengeHash(challengeTwo),
        raised_by: "actor.affected-worker",
        raised_at: "2026-09-08T00:02:30Z",
        evidence_refs: [{
          evidence_id: "evidence.alpha",
          version: "1.0.0",
          checksum: hash("b"),
        }],
      }],
      resolutions: [],
    },
  });
  change("condition.alpha", "narrowed", "disputed", {
    scope: scope(["New South Wales"]),
  });
  change("condition.alpha", "satisfied", "satisfied", {
    evidence: [evidence("evidence.alpha", "b")],
    assessment: assessment(
      "assessment.alpha.satisfaction",
      "f",
      "2026-09-08T00:04:50Z",
      ["evidence.alpha"],
    ),
    challenges: {
      disposition: "resolved",
      entries: [],
      resolutions: [
        resolution(
          "challenge.alpha.composition",
          "The bounded assessment rejects composition as an adequate explanation for this fixture result.",
          "2026-09-08T00:04:40Z",
        ),
        resolution(
          "challenge.alpha.scope",
          "The assessment is restricted to New South Wales; the wider geography is not claimed.",
          "2026-09-08T00:04:45Z",
        ),
      ],
    },
  });

  add("condition.beta");
  change("condition.beta", "failed", "failed", {
    evidence: [evidence("evidence.beta", "9", "contradicts")],
    assessment: assessment(
      "assessment.beta.failure",
      "8",
      "2026-09-08T00:06:50Z",
      ["evidence.beta"],
    ),
  });
  add("condition.gamma");
  change("condition.gamma", "expired", "expired");
  add("condition.delta");
  change("condition.delta", "withdrawn", "withdrawn");
  add("condition.epsilon");
  change("condition.epsilon", "superseded", "superseded");

  add("condition.source", { scope: scope(["New South Wales", "Victoria"]) });
  {
    const before = latest("condition.source");
    const retained = copy(before);
    retained.condition_version += 1;
    retained.status = "superseded";
    const first = state("condition.source.nsw", 1, "open", {
      wording: before.wording,
      scope: scope(["New South Wales"]),
    });
    const second = state("condition.source.vic", 1, "open", {
      wording: before.wording,
      scope: scope(["Victoria"]),
    });
    append({
      operation: "split",
      previous: [before],
      next: [retained, first, second],
      identity: {
        kind: "split",
        semantic_effect: "scope-partition-only",
        partition_dimension: "geographies",
        coverage_mode: "exhaustive",
        overlap_mode: "disjoint",
        uncovered_members: [],
        mappings: [{
          from_condition_ids: [before.condition_id],
          to_condition_ids: [first.condition_id, second.condition_id],
        }],
      },
    });
  }

  const mergeWording = "the bounded shared merge condition holds";
  add("condition.merge-a", {
    wording: mergeWording,
    evidence: [evidence("evidence.merge-a", "c")],
  });
  add("condition.merge-b", {
    wording: mergeWording,
    evidence: [evidence("evidence.merge-b", "d")],
  });
  {
    const first = latest("condition.merge-a");
    const second = latest("condition.merge-b");
    const firstRetained = copy(first);
    firstRetained.condition_version += 1;
    firstRetained.status = "superseded";
    const secondRetained = copy(second);
    secondRetained.condition_version += 1;
    secondRetained.status = "superseded";
    const merged = state("condition.merge-c", 1, "open", {
      wording: mergeWording,
      evidence: [...first.evidence, ...second.evidence],
    });
    append({
      operation: "merged",
      previous: [first, second],
      next: [firstRetained, secondRetained, merged],
      identity: {
        kind: "merge",
        semantic_effect: "identity-consolidation-only",
        mappings: [{
          from_condition_ids: [first.condition_id, second.condition_id],
          to_condition_ids: [merged.condition_id],
        }],
      },
    });
  }

  const last = events.at(-1);
  const currentStates = [...current.values()]
    .sort((left, right) => compareId(left.condition_id, right.condition_id));
  const ledger = {
    schema_version: "1.1.0",
    canonicalisation: {
      profile: "mind-flow-canonical-json-v1",
      hash_algorithm: "sha-256",
      domain_separation: true,
      safe_integer_max: Number.MAX_SAFE_INTEGER,
    },
    ledger_id: "ledger.round-03.all-operations",
    generated_at: "2026-09-08T01:00:00Z",
    history: {
      mode: "complete",
      omitted_event_count: 0,
      omitted_ranges: [],
      omission_reason: null,
      external_record: null,
      base: {
        after_sequence: 0,
        after_event_id: null,
        after_event_version: null,
        tip_hash: null,
        tip_effective_at: null,
        tip_recorded_at: null,
        state_hash: null,
        conditions: [],
      },
    },
    events,
    current_state: {
      as_of_sequence: last.sequence,
      as_of_event_id: last.event_id,
      as_of_event_hash: last.event_hash,
      conditions: currentStates,
    },
    publication_anchor: {
      verification_status: "not-verified-by-local-validator",
      checkpoint_uri: "https://example.invalid/checkpoints/round-03-all-operations.json",
      event_count: last.sequence,
      tip_event_id: last.event_id,
      tip_event_version: last.event_version,
      tip_hash: last.event_hash,
    },
    public_projection: null,
    manifest_hash: "",
    contract_boundary: {
      history_validity_effect: "structural-and-integrity-only",
      condition_truth_effect: "none",
      authority_effect: "none",
      action_authorisation_effect: "none",
    },
  };
  ledger.public_projection = computePublicProjection(ledger);
  ledger.manifest_hash = computeManifestHash(ledger);
  return ledger;
}

function buildCrop(complete) {
  const events = copy(complete.events.slice(2, 5));
  const baseEvent = complete.events[1];
  const baseState = copy(baseEvent.new_states[0]);
  const last = events.at(-1);
  const baseConditions = [{ state: baseState, producer: producer(baseEvent) }];
  const ledger = {
    schema_version: "1.1.0",
    canonicalisation: copy(complete.canonicalisation),
    ledger_id: "ledger.round-03.disclosed-crop",
    generated_at: "2026-09-08T01:00:00Z",
    history: {
      mode: "cropped",
      omitted_event_count: 2,
      omitted_ranges: [{ from_sequence: 1, through_sequence: 2 }],
      omission_reason: "Selection contains only the evolution of condition.alpha after its first challenge.",
      external_record: {
        record_uri: "https://example.invalid/ledgers/round-03-complete.json",
        checksum: hash("e"),
      },
      base: {
        after_sequence: baseEvent.sequence,
        after_event_id: baseEvent.event_id,
        after_event_version: baseEvent.event_version,
        tip_hash: baseEvent.event_hash,
        tip_effective_at: baseEvent.effective_at,
        tip_recorded_at: baseEvent.recorded_at,
        state_hash: computeStateHash(baseConditions),
        conditions: baseConditions,
      },
    },
    events,
    current_state: {
      as_of_sequence: last.sequence,
      as_of_event_id: last.event_id,
      as_of_event_hash: last.event_hash,
      conditions: [copy(last.new_states[0])],
    },
    publication_anchor: {
      verification_status: "not-verified-by-local-validator",
      checkpoint_uri: "https://example.invalid/checkpoints/round-03-crop.json",
      event_count: last.sequence,
      tip_event_id: last.event_id,
      tip_event_version: last.event_version,
      tip_hash: last.event_hash,
    },
    public_projection: null,
    manifest_hash: "",
    contract_boundary: copy(complete.contract_boundary),
  };
  ledger.public_projection = computePublicProjection(ledger);
  ledger.manifest_hash = computeManifestHash(ledger);
  return ledger;
}

const complete = buildComplete();
const cropped = buildCrop(complete);
if (process.argv[2] === "write") {
  writeFileSync(new URL("./valid/all-operations.json", import.meta.url), `${JSON.stringify(complete, null, 2)}\n`);
  writeFileSync(new URL("./valid/cropped-history.json", import.meta.url), `${JSON.stringify(cropped, null, 2)}\n`);
} else {
  const selected = process.argv[2] === "crop" ? cropped : complete;
  process.stdout.write(`${JSON.stringify(selected, null, 2)}\n`);
}
