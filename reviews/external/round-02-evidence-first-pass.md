---
id: round-02-evidence-first-pass
title: External evidence review, immutable first pass
type: external-agent-review
status: submitted
provenance: agent-analysis
reviewer: blind_evidence_review
review_ref: review/round-02
reviewed_commit: ce005e1c7fc08f05ab9493aa818f593e8397106a
submitted: 2026-09-08
---

# External evidence review, immutable first pass

> **Public release remains blocked.** This is an independent agent review, not
> human, statistical, affected-party, ecological or institutional approval.

## Reproduction

- The frozen source tree was reviewed from a clean detached clone.
- `npm ci`, all specified builds and all 74 tests passed. Builds left no diff.
- The official NERO archive was independently retrieved from [Jobs and Skills
  Australia](https://www.jobsandskills.gov.au/data/nero).
- Archive SHA-256 matched `a092fbdc...943946`; contained CSV SHA-256 matched
  `7c1efd44...25d1`.
- Independent parsing returned 4,123,680 rows, 355 occupations, 88 SA4s and 132
  months.
- Aggregate transmission reproduced: output `144.2656`, constructed labour
  income `140.7861`, difference `-3.4795`; annual 2025 gap `0.3893pp`.
- No other reviewer's findings were inspected and the shared working tree was
  not modified.

## R02-BC-SL-01

**Severity:** Stop-line  
**Lane:** B and C  
**Artifact:** `dashboard/snapshots/2026-09-07.json:7,2634-2653,3519-3545`;
`dashboard/schema/snapshot.schema.json:263-316`;
`dashboard/web/index.html:800`  
**Control challenged:** Measured, modelled and projected values remain
machine-distinguishable.

**Observed problem:** The 2026 poverty values are described as modelled
nowcasts or projections but carry `status: "measured"` and are counted as
measured source series. The machine contract cannot preserve observation versus
forecast separation. World Bank PIP identifies post-2024 estimates as nowcasts.

**Strongest defence:** Human-readable caveats disclose that the tail is
modelled.

**Assessment:** Caveats are not structured semantics. Machine consumers,
filters, exports and screenshot crops can retain the contradictory label.

**Minimum safe correction:** Separate availability from per-point epistemic
class: `observed`, `modelled_estimate`, `nowcast`, `forecast` or `derived`;
retain source vintage and method.

**Closure test:** The schema rejects the 2025 or 2026 tail as observed or
measured. UI, copy and exports show `2026 nowcast` beside the value.

## R02-BC-SL-02

**Severity:** Stop-line  
**Lane:** B and C  
**Artifact:** `dashboard/tools/fetch_snapshot.py:40-94`;
`dashboard/schema/snapshot.schema.json:263-272`; `dashboard/README.md:28-38`  
**Control challenged:** The build preserves the exact evidence used.

**Observed problem:** The fetcher reads mutable live endpoints while the source
record stores only URL, retrieval date, name and note. It does not preserve raw
bytes, upstream checksum, response metadata, selected-column contract or
publisher vintage. A fresh build validates frozen transformed JSON, not the
selection and transformation from exact upstream evidence.

**Strongest defence:** Git pins the final snapshot and checksum.

**Assessment:** This proves which copied numbers were released. It cannot
reproduce them from the exact upstream inputs or detect later source revision.

**Minimum safe correction:** Content-address raw payloads and metadata, record
adapter version and selected fields, and verify every hash before transformation.

**Closure test:** A fresh environment rebuilds the snapshot bit-for-bit from
pinned inputs. Mutated or revised live data cannot silently pass.

## R02-BC-SL-03

**Severity:** Stop-line  
**Lane:** B and C  
**Artifact:** `governance/if-protocol.md:134-160`;
`contracts/README.md:138-146`; `contracts/evaluator.mjs:261-288`  
**Control challenged:** Public and executable `UNLESS` semantics agree.

**Observed problem:** The public protocol says an authorised equivalent route
replaces one requirement. The evaluator implements `condition AND NOT
exception`; a true equivalent route returns false and skips the requirement.
This can invert a gate.

**Strongest defence:** The implementation consistently interprets exception as
a blocking safeguard.

**Assessment:** That is a veto, not an equivalent-route exception. The protocol
uses both concepts.

**Minimum safe correction:** Define separate typed operators, such as
`alternative_if = condition OR alternative` and `veto_if = condition AND NOT
blocker`.

**Closure test:** Publish five-valued truth tables, test all 25 state pairs, and
require two independent encoders to return identical results for public examples.

## R02-B-MJ-01

**Severity:** Major  
**Lane:** B  
**Artifact:** `governance/if-protocol.md:230-269`;
`contracts/evaluator.mjs:9-15`; `pilots/australia/if-register.json:35-48`;
`dashboard/schema/snapshot.schema.json:121`  
**Control challenged:** Condition states can be migrated deterministically.

**Observed problem:** Lifecycle, binding, measurement and predicate truth use
incompatible vocabularies with no typed conversion. A state such as
`measured_below_threshold` can mean pass or fail depending on indicator direction.

**Minimum safe correction:** Store typed `measurement_state`,
`predicate_truth`, `binding_state`, lifecycle and evidence grade, with a
versioned mapping that rejects ambiguity.

**Closure test:** Every valid conversion is covered. Ambiguous or directionless
conversion fails rather than defaulting.

## R02-B-MJ-02

**Severity:** Major  
**Lane:** B  
**Artifact:** `communications/early-action-and-negotiation-framework.md:523-545`;
`contracts/evaluator.mjs:369-394`;
`contracts/schema/action-contract.schema.json:30-99`;
`contracts/semantic-validation.mjs:401-424`  
**Control challenged:** Hard safety gates override action.

**Observed problem:** A reproduced fixture returned `watch=true, act=true,
pause=true, reverse=true, recover=true, graduate=true` without error. The public
framework says pause or reverse must override act, but the executable action
contract does not enforce that precedence.

**Minimum safe correction:** Add a deterministic decision resolver and explicit
conflict state. Hard pause or reverse must pre-empt act.

**Closure test:** Conflict fixtures reject activation when pause or reverse is
true, or when a hard safeguard is unresolved.

## R02-C-MJ-01

**Severity:** Major  
**Lane:** C  
**Artifact:** `pilots/australia/if-register.json:133-150`;
`pilots/australia/nero-shadow-protocol.json:223-240`;
`pilots/australia/nero-backtest-and-shadow-plan.md:93-108`  
**Control challenged:** NERO corroboration is independent and scope-compatible.

**Observed problem:** IF-04 names LFS-family evidence as independent while the
shadow protocol correctly marks it partially dependent. NERO uses and
reconciles to LFS inputs. Broad state or occupation agreement also cannot
validate an SA4 cell.

**Minimum safe correction:** Encode dependence class and exact population,
geography and time compatibility as hard gates. LFS can provide coherence
context, not independent corroboration.

**Closure test:** Shared-input agreement and state-versus-SA4 agreement cannot
satisfy escalation.

## R02-C-MJ-02

**Severity:** Major  
**Lane:** C  
**Artifact:** `pilots/australia/if-register.json:156-176`  
**Control challenged:** Affected-cohort evidence is not substituted by an
aggregate population.

**Observed problem:** IF-05 changes the population from scoped workers and
households to the broader local population whenever an occupation link is
absent. Aggregate access can improve while the affected cohort loses housing,
income or services.

**Minimum safe correction:** Split cohort and place conditions. Missing cohort
evidence remains unmeasured and never falls back to a broader population.

**Closure test:** A Simpson's-paradox fixture where the local average improves
while the cohort worsens must block a positive cohort state.

## R02-C-MJ-03

**Severity:** Major  
**Lane:** C  
**Artifact:** `pilots/australia/nero-shadow-protocol.json:75-97`;
`pilots/australia/rehearsal/engine.mjs:175-199,307-315`;
`pilots/australia/nero-warning-audit-2026-08.json:17`  
**Control challenged:** Shadow evaluation proves no look-ahead.

**Observed problem:** The protocol requires `publisher_release_timestamp`, but
the record stores only `2026-09-02`. The engine fabricates midnight UTC. Same-day
detector registration can be incorrectly accepted or rejected, and actual
information availability is unprovable.

**Minimum safe correction:** Store an independently evidenced UTC publisher
timestamp, or a conservative first-seen interval when exact time is unavailable.

**Closure test:** Same-day before and after fixtures enforce observed
publication order without synthetic midnight.

## R02-C-MJ-04

**Severity:** Major  
**Lane:** C  
**Artifact:** `pilots/australia/nero-backtest-and-shadow-plan.md:183-190,319-331`;
`pilots/australia/nero-shadow-protocol.json:279-305`  
**Control challenged:** The NERO go rule can compare precision with every
declared baseline.

**Observed problem:** A no-alert policy has `TP=0` and `FP=0`, so precision is
undefined. The rule requiring a lower confidence bound for precision to beat
all named baselines is not executable.

**Minimum safe correction:** Treat no-alert as a decision-policy utility
comparator, not a precision comparator. Predeclare the loss matrix, event
sample, baseline predictions, primary metric, clustering and stopping rule.

**Closure test:** No-event, rare-event, censoring and no-alert fixtures all
produce defined decisions.

## R02-C-MN-01

**Severity:** Minor  
**Lane:** C  
**Artifact:** `pilots/australia/nero-warning-audit-2026-08.json:96-135`  
**Control challenged:** Three-consecutive-decline rates use their declared
eligible observations.

**Observed problem:** The whole-archive rate reports `21,485 / 57,640 =
0.372745`, but only `56,760` observations have three preceding monthly
comparisons, giving `0.378524`. The negative-control value uses pre-window
observations; its declared 2016-09 to 2022-11 scope gives `12,321 / 33,000 =
0.373364`, not `0.366147`.

**Minimum safe correction:** Publish numerator, denominator, eligibility dates
and code-generated audit output.

**Closure test:** Boundary-month fixtures verify every denominator and era.

## Falsification attacks

- **Ownership concentration:** Contained. Concentration and fairness remain
  unknown, so the global claim cannot turn green.
- **Aggregate improves while cohort loses:** Attack succeeds against IF-05.
- **Employment falls for non-AI reasons:** Contained. NERO does not establish AI
  adoption, job loss or cause.
- **Threshold leakage:** Historical warning backtest is correctly stopped;
  prospective chronology remains vulnerable to date-only release records.
- **Warning endogeneity:** Initially limited by no-consequence shadow operation.
  Later public signals must record warning exposure and behavioural response.
- **Reversibility:** Evidence absence is honestly stated, but executable
  precedence is missing.
- **IF ambiguity:** Attack succeeds through conflicting `UNLESS` meanings and
  state mappings.
- **Forecast scoring:** Attack succeeds for no-alert precision.
- **Ecological durability:** Contained only because durability remains unknown.
- **Simpler design:** Unresolved. No evidence shows the full Observatory beats
  an official warning plus human deliberation on accuracy, comprehension, cost
  or harm.

## Claims that survived

- The frozen build and test suite reproduce cleanly.
- NERO provenance, archive dimensions and most descriptive flag-load
  calculations reproduce.
- One latest NERO archive cannot support a historical as-published accuracy
  backtest.
- The repository refuses to infer AI adoption, causal displacement or crisis
  from NERO trends.
- Aggregate transmission arithmetic is dimensionally consistent and labelled
  descriptive.
- Earlier invalid formulas remain quarantined.
- All five global IF conditions remain unknown, with no authorised action.
- The forecast registry says no real forecast exists yet.
- Public release is explicitly blocked.

## Ranked next tests

1. Golden semantic vectors for alternatives, vetoes, state conversion and gate
   precedence.
2. Per-point epistemic classes and bit-for-bit rebuilds from content-addressed
   upstream inputs.
3. Cohort-versus-aggregate and shared-input-independence adversarial fixtures.
4. Exact-timestamp no-look-ahead rehearsal across consecutive NERO releases.
5. Preregister event definitions, decision loss, capacity and metric-specific
   baselines.
6. Prospective independent employer-worker and household cohort panels.
7. Human tests for option versus commitment, state meaning and pause or reverse
   precedence.
8. Direct ownership, concentration and ecological instruments before any
   abundance or graduation claim.
