#!/usr/bin/env python3
"""
fetch_snapshot.py 1.2.0

Pulls the transition signals from open data registries and writes a snapshot
conforming to dashboard/schema/snapshot.schema.json (v1.2.0).

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

GENERATOR = "fetch_snapshot.py@1.2.0"
SCHEMA_VERSION = "1.2.0"
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
        why_it_matters="The share of output recorded as labour income. It is one distributional indicator, not a measure of household access on its own.",
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
        why_it_matters="An aggregate output baseline. Read with distribution, household resources and access measures, never on its own.",
        trouble_reading="Rising output alongside sustained cohort-level earnings or access deterioration.",
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
        caveats=["The most recent years are modelled nowcasts, not survey estimates. Treat the "
                 "tail of this series as a projection.",
                 "Rests on PPP conversion, which is itself contested for cross-country comparison."],
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
        caveats=["The most recent years are modelled nowcasts, not survey estimates.",
                 "The World Bank raised this line in June 2025; the series is not comparable "
                 "across that revision without care."],
        source=dict(name="Our World in Data / World Bank PIP",
                    url="https://ourworldindata.org/grapher/share-living-with-less-than-upper-middle-income-poverty-line",
                    note="$8.30/day, 2021 international prices"),
        fetch=lambda: owid("share-living-with-less-than-upper-middle-income-poverty-line"),
    ),
    dict(
        id="participation", name="Labour force participation rate", family="labour",
        unit="percent", precision=1, direction="neutral",
        question="How is labour-market participation changing?",
        why_it_matters="A broad measure of connection to paid labour. It can identify where more specific cohort and worker-flow evidence is needed.",
        trouble_reading="A cohort-specific decline accompanied by involuntary non-participation, longer job searches or fewer desired hours.",
        caveats=["This aggregate does not reveal why participation changed. Ageing, education, disability, discouraged work, care and preference can all move it.",
                 "It cannot distinguish voluntary choice, automation effects or human-required work."],
        source=dict(name="World Bank Open Data / ILO modelled estimates",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/SL.TLF.CACT.ZS",
                    note="SL.TLF.CACT.ZS, ages 15+"),
        fetch=lambda: worldbank("SL.TLF.CACT.ZS"),
    ),
    dict(
        id="inflation", name="Consumer price inflation", family="prices",
        unit="percent", precision=1, direction="down_is_good",
        question="Are prices actually falling?",
        why_it_matters="The price channel. Abundance requires this to go negative for real baskets, not merely to slow.",
        trouble_reading="Persistently positive. Deflation of goods is not showing up in what households actually buy.",
        caveats=["Headline CPI, not a decent-living basket. The basket question is unresolved.",
                 "CPI may be structurally incapable of showing demonetisation: it weights what "
                 "households currently buy, so a good whose price collapses loses weight or leaves "
                 "the basket. The strongest objection to using it here, and it is unresolved."],
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
    dict(
        id="access-margin", name="Household access margin", family="access",
        unit="usd", precision=0, direction="up_is_good",
        question="Can this household still reach the floor?",
        why_it_matters="Disposable resources plus usable public provision, minus the local cost of a decent-living basket. The outcome the transition must protect.",
        trouble_reading="Falling below zero for an exposed cohort while national productivity rises.",
        method="Not yet constructed. Requires local reference budgets joined to household income, transfers and usable in-kind public provision.",
        caveats=["No global registry publishes this joined measure.",
                 "Quality, unpaid care and in-kind public provision require explicit valuation rules."],
        source=dict(name="Proposed from existing inputs", url="",
                    note="Reference budgets and household resource data exist separately"),
    ),
    dict(
        id="transition-speed", name="Transition speed", family="labour",
        unit="months", precision=1, direction="down_is_good",
        question="How quickly do displaced people recover?",
        why_it_matters="Gross displacement, time to re-employment and replacement earnings reveal concentrated loss hidden by net national employment.",
        trouble_reading="Displacement accelerates while re-employment slows and replacement earnings fall.",
        method="Not yet constructed. Requires linked worker-flow data by occupation, region and cohort.",
        caveats=["Net job creation is not a substitute for worker-flow data.",
                 "Comparable global cohort data is not available at the required frequency."],
        source=dict(name="Instrument gap", url="", note="Requires cohort-level labour flows"),
    ),
    dict(
        id="concentration", name="Productive-power concentration", family="power",
        unit="percent", precision=1, direction="down_is_good",
        question="Who controls the productive frontier?",
        why_it_matters="Compute, energy, models and essential-service capacity can concentrate even when the firms occupying the position change.",
        trouble_reading="Concentration rises while household access coverage falls.",
        method="Not yet constructed. Requires comparable capacity and market-share measures across compute, energy and essential services.",
        caveats=["Revenue concentration is not the same as control of productive capacity.",
                 "The relevant market boundary will be contested."],
        source=dict(name="Instrument gap", url="", note="No joined productive-power registry"),
    ),
    dict(
        id="preparedness", name="Response readiness", family="readiness",
        unit="days", precision=0, direction="down_is_good",
        question="How fast can protection reach people?",
        why_it_matters="A policy promise is not protection until registries, payments, casework, appeals and pre-positioned finance can deliver it.",
        trouble_reading="Support cannot reach an exposed cohort inside the promised response time.",
        method="Not yet constructed. Stress-test delivery time, coverage, appeals and pre-positioned finance before a shock.",
        caveats=["Preparedness is jurisdiction-specific and cannot be inferred from spending alone."],
        source=dict(name="Instrument gap", url="", note="Based on adaptive social protection practice"),
    ),
    dict(
        id="trust-consent", name="Trust and consent", family="legitimacy",
        unit="percent", precision=1, direction="up_is_good",
        question="Will people still consent to the transition?",
        why_it_matters="Perceived fairness can fail before economic aggregates breach, turning a manageable crossing into a legitimacy crisis.",
        trouble_reading="Trust falls among the same cohorts carrying the losses.",
        method="Not yet constructed. Requires repeated, cohort-specific measures of fairness, trust and willingness to support the transition.",
        caveats=["Generic institutional-trust surveys do not isolate the technology transition."],
        source=dict(name="Instrument gap", url="", note="Requires transition-specific repeated surveys"),
    ),
    dict(
        id="cross-border-access", name="Cross-border access gap", family="permission",
        unit="index", precision=1, direction="down_is_good",
        question="Did cost fall while permission stayed unequal?",
        why_it_matters="A technically cheap service is not abundant when eligibility, language, certification or jurisdiction still excludes people.",
        trouble_reading="Access variance widens after affordability stops being the main constraint.",
        method="Not yet constructed. Compare the five-part access test across jurisdictions for the same essential service.",
        caveats=["The binding condition will differ by service and cannot be collapsed into one global rank."],
        source=dict(name="Instrument gap", url="", note="Requires service-level cross-border comparison"),
    ),
]


CRISES = [
    dict(
        id="credibility-break", name="The credibility break", status="unscored",
        condition="Capability and productivity rise while household access stays flat or falls.",
        why_it_matters="People are told abundance is arriving and experience the opposite.",
        movement="Rejection of abundance language, institutional distrust and a search for a villain.",
        communication="Publish the baseline, uncertainty and the protection activated by the warning.",
        leading_signals=["inflation", "poverty-30", "trust-consent", "access-margin"],
        actions=dict(
            prepare="Agree the evidence, messengers and activation rules before trust falls.",
            protect="Announce household protection with the warning, never after it.",
            recover="Publish misses, compensate avoidable harm and let affected communities redesign the response.",
        ),
    ),
    dict(
        id="displacement-cascade", name="The local displacement cascade", status="unscored",
        condition="Job loss clusters in an occupation or place while re-employment slows and replacement earnings fall.",
        why_it_matters="National employment can look healthy while one community experiences concentrated loss and slow recovery.",
        movement="Sectoral mobilisation, resistance to automation and geographic decline hidden by averages.",
        communication="Name the affected cohort and give one reachable action with one accountable owner.",
        leading_signals=["transmission-gap", "participation", "transition-speed"],
        actions=dict(
            prepare="Pre-fund portable benefits, wage insurance and hiring-linked pathways.",
            protect="Stabilise income, housing and healthcare before asking people to retrain.",
            recover="Track re-employment time and replacement earnings until the cohort recovers.",
        ),
    ),
    dict(
        id="legitimacy-break", name="The legitimacy break", status="unscored",
        condition="Access falls while profits, mark-ups or productive-power concentration rise.",
        why_it_matters="A distribution problem becomes a power problem, and politics turns.",
        movement="Windfall taxes, break-up demands, nationalisation proposals and direct action.",
        communication="Show the public return for public support and publish red lights as readily as green ones.",
        leading_signals=["labour-share", "concentration", "access-margin"],
        actions=dict(
            prepare="Set access obligations, independent audit and public-return clauses while conditions are good.",
            protect="Trigger competition review, procurement diversification and temporary access obligations.",
            recover="Reduce structural dependence through interoperability and plural capacity.",
        ),
    ),
    dict(
        id="essential-work-squeeze", name="The essential-work squeeze", status="unscored",
        condition="Vacancies, exits and service queues rise together in work that still needs humans.",
        why_it_matters="Cheap automated goods can coexist with scarce care, judgement and physical presence.",
        movement="Essential workers gain leverage while informal rationing and coercive proposals emerge.",
        communication="Recognise the work's value before appealing to duty or purpose.",
        leading_signals=["participation", "baumol-gap", "transition-speed"],
        actions=dict(
            prepare="Improve pay, status, autonomy, staffing and credential portability.",
            protect="Deploy reserve capacity and protect service continuity without suppressing bargaining power.",
            recover="Redesign the employment bargain around sustainable load, agency and recognition.",
        ),
    ),
    dict(
        id="permission-border-split", name="The permission and border split", status="unscored",
        condition="An essential service becomes technically cheap while access varies by identity or jurisdiction.",
        why_it_matters="The binding if can migrate from money to permission.",
        movement="Migration pressure, sovereignty blocs, black markets and conflict over deserving access.",
        communication="Make eligibility rules and the reasons for them explicit before scarcity moves into permission.",
        leading_signals=["cross-border-access", "access-margin", "zero-cost-count"],
        actions=dict(
            prepare="Agree mutual recognition, portable eligibility and minimum service standards.",
            protect="Use pooled procurement and an interoperable access floor across participating countries.",
            recover="Review exclusions, appeals and cross-border variance service by service.",
        ),
    ),
]


PLAYBOOKS = {
    "individual": dict(
        label="Individuals and households",
        principle="Build options without pretending a household can diversify away a system-wide shock.",
        now=["Map dependence on one employer, occupation, place and benefit system.",
             "Make qualifications and work evidence portable.",
             "Know the local support and appeal routes before they are needed."],
        warning=["Protect cash flow, housing and healthcare continuity.",
                 "Use verified sector evidence to choose options without panic.",
                 "Activate community support before isolation compounds the shock."],
        crisis=["Stabilise first. Do not accept irreversible decisions under acute pressure.",
                "Use the named case owner and appeal path.",
                "Record lost access so the cohort is visible in the recovery data."],
    ),
    "community": dict(
        label="Communities, unions and civil society",
        principle="National averages need a local witness.",
        now=["Map exposed employers, essential services, trusted messengers and delivery gaps.",
             "Negotiate data access, notice and transition terms before redundancies.",
             "Pre-agree mutual aid, legal support and rapid feedback channels."],
        warning=["Compare national claims with lived access by cohort and place.",
                 "Open two-way forums through trusted local institutions.",
                 "Publish the gap when the average is green and the community is red."],
        crisis=["Coordinate income, food, housing, care and legal support through one local front door.",
                "Protect targeted groups from stigma and misinformation.",
                "Keep community representatives inside response decisions."],
    ),
    "business": dict(
        label="Businesses",
        principle="Regulatory certainty in exchange for auditable access and a credible worker transition.",
        now=["Publish cost and access curves without exposing model weights or trade secrets.",
             "File a worker-transition plan before material automation.",
             "Pre-fund portable benefits or wage insurance where displacement is foreseeable."],
        warning=["Report who is affected, what remains uncertain and what protection activates.",
                 "Slow deployment where the agreed delivery rail is not ready.",
                 "Accept independent audit in exchange for procurement and certainty."],
        crisis=["Fund the pre-agreed protection and preserve service continuity.",
                "Share timely worker-flow data with privacy safeguards.",
                "Co-design recovery with affected workers and places."],
    ),
    "country": dict(
        label="Countries",
        principle="Build the delivery rail before the warning light turns red.",
        now=["Join local reference budgets to household resources and usable public provision.",
             "Legislate signal owners, automatic first responses and budgets.",
             "Stress-test registries, payments, casework, appeals and privacy protections."],
        warning=["Activate bridge income, portable benefits or in-kind access for the exposed cohort.",
                 "Publish regional and cohort cuts with a fixed update cadence.",
                 "Use outcome-based procurement for verified access, not nominally free products."],
        crisis=["Expand support vertically and horizontally through the rehearsed delivery rail.",
                "Protect housing, healthcare and essential-service continuity.",
                "Review concentration, emergency powers and exclusions in public."],
    ),
    "international": dict(
        label="International institutions",
        principle="Keep local choice above the floor and make the floor interoperable.",
        now=["Define comparable access measures, audit rules and revision histories.",
             "Pool procurement where national buying power is weak.",
             "Pre-position transition finance for countries with limited fiscal capacity."],
        warning=["Track cross-border variance as a warning in its own right.",
                 "Activate mutual recognition and portable eligibility agreements.",
                 "Coordinate uncertainty ranges and public communication."],
        crisis=["Fund delivery capacity, not only entitlements.",
                "Prevent export controls from breaking the minimum access compact.",
                "Publish where the floor failed and which institution owns recovery."],
    ),
}


def build(snapshot_id, retrieved):
    signals, log = [], []

    for d in SIGNAL_DEFS:
        fetch = d["fetch"]
        sig = {key: value for key, value in d.items() if key != "fetch"}
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

    # Derived: an aggregate labour-income transmission baseline, in cumulative and annual forms.
    signals.extend(derive_engels(signals, retrieved, log))

    return {
        "schema_version": SCHEMA_VERSION,
        "snapshot_id": snapshot_id,
        "generated_at": datetime.datetime.now(datetime.timezone.utc)
                        .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "generator": GENERATOR,
        "title": "Signals toward the transition",
        "notes": ("Transition-control snapshot. Every measured series comes straight from an open "
                  "registry with no interpolation. Instrument gaps remain visible, and crisis "
                  "states remain unscored until their leading signals and thresholds exist."),
        "entities": [{"code": c, "name": n, "kind": k} for c, n, k, _ in ENTITIES],
        "signals": signals,
        "crises": CRISES,
        "playbooks": PLAYBOOKS,
    }, log


def derive_engels(signals, retrieved, log):
    """
    A dimensionally consistent aggregate transmission baseline.

    v1.0.0 shipped a "transmission test" that added consumer price inflation (a
    rate) to the change in labour share (a percentage-point change). Those are
    different units, and on the data the labour term contributed 0-8% of the
    result: the headline was inflation wearing a costume, and it produced a false
    alarm. Replaced.

    The right comparison is the one history actually ran. Britain 1780-1840:
    output per worker +46%, real wages +12%. So:

        real labour income per capita = labour share x real GDP per capita
        gap = growth(labour income pc) - growth(GDP pc), in percentage points

    Both sides are real, per capita, and growth rates. Dimensionally consistent,
    and it provides a descriptive comparison of output and constructed labour income.
    """
    by_id = {s["id"]: s for s in signals}
    lab = {e["entity"]: dict(e["points"]) for e in by_id["labour-share"].get("series", [])}
    gdp = {e["entity"]: dict(e["points"]) for e in by_id["gdp-per-capita"].get("series", [])}

    div_series, gap_series = [], []
    for ent in sorted(set(lab) & set(gdp)):
        years = sorted(set(lab[ent]) & set(gdp[ent]))
        if len(years) < 3:
            continue
        base = years[0]
        g0 = gdp[ent][base]
        l0 = lab[ent][base] / 100 * gdp[ent][base]
        div_series.append({"entity": ent, "measure": "Output per capita",
                           "points": [[y, round(gdp[ent][y] / g0 * 100, 2)] for y in years]})
        div_series.append({"entity": ent, "measure": "Labour income per capita",
                           "points": [[y, round((lab[ent][y] / 100 * gdp[ent][y]) / l0 * 100, 2)]
                                      for y in years]})
        pts = []
        for y in years[1:]:
            if (y - 1) not in lab[ent] or (y - 1) not in gdp[ent]:
                continue
            g = gdp[ent][y] / gdp[ent][y - 1] - 1
            li = ((lab[ent][y] / 100 * gdp[ent][y]) /
                  (lab[ent][y - 1] / 100 * gdp[ent][y - 1])) - 1
            pts.append([y, round((li - g) * 100, 3)])
        if pts:
            gap_series.append({"entity": ent, "points": pts})

    common = dict(
        family="engels", status="derived", direction="up_is_good",
        source=dict(name="Derived from labour-share and GDP per capita",
                    url="", retrieved=retrieved,
                    note="Computed by fetch_snapshot.py. Not published anywhere."),
        caveats=[
            "Labour income here is labour SHARE times output, so it includes an imputation for "
            "the self-employed. It is not a wage series.",
            "A national average can obscure deterioration for a displaced cohort, and there "
            "are no cohort cuts here.",
            "Labour share is reported with a long lag, so the most recent years rest on fewer "
            "countries than the chart implies.",
            "Excludes asset ownership, arguably a third channel, and the one that actually "
            "carried the wealthy through the last transition.",
            "This is not a like-for-like reconstruction of Engels' Pause: GDP per capita is not "
            "output per worker, and labour-share times real GDP is not a household real-wage series.",
        ])

    div = dict(common, id="engels-divergence", name="Aggregate labour-income transmission baseline",
        unit="index", precision=1,
        question="Are aggregate output and labour income per person moving together?",
        why_it_matters=("A descriptive distributional baseline. It can reveal aggregate divergence "
                        "worth investigating, but cannot identify household welfare or exposed cohorts."),
        trouble_reading="Sustained separation that remains after revisions and appears in cohort-level earnings and access measures.",
        method=("Real GDP per capita and real labour income per capita (labour share x real GDP "
                "per capita), each indexed to 100 at the first year both series cover."),
        series=div_series)

    gap = dict(common, id="transmission-gap", name="Annual aggregate transmission gap",
        unit="pp", precision=2,
        question="Is labour income growing as fast as output?",
        why_it_matters=("The annual version of the aggregate baseline. Negative means the constructed "
                        "labour-income series grew more slowly than real GDP per person. It is a prompt "
                        "for cohort investigation, not a crisis verdict."),
        trouble_reading="Persistently below zero.",
        method=("Growth in real labour income per capita minus growth in real GDP per capita, in "
                "percentage points. Both sides are real, per capita growth rates, so they are "
                "comparable. Replaces the v1.0.0 transmission test, which was not."),
        series=gap_series)
    w = next((e["points"] for e in gap_series if e["entity"] == "OWID_WRL"), None)
    if w:
        gap["latest"] = {"entity": "OWID_WRL", "year": w[-1][0], "value": w[-1][1]}

    log.append(f"  derived    {'engels-divergence':20} {len(div_series)//2} entities x 2 measures")
    log.append(f"  derived    {'transmission-gap':20} {len(gap_series)} entities")
    return [div, gap]


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
