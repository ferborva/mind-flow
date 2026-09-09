import { createHash } from "node:crypto";

const ENGINE_VERSION = "1.0.0";
const SOURCE_PUBLISHER = "Jobs and Skills Australia";
const SOURCE_TITLE = "Nowcast of Employment by Region and Occupation";
const OCCUPATION_CLASSIFICATION = "ANZSCO 2013 version 1.3, 4-digit";
const GEOGRAPHY_CLASSIFICATION = "ASGS 2021 SA4, place of residence";
const CHECKSUM_PATTERN = /^sha256:[a-f0-9]{64}$/;
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export class RehearsalError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RehearsalError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new RehearsalError(code, message, details);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, path) {
  if (!isObject(value)) {
    fail("INVALID_SCHEMA", `${path} must be an object.`, { path });
  }
}

function requireString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    fail("INVALID_SCHEMA", `${path} must be a non-empty string.`, { path });
  }
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function parseTimestamp(value, path, pattern = DATETIME_PATTERN) {
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    !isCalendarDate(value.slice(0, 10)) ||
    Number.isNaN(Date.parse(value))
  ) {
    fail("INVALID_SCHEMA", `${path} must be a valid timestamp.`, { path, value });
  }
  return Date.parse(value);
}

function validateReleaseAvailability(value, path) {
  requireObject(value, path);
  requireString(value.kind, `${path}.kind`);
  requireString(value.evidence, `${path}.evidence`);

  if (value.kind === "verified-publisher-timestamp") {
    const timestamp = parseTimestamp(value.timestamp_utc, `${path}.timestamp_utc`);
    return {
      kind: value.kind,
      earliestExclusive: null,
      exact: timestamp,
      latest: timestamp,
    };
  }

  if (value.kind === "first-seen-interval") {
    const latest = parseTimestamp(value.first_seen_at_utc, `${path}.first_seen_at_utc`);
    const earliestExclusive = value.not_seen_as_of_utc === null
      ? null
      : parseTimestamp(value.not_seen_as_of_utc, `${path}.not_seen_as_of_utc`);
    if (earliestExclusive !== null && earliestExclusive >= latest) {
      fail("INVALID_SCHEMA", `${path} must put the absence observation before first sighting.`, {
        path,
      });
    }
    return {
      kind: value.kind,
      earliestExclusive,
      exact: null,
      latest,
    };
  }

  fail("INVALID_SCHEMA", `${path}.kind is unsupported.`, { path, kind: value.kind });
}

function canonicalise(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalise);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalise(value[key])]),
    );
  }
  return value;
}

export function computeRecordChecksum(value) {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalise(value)))
    .digest("hex");
  return `sha256:${digest}`;
}

function periodNumber(period) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

function monthNumber(date) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  return year * 12 + month - 1;
}

function seriesKey(series) {
  return `${series.occupation_code}:${series.sa4_code}`;
}

function validatePoint(point, path) {
  requireObject(point, path);
  if (!isCalendarDate(point.date)) {
    fail("INVALID_SCHEMA", `${path}.date must be an ISO date.`, { path, value: point.date });
  }
  if (point.status !== "reported-modelled-estimate") {
    fail("MISSING_HISTORY", `${path} is not an available modelled estimate.`, {
      path,
      status: point.status,
    });
  }
  if (!Number.isInteger(point.value) || point.value < 0) {
    fail("MISSING_HISTORY", `${path}.value must be an available non-negative integer.`, {
      path,
      value: point.value,
    });
  }
}

function declaredComparisonValues(series) {
  const values = new Map();
  for (const change of [series.change_12m, series.change_60m]) {
    if (isObject(change) && isCalendarDate(change.from_date) &&
        Number.isInteger(change.from_value) && change.from_value >= 0) {
      values.set(change.from_date, change.from_value);
    }
  }
  return values;
}

function verifiedTrailingObservations(series, path) {
  const observations = series.recent_observations;
  let start = observations.length - 1;
  while (start > 0 &&
      monthNumber(observations[start].date) === monthNumber(observations[start - 1].date) + 1) {
    start -= 1;
  }
  const detached = observations.slice(0, start);
  const comparisons = declaredComparisonValues(series);
  if (detached.some((point) => comparisons.get(point.date) !== point.value)) {
    fail("MISSING_HISTORY", `${path} is not a verified contiguous trailing history.`, {
      path,
      detached_dates: detached.map(({ date }) => date),
    });
  }
  return observations.slice(start);
}

