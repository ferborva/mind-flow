# Public release governance contract

This contract turns part of the Public Charter's release checklist into a
machine-readable consistency review. **It does not grant or verify authority,
and it cannot authorise publication.** It prepares a content-addressed packet
that an external identity, attestation and deployment boundary would need to
verify before any public release could be considered.

## Release stages

| Stage | Circulation | What it permits |
|---|---|---|
| `internal-prototype` | Internal | Building and testing with no public claim |
| `shadow-review` | Restricted | Review and co-design with named participants, still not publication |
| `limited-public-signal` | Public | Evidence and signals only, with `operational_effect: false` |
| `operational-action` | Public | A separately authorised action bound to a checksum-pinned action contract |

Internal prototypes and shadow reviews cannot carry a public-release approval.
A limited signal cannot authorize, trigger or imply an operational action. An
operational release needs both publication-authority and operational-authority
evidence. The two are not interchangeable.

## Candidate repository checks

A record requesting a public stage must complete these eight repository checks:

1. `authority`: named publication owner, scope and expiry. Operational releases
   additionally require lawful basis, operational owner, funding, appeal and
   exit-test coverage.
2. `affected_party_review`: review of framing, thresholds and dissent, plus a
   response to affected participants.
3. `uncertainty`: missingness, intervals, unknown/stale/conflicted states and
   calibrated public language.
4. `challenge`: a submission route, independent review, response service level
   and public disposition record.
5. `accessibility`: plain language, disability access, translation,
   low-bandwidth use and numeracy.
6. `security_privacy`: threat and abuse cases, vulnerability response, data
   minimisation, re-identification and consent/retention review.
7. `correction`: public ledger, correction route, withdrawal and response
   service level.
8. `source_vintage`: source identity, checksum, retrieval, vintage, licence and
   maximum-age review.

A gate's `complete` label is insufficient. Every required evidence kind and
coverage item must be referenced, passed and current at the decision time.
Sources must remain within their declared maximum age. Missing, pending, failed,
expired or stale evidence blocks release.

These eight categories do not replace the G0-G10 human protocol. Ethics and
participant welfare, Indigenous governance and scope determination, formative
and confirmatory study completion, and the multi-owner human decision remain
external requirements. A complete repository record means that its assertions
are structurally coherent. It does not mean those requirements were
authentically satisfied.

All semantic timestamps must be exact RFC 3339 instants with a timezone, and
source vintages must be real calendar dates. The semantic boundary rejects
normalised dates such as 30 February even when a caller bypasses JSON Schema
validation.

## Advisory, fail-closed use

`assessReleaseReadiness(record)` returns semantic errors, blocking gates and
whether the requested record is internally consistent. A complete public-stage
record may become `structurally_eligible_for_external_authority_review`. That
does not mean that its identities, evidence, review outcomes or authorities are
true.

`prepareExternalAuthorityReview(record)` is the repository's terminal step. It
throws `ReleaseReadinessBlockedError` unless the record is structurally
eligible. On success it emits a review packet that pins the asserted record and
artifact, says `public_release_authorized: false`, and names the external
controls still required.

```js
import { prepareExternalAuthorityReview } from "./public-release-validation.mjs";

const reviewPacket = prepareExternalAuthorityReview(reviewRecord);
```

There is deliberately no `issuePublicRelease()` export. Repository text and a
caller-supplied reviewer name cannot become publication authority. A later
deployment boundary would need authenticated identities, scoped authority,
signature verification, evidence-byte verification, expiry, revocation and
enforcement. Until that exists and passes independent review, publication is
outside this contract.

`records/observatory-round-02.blocked.json` is the content-addressed governance
record for the current Observatory review artifact. Automated tests verify its
artifact, snapshot and review-protocol checksums. Any change to those files
invalidates the record until it is deliberately regenerated and reassessed.

## Honest fixture status

`fixtures/public-release.shadow.valid.json` is a synthetic shadow-review record.
Every review is pending, every gate is incomplete, and `approved_by` is empty.
It demonstrates a valid restricted review that cannot be published. Positive
structural-readiness paths exist only as explicitly synthetic conformance data
inside the tests. They can prepare an external-review packet, not an
authorization. This repository claims no real approval.

## Limits

- The validator checks caller assertions and their internal relationships. It
  cannot prove that a reviewer, authority, evidence document, checksum or
  identity is authentic.
- Signatures, trust roots, reviewer independence and organizational decision
  rights require an external identity and attestation system.
- The contract does not run accessibility, security, privacy or participatory
  reviews. It verifies their current, checksum-pinned records and declared
  coverage.
- A caller can bypass a library. No CI, hosting or operational issuance boundary
  exists in this repository yet.
- Source freshness is necessary but does not establish source quality,
  representativeness or causal validity.
