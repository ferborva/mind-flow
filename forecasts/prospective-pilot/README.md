# Prospective no-consequence forecast pilot

> **AGENT-PROPOSED RESEARCH PROTOCOL. IT ISSUES NO FORECAST, GRANTS NO
> AUTHORITY AND MUST NOT AFFECT A PERSON, SERVICE, POLICY OR DECISION.**

## 🦅 TL;DR

**This contract creates the paper trail before anyone knows the answer.** It
freezes a binary target, its executable IF references, two content-addressed
mechanical baseline contracts, issue and resolution clocks, source chronology,
scoring implementation and campaign membership. It also binds the exact schema
and validator bytes. The
included JSON is deliberately blank. It contains no empirical inputs and no
probability.

The protocol can test whether Mind Flow can make a prospective forecast
falsifiable without smuggling it into an action process. Any later forecast must
be a separate immutable record under the existing forecast registry.

---

## 🔒 The no-consequence boundary

The schema fixes these values. A caller cannot weaken them:

| Boundary | Fixed value |
|---|---|
| Forecast status | `not-issued` |
| Probability | `null` |
| Authority effect | `none` |
| Action authorised | `false` |
| Operational effect | `false` |
| Decision use | `prohibited` |
| Maximum claim | Protocol rehearsal and scoring method only |

> A structurally complete unverified preregistration means only that the local
> contract is internally coherent and matches separately supplied caller
> context. It does not prove an external timestamp, caller independence, source
> absence, publisher identity, outcome truth, predictive skill or campaign
> completeness.

---

## 🧭 What gets fixed before issue

| Surface | What the protocol registers | Why it matters |
|---|---|---|
| Target | Binary event, condition and signal definitions, metric, scope, kernel, registry, observation window, resolution rule, source URI and event | Prevents the question or its executable meaning changing after the outcome becomes visible |
| Baselines | Reference and naive comparator roles, algorithms, versions, implementation and conformance hashes, parameters, exact input manifests, vintage cutoffs, missing-input and rounding rules | Makes comparator shopping and later input expansion detectable when retained bytes are supplied |
| Clocks | Preregistration, issue window, observation window, publication boundary, resolve-after and resolution-close | Keeps issue separate from observation, publication and scoring |
| Sources | One required outcome source and a local absence-to-presence hash chain | Makes supplied chronology edits visible; an external tip anchor is still required after every append |
| Revision | New protocol for material changes, never overwrite | Preserves failed and superseded designs |
| Scoring | Brier, bounded log loss, implementation and conformance hashes, aggregation, void review and denominator | Narrows metric and exclusion shopping |
| Campaign | One ID and a non-circular sealed manifest | Keeps every registered protocol in view |
| Content seal | One checksum over the complete preregistered substance | Makes later target, baseline, clock or policy edits fail |

The validator enforces this chronology:

```text
manifest sealed ≤ content sealed ≤ external receipt < issue opens < issue closes
                 < observation starts < observation ends
                 ≤ publication not before ≤ resolve after ≤ resolution closes
```

The one required outcome source starts as `reported_absent`. The preregistration
seals exactly one initial absence report per source. Every event hashes its own
content and the previous event hash. A `reported_present_checksum_only` event
may follow only when the observation window has ended. It requires a SHA-256
digest and must arrive no later than resolution close, but does not prove the
bytes exist or the source is truthful. The bounded pilot accepts only the first
retained presence. A source cannot return to reported absence.

---

## 🧮 Manifest without a fixed-point trick

`manifest_sha256` covers the canonical campaign-manifest object after removing
only the `manifest_sha256` field itself. It includes the campaign ID, manifest
ID, eligibility rule, exclusions, protocol IDs, seal time and verification
status. It does not hash the whole protocol and therefore does not claim a
self-referential digest.