function validateSeries(series, path) {
  requireObject(series, path);
  for (const field of ["occupation_code", "occupation_name", "state_name", "sa4_code", "sa4_name"]) {
    requireString(series[field], `${path}.${field}`);
  }
  if (!/^\d{4}$/.test(series.occupation_code) || !/^\d{3}$/.test(series.sa4_code)) {
    fail("INVALID_SCHEMA", `${path} has an invalid occupation or SA4 code.`, { path });
  }
  if (!Array.isArray(series.recent_observations) || series.recent_observations.length === 0) {
    fail("MISSING_HISTORY", `${path}.recent_observations must not be empty.`, { path });
  }

  let previousMonth;
  const seenDates = new Set();
  series.recent_observations.forEach((point, index) => {
    const pointPath = `${path}.recent_observations[${index}]`;
    validatePoint(point, pointPath);
    if (seenDates.has(point.date)) {
      fail("MISSING_HISTORY", `${path} contains a duplicate reference date.`, {
        path,
        date: point.date,
      });
    }
    seenDates.add(point.date);
    const currentMonth = monthNumber(point.date);
    if (previousMonth !== undefined && currentMonth <= previousMonth) {
      fail("MISSING_HISTORY", `${path} history must be strictly increasing.`, {
        path,
        previous_date: series.recent_observations[index - 1].date,
        current_date: point.date,
      });
    }
    previousMonth = currentMonth;
  });

  validatePoint(series.latest, `${path}.latest`);
  const finalPoint = series.recent_observations.at(-1);
  if (
    series.latest.date !== finalPoint.date ||
    series.latest.value !== finalPoint.value ||
    series.latest.status !== finalPoint.status
  ) {
    fail("INVALID_SCHEMA", `${path}.latest must match the final recent observation.`, { path });
  }
  verifiedTrailingObservations(series, path);
}

