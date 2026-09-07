#!/usr/bin/env python3
"""
fetch_snapshot.py 1.0.0

Pulls the transition signals from open data registries and writes a snapshot
conforming to dashboard/schema/snapshot.schema.json (v1.0.0).

    python3 dashboard/tools/fetch_snapshot.py            # writes today's snapshot
    python3 dashboard/tools/fetch_snapshot.py --id 2026-09-07

Design rules, enforced here so the contract holds:
  - never invent a data point, never interpolate, never carry forward
  - every signal records its source url and retrieval date
  - a signal that cannot be fetched is emitted with status "unavailable" and an
    empty series, rather than silently dropped
  - a signal nobody publishes is emitted with status "not_measured" on purpose
"""

import argparse, csv, io, json, sys, urllib.request, datetime, os

GENERATOR = "fetch_snapshot.py@1.0.0"
SCHEMA_VERSION = "1.0.0"
TIMEOUT = 60

# Entities we pull. World first; the rest give cross-country variance.
ENTITIES = [
    ("OWID_WRL", "World",         "aggregate", "WLD"),
    ("USA",      "United States", "country",   "USA"),
    ("DEU",      "Germany",       "country",   "DEU"),
    ("ESP",      "Spain",         "country",   "ESP"),
    ("AUS",      "Australia",     "country",   "AUS"),
    ("CHN",      "China",         "country",   "CHN"),
    ("IND",      "India",         "country",   "IND"),
]
OWID_NAMES = {"OWID_WRL": "World", "USA": "United States", "DEU": "Germany",
              "ESP": "Spain", "AUS": "Australia", "CHN": "China", "IND": "India"}
WB_CODES = {c: wb for c, _, _, wb in ENTITIES}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "mind-flow-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", errors="replace")


# ---------------------------------------------------------------- adapters

def owid(slug, value_col=None):
    """Our World in Data grapher CSV -> {entity_code: [[year, value], ...]}"""
    raw = get(f"https://ourworldindata.org/grapher/{slug}.csv")
    rows = list(csv.DictReader(io.StringIO(raw)))
    if not rows:
        raise RuntimeError("empty csv")
    cols = [c for c in rows[0] if c not in ("Entity", "Code", "Year")]
    col = value_col or cols[0]
    out = {}
    for r in rows:
        code = (r.get("Code") or "").strip()
        if code not in OWID_NAMES:
            continue
        try:
            y = int(r["Year"]); v = float(r[col])
        except (ValueError, TypeError, KeyError):
            continue
        out.setdefault(code, []).append([y, round(v, 4)])
    for k in out:
        out[k].sort(key=lambda p: p[0])
    return out


def worldbank(indicator):
    """World Bank API -> {entity_code: [[year, value], ...]}"""
    out = {}
    codes = ";".join(WB_CODES[c] for c, _, _, _ in ENTITIES)
    url = (f"https://api.worldbank.org/v2/country/{codes}/indicator/{indicator}"
           f"?format=json&per_page=20000")
    data = json.loads(get(url))
    if len(data) < 2 or not data[1]:
        raise RuntimeError("no data")
    rev = {wb: c for c, _, _, wb in ENTITIES}
    for row in data[1]:
        if row.get("value") is None:
            continue
        # country.id is the 2-letter code; countryiso3code carries the 3-letter one
        iso3 = (row.get("countryiso3code") or "").strip()
        code = rev.get(iso3)
        if not code and row["country"]["id"] in ("1W", "WLD"):
            code = "OWID_WRL"
        if not code:
            continue
        out.setdefault(code, []).append([int(row["date"]), round(float(row["value"]), 4)])
    for k in out:
        out[k].sort(key=lambda p: p[0])
    return out


# ---------------------------------------------------------------- signals

def S(**kw):
    kw.setdefault("caveats", [])
    return kw


