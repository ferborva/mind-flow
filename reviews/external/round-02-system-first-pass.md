---
id: round-02-system-first-pass
title: External system review, immutable first pass
type: external-agent-review
status: submitted
provenance: agent-analysis
reviewer: blind_system_review
review_ref: review/round-02
reviewed_commit: ce005e1c7fc08f05ab9493aa818f593e8397106a
submitted: 2026-09-08
---

# External system review, immutable first pass

> **Public release remains blocked.** This agent review does not satisfy human,
> affected-party, accessibility, institutional-authority, security, privacy or
> operational gates.

## Reproduction

- macOS Darwin 25.6.0 arm64, Node 26.0.0, npm 11.12.1.
- `npm ci` passed.
- `npm test`: 74 of 74 tests passed.
- Both prescribed dashboard builds were byte-identical and `git diff
  --exit-code` passed.
- All 28 manifest checksums were independently verified.
- `git verify-tag review/round-02` failed with `no signature found`.
- The shared working tree remained untouched.
- Interactive browser and screen-reader testing was unavailable. Generated HTML
  and source were inspected. Zoom, print, screen-reader and focus behaviour
  remain unverified.
- `npm audit` could not complete because the configured Artifactory endpoint
  returned 401.

## R02-E-001

**Severity:** Stop-line
**Lane:** E, with F dependency
**Artifact:** `governance/public-release-validation.mjs:70-76,262-425,445-459`;
`governance/schema/public-release.schema.json:129-208`;
`governance/public-release-governance.md:54-97`
**Control challenged:** `issuePublicRelease()` is a fail-closed issuance
boundary.

**Observed problem:** Review outcomes, approver identity, authority, evidence
checksums and artifact checksums are caller assertions. The validator checks
syntax, coverage labels and dates but neither verifies referenced bytes nor
authenticates reviewers or approvers.

**Evidence and reproduction:** The reviewer changed the supplied synthetic
record to public circulation, marked every gate complete and every evidence
item passed, and named `Mallory` as reviewer and approver. Placeholder hashes
and `example.org` evidence remained. AJV returned `schema_valid: true` and
`issuePublicRelease()` emitted an authorization with no blocking gates. The
frozen tag is also unsigned. NIST SI-7 calls for integrity verification capable
of detecting unauthorised change: [NIST SP 800-53 Rev.
5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final).

**People or decisions affected:** Publishers, downstream deployment systems,
institutional approvers and anyone treating the emitted record as authoritative.

**Strongest defence:** The governance document explicitly says identities,
signatures and trust roots require an external system and that a deployment
pipeline must enforce issuance.

**Assessment of defence:** It is an honest limitation, but it fails the
advertised boundary. No trusted enforcement is present or bound to the
authorization, so caller-controlled text can manufacture the authorization.

**Falsifier:** Demonstrate an end-to-end publication path that recomputes every
referenced digest, requires attestations from allowlisted identities with
scoped authority, verifies the tag or immutable commit, and rejects the forged
record.

**Minimum safe correction:** Treat the current function as an advisory
consistency checker. Add a trusted issuance service, signed attestations,
role/scope/expiry verification, byte-level digest verification and deployment
enforcement.

**Closure test:** The Mallory fixture, substituted artifact bytes, substituted
evidence bytes, unsigned or moved refs and revoked approvers all fail before
authorization.

**Residual uncertainty:** Cryptography cannot establish substantive legitimacy
or reviewer independence. Those remain human and institutional gates.

**Dependencies:** A real identity, authority and attestation design.

## R02-E-002

**Severity:** Stop-line
**Lane:** E
**Artifact:** `dashboard/schema/snapshot.schema.json:16-51`;
`dashboard/tools/build.mjs:67-87`;
`dashboard/tools/build-australia-pilot.mjs:14-26`
**Control challenged:** The build validates snapshots and supports
privacy-preserving public publication.

**Observed problem:** The main schema permits arbitrary root properties and the
builder embeds the entire input object, including undisplayed fields. The pilot
builder does not validate against its existing strict schema and likewise
embeds its entire input. Hidden personal or internal data can become publicly
readable in page source.

