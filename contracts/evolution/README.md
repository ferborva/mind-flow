# Condition evolution ledger

## Net

An `IF` condition is never silently rewritten. Each change is a new, typed event
that names the exact condition state it consumed and the exact state it
produced. Every public `IF` sentence is deterministically rendered from its
proposition and structured scope. Folding the events from the disclosed base
must reproduce the published current state and public explanation byte for
byte.

**A valid history does not mean a condition is true and does not authorise an
action.** The validator reports both boundaries explicitly:

```json
{
  "condition_truth_assessed": false,
  "authority_granted": false,
  "action_authorised": false
}
```

This contract answers a narrow question: *is the disclosed evolution record
internally reproducible and unaltered relative to its hashes?* Evidence
assessment, condition evaluation, governance authority and action lifecycle
remain separate contracts.

## Why this exists

Public decisions often retain a memorable conclusion while the qualifying
`IF` quietly changes. That destroys auditability. This ledger makes a changed
condition visible as an event with an author, provenance, reason, two clocks,
challenges and lineage.

The current state is a cache, not another source of truth. It exists so a
reader can inspect the latest wording without replaying the ledger. The
validator rejects it if it differs from the deterministic fold.

## Event vocabulary

| Event | Legal effect on condition state |
|---|---|
| `added` | Creates one previously unseen, open version 1 condition. |
| `narrowed` | Keeps identity, proposition, evidence and status while making scope a strict subset. Its rendered sentence changes with scope. |
| `challenged` | Keeps identity, proposition and scope; records a uniquely identified, hash-bound challenge and carries it in condition state. |
| `disputed` | Keeps identity, proposition and scope; enters dispute and carries every unresolved challenge. |
| `satisfied` | Requires an evidence-bound assessment and explicit resolution of every outstanding challenge. It records an evaluation result but does not prove truth. |
| `failed` | Requires an evidence-bound assessment and explicit resolution of every outstanding challenge. It records an evaluation result but does not prove a causal explanation. |
| `expired` | Closes an active condition without changing its wording, scope or evidence. |
| `superseded` | Closes an active condition without creating a replacement identity. |
| `withdrawn` | Closes an active condition without changing its wording, scope or evidence. |
| `split` | Partitions one named scope dimension. Coverage gaps and overlaps must be declared exactly. Children inherit proposition, evidence, status and unresolved challenges. |
| `merged` | Consolidates duplicate identities only. Every source must have identical proposition and scope; semantic change is prohibited. |

All other multi-identity changes fail. A normal event that consumes a stale
condition version is an undeclared fork. Terminal conditions cannot be
reopened through this ledger. A later policy may define a separately governed
reopening event, but version 1 deliberately does not.

## Exact bindings

Every event contains:

- `previous_states`: complete prior wording, scope, evidence, status and
  condition version;
- `new_states`: complete successor state or states;
- `parent_events`: event ID, event version and event hash for every producer of
  a consumed state;
- `actor`, `provenance` and `reason`;
- `effective_at` and `recorded_at`, both strict UTC second timestamps;
- a closed `retroactivity` declaration, including the affected historical
  window and a public correction notice when effective time predates the prior
  public record;
- `challenges`, either explicitly `none` or one or more hash-bound records;
- `chain_predecessor`, which pins the previous ledger event ID, version and
  hash, plus the redundant `previous_event_hash` and the new `event_hash`.

Every state carries `unresolved_challenge_ids`. A challenge remains in that list
until a later `satisfied` or `failed` event contains a hash-bound resolution.
Private audit events retain the exact challenge statement and recording actor.
The public projection never copies either field. It publishes only the
statement hash and time with `redacted-hash-only`, or marks details
`omitted-unverified` when the event is outside the disclosed history. Resolution
statements and resolver identities follow the same hash-only default.

Every state also carries `condition_definition_ref`. Its `condition_id` must
equal the state identity, and its `definition_hash` is recomputed from the exact
condition ID, proposition wording and structured scope. Status, evidence and
assessment changes retain that definition reference. Narrowing, splitting or
merging creates a new condition-definition hash when identity or scope changes.
Resealing an event chain cannot hide a mismatched definition reference.

Despite its name, this reference binds the ledger's condition proposition. It
is **not an executable predicate definition** and does not replace
`contracts/schema/condition-contract.schema.json`, its thresholds, windows,
evidence rules or evaluator identity. A downstream system must bind both before
it may claim that history resolves to an executable IF.

`satisfied` and `failed` states also bind an assessment ID, version, checksum,
evaluator, method, threshold, evaluation time and the exact evidence identities
used. These are audit bindings, not endorsements of the assessor or method.

## Canonicalisation and manifest commitment

The profile is `mind-flow-canonical-json-v1`:

1. only schema-valid JSON values are hashable;
2. every integer is between zero or one, as applicable, and
   `9007199254740991`;
3. object keys are recursively sorted by JavaScript UTF-16 code-unit order;
4. arrays retain their supplied order, except cropped base-state entries are
   sorted by `condition_id` before hashing;
5. strings and safe integers use JavaScript `JSON.stringify` encoding; and
6. bytes are UTF-8 and prefixed with
   `mind-flow:condition-evolution:v1:<kind>\n` before SHA-256.

Kinds are `event`, `base-state`, `challenge-statement`,
`condition-definition` and `ledger-manifest`. The event hash removes only
`event_hash`. Challenge hashes cover the exact raw statement after the domain
prefix, without JSON quoting.