SIGNAL_DEFS = [
    dict(
        id="labour-share", name="Labour share of GDP", family="engels",
        unit="percent", precision=1, direction="up_is_good",
        question="Who is getting the gains?",
        why_it_matters="The share of everything produced that reaches people as labour income. During Engels' Pause this fell while output soared.",
        trouble_reading="A sustained fall while output per person rises.",
        source=dict(name="Our World in Data / ILOSTAT (SDG 10.4.1)",
                    url="https://ourworldindata.org/grapher/labor-share-of-gdp",
                    note="SDG indicator 10.4.1, labour income share as a percent of GDP"),
        fetch=lambda: owid("labor-share-of-gdp"),
    ),
    dict(
        id="gdp-per-capita", name="GDP per capita", family="engels",
        unit="usd", precision=0, direction="up_is_good",
        question="Is output still growing?",
        why_it_matters="The output side of the Engels comparison. Read against labour share, not on its own.",
        trouble_reading="Rising steadily while labour share falls. That is the pause.",
        source=dict(name="World Bank Open Data",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.PCAP.KD",
                    note="NY.GDP.PCAP.KD, constant 2015 US$"),
        fetch=lambda: worldbank("NY.GDP.PCAP.KD"),
    ),
    dict(
        id="poverty-30", name="Living on less than $30 a day", family="conditions",
        unit="percent", precision=1, direction="down_is_good",
        question="How many people are on the wrong side of the money condition?",
        why_it_matters="Roughly a developed-world floor. The single clearest measure of who the abundance promise currently excludes.",
        trouble_reading="Flat, while capability and output rise.",
        source=dict(name="Our World in Data / World Bank PIP",
                    url="https://ourworldindata.org/grapher/poverty-share-on-less-than-30-per-day",
                    note="2021 international prices"),
        fetch=lambda: owid("poverty-share-on-less-than-30-per-day"),
    ),
    dict(
        id="poverty-830", name="Living on less than $8.30 a day", family="conditions",
        unit="percent", precision=1, direction="down_is_good",
        question="How many are below the upper-middle-income line?",
        why_it_matters="The World Bank's upper-middle-income poverty line, revised upward in June 2025.",
        trouble_reading="Stalling. The last mile is the hardest and the most expensive.",
        source=dict(name="Our World in Data / World Bank PIP",
                    url="https://ourworldindata.org/grapher/share-living-with-less-than-upper-middle-income-poverty-line",
                    note="$8.30/day, 2021 international prices"),
        fetch=lambda: owid("share-living-with-less-than-upper-middle-income-poverty-line"),
    ),
    dict(
        id="participation", name="Labour force participation rate", family="labour",
        unit="percent", precision=1, direction="neutral",
        question="Are people still choosing to work?",
        why_it_matters="The closest available proxy for the reservation-wage problem. If needs are met without work, this is where it shows first.",
        trouble_reading="Falling in essential, human-required work while output holds up.",
        caveats=["A blunt proxy. Participation falls for ageing and study as well as for choice.",
                 "Does not distinguish the residue of human-required work from the rest."],
        source=dict(name="World Bank Open Data / ILO modelled estimates",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/SL.TLF.CACT.ZS",
                    note="SL.TLF.CACT.ZS, ages 15+"),
        fetch=lambda: worldbank("SL.TLF.CACT.ZS"),
    ),
    dict(
        id="inflation", name="Consumer price inflation", family="prices",
        unit="percent", precision=1, direction="down_is_good",
        question="Are prices actually falling?",
        why_it_matters="The price channel of the transmission test. Abundance requires this to go negative for real baskets, not merely to slow.",
        trouble_reading="Persistently positive. Deflation of goods is not showing up in what households actually buy.",
        caveats=["Headline CPI, not a decent-living basket. The basket question is unresolved."],
        source=dict(name="World Bank Open Data",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/FP.CPI.TOTL.ZG",
                    note="FP.CPI.TOTL.ZG, annual %"),
        fetch=lambda: worldbank("FP.CPI.TOTL.ZG"),
    ),
]

# Signals that exist as a definition but not as data anywhere.
NOT_MEASURED = [
    dict(
        id="zero-cost-count", name="Zero-cost count", family="prices",
        unit="count", precision=0, direction="up_is_good",
        question="How many things now cost nothing, end to end?",
        why_it_matters="The count of products and services at near-zero cost to produce AND to deliver. The proposed target for businesses and tracked statistic for countries.",
        trouble_reading="Flat while capability rises. Capability that never reaches a zero price is not abundance.",
        method="Not yet defined. Requires a basket, a threshold for 'close to zero', and a ruling on whether free-to-consumer but advertiser-funded counts.",
        caveats=["No registry publishes this. Searched, not found.",
                 "The definition has to be settled before the number can exist."],
        source=dict(name="Does not exist", url="", note="Proposed metric. No published index found."),
    ),
    dict(
        id="baumol-gap", name="The Baumol gap", family="prices",
        unit="percent", precision=1, direction="down_is_good",
        question="How fast is the human-required residue getting relatively more expensive?",
        why_it_matters="Price index of automatable baskets against human-required ones. Predicts that the residue gets dearer as everything else deflates.",
        trouble_reading="Widening with no policy response.",
        method="Not yet computed. Requires splitting CPI components into automatable and human-required, which is a judgement call rather than a data problem.",
        caveats=["CPI component data exists. The split does not, and choosing it is contestable."],
        source=dict(name="Constructible, not yet constructed",
                    url="https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_midx",
                    note="Inputs available from Eurostat HICP components"),
    ),
]


