---
id: round-11-weather-station
title: Weather Station research interface
type: technical-proposal
status: research-prototype
provenance: agent-proposal
author: Ren
created: 2026-09-11
---

# A clearer route from evidence to the next useful question

The Round 11 station joins retained income indicators with their limits,
source lineage, IF-meaning review, issued research forecasts and preparation
options. It is not a crisis-warning service. The old synthetic Observatory
remains a separately labelled method demonstration.

## Run locally

Use Node.js 22 from the repository root:

```sh
npm ci
npm run build:artifacts
npm run test:station
npm run test:station:browser
```

The browser check uses an isolated temporary profile and a loopback-only server.
Set `CHROME_BIN` to an installed Chrome/Chromium binary when not using the default
macOS installation. It retains screenshots in the temporary directory printed
at completion, closes its own browser and does not collect participant data.
It verifies software behaviour, not human comprehension or accessibility
certification. It also checks the linked rehearsal pages against the retained
task pack in the browser: exact visible facts/options, keyboard disclosures,
320 CSS-pixel reflow, enlarged body text and selected accessibility-tree names.
This is not screen-reader user testing, browser-zoom certification or a test of
unaided comprehension. The original rehearsal answers remain exposed for review.
The new static reasoning-slice pages are checked separately for exact rendered
material/tasks, absent embedded feedback, narrow stacked release rows, selected
accessibility-tree labels/table roles and keyboard return navigation. This is a
limited presentation comparison, not a test of full-station usefulness.
Browser startup has a 45-second bound and the whole harness a 120-second guard;
early exits and full captured diagnostics are reported without automatic retries.
Serve the repository root with a local static server that sends
`.mjs` as JavaScript, then open `/dashboard/station/`. Do not open as `file://`.

`data.js` is generated and ignored. Canonical artifact reproduction includes
its digest in `meta/build-artifacts.lock.json`; a change requires explicit
review and lock regeneration. The projection replays retained income and
storm records, correction summaries and the decision task pack before display.
It hashes the captured bytes used by the projection, not a second reading.
Hashes establish local integrity, not publisher identity or independent trust.

## Demo route

1. Enter the station and compare two economies through 2005–2025.
2. Take the four-stop evidence tour. Peru shows a large native movement;
   Ireland shows why different denominators cannot be added; Kazakhstan asks
   whether apparent improvement survives comparability review; Argentina
   keeps a missing national observation visible.
3. Open source detail for native definitions, publisher status and method,
   vintage, acquisition date, selectors, exact bytes and limitations.
4. Follow the five IF categories to a concrete source-meaning correction.
   Distinguish proposed corrections, reader adoption and kernel completion.
5. Inspect the exact event behind an issued probability, its comparator,
   timing and preserved defective predecessor. No probability is a storm risk.
6. Review a conditional next inquiry and the static reasoning slice. Compare
   it with the conventional release; reviewer answers are separate. The earlier
   non-recording rehearsals remain linked from the study README. Download a local
   research brief if useful.

Selectors and year controls work with native keyboard interaction. The
50-economy field supports arrow keys, Home/End and Enter, preserving focus after
selection. Invalid bookmarked scope fails visibly without substitution.
The chart uses a fitted y-axis, explicitly labelled; no confidence intervals
are invented. All years come from one retained vintage, not a reconstruction
of what an observer knew in those historical years.

## What remains unproved

The 3,129 native observations do not count disrupted income routes. None of
the 1,000 country-period storm assessments has the measurements needed for a
verdict. This is not an all-clear. Positive native movements are investigable,
not proof of increased agency. The station does not measure the full abundance
and agency thesis yet.

The feasibility shortlist admits zero new income-access measurements. The
study has not recruited or tested people; the candidate interface must still
earn its place against a simpler presentation. Human appointments, consent,
statistical review, accessibility review, consequential action and public
release remain separate gates. No tracking, analytics, personal-data form or
external submission is implemented here.
