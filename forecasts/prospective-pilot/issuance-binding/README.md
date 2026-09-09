# Future issuance binding adapter

> **This adapter does not issue, authorise or publish a forecast. Prospective
> records now carry five previously missing bindings in the existing mature
> schema. Baseline execution remains a separate prerequisite.**

## 🦅 TL;DR

The adapter asks one narrow question: can these exact preregistration bytes and
these exact mature forecast bytes be shown to describe the same prospective
test under the fixed validators?

It validates both documents, recomputes their exact byte digests, requires
separately retained anchors and source artifacts, and compares every binding the
current records can express. It returns typed blockers for the rest. There is no
issuer function and no forecast fixture in this package.

## 🔗 What is checked

| Surface | Binding enforced |
|---|---|
| Exact bytes | Supplied preregistration and mature forecast bytes must match separate SHA-256 anchors |
| Preregistration | Fixed schema and semantic validator, campaign manifest, receipt context and chronology |
| Mature forecast | Fixed binary schema and semantic validator with exact kernel and signal-registry artifacts |
| Campaign | Both mature baselines must retain the preregistered campaign ID |
| Target | Question, event, condition and signal definitions, metric, exact scope, kernel, registry, observation window, resolution source URI and event, and independence cluster |
| Resolver | Resolver ID and version |
| Baselines | Reference and naive roles, IDs, algorithms, versions, exact input manifests, artifact bytes and content-addressed calculation records |
| Clocks | Forecast issue must fall inside the preregistered issue window; publication, resolve-after and resolution-close boundaries must match |
| Contracts | Exact schema and validator byte identities used by each fixed validator are reported |

Each baseline calculation source is supplied as bytes. Its checksum must equal
the corresponding mature calculation checksum, and its closed-schema JSON must bind the
preregistered algorithm, implementation, vectors, parameters, sources, input
policy, input manifest, vintage cutoff, missing-input rule and rounding rule.
Its output must equal the mature baseline probability, its calculation time
must be an exact UTC instant on a real calendar date, and calculation must
precede forecast issue. The implementation, conformance-vector, parameter and
input-manifest bytes must also reproduce their preregistered digests. The input
manifest and mature calculation must carry exactly the same input digests.
This verifies retained bytes and a synthetic calculation record only. It does
not execute the algorithm, establish empirical validity or provide an
independent timestamp or identity.

## 🚧 Prospective bindings and remaining prerequisite

Binary forecast schema `1.4.0` now accepts an optional, closed
`prospective_registration` object binding:

1. the protocol ID, protocol-content hash or exact preregistration byte address;
2. the sealed campaign manifest identity and hash;
3. the preregistered target ID;
4. resolver implementation, parameter and conformance hashes plus correction policies; or
5. the mature schema and semantic-validator byte identities used at issue.

The adapter also returns
`BASELINE_EXECUTION_NOT_INDEPENDENTLY_REPRODUCED` until a separate runner
recomputes both probabilities from those retained inputs.

Records without that object retain the five `MATURE_*_UNREPRESENTABLE`
blockers. The field is immutable after issue; supplied references must exactly
match the protocol, raw preregistration bytes and fixed mature contract. A
partially supplied or mismatched object fails validation. No new schema family
is introduced, and existing synthetic fixtures remain blocked. Generic prose,
provenance text or an unrelated checksum is not accepted as a substitute.

## 🧪 Use

```js
import { assessFutureIssuanceBinding } from "./validate.mjs";

const result = assessFutureIssuanceBinding({
  preregistrationBytes,
  matureForecastBytes,
  byteAnchors: {
    preregistration_sha256: retainedPreregistrationDigest,
    mature_forecast_sha256: retainedForecastDigest,
  },
  preregistrationContext: {
    expectedCampaignManifest,
    expectedExternalReceipt,
    expectedSourceChronologyTip,
  },
  matureForecastSources: {
    sourceKernel,
    sourceSignalRegistry,
    referenceBaselineCalculation,
    naiveBaselineCalculation,
    referenceBaselineArtifacts,
    naiveBaselineArtifacts,
  },
});
```

`machine_valid`, `binding_complete`, `eligible_for_issuance_review` and
`issuance_authorised` remain `false` while blockers exist. The result also fixes
empirical truth, causal truth, authority, action and publication to `false`.
`records_structurally_valid_with_supplied_context` means only that local
validators accepted the records and caller-supplied context. It is not an
independent anchor. `independent_anchor_verified` therefore remains `false`.

Run the hostile suite:

```sh
node --test forecasts/prospective-pilot/issuance-binding/tests/*.test.mjs
```
