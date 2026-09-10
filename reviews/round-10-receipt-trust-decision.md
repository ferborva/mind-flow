---
id: round-10-receipt-trust-decision
type: internal-review-proposal
title: Round 10 receipt trust decision
author: Ren
date: 2026-09-10
status: review
---

# Decision and expiry

**Accept the current integrity-only verifier boundary as a commissioned engineering risk decision through the 2026-09-16 review.** Provenance: `commissioned-proposal`. This is Ren's reversible implementation decision within the commissioned review work, not Fernando's formal approval, external reviewer acceptance, publication permission or a claim that receipts authenticate execution. The September 16 review must renew, replace or reject the decision explicitly. It does not silently become permanent.

The current verifier checks internal content consistency, the selected policy, exact candidate Git objects and bound files. Its successful result does **not** authenticate that the claimed stdout, stderr, timing or exit status came from an actual execution. The current README explicitly discloses that a coherent local reseal is possible and that creator-reported reproduction is unauthenticated. This decision accepts that limitation temporarily; it does not repair it or count it as an authentication gate passed.

## Required compensating review

Before merge, a reviewer independent of the receipt-producing run must rerun **all** required policy commands against the exact selected candidate, using reviewed code, Node 22, retained source bytes and the recorded command environment. Record the independent run's candidate, outputs, failures and environment differences separately. A passed creator receipt is not a substitute. A single-command rerun can corroborate only that command in that execution environment; it cannot prove the rest of the transcript, chronology, other commands or earlier host state. No such partial check is added to `verify` under the name of transcript authentication.

An independent rerun is additional evidence, not perfect authentication. The detached checkout is not a security sandbox; review code before execution or use independently governed containment. The tool does not isolate network or host filesystems, retain dependency tree bytes or registry responses, or observe mutate-use-restore behaviour inside a command. Optional generator/runtime parity checks do not establish an independent trust root.

## Existing evidence, not an invented demonstration

`meta/review-freeze/README.md`, under Create and verify and Trust boundary, documents the unauthenticated creator report and coherent-reseal limitation. `meta/review-freeze/tests/review-freeze.test.mjs` tests the related boundaries:

- `failed reproduction is preserved as a finding and cannot imply approval`: structurally valid failed reproduction remains a finding; omitted receipts and malformed output fail.
- `CLI verification fails closed for coherent failed and not-run receipts`: normal CLI verification refuses those states; explicit inspection preserves their state rather than upgrading it.
- `working-tree, manifest and required-command drift fail closed`: policy, file, output-contract and approval inflation are rejected within the stated integrity model.
- `a command run is isolated, retained byte-for-byte and content addressed`: actual fixture execution is retained and checked without claiming process sandboxing.

Those tests support integrity and boundary disclosure. They are **not** a test proving authentic execution of arbitrary submitted transcripts, nor a new executable transcript-forgery demonstration. No external receipt is fabricated or edited by this work.

## Additive Round 10 policy and coordinator handoff

`review-freeze.round-10`, policy version `1.0.0`, retains the Round 09.1 command contract and adds exact argv checks for income history, the commissioned storm criterion, Australian depth, the additive policy tests and the canonical Round 09.1 receipt. The existing full suite, generated-output lock check and country reader checks remain inherited. A forward integration repair selects the same family's closed receipt edition `1.1.0`, recording Git LFS in the narrow runtime and giving each future Round 10 execution a UUID-suffixed identity. No new contract family is introduced. Historical schemas, policies and receipt bytes remain unchanged. The complete tracked-tree inventory remains the backstop for files outside the legible required-file list.

The coordinator must integrate the storm and depth producers and review brief before selecting the candidate. This setup does **not** create a receipt, freeze HEAD, regenerate the artifact lock, change CI, or claim that all Round 10 gates passed. After those separate actions and explicit candidate selection, the existing command family is:

```sh
node meta/review-freeze/review-freeze.mjs create --policy=round-10 --commit=EXACT_CANDIDATE_COMMIT --output=meta/review-freeze/round-10.review-freeze.json --run
node meta/review-freeze/review-freeze.mjs verify --policy=round-10 --manifest=meta/review-freeze/round-10.review-freeze.json
```

Replace `EXACT_CANDIDATE_COMMIT` with the reviewed full commit hash, never a moving branch. Do not overwrite retained output. A later independent execution needs a new output path and an independently recorded content hash. Round 10 now generates a distinct UUID-suffixed `freeze_id`; historical round-level IDs remain unchanged. Neither an ID nor a hash authenticates execution. At the exact clean candidate, `--checkout` can additionally compare working bytes. It should not be expected to pass at a later seal commit containing added receipt files.

## Named deferrals and unmet request

| Item | Disposition |
| --- | --- |
| Transcript authentication / receipt forgery | Current boundary accepted only as the commissioned, time-bounded risk above; independent full rerun required before merge; reconsider 2026-09-16 |
| Distinct canonical and network-blocked Round 09.1 freeze IDs | Literal request remains unmet pending Fernando's original-preservation versus new-version decision; neither receipt nor hash changed |
| Future per-execution identity | Implemented prospectively in Round 10 receipt edition 1.1.0: UUIDv4 suffix, exact schema/verifier shape, distinct same-candidate creations, malformed/wrong-round rejection. This does not close the historical-ID request |
| Hash-domain separation | Deferred, no historical hash reinterpretation |
| History weight | Deferred, no history rewrite |
| Inherited macro raw inputs | Deferred, no new source-authentication claim |
| Final candidate, artifact lock and freeze | Coordinator-owned subsequent steps, not completed by this setup |

Review can overturn this decision without rewriting historical receipts. If authentication becomes a required gate, it remains unmet until the replacement mechanism and its independent authority are demonstrated.
