# The snapshot contract

**Version 1.3.0**

The Observatory renders a frozen, validated snapshot. It does not query data
providers in the browser.

```text
source registries -> fetch_snapshot.py -> snapshot JSON -> build validation -> HTML
```

The JSON Schema is the type contract. `tools/build.mjs` adds semantic validation
for relationships that JSON Schema alone cannot prove.

## Compatibility and release rule

`schema_version` uses semantic versioning. A 1.x template may tolerate older
optional fields, but publishable builds must satisfy the requirements of the
template and validator being used. Compatibility never permits silent loss of
authority, provenance, scope or uncertainty.

| Change | Version change |
|---|---|
| New optional metadata | Patch |
| New signal or source | Patch |
| New required decision field | Minor |
| Renamed, removed or semantically changed field | Major |

The current build requires schema 1.3.x and one complete seven-part public
update.

## Top-level shape

```jsonc
{
  "schema_version": "1.3.0",
  "snapshot_id": "2026-09-07",
  "generated_at": "2026-09-07T10:00:00Z",
  "generator": "fetch_snapshot.py@1.3.0",
  "title": "Signals toward the transition",
  "notes": "Run-level context and limits.",
  "entities": [],
  "signals": [],
  "public_update": {},
  "crises": [],
  "playbooks": {}
}
```

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
| `measured` | Included from a named source. This does not mean decision-ready |
| `derived` | Constructed from included measures with a visible method |
| `not_measured` | Required instrument is absent by design or unavailable in the evidence system |
| `unavailable` | A fetch or source failure occurred for this snapshot |

A missing point is absent, never zero, forward-filled or interpolated without a
separate declared method. `latest` is snapshot metadata. The interface derives
a displayed latest value from the selected entity's actual series.

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

The update also carries its own provenance and scope. The current allowed
inference classes include descriptive readings. Causal or forecast claims need
additional governed evidence contracts and cannot be produced merely by
changing prose.

An action with `authorization_state: none` must not claim an owner or authority.
A check marked related to an inference must name both a date and owner.

## Failure-mode contracts

`crises` currently contains possible failure modes, not crisis predictions.
Each record includes a condition, plural possible public responses, leading
signal identifiers and reversible prepare, protect and recover proposals.

States are `unscored`, `watch` or `activated`. The current snapshot keeps these
records unscored. A count of available leading signals is not a probability,
risk score or activation threshold.

Every leading signal identifier must resolve to a signal in the same snapshot.

## Actor playbooks

`playbooks` groups proposed options by actor and phase. The interface begins
with no actor selected and labels each option `PROPOSAL, NOT AUTHORISED`.

These string lists are communication scaffolding, not operational action
records. Operational use requires separate contracts for IF condition, owner,
authority, consent, affected population, help, appeal, review, expiry and stop
conditions.

## Validation layers

The build must pass both layers:

1. **JSON Schema validation:** types, required fields, enums, formats and local
   object structure.
2. **Semantic validation:** entity references, source-signal references,
   failure-mode signal references, authority consistency and governed next-check
   requirements.

Validation prevents known structural contradictions. It does not prove that a
source is correct, an inference is warranted, a public explanation is
understood, or an action is legitimate.

## Adding or changing evidence

1. Change the fetcher or bounded extraction tool.
2. Create a new snapshot. Never overwrite the evidence used for a prior claim.
3. Run the schema and semantic tests.
4. Review the generated diff, including changes to source dates, missingness and
   public interpretation.
5. Rebuild the page.
6. Pass the separate public-release governance gates before publication.

The machine-readable source of truth for structure is
`snapshot.schema.json`. This document explains its intended use and claim
limits.
