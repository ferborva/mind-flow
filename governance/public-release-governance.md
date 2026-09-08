# Public release governance contract

This contract turns the Public Charter's release checklist into a fail-closed,
machine-readable review. It does not grant authority. It records the evidence
and decision that a release system must verify before it emits a public-release
authorization.

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

## Mandatory public gates

Every public stage must complete all eight gates:

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

## Fail-closed use

`assessPublicRelease(record)` returns semantic errors, blocking gates and three
separate decisions: whether the requested stage is allowed, whether public
release is allowed, and whether operational action is allowed.

`issuePublicRelease(record)` is the fail-closed boundary. It throws
`PublicReleaseBlockedError` unless the record requests a public stage, has a
valid approval and clears every gate. On success it emits a small authorization
that pins the review record and artifact checksums.

```js
import { issuePublicRelease } from "./public-release-validation.mjs";

const authorization = issuePublicRelease(reviewRecord);
```

The deployment or publication pipeline must require this authorization. Merely
calling the advisory assessment and ignoring its result is not a control.

## Honest fixture status

`fixtures/public-release.shadow.valid.json` is a synthetic shadow-review record.
Every review is pending, every gate is incomplete, and `approved_by` is empty.
It demonstrates a valid restricted review that cannot be published. Positive
authorization paths exist only as explicitly synthetic conformance data inside
the tests. This repository claims no real approval.

## Limits

- The validator checks the record it receives. It cannot prove that a reviewer,
  authority, evidence document, checksum or identity is authentic.
- Signatures, trust roots, reviewer independence and organizational decision
  rights require an external identity and attestation system.
- The contract does not run accessibility, security, privacy or participatory
  reviews. It verifies their current, checksum-pinned records and declared
  coverage.
- A caller can bypass a library. CI, hosting and operational systems must enforce
  the fail-closed issuance step and retain its audit trail.
- Source freshness is necessary but does not establish source quality,
  representativeness or causal validity.