function validateVintage(vintage, label) {
  requireObject(vintage, label);
  if (vintage.schema_version !== "1.0.0") {
    fail("INVALID_SCHEMA", `${label}.schema_version is unsupported.`, { label });
  }
  if (vintage.epistemic_class !== "modelled-estimate" || vintage.measurement_type !== "modelled-nowcast") {
    fail("INVALID_SCHEMA", `${label} must retain the modelled NERO evidence class.`, { label });
  }
  for (const field of ["id", "title", "public_warning", "interpretation_limit", "revision_policy"]) {
    requireString(vintage[field], `${label}.${field}`);
  }

  requireObject(vintage.source, `${label}.source`);
  const source = vintage.source;
  if (source.publisher !== SOURCE_PUBLISHER || source.title !== SOURCE_TITLE) {
    fail("INVALID_SCHEMA", `${label}.source is not the registered NERO source.`, { label });
  }
  for (const field of ["licence", "archive_url", "archive_name", "release_period", "released_at", "retrieved_at", "checksum"]) {
    requireString(source[field], `${label}.source.${field}`);
  }
  requireObject(source.release_availability, `${label}.source.release_availability`);
  if (!PERIOD_PATTERN.test(source.release_period)) {
    fail("INVALID_SCHEMA", `${label}.source.release_period is invalid.`, { label });
  }
  if (source.archive_name !== `${source.release_period}_nero.zip`) {
    fail("INVALID_SCHEMA", `${label}.source.archive_name does not match release_period.`, { label });
  }
  if (!source.archive_url.startsWith("https://www.jobsandskills.gov.au/")) {
    fail("INVALID_SCHEMA", `${label}.source.archive_url is not an official JSA URL.`, { label });
  }
  if (!CHECKSUM_PATTERN.test(source.checksum)) {
    fail("INVALID_SCHEMA", `${label}.source.checksum must be a SHA-256 value.`, { label });
  }
  if (!isCalendarDate(source.released_at)) {
    fail("INVALID_SCHEMA", `${label}.source.released_at must be a valid ISO date.`, {
      label,
      value: source.released_at,
    });
  }
  const releaseAvailability = validateReleaseAvailability(
    source.release_availability,
    `${label}.source.release_availability`,
  );
  const retrievedAt = parseTimestamp(source.retrieved_at, `${label}.source.retrieved_at`);
  if (retrievedAt < releaseAvailability.latest) {
    fail("INVALID_SCHEMA", `${label} was retrieved before its evidenced publication availability.`, {
      label,
    });
  }

  requireObject(vintage.scope, `${label}.scope`);
  if (
    vintage.scope.occupation_classification !== OCCUPATION_CLASSIFICATION ||
    vintage.scope.geography_classification !== GEOGRAPHY_CLASSIFICATION
  ) {
    fail("INVALID_SCHEMA", `${label} uses an unsupported classification.`, { label });
  }
  if (vintage.scope.occupation_classification_verification_status !==
        "unverified_external_review_required") {
    fail(
      "INVALID_SCHEMA",
      `${label}.scope occupation classification must remain explicitly unverified.`,
      { label },
    );
  }
  if (!Array.isArray(vintage.scope.occupation_codes) || vintage.scope.occupation_codes.length === 0) {
    fail("INVALID_SCHEMA", `${label}.scope.occupation_codes must not be empty.`, { label });
  }
  if (!Array.isArray(vintage.series) || vintage.series.length === 0) {
    fail("INVALID_SCHEMA", `${label}.series must not be empty.`, { label });
  }
  if (vintage.scope.series_count !== vintage.series.length) {
    fail("INVALID_SCHEMA", `${label}.scope.series_count does not match series length.`, { label });
  }

  const keys = new Set();
  vintage.series.forEach((series, index) => {
    validateSeries(series, `${label}.series[${index}]`);
    const key = seriesKey(series);
    if (keys.has(key)) {
      fail("INVALID_SCHEMA", `${label} contains duplicate series.`, { label, key });
    }
    keys.add(key);
    if (!vintage.scope.occupation_codes.includes(series.occupation_code)) {
      fail("INVALID_SCHEMA", `${label} contains an occupation outside its declared scope.`, {
        label,
        key,
      });
    }
    if (series.latest.date.slice(0, 7) !== source.release_period) {
      fail("INVALID_SCHEMA", `${label} latest series date does not match release_period.`, {
        label,
        key,
      });
    }
  });

  return {
    keys,
    releaseAvailability,
    retrievedAt,
  };
}

function validateDetector(detector) {
  requireObject(detector, "detector");
  if (
    detector.schema_version !== "1.0.0" ||
    detector.mode !== "no-consequence-review" ||
    typeof detector.id !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(detector.id) ||
    typeof detector.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(detector.version) ||
    typeof detector.registered_by !== "string" ||
    detector.registered_by.length === 0 ||
    detector.target !== "descriptive-employment-review-candidate" ||
    detector.bounded_action !== "human evidence review only; no publication or consequence" ||
    !Number.isInteger(detector.maximum_review_candidates) ||
    detector.maximum_review_candidates < 1 ||
    typeof detector.false_positive_cost !== "string" ||
    detector.false_positive_cost.length === 0 ||
    typeof detector.false_negative_cost !== "string" ||
    detector.false_negative_cost.length === 0 ||
    !Number.isInteger(detector.lookback_months) ||
    detector.lookback_months < 1 ||
    !Number.isInteger(detector.run_months) ||
    detector.run_months < 1 ||
    detector.run_months > detector.lookback_months ||
    typeof detector.annual_change_at_or_below_percent !== "number" ||
    !Number.isFinite(detector.annual_change_at_or_below_percent) ||
    detector.annual_change_at_or_below_percent >= 0
  ) {
    fail("INVALID_DETECTOR", "Detector must be a fixed no-consequence review rule.");
  }
  return { registeredAt: parseTimestamp(detector.registered_at, "detector.registered_at") };
}

function compareCoverage(previousValidation, currentValidation) {
  const missingFromCurrent = [...previousValidation.keys].filter((key) => !currentValidation.keys.has(key));
  const newInCurrent = [...currentValidation.keys].filter((key) => !previousValidation.keys.has(key));
  if (missingFromCurrent.length > 0 || newInCurrent.length > 0) {
    fail("SERIES_COVERAGE_MISMATCH", "Vintage series coverage changed.", {
      missing_from_current: missingFromCurrent,
      new_in_current: newInCurrent,
    });
  }
}