`protocol_content_sha256` separately covers the immutable preregistration base
after removing that checksum, the external receipt and the appendable event
array. It still includes the preregistered event count and tip hash, which commit
the complete initial absence prefix. The receipt then names the resulting
content checksum. This seals the target, baseline, clocks, initial source state,
revision rules, scoring rules, campaign manifest and authority boundary without
requiring the record to hash itself.

The external registration receipt also has its own explicit checksum scope:
`external-receipt-bytes-not-this-protocol-record`. The local validator checks
its shape, exact UTC time and match to a separately supplied receipt context,
not whether the external service, bytes or timestamp are authentic. The
protocol's `registration.registered_at` and `clocks.preregistered_at` record
the content-seal time. The provider's receipt may arrive later, but must precede
the issue window. Requiring equal times would force a client to predict the
provider's clock before hashing the content. The external receipt is excluded
from the content hash, so adding it does not rewrite preregistered substance.
The local hash chain detects edits and reordering in a supplied chronology. It
cannot prove that someone did not remove an unanchored tail. A post-registration
tail therefore fails the complete-context gate unless the caller supplies its
exact event count and tip. That caller value is still unauthenticated. External
review must independently retain or anchor each checkpoint.

---

## 🛠️ Use the template

1. Copy `examples/preregistration.template.json`.
2. Keep it as `draft-template` while any field is unresolved.
3. Fill the target, both baselines and UTC clocks from an approved pilot design. Do
   not infer values or fabricate source observations.
4. Record and hash one `reported_absent` event for every required outcome
   source. Set the preregistered event count and tip hash.
5. Bind the exact schema and validator bytes. Seal the campaign manifest no
   later than preregistration and compute its
   checksum with `campaignManifestSha256`.
6. Set `status` to `preregistered-unverified`, compute
   `protocol_content_sha256`, then make the external receipt name that exact
   checksum.
7. Attach the claimed external receipt. Validate against a separately retained
   campaign manifest and receipt context.

```js
import {
  assertProspectivePilotPreregistration,
  campaignManifestSha256,
  prospectivePilotContractIdentity,
  protocolContentSha256,
  sourceChronologyEventSha256,
} from "./forecasts/prospective-pilot/validate.mjs";

let previousEventSha256 = null;
protocol.contract = prospectivePilotContractIdentity();
for (const event of protocol.source_chronology.events) {
  event.previous_event_sha256 = previousEventSha256;
  event.event_sha256 = sourceChronologyEventSha256(event);
  previousEventSha256 = event.event_sha256;
}
protocol.source_chronology.preregistered_event_count =
  protocol.source_chronology.events.length;
protocol.source_chronology.preregistered_tip_sha256 =
  protocol.source_chronology.events.at(-1).event_sha256;
protocol.campaign.manifest.manifest_sha256 = campaignManifestSha256(
  protocol.campaign.manifest,
);
protocol.registration.protocol_content_sha256 = protocolContentSha256(protocol);
// Attach an external receipt that names this exact content checksum here.
assertProspectivePilotPreregistration(protocol, {
  expectedCampaignManifest: retainedCampaignManifest,
  expectedExternalReceipt: retainedReceiptContext,
});
```

**Stop after validation.** Issuance belongs in a separate forecast record and is
outside this bounded protocol package.

---

## 🧪 Verify

```sh
node --test forecasts/prospective-pilot/tests/*.test.mjs
```

The hostile tests cover contract drift, manifest tampering, missing campaign membership, late
manifest sealing, overlapping issue and observation clocks, non-UTC clocks,
early or late source presence, unanchored chronology tails, unresolved baseline
or resolver fields, naive-comparator shopping, receipt-context substitution,
forecast injection, authority escalation, scoring changes and revision-policy weakening.

## 📍 Next gate

Do not convert the blank template into a claimed preregistration until a human
has approved the synthetic no-consequence target and an external registration
method is available. The issuance adapter now demonstrates exact comparisons
and exposes remaining mature-schema and independent-reproduction blockers. It
does not authorise issuance. Before any forecast, review the adapter and evolve
the mature schema so every blocker can be represented and independently tested.
