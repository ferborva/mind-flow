# Abundance Transition Observatory

> **Status:** Agent-built research prototype. Public release is blocked pending
> Fernando's substantive approval, affected-party comprehension testing,
> independent statistical review, accessibility review and release governance.

The Observatory is a public reasoning surface for a difficult transition. It
separates what was observed, who may be affected, what is inferred, which IF
condition changed, what action is authorised, what would falsify the reading,
and when evidence will be checked again.

It does not predict history, assign a single transition score, or confer policy
authority. The visual language can evoke long-range systems thinking. The
claims still have to survive ordinary evidence, democratic consent and
accountability.

## Two prototype surfaces

| Surface | Purpose | Claim limit |
|---|---|---|
| `web/index.html` | Global public reasoning prototype | Descriptive source series, one bounded derived comparison, explicit unknowns and an empty typed possible-path boundary |
| `../pilots/australia/web/index.html` | Australia evidence room using NERO | One occupation and one SA4 at a time, with modelled employment observations and all five AI-transition IFs left unknown |

Neither surface is approved for public warning or operational action. The
global snapshot schema accepts only `none` and `proposed` action states. It
rejects operational state claims even when their metadata looks complete,
because no trusted external authority-verification boundary exists yet.

## Architecture

The page never fetches live evidence. It renders one content-addressed record:

```text
retained response bytes + adapter extraction
-> governed snapshot record
-> build-time validation and timing assessment
-> self-contained HTML
```

This preserves the evidence envelope used for a claim. `tools/build.mjs` performs
build-time JSON Schema and semantic validation before embedding a snapshot. It
verifies a separately hash-pinned adapter and classification policy, every
record-index identity/path/digest and correction link, complete raw-input coverage for local-hash claims,
byte-to-series equivalence, derived arithmetic, timing and the seven-part
update. The default public build accepts only the latest indexed record. It also
rejects missing signal references and false authority claims.

`snapshot_id` names the evidence cut-off date. `record_id` names an immutable
revision of that dated claim record. This distinction permits a same-day
correction such as `2026-09-08.r2` without overwriting `2026-09-08.r1`. A later
correction keeps the original evidence-date identity while `generated_at` and
`correction.issued_on` record when the correction was actually produced.

The current snapshot is explicitly `research_draft_unverified`: its transformed
values are frozen, but its upstream response bytes were not retained. Every
visible evidence value and JSON export therefore says `UNVERIFIED SOURCE BYTES`.
Even retained bytes can establish only `captured_local_hash_consistent` status,
not publisher authenticity. `--mode=publishable` always fails with
`MISSING_TRUSTED_ACQUISITION_BOUNDARY` until a separately verifiable receipt
system exists. Captured inputs must also carry 2xx HTTP and matching media
metadata.

There is no single truthful freshness clock. Schema 2.0 keeps **reference
period**, **publisher vintage**, **publisher release**, **retrieval**, **byte
acquisition**, **derived computation** and **record generation** separate.
Build-time assessments use exact selected point lineage. An unknown clock stays
unknown and must not make a value look fresh. A recent retrieval cannot freshen
an old reference period, and a derived result cannot borrow the newest point in
a source it did not use. External observations are assessed separately for each
entity, measure and year. Derived lineage marks baseline, comparator and endpoint
roles, so an intentionally historical baseline cannot make a current endpoint
look stale. Unbound derived points say `TIMING NOT ASSESSED FOR THIS POINT`.
Legacy calendar retrieval dates are **reported and unverified retrieval
metadata**, not verified byte acquisition. Local publisher dates become bounded
civil-date intervals using recognised IANA timezones. Non-existent local dates
fail validation. Internal computation and assessment clocks remain unknown
until retained execution artifacts and a governed producer registry exist.
Caller assertions cannot promote them.

Assessment output separates assessment execution, structural lineage, input
timing readiness, evidence readiness and publication eligibility. A successful
assessment therefore does not imply ready evidence or permission to publish.
Each generated bundle is validated against
`schema/timing-assessment-set.schema.json`, names and hashes its evaluator, has
a canonical content address, and binds the record bytes, policy bytes, evidence
cut-off and record generation time. Historical records are validated through
the content-addressed `schema/snapshot-schema-registry.json`, not the latest
schema alone.

`tools/fetch_snapshot.py` is now a verifier for frozen v1.8 raw-input fixtures.
Its live writer is retired until a replacement satisfies the 2.0 timing and
acquisition contract. This means the current global record is a migration of a
frozen predecessor, not a new source fetch.

The browser cannot load arbitrary local snapshots. A changed snapshot must go
through the build and test path.

## Seven-part public update

Schema 2.0 requires one bounded `public_update` and exact source/derived-point
lineage:

1. **Observed:** the source-native or derived result and its uncertainty.
2. **Affected:** the defined population, or an explicit unknown.
3. **Inferred:** the bounded interpretation and inference class.
4. **IF changed:** the named condition and whether it changed state.
5. **Action and owner:** authority, owner, help and appeal, or explicit absence.
6. **Falsifier:** evidence that would narrow, reverse or withdraw the reading.
7. **Next check:** the dated, owned review, or a statement that none is governed.

The current global update is about the World aggregate. Selecting another place
does not relabel that update. Evidence panels never substitute World data when
the chosen place has no observation.

The required `if_path` adds a scoped `WHO + VERB + OUTCOME + STANDARD + PLACE +
PERIOD + IF` record. Every condition carries a state, reason, evidence grade,
strongest challenge and next observation. The current five conditions are all
unknown, so the registered decision is `no_decision`.

## Repository map

