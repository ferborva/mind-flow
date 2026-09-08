# Observatory contracts

Phase 0 contracts for turning an observation into an owned and reversible action.
They are deliberately separate from the dashboard snapshot contract while the
model is tested.

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
also say when the intervention pauses, reverses, recovers and ends.

## Action contract

`action-contract.schema.json` binds one condition gate to a verb and object. It
requires an accountable owner, authority, funding state, response SLA, appeal
route, verification outcome, communications and expiry. Approved or active
actions must have at least one approver and secured funding.

The fixtures are illustrative contracts, not policy proposals and not evidence
that the example thresholds are valid. Their thresholds explicitly remain in
shadow mode until retrospective calibration and affected-community review.

## Validate

```bash
npm install
npm run test:contracts
npm test
```

Tests compile both schemas with Ajv's JSON Schema 2020-12 implementation, pass
the valid fixtures, and prove that ambiguous states, missing scope, missing
evidence policy, missing appeals, missing SLAs and unfunded approvals fail.

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
