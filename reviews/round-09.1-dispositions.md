---
id: round-09.1-dispositions
title: Round 09.1 independent-review repairs and remaining gates
type: internal-review
status: ready-for-independent-review
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# Round 09.1: repair the mechanisms, preserve the evidence

**The review repairs stay on PR #16; main stays unchanged.** The review of
candidate `32b0cce` and seal `1bdf6e5`, supplied on 2026-09-10, is the input to
this register. Fernando approved this repair pass with “proceed”, after a plan
that explicitly kept main unchanged until review. This is Ren's disposition,
not independent approval or a claim that every programme gate is met.

Source review comments: [verdict](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106001),
[country measurement](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106168),
[forecast](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106336),
[pilot and evolution](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106515),
[provenance](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106681),
[integrity](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5612106887).

## Every finding, including corrections to the review

| ID / priority | Finding | Disposition and verification |
| --- | --- | --- |
| UI-1 / P1 | Body `th` inherits sticky header styling | **Repaired.** `thead th` owns the sticky styling; body headers inherit body typography. Fail-first CSS regression plus live Chromium at 1280px and 390px, described below. Row semantics remain intact. |
| MEAS-1 / P2 | ILO M/I flags labelled without a retained legend | **Repaired by narrowing the claim.** Native flags remain unchanged and explicitly uninterpreted; typed interpretation marker and null legend. Publisher-modelled provenance is separate. `observation-flags.test.mjs` rejects the unsupported interpretation. No new code-list evidence is claimed. |
| CI-1 / P2, duplicate in tracks 6 and 8 | Six country producers not replayed in CI | **Repaired once.** Exact unconditional six-command block in Integrity, with mutation tests for omission, skipped steps, missing `--check` and tolerated failures. Retained-source reader parity is also tested, not merely structure. |
| FC-1 / P2 | Defective forecast has no typed lifecycle marker | **Repaired without rewriting the issue.** Hash-bound current-admission plan and error-disclosure sidecar identify the contradiction, block admission and expose the required authority/policy decision. Missing/substituted records fail closed. Issued/pending history and one-record denominator remain; no formal void is invented. |
| GOV-1 / P2 | Author casing enforced only in drafts | **Repaired within explicit active scope.** Drafts, posts, books, governance and root boundaries enforce `Ren`, including future files there. Three current fields corrected. Historical/imported/sealed materials excluded explicitly; other programme roots are not globally certified by this rule. |
| PROV-1 / P2 | Forwarded brief presented as Fernando's image instruction | **Repaired.** Seed/register say Ren's reading, permitted by the forwarded brief. His observation/remedy distinction remains captured. Observation versus imperative remains his decision; draft image unchanged. |
| EDIT-1 / P2 | WHEN ceiling deleted | **Restored.** “It is not a date, forecast, guarantee or commitment.” Forward endpoint-pinned amendment preserves the old deletion log. Current ratio is 4/79 = 5.06%, explicitly **unmet**, not padded into a pass. |
| CAP-1 / P2 | Ren analysis in raw storm capture | **Repaired.** Six analytical bullets moved to labelled backlog analysis. Actual quoted questions/answers preserved; capture remains raw and the dependant question unanswered. |
| CAP-2 / P2 | Extracted money capture still raw | **Repaired forward-only.** Current status is processed; all other bytes unchanged. Historical capture commit and old amendment retained. It will already be accurate if this branch later merges. |
| REPO-1 / P2 | IMF workbook is a 5.6 MB plain blob | **Current tree moved to LFS, history retained.** Exact object hash/size unchanged. Old plain blob remains reachable in provenance commits; history weight is not claimed solved. No force push or migration that rewrites sealed commits. |
| IF-1 / required decision | Construct correction blocked by team-owned schema gap | **Policy chosen, migration unfinished.** Construct corrections require new identities. Existing sealed evaluator is unchanged. Explicit relationship, reader inventory and adoption remain future engineering, not an external blocker. No new events claimed; one of three remains. |
| MEAS-2 / P3 | IMF licence assessment conflicts with acquisition status | **Current assessment derived from pinned review.** Current country frame names the existing review's status and its hash; historical capture status remains acquisition-time evidence. The retained review is agent analysis, not retained licence text or legal clearance. |
| MEAS-3 / P3 | “50 measured economies” hides incomplete rows | **Repaired, review arithmetic corrected.** Reader derives **50 economies, 47 with all three series**, not 46. Missing CPI: USA/TWN/ARG; missing electricity: TWN; missing ILO: none. Union of affected economies is three, not four. No filling. |
| MEAS-4 / P3 | Mixed reference years | **Made explicit.** Each series retains its year; reader forbids single-period cross-series inference. WBL remains research-only with its own 2025-10-01 law reference date. |
| FC-2 / P3 | Contradiction test uses rebuilt candidate only | **Repaired.** Direct retained-issued/protocol/parameter bytes now exercise target consistency. Original dependency tests remain byte-identical. |
| FC-3 / P3 | Spacing corruption in request/provider comment | **Disclosed in current issuance note.** `identify102` and `Laplace19/25` remain in immutable request/receipt bytes; nothing silently re-posted or edited. |
| FC-4 / P3 | Old adapter still returns binding complete | **Deprecated for current admission in active notice.** Import-graph regression forbids old adapter transitively from current resolution entry points. Historical adapter/result remains reproducible and does not certify target consistency. |
| MEAS-5 / P3 | Small-cell flag covers only retained FTE numerators | **Accepted limitation.** Survey numerators remain unknown and visibly disclosed. No claim that absence of a flag proves a large survey sample. No new measurements fabricated. |
| CAP-3 / P3 | Main-unchanged policy lacked a capture citation | **Repaired.** Separate capture preserves the exact user instruction and context; backlog cites it. Transcription date is not an invented response timestamp. |
| CAP-4 / P3 | Storm capture introduced only in seal merge | **Historical fact retained.** Later capture/analysis separation and new integration capture land as an ordinary authored repair commit. Neither parent nor seal is rewritten. |
| EDIT-2 / P3 | Country reader absent from disclaimer inventory | **Repaired.** Current inventory gives explicit units/classifications: 18/390 = 4.62% for broad non-templated limits; 118/390 = 30.26% including all country binding assessments. Unknown measurements remain substantive results, not removable boilerplate. |
| FREEZE-1 / P3 | Handoff omits pre-steer receipt | **Repaired.** Historical cover note now names target `5fcb461` and full `ac47bf...` receipt hash, exact policy alias and version. |
| FREEZE-2 / P3 | Shared Round 09 historical policy/freeze IDs | **Historical naming retained; new repair identity distinct.** Round 09.1 has its own policy/freeze ID. Historical version/checksum/target distinctions and cross-policy rejection remain. Round 08.1 is not retroactively renamed. |
| FREEZE-3 / P3 | Coherently rehashed receipts can be forged | **Deferred unchanged to 2026-09-16.** Hash consistency is not creator authentication. Independent rerun or signed attestation remains necessary. New receipt does not claim to close this trust boundary. |
| TEST-1 / observation | Seal has 1,023 tests, candidate 1,021 | **Accepted historical counts.** New results belong to their own commit and receipt, not those old candidates. Reader source-to-output test is now stronger. |

