---
id: round-08-1-dispositions
title: Round 08.1 review dispositions
type: review-register
status: ready-for-refreeze
provenance: commissioned-proposal
author: ren
created: 2026-09-10
updated: 2026-09-10
---

# Repair the reviewed mechanisms, preserve their history

**Every finding in the six PR15 review comments is accounted for below.** This
is a focused repair on `ren/round-08`, not a new measurement round, new PR or
approval of the programme. The reviewed candidate was
`f7d988ce4244d7553cc1f405a1483e01c63f1f07`; its seal was
`b82580923c4f3f27fd4b49a044a34313216f4906`. Both remain in history. The original
freeze, issue record, sealed dependencies and historical measurement artifacts
are preserved. A new receipt will identify the exact repaired candidate.

The [coordinator verdict](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609403803)
is accepted: repair the five P1 mechanisms and resolution intake, test their
failure modes, then re-freeze. Passing tests does not close the empirical,
institutional, human-review or communication gates.

## Measurement and public surface

Source: [Track 8 review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404043).
Implementation: `e2fe8b7`, `856cf9a`; detailed evidence in the
[source correction](../research/2026-09-10-primary-care-review-correction.md).

| ID | Finding | Disposition |
| --- | --- | --- |
| M1 P1 | GP measurement invisible | Accepted. The existing pilot renders all five category rows, values, dates, distinct populations, owner roles and source links. Binding remains unknown. Tests inspect generated HTML, not only data existence. |
| M2 P1 | FTE rates called recomputable | Accepted. Published rate extraction is reproducible; rate recomputation from retained bytes is explicitly false without ERP denominators. ASGS is not MMM or SA4. |
| M3 P2 | Missing workbook definitions | Accepted. Exact 10A workbook and paired headers retained via LFS and hashes. Native extraction corroborates cells and exposes source footnotes. |
| M4 P2 | Stale ecological join | Accepted. Current correction names r2 and its unverified source/classification status. The old record is not silently rewritten. |
| M5 P2 | Source licensing unspecified | Accepted as an explicit gap: per-source claim is null and review status unreviewed. Official hosting does not establish reuse terms. |
| M6 P2 | Context sources counted as measurements | Accepted. MBS referrals and AIHW medicines are labelled contextual and non-derived. Four measured replacements do not become eight measurements because eight placeholders were deleted. |
| M7 P3 | Selected positive window | Accepted. Longer retained windows and survey exclusions accompany the favourable examples; no significance, causal effect or verified owner control is claimed. |
| M8 P3 | Proxy and rule clocks | Accepted. Rule date is retrieval, not effective date; capability is 2018 national context, not current rural-worker access. |
| M9 P3 | Stale basket link | Accepted. README identifies r3 and the separate current correction. |

The footnoted workbook reveals a substantive representativeness problem:
very-remote survey collection was phased out in 2023–24 and excluded in
2024–25. That is not repaired by copying the same numbers into a newer file.

## Forecast and adjudication intake

Source: [Track 3 review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404292).
Implementation: `1e805c4`, `596bc3a`, `db7abe1`; exact boundaries in the
[intake review](round-08-1-forecast-intake.md).

| ID | Finding | Disposition |
| --- | --- | --- |
| C1 P2 | First retained release only procedural | Accepted. Current evaluation requires full-stream archive admission, no post-October rows, native filename, exact first-presence receipt/hash and separately supplied retained chronology tip. Same-month substitutions fail the retained hash. This proves consistency with the anchored local first entry, not global first publication. |
| C2 P2 | String variants pass as separate adjudicators | Accepted. Current rejection checks cover punctuation, spacing and embedded issuer/author skeletons. Distinct strings still do not prove appointment; any otherwise eligible void cohort withholds performance because appointment is unverified. |
| C3 P3 | Immutable means comparative | Accepted. Original issued SHA, registered plan and history are the comparison references. Coherent standalone hashes are not self-authentication. |
| C4 P3 | Post-publication policy outside record | Accepted. Documentation identifies the registered plan/evaluator guard. The immutable issue record is not edited to imply that it alone enforces performance eligibility. |
| C5 P3 | Receipt is self-posted | Accepted. GitHub supplies a recorded time, not an independent registrar or appointment. This limit remains explicit. |