function releaseDefinitelyFollows(current, previous) {
  const lowerBound = current.exact ?? current.earliestExclusive;
  return lowerBound !== null && lowerBound > previous.latest;
}

function detectorDefinitelyPredates(detectorTimestamp, releaseAvailability) {
  if (releaseAvailability.exact !== null) {
    return detectorTimestamp < releaseAvailability.exact;
  }
  return releaseAvailability.earliestExclusive !== null &&
    detectorTimestamp <= releaseAvailability.earliestExclusive;
}

function validateRunInputs({ previousVintage, currentVintage, detector, generatedAt }) {
  const detectorValidation = validateDetector(detector);
  const previousValidation = validateVintage(previousVintage, "previousVintage");
  const currentValidation = validateVintage(currentVintage, "currentVintage");
  compareCoverage(previousValidation, currentValidation);

  if (
    periodNumber(currentVintage.source.release_period) !== periodNumber(previousVintage.source.release_period) + 1
  ) {
    fail("MISSING_VINTAGE", "Shadow rehearsal requires consecutive publication periods.", {
      previous_period: previousVintage.source.release_period,
      current_period: currentVintage.source.release_period,
    });
  }
  if (!releaseDefinitelyFollows(
    currentValidation.releaseAvailability,
    previousValidation.releaseAvailability,
  )) {
    fail(
      "LOOK_AHEAD_RISK",
      "Evidence does not prove that the current vintage became available after the previous vintage.",
    );
  }
  if (!detectorDefinitelyPredates(
    detectorValidation.registeredAt,
    currentValidation.releaseAvailability,
  )) {
    fail("LOOK_AHEAD_RISK", "Detector registration is not proven to predate evidence availability.", {
      registered_at: detector.registered_at,
      release_availability: currentVintage.source.release_availability,
    });
  }
  if (currentVintage.source.checksum === previousVintage.source.checksum) {
    fail("PROVENANCE_COLLISION", "Distinct release periods cannot share the same source checksum.");
  }

  const generatedTimestamp = parseTimestamp(generatedAt, "generatedAt");
  if (generatedTimestamp < currentValidation.retrievedAt) {
    fail("LOOK_AHEAD_RISK", "The rehearsal cannot predate retrieval of its current evidence.");
  }
}