The [editorial register](round-09.1-editorial-repairs.md) contains reversible
amendments and exact disclaimer counting. The [forecast register](round-09.1-forecast-repairs.md)
contains lifecycle boundary tests and unresolved adjudication policy. The
[construct-correction policy](../contracts/executable-if/construct-correction-policy.md)
records the engineering decision and its limits.

## Browser reproduction and visual check

The browser connector exposed no surfaces. A separately launched local Chromium
test browser was available after sandbox approval. The optional
[`check-primary-care-layout.mjs`](../dashboard/tools/check-primary-care-layout.mjs)
runner used Puppeteer **24.40.0**, Chromium **149.0.7827.55**, Node **22.23.2** and
viewports **1280x900** and **390x900**. Page network requests were blocked.
All three primary-care tables were actually scrolled by 700 pixels.

| Property | Regression control (original CSS reconstructed over same HTML) | Repaired CSS |
| --- | --- | --- |
| Body row headers | 15 sticky, 9px text | 15 static, 12px matching adjacent cells |
| First row movement relative to container at 1280px | 38.5px despite 700px scroll | 700px in each of three tables |
| First row movement at 390px | 38.5 / 58.5 / 48.5px | 700px in each table |
| Column headers | Sticky | Still sticky |

Root inspected before/after desktop screenshots and the repaired phone screenshot.
The condition column header remains visible and body labels no longer paint
over it. The existing narrow-screen horizontal table scroll remains; this is a
targeted regression repair, not a redesign or accessibility certification.
The browser check is separate local evidence, not a claim that CI or the detached
freeze ran a browser. Reproduce after building the pilot by passing an installed
Puppeteer module entry, Chromium executable and temporary screenshot directory:

