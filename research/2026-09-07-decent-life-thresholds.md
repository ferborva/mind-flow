---
id: 2026-09-07-decent-life-thresholds
title: What a decent life costs, and how much is enough to fund one forever
type: research
status: active
themes: [abundance]
supports: [how-much-is-enough, everything-is-limited]
retrieved: 2026-09-07
corrected: 2026-09-08
---

# What a decent life costs, and how much is enough to fund one forever

Fer asked two questions. What would a high quality life look like for 80-90% of
humans, and how much capital would cover it for one person's life and bootstrap
their children's.

Both can be bounded, but the first version overstated what the evidence could
answer. This file now preserves the useful arithmetic while withdrawing the
invalid global comparisons.

## 🦅 TL;DR

- **There is a real, peer-reviewed definition of a decent life** with numeric
  thresholds. It is called Decent Living Standards, and it is far more modest
  than anything the abundance conversation imagines: 30m² of floor space, 50
  litres of water a day, nine years of schooling, one fridge, one phone.
- **$30 a day is a useful user-set comparison line, not an empirically validated
  developed-world floor.** The World Bank's 2025 nowcast places 80.33% below it.
- **A simple capitalisation of $30/day at a 3% draw gives $365,000.** That is an
  arithmetic scenario, not a guaranteed perpetual endowment.
- **Intergenerational outcomes depend on uncertain returns, sequence risk,
  fees, tax, withdrawals and household structure.** One deterministic path
  cannot prove that an endowment bootstraps descendants.
- **His intuition converges on roughly $1.1m per person.** That is almost exactly
  the millionaire threshold, and we can count them: **57.5 million people, 0.69%
  of humanity.**
- **Correction:** the original global capital and GDP comparisons mixed nominal
  dollar stocks with 2021-PPP welfare flows. Those conclusions are withdrawn.

---

## 📐 What "a decent life" actually means, numerically

There is a serious literature here, and it is unfashionably specific. Rao and
Min's **Decent Living Standards** (Social Indicators Research, 2017) define an
"irreducible and essential set of material conditions for achieving basic human
wellbeing", with thresholds:

| Dimension | Threshold |
|---|---|
| Housing space | **30m² minimum**, plus 10m² per additional person above three |
| Shelter | Solid roof and walls, brick, wood, concrete or cement/steel |
| Water | **50 litres per capita per day** |
| Sanitation | In-house improved toilet |
| Nutrition | Sufficient calories, protein, vitamins, minerals; **a ~100 litre fridge** |
| Clothing | Sufficient for comfort in local climate; shared washing machines |
| Healthcare | **1.5-1.7 physicians per 1,000 people**; **PPP $450-700 per capita per year**; life expectancy 70-75 |
| Air quality | PM2.5 at **10-35 µg/m³** (WHO); clean cook stoves |
| Education | **Nine years of schooling** |
| Communication | **One phone and one TV or monitor per household** |
| Mobility | Access to motorised transport, public or personal |
| Gathering | A minimum of public space per 1,000 inhabitants |

**Read that list again next to the phrase "you will be able to do anything".**
The academic consensus on a decent life is one fridge, one phone, 30 square
metres and nine years of school. The gap between that and the abundance rhetoric
is the entire subject of Fer's rant, quantified.

