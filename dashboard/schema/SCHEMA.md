# The snapshot contract

**Version 2.1.0**

The Observatory renders a frozen, validated snapshot. It does not query data
providers in the browser.

```text
retained bytes -> adapter extraction -> snapshot record -> build validation -> HTML
```

The JSON Schema is the type contract. `tools/build.mjs` adds semantic validation
for relationships that JSON Schema alone cannot prove.

## Compatibility and release rule

`schema_version` uses semantic versioning. A compatible template may tolerate older
optional fields, but publishable builds must satisfy the requirements of the
template and validator being used. Compatibility never permits silent loss of
authority, provenance, scope or uncertainty.

| Change | Version change |
|---|---|
| New optional metadata | Patch |
| New signal or source | Patch |
| New required decision field | Minor |
| Renamed, removed or semantically changed field | Major |

Version 2.0 was a major release because it changed record identity, correction
lineage and the meaning of evidence time. The current build requires schema
2.1.0. Version 2.1 adds a required transition-bundle binding state and governed
resolution for typed possible paths. It retains the 2.0 timing contract, one
complete seven-part public update, exact selected point lineage and one scoped
IF path. The
frozen predecessors remain available as `archive/snapshot-1.5.schema.json` and
`archive/snapshot-1.8.schema.json`; the prior contract is frozen as
`archive/snapshot-2.0.schema.json`. The content-addressed
`snapshot-schema-registry.json` binds each historical version to the exact
schema bytes and dependencies used to validate it.

## Top-level shape

```jsonc
{
  "schema_version": "2.1.0",
  "record_id": "2026-09-08.r3",
  "snapshot_id": "2026-09-08",
  "as_of": "2026-09-08T00:41:31Z",
  "generated_at": "2026-09-08T00:41:31Z",
  "generator": "migrate-transition-bundle-binding@1.0.0",
  "publication_status": "research_draft_unverified",
  "evidence_policy": {
    "id": "adapter-classification-policy",
    "version": "2.0.0",
    "sha256": "sha256:..."
  },
  "title": "Signals toward the transition",
  "notes": "Run-level context and limits.",
  "correction": {
    "kind": "corrected_revision",
    "supersedes_snapshot_id": "2026-09-08",
    "supersedes_record_id": "2026-09-08.r2",
    "supersedes_snapshot_sha256": "sha256:...",
    "issued_on": "2026-09-08",
    "summary": "Corrects classifications without changing source values.",
    "changes": ["Evidence taxonomy and derived lineage corrected."],
    "changed_fields": ["schema_version", "signals"],
    "source_values_changed": false
  },
  "reproducibility": {
    "raw_input_status": "not_pinned",
    "snapshot_rebuild_status": "not_verified",
    "raw_inputs": [],
    "residual_gap": "Exact upstream bytes were not retained."
  },
  "entities": [],
  "signals": [],
  "public_update": {},
  "if_path": {},
  "source_transition_bundle": {
    "binding_state": "unbound_prototype",
    "reason": "No scope-matched typed possible path is bound."
  },
  "possible_path_refs": []
}
```

`snapshot_id` is the evidence-cut-off date. `record_id` is the immutable claim
revision. More than one record may share a snapshot date, but every record ID,
path and byte digest must be unique in `snapshots/index.json`. The index is
validated as a whole against `snapshot-index.schema.json`: records are strictly
ordered, `latest` equals the final record, paths are normalised basenames, every
file and digest resolves, and same-date corrections form a contiguous chain.
The record date remains the evidence date. A correction may be produced later;
its `generated_at` records the exact revision time and `issued_on` records that
revision date.

## Entities and selection

Entities have a stable `code`, public `name` and `kind` of `aggregate`,
`country` or `region`. A series points to one entity code.

The interface must never fill a missing selected geography with another
geography. It shows an explicit absence instead. `ALL` is a comparison view, not
an implied global average.

## Signals

A signal is one source-native or derived measure. Required decision-relevant
fields include:

- stable identifier, name, family, status, unit and precision;
- question and reason the measure matters;
- neutral or explicitly justified direction;
- source, retrieval date and caveats;
- method for derived measures; and
- source-native series with ascending time points.

Signal status is one of:

| Status | Meaning |
|---|---|
| `available` | One or more points are included; each point says how it was produced |
| `not_measured` | Required instrument is absent by design or unavailable in the evidence system |
| `unavailable` | A fetch or source failure occurred for this snapshot |

A source point is `[year, value, epistemic_class]`. A derived point is
`[year, value, "derived", input_epistemic_classes]`; the fourth field preserves
the unique classes of the inputs used for that point. `latest` repeats both the
class and, for derived values, its input classes, and must match the series.

The separately hash-pinned `evidence/adapter-classification-policy.json` defines
the classification vocabulary and fixes each signal's source URL, request URL,
adapter version, dataset or indicator identifier, selected fields and year
rules. It also pins entity identity, public-update scope and observed content,
freshness limits, and a digest of every signal's displayed identity, unit,
source, method, caveats and evidence prose, including deliberately missing
instruments.
Relevant distinctions include:

