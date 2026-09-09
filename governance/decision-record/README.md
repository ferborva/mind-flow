# Decision record

The decision contract records a bounded selection without confusing selection
with activation. It does not authorise implementation.

Every decision binds the complete source negotiation by record ID, version and
content hash. It must carry forward the same participants, affected consumers
and representation records, plus exact references to every source position,
dissent and unresolved dissent item.

The decision then records:

- one selected option and every retained or rejected alternative;
- the exact reversible candidate action, owner, scope, duration, rollback and
  stop conditions retained by the negotiation;
- the claimed decision authority, basis, jurisdiction, scope and expiry;
- blocking reasons, including unresolved blocking dissent;
- scheduled and event-triggered reconsideration; and
- payload-bound attestations from each affected representative, action owner
  and claimed authority holder.

Signatures preserve the accuracy of the record, not agreement or consent.
Synthetic signatures are not authenticated. Authority remains
`synthetic-unverified`, its effect remains `none`, and the checked-in decision
is blocked.

Verification requires the source negotiation, the separately expected IF
binding and governance context, and an explicit UTC `asOf` instant. Any source
drift, missing signature,
non-true or stale receipt, irreversible action, unresolved-dissent bypass or
expiry forces reconsideration and fails closed.
