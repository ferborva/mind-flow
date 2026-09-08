# Observatory contracts

Phase 0 contracts for turning observations into owned and reversible action.
They remain separate from the dashboard snapshot contract while the model is
tested.

## Artifact separation

**The current split keeps evaluation, action governance, operational state,
computed proposals and owner events in separate checksum-bound artifacts.** An
evaluation can establish gate truth and conditional eligibility. It cannot
approve an action, change an operational lifecycle or record an owner's choice.

Condition definitions remain on schema version 3. Pure completed evaluation
runs and the evaluator move to version 3. Action records move to schema version
4 and replace the mixed `lifecycle` field with `record_lifecycle`. Evaluation
attempts remain on schema version 2. Earlier evaluation-run version 2 records
embedded lifecycle context and a transition proposal, while action version 3
mixed record governance with operational state. They must not be relabelled as
the new versions. Migration creates new artifacts and checksums while preserving
the old records. There is no automatic compatibility claim.

The protocol now separates operational concerns:

1. `condition-contract.schema.json` defines immutable scope, predicates,
   evidence requirements, gates and governance. A material edit creates a new
   `definition_version` and checksum.
2. `predicate-observation.schema.json` records one reasoned predicate state,
   evidence vintage and checksum, coverage, uncertainty and producer
   provenance. Observations are append-only facts about an assessment, not
   fields to update inside a definition.
3. `evaluation-run.schema.json` pins the exact condition definition and
   observations used, then records deterministic outputs and traces for all
   seven gates. Version 3 is a pure evaluation artifact. It contains no action,
   prior state, transition proposal or owner event.
4. `evaluation-attempt.schema.json` preserves partial and failed work without
   allowing it to masquerade as a completed run. A partial attempt has one to
   six reproducible gate outputs and at least one operational error. A failed
   attempt has errors but no successful gate output.
5. `action-contract.schema.json` binds one gate to a governed action definition.
   Version 4 uses `record_lifecycle` only: `draft`, `shadow`, `approved` or
   `retired`. It does not claim that the action is operationally active, paused,
   recovering or complete.
6. `action-lifecycle-state.schema.json` records the operational state asserted
   for one checksum-pinned action. It is separate from both the action definition
   and the evaluation run. An initial inactive assertion is explicit; every
   later state embeds the full checksum-pinned source owner event. External
   trust remains explicit.
7. `transition-proposal.schema.json` records the repository-computed proposal
   from one action, one completed evaluation run and one prior lifecycle state.
   It has no authority effect and contains no owner event.
8. `owner-transition-event.schema.json` records a later external owner event.
   It must pin the exact action, run, prior state and computed proposal, then
   enact exactly that supported transition tuple.
9. `condition-pathway-definition.schema.json` and
   `condition-pathway-assessment.schema.json` separate possible-path hypotheses
   from deterministic assessments of which paths are consistent with current
   bounded IF evidence.
10. `correction-record.schema.json` links a checksum-pinned artifact to a new
   replacement, preserves the old artifact and declares known downstream
   artifacts that must be invalidated.

The reference action is a fictional shadow record with conditional funding, no
approval and no claim of government authority. The separate lifecycle state and
owner-event records are labelled `unverified-external` because this repository
does not verify external signatures, mandates, funding or consent. Structural
validity and checksum integrity never create authority.

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

Every contract carries seven gates:

- `watch`
- `prepare`
- `act`
- `pause`
- `reverse`
- `recover`
- `graduate`

This prevents one-way triggers. A condition that can start an intervention must
also say when it pauses, reverses, recovers and ends.

### Opportunity and agency paths

The seven gates are a safety lifecycle, not a crisis taxonomy. They therefore
stay fixed in this version. An opportunity definition can use positive
predicates and bind an action with a verb such as `advance`, `enable` or `scale`
to the `act` gate. Its `verification.success` states the abundance or agency
outcome, while `graduate` requires the outcome to be durable enough to leave
temporary support.

Adding required `advance` and `scale` gates would duplicate direction in every
condition and make the smallest safe contract larger. We should revisit that
decision only if shadow pilots show that opportunity programmes need materially
different transition semantics that action verbs and outcomes cannot express.

## Condition pathways

`condition-pathway-definition.schema.json` groups positive, adverse,
measurement-alternative and recovery branches under one bounded scope. Every
branch names its IF gate tests, next discriminating predicates, forecast
relationship, early-warning readiness and operational-action boundary. A
`hypothesis-only` interpretation has no evidence references. A pathway cannot
carry a crisis score, probability, causal verdict or action command.

