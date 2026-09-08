# Second-pass integration architecture audit

**Review date:** 2026-09-09  
**Reviewer:** independent Codex sub-agent  
**Reviewed state:** live `ren/abundance-transition-program` worktree after the Round 03 subsystem repairs  
**Review mode:** independent cross-system inspection before reading the other external review findings  
**Authority:** none  

## Verdict

The repaired subsystems are individually thoughtful, but they do not yet form one
transition-control system. They form several internally valid universes whose
condition identities, scopes, clocks, evidence, actors and actions do not meet.

**The smallest safe next step is one repository-owned integration manifest and
validator that loads the real bytes of every selected artefact, runs the fixed
subsystem validators, then derives cross-system validity without accepting a
caller-supplied `verified`, `ready` or `authorised` claim.**

This must precede any claim that the Observatory monitors a real transition or
connects a signal, forecast, path or IF to an action. The first passing fixture
should remain synthetic and research-only. Local integrity must not become
empirical truth, publication approval or action authority.

No production file was edited during this audit. This review file is the only
file created by the audit, at the parent agent's explicit request.

## Evidence from the live worktree

### 1. The current fixtures share no condition identity

The active examples use separate namespaces:

| Subsystem | Current condition identity |
|---|---|
| Agency map | `condition.transition-option-ready`, `condition.employment-offer-exists`, `condition.protection-capacity-ready` |
| Signal registry | `condition.worker-flow-review` |
| Possible path | `condition.synthetic.worker-option`, `condition.synthetic.delivery-capacity` |
| Preparation | No `condition_id`; four separate `if.*` identities |
| Dashboard | Bare labels `capability`, `reach`, `agency`, `durability`, `fairness` |

Evidence:

- `contracts/agency-map/fixtures/australian-clerical-agency.synthetic.json:42-59`
- `signals/fixtures/australia-feasibility.json:10-14`
- `paths/fixtures/australian-clerical-transition.synthetic.json:23-31`
- `preparation/fixtures/valid/round-03.register.json:9-71`
- `dashboard/snapshots/2026-09-08.r2.json:214-251`

The set intersection of these condition identifiers is empty. An integrator can
therefore select records that all pass locally while making mutually unrelated
claims.

### 2. Similar public outcomes are not the same scope

The agency and possible-path examples concern Australian general clerks over the
same future period, but the agency scope is hash
`sha256:092f687b67735657baab1d7d18adbc40bf216efce5402cc5cbb218c684dba615`
while the path scope is hash
`sha256:d450a250f2dd80721769e9997e838b9d0ec5be0053c965bf436d14e79b86a010`.
The agency says people `reach` comparable or preferred work. The path says they
`transition` `to` it. Their IF sets also differ.

Evidence:

- `contracts/agency-map/fixtures/australian-clerical-agency.synthetic.json:24-59`
- `paths/fixtures/australian-clerical-transition.synthetic.json:12-31`

Neither contract is wrong in isolation. The error would be treating them as the
same outcome without an explicit, reviewed migration.

### 3. Condition anchors are structurally incompatible

- Agency-map `condition_version` is semantic-version text such as `1.0.0`:
  `contracts/agency-map/schema/condition-agency-map.schema.json:217-230`.
- Evolution-ledger `condition_version` is a positive integer:
  `contracts/evolution/schema/condition-evolution-ledger.schema.json:153-171`.
- Possible-path `condition_version` is also an integer:
  `paths/schema/possible-path.schema.json:211-235`.
- Preparation binds a ledger tip but omits condition ID, condition version,
  ledger manifest hash and condition-producing event:
  `preparation/schema/preparation-register.schema.json:124-134`.
- Signal bindings omit condition version and ledger manifest hash, and the
  current schema requires their tip fields to be null:
  `signals/schema/signal-registry.schema.json:145-162`.
- Dashboard conditions have no ledger anchor:
  `dashboard/schema/snapshot.schema.json:111-176`.

The agency contract also uses `tip_event_id` inside each condition anchor even
though a condition-producing event and the current ledger tip are different
concepts. The integration layer must name both explicitly.

### 4. Decision-ready signal and preparation states are unreachable

The signal schema fixes `binding_status` to `external-unverified`, while the
semantic validator requires `locally-verified-complete` for every non-research
decision use:

- `signals/schema/signal-registry.schema.json:145-162`
- `signals/validate.mjs:235-241`
- `signals/validate.mjs:340-352`

