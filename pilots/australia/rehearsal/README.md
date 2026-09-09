# NERO shadow rehearsal engine

> **Status:** Agent-built feasibility tool. Its outputs are private, no-consequence review states. They are not validated warnings.

This is the smallest executable form of the [prospective shadow protocol](../nero-shadow-protocol.json). It compares two immutable NERO extracts, calculates revision diagnostics and applies one fixed, interpretable review rule to the current as-of vintage.

It emits only:

- `review-candidate`: the modelled series met the registered descriptive condition; or
- `below-condition`: it did not.

Both states have `consequence: "none"`, `public_use: "prohibited"` and a visible interpretation limit. The engine does not estimate AI adoption, job loss, household crisis, agency or causation.

## Run from Node

```js
import { readFile } from "node:fs/promises";
import { runShadowRehearsal } from "./pilots/australia/rehearsal/engine.mjs";

const previousVintage = JSON.parse(await readFile("/immutable/2026-08.json", "utf8"));
const currentVintage = JSON.parse(await readFile("/immutable/2026-09.json", "utf8"));
const detector = JSON.parse(
  await readFile("./pilots/australia/rehearsal/detector.example.json", "utf8"),
);

const result = runShadowRehearsal({
  previousVintage,
  currentVintage,
  detector,
  generatedAt: new Date().toISOString(),
});
```

The example detector is illustrative. Its threshold is not empirically
validated. It declares its registration time, target, bounded human-review
action, review capacity and the costs of false concern and a missed review.
Freeze the detector file, independently timestamp its checksum before a
prospective release, and do not tune it on the evaluation holdout. The declared
timestamp alone does not prove that preregistration occurred.

## Fail-closed checks

The engine throws a `RehearsalError` with a stable `code` when it finds:

- unsupported evidence class, source or classification;
- missing required source provenance or malformed SHA-256;
- non-contiguous, duplicate, unavailable or insufficient monthly history;
- latest values that disagree with the final observation;
- duplicate or changed occupation-SA4 coverage;
- a current period or release date that does not follow the previous vintage;
- a missing intervening monthly publication vintage;
- a generated time before current evidence retrieval;
- distinct vintages sharing a checksum;
- detector registration on or after the current evidence release;
- more review candidates than the declared human-review capacity;
- a detector with authority beyond `no-consequence-review`; or
- an invalid synthetic scenario.

No error is converted into a green or prior state.

## Provenance boundary

The output preserves both publisher archive checksums and calculates canonical SHA-256 checksums for:

- the complete previous input record;
- the complete current input record; and
- the detector configuration.

The engine does not download or reopen the publisher ZIP, so it cannot prove
that an extracted JSON record matches the ZIP merely because the record declares
its checksum. The ingestion process must verify the downloaded archive before
creating the immutable extract. Storage immutability and independent
time-stamping also sit outside this module.

If candidate count exceeds the detector's declared capacity, the engine fails
with `REVIEW_CAPACITY_EXCEEDED` and preserves `consequence: none` in the error
details. It does not rank places, discard overflow candidates or quietly raise
the threshold.

Revision results compare overlapping values in the prior and current extracts. They are diagnostic only and never replace the earlier record.

## Synthetic pipeline rehearsal

Use a synthetic rehearsal to test mechanics such as episode creation, routing and failure handling:

```js
import { runSyntheticPipelineRehearsal } from "./pilots/australia/rehearsal/engine.mjs";

const result = runSyntheticPipelineRehearsal({
  previousVintage,
  currentVintage,
  detector,
  scenario: {
    id: "tail-decline-check",
    type: "linear-tail-decline",
    occupation_code: "5311",
    sa4_code: "101",
    months: 4,
    total_percent: -30,
  },
  generatedAt: new Date().toISOString(),
});
```

Synthetic output has:

- `mode: "synthetic-pipeline-rehearsal"`;
- `non_validating: true`;
- `validation_status: "non-validating-synthetic-rehearsal"`;
- a checksum of the scenario and transformed record; and
- `synthetic: true` on every series result.

The transformation operates on a clone and never mutates the source vintage. Synthetic results test pipeline mechanics only. They cannot estimate predictive accuracy, sensitivity, precision or lead time.

## Test

```bash
node --test pilots/australia/rehearsal/tests/engine.test.mjs
```

The tests cover review-state output, no-consequence authority, input immutability, checksums, revision diagnostics, missing history, schema drift, coverage mismatch, look-ahead risk and synthetic labelling.

## Deliberate omissions

This engine does not yet:

- retrieve or store source archives;
- verify a ZIP against the declared publisher checksum;
- define independent outcome events;
- calculate warning accuracy or lead time;
- collapse repeated monthly candidates into multi-release episodes;
- perform public communication; or
- trigger any action.

Those omissions are stop conditions, not implied future capability. The next valid run requires a separately frozen September 2026 vintage after its official release.
