# Observatory contracts

Phase 0 contracts for turning observations into owned and reversible action.
They remain separate from the dashboard snapshot contract while the model is
tested.

## Artifact separation

Version 2 intentionally breaks the original condition contract. The repository
is pre-release, and preserving a 1.x shape that mixed policy with mutable state
would imply safety that it did not provide. There is no automatic 1.x
compatibility claim.

The protocol now separates operational concerns:

1. `condition-contract.schema.json` defines immutable scope, predicates,
   evidence requirements, gates and governance. A material edit creates a new
   `definition_version` and checksum.
2. `predicate-observation.schema.json` records one reasoned predicate state,
   evidence vintage and checksum, coverage, uncertainty and producer
   provenance. Observations are append-only facts about an assessment, not
   fields to update inside a definition.
3. `evaluation-run.schema.json` pins the exact condition definition and
   observations used, then records deterministic outputs and traces for all six
   gates. Only this completed, reproducible artifact is decision-ready.
4. `evaluation-attempt.schema.json` preserves partial and failed work without
   allowing it to masquerade as a completed run. A partial attempt has one to
   five reproducible gate outputs and at least one operational error. A failed
   attempt has errors but no successful gate output.
5. `correction-record.schema.json` links a checksum-pinned artifact to a new
   replacement, preserves the old artifact and declares known downstream
   artifacts that must be invalidated.

The action contract also pins the definition ID, version and checksum. The
reference action is a fictional shadow proposal with conditional funding, no
approval and no claim of government authority.

## Condition grammar

> **Actor + verb + object, IF evidence conditions hold, with equivalent routes
> and veto blockers named separately, UNTIL recovery conditions hold.**

`condition-contract.schema.json` makes every scope, threshold, observation
window and evidence requirement explicit. Conditions use five-valued state:
`true`, `false`, `unknown`, `stale` or `conflicted`. Missing evidence must never
silently become `false`.

Within this package, those values belong to two explicit axes:

- **predicate truth** is the evidence-resolved state of one predicate;
- **gate truth** is the deterministic result of combining predicate-truth
  inputs.

They are not lifecycle, measurement, binding or evidence-grade states. The JSON
property remains `state` in versioned observation and evaluation records for
compatibility, while schema definitions and action requirements name the axis.
Migration of dashboard and pilot state vocabularies is outside this contract
repair and remains incomplete.

Every contract carries six gates:

- `watch`
- `act`
- `pause`
- `reverse`
- `recover`
- `graduate`

This prevents one-way triggers. A condition that can start an intervention must
also say when it pauses, reverses, recovers and ends.

### Opportunity and agency paths

The six gates are a safety lifecycle, not a crisis taxonomy. They therefore
stay fixed in this version. An opportunity definition can use positive
predicates and bind an action with a verb such as `advance`, `enable` or `scale`
to the `act` gate. Its `verification.success` states the abundance or agency
outcome, while `graduate` requires the outcome to be durable enough to leave
temporary support.

Adding required `advance` and `scale` gates would duplicate direction in every
condition and make the smallest safe contract larger. We should revisit that
decision only if shadow pilots show that opportunity programs need materially
different transition semantics that action verbs and outcomes cannot express.

## Action contract

`action-contract.schema.json` binds one condition gate to a verb and object. It
requires an accountable owner, authority, funding state, response SLA, appeal
route, verification outcome, communications and expiry. Approved or active
actions must have at least one approver and secured funding. An active action
also requires a complete gate evaluation. Its gate-truth state must be `true`,
and an action bound to `act` remains blocked unless the deterministic safety
resolution permits activation.

The fixtures are synthetic test contracts, not policy proposals and not evidence
that the example thresholds are valid. Their thresholds explicitly remain in
shadow mode until retrospective calibration and affected-community review.

## Integrity and semantic validation

JSON Schema validates each artifact's shape. `semantic-validation.mjs` validates
the relationships that Schema cannot establish alone: definition references,
gate and observation references, checksums, date order, evidence timing,
coverage minimums, source and quality policy, uncertainty bounds, probability
policy, action lifetime and funding lifetime. It also re-evaluates every gate
and requires the stored state, trace and action resolution to match exactly.

