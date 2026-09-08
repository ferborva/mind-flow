# Coherent transition migration

## Current verdict

The executable IF boundary is available in transition-bundle schema 1.2. It
binds typed claims, dated definitions, exact signals, evidence quality,
evidence lifecycle, five-valued evaluation and content-addressed receipts. The
remaining work is migration: derive every subsystem artifact from the kernel's
active condition set and prove each cross-contract join.

The current Round 03 records must not be relabelled as coherent. Their native
condition IDs describe different examples. The next step is to derive eight
new fixtures from one canonical synthetic transition, not to weaken identity
checks or translate unrelated IDs by assertion.

## Safety invariants

1. Existing component validators stay fixed and reject invalid native records.
2. Every retained artifact is content-addressed and validated by repository
   code selected by the assessor.
3. A coherent synthetic core proves referential and semantic consistency. It
   does not prove empirical truth, democratic authority or permission to act.
4. `truth`, `authority`, `publication_approved` and `action_authorised` remain
   false for every synthetic acceptance fixture.
5. A manifest timestamp cannot certify its own trust. Freshness is a separate
   gate.
6. Native scope hashes remain in their original domains. A canonical scope
   manifest maps them without pretending their bytes or structures are equal.
7. An experiment that references a core bundle cannot be embedded in that same
   content-addressed core.

## Landed interfaces

| Boundary | Contract now available | Remaining integration work |
| --- | --- | --- |
| Executable IF | `canonical.executable_if_ref` binds kernel bytes, evaluator identity and active definitions. | Bind its scope, signals and definition lineage to every downstream artifact. |
| Outcome logic | `canonical.outcome_logic_ref` binds the exact agency-map IF AST. | Regenerate the agency map from the active executable condition set. |
| Scope | `canonical.scope_manifest_ref` and `scope_bindings` bind distinct agency and path native hashes to separately hashed mappings. | Extend mappings when other native contracts expose scope hashes. Keep mapping truth false until independently assessed. |
| Evolution | Every event state, folded current state and public condition carries a recomputed `condition_definition_ref`. | Build evolution events for the canonical synthetic condition set. |
| Preparation | Condition binding names condition ID, native version, ledger manifest and producer event ID and hash. | Point a synthetic register at the new evolution ledger. |
| Forecast | Target binds signal ID, metric ID and checksum, condition ID and scope hash. | Issue a synthetic forecast against the canonical signal and scope. |
| Dashboard | Snapshot binds a source transition bundle and resolves possible paths. | Build a projection from the coherent synthetic core without creating a self-reference. |
| Experiment | A fixed manifest validator checks exact source bytes, fact-pack parity, arms and safety stops. | Put it in a later envelope after fact packs expose canonical condition and scope references. |

## Core resolution order

The eight-artifact core must resolve in this order:

```text
canonical IF definition -> evolution history -> agency options
                        -> signal metrics -> possible paths -> forecasts
                        -> preparation actions -> dashboard projection
```

Any unresolved edge keeps the related gate closed and keeps the core
incoherent. Error codes must identify the failed edge so a public interface can
say what is known, what is missing and what observation or decision would
change the assessment.

The current operator-supplied clock leaves `freshness` false. It should not be
turned into a caller claim. Either freshness remains an independent closed gate,
or a later verifier supplies a separately validated time attestation.

## Experiment envelope

The experiment layer must be acyclic:

```text
frozen coherent core -> typed shared fact pack -> experiment manifest
                     \__________________________ experiment envelope
```

The envelope content-addresses the already frozen core and experiment manifest.
The fact pack must name the core's canonical condition IDs,
`outcome_logic_ref` and `scope_manifest_ref`. The envelope assessor then
checks those references against the frozen core. Manifest validity alone is not
enough, and recruitment remains blocked.

## Next delivery sequence

1. Freeze the hostile-tested executable IF kernel and evidence fold. **Done.**
2. Bind the kernel into transition-bundle schema 1.2. **Done.**
3. Select one synthetic active condition set and canonical scope manifest.
4. Generate evolution, agency, signal, path, forecast and preparation fixtures
   from those identities.
5. Freeze a seven-artifact pre-projection core so the dashboard can safely name
   source bytes without a self-reference.
6. Build the dashboard snapshot from that frozen source, then form the final
   eight-artifact core with an explicit acyclic derivation reference.
7. Add `fixtures/coherent.synthetic.json` and make the core acceptance check
   green without changing its false truth, authority, action and publication
   assertions.
8. Define a separate experiment-envelope contract after the typed fact-pack
   interface lands.
9. Only then connect empirical evidence, institutional authority and public
   claims through separately reviewed gates.

Run the ordinary integration safety suite with:

```sh
npm run test:integration
```

Run the migration acceptance contract with:

```sh
npm run test:integration:migration
```
