# Negotiation record

The negotiation contract records what was negotiated, by whom, for which
affected consumers, against which exact IF condition and receipt. It is an
accountability record, not a mechanism for manufacturing consensus.

## Required content

- exact condition identity, definition version and hash;
- exact evaluation receipt identity, hash, state and freshness window;
- all participants and one current position per participant;
- all materially affected consumers and exactly one explicit representation
  record for each;
- dissent linked to the dissenter's preserved position and affected consumers;
- a candidate action with scope, maximum duration, rollback and stop triggers;
- claimed authority, its scope, verification status and expiry;
- reconsideration dates and triggers; and
- payload-bound attestations from every participant.

Signatures mean record accuracy, not agreement. Unresolved dissent stays
visible. If it is marked as blocking, the outcome must remain blocked.

The synthetic fixture uses unverified representatives, authority claims and
signature placeholders. Even with a mechanically true IF receipt,
`machine_valid: true` does not establish truth, consent or authority.

The validator requires three external inputs: `expectedIfBinding`,
`expectedGovernanceContext` and `asOf`. The first prevents a jointly resealed
record from silently substituting the condition or receipt. The second fixes
the expected participants, affected consumers and representations outside the
candidate record. The third checks receipt freshness, review due dates,
authority expiry and record expiry. All three remain caller claims unless
authenticated elsewhere.