The low-level sealed resolver remains a compatibility primitive. The approved
current workflow is the read-only `check-resolution.mjs` intake. No October
outcome, appointed adjudicator, external witness or future observation has been
invented. The probability, target, close date and cohort remain unchanged.

## Method and condition evolution

Source: [Track 2 review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404573).
Implementation: `625e6b9`, `6d2ddfb`, `5489606`; see the
[threshold audit](round-08-1-threshold-domain-audit.md).

| ID | Finding | Disposition |
| --- | --- | --- |
| A1 P1 | Construction replay presented as evolution | Accepted. Keep the exact persisted kernel and its eleven earlier events. Append one actual evidence-policy revision after reviewing new workbook bytes. The already-existing positive consumer validates before, fails against the revised definition, and validates only after explicit rebinding. The original claim of three real operational evolutions remains unmet. |
| A2 P2 | Declared domains hide implausible thresholds | Accepted. Separate audit binds source hashes and field pointers, flags impossible negative cardinal counts, and distinguishes formal vacuity from source-envelope plausibility. Missing non-intrinsic domain provenance remains unassessed. Reject only the description of `count <= 1e9` as mathematically vacuous on an unbounded domain; it is a contextual plausibility flag, not a constant predicate. |
| A3 P2 | Four panel additions lack justification | Accepted. Each addition has an explicit relationship to agency and evidence limits in programme, disposition and producer records. |
| A4 P3 | Retired phases remain live questions | Accepted. Backlog treats them as retired, not a request to revive the dated ladder. |
| A5 P3 | Schema-only discretion gap | Accepted. Current in-memory profile restricts discretion to availability within the existing schema family. Original sealed schema bytes remain unchanged; legacy schema-only readers must adopt the profile or full semantic validator. |

### What the actual event does, and does not do

`primary-care.kernel.current.json` preserves the original kernel ID, eleven
event bytes and evidence history. Event 12 changes GP-cost definition 1.2.0 to
1.3.0, requiring two distinct retained numeric artifacts before assessment.
The CSV and footnoted workbook are same-publisher corroboration, not independent
sources. The reason and actual append clock are persisted once. `--check`
replays that exact append without renewing its clock or reconstructing history.

The existing positive-signal consumer's values remain unchanged. Its current
rebinding and external evolution projection reference the new definition and
kernel hash. They establish no current condition truth, access, agency gain or
common-population improvement. The broader kernel population remains
unestablished; the existing contract cannot express retirement or infer that a
renamed population label is a subset. This repair does not silently expand that
sealed contract. The new evidence rule is a research policy choice, not a fact
deduced from a workbook footnote.

The historical GP observation was already stale under r3, with zero eligible
observations. The event therefore does not turn an empirically established
historical result into an unknown one. A separate synthetic test isolates the
policy change using one fresh artifact: minimum one permits assessment, while
minimum two withholds it. Those test observations are not added to the records.
The rule counts distinct artifact hashes; it does not inspect whether a file
contains the right footnotes or require a particular format. CSV plus workbook
is the intended reviewed corroboration, not a semantic guarantee supplied by
the count alone. No newly eligible current evidence is admitted in this repair.

The current consumer check invokes the separate threshold audit. Nine active
predicates remain contextually flagged: eight out-of-envelope flags and four
unassessed domain-provenance entries. It deliberately uses hash-bound historical
9 September values, not the later correction as new eligible observations.
Process success does not mean empirical plausibility has passed.

## Editorial and provenance

Source: [editorial review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609404801).
Implementation: `5489606`, `c54cc62`, `fdaddfe`, `fb64d89`, `dabf49d`.

