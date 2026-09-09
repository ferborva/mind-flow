# Governance records

These version 1 contracts rehearse negotiation and decision lineage without
turning repository structure into political or legal power. **They accept only
synthetic examples and cannot validate an operational governance record.** A
future real-record schema needs independent identity, mandate, signature,
authority and publication verification.

An **affected consumer** is a person or group that bears a material consequence
of the proposed action. It does not mean only a buyer or product user. Every
consumer must have an explicit representation record, including how the
representative was selected, what mandate they claim, and whether that mandate
was independently verified.

## Record flow

1. A negotiation record binds one exact executable IF condition definition and
   a locally content-addressed evaluation receipt.
2. It preserves every participant position, affected consumer, representation
   record and dissent record.
3. Signatures attest that the record is accurate, not agreement, consent or
   support for the outcome.
4. A decision record binds the complete content-addressed source negotiation.
5. It carries forward all positions, dissent, consumers and representatives,
   then records one selected option and the alternatives retained or rejected.
6. The decision action and authority claim must equal what the negotiation
   retained. The selected alternative must name that action.
7. Any candidate action remains bounded, reversible and subject to explicit
   stop, expiry and reconsideration conditions.

`machine_valid: true` does not establish empirical truth, representative
legitimacy, affected-party consent, actor identity, lawful authority,
appropriation, agreement, publication approval or permission to act.

## Fail-closed rules

A concluded negotiation or recorded decision requires a current, mechanically
valid `true` IF receipt. `false`, `unknown`, `stale` and `conflicted` states
block the record. They cannot be treated as weak versions of true.

The validator also fails when:

- the separately supplied expected IF definition or receipt differs;
- a required affected consumer, representative, position or dissent is lost;
- any required signature is missing or binds another payload;
- unresolved blocking dissent is bypassed;
- a candidate action is irreversible or lacks stop and rollback controls; or
- the receipt or record has expired at the caller-supplied verification time.
- the scheduled reconsideration point or claimed-authority expiry has arrived;
- the decision predates the complete negotiation and its attestations; or
- the caller omits the separately supplied participant, affected-consumer and
  representation context.

## Trust boundary

The checked-in examples are synthetic and are not authenticated governance
records. Synthetic signatures are placeholders, not authenticated identities
or cryptographic signatures. The
caller-supplied expected IF binding, governance context and clock are also not
authenticated by these validators. They must come from independently governed
sources before any operational use.

Content hashes detect drift relative to retained records. They do not prevent a
coordinated actor from changing and resealing every local source. External
identity, mandate, signature, source and authority verification remain required.

## Layout

- `negotiation-record/`: schema, validator, hostile tests and one synthetic
  negotiation.
- `decision-record/`: schema, validator, hostile tests and one synthetic
  decision bound to that negotiation.
- `schema/`: closed shared JSON Schema definitions.
- `lib/`: canonical hashing and shared fail-closed validation.
- `tools/build-synthetic-fixtures.mjs`: deterministic fixture builder.

Run the focused contract suite and fixture check:

```sh
node --test \
  governance/negotiation-record/tests/negotiation-record.test.mjs \
  governance/decision-record/tests/decision-record.test.mjs
node governance/tools/build-synthetic-fixtures.mjs --check
```
