import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeChallengeHash,
  computeEventHash,
  computeManifestHash,
  computePublicProjection,
  computeStateHash,
  foldConditionEvolutionLedger,
  renderConditionIf,
  validateConditionEvolutionLedger,
} from "../validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const fixture = (name) => JSON.parse(readFileSync(
  resolve(root, "fixtures", name),
  "utf8",
));
const clone = (value) => structuredClone(value);
const canonicalisationVectors = JSON.parse(readFileSync(
  resolve(root, "canonicalisation-vectors.json"),
  "utf8",
));

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

function resealFrom(ledger, startIndex = 0) {
  let previous = startIndex === 0
    ? (ledger.history.base.after_event_id === null ? null : {
        event_id: ledger.history.base.after_event_id,
        event_version: ledger.history.base.after_event_version,
        event_hash: ledger.history.base.tip_hash,
      })
    : {
        event_id: ledger.events[startIndex - 1].event_id,
        event_version: ledger.events[startIndex - 1].event_version,
        event_hash: ledger.events[startIndex - 1].event_hash,
      };
  for (let index = startIndex; index < ledger.events.length; index += 1) {
    ledger.events[index].chain_predecessor = previous;
    ledger.events[index].previous_event_hash = previous?.event_hash || null;
    ledger.events[index].event_hash = computeEventHash(ledger.events[index]);
    previous = {
      event_id: ledger.events[index].event_id,
      event_version: ledger.events[index].event_version,
      event_hash: ledger.events[index].event_hash,
    };
  }
  ledger.current_state.as_of_event_hash = previous.event_hash;
  ledger.publication_anchor.tip_hash = previous.event_hash;
}

function appendAndSeal(ledger, event) {
  const previous = ledger.events.at(-1);
  event.sequence = previous.sequence + 1;
  event.chain_predecessor = {
    event_id: previous.event_id,
    event_version: previous.event_version,
    event_hash: previous.event_hash,
  };
  event.previous_event_hash = previous.event_hash;
  event.event_hash = computeEventHash(event);
  ledger.events.push(event);
  ledger.current_state.as_of_event_id = event.event_id;
  ledger.current_state.as_of_event_hash = event.event_hash;
  ledger.current_state.as_of_sequence = event.sequence;
  ledger.publication_anchor.event_count = event.sequence;
  ledger.publication_anchor.tip_event_id = event.event_id;
  ledger.publication_anchor.tip_event_version = event.event_version;
  ledger.publication_anchor.tip_hash = event.event_hash;
}

function refreshDerived(ledger) {
  const computed = validateConditionEvolutionLedger(ledger).current_state;
  ledger.current_state = computed;
  const tip = ledger.events.at(-1);
  Object.assign(ledger.publication_anchor, {
    event_count: tip.sequence,
    tip_event_id: tip.event_id,
    tip_event_version: tip.event_version,
    tip_hash: tip.event_hash,
  });
  ledger.public_projection = computePublicProjection(ledger);
  ledger.manifest_hash = computeManifestHash(ledger);
}

test("hostile: unknown fields cannot smuggle truth or authority through a valid history", () => {
  const ledger = fixture("valid/all-operations.json");
  ledger.history_valid_so_condition_true = true;
  ledger.events[0].action_authorised = true;

  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.schema_valid, false);
  assert.equal(result.condition_truth_assessed, false);
  assert.equal(result.authority_granted, false);
  assert.equal(result.action_authorised, false);
});