`condition-pathway-assessment.schema.json` pins the pathway definition and every
completed evaluation input. It records six independent axes for each branch:
definition lifecycle, gate truth, binding interpretation, path observation,
migration evidence and operational action. Several branches may remain
simultaneously consistent with the same evidence. `selection_effect: none`
prevents the assessment from silently choosing one future.

`assessConditionPathway` recomputes those branch assessments. Its output is
repository-computed, checksum-pins its registered executable dependency manifest and remains
externally unverified. A gate test must exclude at least one truth state, and a
named discriminator must affect a gate tested by that branch. Evidence,
forecast, readiness, option and participation references must resolve to
supplied checksum-pinned content. Only conditional options currently have a
registered schema and semantic validator. Every other non-empty support role
fails closed until its own validator is registered; a checksum alone does not
create a type. The five readiness roles cannot be collapsed into one artifact.
A `candidate-only` operational action must reference a separate conditional
option contract, and the branch must test the option's bound gate with `true`
among its expected states. `none` contains no option reference. Neither state
approves, activates or recommends an action.

## Action contract

`action-contract.schema.json` binds one condition gate to a verb and object. A
`prepare` binding is distinct from both observation and material action, and
must describe only bounded, low-regret and reversible readiness work. The
contract requires an accountable owner, authority, funding state, response SLA,
appeal route, verification outcome, communications and expiry. Version 4
`record_lifecycle` describes governance of the action definition only. An
`approved` record must have at least one approver and secured funding, but it is
still not an operational-state claim.

Operational lifecycle belongs only in `action-lifecycle-state.schema.json`.
That record pins the exact action and uses the closed
`action-transition-lifecycle/1.0.0` vocabulary: `inactive`, `watching`,
`preparing`, `active`, `paused`, `reversing`, `recovering` or `graduated`. Its
timestamp must precede the evaluation used for a new transition proposal.
Every non-initial state embeds its full `unverified-external` source owner event
and a checksum reference to that event. This preserves inspectable lineage but
does not verify that the external event truly occurred. Reuse rejects a source
event whose owner, transition tuple, prior lifecycle, role-specific reference
version, action approval window or deterministic resulting-state ID conflicts
with the bound action.

The pinned gate-truth state must be `true`, and its orthogonal eligibility must
also pass: phase eligibility for `prepare` or `act`, duty eligibility for
`watch` or `recover`, exit eligibility for `graduate`, and winning safety
precedence for `pause` or `reverse`. These results permit computation of a
proposal only. They are not approval, authority, activation or a command.

The fixtures are synthetic test contracts, not policy proposals and not evidence
that the example thresholds are valid. Their thresholds explicitly remain in
shadow mode until retrospective calibration and affected-community review.

## Integrity and semantic validation

JSON Schema validates each artifact's shape. `semantic-validation.mjs` validates
the relationships that Schema cannot establish alone: definition references,
gate and observation references, checksums, date order, evidence timing,
coverage minimums, source and quality policy, uncertainty bounds, probability
policy, action lifetime and funding lifetime. `validateEvaluationBundle`
re-evaluates every gate and requires the stored state, trace and condition
resolution to match exactly. For an approved, active or paused condition, no
approval may predate definition creation or follow the start of validity. Equal
second-resolution timestamps are permitted; the checksum dependency preserves
content order. Evaluation validation does not inspect or create an action
lifecycle.

`validateTransitionBundle` separately recomputes a transition proposal from the
exact action, matching completed run and prior action state. A proposal cannot
predate action validity or approval, or outlive secured funding.
`validateOperationalActionState` then requires an owner event recorded no
earlier than the proposal only when the proposed lifecycle differs from the
prior lifecycle. Equal second-resolution timestamps are permitted because the
event checksum-pins the proposal. Its four checksum-bound references and
transition tuple must match that proposal exactly. An unchanged
proposal preserves the prior state and must not invent an owner event or state.
A change must also bind the exact lifecycle state deterministically derived
from the event. Any event remains `unverified-external`; passing validation
proves internal consistency, not the truth, legality or authority of the
external assertion.

