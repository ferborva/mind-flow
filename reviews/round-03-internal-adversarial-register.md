---
id: round-03-internal-adversarial-register
title: Round 03 internal adversarial register
type: review-register
status: active
provenance: commissioned-agent-review
coordinator: Ren
reviewed_ref: ren/abundance-transition-program
reviewed_commit: f7516eb
created: 2026-09-08
updated: 2026-09-08
---

# Round 03 internal adversarial register

> **These are internal agent attacks, not independent closure reviews.** They
> were run after the Round 02 fixes began. A passing repair does not close a
> Round 02 finding. The independent external group should reproduce each attack
> against the eventual frozen Round 03 tag.

## Purpose

Round 03 uses an adversarial loop rather than treating implementation as
evidence of correctness:

```text
claim or control
→ construct the strongest cheap counterexample
→ record whether it passes
→ repair the smallest boundary
→ add the original and neighbouring attacks to the test contract
→ keep the finding open for independent review
```

The current attacks cover the evidence kernel, the IF decision kernel and the
public action boundary. Public release and operational use remain blocked.

## Evidence-kernel attacks

Five malicious snapshots passed the global build at commit `f7516eb`:

1. The PIP 2025 and later points, `latest` value and embedded rule were changed
   together from `nowcast` to `observed`.
2. `captured_and_hash_verified` was claimed using one valid but unreferenced
   one-row raw fixture.
3. That one-row World Bank fixture was linked to the full multi-entity labour
   participation history.
4. A derived Engels point was changed by 999 without recomputation.
5. A snapshot adapter version was changed to `999.0.0`.

| ID | Finding | Why the current control loses | Required falsification test | Status |
|---|---|---|---|---|
| `I03-EV-01` | Point class and classification rule can be forged together | Both are assertions inside the same snapshot | Bind classification to a separately pinned policy or executable adapter; co-mutating the snapshot must fail | in progress |
| `I03-EV-02` | Raw capture status does not mean complete coverage | One valid raw input can support the global claim while most sources have no raw input | Captured status requires exact source-to-input coverage and rejects missing, extra and unreferenced inputs | in progress |
| `I03-EV-03` | Adapter and source identity are not bound | The build accepts unsupported versions and World Bank input without the requested indicator identity | Pin request identity, indicator, fields, version and policy; reject any mismatch | in progress |
| `I03-EV-04` | Derived values are self-attested | The build neither recomputes them nor preserves the epistemic classes of their inputs | Recompute every derived point and public headline from pinned upstream series; preserve input classes | in progress |
| `I03-EV-05` | Evidence class is not adjacent everywhere | Cards and tables improved, but chart endpoints, compare views, crops and exports can omit or borrow a class | Assert adjacency in cards, SVG endpoints, compare, print, copy and machine export | in progress |
| `I03-EV-06` | Snapshot ID can masquerade as retrieval date | `--id` is also used as the source retrieval date even when bytes are fetched later | Record actual response retrieval time independently from the snapshot label | in progress |

The correct current claim remains narrow: the frozen 2026-09-07 transformed
snapshot is preserved, but its original upstream bytes were not retained. It
is therefore `not_pinned` and `not_verified`, not reproducible end to end.

## IF-kernel attacks

| ID | Finding | Counterexample | Required boundary | Status |
|---|---|---|---|---|
| `I03-IF-01` | `prepare_if` is absent from the executable kernel | Readiness work is forced into costless watching or material action | Add `prepare` as a seventh independently evaluated gate | in progress |
| `I03-IF-02` | `activation_allowed` invents permission | Gate truth is calculated without an authority exercising a mandate | Rename the result as condition eligibility; only an external signed event may activate | in progress |
| `I03-IF-03` | One decision enum hides valid concurrency | Reversal and recovery may both be required; pause and recovery may coexist | Emit separate safety, candidate-phase, concurrent-duty and exit axes | in progress |
| `I03-IF-04` | Stateless resolution can damage an existing service | `act=false` can be mistaken for authority to withdraw active support | Resolve transition proposals against prior lifecycle; never auto-activate or auto-withdraw | in progress |
| `I03-IF-05` | Conflicting exit signals have no fail-closed rule | `act=true` and `graduate=true`, or `recover=true` and `graduate=true` | Record a transition conflict and block graduation | in progress |

The proposed deterministic order is:

```text
safety control: reverse > pause > precautionary pause
candidate phase: act > prepare > watch > idle, only after safety
concurrent duties: recovery and continued monitoring remain visible
exit: graduate only for an existing lifecycle after safeguards, appeals,
      remedies and recovery are clear
```

Truth and authority remain separate. `true` means the typed IF expression
passed under the evidence rule. It does not mean that an actor agreed, funded,
authorised or activated anything.

## Public action-boundary attacks

| ID | Finding | Attack | Required boundary | Status |
|---|---|---|---|---|
| `I03-AC-01` | A repository action contract can self-attest operational status | Synthetic approver, authority, funding and evaluation strings produce a structurally valid active record | Repository output remains proposal-only; future operational import requires an externally verified commitment envelope | partly contained |
| `I03-AC-02` | Free-text playbooks cannot resolve action safety | Imperatives have no typed owner, scope, consent, funding, service, help, appeal, expiry or stop rule | Replace them with closed conditional-option contracts or hide the deck | in progress |
| `I03-AC-03` | One actor can silently declare another ready | An enterprise option treats worker consultation or community agreement as complete | Every dependency names its actor; one actor cannot attest for another | in progress |
| `I03-AC-04` | A verified authority alone is insufficient | Mandate exists, but funding, consent, service capacity or appeal has expired | The complete bundle must verify and share scope and validity | unimplemented external boundary |
| `I03-AC-05` | Cropping can turn a proposal into an instruction | The action text survives while its status, actor, review or expiry disappears | Every visible option keeps those labels adjacent at crop, print and reflow sizes | in progress |

Schema 1.5 now rejects `authorised`, `active`, `paused` and `ended` action
states even when the supplied metadata appears complete. That is a containment
control, not proof of a future external authority boundary.

## External-review challenge pack

The frozen Round 03 pack should include, at minimum:

- each malicious fixture above and its expected failure code;
- a clean-checkout reproduction command and exact runtime versions;
- a manifest that pins the review tag, tests, fixtures, schemas, policies,
  adapters, derived calculations and generated pages;
- a state-transition matrix covering inactive, watching, preparing, active,
  paused, reversing, recovering and completed lifecycles;
- cross-actor option bundles with worker pause, community veto, expired funding,
  missing service, open appeal and owner mismatch;
- public crops at desktop, mobile, 400 percent zoom and print;
- explicit residuals that code cannot establish, including legitimacy,
  consent, representation, lawfulness, burden fairness and real delivery.

No internal agent may mark its own finding closed. The external group should
record reproduction, disagreement, severity and closure separately.