test("hostile: every nested object boundary is closed", () => {
  const targets = [
    (ledger) => ledger,
    (ledger) => ledger.history,
    (ledger) => ledger.history.base,
    (ledger) => ledger.canonicalisation,
    (ledger) => ledger.current_state,
    (ledger) => ledger.publication_anchor,
    (ledger) => ledger.public_projection,
    (ledger) => ledger.public_projection.history,
    (ledger) => ledger.public_projection.boundaries,
    (ledger) => ledger.public_projection.changes[0],
    (ledger) => ledger.public_projection.changes[0].retroactivity,
    (ledger) => ledger.public_projection.changes.find(({ operation }) =>
      operation === "satisfied").resolution_records[0],
    (ledger) => ledger.public_projection.current_conditions[0],
    (ledger) => ledger.public_projection.current_conditions[0].last_change,
    (ledger) => ledger.contract_boundary,
    (ledger) => ledger.events[1],
    (ledger) => ledger.events[1].parent_events[0],
    (ledger) => ledger.events[1].previous_states[0],
    (ledger) => ledger.events[1].new_states[0].scope,
    (ledger) => ledger.events[1].new_states[0].evidence[0],
    (ledger) => ledger.events[4].new_states[0].assessment,
    (ledger) => ledger.events[1].identity_change,
    (ledger) => ledger.events[1].actor,
    (ledger) => ledger.events[1].provenance,
    (ledger) => ledger.events[1].provenance.source_refs[0],
    (ledger) => ledger.events[1].challenges,
    (ledger) => ledger.events[1].challenges.entries[0],
    (ledger) => ledger.events[1].challenges.entries[0].evidence_refs[0],
    (ledger) => ledger.events[4].challenges.resolutions[0],
    (ledger) => ledger.events[4].challenges.resolutions[0].evidence_refs[0],
    (ledger) => ledger.events[1].retroactivity,
  ];
  for (const [index, select] of targets.entries()) {
    const ledger = fixture("valid/all-operations.json");
    select(ledger).smuggled_claim = true;
    const result = validateConditionEvolutionLedger(ledger);
    assert.equal(result.schema_valid, false, `boundary ${index}`);
  }
});

test("hostile: every event must carry authorship, provenance, reason, clocks and challenge disposition", () => {
  for (const field of [
    "actor",
    "provenance",
    "reason",
    "effective_at",
    "recorded_at",
    "retroactivity",
    "challenges",
    "chain_predecessor",
    "parent_events",
    "previous_states",
    "new_states",
  ]) {
    const ledger = fixture("valid/all-operations.json");
    delete ledger.events[1][field];
    const result = validateConditionEvolutionLedger(ledger);
    assert.equal(result.schema_valid, false, field);
  }
});

test("hostile: changing historical wording without its original event hash is mutation", () => {
  const ledger = fixture("valid/all-operations.json");
  ledger.events[0].new_states[0].wording = "Altered after publication";

  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.integrity_valid, false);
  assert.ok(hasCode(result, "EVENT_HASH_MISMATCH"));
});

test("hostile: event chain, parent and challenge hashes each fail independently", () => {
  const attacks = [
    [(event) => { event.chain_predecessor.event_version = "9.9.9"; }, "EVENT_CHAIN_PREDECESSOR_MISMATCH"],
    [(event) => { event.parent_events[0].event_hash = `sha256:${"0".repeat(64)}`; }, "PARENT_HASH_MISMATCH"],
    [(event) => { event.challenges.entries[0].statement += " altered"; }, "CHALLENGE_HASH_MISMATCH"],
  ];
  for (const [mutate, expected] of attacks) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events[1];
    mutate(event);
    event.event_hash = computeEventHash(event);
    resealFrom(ledger, 2);
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(hasCode(result, expected), expected);
  }
});

test("hostile: exact previous wording, scope and evidence must match the folded state", () => {
  for (const field of ["wording", "scope", "evidence"]) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events.find(({ operation }) => operation === "narrowed");
    if (field === "wording") event.previous_states[0].wording += " changed";
    if (field === "scope") event.previous_states[0].scope.cohorts = ["different cohort"];
    if (field === "evidence") event.previous_states[0].evidence = [];
    resealFrom(ledger, ledger.events.indexOf(event));

    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(hasCode(result, "PREVIOUS_STATE_MISMATCH"), field);
  }
});