function round(value, places = 6) {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function consecutiveDeclines(observations) {
  let count = 0;
  for (let index = observations.length - 1; index > 0; index -= 1) {
    if (observations[index].value < observations[index - 1].value) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function evaluateSeries(series, detector, releasePeriod, synthetic) {
  const observations = verifiedTrailingObservations(series, `series ${seriesKey(series)}`);
  const requiredPoints = Math.max(detector.lookback_months, detector.run_months) + 1;
  if (observations.length < requiredPoints) {
    fail("INSUFFICIENT_HISTORY", "A series lacks the registered detector history.", {
      key: seriesKey(series),
      required_points: requiredPoints,
      available_points: observations.length,
    });
  }

  const current = observations.at(-1);
  const comparison = observations.at(-1 - detector.lookback_months);
  if (comparison.value === 0) {
    fail("INSUFFICIENT_HISTORY", "A percentage-change baseline is zero.", {
      key: seriesKey(series),
      date: comparison.date,
    });
  }
  const annualChange = round(((current.value - comparison.value) / comparison.value) * 100);
  const declineRun = consecutiveDeclines(observations);
  const meetsCondition =
    annualChange <= detector.annual_change_at_or_below_percent &&
    declineRun >= detector.run_months;

  return {
    occupation_code: series.occupation_code,
    occupation_name: series.occupation_name,
    state_name: series.state_name,
    sa4_code: series.sa4_code,
    sa4_name: series.sa4_name,
    state: meetsCondition ? "review-candidate" : "below-condition",
    consequence: "none",
    synthetic,
    release_period: releasePeriod,
    signal: {
      annual_change_percent: annualChange,
      annual_change_threshold_percent: detector.annual_change_at_or_below_percent,
      consecutive_declines: declineRun,
      required_consecutive_declines: detector.run_months,
    },
    evidence_window: {
      from_date: comparison.date,
      to_date: current.date,
      from_value: comparison.value,
      to_value: current.value,
    },
    interpretation: synthetic
      ? "Synthetic rule result for pipeline rehearsal only."
      : meetsCondition
        ? "The modelled series met the registered descriptive review condition."
        : "The modelled series did not meet the registered descriptive review condition.",
  };
}

function flattenObservations(vintage) {
  const map = new Map();
  for (const series of vintage.series) {
    const key = seriesKey(series);
    for (const point of series.recent_observations) {
      map.set(`${key}:${point.date}`, point.value);
    }
  }
  return map;
}

function revisionSummary(previousVintage, currentVintage, synthetic) {
  const previous = flattenObservations(previousVintage);
  const current = flattenObservations(currentVintage);
  let overlapping = 0;
  let changed = 0;
  let maxAbsolute = 0;
  let maxRelativePercent = 0;

  for (const [key, priorValue] of previous) {
    if (!current.has(key)) {
      continue;
    }
    overlapping += 1;
    const currentValue = current.get(key);
    const absolute = currentValue - priorValue;
    if (absolute !== 0) {
      changed += 1;
    }
    maxAbsolute = Math.max(maxAbsolute, Math.abs(absolute));
    maxRelativePercent = Math.max(
      maxRelativePercent,
      Math.abs(absolute) / Math.max(Math.abs(priorValue), 1) * 100,
    );
  }

  if (overlapping === 0) {
    fail("MISSING_HISTORY", "Vintages have no overlapping observations for revision diagnostics.");
  }

  return {
    synthetic,
    interpretation: synthetic
      ? "Synthetic comparison for pipeline mechanics only."
      : "Difference between the prior and current immutable publication records. It is diagnostic and does not replace the earlier record.",
    overlapping_observations: overlapping,
    changed_observations: changed,
    maximum_absolute_revision: maxAbsolute,
    maximum_relative_revision_percent: round(maxRelativePercent),
  };
}

function provenanceRecord(vintage) {
  return {
    release_period: vintage.source.release_period,
    publisher_release_date: vintage.source.released_at,
    release_availability: structuredClone(vintage.source.release_availability),
    retrieved_at: vintage.source.retrieved_at,
    archive_url: vintage.source.archive_url,
    archive_name: vintage.source.archive_name,
    source_checksum: vintage.source.checksum,
    record_checksum: computeRecordChecksum(vintage),
    evidence_class: vintage.epistemic_class,
    measurement_type: vintage.measurement_type,
    occupation_classification: vintage.scope.occupation_classification,
    occupation_classification_verification_status:
      vintage.scope.occupation_classification_verification_status,
  };
}

function runCore({ previousVintage, currentVintage, detector, generatedAt, synthetic }) {
  validateRunInputs({ previousVintage, currentVintage, detector, generatedAt });
  const results = currentVintage.series
    .map((series) => evaluateSeries(series, detector, currentVintage.source.release_period, synthetic))
    .sort((left, right) =>
      `${left.occupation_code}:${left.sa4_code}`.localeCompare(`${right.occupation_code}:${right.sa4_code}`),
    );
  const candidateCount = results.filter(({ state }) => state === "review-candidate").length;
  if (candidateCount > detector.maximum_review_candidates) {
    fail("REVIEW_CAPACITY_EXCEEDED", "Review candidates exceed the detector's declared human capacity.", {
      candidates: candidateCount,
      maximum_candidates: detector.maximum_review_candidates,
      consequence: "none",
    });
  }

  return {
    schema_version: "1.0.0",
    id: `nero-${synthetic ? "synthetic" : "shadow"}-${currentVintage.source.release_period}-${detector.id}`,
    generated_at: generatedAt,
    engine_version: ENGINE_VERSION,
    mode: synthetic ? "synthetic-pipeline-rehearsal" : "prospective-shadow-rehearsal",
    epistemic_class: synthetic ? "synthetic-rehearsal" : "modelled-shadow-review",
    authority: "no-consequence",
    public_use: "prohibited",
    non_validating: synthetic,
    validation_status: synthetic
      ? "non-validating-synthetic-rehearsal"
      : "not-a-validated-warning",
    interpretation_limit: synthetic
      ? "Synthetic values test pipeline mechanics only. They do not validate predictive performance or justify action."
      : "This is a descriptive review-rule output from modelled employment estimates. It does not establish why employment changed or justify action.",
    as_of: {
      decision_release_period: currentVintage.source.release_period,
      publisher_release_date: currentVintage.source.released_at,
      decision_release_availability: structuredClone(currentVintage.source.release_availability),
      uses_only_current_vintage_for_signal: true,
      revisions_are_diagnostic_only: true,
    },
    provenance: {
      previous: provenanceRecord(previousVintage),
      current: provenanceRecord(currentVintage),
      detector: {
        id: detector.id,
        version: detector.version,
        mode: detector.mode,
        registered_at: detector.registered_at,
        registered_by: detector.registered_by,
        config_checksum: computeRecordChecksum(detector),
      },
    },
    review_capacity: {
      candidates: candidateCount,
      maximum_candidates: detector.maximum_review_candidates,
      within_limit: true,
      bounded_action: detector.bounded_action,
    },
    revision_summary: revisionSummary(previousVintage, currentVintage, synthetic),
    results,
  };
}

export function runShadowRehearsal({
  previousVintage,
  currentVintage,
  detector,
  generatedAt = new Date().toISOString(),
}) {
  return runCore({
    previousVintage: structuredClone(previousVintage),
    currentVintage: structuredClone(currentVintage),
    detector: structuredClone(detector),
    generatedAt,
    synthetic: false,
  });
}

function applySyntheticScenario(vintage, scenario) {
  requireObject(scenario, "scenario");
  if (
    typeof scenario.id !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.id) ||
    scenario.type !== "linear-tail-decline" ||
    typeof scenario.occupation_code !== "string" ||
    typeof scenario.sa4_code !== "string" ||
    !Number.isInteger(scenario.months) ||
    scenario.months < 1 ||
    typeof scenario.total_percent !== "number" ||
    !Number.isFinite(scenario.total_percent) ||
    scenario.total_percent >= 0 ||
    scenario.total_percent <= -100
  ) {
    fail("INVALID_SCENARIO", "Synthetic scenario is not a registered linear tail decline.");
  }

  const target = vintage.series.find(
    (series) =>
      series.occupation_code === scenario.occupation_code &&
      series.sa4_code === scenario.sa4_code,
  );
  if (!target || scenario.months >= target.recent_observations.length) {
    fail("INVALID_SCENARIO", "Synthetic scenario target or history is unavailable.", {
      occupation_code: scenario.occupation_code,
      sa4_code: scenario.sa4_code,
    });
  }

  const startIndex = target.recent_observations.length - scenario.months;
  const anchor = target.recent_observations[startIndex - 1].value;
  for (let offset = 1; offset <= scenario.months; offset += 1) {
    const multiplier = 1 + (scenario.total_percent / 100) * (offset / scenario.months);
    target.recent_observations[startIndex + offset - 1].value = Math.max(
      0,
      Math.round(anchor * multiplier),
    );
  }
  target.latest = { ...target.recent_observations.at(-1) };
  return vintage;
}

export function runSyntheticPipelineRehearsal({
  previousVintage,
  currentVintage,
  detector,
  scenario,
  generatedAt = new Date().toISOString(),
}) {
  const originalCurrent = structuredClone(currentVintage);
  const syntheticCurrent = applySyntheticScenario(structuredClone(currentVintage), structuredClone(scenario));
  const result = runCore({
    previousVintage: structuredClone(previousVintage),
    currentVintage: syntheticCurrent,
    detector: structuredClone(detector),
    generatedAt,
    synthetic: true,
  });

  result.provenance.current.record_checksum = computeRecordChecksum(originalCurrent);
  result.provenance.current.synthetic_record_checksum = computeRecordChecksum(syntheticCurrent);
  result.id = `${result.id}-${scenario.id}`;
  result.synthetic_scenario = {
    ...structuredClone(scenario),
    checksum: computeRecordChecksum(scenario),
    label: "non-validating synthetic pipeline rehearsal",
  };
  return result;
}
