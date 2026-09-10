---
id: round-10-storm-retrospective
title: Known shocks expose the limits of native stock thresholds
type: research-audit
status: reviewed-unassessable-social-criterion
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# 🦅 TL;DR

**All 1,000 country-periods remain cannot-say under the commissioned social
criterion.** There are zero assessable periods, not zero storms. Social-criterion
fires, misses and false positives remain null. Native stock thresholds are a
counterexample to proxy substitution, not a repaired detector or forecast score.

## 📚 Retained shock context

The [World Bank's institutional history](https://www.worldbank.org/en/archive/history/past-presidents/robert-bruce-zoellick)
identifies the 2008-2009 global financial crisis. The [WHO's 11 March 2020
statement](https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020)
characterises COVID-19 as a pandemic. These establish historical context only.
Neither certifies that every retained country experienced Fernando's particular
income-access shift or that 5% of its population was affected.

Complete decoded HTML bodies and serialised response headers are retained under
`signals/countries/sources/round-10-shock-context/`. Each receipt records actual
UTC acquisition start/end, exact URL/status, body length, body SHA-256 and header
SHA-256. `shock-context.mts --check` verifies pinned receipt bytes, hashes and
exact text selectors. The crisis selector starts at byte 18,274; the pandemic
selector starts at byte 66,922, both zero-based offsets into retained bodies.
These offsets refer to this capture, not a claim that the live pages stay fixed.

**No open redistribution licence is established for these institutional
webpages.** They are attributed research-verification copies, with no new licence,
microdata rights or publisher authentication claimed. The World Bank dataset
licence from the income audit is not silently applied to an institutional history
page, and WHO text is not silently re-licensed. A failed sandbox network request
produced no response body; the successful explicit acquisitions are the receipts
retained here. Initial browser probes also found an obsolete WHO URL and an
inaccessible IMF page; neither supplies a historical claim in this review.

## 🔬 What a naive native threshold would select

The root `buildStormReview` API was replayed against the retained income
measurements. Its 20 annual comparisons run from 2005→2006 through 2024→2025.
This deliberately naive check uses a decline of at least 5 native percentage
points for employment-to-population and an increase of at least 5 for unemployment
or poverty. **Its denominator is whatever the native indicator uses.** It is not
the percentage of the total population experiencing income-route disruption.

| Native family | Consecutive-year pairs available for arithmetic | Naive crossings, all years | 2009 crossings | 2020 crossings |
| --- | ---: | ---: | --- | --- |
| ILO modelled employment-to-population, ages 15+ | 1,000 | 4 | Ireland | Mexico, Chile, Peru |
| ILO modelled unemployment, labour force aged 15+ | 1,000 | 3 | Spain, Ireland | Colombia |
| PIP national $3/day lineup, 2021 PPP | 980 | 2 | None | None |

Here, available pairs means consecutive finite values, not an admission of
survey or construct comparability. Argentina has no national PIP rows. The two
PIP crossings occur in Indonesia in 2006 and Romania in 2014, outside the two
selected shock-comparison years. Romania's crossing coincides with a retained
welfare-type change, making it a concrete warning against treating any large
stock difference as newly disrupted people.

For example, Ireland's 2009 modelled employment-to-population ratio falls by
5.470 native points and its unemployment rate rises by 5.835. These are different
denominators and overlapping people. They cannot be added into a population loss
count or used to infer the condition that bound access.

## 🧭 Gaps, not retrospective scores

**Sparse native crossings around widely recorded shocks do not establish misses
of the social criterion.** The retained reference list is not a labelled dataset
of national social-contract transitions. A country absent from the table could
have experienced disrupted hours, informal income, adequate pay or household
support without a five-point native stock movement. Net stocks can also conceal
losses offset by new entrants, migration or changing participation. People outside
the labour force are especially poorly represented by unemployment.

Likewise, a crossing outside 2009 or 2020 is not a demonstrated false positive.
There may have been a national shock, a different welfare construct or measurement
change; these two references cannot adjudicate that question. A correct
retrospective deliverable therefore reports unassessability and the named gaps,
rather than inventing a confusion matrix.

Historical ILO rows are one November 2025 modelled vintage, not contemporaneous
annual forecasts. PIP is one March 2026 lineup: 2009 includes 32 actual-status and
17 projection-status rows; 2020 includes 37 and 12 respectively. All 49 selected
2025 PIP rows are nowcasts. Publisher interpolation/extrapolation uses later
information and macroeconomic assumptions. Historical alignment can therefore
contain hindsight and cannot establish forecast skill. The producer preserves
these native flags; this table never converts them into independent surveys.

PIP welfare type changes in Poland, Romania, Russia and Türkiye remain visible,
and survey comparability is unestablished in the retained rows. Household welfare
assignment does not supply linked counts of disrupted earners and dependants.
Direct and household affected-share readings both remain null, never added.

## ✅ Gate disposition and next work

**The social retrospective gate remains unmet because its measurement inputs
are absent.** The three native families support breadth and a documented
counterexample, while direct disruption and binding-category change remain
unmeasured. Zero new real IF evolution events are recorded; the programme total
stays one. Creating research definitions is not an adoption or evolution event.

Retain direct income-route transitions with aligned population denominators and
separate household mappings before admitting an affected share. Establish actual
binding-category evidence before that alternative arm can decide a candidate.
Re-run the same criterion without proxy substitution when those measurements
exist. Until then, the country reader must say cannot-say and name what is missing.