test("hostile: a stale predecessor is an undeclared fork", () => {
  const ledger = fixture("valid/all-operations.json");
  const narrowed = clone(ledger.events.find(({ operation }) => operation === "narrowed"));
  narrowed.event_id = "event.alpha.fork";
  narrowed.event_version = "1.0.0";
  narrowed.recorded_at = "2026-09-08T00:40:00Z";
  narrowed.effective_at = "2026-09-08T00:40:00Z";
  narrowed.new_states[0].condition_version += 1;
  narrowed.new_states[0].scope.geographies = ["New South Wales"];
  appendAndSeal(ledger, narrowed);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "PREDECESSOR_NOT_CURRENT"));
  assert.ok(hasCode(result, "UNDECLARED_FORK"));
});

test("hostile: cycles and forward parents are rejected independently of array order", () => {
  const ledger = fixture("valid/all-operations.json");
  const first = ledger.events[0];
  const second = ledger.events[1];
  first.parent_events = [{
    event_id: second.event_id,
    event_version: second.event_version,
    event_hash: second.event_hash,
  }];
  second.parent_events = [{
    event_id: first.event_id,
    event_version: first.event_version,
    event_hash: computeEventHash(first),
  }];
  resealFrom(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "EVENT_GRAPH_CYCLE"));
  assert.ok(hasCode(result, "PREDECESSOR_NOT_PRIOR"));
});

test("hostile: a cropped suffix cannot reuse an event identity from its base", () => {
  const ledger = fixture("valid/cropped-history.json");
  ledger.events[0].event_id = ledger.history.base.after_event_id;
  resealFrom(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "EVENT_ID_REUSED_FROM_BASE"));
});

test("hostile: missing predecessor events and parent versions fail closed", () => {
  for (const mutation of [
    (parent) => { parent.event_id = "event.missing"; },
    (parent) => { parent.event_version = "9.9.9"; },
  ]) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events.find(({ operation }) => operation === "narrowed");
    mutation(event.parent_events[0]);
    resealFrom(ledger, ledger.events.indexOf(event));
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(
      hasCode(result, "MISSING_PREDECESSOR") || hasCode(result, "PARENT_VERSION_MISMATCH"),
      JSON.stringify(result.errors, null, 2),
    );
  }
});

test("hostile: sequence and recording advance, while effective time cannot precede lineage or follow recording", () => {
  for (const mutate of [
    (event) => { event.sequence -= 1; },
    (event) => { event.recorded_at = "2026-09-08T00:00:00Z"; },
    (event) => { event.effective_at = "2026-09-08T00:50:00Z"; },
    (event) => { event.effective_at = "2026-09-08T00:01:00Z"; },
  ]) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events[2];
    mutate(event);
    resealFrom(ledger, 2);
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(
      hasCode(result, "CHRONOLOGY_INVALID") || hasCode(result, "LINEAGE_CHRONOLOGY_INVALID"),
    );
  }
});

