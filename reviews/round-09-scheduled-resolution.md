---
id: round-09-scheduled-resolution
title: Planned October NERO follow-up outside the Round 09 freeze
type: statistical-protocol
status: blocked-scheduling-unavailable
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# 🕰️ Planned follow-up, NOT ACTIVE

**No automation was created. The scheduling gate is unmet.** The coordinator's
automation tool returned unavailable, and discovery found no replacement.
Proposed schedule: daily at **09:00 Australia/Sydney, 5 November to 7 December
2026 inclusive**, outside the Round 09 frozen artifact. This document is a
runbook, not proof of a running schedule. Record the real automation identifier
and activation receipt separately if scheduling becomes available.

Also plan a final check at **11:05 Australia/Sydney on 7 December**: the 09:00
daily run precedes the 11:00 local resolution close. This final check is also
NOT ACTIVE. Without it, the proposed daily schedule cannot assess the deadline
or release a post-close score on its final run.

The expected release is around 4 November, not a guaranteed publication date.
A 5 November first check can establish only first *retained* presence, not the
first public release. If an earlier archive was already retained, use that
existing hash and chronology. Do not replace it with a later revision.
The monitor should remain quiet on unchanged state and notify only on new
source bytes, a meaningful failure, completion or required human authority.

## 🔒 Two separate valid issues; one disclosed defective predecessor

| Campaign | Forecast ID | Native October cell | Threshold |
| --- | --- | --- | --- |
| round-08-nero | forecast.nero.5311.101.october-2026.v1 | 5311/101 Capital Region | 4,217 |
| round-09-nero-corrected | forecast.nero.5311.102.october-2026.correction-1.v1 | 5311/102 Central Coast | 3,092 |

The defective `forecast.nero.5311.102.october-2026.v1` remains blocked by its
[error notice](../forecasts/prospective-pilot/round-09-nero/error-notice.md).
Never run it as a third valid target, silently repair its issued text or exclude
it from programme history. A formal void requires separate authority.

No forecast, preregistration, sealed dependency, receipt, cohort or plan is
rewritten. Work on a new post-freeze branch. All files acquired or produced
below belong in a new retained follow-up directory, not a sealed campaign.

## 🛑 0. Review the defective predecessor explicitly

Before the first source acquisition and at the final post-close check, run:

```sh
node forecasts/prospective-pilot/round-09-nero/check-error-disclosure.mjs
```

This reads the separately versioned
[current admission plan](../forecasts/prospective-pilot/round-09-nero/current-admission-plan.json)
and its exact error-disclosure bytes. It prints a typed
`error-disclosed-admission-blocked` state, the unchanged registered cohort size,
null scores and the next action `independent-authority-and-policy-review`.
Retain that result separately alongside the two valid-target reports. A failed
check is a blocker, not permission to omit the predecessor. It does not replace
the original evaluation plan or silently transform issued/pending into void.

Request an independently evidenced appointment and a policy disposition for the
preparation error. A target contradiction is **not a registered void reason**.
An appointment alone therefore cannot authorise a retrospective new reason or
denominator exclusion. No appointment, identity verification or authorised policy
change is supplied here. Until that review occurs, retain the disclosed record
and withhold its score. At the December close, report the error and outstanding
authority decision explicitly, not merely `lifecycle_incomplete`, an ordinary
missing source, a hit or a miss. This step does not activate the unavailable
scheduler or authorise publication.

## 📥 1. Acquire before inspecting the outcome

Read the official JSA NERO page. Record the actual page response, headers and
observed UTC, then copy the actual official October download URL into
`NERO_SOURCE_URL`. Do not infer it from the synthetic test URL. The archive's
local basename must remain `2026-10_nero.zip`; it must be a complete archive,
not a filtered CSV or a recompressed subset. Retain HTTP headers, raw bytes,
URL, actual retrieval start/end and SHA-256 with the established source-capture
procedure. A changed same-month archive is a separate disclosed revision.

