# NERO warning backtest and shadow rehearsal

> **Status:** Agent analysis, 8 September 2026. This plan tests evidence and operating readiness. It does not validate an AI, crisis or household warning.

## Decision first

An honest historical warning backtest is not possible from the frozen August 2026 NERO archive alone.

The file supports a descriptive reconstruction of its current modelled history and a test of how often candidate rules would fire inside that history. It does not support estimates of warning accuracy, revision stability, false positives, false negatives or lead time. Those require as-published historical vintages and independent, time-stamped outcome labels.

Start a prospective shadow rehearsal now. Never present its signals as public warnings. Freeze every future NERO release before it can be replaced, issue pre-registered review candidates using only information then available, and compare them with later evidence. The August 2026 freeze is unusually valuable because Census night was 11 August 2026. ABS plans to release employment-related 2026 Census data in October 2027, creating a future external benchmark close to the NERO reference month.

The decisions are:

| Proposed use | Decision |
|---|---|
| Recreate candidate signal frequency inside the frozen path | GO, descriptive only |
| Call historical flags true or false | STOP |
| Estimate historical warning lead time | STOP |
| Claim a backtested AI or crisis detector | STOP |
| Begin immutable monthly vintage collection | GO |
| Run a no-consequence shadow rehearsal | GO after governance and protocol gates |
| Trigger public or individual action from NERO | STOP |

The [frozen-vintage audit](nero-warning-audit-2026-08.json) records the source hashes, empirical diagnostics and failed validity tests. The [shadow protocol](nero-shadow-protocol.json) defines the prospective record and gates.

## What a warning backtest must prove

A defensible backtest must reproduce this sequence:

1. At release time (r), use only information actually available by (r).
2. Apply a detector fixed before its holdout period.
3. Record an alert, non-alert or unavailable state for a defined series and target.
4. Observe an independent target event at time (t > r).
5. Measure revision sensitivity, accuracy, lead time and operational burden.
6. Preserve failures and missing data, not only successful warnings.

NERO's August archive does not satisfy steps 1 or 4. A line dated 15 March 2020 in a file published in September 2026 is not proof of the value published in March or April 2020. It may contain revised inputs, later model architecture, reconciliation or regenerated history. The public file has no field that resolves that question.

## What the frozen archive contains

The official archive is `2026-08_nero.zip`, published by Jobs and Skills Australia on 2 September 2026.

- Archive SHA-256: `a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446`
- CSV SHA-256: `7c1efd44b8f6692f32e92267cdbbb386abb87c0aa621d00b83cbde4136d325d1`
- CSV rows: 4,123,680 observations plus one header
- Shape: 355 ANZSCO 4-digit occupations by 88 SA4 regions by 132 months
- Date range: 15 September 2015 to 15 August 2026
- Scoped extract: five occupations by 88 SA4s, giving 440 separate series and 58,080 observations
- Fields: row identifier, state, SA4 code and name, occupation code and name, date and modelled employment estimate

It does not contain release vintage, first estimate, revision, model version by observation, input cutoff, uncertainty interval or any target-event label.

### Model facts that affect a warning

JSA states that NERO is experimental, subject to revision, modelled and smoothed. It is reconciled and scaled to Labour Force Survey totals. JSA warns that smoothing may not reflect short-term fluctuations or rapid changes and that novel patterns outside the historical data may not be captured. Occupation and region estimates must not be summed or combined.

