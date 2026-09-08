import assert from "node:assert/strict";
import test from "node:test";

import {
  RehearsalError,
  computeRecordChecksum,
  runShadowRehearsal,
  runSyntheticPipelineRehearsal,
} from "../engine.mjs";

const DETECTOR = {
  schema_version: "1.0.0",
  id: "annual-run-review",
  version: "1.0.0",
  mode: "no-consequence-review",
  registered_at: "2026-08-01T00:00:00Z",
  registered_by: "Agent proposal for prospective rehearsal",
  target: "descriptive-employment-review-candidate",
  bounded_action: "human evidence review only; no publication or consequence",
  maximum_review_candidates: 10,
  false_positive_cost: "Human review time and possible false concern. No public or individual consequence is permitted.",
  false_negative_cost: "A real employment change may not receive timely human review.",
  lookback_months: 12,
  run_months: 3,
  annual_change_at_or_below_percent: -10,
};

function monthSequence(startYear, startMonth, count) {
  const dates = [];
  for (let index = 0; index < count; index += 1) {
    const zeroBased = startMonth - 1 + index;
    const year = startYear + Math.floor(zeroBased / 12);
    const month = (zeroBased % 12) + 1;
    dates.push(`${year}-${String(month).padStart(2, "0")}-15`);
  }
  return dates;
}

function makeVintage({
  period,
  releasedAtUtc,
  retrievedAt,
  checksumCharacter,
  dates,
  values,
  occupationCode = "5311",
  sa4Code = "101",
  releaseAvailability,
}) {
  const recentObservations = dates.map((date, index) => ({
    date,
    value: values[index],
    status: "reported-modelled-estimate",
  }));
  const latest = recentObservations.at(-1);
  const fromValue = recentObservations.at(-13)?.value;

  return {
    schema_version: "1.0.0",
    id: `nero-clerical-baseline-${period}`,
    title: "Australian clerical employment by occupation and SA4",
    epistemic_class: "modelled-estimate",
    measurement_type: "modelled-nowcast",
    source: {
      publisher: "Jobs and Skills Australia",
      title: "Nowcast of Employment by Region and Occupation",
      licence: "CC BY 4.0",
      archive_url: `https://www.jobsandskills.gov.au/${period}_nero.zip`,
      archive_name: `${period}_nero.zip`,
      release_period: period,
      released_at: releasedAtUtc.slice(0, 10),
      release_availability: releaseAvailability || {
        kind: "verified-publisher-timestamp",
        timestamp_utc: releasedAtUtc,
        evidence: "Test fixture publisher timestamp.",
      },
      retrieved_at: retrievedAt,
      checksum: `sha256:${checksumCharacter.repeat(64)}`,
    },
    scope: {
      occupation_classification: "ANZSCO 2013 version 1.3, 4-digit",
      geography_classification: "ASGS 2021 SA4, place of residence",
      occupation_codes: [occupationCode],
      series_count: 1,
    },
    public_warning: "Do not aggregate.",
    interpretation_limit: "This is a modelled employment estimate only.",
    revision_policy: "Never overwrite a vintage.",
    series: [
      {
        occupation_code: occupationCode,
        occupation_name: "General Clerks",
        state_name: "NSW",
        sa4_code: sa4Code,
        sa4_name: "Capital Region",
        latest: { ...latest },
        change_12m:
          fromValue === undefined
            ? null
            : {
                from_date: recentObservations.at(-13).date,
                from_value: fromValue,
                absolute: latest.value - fromValue,
                percent: Number((((latest.value - fromValue) / fromValue) * 100).toFixed(1)),
              },
        change_60m: null,
        recent_observations: recentObservations,
      },
    ],
  };
}

function fixturePair() {
  const previousDates = monthSequence(2025, 7, 13);
  const currentDates = monthSequence(2025, 8, 13);
  const previous = makeVintage({
    period: "2026-07",
    releasedAtUtc: "2026-08-05T01:00:00Z",
    retrievedAt: "2026-08-05T02:00:00Z",
    checksumCharacter: "a",
    dates: previousDates,
    values: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 950, 910],
  });
  const current = makeVintage({
    period: "2026-08",
    releasedAtUtc: "2026-09-02T01:00:00Z",
    retrievedAt: "2026-09-02T02:00:00Z",
    checksumCharacter: "b",
    dates: currentDates,
    values: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 950, 900, 850],
  });
  return { previous, current };
}

