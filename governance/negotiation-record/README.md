# Negotiation record

The negotiation contract records what was negotiated, by whom, for which
affected consumers, against which exact IF condition and receipt. It is an
accountability record, not a mechanism for manufacturing consensus.

## Required content

- exact condition identity, definition version and hash;
- exact evaluation receipt identity, hash, state and freshness window;
- all participants and one current position per participant;
- closed participant roles that identify exactly the affected-party
  representatives, candidate action owner and candidate authority holder;
- all materially affected consumers and exactly one explicit representation
  record for each, with mandate expiry and a challenge route;
- dissent linked to the dissenter's preserved position and affected consumers;
- a candidate action with scope, maximum duration, rollback, a remedy owner,
  stop triggers and named stop invokers;
- claimed authority, its scope, verification status and expiry;
- reconsideration dates and triggers; and
- payload-bound attestations from every participant.

Signatures mean record accuracy, not agreement. Unresolved dissent stays
visible. If it is marked as blocking, the outcome must remain blocked.
Dissent cannot attach to a withdrawn position. When every dissent item is
accommodated or withdrawn, `unresolved_dissent_ids` is deliberately empty and
the record may remain provisional. That is not evidence of agreement or
consent.

The synthetic fixture uses unverified representatives, authority claims and
signature placeholders. Even with a mechanically true IF receipt,
`machine_valid: true` does not establish truth, consent or authority.

The validator requires three external inputs: `expectedIfBinding`,
`expectedGovernanceContext` and `asOf`. The first prevents a jointly resealed
record from silently substituting the condition or receipt. The second fixes
the expected participants, affected consumers, representations and exact
position, dissent and unresolved-dissent identities outside the candidate
record. It also prevents representative, action-owner and authority-holder
responsibilities from collapsing onto one actor. The third checks receipt freshness, review due dates,
authority expiry and record expiry. All three remain caller claims unless
authenticated elsewhere, so validator output always reports
`context_authenticated: false`.

Without an authenticated issuer policy, receipt validity is capped at 30 days
after evaluation. The cap limits self-asserted freshness; it does not prove
that a signal remains current for the full interval.

Positions, dissent and attestations must be recorded no earlier than the bound
IF evaluation. Representation mandates must remain current at record creation
and at the verifier's `asOf` instant. Challenge routes are synthetic
pause-and-record paths only. Each must reach the candidate action owner and
authority holder, and does not grant either actor permission to resolve the
challenge unilaterally.

## Deliberate limits of the current representation model

Round 08 retains two design restrictions. A representative may represent only
one affected-consumer group in a record. The validator checks every
representation identity separately, so reusing one actor for two groups fails
with `ACTOR_RESPONSIBILITY_COLLISION`, even if both groups chose that person.
This protects role separation in the synthetic fixture but excludes some
legitimate representation arrangements. It is not a principle that communities
must organise this way. A future change needs separate group-specific mandates
and a test that neither group's position, challenge route or consent is lost.

The schema requires at least one dissent entry. It can represent dissent that
was later accommodated or withdrawn, but cannot record a negotiation in which
no dissent was ever expressed. Do not invent a dissenter to satisfy it. Such a
negotiation is currently out of scope. Supporting it would require an explicit
distinction between zero reported dissent, missing dissent data and agreement,
while preserving independently supplied expected context. Round 08 documents
these limits instead of changing governance representation during measurement.