| Path | Role |
|---|---|
| `schema/SCHEMA.md` | Human-readable snapshot contract |
| `schema/snapshot.schema.json` | Machine-readable contract |
| `schema/source-timing.schema.json` | External, derived and instrument-gap clock contract |
| `schema/timing-assessment-set.schema.json` | Closed build-time assessment output contract |
| `schema/snapshot-schema-registry.json` | Content-addressed historical schema registry |
| `schema/snapshot-index.schema.json` | Immutable record-index contract |
| `schema/archive/snapshot-1.5.schema.json` | Frozen first public prototype schema |
| `schema/archive/snapshot-1.8.schema.json` | Frozen predecessor schema, retained for migration audit |
| `evidence/adapter-classification-policy.json` | Pinned source, selector and evidence-class policy |
| `evidence/archive/adapter-classification-policy-1.2.json` | Frozen predecessor policy |
| `timing/validation.mjs` | Clock, evidence-binding and exact-lineage assessment kernel |
| `tools/fetch_snapshot.py` | Verifies frozen raw-input manifests; live writing is retired |
| `tools/migrate-timing-contract.mjs` | Deterministically creates the 2.0 correction and record index |
| `tools/build.mjs` | Validates and embeds one global snapshot |
| `tools/build-nero-baseline.mjs` | Reduces an official NERO archive without aggregating occupations or regions |
| `tools/build-australia-pilot.mjs` | Validates and embeds the frozen Australian evidence room |
| `snapshots/` | Dated global snapshots and index |
| `web/index.template.html` | Global page source |
| `web/index.html` | Generated global page. Do not edit directly |
| `tests/` | Schema, semantics, generated-page and Australian-pilot tests |

## Build and test

```bash
node dashboard/tools/migrate-timing-contract.mjs
node dashboard/tools/build.mjs \
  dashboard/snapshots/2026-09-08.r2.json dashboard/web/index.html
node dashboard/tools/build-australia-pilot.mjs \
  pilots/australia/data/nero-clerical-2026-08.json \
  pilots/australia/web/index.html
npm test
```

The migration command is deterministic and pins the predecessor bytes. The
build and tests use frozen local evidence. To verify a retained legacy fixture,
run `python3 dashboard/tools/fetch_snapshot.py --verify-input-manifest PATH`.
Running the fetcher without that flag fails closed and cannot rewrite the 2.0
record index.

## What the global snapshot can say

The snapshot includes six available source series, two derived aggregate
comparisons and eight deliberately unmeasured or unavailable instruments.
Available does not mean directly observed or decision-ready. Each point is
labelled as a published statistic, published estimate, modelled estimate,
nowcast, forecast, direct observation or derived value. The labour-income
comparison, for example, compares indexed output per person with constructed aggregate labour
income per person. It is not a household purchasing-power measure, causal AI
estimate or cohort outcome.

The missing instruments are visible because omission can create false
confidence. They include household access, transition speed, productive-power
concentration, response readiness, trust and cross-border access. Missingness
is an instrumentation backlog, not a neutral or safe state.

## Scenarios, possible paths and actions

- Scenario arithmetic uses explicit example assumptions or user-entered inputs.
  It is not seeded silently from observations and is not a forecast.
- The current World snapshot has no registered typed possible-path assessment.
  It therefore displays no crisis path, forecast, option or action card.
- Free-text failure modes and actor playbooks were removed because labels alone
  could not bind hypotheses, discriminators, condition gates or authority.
- Non-empty possible-path references fail the build until the dashboard can
  resolve and validate their typed artifacts end to end.
- A public signal cannot become an operational action without a separate owner,
  authority, review, expiry, help route and appeal path.

The atlas download is deliberately a **selection-only artifact with external
record binding**. It contains only the selected series and their point timing
assessments, while preserving the source record, policy, evaluator and
assessment-bundle identities. It omits the seven-part public update because
that update is a separate claim graph whose dependencies may extend beyond the
current atlas selection.

## Australian evidence boundary

The Australian pilot freezes the August 2026 NERO archive and exposes 440
separate modelled series for five clerical occupations across 88 SA4 regions.
Jobs and Skills Australia says occupation and region estimates must not be
summed or combined, so the interface does neither.

The Australia record is pinned as `research_draft_unverified` with
`not_retained_unverified` source bytes. Its source/display metadata, chronology,
release availability, latest value and 12/60-month comparisons are validated;
the checksum is local capture metadata, not archive authentication.

This archive cannot support a historical warning backtest. It has no
as-published vintage panel, first-release revisions, uncertainty interval or
independent target labels. It can support a prospective, no-consequence shadow
rehearsal after governance gates pass. See
`../pilots/australia/nero-backtest-and-shadow-plan.md`.

## Known release blockers

- The seven-part update has not passed comprehension testing with affected
  workers, community organisations, policy decision-makers or general readers.
- No approved action owner, authority, help route or appeal path exists.
- Global indicators do not carry complete point-of-claim uncertainty and
  revision metadata.
- The IF path is now a validated decision record, but the current claim still
  lacks an approved cohort, geography, horizon and outcome threshold. All five
  conditions therefore remain `unknown` and no action is eligible.
- Keyboard, screen-reader, contrast, reduced-motion and mobile behaviour need
  rendered accessibility verification.
- Privacy, security, data-governance and correction processes need independent
  review.
- The prospective Australian rehearsal has not accumulated future vintages or
  independent outcome evidence.

## Provenance and editorial authority

The code, research and wording are agent proposals. Source series remain
third-party facts with dates and caveats. Nothing in this dashboard becomes
Fernando's view until he reviews and adopts it. Corrections remain visible in
the page and repository history.