`validateConditionPathwayDefinition` checks branch kinds, unique identifiers,
condition and predicate references, non-repeated gate hypotheses, scope and
validity dates.
`validateConditionPathwayBundle` recomputes every assessment from its pinned
evaluation inputs without selecting a winning branch or importing action
authority.

Completed runs, attempts and possible-path assessments pin a registered
evaluator ID, version and executable-manifest digest from
`evaluator-registry.json`. The manifest pins the bytes of the pathway
interpreter, every directly imported semantic validator, the schemas they
enforce and the package lock. Loading the interpreter fails closed if the
manifest or any declared dependency drifts. This provenance identifies the
repository computation. It does not validate external truth or grant action
authority. A canonical projection of the evaluator registry is also pinned,
with only the pathway manifest's self-referential digest omitted. Duplicate
pathway registrations, registry drift, path aliases, path traversal and
symlink escape fail closed.

This manifest covers repository bytes only. It does not attest installed npm
package bytes or the Node runtime. `package-lock.json` constrains declared
dependency resolution, but a clean execution environment and its runtime must
be recorded and independently attested before reproducibility is claimed.

The registry is repository-local and has
`authority_effect: none`; it establishes reproducibility, not external trust.
Generated proposal, resulting-state and assessment IDs also include the full
digest of their identity inputs, so same-instant records over different inputs
cannot silently collide.

`validateEvaluationAttempt` applies the same definition, observation, date and
deterministic-output checks to the subset an attempt claims to have completed.
An attempt is operational evidence only. It cannot satisfy the completed-run
schema or authorise an action.

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

Tests compile all versioned schemas with Ajv's JSON Schema 2020-12 implementation,
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

### Deterministic condition resolution

`evaluateGates` emits a `condition_resolution` record whose fields are deliberately
non-authorising and orthogonal:

1. `safety_control` is `reverse`, then `pause`, then lifecycle-neutral
   `precautionary_hold` when a hard safeguard is unresolved, otherwise `none`.
2. `candidate_phase` is the highest true phase in `act`, `prepare`, `watch`
   order. It remains visible even when safety blocks it.
3. `concurrent_duties` keeps true `watch` and `recover` duties visible. Recovery
   may therefore continue beside pause or reversal.
4. `exit_candidate` records a true graduation condition without treating it as
   an executed exit.
5. `transition_conflicts` records `act_and_graduate` or
   `recover_and_graduate`. Either conflict fails closed.
6. `candidate_phase_eligible`, `concurrent_duties_eligible` and
   `exit_candidate_eligible` state eligibility on their own axes. This keeps a
   recover-only or graduate-only result meaningful, and lets recovery remain
   eligible during pause or reversal. No eligibility field changes authority.

`proposeTransition` combines the immutable condition resolution with one exact
action record, one checksum-bound prior action state and the completed
evaluation run. The prior state must not postdate the evaluation, and the
proposal must not predate it. The resulting
`transition-proposal.schema.json` artifact pins all three inputs and records its
generation time, proposed lifecycle, conflicts and concurrent duties. It does
not accept, predict or embed an owner event.

Consequential proposals require all seven valid gate results, no evaluation
errors, exact recomputation of the stored resolution and eligibility on the
action's relevant axis. An unresolved safeguard proposes a precautionary pause
only from a preparing, active or recovering lifecycle; inactive and watching
states merely hold. Active support is not withdrawn merely because `act` later
becomes false. Paused work can only be proposed for resumption when `act` is
true and the hard safeguards are current and false. Reversing and graduated
records never reactivate from a new gate evaluation. A recovering lifecycle can
produce a recovery-exit proposal only when the relevant `act` or `graduate`
eligibility passes. Until then it remains recovering.

Every proposal has `authority_effect: none`, `automatic_transition: false` and
`automatic_support_withdrawal: false`. When the proposed lifecycle changes, a
later `owner-transition-event.schema.json` record must pin the exact action,
evaluation run, prior state and proposal, occur no earlier than the proposal,
name the same owner and exactly enact a supported from/to tuple. When it does
not change, the prior state remains the state of record and no transition event
is applicable. Even then, this repository records any event as
`unverified-external`. It does not verify the owner's identity, legal authority,
funding, consent or real-world execution.

The public compiler must bind `actor reference + verb + bounded object and
scope + gate reference + condition checksum`. Without a verified commitment it
renders a conditional proposition such as `[PROPOSED, NOT AUTHORISED] The named
actor could consider [verb] [object]`. It never emits a subjectless imperative.

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