The original protocol's `source_chronology.events` is each campaign's immutable
prefix. At actual acquisition, append a presence event separately to each
campaign's prefix with `sourceChronologyEventSha256` exported from
`forecasts/prospective-pilot/validate.mjs`. Fields must be:

- `sequence`: previous count plus one; `source_id`: `source.jsa.nero`.
- `state`: `reported_present_checksum_only`; `observed_at`: actual retained
  presence time; `artifact_sha256`: exact complete archive SHA-256.
- `previous_event_sha256`: that campaign's existing last event digest.
- `verification_status`: `unverified_external_review_required`.
- `event_sha256`: computed by the existing function, not an invented digest.

Retain the exact event bytes, appended event array and tip context
`{event_count, tip_sha256}` separately **at acquisition, before resolution**.
Preserve any existing presence event and externally retained tip. Separate
local files alone do not authenticate a tip or appoint a witness. If the
required contemporaneous anchor cannot be supplied, stop admission and report
the gap. Never manufacture an earlier receipt after observing the value.

Publication must have its own retained timestamp evidence. HTTP retrieval time
does not establish publication. If publication UTC is unknown, record that
blocker; do not substitute local observation time. Required chronology is
publication >= 2026-11-01T00:00:00Z, publication <= first presence <= retrieval,
retrieval <= resolution <= **2026-12-07T00:00:00Z**. All claimed clocks must be
no later than actual current UTC. Missing source stays unresolved, never zero.

## 🔬 2. Mechanical evidence preparation, before adjudication

For each valid campaign, call its existing exported
`prepareNeroResolutionEvidence(input)` with `archivePath`, `archiveSource`,
`firstPresenceReceiptBytes`, `chronologyEvents`,
`expectedSourceChronologyTip`, `publishedAt` and `retrievedAt`.
This consumes the whole archive, verifies ZIP length/CRC, rejects malformed
dates or **any** post-October row, selects exactly the native target, and checks
archive SHA again. It returns the closed evidence payload with a receipt-bound
vintage. Do not add fields to the sealed payload.

The following command is read-only and prints evidence, not a resolved record.
Set `NERO_CAMPAIGN` to one of the two valid campaign directory names and set
the required path/time variables to actual retained files and clocks. Repeat with
the other campaign's own receipt and chronology. No values are supplied here.

```sh
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { assertOperationalClock } from "./forecasts/prospective-pilot/operational-clock.mjs";
const e=process.env;
const allowed=["round-08-nero","round-09-nero-corrected"];
if(!allowed.includes(e.NERO_CAMPAIGN)) throw new Error("valid campaign required");
for(const k of ["NERO_ARCHIVE","NERO_SOURCE_URL","NERO_PRESENCE","NERO_CHRONOLOGY","NERO_TIP","NERO_PUBLISHED_AT","NERO_RETRIEVED_AT"]) if(!e[k]) throw new Error("missing "+k);
const json=p=>JSON.parse(readFileSync(p,"utf8"));
assertOperationalClock({publishedAt:e.NERO_PUBLISHED_AT,retrievedAt:e.NERO_RETRIEVED_AT,firstPresenceObservedAt:json(e.NERO_PRESENCE).observed_at});
const {prepareNeroResolutionEvidence}=await import("./forecasts/prospective-pilot/"+e.NERO_CAMPAIGN+"/resolution-intake.mjs");
const evidence=await prepareNeroResolutionEvidence({archivePath:e.NERO_ARCHIVE,archiveSource:e.NERO_SOURCE_URL,firstPresenceReceiptBytes:readFileSync(e.NERO_PRESENCE),chronologyEvents:json(e.NERO_CHRONOLOGY),expectedSourceChronologyTip:json(e.NERO_TIP),publishedAt:e.NERO_PUBLISHED_AT,retrievedAt:e.NERO_RETRIEVED_AT});
process.stdout.write(JSON.stringify(evidence,null,2)+"\n");
'
```

Run Node 22 from the repo root with hydrated retained files and dependencies.
For this workstation, `node` is `/opt/homebrew/opt/node@22/bin/node`.
Pure helpers permit historical replay; the operational clock call above and
the final CLI enforce actual-time bounds. Successful preparation proves local
byte/selector consistency, not authenticated publisher identity or global
first publication.

