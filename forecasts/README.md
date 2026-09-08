# Forecast registry

The registry makes future claims capable of being wrong in public. Forecasts
are issued against a resolvable target, frozen with their data vintages, and
resolved later without rewriting the original probability or question.

## Rules

1. Forecast intermediate observations before vague societal crises.
2. Name the cohort, geography, service, horizon and exact resolution source.
3. Declare a naive or reference-class baseline at issue time.
4. Store the issue commit and input checksums.
5. Never overwrite issued substance. Append resolution or voiding evidence.
6. Score every resolvable forecast, including misses.
7. Publish calibration only after the sample is large enough to support it.
8. Keep forecast quality separate from the usefulness or legitimacy of an
   action taken in response.

Binary forecasts use Brier score and log loss. Brier skill compares the score
with the declared baseline. Lower raw scores are better. Positive skill is
better than the baseline, zero is equal and negative is worse.

## What the fixtures are not

The files under `fixtures/` are deliberately fictional. Their event, source,
threshold and probability exist only to test schemas, immutability and scoring.
They are not forecasts about Australia and are not Fernando's views.

## Test

```bash
node --test forecasts/tests/forecast.test.mjs
```

The first real forecast must wait for the pilot source-feasibility review and a
declared baseline. Until then, the Observatory has scenarios and hypotheses,
not forecasts.