**Evidence and reproduction:** The reviewer added `internal_cohort_records`
with canary names and emails to otherwise valid main and pilot inputs. Both
builds exited successfully. `sensitive-canary@example.invalid` and
`pilot-sensitive@example.invalid` were present in the generated HTML, despite
never being rendered. OAIC guidance requires contextual re-identification
assessment and warns that external datasets can re-identify ostensibly
de-identified data: [OAIC de-identification
guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/de-identification-and-the-privacy-act).
APP 3 guidance also treats proportionality as requiring data minimisation:
[OAIC APP 3
guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information).
Applicability to a future operator requires legal assessment.

**People or decisions affected:** Future cohort participants, workers,
households and custodians supplying unpublished evidence.

**Strongest defence:** The frozen inputs contain aggregate or modelled public
data, are checksum-pinned, and contain no apparent personal records.

**Assessment of defence:** It succeeds for the inspected frozen input but fails
as a publication boundary. A single accidental extra field leaks without
validation or rendering.

**Falsifier:** Show that public output is constructed from a minimal allowlisted
projection and cannot contain unrecognised input fields.

**Minimum safe correction:** Set root `additionalProperties: false`, validate
the pilot schema, emit only explicitly selected public fields, add data
classification and suppression rules, and scan built artifacts for prohibited
data.

**Closure test:** Both canary attacks fail closed and produce no output. A
privacy reviewer verifies the projection using realistic cohort fixtures and
linkage attacks.

**Residual uncertainty:** Effective de-identification depends on release
context, external datasets and access environment, not schema alone.

**Dependencies:** Privacy, legal, affected-party and Indigenous or community
data-authority review where applicable.

## R02-E-003

**Severity:** Stop-line
**Lane:** E
**Artifact:** `dashboard/schema/snapshot.schema.json:246-261`;
`dashboard/tools/build.mjs:17-64`;
`dashboard/web/index.template.html:1021-1058`;
`dashboard/tools/build-australia-pilot.mjs:14-26`
**Control challenged:** A successful validated build cannot manufacture a
materially false quantitative display.

**Observed problem:** Time-series points need not be ordered, unique, aligned
or consistent with `latest`. Paired headline series need not share endpoints.
The UI nevertheless treats the final array item as the latest value. The pilot
builder performs only two shallow checks.

**Evidence and reproduction:** Reversing only the world labour-income series
passed the main build. The headline algorithm then compared output
`[2025,144.27]` with labour `[2004,100]`, producing `-44.27` while labelling the
span `2004-2025`. Separately,
`{"epistemic_class":"modelled-estimate","series":[]}` passed the pilot build,
although its startup path later dereferences missing `data.source.release_period`.

**People or decisions affected:** Readers interpreting headline transmission,
operators accepting successful builds, and reviewers assessing a poisoned or
malformed vintage.

**Strongest defence:** The upstream NERO constructor sorts rows and the frozen
data passes repository tests.

**Assessment of defence:** It supports this exact baseline but fails the
documented build interface, which accepts alternate input paths and describes
its result as validated.

**Falsifier:** Prove strict chronology, unique points and identifiers,
declared-entity references, paired-window equality, latest consistency and
recomputed arithmetic before any output is written.

**Minimum safe correction:** Add semantic validation for those invariants.
Apply the complete pilot schema and equivalent semantic checks inside the pilot
page builder.

**Closure test:** Reversed, duplicated, misaligned, stale-latest, empty,
missing-source and inconsistent-change fixtures all exit non-zero without
creating output.

**Residual uncertainty:** Structural correctness does not validate upstream
truth, representativeness or causal interpretation.

**Dependencies:** Statistical and source-vintage reviewers must define valid
alignment rules.

## R02-EF-004

**Severity:** Stop-line
**Lane:** E primary; F cross-check
**Artifact:** `dashboard/schema/snapshot.schema.json:208-219`;
`dashboard/tools/build.mjs:57-60`;
`dashboard/web/index.template.html:1143-1175`;
`governance/public-charter.md:174-183,243-271`
**Control challenged:** An action cannot appear active without owner,
authority, help and appeal, and those labels remain adjacent under crop or
reflow.

**Observed problem:** Every action state permits nullable authority fields.
Semantic validation rejects authority metadata when state is `none`, but does
not reject `authorised` or `active` with every authority field null. The action
summary is shown in the primary cell while its state, owner and authority are
hidden in a collapsed disclosure.

**Evidence and reproduction:** The reviewer changed only the summary to
`Emergency support is active now` and `authorization_state` to `active`, leaving
owner, authority, help and appeal null. The schema and semantic build passed. A
default screenshot crop of the cell can retain the active claim while omitting
its missing authority.

