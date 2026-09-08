function probability(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be a finite probability between 0 and 1`);
  }
  return value;
}

function outcome(value) {
  if (value !== 0 && value !== 1) {
    throw new TypeError("outcome must be 0 or 1");
  }
  return value;
}

function rounded(value) {
  return Number(value.toFixed(12));
}

export function brierScore(forecastProbability, observedOutcome) {
  const p = probability(forecastProbability, "forecast probability");
  const y = outcome(observedOutcome);
  return rounded((p - y) ** 2);
}

export function binaryLogLoss(forecastProbability, observedOutcome) {
  const p = probability(forecastProbability, "forecast probability");
  const y = outcome(observedOutcome);
  const likelihood = y === 1 ? p : 1 - p;
  return likelihood === 0 ? Number.POSITIVE_INFINITY : -Math.log(likelihood);
}

export function brierSkillScore(score, baselineScore) {
  if (!Number.isFinite(score) || score < 0) {
    throw new TypeError("score must be a finite non-negative number");
  }
  if (!Number.isFinite(baselineScore) || baselineScore <= 0) {
    throw new TypeError("baseline score must be a finite number greater than zero");
  }
  return rounded(1 - score / baselineScore);
}

export function scoreBinaryForecast(forecast) {
  if (forecast?.status !== "resolved" || forecast?.resolution?.status !== "resolved") {
    throw new TypeError("scoring requires a resolved forecast");
  }

  const y = outcome(forecast.resolution.outcome);
  const score = brierScore(forecast.probability, y);
  const baseline = brierScore(forecast.baseline?.probability, y);

  return {
    outcome: y,
    brier: score,
    baseline_brier: baseline,
    brier_skill: brierSkillScore(score, baseline),
    log_loss: binaryLogLoss(forecast.probability, y),
    baseline_log_loss: binaryLogLoss(forecast.baseline.probability, y),
  };
}