test("effective time may precede unrelated records only with a public correction disclosure", () => {
  const ledger = fixture("valid/all-operations.json");
  const added = clone(ledger.events.find(({ operation, sequence }) =>
    operation === "added" && sequence > 1));
  added.event_id = "event.19.added-retroactive";
  added.effective_at = "2026-09-01T00:00:00Z";
  added.recorded_at = "2026-09-08T00:40:00Z";
  added.new_states[0].condition_id = "condition.retroactive-unrelated";
  added.new_states[0].wording = "a separately scoped condition was effective before this record";
  added.new_states[0].rendered_if = renderConditionIf(added.new_states[0]);
  added.retroactivity = {
    status: "retrospective-correction",
    reason: "The source release arrived after the effective date.",
    affected_window: {
      from: "2026-09-01T00:00:00Z",
      through: "2026-09-08T00:18:00Z",
    },
    superseded_publication_refs: [],
    affected_decision_refs: [],
    public_notice: "Known now, effective earlier: inspect decisions made during the affected window.",
  };
  appendAndSeal(ledger, added);
  ledger.current_state.conditions.push(clone(added.new_states[0]));
  ledger.current_state.conditions.sort((left, right) =>
    left.condition_id < right.condition_id ? -1 : left.condition_id > right.condition_id ? 1 : 0);
  ledger.public_projection = computePublicProjection(ledger);
  ledger.manifest_hash = computeManifestHash(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
});

test("hostile: operation and state pairs form a closed state machine", () => {
  const attacks = [
    ["narrowed", "satisfied"],
    ["challenged", "open"],
    ["expired", "withdrawn"],
    ["satisfied", "open"],
  ];
  for (const [operation, status] of attacks) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events.find((candidate) => candidate.operation === operation);
    event.new_states[0].status = status;
    resealFrom(ledger, ledger.events.indexOf(event));
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(hasCode(result, "ILLEGAL_OPERATION_STATE_PAIR"), `${operation}:${status}`);
  }
});

test("hostile: terminal conditions cannot be reopened or transitioned", () => {
  const ledger = fixture("valid/all-operations.json");
  const terminal = clone(ledger.current_state.conditions.find(({ condition_id: id }) =>
    id === "condition.alpha"));
  const next = clone(terminal);
  next.condition_version += 1;
  next.status = "withdrawn";
  const event = clone(ledger.events.find(({ operation }) => operation === "withdrawn"));
  event.event_id = "event.19.withdraw-terminal";
  event.previous_states = [terminal];
  event.new_states = [next];
  const producer = ledger.events.find(({ event_id: id }) =>
    id === "event.05.satisfied");
  event.parent_events = [{
    event_id: producer.event_id,
    event_version: producer.event_version,
    event_hash: producer.event_hash,
  }];
  event.effective_at = "2026-09-08T00:40:00Z";
  event.recorded_at = "2026-09-08T00:40:00Z";
  appendAndSeal(ledger, event);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "ILLEGAL_OPERATION_STATE_PAIR"));
});

test("hostile: identity changes are silent unless the event is explicitly split or merged", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = ledger.events.find(({ operation }) => operation === "challenged");
  event.new_states[0].condition_id = "condition.alpha-renamed";
  resealFrom(ledger, ledger.events.indexOf(event));

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "SILENT_IDENTITY_CHANGE"));
});

test("hostile: explicit split and merge mappings must exactly name their source and result identities", () => {
  for (const operation of ["split", "merged"]) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events.find((candidate) => candidate.operation === operation);
    event.identity_change.mappings[0].to_condition_ids = ["condition.invented"];
    resealFrom(ledger, ledger.events.indexOf(event));
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(hasCode(result, "ILLEGAL_OPERATION_STATE_PAIR"), operation);
  }
});

test("hostile: challenge-bearing operations require a hash-bound challenge", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = ledger.events.find(({ operation }) => operation === "disputed");
  event.challenges = { disposition: "none", entries: [] };
  resealFrom(ledger, ledger.events.indexOf(event));

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "CHALLENGE_REQUIRED"));
});

test("hostile: declared current state must equal the deterministic fold", () => {
  const ledger = fixture("valid/all-operations.json");
  ledger.current_state.conditions[0].wording += " stale display";

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "CURRENT_STATE_MISMATCH"));
});

test("hostile: an export cannot silently crop events", () => {
  const ledger = fixture("valid/all-operations.json");
  ledger.events.shift();
  resealFrom(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "COMPLETE_HISTORY_BASE_INVALID"));
});

test("hostile: a cropped base state is hash-bound even though its external history is not locally verified", () => {
  const ledger = fixture("valid/cropped-history.json");
  ledger.history.base.conditions[0].state.wording += " altered";

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "CROP_BASE_HASH_MISMATCH"));
  assert.equal(result.omitted_history_verified, false);
  assert.equal(result.external_anchor_verified, false);
});

