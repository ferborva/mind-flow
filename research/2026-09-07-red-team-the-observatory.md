---
id: 2026-09-07-red-team-the-observatory
title: Red team, the observatory taken apart
type: research
status: active
themes: [abundance]
supports: [the-transmission-test, the-zero-cost-count]
retrieved: 2026-09-07
---

# Red team: the observatory taken apart

Same five voices, aimed at the instrument rather than the essay. Constructions
from their published frameworks, not their words.

**One finding was not an objection but a defect**, and it is first because I
shipped it.

## 🦅 TL;DR

- **The v1 headline was broken and produced a false alarm.** It added price
  inflation to a change in labour share, which are different units, and the
  labour term contributed under 8%. The chart was inflation in a costume, and it
  read **FAILING** in red. Fixed and publicly corrected on the page.
- **The corrected metric says something quieter and more useful.** World
  2004-2025: real output per capita **+44.3%**, real labour income per capita
  **+40.8%**. A 3.5 index-point gap over 21 years. **This is not an Engels'
  Pause.** Britain's was roughly ten times that.
- **Diamandis lands the hardest blow and it still stands.** CPI may be
  structurally incapable of detecting demonetisation. The price channel is the
  weakest instrumentation on the page and the argument turns on it.
- **Wissner-Gross's objection is unanswerable as built.** Every signal lags one
  to three years. Seldon did not publish lagging indicators.

---

## 🔧 The defect, before anyone else finds it

**What v1.0.0 computed:** price relief (negative CPI inflation, a *rate*) plus
the annual change in labour share (a *percentage-point change in a ratio*).

Two problems, and the second is worse than the first.

**It is dimensionally incoherent.** Those quantities are not commensurable. You
cannot add them and get a meaningful number.

**The labour term is swamped.** Measured on the actual data:

| Year | Metric | −Inflation | Δ Labour share | Labour's contribution |
|---|---|---|---|---|
| 2022 | −8.58 | −8.08 | −0.50 | 6% |
| 2023 | −5.80 | −5.80 | 0.00 | 0% |
| 2024 | −2.91 | −3.01 | +0.10 | 3% |
| 2025 | −2.84 | −3.04 | +0.20 | 6% |

**The headline was 94% inflation.** It rendered a large red number and the word
FAILING against a comparison the data did not support. Any of the five would
have found this in about ninety seconds, and would have been right to dismiss
the whole page for it.

**The fix.** Compute what history actually ran:

> real labour income per capita = labour share × real GDP per capita
> gap = growth(labour income per capita) − growth(GDP per capita), in pp

Both sides real, per capita, growth rates. Commensurable, and it is literally
the Engels comparison.

**And the answer changes.**

| | Output per capita | Labour income per capita | Gap |
|---|---|---|---|
| Britain 1780-1840 | +46% | +12% | ~34pp |
| **World 2004-2025** | **+44.3%** | **+40.8%** | **3.5pp** |
| Spain 2004-2025 | +15.2% | +9.2% | 6.0pp |

**The world is not in an Engels' Pause.** The page now says so. That is a worse
headline and a better instrument: it establishes the baseline against which a
real divergence would be visible early, which is the entire point.

## 🚀 Diamandis: your price channel cannot see the thing you are looking for

**The objection.** You put consumer price inflation on the page as "the price
channel". CPI is a basket weighted by what households currently spend on. **When
a good's price collapses toward zero, its weight in the basket collapses with
it, and eventually it leaves.** The index is constructed to track the cost of a
representative purchase, not the arrival of free abundance.

Demonetisation therefore appears in CPI as *absence*. The $900,000 of 1969-1989
goods that now arrive free with a phone did not show up as deflation. They showed
up as those categories quietly ceasing to be measured.

You are also measuring income and not consumption. Demonetisation shows up as
consumption rising against flat income, which is precisely the signal your page
has no series for.

**Where it lands.** Hard, and it is unfixed. The page now carries this as an
explicit caveat and names the price channel as its weakest instrumentation, which
is honest but is not an answer.

**What would actually answer it.** The zero-cost count, which is the void panel.
That is not a coincidence: **the metric that does not exist is exactly the one
this objection demands.** Worth saying out loud to the crew, because it converts
a weakness into the argument for building the thing.

## 🧬 Wissner-Gross: you have built a rear-view mirror and called it psychohistory

