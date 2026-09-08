# Early-action preparation contract

This directory turns a warning into a question that people can inspect:

> **Proposal: _verb_ _object_ within _jurisdiction, geography, cohort, service and affected parties_ IF _conditions_. This record does not authorise action.**

It is a proposal, not an instruction. A structurally conformant record does not authorise anyone, establish that evidence is true, verify an actor's identity, or prove that an intervention works. It makes the proposed choice and its missing prerequisites visible before pressure collapses deliberation.

## What every proposal must answer

| Public question | Contract binding |
|---|---|
| Who may choose? | Named actor, claimed accountable owner and structured capability boundary |
| Do what? | Controlled verb plus a concrete object |
| For whom and where? | Exact jurisdiction, geography, cohort, service, affected-party and exclusion scope |
| Under what IF? | Content-addressed expression, canonical evolution-ledger tip and typed-observation evaluation |
| Based on what? | Content-addressed artefacts, typed observations, limitations and uncertainty |
| Who bears the consequences? | Exact scope coverage, party-specific testimony, visible objections and omissions |
| Can it actually be delivered? | Quantified funding, capacity validity and committed cross-actor dependencies |
| When does it start, stop and face review? | Typed gates whose evidence references resolve in the register |
| Can harm be undone? | Reversibility class, residual harm and funded recovery path |
| What if we do nothing? | Symmetric, evidence-bound estimates with a machine-derived comparison |

An IF result is eligibility evidence only. Every observation binds its construct,
population, geography, statistical unit, denominator, period and aggregation to
the action, expression and evaluation scope. The validator applies each
registered operator and threshold only to matching observations inside the
declared window. Only sources contributing matching, current observations count
toward independence. Insufficient, future, expired or out-of-scope observations
compute to `unknown`. It then recomputes the IF logic. This proves only that the
result follows from the supplied bytes. It does not prove that those bytes
describe the world.

Typed logic must reference every declared clause exactly once. Public IF text is
a deterministic rendering of those exact clauses and operators, so a smoother
paraphrase cannot silently omit or duplicate a condition.

A proposal may remain structurally publishable while its IF result is `false`, `unknown` or `conflicted`, because planning may start before a crisis. Action cannot start through this record. The bound result must be `true` before any separate decision process considers execution. Funding, readiness, affected-party treatment and lawful authority remain independent gates, and `authorisation_effect` stays `none`.

Condition evolution is not reimplemented here. Every expression pins a canonical evolution-ledger URI, tip event and tip hash. The synthetic fixture marks those bindings `external-unverified`. Version 1 therefore rejects all `shadow-decision` and `public-decision` use until a complete ledger can be verified through the canonical ledger contract.

## Four scales, four boundaries

The fixture shows individual, community, institution and country proposals. Each actor declares structured capabilities by verb, object class, jurisdiction, geography and service. A proposal must fit one capability exactly. The public description remains prose and cannot override this scope. A personal plan cannot bind a community. A community cannot promise institutional delivery. An institution cannot invent public authority. A country-level actor still depends on institutions and cannot erase individual rights.

Cross-actor dependencies record a request, offer, commitment or refusal. They never translate coordination into command.

## Reversibility first

Preparation is reversible by default. Reversible and partially reversible
proposals reserve quantified recovery funding and capacity through an explicit
completion deadline after the action. The declared reservation must agree with
the action's actual funding and capacity validity. Irreversible proposals face
a higher structural bar: validated evidence classification, a caller-asserted
authority basis, an independent-review reference, secured resources, committed
dependencies and consent or a challengeable necessity evaluation for each
burdened party. Necessity is derived from party, exact scope, evidence, competing
alternatives, least-restrictive selection, dissent, expiry, reviewer and appeal
bindings. A caller-provided `passed` label cannot satisfy the gate. These are
recorded claims, not external verification.

"Recoverable" does not mean harmless. Every proposal states residual harm and an explicit remedy route.

## Narrow emergency containment

The exception is limited to `pause`, `protect` or `provide`. It requires typed start and stop gates, a recorded imminent threat, necessity, the least restrictive alternative, proportionality, distinct rights safeguards, a caller-asserted authority basis, a reviewer claimed to be structurally independent, positive funding, current quantified capacity, committed dependencies and an automatic end within **seven days**. Renewal requires a new record. A retrospective review must occur strictly after containment and within thirty days.

Fail-closed automation is not a claim that inaction is safe. **Inaction is not
safe by default.** Both paths use the same estimate and harm shapes, evidence
references and affected-party scope. Every point estimate must match an
evidence-bound interval for both arms. Each harm has a unique record identity
and one declared, mutually exclusive party-and-dimension identity in each arm.
The validator compares paired identities without summing across people or harm
dimensions. A non-compensable action-harm threshold vetoes a favourable
headline before other benefits are considered. It informs deliberation but
authorises neither path.

## Files and trust boundary

- `schema/preparation-action.schema.json` closes each proposal shape.
- `schema/preparation-register.schema.json` closes IF, evaluation, evidence and register envelopes.
- `fixtures/valid/round-03.register.json` is synthetic. Its people, institutions, evidence and authorities are illustrative.
- `fixtures/hostile/` records attacks the semantic validator must reject.
- `lib/validate.mjs` verifies schema conformance, content hashes, typed-observation IF recomputation, capability and party scope, comparator derivation, resource chronology and asymmetric safety gates.

Schema conformance and internal consistency support publication only as a proposal. The result names this narrow property `structurally_publishable_proposal`, never `safe`. The assessment always returns:

```json
{
  "structurally_publishable_proposal": true,
  "evidence_truth_assessed": false,
  "actor_identity_verified": false,
  "action_authorised": false
}
```

Run the focused test suite:

```sh
node --test preparation/tests/*.test.mjs
```

Before any real-world use, replace the synthetic fixture with authenticated evidence, independently verified authority, affected-party participation and a legally valid decision made outside this record.