test("hostile: cropped base states cannot bypass rendered IF and challenge-state invariants", () => {
  for (const mutate of [
    (state) => { state.rendered_if = "IF scope omitted"; },
    (state) => {
      state.status = "open";
      state.unresolved_challenge_ids = ["challenge.alpha.composition"];
    },
  ]) {
    const ledger = fixture("valid/cropped-history.json");
    mutate(ledger.history.base.conditions[0].state);
    ledger.history.base.state_hash = computeStateHash(ledger.history.base.conditions);
    ledger.public_projection = computePublicProjection(ledger);
    ledger.manifest_hash = computeManifestHash(ledger);
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(
      hasCode(result, "RENDERED_IF_MISMATCH") || hasCode(result, "CHALLENGE_STATE_MISMATCH"),
      JSON.stringify(result.errors, null, 2),
    );
  }
});

test("hostile: cropped producer metadata cannot pass the declared omission boundary", () => {
  const ledger = fixture("valid/cropped-history.json");
  ledger.history.base.conditions[0].producer.sequence += 1;

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "CROP_PRODUCER_CHRONOLOGY_INVALID"));
  assert.ok(hasCode(result, "CROP_BASE_HASH_MISMATCH"));
});

test("all eleven operations pass as explicit, append-only transitions", () => {
  const ledger = fixture("valid/all-operations.json");
  const result = validateConditionEvolutionLedger(ledger);

  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(
    new Set(ledger.events.map(({ operation }) => operation)),
    new Set([
      "added",
      "narrowed",
      "split",
      "merged",
      "challenged",
      "satisfied",
      "failed",
      "expired",
      "superseded",
      "disputed",
      "withdrawn",
    ]),
  );
  assert.deepEqual(result.current_state, ledger.current_state);
});

test("split and merge are the only legal multi-identity transitions", () => {
  const ledger = fixture("valid/all-operations.json");
  const split = ledger.events.find(({ operation }) => operation === "split");
  const merged = ledger.events.find(({ operation }) => operation === "merged");

  assert.equal(split.identity_change.kind, "split");
  assert.equal(split.previous_states.length, 1);
  assert.ok(split.new_states.length >= 3);
  assert.equal(merged.identity_change.kind, "merge");
  assert.ok(merged.previous_states.length >= 2);
  assert.ok(merged.new_states.length >= 3);
});

test("the public current state is exactly reproducible from the declared base and events", () => {
  const ledger = fixture("valid/all-operations.json");
  assert.deepEqual(foldConditionEvolutionLedger(ledger), ledger.current_state);
});

test("a disclosed crop is locally foldable but omitted history stays unverified", () => {
  const ledger = fixture("valid/cropped-history.json");
  const result = validateConditionEvolutionLedger(ledger);

  assert.equal(result.machine_valid, false, JSON.stringify(result.errors, null, 2));
  assert.equal(result.disclosed_suffix_structurally_valid, true);
  assert.equal(result.history_complete, false);
  assert.equal(result.omitted_history_verified, false);
  assert.equal(result.external_anchor_verified, false);
  assert.equal(result.condition_truth_assessed, false);
  assert.equal(result.authority_granted, false);
  assert.equal(result.action_authorised, false);
});

test("crop semantics require count, range, reason, base state and an external binding", () => {
  for (const field of ["omitted_event_count", "omitted_ranges", "omission_reason", "external_record"]) {
    const ledger = fixture("valid/cropped-history.json");
    if (field === "omitted_event_count") ledger.history[field] = 0;
    else if (field === "omitted_ranges") ledger.history[field] = [];
    else if (field === "omission_reason") ledger.history[field] = "";
    else ledger.history[field] = null;
    const result = validateConditionEvolutionLedger(ledger);
    assert.equal(result.machine_valid, false, field);
  }
});

