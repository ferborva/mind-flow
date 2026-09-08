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
| `web/index.html` | Global public reasoning prototype | Descriptive source series, one bounded derived comparison, explicit unknowns, conditional paths and unauthorised action proposals |
| `../pilots/australia/web/index.html` | Australia evidence room using NERO | One occupation and one SA4 at a time, with modelled employment observations and all five AI-transition IFs left unknown |

Neither surface is approved for public warning or operational action.

## Architecture

The page never fetches live evidence. It renders a dated snapshot:

```text
source registries -> fetch_snapshot.py -> validated snapshot -> built HTML
```

This preserves the exact evidence used for a claim. `tools/build.mjs` performs
build-time JSON Schema and semantic validation before embedding a snapshot. It
fails if, among other checks, the seven-part update is absent, an update cites a
missing signal, a failure mode cites a missing leading signal, or an
unauthorised action claims an owner or authority.

The browser cannot load arbitrary local snapshots. A changed snapshot must go
through the build and test path.

## Seven-part public update

Schema 1.3 requires one bounded `public_update`:

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

## Repository map

| Path | Role |
|---|---|
| `schema/SCHEMA.md` | Human-readable snapshot contract |
| `schema/snapshot.schema.json` | Machine-readable contract |
| `tools/fetch_snapshot.py` | Builds a dated global snapshot from source registries |
| `tools/build.mjs` | Validates and embeds one global snapshot |
| `tools/build-nero-baseline.mjs` | Reduces an official NERO archive without aggregating occupations or regions |
| `tools/build-australia-pilot.mjs` | Validates and embeds the frozen Australian evidence room |
| `snapshots/` | Dated global snapshots and index |
| `web/index.template.html` | Global page source |
| `web/index.html` | Generated global page. Do not edit directly |
| `tests/` | Schema, semantics, generated-page and Australian-pilot tests |

## Build and test

```bash
python3 dashboard/tools/fetch_snapshot.py
node dashboard/tools/build.mjs \
  dashboard/snapshots/2026-09-07.json dashboard/web/index.html
node dashboard/tools/build-australia-pilot.mjs \
  pilots/australia/data/nero-clerical-2026-08.json \
  pilots/australia/web/index.html
npm test
```

The fetcher touches external registries. Building and testing use frozen local
evidence.

## What the global snapshot can say

The snapshot includes six measured global series, two derived aggregate
comparisons and eight deliberately unmeasured or unavailable instruments.
Measured does not mean decision-ready. The labour-income comparison, for
example, compares indexed output per person with constructed aggregate labour
income per person. It is not a household purchasing-power measure, causal AI
estimate or cohort outcome.

The missing instruments are visible because omission can create false
confidence. They include household access, transition speed, productive-power
concentration, response readiness, trust and cross-border access. Missingness
is an instrumentation backlog, not a neutral or safe state.

## Scenarios, failure modes and actions

- Scenario arithmetic uses explicit example assumptions or user-entered inputs.
  It is not seeded silently from observations and is not a forecast.
- Failure modes are unscored hypotheses. Evidence counts are an inventory, not
  a probability, readiness score or risk rating.
- Action cards are hidden until a person chooses a role. Every item is labelled
  `PROPOSAL, NOT AUTHORISED`.
- A public signal cannot become an operational action without a separate owner,
  authority, review, expiry, help route and appeal path.

## Australian evidence boundary

The Australian pilot freezes the August 2026 NERO archive and exposes 440
separate modelled series for five clerical occupations across 88 SA4 regions.
Jobs and Skills Australia says occupation and region estimates must not be
summed or combined, so the interface does neither.

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
- The static IF map is a vocabulary aid, not yet a scoped decision record.
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
