---
id: access-series-acquisition-gaps-2026-09-10
title: Access data exists, but not yet the linked measurement we need
type: research-note
status: review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# The gap is linked feasible access, not the absence of every proxy

Round 09's null binding diagnoses do not prove the required data cannot exist.
They mean the retained sources do not establish today's binding condition for
the named pathway and geography. The
[category-by-category record](../pilots/australia/data/primary-care-depth-2026-09-10.r2.json)
specifies the missing series. A further primary-source search on 2026-09-10
found these acquisition routes worth evaluating next.

## Directory coverage can improve proximity, within limits

Healthdirect's National Health Services Directory supports service locations,
opening hours, delivery modes, accessibility, eligibility and payment details.
Its provider guidance calls for review at least annually. A directory entry is
not proof of a currently available, eligible appointment or a medicine in stock.
[Provider guidance](https://about.healthdirect.gov.au/what-we-do/portfolio/nhsd/for-service-providers).

Bulk and read-only API access have an onboarding process involving a licence
agreement and cybersecurity checklist. No agreement was signed, access requested,
provider contacted or directory dataset acquired during this round.
[Integration requirements](https://about.healthdirect.gov.au/what-we-do/portfolio/nhsd/integration-hub/getting-started).

**Next acquisition proposal:** establish rights and access to a dated NSW service
directory extract. Define transport mode, time of day, service eligibility and
coverage before interpreting travel estimates. Then identify a separately
authorised source of actual accepted and failed service attempts. Directory
proximity alone cannot supply that second denominator.

## Dispensing data can deepen price, not identify failed fills

PBS publishes monthly and quarterly dispensing/payment summaries, including
prescription counts, patient contributions, costs, item codes and patient
categories. The page inspected lists data through June 2026 and warns of
revisions and incomplete recent periods. It offers substantially larger files
than the retained rule pages. Those files were not downloaded or inspected here,
so no claim is made about all their fields or geographic granularity.
[PBS date-of-supply and date-of-processing data](https://www.pbs.gov.au/statistics/dos-and-dop/dos-and-dop).

**Next acquisition proposal:** retain a bounded, licence-reviewed extract with
an exact drug/item mapping and vintage before claiming an observed patient price.
Completed dispensings still exclude prescriptions never filled. Today's binding
condition additionally needs failed attempts, affordability, eligibility, travel,
stock and usable-support measures for the same pathway and population.

These are live research pointers, not newly retained measurement inputs. Their
page bytes and directory datasets are not part of the replayable source bundle;
no numbers from them enter the pilot. Do not turn a search result into a measured
cell, or the absence of an acquired dataset into a claim of global nonexistence.