test("history validity remains separate from condition truth and action authority", () => {
  const result = validateConditionEvolutionLedger(fixture("valid/all-operations.json"));

  assert.equal(result.integrity_valid, true);
  assert.equal(result.condition_truth_assessed, false);
  assert.equal(result.authority_granted, false);
  assert.equal(result.action_authorised, false);
  assert.equal(Object.hasOwn(result, "condition_true"), false);
  assert.equal(Object.hasOwn(result, "may_act"), false);
});

test("the README states the append-only and authority boundaries", () => {
  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  assert.match(readme, /append[- ]only/i);
  assert.match(readme, /external checkpoint.*cannot.*verified locally/is);
  assert.match(readme, /does not.*condition.*true/is);
  assert.match(readme, /does not.*authorise.*action/is);
  assert.match(readme, /cropped.*omission/is);
  assert.match(readme, /manifest_hash/);
  assert.match(readme, /known then.*recorded now/is);
  assert.match(readme, /identity-consolidation-only/);
  assert.match(readme, /public_projection/);
  assert.match(readme, /node --test contracts\/evolution\/tests\/\*\.test\.mjs/);
});

test("hostile: a merge cannot create unrelated wording or scope", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = ledger.events.find(({ operation }) => operation === "merged");
  const created = event.new_states.find(({ condition_id: id }) => id === "condition.merge-c");
  created.wording = "an unrelated planetary emergency is established";
  created.scope = {
    jurisdictions: ["Mars"],
    geographies: ["Olympus Mons"],
    cohorts: ["all settlers"],
    services: ["evacuation"],
  };
  created.rendered_if = "IF an unrelated planetary emergency is established [jurisdictions: Mars; geographies: Olympus Mons; cohorts: all settlers; services: evacuation]";
  resealFrom(ledger, ledger.events.indexOf(event));

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "MERGE_SEMANTICS_INVALID"));
});

test("hostile: a split cannot duplicate members while claiming a disjoint exhaustive partition", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = ledger.events.find(({ operation }) => operation === "split");
  const victoria = event.new_states.find(({ condition_id: id }) => id === "condition.source.vic");
  victoria.scope.geographies = ["New South Wales"];
  victoria.rendered_if = victoria.rendered_if.replace("Victoria", "New South Wales");
  resealFrom(ledger, ledger.events.indexOf(event));

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "SPLIT_COVERAGE_INVALID"));
});

test("a split may expose partial, overlapping coverage only when both are declared exactly", () => {
  const ledger = fixture("valid/all-operations.json");
  const eventIndex = ledger.events.findIndex(({ operation }) => operation === "split");
  ledger.events = ledger.events.slice(0, eventIndex + 1);
  const event = ledger.events.at(-1);
  const victoria = event.new_states.find(({ condition_id: id }) => id === "condition.source.vic");
  victoria.scope.geographies = ["New South Wales"];
  victoria.rendered_if = renderConditionIf(victoria);
  Object.assign(event.identity_change, {
    coverage_mode: "intentionally-partial",
    overlap_mode: "declared-overlap",
    uncovered_members: ["Victoria"],
  });
  resealFrom(ledger, eventIndex);
  refreshDerived(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.machine_valid, true, JSON.stringify(result.errors, null, 2));
});

test("challenge IDs persist until an explicit, evidence-bound resolution", () => {
  const ledger = fixture("valid/all-operations.json");
  const challenged = ledger.events.find(({ operation }) => operation === "challenged");
  const disputed = ledger.events.find(({ operation }) => operation === "disputed");
  const satisfied = ledger.events.find(({ operation }) => operation === "satisfied");
  const challengeIds = [
    challenged.challenges.entries[0].challenge_id,
    disputed.challenges.entries[0].challenge_id,
  ].sort();

  assert.deepEqual(satisfied.previous_states[0].unresolved_challenge_ids, challengeIds);
  assert.equal(satisfied.challenges.disposition, "resolved");
  assert.deepEqual(
    satisfied.challenges.resolutions.map(({ challenge_id }) => challenge_id).sort(),
    challengeIds,
  );
  assert.deepEqual(satisfied.new_states[0].unresolved_challenge_ids, []);
  assert.ok(satisfied.new_states[0].assessment);
  assert.equal(validateConditionEvolutionLedger(ledger).machine_valid, true);
});

