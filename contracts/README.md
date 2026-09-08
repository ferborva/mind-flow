# Observatory contracts

Phase 0 contracts for turning observations into owned and reversible action.
They remain separate from the dashboard snapshot contract while the model is
tested.

## Artifact separation

Version 2 intentionally breaks the original condition contract. The repository
is pre-release, and preserving a 1.x shape that mixed policy with mutable state
would imply safety that it did not provide. There is no automatic 1.x
compatibility claim.

The protocol now separates three concerns:

1. `condition-contract.schema.json` defines immutable scope, predicates,
   evidence requirements, gates and governance. A material edit creates a new
   `definition_version` and checksum.
2. `predicate-observation.schema.json` records one reasoned predicate state,
   evidence vintage and checksum, coverage, uncertainty and producer
   provenance. Observations are append-only facts about an assessment, not
   fields to update inside a definition.
3. `evaluation-run.schema.json` pins the exact condition definition and
   observations used, then records deterministic outputs and traces for all six
   gates. A correction is a new observation and run.

The action contract also pins the definition ID, version and checksum. The
reference action is a fictional shadow proposal with conditional funding, no
approval and no claim of government authority.

## Condition grammar

> **Actor + verb + object, IF evidence conditions hold, UNLESS exceptions apply,
> UNTIL recovery conditions hold.**

`condition-contract.schema.json` makes every scope, threshold, observation
window and evidence requirement explicit. Conditions use five-valued state:
`true`, `false`, `unknown`, `stale` or `conflicted`. Missing evidence must never
silently become `false`.

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
actions must have at least one approver and secured funding.

The fixtures are synthetic test contracts, not policy proposals and not evidence
that the example thresholds are valid. Their thresholds explicitly remain in
shadow mode until retrospective calibration and affected-community review.

## Integrity and semantic validation

JSON Schema validates each artifact's shape. `semantic-validation.mjs` validates
the relationships that Schema cannot establish alone: definition references,
gate and observation references, checksums, date order, evidence timing,
coverage minimums, source and quality policy, uncertainty bounds, probability
policy, action lifetime and funding lifetime. It also re-evaluates every gate
and requires the stored state and trace to match exactly.

`checksumJson` uses the project's sorted-key canonical JSON encoding. It is
deterministic within this implementation, but it is not yet an interoperability
claim such as RFC 8785.

## Validate

```bash
npm install
npm run test:contracts
npm test
```

Tests compile all four schemas with Ajv's JSON Schema 2020-12 implementation,
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

`unless` has the exact meaning `condition AND NOT exception`. The evaluator
checks the exception first because a true exception decisively blocks the
condition. `all` stops only on `false`; `any` stops only on `true`. A validation
pass still checks the entire expression before evaluation, so a malformed branch
cannot hide behind short-circuiting.

## Known limits before operational use

- Append-only storage and correction chains require a persistence layer and are
  not enforceable by JSON Schema.
- Checksums are recorded but source bytes, signatures and producer attestations
  are not yet verified.
- Predicate observations are reasoned inputs. This package does not yet compute
  raw signal windows, thresholds, persistence or maximum age.
- The evaluation-run contract records completed runs only. Failed or partially
  available runs need a separate operational record.
- Coverage units remain declared text. Cross-provider unit ontologies and
  conversion rules are not yet defined.