**People or decisions affected:** Individuals seeking help, institutions
mistakenly treated as committed, and actors who might act on a nonexistent
service.

**Strongest defence:** The page-wide header says prototype, agent proposal and
public release blocked.

**Assessment of defence:** It helps full-page readers but fails the review
brief's crop and copy requirement and the charter's requirement that
consequential claims carry adjacent authority and provenance.

**Falsifier:** An active or authorised action cannot validate without a
verified action contract and visible owner, authority, help, appeal, review and
expiry in the same non-collapsible claim unit.

**Minimum safe correction:** Remove operational states from this snapshot type
or bind them to verified action-contract references. Enforce inverse state
invariants and render authority beside every action summary.

**Closure test:** The active/null fixture fails. Crop, copy, print and 320px or
400 percent tests retain the full action status.

**Residual uncertainty:** A named authority still requires independent
verification of lawful scope and current mandate.

**Dependencies:** Institutional-authority and affected-party review.

## R02-E-005

**Severity:** Major
**Lane:** E
**Artifact:** `dashboard/schema/snapshot.schema.json:263-270`;
`dashboard/web/index.template.html:980-991`;
`dashboard/tools/build-australia-pilot.mjs:14-26`;
`pilots/australia/web/index.template.html:242-248`
**Control challenged:** Snapshot-supplied links are safe.

**Observed problem:** Main source URLs are unrestricted strings and are
assigned directly to `href`. The pilot's stricter HTTPS pattern is never
invoked by its page builder.