| Class | Meaning |
|---|---|
| `observed` | Direct measurement without inferential transformation beyond recording and unit conversion |
| `published_statistic` | A publisher-released compiled statistic that may include estimation, imputation, aggregation and revision |
| `published_estimate` | A publisher-released estimate constructed from surveys, models or incomplete observations |
| `modelled_estimate` | A value explicitly produced by a statistical model |
| `nowcast` | An estimate for a current or just-ended period before the historical series settles |
| `forecast` | A projection for a future period |
| `derived` | A deterministic calculation whose input classes are retained |

PIP values through 2024 are `published_estimate`; its stated post-2024 values
are `nowcast`. GDP and CPI values are `published_statistic`, not direct
observations. A missing point is absent, never zero, forward-filled or
interpolated without a separately declared method.

Each available source declares an adapter identifier, semantic version, dataset
or indicator identifier and selected fields. A `captured_local_hash_consistent`
claim requires raw references for every available remote source. Every declared
raw input must be referenced, match that source's pinned request and adapter,
carry 2xx HTTP and matching media metadata, and transform into the snapshot
series exactly. The build checks SHA-256 and byte length before transformation,
then independently recomputes both Engels derived series and the public-update
arithmetic. This proves local consistency only, never publisher authenticity.

The immutable 2026-09-07 and `2026-09-08.r1` records predate complete raw-byte
retention. They remain honestly `not_pinned` and `not_verified`. Record
`2026-09-08.r2` corrects timing semantics without changing their source values
or rewriting either predecessor. Its status remains
`research_draft_unverified`, and every visible value and export carries
`UNVERIFIED SOURCE BYTES`. Publishable mode always fails with
`MISSING_TRUSTED_ACQUISITION_BOUNDARY` until a separately verifiable publisher
receipt system exists.

Record `2026-09-08.r3` preserves `r2` byte-for-byte and adds the required
transition-bundle binding state. Its state is `unbound_prototype` and its path
references remain empty because no typed path matches the complete World
aggregate IF scope.

## Timing and freshness

Schema 2.0 uses `source-timing.schema.json` to distinguish:

| Clock | Question it answers |
|---|---|
| Reference period | Which real-world period does this point describe? |
| Publisher vintage | Which publisher edition or revision produced it? |
| Publisher release | When was that edition declared or first observed available? |
| Retrieval | When did the selected response complete? |
| Byte acquisition | When were those exact bytes stored and verified? |
| Computation or assessment | When was a derived value computed or a gap assessed? |
| Record generation | When was this immutable claim record produced? |

External datasets, deterministic derivations and instrument gaps have distinct
timing shapes. Publisher metadata is `known` only when one registered adapter
field extracts the same value from one retained input. Observed availability
requires retained presence evidence and content-addressed absence receipts.
Recognised IANA timezone rules convert local calendar dates into bounded
civil-date intervals and preserve unknown intra-day order. A timezone that does
not exist, or a civil date skipped by a timezone transition, fails validation.

Timing assessments are generated by the build and embedded outside the frozen
claim record. The assessment bundle is schema-validated, carries a canonical
content address, names the evaluator and evaluator code digest, and binds the
record digest, policy digest, evidence cut-off and record generation time.
External assessments bind separately to
each `(signal, entity, measure, year)` target. Derived operands carry
`baseline`, `comparator` or `endpoint` roles. Endpoint coverage describes the
claimed endpoint; the age of a historical baseline or comparator remains
visible but cannot poison endpoint currentness. A public-update binding may
assess its exact source window. A latest-point binding may assess only its
governed derived point. Every other derived point is explicitly not assessed.

Known publisher vintage or declared release metadata is recomputed from
retained JSON response bytes through the registered adapter pointer. Caller-
supplied assertions are not an evidence path. `publisher_release_basis` and
`release_recency` remain separate, so an unknown cadence cannot be presented as
an unknown release. Unknown evidence must not be converted to current, fresh,
overdue, stale or safe. Retrieval recency does not substitute for reference
coverage or publisher release recency. A legacy calendar retrieval date is
reported and unverified retrieval metadata. It cannot establish verified byte
acquisition or input readiness. Internal computation and assessment clocks
remain unknown until retained execution artifacts and a governed producer
registry can bind them.

The assessment output deliberately separates **assessment execution**,
**structural lineage**, **input timing readiness**, **evidence readiness** and
**publication eligibility**. These fields answer different questions. A valid
graph and successful evaluator run cannot promote unknown, stale or provisional
evidence, and timing alone never grants publication authority.

Browser evidence labels show a compact timing state beside values and expose
the complete clock readings in the evidence contract. A downloaded atlas
artifact is selection-only with external record binding. It includes selected
point assessments and the source assessment-bundle identity, but omits the
seven-part public update rather than exporting a dangling claim graph.