**The objection.** Seldon's claim was predictive. Yours is not. Labour share
reports with a multi-year lag. Poverty estimates for recent years are modelled
nowcasts. GDP revises. **Every number on the page describes a world that is
already one to three years gone**, and the transition you are worried about is
supposed to be exponential.

There is no uncertainty on anything. Every point is rendered as a fact with no
interval, no revision history, no error band. A dashboard with no uncertainty is
making a stronger claim than its data supports, on every single panel.

And there is no forecast. Not one line extends past today. If the purpose is to
notice a crossing early, the instrument must say something about *next*, with a
stated confidence, that can later be scored.

**Where it lands.** Unanswerable as built, and it is the sharpest structural
criticism of the whole thing.

**The defence, such as it is.** A baseline you can score forecasts against has to
exist before the forecasts do. But that is a roadmap, not a rebuttal. **The next
build needs revision vintages, uncertainty, and at least one forward projection
that can be marked wrong.**

## ⚡ Mostaque: you are measuring the incumbent with the incumbent's ruler

**The objection.** Every series is a national-accounts aggregate produced by the
World Bank, the ILO and national statistical offices. Those are exactly the
institutions whose adequacy is in question when the claim is that the economy is
being restructured by actors they do not measure well.

GDP does not price free goods. Labour share does not see unpaid or informal work.
Neither captures compute, model capability, or the concentration of cognitive
power that I would argue is the actual variable.

**You have no series for concentration at all.** Not compute, not market share,
not capital ownership. For a dashboard whose parent argument is about a handful
of firms accruing the resources, that is a conspicuous hole.

**Where it lands.** The concentration point is a genuine gap and cheap to fix.
The deeper "wrong ruler" objection is real but partially answered by the void
panels: the page already says the instruments do not exist.

## 🏢 Ismail: seven countries is not a sample, and GDP is a linear-era ruler

**The objection.** Why these seven? World, US, Germany, Spain, Australia, China,
India. No stated rationale. It looks like convenience, and a reader will assume
Spain and Australia are there because the author lives in one and comes from the
other.

More seriously: you are tracking GDP and labour share, industrial-era aggregates
built to measure an economy of things, and using them to detect an exponential
change in an economy of access. **Access does not appear in GDP.** A service used
by a billion people at zero marginal cost contributes approximately nothing to
the numbers on your page.

**Where it lands.** The sample point is fair and trivially fixable, either by
stating the rationale or by expanding to a real panel. The linear-ruler point
is the same family as Diamandis's and just as unresolved.

## 💼 Blundin: one year of a noisy number is not a finding

**The objection.** Your v1 headline took a single year of a volatile derived
series and rendered it enormous, red, and labelled FAILING. Look at your own
chart: that series swings from −1.0 to −8.6 within four years. **Nothing that
noisy supports a verdict.**

The corrected version is better but has the same discipline problem in reverse:
one reading of "tracking" is not evidence of safety either. Where are the
confidence bands, the trend test, the significance of the difference between
+40.8% and +44.3% over 21 years?

**Where it lands.** It landed hard on v1 and the correction is exactly this
criticism applied. The page now leads with a cumulative multi-decade figure
rather than a single year, which is the right shape. Confidence bands are still
missing.

---

## 🧭 Verdict

**Fixed in this build.**
- The broken metric, replaced and publicly corrected on the page itself.
- The headline now reads a 21-year cumulative gap rather than one noisy year.
- Nowcast years flagged as projections rather than presented as measurements.
- CPI's structural blindness to demonetisation carried as an explicit caveat.
- Argument-first restructure: what would change my mind, and where I need you to
  push, both now on the page.

**Open, and honestly so.**
- **No uncertainty anywhere.** The single biggest remaining weakness.
- **No forecast.** A psychohistory page with no forward line is a museum.
- **No concentration series.** Cheap to add, conspicuous by absence.
- **No cohort cuts.** Still the thing that would most change what the page can
  claim.
- **The seven entities need a stated rationale** or a real panel.

**The thing worth telling the crew.** Diamandis's objection and the empty
zero-cost panel are the same problem seen from two sides. CPI cannot see
demonetisation; the metric that could see it does not exist; and that is the
strongest available argument for building it. **The hole in the dashboard is the
proposal.**
