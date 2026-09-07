# The snapshot contract

**Version 1.2.0**

One rule governs this whole directory: **the website never talks to a data
provider.** It renders a snapshot. That is the entire architecture, and every
other decision follows from it.

```
open registries  →  fetch_snapshot.py  →  snapshots/YYYY-MM-DD.json  →  the page
   (the world)         (runs here)            (the contract)            (renders)
```

## Why a snapshot and not a live feed

Three reasons, in order of importance.

1. **Provenance.** Every figure in this repository carries a source and a
   retrieval date. A live dashboard silently changes underneath an argument that
   cited it. A snapshot is a dated, checkable, quotable object. If someone
   disputes a number in a piece, they can be handed the exact snapshot the piece
   was written against.
2. **The page is sandboxed.** A published artifact cannot make network calls to
   data hosts. Even if we wanted live, we could not have it there.
3. **Reproducibility.** A snapshot is a file. It can be diffed, archived and
   replayed. "What did the labour share series look like when we made that
   claim" is answerable forever.

## The compatibility promise

**Any snapshot that validates against `snapshot.schema.json` v1.x renders in any
v1.x build of the page.** That is the whole point of the contract.

The page does not know the names of signals in advance. It reads whatever is in
the `signals` array and renders it. Add a signal to a future snapshot and it
appears. Remove one and it vanishes. **No page rebuild required.**

Consequences worth stating:
- Signals are **data, not code**. A new signal is a fetcher change plus a
  snapshot, never a page change.
- The page must degrade gracefully on anything it does not recognise: unknown
  `family`, missing `latest`, empty `series`, `status: not_measured`.
- Breaking the shape means a major version bump and a page that declares which
  schema versions it accepts.

## Versioning

`schema_version` is semver.

| Change | Bump |
|---|---|
| New optional field | patch |
| New signal, new family, new source | patch (data, not schema) |
| New required field the page needs | minor, page must tolerate its absence |
| Renamed or removed field, changed meaning | **major** |

The page declares `ACCEPTS` (e.g. `1.x`) and refuses politely outside it, rather
than rendering something misleading.

## Top level

```jsonc
{
  "schema_version": "1.2.0",
  "snapshot_id": "2026-09-07",         // YYYY-MM-DD, unique, sortable
  "generated_at": "2026-09-07T10:00:00Z",
  "generator": "fetch_snapshot.py@1.2.0",
  "title": "Signals toward the transition",
  "notes": "Free text. Anything a reader needs to know about this run.",
  "entities": [ /* see below */ ],
  "signals": [ /* see below */ ],
  "crises": [ /* optional crisis-control contracts */ ],
  "playbooks": { /* optional actor-phase action contracts */ }
}
```

## Entities

Places a series can be about. Kept separate so signals reference them by code
and the page can build a consistent country picker.

```jsonc
{ "code": "OWID_WRL", "name": "World", "kind": "aggregate" }
{ "code": "ESP",      "name": "Spain", "kind": "country" }
```

`kind`: `aggregate` | `country` | `region`.

## Signals

The unit of the dashboard. One measurable thing.

```jsonc
{
  "id": "labour-share",                  // stable slug, never reused
  "name": "Labour share of GDP",
  "family": "engels",                    // grouping for layout
  "status": "measured",                  // measured | derived | not_measured
  "unit": "percent",                     // percent | ratio | index | usd | count
  "precision": 1,                        // decimal places for display

  "question": "Who is getting the gains?",
  "why_it_matters": "One sentence on what this tells you.",
  "trouble_reading": "The value that means we are in trouble.",
  "direction": "up_is_good",             // up_is_good | down_is_good | neutral

  "method": "Only for derived signals. How it was computed, in words.",
  "caveats": ["Anything that would embarrass us if a reader found it first."],

  "source": {
    "name": "Our World in Data / ILOSTAT",
    "url": "https://...",
    "retrieved": "2026-09-07",
    "note": "SDG indicator 10.4.1"
  },

  "series": [
    {
      "entity": "OWID_WRL",
      "points": [[2010, 53.1], [2011, 52.8]]   // [year, value], year-ascending
    }
  ],

  "latest": { "entity": "OWID_WRL", "year": 2023, "value": 52.3 }
}
```

### `status` is load-bearing

| Value | Meaning | How the page treats it |
|---|---|---|
| `measured` | Straight from a registry | Normal chart |
| `derived` | Computed by us from measured inputs. **`method` required.** | Chart plus a visible method note |
| `not_measured` | **The instrument does not exist yet.** `series` is empty. | Rendered as a deliberate gap, not hidden |

**`not_measured` is the most important value in this schema.** The zero-cost
count is the signal this whole argument turns on and nobody publishes it. A
dashboard that quietly omitted it would be lying by composition. It appears, it
is empty, and the page says why.

## Nulls and gaps

- A missing year is an **absent point**, never a zero and never interpolated.
- `latest` is the most recent non-null point, and carries its own year, because
  different signals are current to different years. **Never imply data is more
  recent than it is.**

## Adding a signal

1. Add an adapter in `tools/fetch_snapshot.py`.
2. Re-run it. A new dated snapshot appears.
3. Nothing else. The page picks it up.

If step 3 required touching the page, the contract is broken and that is a bug
in the page, not in the snapshot.

## Crisis contracts

Schema 1.2 adds optional crisis contracts. Their state remains `unscored` until
the required signals and defensible activation thresholds exist. The interface
may show instrumentation coverage, but it must not turn coverage into risk.

```jsonc
{
  "id": "credibility-break",
  "name": "The credibility break",
  "status": "unscored",                 // unscored | watch | activated
  "condition": "Capability rises while access falls.",
  "why_it_matters": "…",
  "movement": "…",
  "communication": "…",
  "leading_signals": ["inflation", "access-margin"],
  "actions": { "prepare": "…", "protect": "…", "recover": "…" }
}
```

## Actor playbooks

`playbooks` is keyed by actor. Each entry has a public label, a governing
principle, and non-empty action lists for `now`, `warning`, and `crisis`.

The human-readable contract is complemented by `snapshot.schema.json`, which is
the machine-checkable source for types and required fields.
