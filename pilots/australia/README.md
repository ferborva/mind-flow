# Australia transition observatory pilot

> **Status:** Agent analysis, 8 September 2026. This is an evidence-feasibility design, not an official statistical product or a finding that AI has caused labour-market or household outcomes.

## Recommendation

Proceed with an 8 to 12 week baseline and data-access pilot. Do not yet publish a causal AI transition score, a crisis forecast, or automated policy triggers.

The prospective acquisition path is specified in
[The Bridge Study](evidence-bridge-protocol.md). It treats verified deployment,
task redesign, worker outcomes, household continuity and lived agency as a
single missing evidence bridge, while keeping each construct and claim ceiling
separate.

Australia has enough primary data to build a useful baseline for five clerical occupation groups and to test whether household continuity-floor measures can be estimated. It does not yet have the linked, repeated evidence needed to infer this chain:

`AI exposure -> realised adoption -> work redesign -> worker flows -> household resources -> essential access -> agency`

The chain currently breaks at realised adoption and work redesign. Exposure is a modelled technical potential. It is not evidence that a technology was deployed, that a task changed, or that a worker outcome was caused by AI.

The pilot should therefore make two products distinct:

1. **A factual observation layer:** source-native measures, vintages, uncertainty and revisions.
2. **An explicitly conditional reasoning layer:** IF statements that describe what evidence would change a forecast or action, without presenting those conditions as facts.

The machine-readable [source manifest](source-manifest.json), [scorecard](pilot-scorecard.json) and [IF register](if-register.json) are normative companions to this note. Before the later retention event, the [frozen August 2026 NERO baseline](data/README.md) was locally recomputable only if the same external archive could be recovered. Exact source bytes are now retained in a later checksum-pinned capture, and byte snapshots of the pinned in-process builder and archive reproduce the numeric and identity fields for all 440 selected series. Publisher authenticity, classification versions, exact release time and prospective chronology remain unverified, and the historical baseline record is not rewritten.

## Pilot question

Can Australia detect, early enough to act, whether AI-related work redesign is weakening or strengthening the real freedom of clerical workers to maintain a protected continuity floor and choose their next move?

### Population in scope

Use ANZSCO 2013 version 1.3 unit groups as five separate cohorts:

| Cohort | ANZSCO code | Included occupations |
|---|---:|---|
| General clerical | 5311 | General Clerks, including 531111 General Clerk |
| Accounting clerical | 5511 | Accounting Clerks, including 551111 Accounts Clerk |
| Bookkeeping | 5512 | Bookkeepers, including 551211 Bookkeeper |
| Payroll clerical | 5513 | Payroll Clerks, including 551311 Payroll Clerk |
| Contact centre | 5411 | Call or Contact Centre Workers, including 541111 team leader and 541112 operator |

Do not combine these Jobs and Skills Australia NERO series. JSA states that NERO occupation and region estimates should not be summed or combined. Report each occupation-region series separately and provide a clearly labelled comparison view.

### Geography

- Preferred analytical geography: state and territory, then SA4 only when a source supports it and sample precision is acceptable.
- NERO provides modelled monthly ANZSCO 4-digit estimates for 88 SA4 regions.
- ABS General Social Survey 2025 DataLab contains SA4 and occupation fields, but the 13,302-household national sample is unlikely to support every occupation by SA4 cell.
- Public continuity-floor sources are usually national, state, SA2, remoteness or provider level. They cannot be treated as occupation-specific evidence.

### Protected continuity floor

The floor is defined as continued practical access to:

1. housing;
2. food;
3. household energy;
4. transport;
5. primary healthcare; and
6. connectivity.

The floor is breached when a household cannot obtain or retain an essential, not merely when its aggregate spending falls. Spending and price series are context, not access measures.

## The evidence chain

### 1. Exposure

**Question:** What share of the cohort's current task bundle could generative AI augment or automate under full technical adoption?

