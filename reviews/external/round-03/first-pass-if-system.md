---
id: first-pass-if-system
title: Independent Round 03 IF-system first pass
type: external-review-first-pass
status: submitted-open-findings
provenance: independent-blind-agent-review
reviewed_commit: f5b3b643e80e0f16d7dadd13805df6accf9526ed
reviewed_on: 2026-09-09
authority: none
---

## Independent review: `f5b3b643`

Reviewed exact archived blobs only. I did not inspect prohibited review files, external reviews, agent summaries, or other branches.

### Findings

**R03-EXT-01 · P1 · Caller-controlled schema forks can manufacture authority**

- Location: `signals/validate.mjs:92-96`, `paths/validate.mjs:123-127`
- Counterexample: relax authority constants in the supplied schema, then set `authority:"execute"` / `operational_effect:true`, or `action_authorised:true`.
- Result: both validators returned `machine_valid:true`, with no errors. The path result even contradicted itself by returning fixed `boundaries.action_authorised:false`.
- Consequence: machine validity has no stable contract identity.
- Repair: compile only repository-owned, digest-pinned schemas. Remove public schema injection, and redundantly enforce authority boundaries semantically.
- Owner: paths/signals validator maintainers.

**R03-EXT-02 · P1 · Graph validation does not prove fail-closed reachability**

- Location: `paths/validate.mjs:218-323`, `paths/schema/possible-path.schema.json:53-69`
- Counterexamples:
  - Point `if_false` and `if_unknown` from `edge.prepare` to `node.negotiated-option`, which already has an edge to `node.scoped-outcome`.
  - Add a direct baseline-to-outcome edge binding only one of two outcome conditions.
- Result: both records returned `machine_valid:true`, `errors:[]`.
- Consequence: false/unknown can indirectly reach the outcome, and an outcome route can omit registered IFs.
- Repair: perform graph reachability analysis. Every entry-to-outcome route must accumulate every outcome condition; false/unknown targets must have no route to consequential or outcome nodes. Require abandonment sinks and reject unsafe cycles.
- Owner: possible-path contract owner.

**R03-EXT-03 · P1 · A “scope-partition-only” split can rewrite the proposition**

- Location: `contracts/evolution/validate.mjs:506-527`
- Counterexample: change both split children from the source wording to `UNRELATED semantic condition`, regenerate rendered IFs, chain hashes, projection, state, and manifest.
- Result: `ledger_valid:true`, no errors.
- Consequence: a split can silently replace condition meaning while declaring only a scope partition. This contradicts `contracts/evolution/README.md:52`.
- Repair: require child wording and evidence to equal the source, allowing changes only to identity, version, and declared partition scope.
- Owner: condition-evolution contract owner.

**R03-EXT-04 · P1 · IF logic may omit a declared public condition**

- Location: `preparation/lib/validate.mjs:299-316,427-431,468-471`
- Counterexample: change the emergency logic from `all(payment-failure-imminent, rights-route-available)` to only the first clause; make `rights-route-available=false`; reseal envelopes.
- Result: structurally publishable, evaluation `true`, while the public IF still says the rights-preserving route is available.
- Consequence: an emergency eligibility result can ignore a publicly promised safeguard.
- Repair: require logic references to cover every declared clause exactly once, and deterministically render public IF language from the checked AST.
- Owner: preparation IF evaluator owner.

**R03-EXT-05 · P1 · Unrelated evidence can satisfy independent-source requirements**

- Location: `preparation/lib/validate.mjs:113-152,394-410`
- Counterexample: place two qualifying observations in one telemetry source, then cite that source plus `evidence.emergency-necessity`, which has zero matching observations but a different independence group.
- Result: the two-source emergency clause remained publishable with no errors.
- Consequence: a single actual source can masquerade as independent corroboration.
- Repair: count independence groups only among sources contributing at least one current, measure-and-unit-matching observation.
- Owner: preparation evidence owner.

**R03-EXT-06 · P1 · Public projection exposes challenge identity and text unconditionally**