The top-level `manifest_hash` removes only itself, then commits to everything
else: ledger identity, schema and canonicalisation profile, generation time,
history disclosure and external-record reference, complete event content,
current state, public projection, publication-anchor metadata and boundary
statements. Changing a URI or relabelling a ledger therefore requires a new
manifest hash. [Canonicalisation vectors](canonicalisation-vectors.json) pin
cross-implementation outputs.

Hashing detects an edit that has not been resealed. A coordinated rewrite can
recompute an entire local chain and manifest, so durable append-only assurance
also needs a previously published signature over `manifest_hash` in an
independently controlled transparency log. The external checkpoint cannot be
verified locally by this validator. Its local status is therefore always
`not-verified-by-local-validator`. Checkpoint and cropped-record URIs must use
HTTPS, but HTTPS alone does not authenticate their publisher or contents.

## Split and merge semantics

A split is exact only along one `partition_dimension`. Every other scope
dimension must remain identical. `coverage_mode` declares whether the listed
members exhaust the source or intentionally omit named `uncovered_members`.
`overlap_mode` declares whether children are disjoint or intentionally overlap.
An undeclared gap or overlap fails. Every child must also preserve proposition,
evidence, status, unresolved challenges and assessment exactly. Only identity,
version, the declared partition scope and its deterministic rendering may
change.

A merge is `identity-consolidation-only`. All active sources and the new
identity must use identical proposition wording and scope. It carries forward
all evidence and unresolved challenges. Joining different claims is a semantic
operation and must instead supersede the old identities and add a separately
reviewed new condition.

## Deterministic fold

The fold starts with `history.base.conditions`. A complete ledger requires an
empty sequence-zero base. A cropped ledger requires a disclosed, checksum-
pinned external record and a hash-bound base state after the omitted events.

For each event, in sequence:

1. verify both clocks and the ledger hash link;
2. resolve every parent event and exact previous state;
3. apply the closed operation and identity rules;
4. replace each affected identity with its new state;
5. retain terminal states so lineage, assessments and unresolved challenges do
   not disappear.

The output is sorted by `condition_id` and compared with `current_state`.
Validation rejects missing predecessors, cycles, forward parents, stale
versions, illegal operation and state pairs, silent identity changes,
scope-wording divergence, lost challenges, unassessed terminal evaluations and
a mismatched current-state cache. The exported public fold validates a complete
ledger first. It refuses invalid and cropped ledgers instead of returning an
unchecked state.

## Two clocks and corrections

Events are ordered by strictly increasing `recorded_at`. `effective_at` may be
earlier for an unrelated condition, but that event must declare
`retrospective-correction`, its reason, the full affected window, any identified
superseded publications and decisions, and a plain public notice. This preserves
the distinction between “known then” and “recorded now”. A retroactive event
without that disclosure fails.

## Cropped export and omission semantics

A cropped selection is not a complete ledger. It must declare:

- the exact count and contiguous ranges of omitted events;
- why the export was cropped;
- a URI and checksum for the external complete record;
- the prior sequence, event ID, hash and two clocks;
- the exact base state and producer metadata needed to fold the selection.

This makes an omission visible and makes the included suffix reproducible. It
does not validate the omitted events, the external record, or the base state's
truth. A crop therefore cannot headline as a valid whole ledger. It returns:

```json
{
  "machine_valid": false,
  "ledger_valid": false,
  "disclosed_suffix_structurally_valid": true,
  "history_complete": false,
  "omitted_history_verified": false,
  "external_anchor_verified": false
}
```

Removing events while continuing to claim `history.mode: complete` fails.

## Public projection

`public_projection` is a deterministic cache, checked just like
`current_state`. It says whether history is complete, repeats the truth and
authority boundaries, lists each change with who recorded it, why, both clocks,
retroactivity notice, hash-only challenge and resolution records, and lists
current conditions with plain status labels and redacted unresolved challenge
records. Its `challenge_details_disclosure` boundary is fixed to
`hash-only-redacted`. It is the minimum public explanation surface, not a
substitute for the private event record.

## Files and command

- `schema/condition-evolution-ledger.schema.json` is closed at every object
  boundary.
- `validate.mjs` performs semantic validation and the deterministic fold.
- `fixtures/valid/all-operations.json` exercises all eleven event types.
- `fixtures/valid/cropped-history.json` demonstrates a disclosed crop.
- `fixtures/build-fixtures.mjs` deterministically regenerates fixture content
  on standard output.
- `canonicalisation-vectors.json` pins domain-separated hashes across
  implementations.
- `tests/condition-evolution.test.mjs` begins with hostile cases and then proves
  the bounded valid paths.

Run the focused suite:

```sh
node --test contracts/evolution/tests/*.test.mjs
```

To inspect a freshly generated complete fixture without changing files:

```sh
node contracts/evolution/fixtures/build-fixtures.mjs full
```

Maintainers can regenerate both committed fixtures with:

```sh
node contracts/evolution/fixtures/build-fixtures.mjs write
```

## Known boundary

This is tamper-evident structure, not a signature system, truth engine,
forecast evaluator or delegation instrument. Merge identity equivalence,
assessment quality, challenge-resolution legitimacy and the completeness of a
declared split still need independent review. A production publisher should
sign and publish manifest checkpoints in an independently controlled
transparency log. That verification belongs in a separate trust layer so a
valid local history can never manufacture its own authority.