## 🧑‍⚖️ 3. Authorised append and exact current-intake commands

An actual authorised resolver must approve a separate resolved record, preserve
the issued projection, retain the reconstructed evidence, and append the real
resolution UTC and actual actor identity to history. The native binary resolver
determines the outcome; a person must not select a favourable outcome or source.
No actor name, appointment or authorisation is supplied by this runbook. If that
authority has not been established, stop at mechanical evidence and request it.

Set `NERO_FIRST_RESOLVED` and `NERO_CORRECTED_RESOLVED` to the separately
approved records. Set `NERO_FIRST_PRESENCE`, `NERO_FIRST_CHRONOLOGY`,
`NERO_FIRST_TIP` and the three `NERO_CORRECTED_*` counterparts to each campaign's
own contemporaneous files. `NERO_ARCHIVE`, `NERO_SOURCE_URL`,
`NERO_PUBLISHED_AT`, `NERO_RETRIEVED_AT` refer to the shared actual archive
acquisition. `NERO_AS_OF` is actual evaluation UTC, never a future test date.

```sh
node forecasts/prospective-pilot/round-08-nero/check-resolution.mjs \
  --forecast "${NERO_FIRST_RESOLVED:?approved separate record required}" \
  --archive "${NERO_ARCHIVE:?native complete archive required}" \
  --first-presence "${NERO_FIRST_PRESENCE:?exact receipt required}" \
  --chronology "${NERO_FIRST_CHRONOLOGY:?appended chronology required}" \
  --chronology-tip "${NERO_FIRST_TIP:?contemporaneous anchor required}" \
  --source "${NERO_SOURCE_URL:?actual official URL required}" \
  --published-at "${NERO_PUBLISHED_AT:?retained publication claim required}" \
  --retrieved-at "${NERO_RETRIEVED_AT:?actual retrieval required}" \
  --as-of "${NERO_AS_OF:?actual current UTC required}" \
  --plan forecasts/prospective-pilot/round-08-nero/evaluation-plan.json
```

```sh
node forecasts/prospective-pilot/round-09-nero-corrected/check-resolution.mjs \
  --forecast "${NERO_CORRECTED_RESOLVED:?approved separate record required}" \
  --archive "${NERO_ARCHIVE:?native complete archive required}" \
  --first-presence "${NERO_CORRECTED_PRESENCE:?exact receipt required}" \
  --chronology "${NERO_CORRECTED_CHRONOLOGY:?appended chronology required}" \
  --chronology-tip "${NERO_CORRECTED_TIP:?contemporaneous anchor required}" \
  --source "${NERO_SOURCE_URL:?actual official URL required}" \
  --published-at "${NERO_PUBLISHED_AT:?retained publication claim required}" \
  --retrieved-at "${NERO_RETRIEVED_AT:?actual retrieval required}" \
  --as-of "${NERO_AS_OF:?actual current UTC required}" \
  --plan forecasts/prospective-pilot/round-09-nero-corrected/evaluation-plan.json
```

These are read-only CLI checks. Each pins its own registered plan checksum and
reruns admission; a persisted `admitted:true` cannot replace process-local checks.
Do not publish a returned score early: the preregistered protocol says scoring
after resolution close. Preserve resolved-at within the window, then evaluate
and review at or after 2026-12-07T00:00:00Z before public publication under the
user's authority. A CLI producing arithmetic is not publication authorisation.

Voids and exclusions are a different authority path. Current intake reports
`appointment_verified:false` and `identity_authenticated:false`; string
distinctness does not appoint an adjudicator. Any void needing exclusion remains
subject to independently evidenced appointment and review. Do not invent an
independent actor, edit those flags, silently remove the defective predecessor,
or call a missing source a miss. If late or unresolved, retain the denominator
and report overdue/missing evidence. Publish a real miss honestly if resolution
and release gates are met; do not claim calibration from these correlated pilots.
