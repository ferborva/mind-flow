# Coherent transition migration

## Current verdict

The executable IF boundary is available in transition-bundle schema 1.2. It
binds typed claims, dated definitions, exact signals, evidence quality,
evidence lifecycle, five-valued evaluation and content-addressed receipts. The
synthetic structural migration is complete: every subsystem artifact is derived
from the kernel's active condition set and each cross-contract join is verified.
This does not close any real-world truth or legitimacy gate.

The current Round 03 records must not be relabelled as coherent. Their native
condition IDs describe different examples. Round 04 therefore derives eight new
fixtures from one canonical synthetic transition without weakening identity
checks or translating unrelated IDs by assertion.

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
| Executable IF | `canonical.executable_if_ref` binds kernel bytes, evaluator identity, active definitions and the current evidence-state tip. | Replace synthetic observations only through a governed acquisition boundary. |
| Outcome logic | `canonical.outcome_logic_ref` binds the exact agency-map IF AST. | Independent review of construct and decision validity. |
| Scope | `canonical.scope_manifest_ref` and `scope_bindings` bind distinct agency and path native hashes to separately hashed mappings. | Keep mapping truth false until independently assessed. |
| Evolution | The v2 assessment overlay binds the exact complete kernel definition history, active definitions, producer events and evidence-state tip without copying definition ownership. | Test whether independent encoders reproduce the history and state. |
| Preparation | Condition binding names condition ID, native version, ledger manifest and producer event ID and hash. | Affected-party, feasibility, rights and real-authority review. |
| Forecast | Target binds signal ID, metric ID and checksum, condition ID and scope hash. | Prospective issuance, resolution and scoring with no operational consequence. |
| Dashboard | The complete core adds the exact projection of a coherent pre-projection bundle without self-reference. | Public comprehension, accessibility and rendered-parity testing. |
| Experiment | A fixed manifest validator checks exact source bytes, fact-pack parity, arms and safety stops. | A later envelope plus independent protocol approval before recruitment. |

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
3. Select one synthetic active condition set and project its v2 evolution
   overlay. **Done.**
4. Generate agency, signal, path, forecast and preparation fixtures
   from those identities. **Done.**
5. Freeze a seven-artifact pre-projection core so the dashboard can safely name
   source bytes without a self-reference. **Done.**
6. Build the dashboard snapshot from that frozen source, then form the final
   eight-artifact core with an explicit acyclic derivation reference. **Done.**
7. Make the complete-core acceptance check green without changing its false
   truth, authority, action and publication assertions. **Done.**
8. Freeze the exact shared experiment fact pack and five-state semantics.
   **Done.** Recruitment, analysis and rendered parity remain blocked.
9. Define a separate experiment-envelope contract and obtain independent
   protocol approval before recruitment.
10. Only then connect empirical evidence, institutional authority and public
    claims through separately reviewed gates.

Run the ordinary integration safety suite with:

```sh
npm run test:integration
```

Run the migration acceptance contract with:

```sh
npm run test:integration:migration
```
