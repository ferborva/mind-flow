import { assertForecastSemantics } from "./registry.mjs";

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
  if (!Number.isFinite(baselineScore) || baselineScore < 0) {
    throw new TypeError("baseline score must be a finite non-negative number");
  }
  if (baselineScore === 0) return null;
  return rounded(1 - score / baselineScore);
}

function brierSkillState(score, baselineScore) {
  if (baselineScore > 0) return "finite";
  return score === 0 ? "undefined_both_perfect" : "undefined_perfect_baseline";
}

export function scoreBinaryForecast(forecast) {
  if (forecast?.status !== "resolved" || forecast?.resolution?.status !== "resolved") {
    throw new TypeError("scoring requires a resolved forecast");
  }
  assertForecastSemantics(forecast);

  const y = outcome(forecast.resolution.outcome);
  const score = brierScore(forecast.probability, y);
  const baseline = brierScore(forecast.baseline?.probability, y);
  const naiveBaseline = brierScore(forecast.naive_baseline?.probability, y);

  return {
    outcome: y,
    brier: score,
    reference_class_baseline_brier: baseline,
    reference_class_brier_skill: brierSkillScore(score, baseline),
    reference_class_brier_skill_state: brierSkillState(score, baseline),
    naive_baseline_brier: naiveBaseline,
    naive_brier_skill: brierSkillScore(score, naiveBaseline),
    naive_brier_skill_state: brierSkillState(score, naiveBaseline),
    log_loss: binaryLogLoss(forecast.probability, y),
    reference_class_baseline_log_loss: binaryLogLoss(forecast.baseline.probability, y),
    naive_baseline_log_loss: binaryLogLoss(forecast.naive_baseline.probability, y),
  };
}