The [NERO v3 paper](https://www.jobsandskills.gov.au/sites/default/files/2026-06/nowcast_of_employment_by_region_and_occupation_3.0_.pdf) documents training through August 2025 and one held-out evaluation month, November 2025. It reports aggregate mean absolute percentage error of 16.8% for the smaller v3 subgroup and 19.0% for the larger subgroup. That is a point-estimate test, not a warning test. It does not report event sensitivity, precision, warning lead time or scoped occupation-SA4 performance.

Of the 440 scoped series, 199, or 45.2%, have an August 2026 estimate below 800. This is only a size-risk proxy because JSA's actual grouping uses recent average size within Group 1. The public file does not expose group membership. The proxy share is 93.2% for contact-centre series and 72.7% for payroll-clerk series, so average model performance cannot be assumed for these cohorts.

## Why a plausible-looking retrospective chart is not a backtest

### Revision and look-ahead bias

Using the August 2026 history to issue a simulated 2019 warning risks giving the detector information or modelling choices that did not exist in 2019. A valid as-of series must select the first estimate for each reference month from its actual publication vintage. Later-revised values belong only in a separate final-vintage comparison.

Required revision measures are:

- first-to-next-release revision;
- first-to-latest revision;
- revision relative to the detector threshold;
- sign change in monthly and annual growth;
- alert-to-no-alert and no-alert-to-alert flip rate; and
- time until a reference month stabilises.

None can be calculated from one vintage.

### Smoothing

The frozen path is very smooth month to month. Across the 440 series, only 0.073% of adjacent-month comparisons fall by at least 5%, and none falls by at least 10%. Yet 37.3% of overlapping series-months are at or beyond three consecutive monthly declines. A detector based on a large one-month shock may miss rapid deterioration. A detector based on a run of declines may remain on for long periods.

This is detector burden, not accuracy. The shadow protocol must collapse consecutive alert months into episodes and record the first alert only, with an explicit reset rule.

### Base rates and multiple testing

No “crisis” outcome has been defined. The archive therefore contains no event base rate.

A descriptive placebo shows the problem. In the transparent pre-December 2022 split, 19.4% of overlapping annual comparisons show a decline of at least 10%. A rule requiring that decline plus at least three consecutive monthly falls is present in 17.3% of observation-months. These cannot be called false positives because other technologies, recessions and restructuring existed and no event labels are available. They do show that a negative trend is common and not specific to generative AI.

With 440 series inspected every month, uncorrected threshold search will find dramatic paths by chance or ordinary variation. All rule families, thresholds, episode definitions and subgroup cuts must be registered before the holdout period. Report the alert burden per 100 eligible series and the number of independent episodes, not only percentages of overlapping months.

### Comparator leakage

The [official methodology](https://www.jobsandskills.gov.au/data/nero/nero-methodology) lists Labour Force Survey regional and occupation estimates, Census 2016 and 2021, job placements, skilled visas, vacancy advertisements, business counts, vocational data and other inputs. Those inputs cannot be presented as fully independent validation of NERO's historical levels.

| Comparator | Proper role | Independence problem | Resolution mismatch |
|---|---|---|---|
| ABS Labour Force Survey totals | Coherence and broad trend check | NERO is scaled to LFS region and occupation totals | Does not provide the same public monthly occupation-SA4 cell |
| JSA Internet Vacancy Index | Labour-demand context | It is a NERO model input | Vacancies are not employment or worker transitions |
| Census 2016 and 2021 | Historical benchmark context | Both are NERO model inputs | Five-year snapshots |
| ABS Longitudinal Labour Force | Worker transition triangulation | Drawn from the LFS family and not independent of all NERO inputs | Restricted, short panel and likely sparse at occupation-SA4 |
| ABS Job Mobility | Separation, engagement and retrenchment context | Independent survey construct, but shares household-survey limitations | Annual and public occupation or geography detail is broader |
| DSS payment counts | Downstream local stress context | Administratively independent of NERO | No occupation and policy or take-up changes affect counts |
| 2026 Census employment data | Prospective external point benchmark for frozen August 2026 NERO | Not an input to the already frozen August 2026 archive | Employment data planned for October 2027; definition and cell matching still require validation |
| Employer payroll and task records | Strong direct outcome and deployment comparator | Requires new partnership, governance and audit | Can match site and occupation if collected prospectively |

No single comparator validates the full chain. Use the 2026 Census to test point estimates, a new employer-worker panel to test adoption and redesign, and household measures to test downstream continuity. Keep those conclusions separate.

### Lead time

Lead time begins at publication, not at the middle of the reference month:

`lead_time = independently observed event onset - alert publication timestamp`

The August reference data were released on 2 September. A chart that uses 15 August as the alert time grants information earlier than the user could have received it. Historical release timestamps and target onset dates are absent, so historical lead time is not measurable.

A warning is useful only if its lower-tail lead time exceeds the time required for its bounded action. A monthly employment estimate cannot honestly promise a rapid response to a shock that smoothing hides or that is confirmed after the action window closes.

### False positives and false negatives

The terms require a target:

- **True positive:** an alert episode followed by the predeclared independent event within horizon (H).
- **False positive:** an alert episode without that event within (H), after adequate outcome observation.
- **False negative:** an event with no preceding alert in the predeclared warning window.
- **True negative:** an eligible non-alert period with no event, sampled in a way that does not let numerous ordinary months dominate accuracy.

Without an independent event label and horizon, a decline is neither true nor false. “Accuracy” must not mean agreement with the latest NERO revision.

## Define the target before the detector

Do not backtest “crisis”. Separate four claims:

| Tier | Target | Can NERO support it? |
|---|---|---|
| 0 | Data-quality anomaly or major revision | Yes, after at least two frozen vintages |
| 1 | Employment-trend review candidate in one occupation-SA4 | Yes, as a descriptive input only |
| 2 | Independently observed adverse worker-flow event | Only with a matching outcome source |
| 3 | Household continuity-floor or agency deterioration | No, requires separate linked or cohort-representative measures |
| 4 | Outcome caused by AI adoption or redesign | No, requires observed treatment and a credible counterfactual |

The first shadow rehearsal should target Tier 0 and Tier 1. It should test whether the data and review process behave as designed, not whether NERO predicts crises.

## Historical backtest plan, conditional on archived vintages

This plan becomes valid only if JSA supplies or confirms immutable as-published monthly archives, their release timestamps and model/input cutoffs.

### 1. Acquire and lock vintages

Request from JSA:

- every public monthly NERO archive as originally released;
- release and replacement timestamps;
- model version and retraining date for each release;
- input series vintages and cutoffs;
- whether historical estimates were regenerated;
- revision and correction notes;
- series group membership and uncertainty diagnostics; and
- any unpublished evaluation by occupation, region and series-size group.

Hash each original file. Never overwrite it. Treat any month without verified provenance as unavailable, not reconstructed.

### 2. Build two panels

1. **As-of panel:** for release (r), contains exactly the values available at (r).
2. **Revision panel:** contains each observation month (t) across later release vintages (r).

The detector reads only the as-of panel. Revision analysis compares its decisions with later vintages but never replaces the original decision.

### 3. Pre-register detector families

Do not select a threshold from the holdout. Register a small set of interpretable candidates:

- 12-month percentage change;
- rolling slope over a declared window;
- acceleration relative to a trailing seasonal baseline;
- a run rule with declared minimum change, not direction alone; and
- a two-source rule requiring non-NERO corroboration.

For each detector, define eligibility, missingness, series-size stratum, minimum history, threshold, alert episode, cooldown, reset, forecast horizon and bounded action. Keep all five occupations separate.

Use simple comparators:

- no-alert policy;
- seasonal persistence;
- fixed 12-month change rule; and
- a broad state-occupation trend rule.

A complex model must beat these on out-of-time data and decision utility, not merely in-sample fit.

### 4. Split by time and model version

- Train or calibrate only on a declared early block of as-published vintages.
- Reserve a later contiguous block as holdout.
- Treat v1, v2 and v3 changes as explicit breaks. Do not pool them silently.
- Run a separate negative-control analysis before general-purpose generative AI diffusion, labelled as a placebo and not as truth.
- Test sham deployment dates and unaffected or lower-exposure occupation controls only when matching assumptions are defensible.

Randomly splitting rows is invalid because neighbouring months and regions are dependent and lets future regimes leak into training.

### 5. Freeze independent outcomes

For each target, document:

- exact event definition and onset date;
- source and release vintage;
- whether it is a NERO input;
- geography, occupation and denominator;
- observation and reporting lag;
- uncertainty and revisions; and
- blind adjudication before revealing the NERO signal where judgement is required.

Do not relabel outcomes after viewing which detector performed best.

### 6. Evaluate decisions, not just fit

Report by detector, occupation, state, SA4, series-size risk group and model version:

- number and prevalence of independent event episodes;
- sensitivity and false-negative rate;
- precision and false-discovery rate;
- specificity and false-positive rate using a defensible sample of non-event periods;
- alert episodes per 100 eligible series per month;
- first-alert lead-time distribution from publication date;
- detection delay for events already underway;
- alert duration and repeat burden;
- first-release to latest revision error;
- alert flip rate after revision;
- missing, suppressed and stale rates;
- calibration if the detector emits probabilities; and
- net decision value under predeclared false-positive and false-negative costs.

Use clustered or block-resampled confidence intervals. Series-month rows are not independent. Report numerator and denominator beside every rate.

### 7. Challenge the result

Run these failure tests before any go decision:

- remove the largest regions;
- isolate series below the JSA size-risk threshold proxy;
- shift event dates within plausible reporting uncertainty;
- change reasonable episode and cooldown definitions;
- exclude pandemic and include pandemic periods separately;
- inspect performance after each model-version break;
- test whether a state-wide shock explains all occupation signals;
- test revisions using first, next and latest vintages;
- compare reference-date and publication-date lead time; and
- measure the effect of missing comparator data.

If the conclusion changes under a reasonable specification, label it unstable.

## Minimum honest shadow rehearsal

### Stage A: lock the protocol before 7 October 2026

JSA lists 7 October, 4 November and 2 December 2026 as planned release dates for September, October and November data.

Before the first new vintage:

1. Approve the governance, target and no-consequence policy.
2. Freeze detector definitions, thresholds and action-capacity constraints.
3. Implement immutable archive storage with checksum, retrieval time, release period, model version and schema validation.
4. Register every expected series. Missing series must produce an unavailable state.
5. Freeze comparator snapshots and their source vintages on the same day.

### Stage B: monthly prospective run

For each release:

1. Retrieve and hash the untouched archive.
2. Diff schema, coverage and history against the previous release.
3. Calculate revisions for every overlapping reference month.
4. Generate signals from that release's as-of data only.
5. Collapse persistent flags into episodes.
6. Record the shadow decision before later outcomes arrive.
7. Publish nothing as a crisis warning and trigger no individual consequence.
8. Add independent outcomes when released without changing the original signal.
9. Log reviewer time, disagreement, escalation capacity and information requests.

### Stage C: rehearsals without pretending they are validation

Run quarterly tabletop and data-injection exercises:

- sudden one-month break that NERO smoothing might hide;
- slow 12-month decline that produces repeated flags;
- source revision that reverses a warning;
- occupation classification break;
- missing or delayed NERO release;
- state-wide recession affecting all cohorts;
- local employer closure unrelated to AI;
- apparent worker-flow decline while household-floor indicators remain stable;
- household-floor deterioration without a NERO decline; and
- beneficial augmentation with rising employment and agency.

Synthetic injections test software and governance response, not predictive accuracy. Label them “rehearsal evidence”.

### Stage D: prospective external checks

- After three vintages, report a revision smoke test only.
- After 12 consecutive vintages, report first-release revision curves and alert stability. Do not call this crisis validation.
- In October 2027, evaluate the frozen August 2026 occupation-SA4 point estimates against compatible 2026 Census employment products if the required cross-tabulation is released.
- Continue until the effective number of independent target events supports the predeclared confidence precision. Calendar duration alone is not enough.

The Census comparison tests level and ranking accuracy near August 2026. It does not test early-warning lead time, AI attribution or household outcomes.

## Stop and go criteria

### GO to monthly shadow operation only if

- the detector and target are registered before the next data release;
- source archives and decisions are immutable and independently time-stamped;
- every result is labelled modelled and descriptive;
- missingness, revision and model-version changes fail visibly;
- NERO series remain separate;
- no shadow result affects benefits, employment, service access or individual treatment; and
- the review team has capacity to examine the expected alert burden.

### GO to a limited public review signal only if

- an independent target exists at compatible cohort, geography and time;
- the evaluation has enough independent event episodes to meet a predeclared confidence-interval precision after clustering;
- the lower confidence bounds for sensitivity and precision beat the named simple baselines and minimum decision requirements;
- alert burden fits declared human review capacity;
- first-alert lead time exceeds the mobilisation time of the proposed action, including a poor-tail lead-time test;
- revision-driven alert flips remain below a predeclared tolerance tied to action cost;
- performance is acceptable for small series and every scoped occupation, not only the aggregate;
- results survive the specification and confounder challenges; and
- independent statistical, worker and ethics reviewers approve the exact public wording.

Thresholds for these gates must be set from the cost and reversibility of the action before results are inspected. This plan does not invent one universal accuracy threshold.

### STOP immediately if

- historical vintages are reconstructed from a later file;
- an input source is presented as independent ground truth;
- thresholds are tuned on the reported holdout;
- repeated alert months are counted as independent successes;
- release lag is omitted from lead time;
- a missing or suppressed cell inherits its previous status;
- performance for a small series is hidden by an average;
- a NERO trend is labelled adoption, displacement, crisis or causation;
- an alert could reduce support or target a person or place; or
- the warning arrives too late for the stated action.

## Public wording

Until the public-signal gates pass, use:

> “This modelled employment series has met a pre-registered review condition. It does not show why employment changed and it is not evidence of AI adoption or household crisis. The team is checking revisions, broader labour data and direct reports before drawing a conclusion.”

Do not use “NERO predicted”, “AI warning”, “job-loss alert”, “crisis detected” or “false positive” without the corresponding evidence defined in this plan.

## The minimum next action

Freeze the September 2026 release on 7 October, without replacing August. Run only Tier 0 revision and Tier 1 review-candidate checks. In parallel, request historical publication vintages and model-cutoff documentation from JSA. If those do not exist, accept that historical warning validation is unavailable and keep the evaluation prospective.