## Seven-part public update

`public_update` binds a claim to a scope and separates seven things readers can
otherwise collapse:

1. `observed`: claim text, epistemic class, value, unit, period, uncertainty and
   source signal identifiers.
2. `affected`: named population and status, including `unknown`.
3. `inferred`: interpretation, inference class and alternatives.
4. `condition_change`: condition identifier, changed state and reason.
5. `action`: authorisation state, action, owner, authority, help and appeal.
6. `falsifier`: test and implication for the claim.
7. `next_check`: date, owner and whether it is related to the inference.

The update also carries its own provenance, scope and exact start/end source and
derived points. Raw-input identifiers are derived from those sources rather than
asserted independently. The current allowed
inference classes include descriptive readings. Causal or forecast claims need
additional governed evidence contracts and cannot be produced merely by
changing prose.

Schema 2.0 accepts only `none` and `proposed`. It cannot import `authorised`,
`active`, `paused` or `ended` because this repository has no trusted issuance
boundary that can verify those states. Reintroducing an operational state
requires a future schema version bound to an externally verified, signed,
scoped and current action contract. An action with `authorization_state: none`
must not claim an owner or authority. A check marked related to an inference
must name both a date and owner.

## Scoped IF path

`if_path` turns the IF layer from a vocabulary display into a decision record.
Its `claim` states:

```text
WHO + VERB + OUTCOME + STANDARD + PLACE + PERIOD + IF conditions
```

Each condition records its position, question, current and previous state,
evidence grade, reason, source-signal references, strongest challenge and next
observation. An unknown condition must stay explicit. Its absence cannot be
treated as false, safe or satisfied.

The path decision is separately one of `no_decision`, `watch`, `act`, `pause`,
`reverse`, `recover` or `graduate`. `no_decision` cannot contain eligible
actions. The current snapshot has five unknown conditions and no decision.

## Typed possible-path boundary

`source_transition_bundle` is required. It is either an explicit
`unbound_prototype` with an empty `possible_path_refs` array, or a `bound`
content address naming one repository-relative transition bundle. A bound state
must contain at least one path reference.

The build does not trust those fields by assertion. It rejects traversal,
symlinks and non-regular files; verifies the bundle and path bytes against both
digests; applies the repository-owned transition-bundle schema and fixed
possible-path validator; resolves exactly one `possible-path` role; and matches
path ID, schema version, checksum, bundle-native scope hash, canonical condition
identities and every `WHO + VERB + OBJECT + STANDARD + PLACE + PERIOD + IF`
field to the dashboard decision record. Missing signal
roles, scope drift, path drift and untyped narratives fail closed.

Only then does the build create a separate derived projection for the browser.
The projection preserves the source classification, unscored epistemic status,
competing paths, population accounting, abandonment rule, expiry and the
explicit absence of action authority. Validation does not make the path true,
probable, complete or authorised.

This replaces free-text crisis and playbook lists. Those lists could look like
forecasts or guidance without a governed hypothesis, discriminator, option,
authority or falsifier. Their removal is a truth-boundary change, not a claim
that adverse paths are impossible. A future UI may display positive, adverse,
measurement-alternative and recovery branches only after the typed contracts
are integrated end to end.

## Validation layers

The build must pass both layers:

1. **JSON Schema validation:** types, required fields, enums, formats and local
   object structure.
2. **Semantic validation:** entity references, source-signal references,
   IF-path signal references, IF condition alignment, decision
   consistency, authority consistency, pinned adapter policy, complete raw-input
   coverage, byte-to-series equivalence, derived recomputation, public-update
   arithmetic, full public-update lineage, content addresses, correction
   predecessor bytes and governed next-check requirements. It also enforces the
   `record_id`, `snapshot_id`, evidence cut-off, revision, retrieval and
   acquisition chronology; future annual points must be forecasts, while
   forecasts cannot be dated in the past.

Validation prevents known structural contradictions. It does not prove that a
source is correct, an inference is warranted, a public explanation is
understood, or an action is legitimate.

## Adding or changing evidence

1. Change the bounded acquisition and extraction tool.
2. Create a new record. Never overwrite the evidence used for a prior claim.
   A correction must use a new `record_id`, preserve its evidence-date
   `snapshot_id`, and bind the superseded record ID and bytes.
3. Run the schema and semantic tests.
4. Review the generated diff, including changes to source dates, missingness and
   public interpretation.
5. Rebuild the page.
6. Pass the separate public-release governance gates before publication.

The retired v1.8 live fetch path cannot emit a 2.0 record. Run
`tools/migrate-timing-contract.mjs` only to reproduce the current same-day
correction. A future live adapter needs its own retained-byte acquisition,
timing extraction and record-index writer with new red tests.

The machine-readable sources of truth are `snapshot.schema.json`,
`source-timing.schema.json` and `snapshot-index.schema.json`. This document
explains their intended use and claim limits.