```sh
node dashboard/tools/check-primary-care-layout.mjs \
  /absolute/path/to/puppeteer/lib/esm/puppeteer/puppeteer.js \
  /absolute/path/to/chromium /absolute/path/to/temporary-screenshots
```

## Independent agent checks and preserved evidence

Each implementation lane added failing tests before mechanism edits. Root's
initial CSS/CI tests produced three expected failures; its LFS/policy checks
produced two, and the new freeze-identity check failed before that policy existed.
Detailed editorial and forecast red-to-green evidence is in their registers.

The country lane verified all 146 core observations and histories equal the
previous seal, and all 74 country source files retain their content bytes. The
IMF Git representation changes to an LFS pointer only after that byte check.
All six country producer replays passed. The full native RAI replay also passed
using the already documented separate legacy XLS reader, not a new dependency.

A different agent reviewed the forecast mechanism and verified 29 distinct
sealed records/dependencies unchanged; 43 focused forecast/CSS/CI tests passed.
Another reviewed the editorial lane, checked all five historical JSON amendment
blocks and quoted captures byte-for-byte, and ran 73 communications tests. A
third challenged the IF policy wording: basket files do reference urgent GP's
definition and hash, even though no positive-signal measurement consumes it.
That narrower claim is now documented and tested. Independent agent checks are
not publisher authentication or affected-party review.

## Gates that remain open

- **One real evolution event, not three.** The new-identity policy is decided;
  the versioned construct relationship and actual consumer migration are not.
- **Current binding remains unknown**, with five named category gaps. Country
  movement ranks are investigation proposals, not storm probabilities.
- **October is not resolved and scheduling is NOT ACTIVE.** Runbook and typed
  error disclosure are available; appointment/policy decisions are outstanding.
- **WHEN's disclaimer ratio is 5.06%.** The restored claim ceiling stays.
- **Broad proximity measurement remains absent.** The sparse RAI candidate is
  research-only. Current licence assessment does not create legal clearance.
- **Historical identity, history weight and receipt authentication residuals**
  remain as described above; moving one current binary to LFS does not erase
  old reachable blobs or re-attest old receipts.
- **Fernando's choices remain open:** affected-person/dependant counting,
  observation versus imperative, ranking and major-shift list, and operational
  severity/horizon details of the storm definition. Income-generation access
  remains his focus, not a substituted unemployment-only definition.

## Candidate and seal procedure

The integrated working tree passed **1,053 tests across all 18 suites**, zero
failures, cancellations or skips, on Node 22.23.2. All six retained normal
receipt verifications passed and their bytes match seal `1bdf6e5`. Root reviewed
the regenerated lock: only Australia pilot HTML (the scoped CSS repair) and
Observatory data (changed validation-context inputs) have new output hashes;
the global page and both comparison HTML outputs are byte-identical. The lock
was updated explicitly after that comparison, not auto-blessed by `--check`.

Commit the reviewed repairs, regenerated artifact lock and this disposition
first. Select that exact commit as the new candidate, then create
`meta/review-freeze/round-09.1.review-freeze.json` using `--policy=round-09.1 --run`.
Never use `--force` over the older receipt. Its full tree, all inherited replay
commands and the new repairs are bound by the new policy. Only the later seal
may add its receipt, an unconditional CI verification step/test, and exact
handoff results. Check those outside-candidate files separately.
Push to the existing `ren/round-09` branch and PR #16, then verify CI and main's
unchanged SHA. This pass does not authorise merging or opening another PR.
