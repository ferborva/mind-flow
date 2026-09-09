---
id: round-08-measurement-independent-review
title: Round 08 independent measurement challenge
type: internal-review
status: review
provenance: commissioned-proposal
author: ren
created: 2026-09-09
updated: 2026-09-09
---

# Independent measurement challenge

Reviewed B head `27913ba`, independently of its author, on 2026-09-09.
These are five constructed opposing perspectives, not interviews or endorsements
by practitioners, affected people or statistical agencies. The review does not
approve publication. The gate interpretation below separates the brief's
explicit indicator candidates from a stronger personal-diagnosis standard.

## Literal brief and stronger diagnostic standard

Section 5 requires at least one basket item with five categories measured from
retained bytes and reproducible derivation. Workstream B explicitly suggests
eligibility rules, GP workforce distribution and health literacy as candidates.
The GP basket therefore meets that indicator-level gate with the five retained
series types, including proxies and rule parameters. Requiring all five to be
direct, current and person-linked would silently strengthen Fernando's gate.
The stronger standard remains necessary for a current individual binding
diagnosis and is not established. The broader Workstream B request for five
categories for *each* basket item also remains incomplete for the other three
pathways. These are distinct findings, not a blanket pass or failure.

## Reproduction and source-statistician lens

Node 22 `primary-care.mts --check` reproduced the committed measurement bytes.
The five primary-care tests passed, including body/header hash verification,
ambiguous-row rejection, suppression protection and historical staleness.
The retained CSV selects NSW 2024-25 GP cost delay 7.2%, published 95% CI
half-width 0.7 percentage points, from table 10A.26. This is source replay,
not independent authentication of the publisher or replication of its survey.
Reported intervals are not zero merely because some administrative series
have no interval. A directional point-estimate change is not automatically a
statistically established change; no difference test was independently run.

## Rural GP lens

The NSW health estimate is attached as state context to separate NERO SA4
occupation series. The code does not sum them, invent a remoteness crosswalk,
or link individuals. This is correctly limited. It cannot establish rural
access, appointment supply, employment loss or a work-to-health causal path.
GP FTE per resident population is not travel time or a bookable appointment.
The public opening correctly says it cannot answer access today. Keep that
scope when downstream communications extract a shorter result.

## Medicare and public-finance lens

Fully bulk-billed patients are patient-years with claimed GP attendances;
cost delay is a survey estimate among people needing care. Average specialist
gaps are patient-billed services. Those denominators cannot be subtracted,
ranked as competing barriers or combined into an overall access percentage.
Current prose states these differences. The basket nevertheless omits price
from `specialist-referral.missing_item_specific_categories`, although the
all-specialty gap does not measure a specific completed referral pathway's
price. Add price to that missing list or rename the list to avoid implying
item-specific completion.

## Disability and navigation lens

2018 adult national health-system navigation is broad historical context,
not current capability of a rural worker. Under-15s and people outside the
survey's dwelling scope remain excluded. The existing prose avoids assigning
a personal deficit. The next measurement must test accessible completion of
the actual task, with affected users, rather than treating information supply
as proof of capability. No user consultation occurred in this review.

## Person facing a money barrier lens

The 7.2% estimate is evidence that cost obstructed care for a surveyed subset,
not that money binds for the reader, nor that it dominates other conditions.
The binding diagnosis preserves null individual and dominant categories.
`five_categories_direct_current_gp_access_measures=false` is correct and
must survive any headline. Lower historical cost-delay estimates are useful
positive evidence without proving relief for everyone or sufficient access.

## Remaining contract-method concerns

The basket assigns non-percent numeric ranges 0..120 months or 0..10000
for FTE intensity and dollar gaps without a source or mathematical rationale.
These are coding bounds, not demonstrated feasible domains. Record their
status and justification or choose a defensible transformation retaining raw
values. Do not turn a convenient cap into an empirical claim.

Observation coverage 1/1 is explicitly one selected publisher cell, not survey
response or eligible-person coverage. That satisfies the existing extraction
contract mechanically, but a downstream reader may misread the minimum
coverage policy as population completeness. Preserve the unit and carry this
limitation with any evaluated result. This review found no current claim of
personal access being licensed by that field.

The basket builder chooses the first matching period in publisher order.
It currently selects 2024-25 as intended, verified by inspection. An explicit
period selector would make a future reordered CSV fail visibly rather than
silently choosing an older vintage. This is a robustness follow-up, not an
observed incorrect value in the reviewed snapshot.