def build(snapshot_id, retrieved):
    signals, log = [], []

    for d in SIGNAL_DEFS:
        fetch = d.pop("fetch")
        sig = dict(d)
        sig["status"] = "measured"
        sig["source"] = dict(sig["source"], retrieved=retrieved)
        try:
            data = fetch()
            sig["series"] = [{"entity": e, "points": p} for e, p in sorted(data.items()) if p]
            world = data.get("OWID_WRL") or (list(data.values())[0] if data else [])
            if world:
                ent = "OWID_WRL" if data.get("OWID_WRL") else sorted(data)[0]
                sig["latest"] = {"entity": ent, "year": world[-1][0], "value": world[-1][1]}
            log.append(f"  ok         {sig['id']:20} {len(sig['series'])} entities")
        except Exception as exc:
            sig["status"] = "unavailable"
            sig["series"] = []
            sig["caveats"] = list(sig.get("caveats", [])) + [f"Fetch failed on {retrieved}: {exc}"]
            log.append(f"  FAILED     {sig['id']:20} {exc}")
        signals.append(sig)

    for d in NOT_MEASURED:
        sig = dict(d)
        sig["status"] = "not_measured"
        sig["series"] = []
        sig["source"] = dict(sig["source"], retrieved=retrieved)
        signals.append(sig)
        log.append(f"  by design  {sig['id']:20} not_measured")

    # Derived: the transmission test. Components only, deliberately.
    signals.append(derive_transmission(signals, retrieved, log))

    return {
        "schema_version": SCHEMA_VERSION,
        "snapshot_id": snapshot_id,
        "generated_at": datetime.datetime.now(datetime.timezone.utc)
                        .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "generator": GENERATOR,
        "title": "Signals toward the transition",
        "notes": ("First prototype snapshot. Every measured series comes straight from an open "
                  "registry with no interpolation. Two signals are deliberately empty: nobody "
                  "publishes them yet, and hiding that would be dishonest."),
        "entities": [{"code": c, "name": n, "kind": k} for c, n, k, _ in ENTITIES],
        "signals": signals,
    }, log


def derive_transmission(signals, retrieved, log):
    """
    The transmission test: are prices falling faster than labour share?
    Reported as an annual difference in percentage points, not a ratio, because
    a ratio explodes when the denominator approaches zero.
    """
    by_id = {s["id"]: s for s in signals}
    infl = {e["entity"]: dict(e["points"]) for e in by_id["inflation"].get("series", [])}
    lab = {e["entity"]: dict(e["points"]) for e in by_id["labour-share"].get("series", [])}

    series = []
    for ent in sorted(set(infl) & set(lab)):
        pts = []
        years = sorted(set(lab[ent]) & set(infl[ent]))
        for y in years:
            if (y - 1) not in lab[ent]:
                continue
            d_lab = lab[ent][y] - lab[ent][y - 1]      # pp change in labour share
            price_relief = -infl[ent][y]                # negative inflation = relief
            pts.append([y, round(price_relief + d_lab, 3)])
        if pts:
            series.append({"entity": ent, "points": pts})

    sig = dict(
        id="transmission-test", name="The transmission test", family="transmission",
        status="derived", unit="percent", precision=2, direction="up_is_good",
        question="Are prices falling faster than wages are disappearing?",
        why_it_matters=("Money reaches people through wages or through prices. Automation severs the "
                        "first using the same capital meant to deliver the second. This is the only "
                        "falsifiable claim in the whole abundance argument."),
        trouble_reading="Below zero. Prices are not compensating for what labour is losing.",
        method=("Annual price relief plus the annual change in labour share, in percentage points. "
                "Price relief is the negative of consumer price inflation, so falling prices score "
                "positive. Above zero means the price channel is outrunning the wage channel. "
                "Reported as a difference rather than a ratio because a ratio explodes as the "
                "denominator approaches zero."),
        caveats=["Provisional. Headline CPI is a poor stand-in for a decent-living basket.",
                 "A national average can pass while a displaced cohort fails. Needs cohort cuts.",
                 "Labour share is reported with a long lag, so recent years are thin.",
                 "Excludes asset ownership, which is arguably a third transmission channel."],
        source=dict(name="Derived from labour-share and inflation signals",
                    url="", retrieved=retrieved,
                    note="Computed by fetch_snapshot.py, not published anywhere"),
        series=series,
    )
    world = next((e["points"] for e in series if e["entity"] == "OWID_WRL"), None)
    if world:
        sig["latest"] = {"entity": "OWID_WRL", "year": world[-1][0], "value": world[-1][1]}
    log.append(f"  derived    {sig['id']:20} {len(series)} entities")
    return sig


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", default=datetime.date.today().isoformat())
    ap.add_argument("--out", default="dashboard/snapshots")
    args = ap.parse_args()

    print(f"building snapshot {args.id}")
    snap, log = build(args.id, args.id)
    print("\n".join(log))

    os.makedirs(args.out, exist_ok=True)
    path = os.path.join(args.out, f"{args.id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(snap, f, indent=1, ensure_ascii=False)

    # refresh the index so the site can list available snapshots
    ids = sorted(f[:-5] for f in os.listdir(args.out)
                 if f.endswith(".json") and f != "index.json")
    with open(os.path.join(args.out, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"schema_version": SCHEMA_VERSION, "latest": ids[-1],
                   "snapshots": [{"id": i, "path": f"{i}.json"} for i in ids]},
                  f, indent=1)

    kb = os.path.getsize(path) / 1024
    measured = sum(1 for s in snap["signals"] if s["status"] == "measured")
    print(f"\nwrote {path} ({kb:.0f} KB), {len(snap['signals'])} signals, {measured} measured")


if __name__ == "__main__":
    sys.exit(main())