The preparation schema similarly fixes `verification_state` to
`external-unverified`, while its validator checks for
`locally-verified-complete` before shadow or public decision use:

- `preparation/schema/preparation-register.schema.json:124-134`
- `preparation/lib/validate.mjs:510-520`
- `preparation/lib/validate.mjs:646-654`

Because JSON Schema runs first, the validator's positive branch cannot be
reached by a schema-valid record. The safe answer is not to let callers change
the string. The integration validator should derive ledger-binding validity by
loading and validating the exact ledger bytes.

### 5. The IF grammar has no shared source of truth

- Agency maps permit `all`, `any` and `not` over condition IDs.
- Preparation permits `all`, `any`, `not` and `veto_if` over local clause IDs.
- The possible-path graph requires every outcome route to accumulate every
  registered condition, which is an implicit all-of model.
- The dashboard stores an ordered flat list of condition states.

The project already has a more mature executable grammar in
`contracts/schema/condition-contract.schema.json`, including `all`, `any`,
`not`, `alternative_if` and `veto_if`, with deterministic five-valued gate
evaluation in `contracts/evaluator.mjs`. Creating another evaluator would add a
fourth semantics. The v1 integration should reuse that contract as the
executable IF definition.

### 6. A path anchor is not resolved to a ledger

`paths/validate.mjs` verifies consistency among the path's own repeated anchor
fields, but it does not load the referenced evolution ledger, find the manifest,
replay the history or verify that the condition state exists. The path schema
correctly labels every anchor `external-unverified-anchor` at
`paths/schema/possible-path.schema.json:211-235`, but no higher layer currently
performs the missing resolution.

### 7. The dashboard cannot yet consume a typed path

The dashboard reserves `possible_path_refs`, but its production build rejects
every non-empty list:

- `dashboard/tools/build.mjs:926-928`
- the current snapshot is empty at
  `dashboard/snapshots/2026-09-08.r2.json:12559`

The dashboard also independently stores condition state and action summaries.
It can therefore drift from the agency, evolution, signal, path and preparation
records even if all files pass their own tests.

### 8. Forecasts do not bind their target or action to the other contracts

A forecast target names a free-text event, measure, source and resolution event,
but no registered `signal_id`, `metric_id`, metric checksum, condition ID or path
discriminator. Its policy uses free-text action names:

- `forecasts/schema/binary-forecast.schema.json:90-128`
- `forecasts/schema/binary-forecast.schema.json:290-300`
- `forecasts/fixtures/decision-linked.issued.json:13-32`
- `forecasts/fixtures/decision-linked.issued.json:116-135`

The new resolution hardening makes forecast scoring safer. It does not establish
that the resolved event measures a registered transition condition or that
`prepare reversible support` resolves to a governed preparation action.

### 9. Cross-system evidence independence is unprotected

Signals track source IDs, collection processes, evidence URIs and acquired-byte
checksums. Preparation tracks evidence IDs, independence groups, artefact URIs
and checksums. Forecasts track source, vintage and checksum. Dashboard tracks raw
input identity and transformation lineage. There is no shared evidence-artifact
identity or source-family graph across those systems.

The same bytes can therefore appear under different local IDs and count as
independent in one subsystem without the integrator noticing their shared
publisher, collection process or transformation ancestry.

### 10. Actor and affected-party identity is fragmented

Agency uses `actor.*`; preparation separately uses `actor.*`, `owner.*` and
`party.*`; forecasts use unconstrained owner strings; paths use `population.*`;
dashboard uses prose. A label match is not an identity match. No current
validator can prove that the forecast owner, action actor, condition duty-bearer
and dashboard owner are the same claimed entity.

### 11. Condition state axes are mixed

- Evolution state is lifecycle-like: open, challenged, disputed, satisfied,
  failed, expired, superseded or withdrawn.
- Preparation evaluation is truth-like: true, false, unknown or conflicted.
- Dashboard's one field mixes truth and freshness: true, false, unknown, stale
  or conflicted at `dashboard/schema/snapshot.schema.json:175`.
- Evidence grade, binding validity and authority are separate elsewhere.

Staleness cannot replace truth. A previously true evaluation can become stale,
but its historical truth result should remain recorded while its current
eligibility becomes false.

### 12. The experiment is not yet an executable protocol package

The comparison design is careful prose, but
`experiments/observatory-comparison/tests/protocol.test.mjs:6-63` reads only the
README and tests regular-expression presence. It does not freeze the fact pack,
three arm artefacts, facilitator scripts, response rubric, consent material,
safety owner, analysis plan or preregistration anchor. Equal factual content
across arms is asserted, not mechanically enforced.

