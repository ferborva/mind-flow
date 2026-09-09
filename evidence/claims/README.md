# Atomic claim firewall v2

This isolated prototype prevents one public sentence from hiding several
different kinds of claim behind one label. It binds the exact source sentence
to one or more atomic claims, then records four independent axes for each atom:

| Axis | Question answered |
|---|---|
| `epistemic_class` | What kind of assertion is this? |
| `provenance_role` | What role did its origin play? |
| `support_state` | What does the current assessment say about support? |
| `publication_disposition` | What recorded handling state applies? |

These axes are deliberately non-substitutable. For example, a
`source-observation` can have provenance role `publisher-model-output`, support
state `insufficient-evidence`, and publication disposition `blocked`.

## Hard boundary

A passing result means only that the JSON shape, hashes, references, expiry
handling and replacement graph are internally consistent under the bound
policy. It does not establish:

- that a statement is true;
- that evidence is sufficient, accurate or authentic;
- that a reviewer is independent or legitimate;
- that an authority record is authentic, lawful or broad enough in practice;
- that a sentence was decomposed completely; or
- that anything may be published or acted upon.

The validator therefore always returns `truth_determined: false` and
`publishability_determined: false`, including when a structurally valid claim
records `approved-by-governance-record`.

## Files

```text
evidence/claims/
  README.md
  policy-v2.json
  validate.mjs
  validate-ceilings.mjs
  records/major-thesis-claims.json
  schema/claim-ledger-v2.schema.json
  schema/claim-policy-v2.schema.json
  schema/claim-ceiling-registry-v1.schema.json
  fixtures/valid/*.json
  fixtures/hostile/*.json
  tests/claim-firewall.test.mjs
  tests/claim-ceiling-registry.test.mjs
```

Both JSON Schemas are closed. The ledger is closed at its root and every nested
object. Unknown properties fail validation. The versioned policy is byte-bound
by the `policy_ref.checksum` in every ledger and must match its exact closed
schema, so co-mutating a ledger checksum cannot silently weaken the policy.

## Atomic statements

Each sentence records its exact text and SHA-256 digest. Every atomic claim:

1. points to that sentence;
2. selects its exact text using zero-based Unicode code-point offsets, with an
   exclusive end offset;
3. binds the selected text with its own SHA-256 digest;
4. records the four independent classification axes;
5. links evidence with an explicit relation;
6. binds a counterclaim and a falsifier or governance revision condition;
7. records an expiry and at least one review reference; and
8. keeps publication authority references separate from review and evidence.

Hashes use the exact UTF-8 bytes of the string with no trimming, whitespace
normalisation or Unicode normalisation. A visually insignificant text change
therefore creates a different statement identity.

## Reviews and replacement

Review records state a disposition, rationale and validity window. They record
an assessment and do not prove that the reviewer is independent.

Every claim outside the closed dispositions (`blocked`, `withdrawn` and
`superseded`) must reference at least one `accepted` or
`accepted-with-conditions` review that has begun and has not expired at the
caller-supplied assessment time. A `supported` assessment must also
carry a direct claim evidence link with relation `supports`; context,
counterevidence and falsifier inputs do not satisfy that requirement.

Replacement never overwrites a claim. A directed lineage edge names the old and
new immutable claim IDs, reason, time and review. The validator rejects missing
endpoints, self-replacement, cycles, a source not marked `superseded`, or a
review that does not supersede the replaced claim.

## Expiry and publication records

At the supplied assessment time, an expired claim is structurally closed only
when its disposition is `blocked`, `withdrawn` or `superseded`. A recorded
`approved-by-governance-record` disposition requires a referenced, current
authority record of kind `publication`. This is referential consistency, not
authentication or permission.

The caller supplies the assessment time. A production system must provide a
trusted clock and authenticate all evidence, review and authority artifacts
outside this validator.
Missing timestamps, malformed timestamps and impossible calendar instants fail
closed with `ASSESSMENT_TIME_INVALID`. This check establishes only that the
caller supplied an exact parseable instant. It does not authenticate the clock
or prove when the assessment actually ran.

## Test

Run the isolated suite from the repository root:

```sh
node --test evidence/claims/tests/*.test.mjs
```

Valid fixtures exercise multi-claim sentences and immutable replacement.
Hostile fixtures are compact mutation manifests layered over a named valid
fixture by the test loader. They cover collapsed compound claims, extra fields,
tampered text, unresolved evidence, review and authority references, expiry,
wrong authority type, policy drift, duplicate IDs and malformed replacement
graphs.

## Evidence ceilings for major thesis claims

The separate
[`major-thesis-claims.json`](records/major-thesis-claims.json) registry adds the
measurement boundary that the atomic ledger does not yet carry. Every registered
claim must state:

- the estimand and denominator, including their current defined or unknown
  status;
- population, geography and time scope;
- the maximum permitted inference and specifically prohibited inferences;
- direct evidence links and at least one counterevidence statement;
- a registered but untested falsifier, decision rule and evidence needed; and
- unresolved evidence needs.

The record distinguishes retained references from repository files. A retained
reference has not been frozen or checksum-bound, so it can support only the
recorded source-report ceiling. It must not be treated as a reproducible source
artifact.

`validate-ceilings.mjs` checks the closed schema, unique identifiers, references,
required measurement boundaries, direct support for supported claims and the
rule that a withdrawn claim cannot retain a positive inference ceiling. It does
not evaluate whether a source is accurate, whether a denominator is substantively
appropriate, whether a falsifier is powerful, or whether the claim is true.

## Known limits before integration

1. Atomic decomposition is declared by an author. The validator cannot detect
   an unstated implication, omitted clause or rhetorical presupposition.
2. Checksums bind identifiers and bytes but do not prove origin, accuracy or
   semantic relevance.
3. Reviewer identity, separation of duty, credentials, signatures and
   revocation need an external trust registry.
4. Authority scope is retained as text but not semantically interpreted.
5. Cross-ledger replacement, concurrent updates and append-only storage need a
   repository-level transaction and manifest contract.
6. The root test contract runs this validator, but the prototype is not yet
   wired into the existing claim ledger, dashboard or release workflow. A green
   repository build therefore does not mean every public sentence passed this
   firewall.