test("emits a no-consequence review candidate with immutable provenance", () => {
  const { previous, current } = fixturePair();
  const originalPrevious = structuredClone(previous);
  const originalCurrent = structuredClone(current);

  const result = runShadowRehearsal({
    previousVintage: previous,
    currentVintage: current,
    detector: DETECTOR,
    generatedAt: "2026-09-08T03:00:00Z",
  });

  assert.equal(result.mode, "prospective-shadow-rehearsal");
  assert.equal(result.authority, "no-consequence");
  assert.equal(result.public_use, "prohibited");
  assert.equal(result.validation_status, "not-a-validated-warning");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].state, "review-candidate");
  assert.equal(result.results[0].consequence, "none");
  assert.equal(result.results[0].signal.annual_change_percent, -15);
  assert.equal(result.results[0].signal.consecutive_declines, 3);
  assert.equal(result.provenance.current.source_checksum, current.source.checksum);
  assert.equal(result.provenance.previous.source_checksum, previous.source.checksum);
  assert.equal(result.provenance.current.record_checksum, computeRecordChecksum(current));
  assert.match(result.provenance.detector.config_checksum, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.provenance.detector.registered_at, DETECTOR.registered_at);
  assert.equal(result.review_capacity.maximum_candidates, 10);
  assert.equal(result.review_capacity.candidates, 1);
  assert.equal(result.review_capacity.within_limit, true);
  assert.deepEqual(previous, originalPrevious);
  assert.deepEqual(current, originalCurrent);
});

test("emits below-condition without inventing a warning or consequence", () => {
  const { previous, current } = fixturePair();
  current.series[0].recent_observations.at(-1).value = 920;
  current.series[0].latest.value = 920;

  const result = runShadowRehearsal({
    previousVintage: previous,
    currentVintage: current,
    detector: DETECTOR,
    generatedAt: "2026-09-08T03:00:00Z",
  });

  assert.equal(result.results[0].state, "below-condition");
  assert.equal(result.results[0].consequence, "none");
  assert.doesNotMatch(
    JSON.stringify(result),
    /AI caused|crisis detected|causal effect|job[- ]loss warning/i,
  );
});

test("fails visibly when a series lacks detector history", () => {
  const { previous, current } = fixturePair();
  current.series[0].recent_observations = current.series[0].recent_observations.slice(-6);
  current.series[0].latest = { ...current.series[0].recent_observations.at(-1) };

  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: previous,
        currentVintage: current,
        detector: DETECTOR,
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "INSUFFICIENT_HISTORY",
  );
});

test("fails visibly on schema and series-coverage errors", () => {
  const { previous, current } = fixturePair();
  delete current.source.checksum;

  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: previous,
        currentVintage: current,
        detector: DETECTOR,
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "INVALID_SCHEMA",
  );

  const pair = fixturePair();
  pair.current.series[0].sa4_code = "102";
  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: pair.previous,
        currentVintage: pair.current,
        detector: DETECTOR,
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "SERIES_COVERAGE_MISMATCH",
  );
});

test("fails closed on chronology gaps and reversed release order", () => {
  const gapPair = fixturePair();
  gapPair.current.series[0].recent_observations[5].date = "2026-02-15";
  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: gapPair.previous,
        currentVintage: gapPair.current,
        detector: DETECTOR,
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "MISSING_HISTORY",
  );

  const orderPair = fixturePair();
  orderPair.current.source.release_availability.timestamp_utc = "2026-08-01T01:00:00Z";
  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: orderPair.previous,
        currentVintage: orderPair.current,
        detector: DETECTOR,
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "LOOK_AHEAD_RISK",
  );
});

test("reports revisions without replacing the earlier vintage", () => {
  const { previous, current } = fixturePair();
  const result = runShadowRehearsal({
    previousVintage: previous,
    currentVintage: current,
    detector: DETECTOR,
    generatedAt: "2026-09-08T03:00:00Z",
  });

  assert.equal(result.revision_summary.overlapping_observations, 12);
  assert.ok(result.revision_summary.changed_observations > 0);
  assert.equal(result.as_of.uses_only_current_vintage_for_signal, true);
  assert.equal(result.as_of.revisions_are_diagnostic_only, true);
});

test("labels synthetic pipeline rehearsal as non-validating at every level", () => {
  const { previous, current } = fixturePair();
  const originalCurrent = structuredClone(current);
  const result = runSyntheticPipelineRehearsal({
    previousVintage: previous,
    currentVintage: current,
    detector: DETECTOR,
    scenario: {
      id: "tail-decline-check",
      type: "linear-tail-decline",
      occupation_code: "5311",
      sa4_code: "101",
      months: 4,
      total_percent: -30,
    },
    generatedAt: "2026-09-08T03:00:00Z",
  });

  assert.equal(result.mode, "synthetic-pipeline-rehearsal");
  assert.equal(result.non_validating, true);
  assert.equal(result.validation_status, "non-validating-synthetic-rehearsal");
  assert.equal(result.public_use, "prohibited");
  assert.equal(result.results[0].synthetic, true);
  assert.equal(result.results[0].consequence, "none");
  assert.match(result.id, /tail-decline-check/);
  assert.match(result.synthetic_scenario.checksum, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.interpretation_limit, /pipeline mechanics only/i);
  assert.deepEqual(current, originalCurrent);
});

