---
id: round-09.1-closure-follow-up
title: Round 09.1 non-blocking closure follow-up
type: internal-review
status: implementation-complete
author: Ren
provenance: commissioned-proposal
created: 2026-09-10
---

# Round 09.1 closure follow-up

**The six minor items in the [independent closure](https://github.com/ferborva/mind-flow/pull/16#issuecomment-5613734641)
are addressed without reopening the accepted candidate.** These changes are
after candidate `84456bb` and seal `58d73f7`. Their evidence is the current test
suite and GitHub CI, not the earlier 34-command frozen reproduction. No earlier
receipt is edited, replaced or made to claim coverage of these later changes.

| Minor item | Disposition |
|---|---|
| Two receipts share `freeze_id` | Preserve the input-set identity and both sealed byte sequences. Add the [attempt index](../meta/review-freeze/round-09.1.attempts.json) with distinct `network-blocked` and `network-authorised` execution identities, pinned manifest paths, outcomes, freeze hashes and complete-file hashes. Only the authorised attempt is selected as accepted. This is an additive index, not a retroactive schema change or authentication claim. |
| Accepted receipt pinned only by workflow text | Closure tests pin its exact `freeze_hash`, complete-file SHA-256 and candidate, alongside the failed receipt. Mutations of labels, paths, outcomes, hashes or the accepted attempt are rejected. The normal CLI verification remains unconditional in CI. |
| Browser control can silently miss changed CSS | Extract the control transformation into a tested helper. Both repair anchors must occur exactly once before either is changed; absent, reformatted or duplicate anchors fail with `LAYOUT_CONTROL_ANCHOR_MISMATCH`, before Chromium launches. The existing computed-style and scroll assertions remain. |
| Disclosure CLI absent as a direct CI step | Add one unconditional, argument-free step invoking `check-error-disclosure.mjs`. Tests reject omission, duplication, arguments, skips and failure tolerance. The command stays read-only; it appoints nobody and resolves or scores nothing. |
| WHEN `updated:` stale | Set `updated: 2026-09-10`, the date its ceiling was restored. Body bytes, original amendment logs and the honest 5.06% ratio remain unchanged. Add a regression for this recorded date. |
| Round 6 step label | Change this label to Round 06, consistent with its policy and receipt filename, and guard it with a test. No command or policy changes. |

## Verification boundary

The focused regression run first failed on the absent protections and stale
metadata. After repair, all 15 focused tests passed. The byte/hash assertions
are new coverage of existing receipts, not evidence of a newly discovered
receipt defect.

The browser runner passed with Chromium 149.0.7827.55 and Puppeteer 24.40.0,
at 1280x900 and 390x900, with all page network requests blocked. Its control
reproduced 15 sticky 9px body headers; the repair retained 15 static 12px
headers and 700px body movement for 700px scrolling in all three tables.
Repaired screenshots were inspected. The sandbox initially blocked Chromium
launch; the authorised local-only retry passed. Browser evidence remains
separate from the dependency-free CI contract.

The artifact parity check rejected the changed browser-tool fingerprints
before the lock was explicitly updated. Only Observatory `data.js` changes:
one existing tool digest, one added helper entry, and their validation-context
digest references. Measurements and all four generated HTML outputs are
unchanged. The full-suite and final CI outcomes belong to the closing PR
comment at the exact follow-up head, not the earlier seal.

The [handoff's programme gates](round-09.1-handoff.md#review-boundaries-that-remain)
remain as reviewed. Merge permission is repository integration only, not
publication, recruitment, warning, forecast adjudication or action authority.
