# Coherent transition migration

## Verdict

The current subsystem contracts cannot produce one honest coherent bundle.
They can each validate local records, but they do not yet expose enough typed
identity to prove that those records describe the same condition, population,
decision window, evidence state and intervention.

The acceptance suite in `tests/pending/coherent-bundle.acceptance.mjs` records
the missing contracts. It is intentionally red. Making it green by deleting a
cross-check, treating prose as an identifier or trusting a caller assertion is
not an acceptable migration.

## Safety invariants

Every migration must preserve these invariants:

1. Existing component validators stay fixed and continue to reject invalid
   native records.
2. Every retained artifact is content-addressed and validated by repository
   code selected by the assessor, never by the caller.
3. A coherent synthetic bundle proves referential and semantic consistency. It
   does not prove empirical truth, democratic authority or permission to act.
4. `truth`, `authority`, `publication_approved` and `action_authorised` remain
   false for the synthetic acceptance fixture.
5. A timestamp written into a manifest cannot certify its own trust. Freshness
   requires a verifier-controlled clock or a separately validated attestation.
6. Native scope hashes are not compared as if they shared a hash domain. A
   canonical scope manifest must bind each native scope and make every mapping
   explicit.

## Required contract migrations

| Boundary | Current blocker | Minimum contract change | Acceptance proof |
| --- | --- | --- | --- |
| Canonical condition | Agency, evolution, paths and signals use unrelated IDs and incompatible version types | Define one immutable condition-definition reference with an ID, definition digest and native references. Keep native version types rather than coercing them. | All downstream references resolve to the same definition digest through the evolution root. |
| Scope | Agency and path scope hashes cover different structures and domains | Add a content-addressed canonical scope manifest containing population, geography, time window, intervention and exclusions. Bind each role to its native scope hash plus a declared mapping. | The assessor recomputes every native hash and validates each mapping to the canonical dimensions. |
| Evolution | A condition state has no immutable link to the executable IF definition | Require `condition_definition_ref` on every current state and event result in `contracts/evolution/schema/condition-evolution-ledger.schema.json`. | History replay ends at the exact condition definition used by all downstream artifacts. |
| Preparation | `condition_binding` names ledger tips but omits the condition identity and producer event | Require `condition_id`, `condition_version`, `ledger_manifest_hash`, `producer_event_id` and `producer_event_hash` in `preparation/schema/preparation-register.schema.json`. | Each action and stop rule resolves to one historical condition state, not just nearby prose. |
| Forecast | The closed target object cannot identify a signal metric, condition or scope | Require `signal_id`, `metric_id`, `metric_checksum`, `condition_id` and `scope_hash` in `forecasts/schema/binary-forecast.schema.json`. | Forecast resolution verifies the registered metric checksum and canonical condition and scope. |
| Dashboard | Snapshot validation rejects every nonempty possible-path reference | Add `source_transition_bundle` to the snapshot schema, resolve content-addressed path references during build and render them as a derived projection. | The built snapshot exposes positive, adverse, refusal and recovery paths from the same bundle. |
| Experiment | The comparison is governed by prose tests, not an executable manifest | Add `experiments/observatory-comparison/schema/experiment-manifest.schema.json` plus a fixed semantic validator. Require `source_transition_bundle`, `fact_pack`, `arms` and `safety`. | Both arms consume the same immutable fact pack and carry explicit stop and contamination rules. |
| Freshness | The manifest could previously label its own clock trusted | Keep manifest clocks operator-supplied and untrusted. Add a verifier-controlled clock input or a separately content-addressed time attestation with a fixed validator. | Changing manifest fields alone can never open the freshness gate. |

## Integration contract after the component migrations

Evolve the bundle schema rather than overloading the current scalar hashes. A
versioned successor should contain:

- `canonical.condition_definition_ref`, the content address of the executable
  IF definition;
- `canonical.scope_manifest_ref`, the content address of the complete bounded
  scope;
- `scope_bindings`, one entry per role with the canonical manifest reference,
  native scope hash and content-addressed mapping;
- `bindings`, native condition, version, metric, event and bundle references as
  applicable;
- `artifacts`, retaining exact bytes and fixed validator roles;
- an evaluator-supplied time attestation result that is not writable as a
  trusted manifest claim.

The assessor should resolve the graph in this order:

```text
condition definition -> evolution history -> agency options
                     -> signal metrics -> possible paths -> forecasts
                     -> preparation actions -> dashboard projection
                     -> governed experiment
```

Any unresolved edge keeps the relevant gate closed and keeps the whole bundle
incoherent. Error codes must identify the failed edge so a public interface can
say what is known, what is missing and what would change the assessment.

## Delivery sequence

1. Agree the canonical condition and scope manifests using one synthetic,
   explicitly non-empirical transition.
2. Land the evolution and preparation identity fields with validator tests.
3. Land forecast target bindings with registry-resolution tests.
4. Land dashboard bundle and path resolution with build tests.
5. Land the experiment manifest, fact-pack parity and safety validator.
6. Add verifier-controlled time handling to this integration boundary.
7. Create `fixtures/coherent.synthetic.json`, pin every artifact digest and make
   the pending acceptance suite green without changing its safety assertions.
8. Only then connect empirical evidence, institutional authority and public
   claims through separately reviewed gates.

Run the ordinary integration safety suite with:

```sh
npm run test:integration
```

Run the migration acceptance contract with:

```sh
npm run test:integration:migration
```

The second command must remain red until all required subsystem migrations and
the coherent synthetic fixture exist.