test("rejects unregistered detector authority and invalid synthetic scenarios", () => {
  const { previous, current } = fixturePair();
  assert.throws(
    () =>
      runShadowRehearsal({
        previousVintage: previous,
        currentVintage: current,
        detector: { ...DETECTOR, mode: "public-warning" },
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "INVALID_DETECTOR",
  );

  assert.throws(
    () =>
      runSyntheticPipelineRehearsal({
        previousVintage: previous,
        currentVintage: current,
        detector: DETECTOR,
        scenario: {
          id: "bad-scenario",
          type: "linear-tail-decline",
          occupation_code: "5311",
          sa4_code: "999",
          months: 4,
          total_percent: -30,
        },
        generatedAt: "2026-09-08T03:00:00Z",
      }),
    (error) => error instanceof RehearsalError && error.code === "INVALID_SCENARIO",
  );
});

test("rejects a detector registered after the evidence release", () => {
  const { previous, current } = fixturePair();
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: previous,
      currentVintage: current,
      detector: { ...DETECTOR, registered_at: "2026-09-02T01:00:00Z" },
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "LOOK_AHEAD_RISK",
  );
});

test("uses an evidenced UTC release instant for same-day chronology", () => {
  const before = fixturePair();
  assert.doesNotThrow(() => runShadowRehearsal({
    previousVintage: before.previous,
    currentVintage: before.current,
    detector: { ...DETECTOR, registered_at: "2026-09-02T00:59:59Z" },
    generatedAt: "2026-09-08T03:00:00Z",
  }));

  const after = fixturePair();
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: after.previous,
      currentVintage: after.current,
      detector: { ...DETECTOR, registered_at: "2026-09-02T01:00:01Z" },
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "LOOK_AHEAD_RISK",
  );
});

test("accepts a bounded first-seen interval only when chronology is provable", () => {
  const safelyBefore = fixturePair();
  safelyBefore.current.source.release_availability = {
    kind: "first-seen-interval",
    not_seen_as_of_utc: "2026-09-02T00:30:00Z",
    first_seen_at_utc: "2026-09-02T01:30:00Z",
    evidence: "Test fixture observation interval.",
  };
  assert.doesNotThrow(() => runShadowRehearsal({
    previousVintage: safelyBefore.previous,
    currentVintage: safelyBefore.current,
    detector: { ...DETECTOR, registered_at: "2026-09-02T00:29:59Z" },
    generatedAt: "2026-09-08T03:00:00Z",
  }));

  const insideInterval = fixturePair();
  insideInterval.current.source.release_availability = {
    kind: "first-seen-interval",
    not_seen_as_of_utc: "2026-09-02T00:30:00Z",
    first_seen_at_utc: "2026-09-02T01:30:00Z",
    evidence: "Test fixture observation interval.",
  };
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: insideInterval.previous,
      currentVintage: insideInterval.current,
      detector: { ...DETECTOR, registered_at: "2026-09-02T01:00:00Z" },
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "LOOK_AHEAD_RISK",
  );
});

test("fails closed when a first-seen record has no lower chronology bound", () => {
  const { previous, current } = fixturePair();
  current.source.release_availability = {
    kind: "first-seen-interval",
    not_seen_as_of_utc: null,
    first_seen_at_utc: "2026-09-02T01:00:00Z",
    evidence: "No earlier absence observation was recorded.",
  };
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: previous,
      currentVintage: current,
      detector: DETECTOR,
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "LOOK_AHEAD_RISK",
  );
});

test("fails closed when publication vintages skip a month", () => {
  const { previous } = fixturePair();
  const current = makeVintage({
    period: "2026-09",
    releasedAtUtc: "2026-10-07T01:00:00Z",
    retrievedAt: "2026-10-07T02:00:00Z",
    checksumCharacter: "c",
    dates: monthSequence(2025, 9, 13),
    values: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 950, 900, 850],
  });
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: previous,
      currentVintage: current,
      detector: DETECTOR,
      generatedAt: "2026-10-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "MISSING_VINTAGE",
  );
});

test("fails closed when review candidates exceed declared human capacity", () => {
  const { previous, current } = fixturePair();
  const previousSecond = structuredClone(previous.series[0]);
  const currentSecond = structuredClone(current.series[0]);
  previousSecond.sa4_code = "102";
  currentSecond.sa4_code = "102";
  previous.series.push(previousSecond);
  current.series.push(currentSecond);
  previous.scope.series_count = 2;
  current.scope.series_count = 2;

  assert.throws(
    () => runShadowRehearsal({
      previousVintage: previous,
      currentVintage: current,
      detector: { ...DETECTOR, maximum_review_candidates: 1 },
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError &&
      error.code === "REVIEW_CAPACITY_EXCEEDED" &&
      error.details.candidates === 2,
  );
});

test("rejects impossible calendar dates rather than normalising them", () => {
  const { previous, current } = fixturePair();
  current.source.release_availability.timestamp_utc = "2026-02-31T01:00:00Z";
  assert.throws(
    () => runShadowRehearsal({
      previousVintage: previous,
      currentVintage: current,
      detector: DETECTOR,
      generatedAt: "2026-09-08T03:00:00Z",
    }),
    (error) => error instanceof RehearsalError && error.code === "INVALID_SCHEMA",
  );
});