`validateEvaluationAttempt` applies the same definition, observation, date and
deterministic-output checks to the subset an attempt claims to have completed.
An attempt is operational evidence only. It cannot satisfy the completed-run
schema or authorize an action.

`validateCorrectionChain` checks a supplied, closed artifact bundle. It verifies
checksums, references, time order, preserved condition and predicate scope,
linear acyclic replacement chains and explicit invalidation of every known run
or attempt that directly consumed a corrected observation. A correction never
edits its predecessor.

`checksumJson` uses the project's sorted-key canonical JSON encoding. It is
deterministic within this implementation, but it is not yet an interoperability
claim such as RFC 8785.

## Validate

```bash
npm install
npm run test:contracts
npm test
```

Tests compile all six schemas with Ajv's JSON Schema 2020-12 implementation,
pass the valid fixtures, and prove that invalid state, scope, evidence, dates,
references, traces, reversibility, appeals, SLAs and funding fail visibly.

## Evaluate

`evaluator.mjs` is a pure interpreter for condition expressions. It receives a
map of already-resolved predicate states and combines them using explicit
five-valued truth tables. It performs no fetching, threshold comparison or
clock access.

```js
import { evaluateGates } from "./contracts/evaluator.mjs";

const result = evaluateGates(conditionContract, {
  "access-falling": "true",
  "output-rising": "true",
  "authority-suspended": "false"
});
```

The result keeps `unknown`, `stale` and `conflicted` distinct. Each gate returns
the evaluated state, predicate trace, decisive predicates, uncertain predicates,
logically skipped predicates and structural errors. An invalid expression,
undeclared predicate or missing predicate state returns `state: null` with an
error. It never masquerades as evidence uncertainty.

Two operators replace the ambiguous word `unless`:

- `alternative_if` means `condition OR alternative`. The alternative must be an
  authorised route to an equivalent protected outcome.
- `veto_if` means `condition AND NOT blocker`. The blocker is checked first, so
  a true blocker decisively prevents the condition from passing.

`unless` is not valid schema and the evaluator returns `DEPRECATED_UNLESS`
rather than guessing which meaning was intended. `all` stops only on `false`;
`any` stops only on `true`. Validation still checks the whole expression before
evaluation, so a malformed branch cannot hide behind short-circuiting.

### Complete operator truth tables

Rows are the primary `condition`. Columns are the `alternative` or `blocker`.
`T` is true, `F` is false, `U` is unknown, `S` is stale, and `C` is conflicted.

`alternative_if = condition OR alternative`:

| condition \\ alternative | T | F | U | S | C |
|---|---|---|---|---|---|
| T | T | T | T | T | T |
| F | T | F | U | S | C |
| U | T | U | U | U | U |
| S | T | S | U | S | U |
| C | T | C | U | U | C |

`veto_if = condition AND NOT blocker`:

| condition \\ blocker | T | F | U | S | C |
|---|---|---|---|---|---|
| T | F | T | U | S | C |
| F | F | F | F | F | F |
| U | F | U | U | U | U |
| S | F | S | U | S | U |
| C | F | C | U | U | C |

### Deterministic action safety

`evaluateGates` also emits `action_resolution` from the gate-truth outputs:

1. `reverse=true` selects reverse and blocks activation.
2. Otherwise, `pause=true` selects pause and blocks activation.
3. Otherwise, any `unknown`, `stale`, `conflicted` or invalid hard safeguard
   blocks activation with `no_action`.
4. Only `act=true` with both hard safeguards false permits activation.
5. Recovery and graduation remain visible as eligible gates, but cannot
   override a hard safeguard.

## Known limits before operational use

- Append-only storage is not enforceable by JSON Schema. Correction validation
  can only reason over the history supplied to it, so a repository or ledger
  must prevent edits and provide a complete artifact set.
- Correction impact discovery currently covers direct observation consumers in
  known runs and attempts. Transitive action, communication and external-system
  invalidation remain orchestration responsibilities.
- Checksums are recorded but source bytes, signatures and producer attestations
  are not yet verified.
- Predicate observations are reasoned inputs. This package does not yet compute
  raw signal windows, thresholds, persistence or maximum age.
- Coverage units remain declared text. Cross-provider unit ontologies and
  conversion rules are not yet defined.