test("hostile: satisfied and failed states require a bound assessment and cannot drop challenges", () => {
  for (const mutate of [
    (event) => { event.new_states[0].assessment = null; },
    (event) => { event.challenges = { disposition: "none", entries: [], resolutions: [] }; },
    (event) => { event.previous_states[0].unresolved_challenge_ids = []; },
  ]) {
    const ledger = fixture("valid/all-operations.json");
    const event = ledger.events.find(({ operation }) => operation === "satisfied");
    mutate(event);
    resealFrom(ledger, ledger.events.indexOf(event));
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(
      hasCode(result, "STATUS_ASSESSMENT_REQUIRED") ||
      hasCode(result, "CHALLENGE_DISPOSITION_INVALID") ||
      hasCode(result, "CHALLENGE_STATE_MISMATCH"),
      JSON.stringify(result.errors, null, 2),
    );
  }
});

test("rendered IF wording is deterministically bound to structured scope", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = ledger.events.find(({ operation }) => operation === "narrowed");
  event.new_states[0].rendered_if = "IF the condition holds everywhere";
  resealFrom(ledger, ledger.events.indexOf(event));

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "RENDERED_IF_MISMATCH"));
});

test("the manifest binds ledger identity, history and publication anchor metadata", () => {
  for (const mutate of [
    (ledger) => { ledger.ledger_id = "ledger.relabelled"; },
    (ledger) => { ledger.publication_anchor.checkpoint_uri = "https://attacker.invalid/tip"; },
    (ledger) => { ledger.history.omission_reason = "rewritten omission reason"; },
  ]) {
    const ledger = fixture("valid/cropped-history.json");
    mutate(ledger);
    const result = validateConditionEvolutionLedger(ledger);
    assert.ok(hasCode(result, "MANIFEST_HASH_MISMATCH"));
  }
});

test("external ledger and checkpoint bindings require HTTPS and still grant no authority", () => {
  const cropped = fixture("valid/cropped-history.json");
  cropped.history.external_record.record_uri = "data:text/plain,attacker-history";
  cropped.publication_anchor.checkpoint_uri = "data:text/plain,attacker-tip";
  cropped.manifest_hash = computeManifestHash(cropped);
  const result = validateConditionEvolutionLedger(cropped);
  assert.equal(result.schema_valid, false);
  assert.equal(result.external_anchor_verified, false);
  assert.equal(result.authority_granted, false);
  assert.equal(result.action_authorised, false);
});

test("the public fold refuses an invalid or incomplete ledger", () => {
  const forged = fixture("valid/all-operations.json");
  forged.events.at(-1).new_states.at(-1).wording = "forged unchecked state";
  assert.throws(() => foldConditionEvolutionLedger(forged), /invalid/i);

  const cropped = fixture("valid/cropped-history.json");
  assert.throws(() => foldConditionEvolutionLedger(cropped), /complete|incomplete/i);
});

test("all integer counters are restricted to exact JavaScript safe integers", () => {
  const ledger = fixture("valid/all-operations.json");
  ledger.events[0].sequence = Number.MAX_SAFE_INTEGER + 1;
  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.schema_valid, false);
});

