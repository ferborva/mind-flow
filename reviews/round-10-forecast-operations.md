---
id: round-10-forecast-operations
title: October evidence intake and forecast authority boundaries
type: internal-review
status: implementation-awaiting-default-branch-activation
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
---

# 🦅 TL;DR

**The workflow collects evidence and proposes a PR; it never resolves or scores.**
It is NOT ACTIVE while confined to the Round 10 branch. Default branch remains
`main`; integration there requires the authorised review path. No live scheduler
activation or October observation is claimed by fixture tests.

## 📥 One observed listing, exact evidence

The [official NERO landing page](https://www.jobsandskills.gov.au/data/nero),
checked 2026-09-10, contains the archive listing in its Downloads section.
It currently names the complete August archive (48,613,300 bytes) and expects
October data on 4 November. No separate NERO archive index was evidenced.
The collector retains the page once as both landing and listing evidence;
it does not invent an archive endpoint or follow the generic site archive menu.

`collector.mjs` reads quoted anchor URLs as inert data. Only the official HTTPS
origin and native complete October filename in the publisher's dated file path
are accepted. Regional-subset downloads cannot substitute. Redirects, ambiguous
October URLs, bad HTTP status, partial failures and oversized responses fail
closed. Caps are 4 MiB for the page and 90 MiB for the archive, below GitHub's
single-file limit; exceeding either requires a reviewed collection change.
Each fetch has a 120-second timeout. Files are create-only, and failures preserve
headers, partial bytes and failure metadata. Workflow artifacts retain attempts
for 90 days; they are temporary evidence and must be downloaded if longer
retention is needed. Successful first-presence bytes persist in the evidence PR.

**First retained presence is not first publication.** Body hashes cover fetched
content after HTTP content decoding. Header hashes cover explicitly labelled
serialised Fetch headers, not wire-exact HTTP headers. Each valid campaign gets
its own appended chronology and tip through the existing event hash function.
The machine does not inspect target values. Publication time remains null until
separately evidenced; local chronology and a provider-hosted commit still do not
independently authenticate publisher identity or global first publication.

## 🕰️ Schedule and retries

The cron runs at 04:17 UTC in November and December. An actual UTC guard admits
only 2026-11-01 inclusive through 2026-12-07 exclusive. Cron has no year field;
future years perform no collection. Manual dispatch uses the same guard.
Schedules may be delayed or dropped and public inactive repositories may have
schedules disabled after 60 days. This is best-effort watching, not guaranteed
publication-day acquisition. An operator reviews gaps and the December close.

The deterministic `ren/nero-october-2026-evidence` ref preserves the first
successful proposal even before merge. Matching archive bytes do not rewrite
its timestamps; changed bytes fail for human revision review and remain in the
attempt artifact. A retry after ref creation can create the missing PR without
rewriting evidence. The publisher's explicit file allowlist cannot add a
resolution, score or campaign edit. No source text becomes a shell command.

The acquisition and fixture job has read-only repository permission. A separate
publisher job downloads that run's artifact and has only repository contents and
pull-request write scopes. Both require the commissioned repository and default
branch. Credentials are not persisted by checkout; the token is passed only to
the publisher. No PAT or external service credential is introduced.
Repository Actions PR-creation permissions could not be inspected: the read-only
API returned 403 on 2026-09-10. This remains an activation check, not a reason
to assume permission or change repository settings.

Current [GitHub token documentation](https://docs.github.com/en/actions/concepts/security/github_token)
says token-created PR opened/synchronize/reopened checks require a maintainer's
approval. Approve those checks before merge. Token pushes do not trigger normal
push CI. Fixture checks run before collection; this does not substitute for
reviewing the actual evidence PR. See [schedule semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

## ⚖️ Human decisions remain separate

Use the existing [human runbook](round-09-scheduled-resolution.md) against the
retained PR. Preserve its publication-clock, contemporaneous anchor, resolver
authority and December scoring-close requirements. The two valid campaign
intakes remain byte-frozen. The defective predecessor remains disclosed and
blocked; the [appointment proposal](../governance/round-10-adjudicator-appointment.md)
does not grant a new void reason or remove its denominator entry.

## 🌍 Third forecast checkpoint

**No third forecast is issued here.** A potential target is a single
non-Australian country's 2026 unemployment-rate estimate as published in the
October 2026 IMF WEO, compared with the retained April estimate. That would
forecast a publisher's estimate, not observed job loss or a storm.

The [IMF FAQ](https://www.imf.org/en/publications/weo/frequently-asked-questions)
states that WEO databases normally release in April and October, and that exact
release announcements come from IMF Communications. The official annual-meeting
calendar gives 12-18 October 2026. Neither establishes an exact October WEO
release date. A release-calendar view did not supply that missing announcement.
Do not turn the usual Tuesday pattern into a fabricated publication clock.

Before preregistration, Workstream B must accept the series/condition binding;
retain an official future release announcement, exact country/cell and baseline
bytes; fix a resolution close under 120 days; then review target semantics,
source-absence checkpoint, baseline method and sealed issuance plan with the
coordinator. Without these, the third-forecast gate stays unmet. No probability,
receipt, issue time or future publication observation is invented.

## ✅ Next checks

The publisher independently validates every retained body/header receipt, HTTP
status, actual clock, source link, first-presence event, immutable campaign
prefix and chronology tip before any write. It rejects foreign entries,
symlinks, oversized evidence and HTML masquerading as ZIP. The ZIP signature
check is only a transport guard, not a target or full archive-content check.
On retry it verifies the existing branch's complete evidence-only diff and
replays the same checks against its original bytes. A closed PR is not reopened.

The native archive uses its exact explicit LFS attribute. Publishing runs
`git lfs clean`, uploads the content-addressed object, downloads it into a fresh
LFS cache and compares the complete bytes before creating its Git pointer.
No plaintext ZIP blob is committed. Failure preserves the acquisition artifact
and stops before evidence-ref creation. **This upload path has fixture coverage,
not a claimed live October upload.** Its first real upload/download verification
and repository LFS permission remain deployment checks. Temporary verification
caches are not erased by the publisher.

Run the new collector fixture suite on Node 22, review the default-branch
activation and repository PR permission, and retain the first real workflow
run identity only when it exists. Fernando still decides the adjudicator
appointment. The October observation and first score remain future work.