| ID | Finding | Disposition |
| --- | --- | --- |
| E1 P1 | Abundance essay overflattened | Accepted. Restore capture-backed illustrations, concrete access distinctions, humanity framing, finite-vintage example and clearly labelled distribution figures. Reject restoring the older company-remedy/naughty-child conclusion as current stance: the 9 September capture explicitly softens the remedy and leaves its diagnosis unsettled. The newer capture takes precedence. |
| E2 P2 | Disclaimer count omits surfaces | Accepted. Existing inventory now covers dashboard README, template and actual GP renderer. Rendered GP lower-bound count is 7 of 62 narrative units (11.3%), not a universal pass. Classification remains judgement-dependent; the under-5% gate is unmet. |
| E3 P2 | Missing every-IF authorship metadata | Accepted. Add commissioned-proposal provenance and agent author metadata. |
| E4 P2 | Snippet check called semantic provenance | Accepted. Rename and describe it as change coverage; include named third-person attribution. Semantic fidelity still requires capture-by-capture human/independent review. |
| E5 P3 | Holder axis leaks into piece one | Accepted. Remove the holder-axis expansion from the short frame piece; retain it for the later method discussion. |
| E6 P3 | README old build and panel paths | Accepted. Update build inputs, current records and panel size. Preserve the operator-facing Australia evidence-room label required by existing tests. |

The restored essay's 2026 figures are labelled modelled nowcasts from the
retained project snapshot. The historical upstream raw response remains absent,
so the source note does not call the values independently replayable. The
Musk discussion now acknowledges his own power constraint rather than claiming
that optimistic accounts never name conditions. No new policy stance is
assigned to Fernando.

## Integrity and freeze boundaries

Source: [Track F review](https://github.com/ferborva/mind-flow/pull/15#issuecomment-5609405077).
Implementation: `4b32227` plus current build integration.

| ID | Finding | Disposition |
| --- | --- | --- |
| F1 P1 | Output parity is self-comparison | Accepted. A tracked artifact lock is checked before and after rebuilding. The regression test changes the builder, then repeats internally consistent new output: both checks reject until an intentional separately reviewed lock update. |
| F2 P2 | Scratch paths inside reviewed worktree | Rejected for the exact reviewed candidate. Both cited test files derive `dashboard` from `isolatedRepository(...)`; that helper uses `mkdtempSync` under `os.tmpdir()`. Their nested `.seldon-test-*` and symlink fixtures are inside that temporary copy. A killed test can leave temporary residue, not the main worktree. Independent review confirmed the candidate source, not just the current tree. |
| F3 P2 | Coherent command receipts can be fabricated | Accepted, deferred. Schema-2.0 trust-boundary work remains due 2026-09-16. Local receipts are explicitly creator reports; independent CI actually reruns the suite. No hash or lock is relabelled independent execution authentication. |
| F4 P3 | Plain verify does not hydrate LFS | Accepted. Plain verification binds pointer identity. Exact-candidate checkout, source-capture checks and detached reproduction verify hydrated bytes. Documented explicitly. |
| F5 P3 | Seal checkout reports drift | Accepted as expected candidate semantics, not suppressed. Use plain receipt verification at the seal, and `--checkout` only at the exact candidate. The new seal is not its own reviewed source tree. |

The deliberate lock update changes the pilot HTML and Observatory validation-
context manifest. Independent reconstruction recovered the old `data.js` digest
when the old context hashes were substituted, confirming that the latter is
context binding rather than changed measurement values. Generated outputs are
still ignored build products, with a retained comparison reference.

## Verification and remaining gates

Independent agent checks passed for measurement rendering and workbook content
(8 tests), artifact lock and evolution (4), and forecast intake (6). The first
full run found one operator-README regression, which is repaired before the
final rerun. The production build now runs current correction and consumer
checks, so the unchanged Round 08 freeze policy exercises them through its
existing build command. The original receipt is never overwritten.

The subsequent full Node 22 rerun passed 931 tests across 18 invocations, with
zero failures. Later focused edge-case tests and the exact frozen-candidate
rerun are reported in the new receipt, which is authoritative for its own test
count. `git diff --check`, frontmatter validation and retained output parity
also passed before the seal. No passing run is substituted for a failed one.

Browser and in-app preview were unavailable in this environment. Generated
HTML content and bindings were tested; pixel-level visual QA and accessibility
review are not claimed. No human participant, affected-party, clinical, legal,
licensing or institutional appointment review has occurred. The measurement
coverage, disclaimer and three-real-evolution gates remain partial. A green
software run is not approval to act on these research records.