- Location: `contracts/evolution/validate.mjs:176-201,236-249`
- Counterexample: record `Named worker has a private medical diagnosis` with `raised_by:"person.named-worker"`, reseal the valid ledger.
- Result: ledger valid; both fields appeared verbatim in `public_projection`.
- Consequence: condition challenges can expose health, whistleblower, or other sensitive information.
- Repair: separate private audit data from public projection. Add visibility, consent/redaction, and pseudonymisation controls; publish hashes or redacted notices by default.
- Owner: evolution privacy/governance owner.

**R03-EXT-07 · P1 · Recovery may “complete” before containment starts**

- Location: `preparation/lib/validate.mjs:725-739`
- Counterexample: emergency starts `2026-09-08`, ends `2026-09-15`; set recovery completion and both resource-validity dates to `2026-09-01`.
- Result: structurally publishable with no errors.
- Consequence: the recovery gate can be satisfied by an already-expired plan.
- Repair: require `complete_by > recoveryBase`, with recovery resources valid from at least the action/end boundary through completion.
- Owner: preparation operations owner.

**R03-EXT-08 · P2 · Self-review can be labelled independent**

- Location: `preparation/lib/validate.mjs:825-828`, `preparation/schema/preparation-action.schema.json:354-363`
- Counterexample: set the emergency reviewer ID equal to the acting actor and its organisation equal to the accountable owner’s organisation, while retaining `relationship:"independent"`.
- Result: structurally publishable, no errors.
- Consequence: the emergency independence gate accepts an internally contradictory claim.
- Repair: reject reviewer IDs matching actor or owner and require an explicitly distinct organisation/control relationship.
- Owner: preparation governance owner.

**R03-EXT-09 · P2 · Duplicate harms can flip the inaction headline**

- Location: `preparation/lib/validate.mjs:155-174,598-651`
- Counterexample: action harm `0.5`, inaction harm `0.4`; duplicate the identical inaction record so the reducer counts `0.8`.
- Result: valid `action-appears-safer`; without duplication, inaction is safer.
- Consequence: record multiplication can game the derived comparison.
- Repair: enforce unique outcome/harm identities per arm and reject duplicate semantic records before aggregation.
- Owner: preparation comparator owner.

**R03-EXT-10 · P2 · “Unscored” narrative guard is trivially bypassed**

- Location: `paths/validate.mjs:100-121,412-420`
- Counterexamples: `Seven in ten cases follow this path`, `0.7 chance`, and `Most cases will follow this path`.
- Result: each returned `machine_valid:true`.
- Consequence: public narrative can present probability or forecast language despite `quantification:"unscored"`.
- Repair: use controlled rendered fields for public narrative or mark unrestricted prose as requiring human review. Expanding the blacklist alone is insufficient.
- Owner: path public-language owner.

**R03-EXT-11 · P2 · Raw-input containment follows symlinks outside the evidence root**

- Location: `dashboard/tools/build.mjs:930-938`
- Counterexample: `dashboard/evidence/raw/pinned.bin` symlinked to `/tmp/outside.bin`.
- Result: the lexical `startsWith` check passed, while `realpathSync` showed the target outside and `readFileSync` read it.
- Consequence: a resealed record can bless bytes outside the governed evidence directory, harming reproducibility and potentially privacy.
- Repair: resolve and validate the real path, require a regular non-symlink file, and use no-follow opening where available.
- Owner: dashboard evidence-build owner.

### Explicit no-finding areas

- Coordinated resealing and external checkpoint limits are clearly disclosed; I found no additional authenticity overclaim beyond the schema-fork issue.
- Merge exactness, cropped-history fail-closed status, canonical safe-integer handling, and manifest hashing held.
- Signal role coverage and transitive source-family checks had no additional finding.
- The dashboard changes correctly disclose absent condition history and improve wrapping. Static keyboard, zoom, 320px, and print inspection found no commit-specific regression. Rendered browser verification was unavailable in this agent runtime.
- No real personal data was present in the new synthetic fixtures.

### Verification

Targeted exact-blob suites produced 259 passes. Two failures were isolation artifacts: copied read-only fixture permissions and a test asserting the checkout directory ends in `mind-flow`. Full contract tests requiring `git show review/round-02` were intentionally not run against another branch. Shared files were not modified.
