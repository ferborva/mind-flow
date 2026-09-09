---
id: trusted-issuance-boundary
title: Trusted issuance boundary
type: governance-design
status: proposed
provenance: commissioned-proposal
author: Ren
created: 2026-09-08
updated: 2026-09-08
---

# Trusted issuance boundary

> **This repository cannot authorise a public release.** It can validate the
> internal consistency of a candidate record and prepare it for external human
> and technical verification. This document specifies the missing boundary. It
> does not claim that the boundary exists.

## 🦅 TL;DR

A release needs two independent proofs:

1. **Artifact integrity:** these exact public bytes came from this exact source,
   data and reviewed build process.
2. **Legitimate authority:** these authenticated people and institutions had
   current authority for this scope, completed the required reviews and accepted
   the named residual risk.

Cryptographic provenance can support the first proof and authenticate claims in
the second. It cannot establish that a reviewer was independent, a threshold was
legitimate or an affected community consented. Those are substantive governance
decisions.

The current `prepareExternalAuthorityReview()` function stops before both
proofs. It emits `public_release_authorized: false` by design.

## 🔐 Trust boundaries

```text
repository assertions
  → deterministic tests and build
  → content-addressed candidate bundle
  → independent evidence-byte verification
  → authenticated, scoped and current G0-G10 attestations
  → separation-of-duties decision
  → signed release bundle
  → hosting admission policy verifies the bundle
  → public artifact and permanent release receipt
```

Every arrow is a failure boundary. Skipping one must fail closed.

### Boundary 1: candidate production

The repository must produce one bundle containing:

- immutable commit SHA and source ref;
- public artifact digest;
- snapshot, raw-input and adapter digests;
- deterministic build instructions and runtime lock;
- complete finding and disposition ledgers;
- requested circulation and operational effect;
- explicit statement that the candidate is not authorised.

[SLSA v1.2](https://slsa.dev/spec/v1.2/provenance) defines provenance as
verifiable information describing where, when and how an artifact was produced.
That is the appropriate model for artifact production, not for social approval.

### Boundary 2: artifact verification

An isolated verifier must:

1. Resolve the immutable commit, never a moving branch or tag alone.
2. Recompute every declared source and artifact digest from bytes.
3. Rebuild the public artifact from pinned inputs in a clean environment.
4. Compare the rebuilt artifact byte-for-byte with the candidate.
5. Reject missing, substituted, mutable or unlicensed inputs.
6. Emit its own signed verification result, not edit the producer's record.

NIST SP 800-53 SI-7 requires integrity verification capable of detecting
unauthorised changes and a defined response when discrepancies occur. See the
[NIST control publication](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final).

### Boundary 3: human and institutional attestations

Each G0-G10 decision requires a separate attestation with:

- authenticated person and organisation identity;
- role and legal or community authority basis;
- exact review scope: claim, people, service, place, period and artifact digest;
- outcome, material reservations and unresolved dissent;
- evidence digests actually inspected;
- issued-at, valid-from, expiry and revocation endpoint;
- conflict-of-interest disclosure;
- signature and trusted issuer;
- explicit statement of what the attestation does not approve.

An attestation from a syntactically valid but untrusted identity is not evidence.
An identity trusted for accessibility cannot approve statistical validity. An
institution with national authority cannot silently replace local or Indigenous
authority.

### Boundary 4: release decision

The decision service must apply policy, not trust caller labels:

- every mandatory G0-G10 scope is covered;
- every evidence digest matches the candidate bundle;
- signer identity, issuer and role are allowlisted for that scope;
- signatures, timestamps, expiry and revocation all verify;
- conflicts and separation of duties meet the declared policy;
- no stop-line or automatic human-study stop remains;
- publication and operational authority are evaluated separately;
- the exact public artifact is the signed subject;
- the decision includes an expiry, withdrawal route and rollback owner.

No repository maintainer, build process or agent may satisfy all roles.

### Boundary 5: deployment admission

Hosting must accept only the exact artifact named in a currently valid signed
release bundle. A human uploading a different file, a deployment from an
unreviewed branch or a caller bypassing the library must fail.

GitHub documents artifact attestations as signed claims linking an artifact to
its repository, workflow and commit. It also warns that an attestation does not
prove the artifact is secure, and that consumers must verify it against their
own policy. See [GitHub artifact
attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).
If this repository later uses that mechanism, it can support build provenance.
It cannot replace affected-party or institutional approval.

## 🧾 Candidate attestation envelope

This is a design sketch, not an accepted identity format:

```json
{
  "predicate_type": "mind-flow/release-review/v1",
  "subject": {
    "artifact_id": "observatory.snapshot.2026-09-07",
    "artifact_digest": "sha256:...",
    "candidate_bundle_digest": "sha256:..."
  },
  "review": {
    "gate": "G6-statistical-validity",
    "scope": {
      "claim_ids": ["claim.example"],
      "people": "named population",
      "service": "named service",
      "place": "named place",
      "period": "named period"
    },
    "outcome": "passed-with-reservations",
    "evidence_digests": ["sha256:..."],
    "reservations": ["plain-language material limitation"],
    "does_not_approve": ["policy threshold", "operational action"]
  },
  "authority": {
    "identity": "externally authenticated identity",
    "organisation": "named organisation",
    "role": "authorised review role",
    "authority_basis": "verifiable mandate reference",
    "conflicts": []
  },
  "validity": {
    "issued_at": "RFC3339 instant",
    "valid_from": "RFC3339 instant",
    "valid_through": "RFC3339 instant",
    "revocation_uri": "HTTPS endpoint"
  },
  "signature": "external envelope"
}
```

The signature must cover the canonical envelope and exact subject digest.
Sigstore's model binds short-lived signing certificates to OIDC identities and
verifies the signature, expected identity, issuer and transparency evidence.
See the [Sigstore overview](https://docs.sigstore.dev/about/overview/). Whether
Sigstore, another public-key infrastructure or a government identity system is
appropriate remains an architecture and governance decision.

## 🧪 Required kill tests

The boundary is not ready until each attack fails before deployment:

| Attack | Expected result |
|---|---|
| `Mallory` self-declares every review passed | Reject untrusted identity and role |
| Evidence file changes after review | Reject digest mismatch |
| Artifact changes after signing | Reject subject mismatch |
| Tag moves to a different commit | Reject immutable-commit mismatch |
| Reviewer authority expired or was revoked | Reject at decision and deployment |
| Accessibility reviewer claims statistical authority | Reject scope mismatch |
| Ethics or Indigenous determination is omitted | Reject incomplete G0-G10 coverage |
| One person produces, reviews and releases | Reject separation-of-duties breach |
| Operational action has only publication approval | Reject missing operational authority |
| Valid bundle is replayed after expiry | Reject at deployment admission |
| Hosting path bypasses the verifier | Deployment platform blocks the artifact |

## 🚫 What this design cannot solve

- It cannot prove that a governance mandate is just.
- It cannot turn consultation into consent.
- It cannot decide who legitimately represents an affected population.
- It cannot make a poor statistical method valid.
- It cannot guarantee privacy merely because bytes were signed.
- It cannot prevent self-fulfilling effects after publication.

Those limitations are why technical and substantive gates remain separate.

## ✅ Next implementation decision

Do not add release permissions to the current CI workflow. First select the
operator, hosting boundary, identity issuer, authority registry, revocation
mechanism and human G0-G10 owners. Then build the smallest end-to-end kill test
using a non-public synthetic artifact. Until that succeeds independently, the
only valid public authorization state is `false`.