**Evidence and reproduction:** The reviewer replaced a source URL with
`javascript:document.body.textContent="source link executed"`. The main build
succeeded and embedded the executable navigation URL. The HTML standard defines
dedicated execution semantics for `javascript:` navigation: [WHATWG HTML
Standard](https://html.spec.whatwg.org/dev/browsing-the-web.html#javascript-protocol).

**People or decisions affected:** Readers following evidence links and
institutions hosting the artifact under a trusted origin.

**Strongest defence:** Dynamic text uses `textContent`; links use
`target="_blank"` and `rel="noopener"`.

**Assessment of defence:** Those controls resist markup injection and opener
abuse, but they do not constrain URL schemes.

**Falsifier:** Every dynamic navigation is parsed and restricted to approved
HTTPS origins before output or assignment.

**Minimum safe correction:** Enforce HTTPS and an explicit source-host policy
in both schemas and both builders. Reject credentials, control characters,
`javascript:`, `data:`, `file:` and unexpected redirects.

**Closure test:** Malicious-scheme fixtures fail. Browser tests confirm no
script execution or trusted-origin replacement.

**Residual uncertainty:** An approved HTTPS destination can itself be
compromised or misleading.

**Dependencies:** Source owners must define acceptable domains and redirect
policy.

## R02-E-006

**Severity:** Major
**Lane:** E
**Artifact:** `dashboard/web/index.template.html:1-3,199-220,347-405` and
generated file with the same structure
**Control challenged:** The global Observatory is accessible across screen
readers, mobile, zoom and light or dark modes.

**Observed problem:** The document has no doctype, `<html lang>`, charset or
viewport metadata. In light mode, small `--ink-3` text is `#6b8194`; calculated
contrast is 3.93:1 on `#fafcfd` and 3.52:1 on `#eaf0f4`, below the 4.5:1 WCAG AA
threshold for normal text. No print stylesheet exists, and browser or
assistive-technology behaviour has not been demonstrated.

**Evidence and reproduction:** Static source inspection plus independent
WCAG-relative-luminance calculation. WCAG requires programmatically
determinable page language ([SC
3.1.1](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)), 4.5:1
contrast for normal text and reflow at 320 CSS pixels ([WCAG
2.2](https://www.w3.org/TR/WCAG22/#contrast-minimum), [SC
1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).

**People or decisions affected:** Screen-reader, low-vision, mobile, zoomed,
print and low-bandwidth users.

**Strongest defence:** It uses native buttons, selects and details, visible
focus, responsive grids, reduced-motion rules and a table alternative. The
Australia pilot correctly declares `lang`, viewport and charset.

**Assessment of defence:** These are meaningful controls, but confirmed Level
A and AA defects remain in the main artifact and the required interaction
matrix has not run.

**Falsifier:** A standards-based audit demonstrates corrected markup and
contrast, followed by human testing across the required modes.

**Minimum safe correction:** Add complete document scaffolding, raise
light-theme contrast, add print and crop rules, associate chart summaries and
tables, and test sticky regions at high zoom.

**Closure test:** Automated contrast and accessibility checks plus keyboard,
screen-reader, 200 and 400 percent zoom, 320px, print and reduced-motion human
tests pass with no hidden status or authority.

**Residual uncertainty:** No live browser or assistive-technology run was
available in this pass. Automated success cannot replace affected-user review.

**Dependencies:** Accessibility expert and affected-user gates remain
mandatory.

## R02-F-001

**Severity:** Major
**Lane:** F, cross-check from E
**Artifact:** `communications/early-action-and-negotiation-framework.md:46-124,339-461,523-564`;
`dashboard/schema/snapshot.schema.json:348-358`;
`dashboard/web/index.template.html:851-891`;
`dashboard/snapshots/2026-09-07.json:8958-9055`
**Control challenged:** The product can preserve precedence, conflict, pause,
reversal, recovery, authority, expiry and negotiation.

**Observed problem:** The governance document specifies seven typed gates and a
complete option record, but the product schema reduces playbooks to three
free-text arrays: `now`, `warning`, `crisis`. It cannot encode or evaluate
authority, consent, funding, dependencies, pause or reverse precedence, appeal,
expiry, dissent or cross-actor conflicts. Crisis action strings are rendered as
imperatives without an adjacent proposal or authority label on each action.

**Evidence and reproduction:** The worked enterprise-act versus worker-pause
conflict cannot be represented in the snapshot type. Rendering merely iterates
strings. Cropping a crisis response grid can retain `protect` or `recover`
instructions while omitting the distant `unscored hypothesis` chip.

**People or decisions affected:** Workers, unions, enterprises, local and
national authorities, communities and cross-border participants with
conflicting duties or safeguards.

**Strongest defence:** No actor is selected by default, every selected playbook
item says `PROPOSAL, NOT AUTHORISED`, and the prose framework contains strong
precedence and sovereignty rules.

**Assessment of defence:** It succeeds as documentation and initial caution.
It fails as product governance because none of the rules is
machine-representable or testable, and crisis actions use a separate weaker
rendering path.

**Falsifier:** A typed option, negotiation and commitment model executes the
documented conflict fixture and deterministically blocks action when another
required actor's hard pause applies.

**Minimum safe correction:** Hide the action deck until typed option contracts
exist, or replace free-text arrays with versioned seven-gate records,
dependency ownership, conflict evaluation and same-card authority and crop
labels.

**Closure test:** Enterprise `act_if=true` plus worker `pause_if=true` yields
pause. No action renders without owner, scope, authority, funding, help, appeal,
review, expiry and dependencies.

**Residual uncertainty:** Formal precedence cannot decide legitimate political
authority or acceptable burdens.

**Dependencies:** Negotiation with affected actors and lawful decision
authorities.

## Controls that survived

- Exact checkpoint and all 28 manifest artifacts reproduced without drift.
- The official round-two record remains blocked, and `issuePublicRelease()`
  rejects that actual record.
- Text and SVG content generally use `textContent`; `</` is escaped before JSON
  embedding.
- No tracking, cookies, browser storage, analytics, remote scripts or remote
  fonts were found.
- Current frozen data is aggregate or modelled and visibly warns against
  individual or AI-effect inference.
- Prototype, agent-proposal and release-blocked labels are prominent on
  full-page views.
- Scenario output repeatedly says it is not a forecast.
- No actor playbook is selected by default.
- Entity selection does not silently substitute another geography.
- Missing instrumentation and unknown IF states remain visible.
- The prose governance framework strongly preserves dissent, local or
  Indigenous authority, individual refusal, pause and reversal precedence,
  expiry and recovery. These controls have not yet been implemented in the
  product.

## Ranked remediation

1. Keep publication and operational use blocked.
2. Build a trusted, signed release-attestation and deployment boundary.
3. Replace whole-object embedding with an allowlisted public projection.
4. Enforce chronological, referential and arithmetic semantics in both builders.
5. Bind every non-`none` action state to verified authority and action contracts.
6. Reject unsafe URL schemes and unapproved source origins.
7. Replace or hide free-text action playbooks until conflict-aware contracts
   exist.
8. Correct main-page language, document structure and contrast, then complete
   human accessibility testing.
9. Add dedicated print, copy, screenshot-crop and low-bandwidth outputs.
10. Complete independent security, privacy, source-vintage, affected-party and
    institutional-authority reviews.
