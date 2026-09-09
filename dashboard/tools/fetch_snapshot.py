#!/usr/bin/env python3
"""
fetch_snapshot.py 1.8.0, retained verifier and retired live writer

The manifest-verification path remains available for frozen evidence tests.
Live emission is retired because its v1.8 output cannot satisfy the v2.0 timing,
acquisition and record-identity contract.

    python3 dashboard/tools/fetch_snapshot.py --verify-input-manifest MANIFEST

Design rules, enforced here so the contract holds:
  - never invent a data point, never interpolate, never carry forward
  - availability is separate from the epistemic class carried by every point
  - selected fields and adapter versions are explicit contracts
  - raw responses are content-addressed and checked for local hash consistency before parsing
  - a signal that cannot be fetched is emitted with status "unavailable" and an
    empty series, rather than silently dropped
  - a signal nobody publishes is emitted with status "not_measured" on purpose
"""

import argparse, csv, hashlib, io, json, sys, urllib.request, urllib.parse, datetime, os

GENERATOR = "fetch_snapshot.py@1.8.0"
SCHEMA_VERSION = "1.8.0"
TIMEOUT = 60
DASHBOARD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_INPUT_DIR = os.path.join(DASHBOARD_DIR, "evidence", "raw")
POLICY_PATH = os.path.join(DASHBOARD_DIR, "evidence", "adapter-classification-policy.json")
GLOBAL_SOURCE_HOSTS = {"api.worldbank.org", "ourworldindata.org", "ec.europa.eu"}
ADAPTER_VERSIONS = {
    "owid-grapher-csv": "1.0.0",
    "world-bank-json": "1.0.0",
}
REQUIRED_SELECTED_FIELDS = {
    "owid-grapher-csv": {"Entity", "Code", "Year"},
    "world-bank-json": {"indicator.id", "countryiso3code", "country.id", "date", "value"},
}

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


def verify_source_url(url):
    if not url:
        return
    parsed = urllib.parse.urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname not in GLOBAL_SOURCE_HOSTS
            or parsed.username or parsed.password or parsed.port not in (None, 443)):
        raise RuntimeError(f"source host is outside the allowlist: {url}")


