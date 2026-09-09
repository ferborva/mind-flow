# Round 06 governance lineage

> **Synthetic research record only. This package establishes no empirical truth,
> consent, identity, authority, publication approval or permission to act.**

## 🦅 TL;DR

**The lineage makes one complete local chain independently replayable:** exact
Round 04 source bytes → a pinned synthetic population and IF context → negotiation
plus attestations → decision. The result remains blocked even when the source IF
state is `true`.

The checked-in validator derives the condition identity and governed rule state
from the coherent Round 04 bundle. It does not trust copies in the lineage or
governance records. It then supplies the content-addressed local context fixture to
the current negotiation and decision validators. Content addressing proves which
bytes were checked. It does not prove that those bytes came from affected people or
an external authority.

## 🔒 Fixed chain

| Stage | Required proof | Boundary |
|---|---|---|
| Round 04 | Exact complete-bundle bytes and every referenced component | Coherence is not truth or authority |
| Context | Exact locally pinned participants, affected consumers, representations, deliberation identities and IF receipt | Self-asserted synthetic identities and mandates only |
| Negotiation | Valid signed record against the external context | Signatures attest accuracy, not agreement |
| Decision | Exact negotiation hash and chronology after all negotiation signatures | Selected action remains blocked |

Source paths are fixed repository-relative JSON paths. Loading rejects traversal,
symbolic links, non-files, oversized files, digest drift and invalid JSON. The
lineage and context have separate domain-separated content hashes.

Deliberation entries cannot predate context capture. The decision must follow the
negotiation and all negotiation signatures, with equal timestamps rejected. The
external context fixes the exact position, dissent and unresolved-dissent IDs.
Representatives, the action owner and the authority holder must be different
actors with exact roles from a closed vocabulary. Representation expiry,
challenge routes, remedy ownership and stop invokers are retained explicitly.
Positions, dissent and attestations cannot predate the IF evaluation. A passed
IF means only that the pinned
rule evaluated to `true` for its inputs. It cannot establish empirical truth,
consent, authority, publication approval or permission to act.

## 🧪 Verify

```sh
node --test governance/lineage/tests/*.test.mjs
node governance/lineage/tools/build-round-06-lineage.mjs --check
```

Run the builder without `--check` only when intentionally creating a new reviewed
lineage version. Changed source bytes require new pinned digests and review. They
must never be silently accepted as the existing Round 06 record.

## 📍 Trust boundary

**Machine validity means only that retained synthetic records form this fixed,
reproducible chain.** It does not establish that this is the latest chain. Without
an independently retained, authenticated latest-head anchor, an older internally
valid checkout cannot be distinguished from an intentional rollback.

The caller supplies an unauthenticated verification clock. External context,
participant identities, representative mandates and placeholder signatures also
remain unauthenticated. The result exposes each of these facts under
`verification_boundaries`, and always reports `action_blocked: true`. Review-due,
expired, drifted or incomplete records fail closed. Operational action requires a
separate, externally verified authority process that this package does not provide.

The record validators also expose `context_authenticated: false`. In the absence
of an authenticated issuer policy, the IF receipt validity window is capped at
30 days from evaluation. The cap is only a safety ceiling, not a claim that the
underlying evidence remains fresh for that long.