**Primary indicator:** JSA task-level Augmentability and Automatability scores from 0 to 1, aggregated to ANZSCO 2013 version 1.3 occupations, plus JSA adaptation and dynamism measures.

**Resolution and timing:** National occupation level; static September 2025 study; no recurring release commitment. Download the publication chart workbook and occupation interactive data pack from the [JSA Gen AI Capacity Study](https://www.jobsandskills.gov.au/studies/generative-artificial-intelligence-capacity-study).

**Interpretation:** Exposure is a scenario input. It must never be shown as observed adoption, job loss probability, transition speed or worker harm.

**Decision:** GO for baseline segmentation. STOP for causal or timing claims.

### 2. Realised adoption

**Question:** Are employers actually deploying AI into the scoped occupations, for which tasks, under what controls, and at what intensity?

**Available indicators:** ABS Characteristics of Australian Business asks whether a business used AI. The 2024-25 release reports industry and business-size results, but the question was not designed to measure intensity. JSA's adoption evidence combines business surveys, focus groups, company reports, venture-capital evidence and online profiles or job advertisements.

**Resolution and timing:** ABS is biennial and industry-level. The JSA study is static. Neither provides occupation by SA4 by month or quarter.

**Missing indicator:** A repeated employer-worker panel containing deployment date, named workflow, affected task share, usage intensity, worker participation, governance, error or override rate and linked occupation-region.

**Decision:** STOP for cohort-region adoption estimates and all AI attribution. GO only for contextual industry adoption.

### 3. Work redesign

**Question:** Did deployment remove, augment, intensify, supervise, standardise or create tasks, and who gained decision rights?

**Available indicators:** JSA adaptation concepts include skills inflation, task hybridisation, specialisation and vertical or horizontal adaptation. Job advertisements and professional profiles can detect demand-side and supply-side skill shifts.

**Resolution and timing:** National, occupation or industry depending on the underlying table; mostly static study outputs. Online profiles and advertisements are selective and are not a representative worker panel.

**Missing indicator:** Repeated task inventories before and after implementation, hours by task, discretion, monitoring, target intensity, override rights, training time, wage consequences, redeployment offers and worker voice.

**Decision:** STOP for claims that exposure has become redesign. Design and test a quarterly employer-worker instrument.

### 4. Worker flows

**Question:** Are scoped workers staying, changing jobs, losing hours, being retrenched, leaving the labour force or moving into better work?

**Primary indicators:**

- JSA NERO monthly employed-person estimates for each ANZSCO 4-digit cohort by SA4.
- ABS Longitudinal Labour Force Survey transitions in employment status, hours, occupation, industry, unemployment, retrenchment and labour-force participation for up to eight months per person.
- ABS Job Mobility annual job changes, engagements, separations, retrenchment and changes in employment characteristics.
- ABS Labour Force detailed quarterly occupation unit group by sex and state estimates.

The ABS Labour Force family, including the Longitudinal LFS, is not an
independent corroborator of NERO because NERO uses and reconciles Labour Force
Survey inputs. Job Mobility and detailed Labour Force releases are also
context only unless an audit establishes independent lineage and an exact
match on occupation, geography, time window and outcome construct. A broad
state or occupation estimate must not validate an SA4-cohort signal.

**Resolution and timing:** NERO is the highest-frequency cohort-geography source. It is experimental, modelled and smoothed, residence-based, suppresses counts below 10 and can miss novel breaks. Longitudinal LFS is DataLab-only and has an eight-month panel limit. Job Mobility is annual. Public Labour Force detail is state-level for the relevant unit groups.

**Decision:** CONDITIONAL GO for descriptive flow monitoring. STOP for AI attribution because adoption and redesign are not observed in the same records.

### 5. Household resources

**Question:** Do workers and their households retain adequate income, liquidity and buffers through a transition?

**Primary indicators:**

- ABS GSS 2025 DataLab: personal and household weekly income, equivalised income, housing tenure, rent and rent-to-income ratio, ability to raise $2,000 in a week, cash-flow problems and dissaving.
- ABS Employee Earnings: occupation earnings context.
- DSS quarterly payment data: income-support receipt, duration, earnings, payment rate, exits and Commonwealth Rent Assistance at postcode, LGA and SA2 where available.
- ABS Selected Living Cost Indexes and Monthly Household Spending: price and aggregate spending context.
- RBA housing loan payments, housing lending rates and monetary-policy series: macro-financial confounder context.

**Critical gap:** The latest publishable Survey of Income and Housing remains 2019-20. ABS did not release 2023-24 results because they did not meet quality standards. The GSS bridge is cross-sectional and most hardship questions use a 12-month reference period.

**Decision:** CONDITIONAL GO for a 2025 baseline and aggregate context. STOP for a timely household transition panel.

### 6. Essential access

The GSS 2025 DataLab is the most important cross-sectional bridge. It includes occupation, SA4, household resources, cash-flow failures, perceived transport difficulty and difficulty accessing service providers in one source. Access is restricted, outputs require clearance and sample size may force national or state reporting.

| Floor domain | Exact baseline indicators | Repeat context | Main limitation | Decision |
|---|---|---|---|---|
| Housing | GSS could not pay mortgage or rent; rent-to-income ratio; tenure | DSS CRA and AIHW rental stress, social housing and waitlists | No high-frequency occupation link | Conditional baseline |
| Food | GSS went without meals | ABS 2023 household food insecurity due to lack of money | National/static and 12-month recall | Conditional baseline |
| Energy | GSS could not pay electricity or gas; unable to heat or cool | AER debt, hardship, payment plans, disconnection and reconnection | AER omits Victoria, WA and NT; no occupation link | Conditional baseline |
| Transport | GSS transport difficulty; could not pay car registration or insurance | ABS state transport spending | Spending is not access; no recurring national access series | Stop for monitoring |
| Primary healthcare | GSS difficulty accessing health, hospital or Medicare services; went without dental care | ABS Patient Experiences delayed or missed GP care, including due to cost | Annual or irregular, retrospective and usually no occupation cross | Conditional baseline |
| Connectivity | GSS could not pay telephone or internet; difficulty accessing telecommunications | ACCC speed, latency, packet loss and outage results | ACCC programme ended June 2026 and excludes unconnected households | Stop for monitoring |

### 7. Agency

**Question:** Can affected people understand their options, exercise voice and choose among credible paths without losing the continuity floor?

**Available proxies:** GSS life satisfaction, support in crisis, ability to obtain help and trust; ABS Barriers and Incentives desire for work or more hours, availability, job-search difficulties, barriers, incentives, unpaid care and disability.

**Missing construct:** Direct, repeated measures of control, meaningful choice, perceived future options, worker voice, negotiation power, time autonomy and capacity to refuse a harmful transition.

**Decision:** STOP for a direct agency index. If proxies are displayed, label them as proxies and keep each component visible.

## Measurement design

### Source-native observations

Each displayed observation must carry:

- indicator definition and unit;
- source, table or data item, descriptive publisher release date and reference period;
- a verified UTC release timestamp, or a conservative first-seen interval with
  its observation evidence;
- geography and population denominator;
- observed, modelled, survey-estimated or agent-derived status;
- confidence interval, relative standard error or suppression state where available;
- revision and classification version;
- licence and access conditions; and
- known break in series.

Never interpolate a missing floor measure into an observed value. Never substitute price or spending for access. Never convert an exposure score into an adoption percentage. A calendar-only release date cannot prove prospective chronology and must never be converted into an invented midnight timestamp. If a first-seen record has no lower bound, leave chronology unknown and record the next observation needed.

### Joins

Use the following controlled join keys:

| Dimension | Baseline standard | Rule |
|---|---|---|
| Occupation | ANZSCO 2013 version 1.3 | Keep the five unit groups separate. Record every mapping. Do not silently splice OSCA 2024. |
| Geography | ASGS 2021 SA4 | Map SA2 to SA4 only with an official concordance and document split allocation. Do not infer SA4 from provider or retailer regions. |
| Time | Source reference period | Preserve monthly, quarterly, annual and retrospective windows. Do not label release date as observation date. |
| Population | Source-native denominator | Distinguish people, employed people, households, businesses, customers and payment recipients. Do not combine rates with unlike denominators. |

Keep cohort and place evidence separate. A household-floor result for a state,
SA4 or local population is place context only unless the source directly
identifies the scoped occupation cohort. It cannot fill a missing cohort-floor
condition or turn its state from unknown to satisfied.

ABS is moving to OSCA 2024 during 2026. JSA NERO and the Gen AI study use ANZSCO 2013 version 1.3, while some ABS earnings material uses an earlier ANZSCO version. Build and publish a versioned concordance before adding any post-transition series.

### Precision policy

The following is an **agent-proposed publication policy**, not an ABS rule:

- relative standard error at or below 25%: publish with the estimate and uncertainty;
- above 25% and at or below 50%: publish only as directional, with a prominent warning;
- above 50%, suppressed or not available: do not publish the estimate;
- require a minimum unweighted sample and confidentiality clearance for every GSS occupation-geography cell before display.

The pilot must validate these thresholds with an accredited statistician and ABS disclosure requirements before public use.

## IF conditions as the decision spine

Every forecast and action should be expressed as a falsifiable conditional:

`IF [observable conditions, time window and uncertainty rule] THEN [bounded interpretation] AND [reversible action] UNTIL [review or expiry condition].`

Example:

> IF employer-verified AI adoption rises in one scoped occupation-SA4 cohort, an independently produced worker-flow outcome for that exact occupation, geography and time window shows sustained deterioration, and a cohort-linked household-floor measure worsens beyond its predeclared uncertainty band, THEN convene a local evidence review and activate voluntary transition support, UNTIL linked evidence rejects the association or the review period expires.

This wording intentionally does not say that AI caused the deterioration. Escalation to a causal claim requires a credible counterfactual design, such as a phased deployment, matched comparison, difference-in-differences design with parallel-trend checks, or randomised intervention where ethical.

The [IF register](if-register.json) makes each condition machine-readable and forces explicit evidence, counterevidence, expiry and action ownership.

## Confounder register

At minimum, test and disclose:

- macroeconomic demand, interest rates, inflation and exchange-rate changes;
- business-cycle and seasonal effects;
- sector-specific restructuring unrelated to AI;
- outsourcing, offshoring and geographic relocation;
- migration, population growth and commuting changes;
- award, minimum-wage, industrial-relations and welfare-policy changes;
- enterprise software replacement that is not generative AI;
- occupational recoding and the ANZSCO to OSCA transition;
- survey redesign, sample attrition, non-response and retrospective recall;
- NERO smoothing, revisions and residence rather than workplace geography;
- AER jurisdiction gaps and retail reporting-definition changes from 1 July 2025;
- disaster, health and energy shocks; and
- intervention effects, including training or support introduced by the pilot itself.

## Pilot work plan

### Phase 0: governance and pre-registration, weeks 1-2

1. Appoint a statistical lead, worker representative, privacy lead and domain owners for each floor component.
2. Pre-register indicator definitions, uncertainty rules, hypothesis tests, confounders, expiry dates and false-positive or false-negative costs.
3. Obtain ABS DataLab access for GSS, Longitudinal LFS and Barriers and Incentives.
4. Freeze source vintages and classification versions in the manifest.
5. Run an Indigenous data-governance and coverage review. Several national surveys exclude very remote areas and discrete Aboriginal and Torres Strait Islander communities, so the pilot must not imply universal coverage.
6. Freeze each source's lineage, exact population and geography scope, and UTC
   release-availability evidence. Leave any unproved independence, scope match
   or prospective chronology gate unknown.

### Phase 1: baseline feasibility, weeks 3-6

1. Verify the GSS `ANZOCCD` category level and calculate unweighted cell counts for each cohort at national, state and SA4 levels.
2. Apply disclosure and precision tests before inspecting substantive results.
3. Ingest the five NERO series separately, recording vintage, revisions and suppressed values.
4. Reproduce each public floor indicator directly from its published table before any transformation.
5. Build a denominator and concordance test suite. Fail the pipeline on occupation-version, geography, unit or time-window mismatch.
6. Recompute all alert denominators from source rows in code, including the
   first eligible three-decline month, and retain boundary tests.

The public NERO extraction is the first completed component of this phase. It
does not satisfy the restricted-data, household-floor, agency or causal gates.

### Phase 2: explanatory prototype, weeks 7-10

1. Show observations, conditional interpretations and actions as separate layers.
2. Expose all source and uncertainty details from the manifest in the interface.
3. Add counterevidence and alternative-explanation views for every IF condition.
4. Conduct comprehension tests with workers, community organisations and decision-makers. Test whether users mistake exposure for adoption or association for causation.
5. Run red-team scenarios for false reassurance, false alarm, data lag, silent missingness, policy gaming and harmful targeting.

### Phase 3: stop/go review, weeks 11-12

Proceed to a limited live observatory only if all mandatory gates in the [pilot scorecard](pilot-scorecard.json) pass. Otherwise publish the feasibility findings and data gaps, then stop.

## Data needed to move beyond baseline

Commission or negotiate access to:

1. a monthly occupation-region adoption panel with employer-verified deployments;
2. a quarterly matched employer-worker work-redesign survey;
3. a monthly or quarterly household continuity-floor pulse for affected cohorts;
4. direct agency measures co-designed with workers and communities;
5. intervention logs covering eligibility, take-up, timing and service quality; and
6. ethical linkage infrastructure with consent, minimisation, disclosure control and independent oversight.

Without items 1 to 4, the observatory can describe context but cannot serve as an early-warning system for the full transition chain.

## Public communication rules

- Lead with what is observed, then what remains uncertain, then what action is reversible now.
- State the population, geography and reference period in plain language next to every number.
- Use “may be consistent with” for associations. Reserve “caused” for designs that identify causality.
- Present favourable and adverse pathways symmetrically.
- Name missing communities and data gaps rather than colouring them green.
- Let people inspect the verb, blank and IF clause behind each headline: “Protect [what] IF [conditions].”
- Show when a condition expires and what evidence would reverse it.
- Never rank a person, neighbourhood or occupation for coercive action from modelled exposure or sparse survey cells.

## Final feasibility judgement

| Proposed use | Judgement | Reason |
|---|---|---|
| Define and compare the five cohorts | GO | Stable ANZSCO 2013 version 1.3 definitions are available for the baseline. |
| Map technical AI exposure | GO, contextual | Strong JSA source, but it models potential under full adoption. |
| Track realised adoption and redesign | STOP | No recurring occupation-region panel. |
| Monitor worker employment flows | CONDITIONAL GO | NERO and ABS sources are useful but cannot identify AI causality. |
| Estimate 2025 floor breaches by cohort | CONDITIONAL GO | GSS DataLab may support national or state estimates only after direct cohort linkage, cell and precision testing. Place-level aggregates are context, not fallback evidence. |
| Estimate floor breaches by cohort and SA4 | STOP UNTIL TESTED | Sample size and disclosure constraints are likely binding. |
| Run real-time crisis alerts | STOP | Core measures are annual, retrospective, restricted or discontinued. |
| Publish a composite transition or agency score | STOP | Construct validity, weighting and direct agency measures are absent. |
| Publish transparent source-native dashboard | GO AFTER GATES | Appropriate if observation, inference and action remain visibly separate. |

The useful first move is not to claim a national predictive system. It is to prove which parts of the chain can be measured honestly, make the missing links impossible to hide, and design reversible action around explicit IF conditions.
