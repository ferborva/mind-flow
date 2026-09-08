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

## Timing and record attacks

The first timing implementation passed its focused suite and still failed a
second hostile reading. A green build had hidden signal-wide assessment reuse,
an impossible publisher-metadata path, fail-open derivation chronology, nested
point substitution and a mutable record index. The tranche was reopened.

| ID | Finding | Counterexample | Current containment | Status |
|---|---|---|---|---|
| `I03-TM-01` | One signal assessment was reused for every point | Australia 2020 poverty inherited the World 2026 nowcast coverage | Assess every external `(signal, entity, measure, year)` separately; unbound derived points say not assessed | internally contained |
| `I03-TM-02` | Known publisher metadata had no production path | Every known vintage failed because the build supplied no extraction | Recompute registered JSON-pointer fields from retained response bytes | internally contained |
| `I03-TM-03` | Exact derivation accepted unknown input readiness | An exact output time passed while its dependency retrieval was unknown | Exact computation fails when any dependency-ready interval is unresolved | internally contained |
| `I03-TM-04` | Nested derivation borrowed another target | `B/AUS/2020` inherited `A/World/2025` | Nested references must equal the dependency's governed point target | internally contained |
| `I03-TM-05` | Historical anchors poisoned endpoint currentness | Engels' intentional 2004 baseline made its 2025 endpoint look stale | Label baseline, comparator and endpoint operands; report role coverage separately | internally contained |
| `I03-TM-06` | Annual gap omitted operands | The 2025 gap used four `t` and `t-1` inputs but declared only two 2025 points | The governed binding and lineage now require all four operands | internally contained |
| `I03-TM-07` | Record identity and manifest could drift | A 2099 record date, false latest pointer and duplicate ID passed | Bind record date to evidence date; validate the complete index, correction chain, paths and bytes | internally contained |
| `I03-TM-08` | Local publisher timezone accepted fiction | `Mars/Olympus` passed the schema | Semantic validation requires `unspecified` or a recognised IANA timezone | internally contained |
| `I03-TM-09` | Calendar dates could take a dead conversion branch | A skipped `Pacific/Apia` civil date produced a plausible interval | Convert recognised IANA civil dates to strict bounded intervals and reject skipped dates | internally contained |
| `I03-TM-10` | Reported retrieval masqueraded as verified acquisition | A migrated date made dependencies appear ready without retained retrieval evidence | Label calendar retrieval as reported and unverified; never use it to establish dependency readiness | internally contained |
| `I03-TM-11` | Internal exact clocks were caller assertions | A supplied computation timestamp looked execution-backed without an artifact | Reject exact internal clocks until retained execution artifacts and a governed producer registry exist | internally contained |
| `I03-TM-12` | Correction chronology was incomplete | A later revision could claim a generation time no later than its predecessor | Require strict generation ordering and validate every record against its content-addressed historical schema | internally contained |
| `I03-TM-13` | Nested release basis was lost | A derived dependency could hide the source release basis one level down | Flatten and preserve every inherited release basis and role assessment | internally contained |
| `I03-TM-14` | One readiness label collapsed unlike claims | A successful assessment looked equivalent to ready evidence and publishability | Separate execution, structural lineage, input timing, evidence readiness and publication eligibility | internally contained |
| `I03-TM-15` | Assessment output had no governed identity | Embedded timing output could change without a schema, evaluator digest or bundle digest | Validate a closed assessment schema and bind evaluator code, inputs and canonical bundle bytes | internally contained |
| `I03-TM-16` | Atlas exports contained a dangling update graph | A filtered selection exported a hard-coded update assessment with missing dependencies | Make exports selection-only, bind them to the external frozen record and assessment bundle, and omit the public update | internally contained |
| `I03-TM-17` | The interface hid exact clock readings | A compact label concealed whether a date was declared, reported or acquired | Keep visible labels compact; expose complete readings in panel contracts, update disclosures and accessible chart descriptions | internally contained |
| `I03-TM-18` | Point acquisition could borrow signal-wide bytes | A signal with multiple raw inputs had no unique point-to-byte binding | Treat zero or multiple candidate raw inputs as unknown until an exact point binding exists | internally contained |

Generated timing assessments now bind the exact snapshot digest, evidence-policy
digest, evidence cut-off and revision time. Publisher release basis is distinct
from release recency, so an unknown cadence cannot be displayed as an unknown
release. A correction may be produced after its evidence date; the immutable
record keeps the evidence-date identity while revision and issue clocks record
when the correction occurred.

These are internal containments, not closure. External reviewers should attack
point joins, role swaps, omitted operands, record forks, symlinks, malformed
metadata pointers, unknown clocks and scoped exports against the frozen tag.

## Combined public-boundary attacks

A later read-only hostile pass found no P0 and eight P1 defects across the
combined work. The fixes below are internal containments only.

| ID | Finding | Counterexample | Current containment | Status |
|---|---|---|---|---|
| `I03-PB-01` | A selection export lost its trust boundary | Raw-input status survived while the reproduction envelope, omitted claim graphs and agent-review state disappeared | Export now declares selection-only scope, external record binding, incomplete raw-input closure, proposal status, no authority and every omitted claim graph | internally contained |
| `I03-PB-02` | `Compare all` silently became World | Multi-measure signals and the baseline substituted `OWID_WRL` while the export still said `ALL` | Multi-measure comparison now withholds the view, names the reason and exports exact effective entities | internally contained |
| `I03-PB-03` | Displayed values dropped material units | GDP appeared as a bare number without its constant-price basis | Cards, chart descriptions, tooltips, tables and chart axes now carry a complete display unit; external review must test every signal | internally contained |
| `I03-PB-04` | Critical timing states were hidden on touch screens | Publisher-release and publication-eligibility states required opening details | The seven-part observed claim now exposes the deduplicated release, evidence and publication states; full clocks remain expandable | internally contained |
| `I03-PB-05` | IF evolution existed only as prose | Current state could be rewritten without preserving the condition's prior wording, evidence or author | Programme and public language now require typed append-only history; executable fold and mutation attacks are in progress | in progress |
| `I03-PB-06` | Person and household units contradicted each other | A person-level margin could absorb shared costs without allocation while later text assumed `u` was a household | Person and household units now separate `p`, `h` and `u`; shared costs require preregistered shares summing to one and sensitivity analysis | internally contained |
| `I03-PB-07` | The Australian join rule omitted decisive incompatibilities | Business, worker and resident-region data matched five labels yet still differed in statistical unit and denominator | Join conditions now include statistical unit, keys, denominators, weights, revisions and ecological-inference controls; NERO residence geography and minimum-count treatment are explicit | internally contained |
| `I03-PB-08` | Non-priming language required false balance | A weak plausible story could receive the same weight as a strongly evidenced rival | Alternatives now need mechanisms and discriminating observations; prominence is predeclared and evidence-proportional, with high-consequence omissions retained | internally contained |

External review should parse an actual downloaded export, select `Compare all`,
inspect every unit, use the evidence atlas at 320 pixels with touch and keyboard,
mutate a condition history, allocate shared household costs under rival rules,
attempt the cross-level Australian join and test an asymmetric-evidence public
comparison. Static string tests are not sufficient closure evidence.

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