def get(url):
    verify_source_url(url)
    req = urllib.request.Request(url, headers={"User-Agent": "mind-flow-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read(), {
            "http_status": r.status,
            "content_type": r.headers.get("Content-Type"),
            "etag": r.headers.get("ETag"),
            "last_modified": r.headers.get("Last-Modified"),
        }


def epistemic_class_for(adapter, year):
    rules = [rule for rule in adapter["epistemic_rules"]
             if ("from_year" not in rule or year >= rule["from_year"])
             and ("through_year" not in rule or year <= rule["through_year"])]
    if len(rules) != 1:
        raise RuntimeError(f"year {year} must match exactly one epistemic rule")
    return rules[0]["epistemic_class"]


def verify_adapter_contract(adapter):
    adapter_id = adapter.get("id")
    expected_version = ADAPTER_VERSIONS.get(adapter_id)
    if expected_version is None or adapter.get("version") != expected_version:
        raise RuntimeError(
            f"unsupported adapter version: {adapter_id}@{adapter.get('version')}"
        )
    selected = set(adapter.get("selected_fields") or [])
    missing = REQUIRED_SELECTED_FIELDS[adapter_id] - selected
    if missing:
        raise RuntimeError(f"adapter selected-field contract is missing: {sorted(missing)}")
    if not adapter.get("dataset_id"):
        raise RuntimeError("adapter dataset/indicator contract is missing")
    if not adapter.get("epistemic_rules"):
        raise RuntimeError("adapter epistemic rule contract is empty")


def verify_raw_input(raw_input, base_dir):
    verify_source_url(raw_input.get("source_url"))
    path = raw_input["path"]
    if os.path.isabs(path):
        raise RuntimeError("raw input path must be repository-relative; absolute paths are not allowed")
    governed_root = os.path.realpath(base_dir)
    path = os.path.realpath(os.path.join(governed_root, path))
    if os.path.commonpath([governed_root, path]) != governed_root:
        raise RuntimeError("raw input path must not escape its governed base directory")
    with open(path, "rb") as handle:
        raw = handle.read()
    digest = hashlib.sha256(raw).hexdigest()
    if raw_input.get("id") != f"sha256:{raw_input.get('sha256')}":
        raise RuntimeError("content-addressed id does not match declared sha256")
    if digest != raw_input.get("sha256"):
        raise RuntimeError("sha256 mismatch before transform")
    if len(raw) != raw_input.get("byte_length"):
        raise RuntimeError("byte length mismatch before transform")
    verify_adapter_contract(raw_input["adapter"])
    return raw


def capture_verified_raw_input(url, adapter, suffix):
    raw, response_metadata = get(url)
    digest = hashlib.sha256(raw).hexdigest()
    os.makedirs(RAW_INPUT_DIR, exist_ok=True)
    filename = f"sha256-{digest}.{suffix}"
    path = os.path.join(RAW_INPUT_DIR, filename)
    if not os.path.exists(path):
        with open(path, "wb") as handle:
            handle.write(raw)
    raw_input = {
        "id": f"sha256:{digest}",
        "sha256": digest,
        "path": f"evidence/raw/{filename}",
        "byte_length": len(raw),
        "media_type": (response_metadata["content_type"] or "application/octet-stream")
                      .split(";", 1)[0].strip().lower(),
        "source_url": url,
        "retrieved_at": datetime.datetime.now(datetime.timezone.utc)
                        .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "response_metadata": response_metadata,
        "adapter": adapter,
    }
    verified = verify_raw_input(raw_input, DASHBOARD_DIR)
    return verified, raw_input


# ---------------------------------------------------------------- adapters

def transform_owid(raw, adapter):
    """Verified OWID Grapher CSV bytes -> classified points by entity."""
    text = raw.decode("utf-8", errors="strict")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise RuntimeError("empty csv")
    selected = adapter["selected_fields"]
    missing = [field for field in selected if field not in rows[0]]
    if missing:
        raise RuntimeError(f"selected OWID fields are absent: {missing}")
    value_fields = [field for field in selected if field not in ("Entity", "Code", "Year")]
    if len(value_fields) != 1:
        raise RuntimeError("OWID adapter must select exactly one value field")
    col = value_fields[0]
    out = {}
    for r in rows:
        code = (r.get("Code") or "").strip()
        if code not in OWID_NAMES:
            continue
        try:
            y = int(r["Year"]); v = float(r[col])
        except (ValueError, TypeError, KeyError):
            continue
        out.setdefault(code, []).append([y, round(v, 4), epistemic_class_for(adapter, y)])
    for k in out:
        out[k].sort(key=lambda p: p[0])
    return out


def owid(slug, source):
    if slug != source["adapter"]["dataset_id"]:
        raise RuntimeError("OWID dataset id contradicts the adapter contract")
    url = (f"https://ourworldindata.org/grapher/{slug}.csv"
           "?v=1&csvType=full&useColumnShortNames=false")
    raw, raw_input = capture_verified_raw_input(url, source["adapter"], "csv")
    return transform_owid(raw, source["adapter"]), raw_input


def transform_worldbank(raw, adapter):
    """Verified World Bank API bytes -> classified points by entity."""
    out = {}
    data = json.loads(raw.decode("utf-8", errors="strict"))
    if len(data) < 2 or not data[1]:
        raise RuntimeError("no data")
    rev = {wb: c for c, _, _, wb in ENTITIES}
    for row in data[1]:
        indicator = (row.get("indicator") or {}).get("id")
        if indicator != adapter["dataset_id"]:
            raise RuntimeError(
                f"World Bank response indicator {indicator} does not match {adapter['dataset_id']}"
            )
        if row.get("value") is None:
            continue
        # country.id is the 2-letter code; countryiso3code carries the 3-letter one
        iso3 = (row.get("countryiso3code") or "").strip()
        code = rev.get(iso3)
        if not code and row["country"]["id"] in ("1W", "WLD"):
            code = "OWID_WRL"
        if not code:
            continue
        year = int(row["date"])
        out.setdefault(code, []).append(
            [year, round(float(row["value"]), 4), epistemic_class_for(adapter, year)]
        )
    for k in out:
        out[k].sort(key=lambda p: p[0])
    return out


def worldbank(indicator, source):
    if indicator != source["adapter"]["dataset_id"]:
        raise RuntimeError("World Bank indicator contradicts the adapter contract")
    codes = ";".join(WB_CODES[c] for c, _, _, _ in ENTITIES)
    url = (f"https://api.worldbank.org/v2/country/{codes}/indicator/{indicator}"
           f"?format=json&per_page=20000")
    raw, raw_input = capture_verified_raw_input(url, source["adapter"], "json")
    return transform_worldbank(raw, source["adapter"]), raw_input


def transform_verified_manifest(path):
    with open(path, encoding="utf-8") as handle:
        raw_input = json.load(handle)["raw_input"]
    raw = verify_raw_input(raw_input, DASHBOARD_DIR)
    adapter = raw_input["adapter"]
    if adapter["id"] == "world-bank-json":
        return transform_worldbank(raw, adapter)
    if adapter["id"] == "owid-grapher-csv":
        return transform_owid(raw, adapter)
    raise RuntimeError(f"no transform for adapter {adapter['id']}")


# ---------------------------------------------------------------- signals

def S(**kw):
    kw.setdefault("caveats", [])
    return kw


RESOLUTION_RULE = ("Preserve this snapshot vintage. Replace a value only in a new snapshot "
                   "when the publisher revises or resolves the same period.")


def rule(epistemic_class, source_vintage, uncertainty, from_year=None, through_year=None):
    value = dict(epistemic_class=epistemic_class, source_vintage=source_vintage,
                 uncertainty=uncertainty, resolution_rule=RESOLUTION_RULE)
    if from_year is not None:
        value["from_year"] = from_year
    if through_year is not None:
        value["through_year"] = through_year
    return value


def adapter(identifier, dataset_id, selected_fields, epistemic_rules):
    return dict(id=identifier, version=ADAPTER_VERSIONS[identifier],
                dataset_id=dataset_id, selected_fields=selected_fields,
                epistemic_rules=epistemic_rules)


SIGNAL_DEFS = [
    dict(
        id="labour-share", name="Labour share of GDP", family="engels",
        unit="percent", precision=1, direction="up_is_good",
        question="Who is getting the gains?",
        why_it_matters="The share of output recorded as labour income. It is one distributional indicator, not a measure of household access on its own.",
        trouble_reading="A sustained fall while output per person rises.",
        source=dict(name="Our World in Data / ILOSTAT (SDG 10.4.1)",
                    url="https://ourworldindata.org/grapher/labor-share-of-gdp",
                    note="SDG indicator 10.4.1, labour income share as a percent of GDP",
                    adapter=adapter("owid-grapher-csv", "labor-share-of-gdp",
                        ["Entity", "Code", "Year",
                         "10.4.1 - Labour share of GDP (%) - SL_EMP_GTOTL"],
                        [rule("modelled_estimate", "ILOSTAT modelled estimates",
                              "No point interval is preserved in this snapshot.")]),
                    raw_input_ids=[]),
        fetch=lambda source: owid("labor-share-of-gdp", source),
    ),
    dict(
        id="gdp-per-capita", name="GDP per capita", family="engels",
        unit="usd", precision=0, direction="up_is_good",
        question="Is output still growing?",
        why_it_matters="An aggregate output baseline. Read with distribution, household resources and access measures, never on its own.",
        trouble_reading="Rising output alongside sustained cohort-level earnings or access deterioration.",
        source=dict(name="World Bank Open Data",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.PCAP.KD",
                    note="NY.GDP.PCAP.KD, constant 2015 US$",
                    adapter=adapter("world-bank-json", "NY.GDP.PCAP.KD",
                        ["indicator.id", "countryiso3code", "country.id", "date", "value"],
                        [rule("published_statistic", "World Bank indicator NY.GDP.PCAP.KD",
                              "No point interval is published in this snapshot; national accounts remain revisable.")]),
                    raw_input_ids=[]),
        fetch=lambda source: worldbank("NY.GDP.PCAP.KD", source),
    ),
    dict(
        id="poverty-30", name="Living on less than $30 a day", family="conditions",
        unit="percent", precision=1, direction="down_is_good",
        question="How many people live below this explicit daily-consumption threshold?",
        why_it_matters="A broad, contestable baseline for material living conditions. It does not define a decent life or identify why people fall below the line.",
        trouble_reading="Flat, while capability and output rise.",
        caveats=["The most recent years are modelled nowcasts, not survey estimates. Treat the "
                 "tail of this series as a projection.",
                 "Rests on PPP conversion, which is itself contested for cross-country comparison."],
        source=dict(name="Our World in Data / World Bank PIP",
                    url="https://ourworldindata.org/grapher/poverty-share-on-less-than-30-per-day",
                    note="2021 international prices",
                    adapter=adapter("owid-grapher-csv", "poverty-share-on-less-than-30-per-day",
                        ["Entity", "Code", "Year",
                         "Share of population living on less than $30 a day"],
                        [rule("published_estimate", "World Bank PIP survey-based estimates",
                              "No point interval is preserved in this snapshot.", through_year=2024),
                         rule("nowcast", "World Bank PIP post-2024 nowcast",
                              "Modelled tail; no point interval is preserved in this snapshot.", from_year=2025)]),
                    raw_input_ids=[]),
        fetch=lambda source: owid("poverty-share-on-less-than-30-per-day", source),
    ),
    dict(
        id="poverty-830", name="Living on less than $8.30 a day", family="conditions",
        unit="percent", precision=1, direction="down_is_good",
        question="How many are below the upper-middle-income line?",
        why_it_matters="The World Bank's upper-middle-income poverty line, revised upward in June 2025.",
        trouble_reading="A sustained plateau or rise, especially where survey coverage and uncertainty are adequate.",
        caveats=["The most recent years are modelled nowcasts, not survey estimates.",
                 "The World Bank raised this line in June 2025; the series is not comparable "
                 "across that revision without care."],
        source=dict(name="Our World in Data / World Bank PIP",
                    url="https://ourworldindata.org/grapher/share-living-with-less-than-upper-middle-income-poverty-line",
                    note="$8.30/day, 2021 international prices",
                    adapter=adapter("owid-grapher-csv", "share-living-with-less-than-upper-middle-income-poverty-line",
                        ["Entity", "Code", "Year",
                         "Share of population living on less than $8.30 a day"],
                        [rule("published_estimate", "World Bank PIP survey-based estimates",
                              "No point interval is preserved in this snapshot.", through_year=2024),
                         rule("nowcast", "World Bank PIP post-2024 nowcast",
                              "Modelled tail; no point interval is preserved in this snapshot.", from_year=2025)]),
                    raw_input_ids=[]),
        fetch=lambda source: owid("share-living-with-less-than-upper-middle-income-poverty-line", source),
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
                    note="SL.TLF.CACT.ZS, ages 15+",
                    adapter=adapter("world-bank-json", "SL.TLF.CACT.ZS",
                        ["indicator.id", "countryiso3code", "country.id", "date", "value"],
                        [rule("modelled_estimate", "ILO modelled estimates indicator SL.TLF.CACT.ZS",
                              "No point interval is preserved in this snapshot.")]),
                    raw_input_ids=[]),
        fetch=lambda source: worldbank("SL.TLF.CACT.ZS", source),
    ),
    dict(
        id="inflation", name="Consumer price inflation", family="prices",
        unit="percent", precision=1, direction="neutral",
        question="How did headline consumer prices change?",
        why_it_matters="A broad household price measure. It can show inflation pressure but cannot establish affordability, access or demonetisation on its own.",
        trouble_reading="A divergence between headline CPI and service-level total cost or access that remains unexplained.",
        caveats=["Headline CPI, not a decent-living basket. The basket question is unresolved.",
                 "CPI may be structurally incapable of showing demonetisation: it weights what "
                 "households currently buy, so a good whose price collapses loses weight or leaves "
                 "the basket. The strongest objection to using it here, and it is unresolved."],
        source=dict(name="World Bank Open Data",
                    url="https://api.worldbank.org/v2/country/WLD/indicator/FP.CPI.TOTL.ZG",
                    note="FP.CPI.TOTL.ZG, annual %",
                    adapter=adapter("world-bank-json", "FP.CPI.TOTL.ZG",
                        ["indicator.id", "countryiso3code", "country.id", "date", "value"],
                        [rule("published_statistic", "World Bank indicator FP.CPI.TOTL.ZG",
                              "No point interval is published in this snapshot; national series remain revisable.")]),
                    raw_input_ids=[]),
        fetch=lambda source: worldbank("FP.CPI.TOTL.ZG", source),
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
        why_it_matters="A proposed comparison of price movement in explicitly classified baskets. Any result would depend on contested classification and weighting choices.",
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
        question="How do affected people assess fairness, voice, remedy and institutional trust?",
        why_it_matters="Repeated affected-person evidence may reveal legitimacy concerns that aggregate economic measures cannot observe.",
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



def build(snapshot_id, retrieved):
    signals, log, raw_inputs = [], [], {}

    for d in SIGNAL_DEFS:
        fetch = d["fetch"]
        sig = {key: value for key, value in d.items() if key != "fetch"}
        sig["status"] = "available"
        sig["source"] = dict(sig["source"], retrieved=retrieved)
        try:
            data, raw_input = fetch(sig["source"])
            raw_inputs[raw_input["id"]] = raw_input
            sig["source"]["raw_input_ids"] = [raw_input["id"]]
            sig["series"] = [{"entity": e, "points": p} for e, p in sorted(data.items()) if p]
            world = data.get("OWID_WRL") or (list(data.values())[0] if data else [])
            if world:
                ent = "OWID_WRL" if data.get("OWID_WRL") else sorted(data)[0]
                sig["latest"] = {"entity": ent, "year": world[-1][0], "value": world[-1][1],
                                 "epistemic_class": world[-1][2]}
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

    generated_at = datetime.datetime.now(datetime.timezone.utc) \
        .replace(microsecond=0).isoformat().replace("+00:00", "Z")
    with open(POLICY_PATH, "rb") as policy_handle:
        policy_bytes = policy_handle.read()
    policy = json.loads(policy_bytes)
    public_update = build_public_update(signals, snapshot_id)
    public_update["lineage"] = build_public_lineage(signals, public_update)
    return {
        "schema_version": SCHEMA_VERSION,
        "snapshot_id": snapshot_id,
        "as_of": generated_at,
        "generated_at": generated_at,
        "generator": GENERATOR,
        "publication_status": "research_draft_unverified",
        "evidence_policy": {
            "id": "adapter-classification-policy",
            "version": policy["policy_version"],
            "sha256": f"sha256:{hashlib.sha256(policy_bytes).hexdigest()}",
        },
        "title": "Signals toward the transition",
        "notes": ("Transition-control snapshot. Availability is separate from point-level evidence "
                  "class. Raw registry responses are content-addressed and checked for local hash "
                  "consistency before transformation. Publisher origin remains unverified. "
                  "Instrument gaps and unresolved rebuild evidence remain visible."),
        "reproducibility": {
            "raw_input_status": "captured_local_hash_consistent",
            "snapshot_rebuild_status": "not_verified",
            "raw_inputs": list(raw_inputs.values()),
            "residual_gap": ("Raw bytes passed local length and hash checks before transformation, "
                             "but publisher origin lacks a separately verifiable receipt and a "
                             "fresh-environment bit-for-bit snapshot rebuild has not passed."),
        },
        "public_update": public_update,
        "if_path": build_if_path(),
        "entities": [{"code": c, "name": n, "kind": k} for c, n, k, _ in ENTITIES],
        "signals": signals,
        "possible_path_refs": [],
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
    lab = {e["entity"]: {point[0]: (point[1], point[2]) for point in e["points"]}
           for e in by_id["labour-share"].get("series", [])}
    gdp = {e["entity"]: {point[0]: (point[1], point[2]) for point in e["points"]}
           for e in by_id["gdp-per-capita"].get("series", [])}

    def input_classes(*classes):
        return list(dict.fromkeys(classes))

    div_series, gap_series = [], []
    for ent in sorted(set(lab) & set(gdp)):
        years = sorted(set(lab[ent]) & set(gdp[ent]))
        if len(years) < 3:
            continue
        base = years[0]
        g0 = gdp[ent][base][0]
        l0 = lab[ent][base][0] / 100 * gdp[ent][base][0]
        div_series.append({"entity": ent, "measure": "Output per capita",
                           "points": [[y, round(gdp[ent][y][0] / g0 * 100, 2), "derived",
                                       [gdp[ent][y][1]]]
                                      for y in years]})
        div_series.append({"entity": ent, "measure": "Labour income per capita",
                           "points": [[y, round((lab[ent][y][0] / 100 * gdp[ent][y][0]) / l0 * 100, 2),
                                       "derived", input_classes(lab[ent][y][1], gdp[ent][y][1])]
                                      for y in years]})
        pts = []
        for y in years[1:]:
            if (y - 1) not in lab[ent] or (y - 1) not in gdp[ent]:
                continue
            g = gdp[ent][y][0] / gdp[ent][y - 1][0] - 1
            li = ((lab[ent][y][0] / 100 * gdp[ent][y][0]) /
                  (lab[ent][y - 1][0] / 100 * gdp[ent][y - 1][0])) - 1
            classes = input_classes(
                lab[ent][y][1], gdp[ent][y][1],
                lab[ent][y - 1][1], gdp[ent][y - 1][1],
            )
            pts.append([y, round((li - g) * 100, 3), "derived", classes])
        if pts:
            gap_series.append({"entity": ent, "points": pts})

    common = dict(
        family="engels", status="available", direction="up_is_good",
        source=dict(name="Derived from labour-share and GDP per capita",
                    url="", retrieved=retrieved,
                    note="Computed by fetch_snapshot.py. Not published anywhere.",
                    adapter={
                        "id": "engels-derived-series",
                        "version": "1.0.0",
                        "dataset_id": "labour-share+gdp-per-capita",
                        "selected_fields": ["labour-share.points", "gdp-per-capita.points"],
                        "epistemic_rules": [rule(
                            "derived", f"Derived in snapshot {retrieved}",
                            "Input uncertainty is not propagated into an interval.",
                        )],
                    },
                    raw_input_ids=[]),
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
        gap["latest"] = {"entity": "OWID_WRL", "year": w[-1][0], "value": w[-1][1],
                         "epistemic_class": w[-1][2],
                         "input_epistemic_classes": w[-1][3]}

    log.append(f"  derived    {'engels-divergence':20} {len(div_series)//2} entities x 2 measures")
    log.append(f"  derived    {'transmission-gap':20} {len(gap_series)} entities")
    return [div, gap]


def build_public_lineage(signals, update):
    """Pin every source and derived point used by the seven-part public update."""
    by_id = {signal["id"]: signal for signal in signals}
    entity = update["scope"]["entity"]
    baseline = by_id["engels-divergence"]
    output = next(series for series in baseline["series"]
                  if series["entity"] == entity and series.get("measure") == "Output per capita")
    labour_income = next(series for series in baseline["series"]
                         if series["entity"] == entity
                         and series.get("measure") == "Labour income per capita")
    from_year = output["points"][0][0]
    through_year = output["points"][-1][0]

    def reference(signal_id, series, point):
        value = {
            "signal_id": signal_id,
            "entity": entity,
            "year": point[0],
            "value": point[1],
            "epistemic_class": point[2],
        }
        if series.get("measure"):
            value["measure"] = series["measure"]
        if len(point) > 3:
            value["input_epistemic_classes"] = point[3]
        return value

    source_points = []
    raw_input_ids = []
    for signal_id in ["gdp-per-capita", "labour-share"]:
        signal = by_id[signal_id]
        series = next(series for series in signal["series"] if series["entity"] == entity)
        for year in [from_year, through_year]:
            point = next(point for point in series["points"] if point[0] == year)
            source_points.append(reference(signal_id, series, point))
        raw_input_ids.extend(signal["source"].get("raw_input_ids", []))

    derived_points = []
    for series in [output, labour_income]:
        for year in [from_year, through_year]:
            point = next(point for point in series["points"] if point[0] == year)
            derived_points.append(reference("engels-divergence", series, point))

    return {
        "derivation_id": "world-aggregate-transmission-v1",
        "entity": entity,
        "from_year": from_year,
        "through_year": through_year,
        "source_points": source_points,
        "derived_points": derived_points,
        "raw_input_ids": sorted(set(raw_input_ids)),
    }


def build_public_update(signals, snapshot_id):
    """Build one scoped seven-part update without turning coverage into a result."""
    by_id = {signal["id"]: signal for signal in signals}
    baseline = by_id.get("engels-divergence", {})
    output = next((series for series in baseline.get("series", [])
                   if series.get("entity") == "OWID_WRL" and
                   series.get("measure") == "Output per capita"), None)
    labour = next((series for series in baseline.get("series", [])
                   if series.get("entity") == "OWID_WRL" and
                   series.get("measure") == "Labour income per capita"), None)

    if output and labour and output.get("points") and labour.get("points"):
        start_year = output["points"][0][0]
        end_year = output["points"][-1][0]
        output_value = output["points"][-1][1]
        labour_value = labour["points"][-1][1]
        difference = round(labour_value - output_value, 2)
        period = f"{start_year} to {end_year}"
        observed = (
            f"From a shared index of 100 in {start_year}, real output per person reached "
            f"{output_value:.2f} and constructed real labour income per person reached "
            f"{labour_value:.2f} in {end_year}, a difference of {difference:.2f} index points."
        )
        inferred = (
            "The constructed aggregate labour-income path grew less than output over this "
            "window. This is a prompt for cohort investigation, not a finding of harm or an AI effect."
        )
    else:
        period = "Unavailable in this snapshot"
        observed = (
            "The aggregate output and constructed labour-income comparison is unavailable in "
            "this snapshot. No value is carried forward."
        )
        inferred = "No aggregate transmission inference is available from this snapshot."

    return {
        "update_id": f"world-aggregate-transmission-{snapshot_id}",
        "epistemic_class": "mixed",
        "provenance": {
            "status": "agent_proposal",
            "producer": "Ren (Codex agent)",
            "review_state": "requires_fernando_review",
        },
        "scope": {
            "entity": "OWID_WRL",
            "population": "World aggregate where both component series report data; country coverage varies by year",
            "place": "World",
            "period": period,
        },
        "observed": {
            "summary": observed,
            "measure": "Indexed real GDP per person and labour-share times real GDP per person",
            "source_signal_ids": ["gdp-per-capita", "labour-share", "engels-divergence"],
            "vintage": snapshot_id,
            "uncertainty": "No interval is available in this snapshot. Source revisions, labour-share imputation and changing country coverage are not quantified.",
            "epistemic_class": "derived",
        },
        "affected": {
            "status": "unknown",
            "summary": "This aggregate does not identify an affected population or show whether any cohort gained or lost agency.",
            "excluded_or_unresolved": [
                "Occupation and industry cohorts",
                "Household income, transfers, assets and in-kind provision",
                "Geographic and demographic distributions",
                "Desired hours, security, access and self-reported agency",
            ],
        },
        "inferred": {
            "summary": inferred,
            "inference_class": "descriptive",
            "method": "Index each component to 100 in the first shared year, then subtract the final output index from the final constructed labour-income index.",
            "strongest_alternatives": [
                "The construction omits transfers, asset income and public provision",
                "Changing country coverage or source revisions may alter the aggregate path",
                "Aggregate composition may conceal cohorts moving in opposite directions",
            ],
        },
        "condition_change": {
            "changed": False,
            "summary": "No change is established in the capability, reach, agency, durability or fairness conditions.",
            "condition_ids": ["capability", "reach", "agency", "durability", "fairness"],
            "state": "unknown",
            "evidence_grade": "Insufficient for a scoped condition evaluation",
        },
        "action": {
            "summary": "No authorised action follows from this aggregate descriptive comparison.",
            "authorization_state": "none",
            "owner": None,
            "authority": None,
            "help_route": None,
            "appeal_route": None,
        },
        "falsifier": {
            "summary": "Test whether the apparent divergence survives a like-for-like reconstruction with distributional household resources and declared uncertainty.",
            "test": "Reproduce the same period using consistent real units for earnings, transfers, asset income and usable public provision, with stable coverage and uncertainty. Compare the cumulative difference with zero and across cohorts.",
            "implication": "If the difference is not distinguishable from zero or reverses for relevant cohorts, withdraw or narrow the broader transmission inference. Preserve the original arithmetic as a historical record.",
        },
        "next_check": {
            "on": None,
            "owner": None,
            "event": "No governed refresh or review is scheduled for this aggregate inference.",
            "related_to_inference": False,
            "failure_handling": "Keep the update labelled unscheduled and stale rather than substituting an unrelated data release.",
        },
    }


def build_if_path():
    """Build a scoped unresolved IF path without manufacturing condition evidence."""
    missing_review = {
        "on": None,
        "owner": None,
        "failure_handling": "Keep the condition unknown. Do not carry forward, infer safety or substitute an aggregate proxy.",
    }

    def condition(identifier, label, position, question, missing, challenge):
        return {
            "id": identifier,
            "label": label,
            "position": position,
            "question": question,
            "state": "unknown",
            "previous_state": None,
            "evidence_grade": "No scoped evaluation",
            "summary": f"{label} is not evaluated for a defined population, place and decision horizon.",
            "because": missing,
            "source_signal_ids": [],
            "strongest_challenge": challenge,
            "next_observation": dict(missing_review, event=f"Commission or identify {label.lower()} evidence for the same cohort, place and period."),
        }

    return {
        "path_id": "capability-to-shared-durable-agency",
        "provenance": {
            "status": "agent_proposal",
            "producer": "Ren (Codex agent)",
            "review_state": "requires_fernando_review",
        },
        "claim": {
            "who": "People in a defined cohort",
            "verb": "gain",
            "outcome": "shared and durable human agency from rising technological capability",
            "standard": "A protected continuity floor plus meaningful choice, using thresholds not yet approved",
            "place": "No decision geography is registered",
            "period": "No decision horizon is registered",
            "status": "unresolved",
        },
        "conditions": [
            condition(
                "capability", "Capability", 1,
                "Can the system perform the useful task safely and reliably in context?",
                "The snapshot contains no scoped technology, task, reliability or safety evaluation.",
                "A benchmark result may fail in real workflows or for excluded users.",
            ),
            condition(
                "reach", "Reach", 2,
                "Can affected people use it at an acceptable total cost and service level?",
                "Aggregate income, poverty and price series do not measure service-level availability, affordability, eligibility, quality and delivery together.",
                "Nominal availability can rise while practical access falls for a cohort.",
            ),
            condition(
                "agency", "Agency", 3,
                "Does it expand meaningful choices without coercion or dependency?",
                "The snapshot has no repeated direct measure of choice, control, refusal, switching, voice or remedy.",
                "More capability can increase surveillance, dependency or compelled use.",
            ),
            condition(
                "durability", "Durability", 4,
                "Do benefits persist through shocks, market shifts and policy changes?",
                "No cohort outcome has a declared stress test, persistence window or recovery threshold.",
                "An early gain may reverse when prices, ownership, funding or institutions change.",
            ),
            condition(
                "fairness", "Fairness", 5,
                "Are gains and burdens distributed with voice, remedy and dignity?",
                "Aggregate labour share cannot identify the distribution of benefits, burdens, participation or remedy.",
                "An aggregate improvement can coexist with concentrated harm or exclusion.",
            ),
        ],
        "decision": {
            "result": "no_decision",
            "summary": "Every condition is unknown for a decision-ready scope. No watch, act, pause, reverse, recover or graduate rule is eligible.",
            "eligible_actions": [],
        },
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", default=datetime.date.today().isoformat())
    ap.add_argument("--out", default="dashboard/snapshots")
    ap.add_argument(
        "--verify-input-manifest",
        help="Verify one content-addressed raw input and transform it with its pinned adapter contract",
    )
    args = ap.parse_args()

    if args.verify_input_manifest:
        transformed = transform_verified_manifest(args.verify_input_manifest)
        json.dump(transformed, sys.stdout, separators=(",", ":"), sort_keys=True)
        sys.stdout.write("\n")
        return 0

    raise RuntimeError(
        "Live snapshot emission is retired until a fetch adapter satisfies the 2.0 timing and acquisition contract"
    )


if __name__ == "__main__":
    sys.exit(main())
