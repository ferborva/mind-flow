# dashboard

**Seldon Observatory.** Instrumentation for the transition. A portal for arguing
about the signals rather than the slogans.

Live: https://claude.ai/code/artifact/4a869745-1f2f-46c8-a1cb-7d80ba9f0bdb

## The one architectural decision

**The page never talks to a data provider. It renders a snapshot.**

```
open registries  →  tools/fetch_snapshot.py  →  snapshots/YYYY-MM-DD.json  →  web/index.html
   (the world)          (runs here)                 (the contract)              (renders)
```

Three reasons, in order.

1. **Provenance.** Every figure in this repo carries a source and a retrieval
   date. A live dashboard silently changes underneath the argument that cited it.
   A snapshot is dated, checkable and quotable: if someone disputes a number in a
   piece, hand them the exact file the claim was written against.
2. **The page is sandboxed.** A published artifact cannot make network calls to
   data hosts. Live was never on the table there.
3. **Reproducibility.** A snapshot is a file. Diff it, archive it, replay it.

## Layout

| Path | What it is |
|---|---|
| `schema/SCHEMA.md` | The contract. Read this first. |
| `tools/fetch_snapshot.py` | Pulls the signals, writes a dated snapshot |
| `snapshots/` | Dated snapshots plus `index.json` |
| `web/index.template.html` | The page, with a `__SNAPSHOT__` placeholder |
| `web/index.html` | Built page with a snapshot baked in. **Generated, do not edit.** |

## Refreshing

```bash
python3 dashboard/tools/fetch_snapshot.py          # today's snapshot
python3 - <<'PY'                                    # rebuild the page
import json
tpl=open("dashboard/web/index.template.html",encoding="utf-8").read()
d=json.dumps(json.load(open("dashboard/snapshots/2026-09-07.json",encoding="utf-8")),
             separators=(",",":")).replace("</","<\\/")
open("dashboard/web/index.html","w",encoding="utf-8").write(tpl.replace("__SNAPSHOT__",d))
PY
```

Then republish `web/index.html` to the same artifact URL. **This is a natural
scheduled-run job**: refresh, rebuild, republish, and note in the commit what
moved.

Edit `index.template.html`, never `index.html`.

## Future compatibility

Any snapshot validating against schema **1.x** renders in any 1.x build of the
page, without a rebuild. The page reads whatever is in `signals` and lays it out;
it does not know signal names in advance.

Two ways to render a different snapshot:

- **Bake it in.** Rebuild as above. This is what the published page shows.
- **Load it in the browser.** The page has a **Load snapshot…** control that
  reads a local JSON file. Nothing is uploaded. A future snapshot can be checked
  against the live page before it is ever published.

Adding a signal is a fetcher change plus a snapshot. If it needed a page change,
the contract is broken and that is a bug in the page.

## What is in the first snapshot

| Signal | Status | Source |
|---|---|---|
| The transmission test | derived | Computed from labour share and inflation |
| Labour share of GDP | measured | OWID / ILOSTAT, SDG 10.4.1 |
| GDP per capita | measured | World Bank, NY.GDP.PCAP.KD |
| Consumer price inflation | measured | World Bank, FP.CPI.TOTL.ZG |
| Living on less than $30/day | measured | OWID / World Bank PIP |
| Living on less than $8.30/day | measured | OWID / World Bank PIP |
| Labour force participation | measured | World Bank / ILO |
| **Zero-cost count** | **not measured** | **No registry publishes this** |
| **The Baumol gap** | **not measured** | Constructible, not yet constructed |

## The two empty panels are the point

`zero-cost-count` and `baumol-gap` render as visible voids with the reason
attached. They are not omissions.

The zero-cost count is the metric this whole argument turns on, and nobody
publishes it. **A dashboard that quietly dropped its own blind spot would be
lying by composition.** Showing the hole is also the honest way to claim the
metric is novel: it is not tracked because it does not exist yet, and defining
it (which basket, what threshold, does advertiser-funded count) is unfinished
work sitting in `meta/backlog.md`.

## Provenance

A dashboard is **research, not his substance**. Series are third-party facts with
sources and dates. The derived signal states its method and its caveats in the
snapshot, and the page renders both. Nothing here becomes an opinion of Fer's
unless he says it in a capture.

## Known limits

- **No cohort cuts.** A national average can pass while a displaced cohort
  fails. That is exactly what happened during Engels' Pause. This is the most
  important missing thing.
- **Headline CPI is a poor stand-in** for a decent-living basket. The basket
  question is unresolved and it changes the transmission test's answer.
- **Labour share reports with a long lag**, so recent years are thin and the
  most recent transmission reading rests on fewer countries than it looks.
- **Asset ownership is arguably a third transmission channel** and is not here.