Sources: [Rao & Min, Decent Living Standards (PMC full text)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6013539/),
[PubMed record](https://pubmed.ncbi.nlm.nih.gov/29950752/),
[Decent Living Energy project](https://decentlivingenergy.org/dls.html),
[Material Requirements of Decent Living Standards, Env. Sci. & Tech.](https://pubs.acs.org/doi/10.1021/acs.est.3c03957)

## 💵 What it costs, per person per year

Converting thresholds into money means picking an income line. The four defensible
ones:

| Line | $/day | $/year | Who uses it |
|---|---|---|---|
| Extreme poverty | 3.00 | 1,095 | World Bank, 2021 PPP |
| Lower-middle-income | 4.20 | 1,533 | World Bank |
| Upper-middle-income | 8.30 | 3,030 | World Bank |
| **User-set comparison line** | **30.00** | **10,950** | Available through PIP and OWID, not an official poverty line |
| Comfortable | 70.00 | 25,550 | Illustrative, not an official line |

The $30/day line matches Fer's question numerically because the World Bank's
2025 nowcast places **80.33% of the world below it.** It does not, by itself,
define a decent life across countries. The same nowcast reports a 54.92%
poverty gap, which measures how far the population is below the line rather
than treating everybody below it as having zero resources.

Source: [World Bank 2025 poverty line revision](https://blogs.worldbank.org/en/opendata/the-world-bank-s-new-global-poverty-lines-in-2021-prices),
[OWID share below $30/day](https://ourworldindata.org/grapher/poverty-share-on-less-than-30-per-day)

## 🏦 How much capital funds that forever

Withdrawal-rate evidence is conditional on asset mix, country, fees, tax,
sequence, horizon and historical sample. For exploration, this section uses 3%
and 4% as explicit assumptions. **It does not establish a safe perpetual rate.**

Using 3% for perpetual and 4% for a single lifetime:

| Standard | $/year | Capital @4% (a lifetime) | **Capital @3% (perpetual)** |
|---|---|---|---|
| $8.30/day | 3,030 | $75,700 | **$101,000** |
| $30/day | 10,950 | $273,800 | **$365,000** |
| $70/day | 25,550 | $638,800 | **$851,700** |

Derived: annual requirement divided by the withdrawal rate.

Source: [White Coat Investor on safe withdrawal rates](https://www.whitecoatinvestor.com/the-4-rule-safe-withdrawal-rates/),
[Morningstar retirement-income research](https://www.morningstar.com/retirement/morningstars-retirement-income-research-finding-your-safe-withdrawal-rate),
[Portfolio Charts on perpetual withdrawal rates](https://portfoliocharts.com/charts/withdrawal-rates/)

## 👨‍👩‍👧 Does it bootstrap the children?

This was the sharper half of his question. A deterministic illustration can
show which assumptions matter, but it cannot answer yes or no.

A perpetual endowment grows at (real return − withdrawal rate). Global equities
have returned roughly 5% real over the long run. Over a 30-year generation:

| Draw | Fund after one generation | Per heir, 2 children | Per heir, 3 children |
|---|---|---|---|
| 3.0% | ×1.81 | ×1.81 sustains | ×1.21 sustains |
| 3.5% | ×1.56 | ×1.56 sustains | ×1.04 sustains, barely |
| 4.0% | ×1.35 | ×1.35 sustains | **×0.90 dilutes** |

Derived: (1 + 5% − draw)^30, divided by children per couple.

**Under this one smooth-return model, lower draws and fewer beneficiaries make
the fund easier to sustain.** Real returns do not arrive smoothly, however.
Sequence risk, fees, taxation, longevity, shocks and changing household needs
can reverse the result.

**Note on the real return.** 5% real is a long-run global equity figure, not a
guarantee, and an endowment for the displaced would likely be held more
conservatively. At 4% real, the 3% draw still sustains and the 3.5% draw becomes
marginal.

## 🎯 So what is "enough"?

Putting it together, for a self-sustaining, generation-crossing endowment at a
comfortable standard:

> **Illustrative range: $730,000 to $850,000 per person in invested capital,
> plus somewhere to live, given the stated spending and draw assumptions.**

Add a paid-off home and Fer's own bracket, the point at which he would never
need to work again, lands at **about $1.1 million**.

<!-- GAP: the $400k home figure in that total is illustrative, not sourced, and
     it is wildly location-dependent. Fer should replace it with his own number,
     which is also the backlog question about his personal threshold. -->

**And here is why that number is worth having.** It is almost exactly the
millionaire line, and millionaires are counted. UBS puts the world's millionaire
population at **57.5 million, about 1.5% of adults and 0.69% of the total
population.** A million dollars at a 3% draw yields $30,000 a year, or $82 a
day.

So Fer's claim that "working is already optional for a very small subset" is
correct and, for the first time, has a number attached: **fewer than one person
in 140.**

Source: [UBS Global Wealth Report 2026](https://www.ubs.com/global/en/media/display-page-ndp/en-20260630-gwr-2026.html),
[Yahoo Finance summary](https://finance.yahoo.com/economy/articles/ubs-global-wealth-report-2026-144708720.html)

## ⚠️ The global comparison the first version got wrong

The original version capitalised a 2021-PPP consumption line, compared the
result with nominal-dollar GDP, and divided a loosely sourced nominal household
wealth range by the global population. **Those unit comparisons are invalid and
their conclusions are withdrawn.**

A defensible global resource-feasibility test needs quantities in compatible
units, current consumption distributions, public and household provision,
actual marginal resource requirements, productive capacity and behavioural
responses. The World Bank poverty gap can estimate a cash-equivalent shortfall
in international dollars. It cannot tell us the programme cost or prove that
redistribution, production or cost reduction is sufficient on its own.

## 🧭 What this means for his argument

Three consequences, and he will like two of them.

**1. His `if` framing gets stronger.** The money condition is not a rhetorical
device. Four in five people fall below a $30 comparison line, while the depth
and lived consequence vary substantially.

**2. His threshold question becomes testable, not answered.** Roughly $1.1m is
one personal scenario, and millionaire counts are observable. Neither proves
that work is optional, because wealth composition, obligations, location,
health and household needs differ.

**3. His remedy has to become a portfolio and a test.** Lower real costs,
earnings, ownership, transfers, public provision and institutional design can
all change access. The work is to model their conditions, interactions and
failure modes rather than declare one route arithmetically inevitable.

That is a harder, better argument, and it stays inside what the evidence can
support.