### 13. The full live suite was red during this audit

`npm test` reached the dashboard suite with 104 passing tests and one failure.
`dashboard/tests/dashboard.test.mjs:164` expected the generated page to expose
`WHAT THE RECORD REPORTS`, but `dashboard/web/index.html` did not contain it.
The likely cause is a test or template change not yet regenerated into the
committed page. This is not an integration finding, but it is a release blocker
until the parent agent reconciles the source and generated artefact.

## Minimal v1 transition-bundle contract

Use the proposed path `integration/transition-bundle/`. Avoid exporting another
function named `validateTransitionBundle`, because
`contracts/semantic-validation.mjs:664` already uses that name for the narrower
action, run and lifecycle proposal bundle. Export `validateProgrammeBundle`.

The input manifest should contain references and selections, not caller verdicts.
The validator computes every status.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://mind-flow.org/integration/programme-transition-bundle/1-0-0",
  "title": "Programme transition bundle",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version",
    "bundle_id",
    "created_at",
    "intended_use",
    "canonical_scope",
    "artefacts",
    "condition_bindings",
    "action_bindings",
    "forecast_bindings",
    "presentation_bindings"
  ],
  "properties": {
    "schema_version": { "const": "1.0.0" },
    "bundle_id": {
      "type": "string",
      "pattern": "^programme-bundle\\.[a-z0-9.-]+\\.v[1-9][0-9]*$"
    },
    "created_at": { "type": "string", "format": "date-time" },
    "intended_use": {
      "enum": ["research-only", "shadow-decision", "public-information"]
    },
    "canonical_scope": {
      "type": "object",
      "additionalProperties": false,
      "required": ["agency_map_id", "outcome_scope_hash", "if_logic_hash"],
      "properties": {
        "agency_map_id": { "$ref": "#/$defs/id" },
        "outcome_scope_hash": { "$ref": "#/$defs/hash" },
        "if_logic_hash": { "$ref": "#/$defs/hash" }
      }
    },
    "artefacts": {
      "type": "array",
      "minItems": 6,
      "items": { "$ref": "#/$defs/artefactRef" }
    },
    "condition_bindings": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/conditionBinding" }
    },
    "action_bindings": {
      "type": "array",
      "items": { "$ref": "#/$defs/actionBinding" }
    },
    "forecast_bindings": {
      "type": "array",
      "items": { "$ref": "#/$defs/forecastBinding" }
    },
    "presentation_bindings": {
      "type": "object",
      "additionalProperties": false,
      "required": ["dashboard_record_id", "dashboard_bundle_hash", "experiment_id", "fact_pack_hash"],
      "properties": {
        "dashboard_record_id": { "type": ["string", "null"] },
        "dashboard_bundle_hash": { "oneOf": [{ "$ref": "#/$defs/hash" }, { "type": "null"}] },
        "experiment_id": { "type": ["string", "null"] },
        "fact_pack_hash": { "oneOf": [{ "$ref": "#/$defs/hash" }, {"type": "null"}] }
      }
    }
  },
  "$defs": {
    "id": { "type": "string", "pattern": "^[a-z][a-z0-9.-]+$" },
    "version": { "type": "string", "pattern": "^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$" },
    "hash": { "type": "string", "pattern": "^sha256:[a-f0-9]{64}$" },
    "artefactRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["role", "id", "version", "path", "sha256"],
      "properties": {
        "role": {
          "enum": [
            "agency-map",
            "condition-definition",
            "condition-evolution-ledger",
            "signal-registry",
            "possible-path",
            "forecast",
            "preparation-register",
            "dashboard-record",
            "experiment-manifest"
          ]
        },
        "id": { "$ref": "#/$defs/id" },
        "version": { "$ref": "#/$defs/version" },
        "path": { "type": "string", "pattern": "^[A-Za-z0-9._/-]+\\.json$" },
        "sha256": { "$ref": "#/$defs/hash" }
      }
    },
    "conditionAnchor": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ledger_id",
        "ledger_manifest_hash",
        "ledger_tip_event_id",
        "ledger_tip_event_hash",
        "condition_version",
        "producer_event_id",
        "producer_event_hash"
      ],
      "properties": {
        "ledger_id": { "$ref": "#/$defs/id" },
        "ledger_manifest_hash": { "$ref": "#/$defs/hash" },
        "ledger_tip_event_id": { "$ref": "#/$defs/id" },
        "ledger_tip_event_hash": { "$ref": "#/$defs/hash" },
        "condition_version": { "type": "integer", "minimum": 1 },
        "producer_event_id": { "$ref": "#/$defs/id" },
        "producer_event_hash": { "$ref": "#/$defs/hash" }
      }
    },
    "conditionBinding": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "condition_id",
        "definition_ref",
        "anchor",
        "agency_signal_ids",
        "registry_signal_ids",
        "path_ids",
        "preparation_if_ids"
      ],
      "properties": {
        "condition_id": { "$ref": "#/$defs/id" },
        "definition_ref": { "$ref": "#/$defs/pinnedRef" },
        "anchor": { "$ref": "#/$defs/conditionAnchor" },
        "agency_signal_ids": { "$ref": "#/$defs/idSet" },
        "registry_signal_ids": { "$ref": "#/$defs/idSet" },
        "path_ids": { "$ref": "#/$defs/idSet" },
        "preparation_if_ids": { "$ref": "#/$defs/idSet" }
      }
    },
    "actionBinding": {
      "type": "object",
      "additionalProperties": false,
      "required": ["hypothesis_id", "preparation_action_id", "actor_id", "condition_id"],
      "properties": {
        "hypothesis_id": { "$ref": "#/$defs/id" },
        "preparation_action_id": { "$ref": "#/$defs/id" },
        "actor_id": { "$ref": "#/$defs/id" },
        "condition_id": { "$ref": "#/$defs/id" }
      }
    },
    "forecastBinding": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "forecast_id",
        "signal_id",
        "metric_id",
        "metric_checksum",
        "condition_id",
        "relation"
      ],
      "properties": {
        "forecast_id": { "$ref": "#/$defs/id" },
        "signal_id": { "$ref": "#/$defs/id" },
        "metric_id": { "$ref": "#/$defs/id" },
        "metric_checksum": { "$ref": "#/$defs/hash" },
        "condition_id": { "$ref": "#/$defs/id" },
        "relation": { "const": "predicts-observation-only" }
      }
    },
    "pinnedRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "version", "checksum"],
      "properties": {
        "id": { "$ref": "#/$defs/id" },
        "version": { "$ref": "#/$defs/version" },
        "checksum": { "$ref": "#/$defs/hash" }
      }
    },
    "idSet": {
      "type": "array",
      "uniqueItems": true,
      "items": { "$ref": "#/$defs/id" }
    }
  }
}
```

The schema deliberately contains no input fields named `valid`, `verified`,
`ready`, `truth`, `authorised`,
`publishable` or `approved`. Those are validator outputs or external governance
records. The `intended_use` field is an instruction to enforce a ceiling, not
evidence that the ceiling has been reached.

The minimum role cardinalities need semantic validation because the artefact
array may contain several condition definitions, ledgers, paths and forecasts:

- exactly one agency map;
- one or more condition definitions;
- one or more complete evolution ledgers;
- exactly one signal registry;
- one or more possible paths;
- zero or more forecasts;
- exactly one preparation register;
- zero or one bundle-derived dashboard record; and
- zero or one experiment manifest.

For the first v1 fixture, using one ledger for every condition is simpler than
using a different ledger per condition. A later version can permit several
ledgers after cross-ledger clocks and atomicity are specified.

## V1 semantic crosswalk

| Canonical concept | Authoritative v1 source | Required cross-checks |
|---|---|---|
| Declared goal and scoped promise | Agency map `goal` and `outcome_scope` | Recompute one outcome-scope hash. Path, preparation and dashboard projections cannot widen people, standard, place or period. |
| Executable IF grammar | `condition-contract` v3 definition and evaluator | Agency `condition_logic`, preparation logic and path gate use must reference the same checksum-pinned AST or a declared exact subset. No prose equivalence. |
| Condition identity and history | Evolution ledger current state | Resolve manifest, full history, ledger tip, condition version and producer event. No caller verification status. |
| Actor relations | Agency map actor registry | Preparation actor, forecast owner and dashboard owner must use the same `actor_id`. Relation does not prove authority. |
| Signal and metric | Signal registry | Agency signal refs and forecast targets resolve exact signal ID, metric ID, metric checksum and estimand scope. |
| Evidence artefact | Shared content digest plus source-family lineage | Dashboard raw input, signal source, preparation evidence and forecast vintage with the same bytes share one identity even under different local names. |
| Possible path | Path definition plus condition-evaluation inputs | Every outcome route satisfies the canonical IF AST. Path remains an unscored hypothesis. |
| Forecast | Forecast record | It predicts one registered signal observation or path discriminator. It never writes condition truth or authority. |
| Action hypothesis | Agency map | Preparation action declares `implements_hypothesis_id` and preserves actor, verb, object class, condition, scope, intended signal, counter-signal and harm-signal coverage. |
| Preparation eligibility | Preparation register plus canonical evaluation run | A current true gate may create conditional eligibility only. External authority remains separate. |
| Dashboard | Deterministic bundle projection | It contains `source_bundle_id` and checksum. No independently authored condition, path, forecast or action state. |
| Experiment | Experiment manifest and shared fact pack | Every arm references one fact-pack checksum derived from one bundle. Arm presentation differs; factual payload does not. |

Evidence scopes are not always equal to outcome scope. The safe rule is:

1. a signal scope may be a declared subset of the outcome scope;
2. a narrow signal may inform a condition but cannot satisfy the whole condition
   without an explicit coverage rule and complete coverage evidence;
3. an evidence or action scope can never silently widen beyond the canonical
   outcome scope; and
4. every omitted cohort, geography, service and affected party remains visible.

## Validator rules

`integration/transition-bundle/validate.mjs` should implement these rules in
this order.

### A. Resolve trusted local bytes

1. Compile the repository-owned bundle schema. Ignore any caller schema.
2. Resolve every artefact path under the repository root.
3. Reject absolute paths, `..`, symlinks, non-regular files and role-directory
   escapes.
4. Read through a no-follow file descriptor and verify byte length and SHA-256.
5. Require each parsed artefact's ID and version to equal its manifest ref.
6. Invoke a fixed role-to-validator registry. A checksum without a registered
   semantic validator is unresolved, not valid.
7. Pin schema, validator, package lock and Node runtime metadata in the generated
   validation report. This proves reproduction context, not external trust.

### B. Establish one canonical scope and IF

1. Resolve `canonical_scope.agency_map_id` to the selected agency map.
2. Recompute its outcome-scope hash and IF-logic hash.
3. Require every selected condition ID to occur exactly once in the canonical
   logic tree.
4. Require exact canonical sets for jurisdiction, geography, cohort, service,
   affected party, start and end time after the agency schema is upgraded to
   carry each of them.
5. Treat differences in verb, object, standard or period as a new scope, never
   aliases.
6. Permit evidence subsets only under the explicit coverage rule above.

### C. Resolve evolution, definition and evaluation

1. Require complete evolution history for shadow-decision or public-information
   use. Cropped history is archival context only.
2. Require manifest hash and ledger tip to match the loaded ledger.
3. Find each current condition by exact ID and integer version.
4. Resolve its condition-producing event separately from the ledger tip.
5. Require the current state's definition ref to match the exact v3 condition
   definition checksum.
6. Re-run deterministic predicate and gate evaluation from its exact observation
   refs.
7. Keep these axes separate in output:
   `definition_lifecycle`, `ledger_status`, `gate_truth`, `freshness`,
   `evidence_grade`, `challenge_state`, `binding_integrity` and `authority`.
8. Never translate `satisfied` into externally true, `failed` into causal
   explanation, or `stale` into false.

### D. Make evolution invalidate dependants

V1 should be deliberately strict: every downstream artefact must bind the exact
current ledger manifest and tip. Any later ledger event makes the bundle stale
until it is rebuilt and reviewed.

In a later version, an unrelated `added` event may preserve a downstream result
only after machine proof of non-intersection. Narrow, split, merge, challenge,
dispute, satisfy, fail, expire, supersede or withdraw must invalidate every
affected path, forecast decision context, preparation action, dashboard record
and experimental fact pack. A retroactive correction also invalidates any
forecast or evaluation whose information cutoff intersects the corrected
window.

### E. Resolve signals and shared evidence

1. Require agency and registry signal IDs to match exactly.
2. Require the agency metric checksum to resolve to the registry estimand and
   calculation definition, not merely a similarly named measure.
3. Build one transitive evidence-family graph from checksum, publisher,
   collection process, upstream dependencies and transformations.
4. Prevent one family from filling leading and confirming roles or satisfying a
   minimum-independent-source count under aliases.
5. Require acquired bytes for any decision-linked signal.
6. Keep missing, stale, conflicted and unavailable distinct.

### F. Resolve paths without manufacturing forecasts

1. Require every path condition anchor to resolve to the loaded ledger and
   canonical scope.
2. Evaluate each entry-to-outcome route against the canonical IF AST, including
   alternative and veto semantics. Do not require all IDs when the registered
   logic permits an equivalent route.
3. Require false, unknown, stale or conflicted safety blockers to terminate or
   route to explicit review according to the canonical gate policy.
4. Preserve competing paths and discriminators.
5. Output path consistency independently from probability, causality and action
   eligibility.

### G. Resolve forecasts as observations about future evidence

1. Require each forecast binding to resolve exact forecast, signal, metric,
   condition and scope.
2. Require forecast observation window and resolution unit to match the target
   metric contract.
3. A resolved forecast creates forecast-performance evidence and may provide a
   registered signal observation. It cannot directly set condition truth.
4. Replace free-text eligible actions with preparation action IDs.
5. A probability policy may make a reversible preparation proposal eligible for
   human review. It cannot authorise, activate or represent an owner decision.
6. Keep forecast scoring denominators clustered by resolution event and shared
   evidence family.

### H. Resolve action hypotheses and preparation

1. Add `implements_hypothesis_id` to each preparation action.
2. Match actor ID, verb, object class, target condition, geography, service and
   validity period.
3. Require every intended, counter and harm signal from the agency hypothesis to
   resolve in the signal registry and preparation evidence plan.
4. Bind the preparation IF to exact condition IDs, definition refs, ledger tip,
   evaluation run and logic hash.
5. Evaluate start, stop, review, reverse and recovery gates against a trusted
   external `evaluatedAt`, not only the register's caller-chosen `as_of`.
6. Emit eligibility independently of authority. No local file may upgrade an
   external owner, mandate, consent or funding claim.

### I. Derive dashboard and experiment leaves

1. Generate the dashboard condition, signal, path, forecast and action sections
   only from the validation result.
2. Bind generated HTML and its data record to `source_bundle_id` and bundle
   checksum.
3. Reject hand-edited derived state even if it remains schema-valid.
4. Allow a non-empty path only when its loaded bytes and cross-bindings pass.
5. Show the five public prompts as prompts, not as if they were the scoped
   conditions.
6. Create a machine experiment manifest that pins the bundle, shared fact pack,
   all three rendered arms, scripts, outcome rubric, consent, support,
   adverse-event owner, safety monitor, analysis plan and preregistration anchor.
7. All arms load the same immutable factual JSON. They may not duplicate or
   rewrite fact text independently.

### J. Derive, never ingest, release status

The validator should return a matrix, not one seductive `valid` flag:

```json
{
  "bundle_integrity_valid": true,
  "scope_binding_valid": true,
  "condition_history_valid": true,
  "condition_evaluation_state": "unknown",
  "evidence_readiness": "research-only",
  "forecast_state": "issued-unresolved",
  "path_state": "hypothesis-only",
  "preparation_eligibility": "not-eligible",
  "authority_verified": false,
  "publication_eligibility": "research-draft-only",
  "experiment_readiness": "not-approved",
  "action_authorised": false
}
```

The first coherent synthetic fixture should look approximately like this. A
green integration test should not be interpreted as a green deployment gate.

## Exact TDD acceptance tests

Create `integration/transition-bundle/tests/programme-bundle.test.mjs` and begin
with these failures before implementing the validator.

### P0 identity, scope and IF tests

1. **Current-islands regression:** prove the current agency, signal, path,
   preparation and dashboard fixtures each pass their own validator, then prove
   they fail one bundle with `CROSS_SYSTEM_CONDITION_UNRESOLVED` and
   `CANONICAL_SCOPE_MISMATCH`.
2. **Condition-version mismatch:** changing integer condition version to semver,
   or vice versa, fails before path or action evaluation.
3. **Ledger-manifest mismatch:** mutate ledger ID, manifest hash, current tip,
   producer event ID and producer event hash independently; each mutation fails
   with a distinct error.
4. **Definition mismatch:** a ledger state pointing to a different condition
   definition checksum fails even when wording is identical.
5. **IF AST drift:** changing `all` to `any`, moving a `not`, changing a veto
   blocker or omitting one condition fails without relying on prose comparison.
6. **Truth-table parity:** enumerate every `true`, `false`, `unknown`, `stale`
   and `conflicted` combination through `all`, `any`, `not`, `alternative_if`
   and `veto_if`; agency, path, preparation and dashboard projections must agree
   with the canonical evaluator.
7. **Path route parity:** every outcome route must satisfy the canonical AST.
   An OR route need not visit both alternatives; an AND route must visit both;
   a true veto blocker must stop it.
8. **Outcome-scope drift:** mutate people, verb, object, standard, jurisdiction,
   geography, cohort, service, affected party or time independently; each fails
   or becomes an explicitly narrower evidence-only scope.
9. **National-from-local inference:** one SA4 signal cannot set an Australia-wide
   condition true without complete coverage evidence.

### P0 evolution and time tests

10. **Exact-tip rule:** append any event to the ledger and keep the old bundle;
    the bundle becomes stale and action-ineligible.
11. **Material-evolution invalidation:** narrowed, split, merged, challenged,
    disputed, satisfied, failed, expired, superseded and withdrawn events each
    invalidate all listed dependants until rebuilt.
12. **Overlapping new condition:** adding a different condition ID with
    intersecting scope invalidates the IF set because it may expose an omission.
13. **Retroactive correction:** a correction intersecting a forecast information
    cutoff or evaluation window invalidates the dependent result and forces a
    public correction marker.
14. **Trusted-clock expiry:** advance only validator `evaluatedAt` beyond signal
    validity, forecast deadline, action review or recovery-resource expiry. The
    historical result remains, freshness becomes stale, and current eligibility
    becomes false.
15. **Replay resistance:** an old bundle with an old `as_of` cannot regain current
    status by changing its manifest timestamp.

### P0 authority and action tests

16. **Caller verdict rejection:** extra fields such as `verified`, `ready`,
    `truth`, `authorised` or `publishable` fail schema validation.
17. **Caller schema rejection:** passing a permissive schema cannot change the
    repository-owned contract or result.
18. **Local-integrity boundary:** valid schemas, hashes and ledger history leave
    `authority_verified` and `action_authorised` false.
19. **Action implementation mismatch:** change actor, verb, object class,
    condition, geography, service or validity window between agency hypothesis
    and preparation action. Each mutation fails separately.
20. **Signal safety coverage:** removing the intended, counter or harm signal
    from a preparation implementation fails.
21. **Forecast-to-action firewall:** a high probability may produce a proposed
    review or reversible-preparation eligibility only. It cannot satisfy the
    action IF, record an owner decision or authorise action.

### P1 evidence, presentation and experiment tests

22. **Evidence alias:** two different evidence IDs and URLs with the same bytes
    cannot satisfy independence.
23. **Source-family alias:** shared publisher collection process or transitive
    upstream source cannot fill leading and confirming roles.
24. **Actor alias:** matching labels with different actor IDs do not resolve.
25. **Affected-party coverage:** every scoped affected actor appears in agency
    relations, preparation governance, dashboard projection and experimental
    safety strata, or the bundle remains blocked with an explicit omission.
26. **Typed forecast target:** forecast measure, unit, metric checksum, scope and
    observation window must match the registered signal exactly.
27. **Dashboard derivation:** hand-editing displayed condition state, path,
    probability, action status, authority wording or source ceiling breaks the
    projection checksum.
28. **Typed-path ingestion:** the dashboard accepts a non-empty path only when
    the bundle resolves and validates it; an ID and checksum without bytes fail.
29. **Prompt versus condition:** dashboard prompt categories cannot appear as
    evaluated conditions unless they are separately registered condition IDs.
30. **Experiment fact parity:** all three arms reference the same fact-pack
    checksum. Mutating one arm's fact, uncertainty, scope, source, correction or
    authority text fails.
31. **Experiment package completeness:** missing consent, withdrawal, debrief,
    support, adverse-event owner, independent safety monitor, rubric, analysis
    plan or preregistration anchor keeps readiness false.
32. **Synthetic happy path:** a fully coherent bundle passes structural
    integration while remaining research-only, hypothesis-only,
    externally-unverified and unauthorised.

Add `npm run test:integration` and place it after the subsystem suites but before
dashboard, communications and experience. Those leaves should test the derived
integrated projection, not a parallel hand-maintained world.

## Migration path

### Phase 0: restore a clean baseline

1. Reconcile the currently failing dashboard generated artefact.
2. Run the full test suite from a clean worktree.
3. Preserve every Round 03 review file and frozen manifest unchanged.
4. Record the exact commit used as the integration migration base.

### Phase 1: red integration tests and fixed loader

Add only:

- `integration/transition-bundle/schema/programme-transition-bundle.schema.json`
- `integration/transition-bundle/validator-registry.json`
- `integration/transition-bundle/validate.mjs`
- `integration/transition-bundle/tests/programme-bundle.test.mjs`
- `integration/transition-bundle/README.md`

The first test should use current fixtures as the expected failing cross-system
case. This prevents the team from hiding the migration gap by making a new
fixture immediately green.

### Phase 2: choose canonical identities without rewriting history

1. Select the existing `condition-contract` v3 and evaluator as the executable
   IF grammar.
2. Add one new coherent Australian-clerical synthetic family under new schema
   versions. Do not mutate or relabel the prior fixtures.
3. Use one condition ID, integer state version, definition ref and ledger anchor
   everywhere.
4. Add canonical cohort, actor, service, geography and evidence-artifact IDs.
5. Designate either `contracts/condition-pathway-*` or `paths/*` as the
   executable assessment owner. Recommended split: `paths/*` remains the public
   graph and `condition-pathway-assessment` remains the deterministic evaluator,
   with one exact binding. If that split cannot be stated simply, retire one
   stack before adding features.

### Phase 3: make evolution the dependency root

1. Add `condition_definition_ref` to evolution state in a new schema version.
2. Rename agency `tip_event_*` condition fields to `producer_event_*`, and bind
   the separate ledger tip and manifest.
3. Add condition ID, definition ref, manifest hash, integer condition version
   and producer event to signal and preparation bindings.
4. Implement strict exact-tip invalidation first.
5. Add a generated dependency report listing every path, forecast, action,
   dashboard and experiment invalidated by a condition event.

### Phase 4: connect evidence, forecasts and preparation

1. Add a shared evidence-family projection without replacing subsystem detail.
2. Extend forecast target binding to signal, metric, condition and path
   discriminator.
3. Replace forecast action strings with IDs.
4. Add `implements_hypothesis_id` to preparation actions.
5. Feed preparation from checksum-pinned canonical evaluation runs.
6. Keep all outputs research-only until actual acquired evidence and external
   governance exist.

### Phase 5: make the dashboard a projection

1. Change `dashboard/tools/build.mjs` to accept the validated bundle report.
2. Generate `if_path`, typed path refs, forecasts, preparation options and all
   authority labels from that report.
3. Keep legacy snapshots immutable and publish the integrated record as a new
   schema version with a correction and migration note.
4. Preserve the distinction among prompts, actual IF conditions, signals,
   forecasts, options, commitments and actions on the first screen.

### Phase 6: freeze the experiment package

1. Create a JSON experiment manifest and schema.
2. Generate one factual payload from the integrated bundle.
3. Build each arm against that same payload.
4. Freeze all materials and safety records before recruitment.
5. Keep `experiment_readiness: not-approved` until external ethics, affected-
   party, accessibility, privacy and statistical review is recorded outside the
   repository trust boundary.

### Phase 7: external review freeze

For the next central review branch, publish:

- commit SHA;
- bundle manifest SHA;
- all artefact and validator digests;
- runtime and dependency lock metadata;
- full test results;
- derived status matrix;
- open blockers;
- explicit claim and action ceilings; and
- a review brief asking reviewers to mutate cross-system seams, not only local
  schemas.

Do not merge on test count alone. Exit only when at least two independent
reviewers cannot produce an individually valid but cross-system contradictory
bundle, and every material disagreement has a disposition.

## Priority disposition

### P0 before an integrated public prototype

1. One canonical condition identity, version and IF AST.
2. Exact ledger-byte resolution and evolution invalidation.
3. Reachable derived ledger-binding state without caller self-certification.
4. Canonical scope and affected-party identity.
5. Forecast, action-hypothesis and preparation-action typed linkage.
6. Trusted runtime freshness and separated state axes.
7. Dashboard generated from the validated bundle.
8. A clean full test run.

### P1 before shadow decision use

1. Cross-system evidence-family and independence checks.
2. Actor and authority registry integration.
3. Typed path assessment ownership and removal of duplicate semantics.
4. Executable experiment manifest and fact parity.
5. External signature, mandate, consent, funding and publisher-verification
   interfaces.

## Closing position

The programme does not need a bigger dashboard first. It needs one answer to a
more basic question:

> Are these eight artefacts talking about the same people, outcome, IF, evidence,
> actor, time and possible action?

Today, the machine cannot answer yes. A v1 programme transition bundle can make
that question executable without pretending it has established truth or
authority. That is the narrowest bridge from a compelling thesis to a credible
public instrument.