test("retroactive events require a public correction disclosure", () => {
  const ledger = fixture("valid/all-operations.json");
  const event = clone(ledger.events.find(({ operation, sequence }) =>
    operation === "added" && sequence > 1));
  event.event_id = "event.19.retroactive";
  event.effective_at = "2020-01-01T00:00:00Z";
  event.recorded_at = "2026-09-08T00:40:00Z";
  event.new_states[0].condition_id = "condition.retroactive";
  event.new_states[0].wording = "this condition held before it was recorded";
  event.new_states[0].rendered_if = event.new_states[0].rendered_if
    .replace(/IF .* \[/, "IF this condition held before it was recorded [");
  event.retroactivity = {
    status: "not-retroactive",
    reason: null,
    affected_window: null,
    superseded_publication_refs: [],
    affected_decision_refs: [],
    public_notice: null,
  };
  appendAndSeal(ledger, event);

  const result = validateConditionEvolutionLedger(ledger);
  assert.ok(hasCode(result, "RETROACTIVITY_DISCLOSURE_REQUIRED"));
});

test("cropped history validates only the disclosed suffix, never the whole ledger", () => {
  const result = validateConditionEvolutionLedger(fixture("valid/cropped-history.json"));
  assert.equal(result.machine_valid, false);
  assert.equal(result.ledger_valid, false);
  assert.equal(result.disclosed_suffix_structurally_valid, true);
  assert.equal(result.history_complete, false);
});

test("canonical hashes use a versioned domain and exact safe-integer vector", () => {
  const challengeVector = canonicalisationVectors.vectors.find(({ kind }) =>
    kind === "challenge-statement");
  assert.equal(
    computeChallengeHash(challengeVector.input),
    challengeVector.expected_hash,
  );
  const ledger = fixture("valid/all-operations.json");
  const eventVector = canonicalisationVectors.vectors.find(({ kind }) => kind === "event");
  const manifestVector = canonicalisationVectors.vectors.find(({ kind }) =>
    kind === "ledger-manifest");
  assert.equal(computeEventHash(ledger.events[0]), eventVector.expected_hash);
  assert.equal(computeManifestHash(ledger), manifestVector.expected_hash);
  assert.equal(ledger.manifest_hash, manifestVector.expected_hash);

  const entries = ledger.events.filter(({ operation }) => operation === "added").slice(0, 2)
    .map((event) => ({
      state: event.new_states[0],
      producer: {
        event_id: event.event_id,
        event_version: event.event_version,
        event_hash: event.event_hash,
        sequence: event.sequence,
        effective_at: event.effective_at,
        recorded_at: event.recorded_at,
      },
    }));
  assert.equal(computeStateHash(entries), computeStateHash([...entries].reverse()));
});

test("the public projection is deterministic and exposes unresolved challenges and boundaries", () => {
  const ledger = fixture("valid/all-operations.json");
  assert.deepEqual(ledger.public_projection, computePublicProjection(ledger));
  assert.equal(ledger.public_projection.boundaries.condition_truth_assessed, false);
  assert.equal(ledger.public_projection.boundaries.authority_granted, false);
  assert.equal(ledger.public_projection.boundaries.action_authorised, false);
  assert.ok(ledger.public_projection.current_conditions.every(({ rendered_if }) =>
    rendered_if.includes("jurisdictions:")));
  const satisfied = ledger.public_projection.changes.find(({ operation }) =>
    operation === "satisfied");
  assert.equal(satisfied.resolution_records.length, 2);
  assert.ok(satisfied.resolution_records.every(({ statement }) => statement.length > 20));
});

test("a cropped public projection distinguishes included from omitted challenge details", () => {
  const ledger = fixture("valid/cropped-history.json");
  ledger.events = ledger.events.slice(0, 1);
  refreshDerived(ledger);

  const result = validateConditionEvolutionLedger(ledger);
  assert.equal(result.disclosed_suffix_structurally_valid, true, JSON.stringify(result.errors, null, 2));
  const unresolved = ledger.public_projection.current_conditions[0].unresolved_challenges;
  assert.deepEqual(
    unresolved.map(({ challenge_id: id, details_status: status }) => [id, status]),
    [
      ["challenge.alpha.composition", "omitted-unverified"],
      ["challenge.alpha.scope", "included"],
    ],
  );
});
