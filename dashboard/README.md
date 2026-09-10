# Abundance Transition Observatory

> **Status:** Agent-built research prototype. Public release is blocked pending
> Fernando's substantive approval, affected-party comprehension testing,
> independent statistical review, accessibility review and release governance.

The Observatory is a public reasoning surface for a difficult transition. It
separates what was observed, who may be affected, what is inferred, which IF
condition changed, whether any authorised decision exists, who may act, what
remains optional, how to challenge the record, what would falsify the reading,
and when evidence will be checked again.

The visual language can evoke long-range systems thinking. The
claims still have to survive ordinary evidence, democratic consent and
accountability.

## Three prototype surfaces

| Surface | Purpose | Claim limit |
|---|---|---|
| `web/index.html` | Global public reasoning prototype | Descriptive source series, one bounded derived comparison, explicit unknowns and an explicitly unbound typed possible-path boundary |
| `../pilots/australia/web/index.html` | Australian primary-care basket and separate NERO evidence room | Five GP category indicators have different populations, dates and roles; today's binding category remains unknown. NERO stays one occupation and one SA4 at a time |
| `observatory/index.html` | **Transition Observatory, programme iteration 06 over the Round 04 synthetic fixture** | Interactive projection of the exact synthetic seven-artifact pre-projection core, with five-state branches, a separate forecast, reversible preparation and no authority |

## Architecture

[Operator details](OPERATIONS.md) covers validation, evidence acquisition, synthetic fixtures and release governance.

The page never fetches live evidence. It renders one content-addressed record:

```text
retained response bytes + adapter extraction
-> governed snapshot record
-> build-time validation and timing assessment
-> self-contained HTML
```

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
| `schema/archive/snapshot-2.0.schema.json` | Frozen timing-correction schema, retained for migration audit |
| `evidence/adapter-classification-policy.json` | Pinned source, selector and evidence-class policy |
| `evidence/archive/adapter-classification-policy-1.2.json` | Frozen predecessor policy |
| `timing/validation.mjs` | Clock, evidence-binding and exact-lineage assessment kernel |
| `tools/fetch_snapshot.py` | Verifies frozen raw-input manifests; live writing is retired |
| `tools/migrate-timing-contract.mjs` | Deterministically creates the 2.0 correction and record index |
| `tools/transition-bundle-binding.mjs` | Resolves bundle-bound path artifacts and creates the derived public projection |
| `tools/validate-executable-if-view.mjs` | Purely validates a receipt-bound executable IF dashboard projection |
| `schema/executable-if-view.schema.json` | Contract for five-state IF display, provenance and context separation |
| `tools/build.mjs` | Validates and embeds one global snapshot |
| `tools/build-nero-baseline.mjs` | Reduces an official NERO archive without aggregating occupations or regions |
| `tools/build-australia-pilot.mjs` | Validates and embeds the frozen Australian evidence room |
| `observatory/build.mjs` | Builds the programme iteration 06 static Observatory from its coherent Round 04 pre-projection core |
| `observatory/` | Generated programme iteration 06 experience, local source projection and focused tests |
| `snapshots/` | Dated global snapshots and index |
| `web/index.template.html` | Global page source |
| `web/index.html` | Generated global page. Do not edit directly |
| `tests/` | Schema, semantics, generated-page and Australian-pilot tests |

## Build and test

Run from the repository root with Node.js 22 and installed dependencies. The
canonical `npm run build:artifacts` rebuilds all governed generated outputs;
the explicit commands below show the two evidence-room inputs.

```bash
node dashboard/tools/build.mjs \
  dashboard/snapshots/2026-09-09.r1.json dashboard/web/index.html
node dashboard/tools/build-australia-pilot.mjs \
  pilots/australia/data/nero-clerical-2026-08.r2.json \
  pilots/australia/web/index.html
node dashboard/observatory/build.mjs --check
npm test
```

The build and tests use frozen local evidence. The timing migration tool exists
to reproduce the historical September 8 `r2` record, not to create the active
September 9 `r1` record.
To verify a retained legacy fixture,
run `python3 dashboard/tools/fetch_snapshot.py --verify-input-manifest PATH`.
Running the fetcher without that flag fails closed and cannot rewrite the 2.0
record index.

Raw-input verification resolves the governed evidence root and candidate file
to real paths, rejects symbolic links and non-regular files, then opens with the
platform no-follow flag before hashing. A lexical in-root path cannot redirect
the build to bytes outside `dashboard/evidence/raw`.
