function validateCosts(costs) {
  for (const name of ["falsePositive", "falseNegative"]) {
    if (!Number.isFinite(costs?.[name]) || costs[name] < 0) {
      throw new Error(`${name} cost must be a finite non-negative number.`);
    }
  }
}

function evaluate(rows, policy) {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;

  for (const row of rows) {
    const alert = policy === "no_alert" ? false : row.alert;
    if (alert && row.event) truePositive += 1;
    if (alert && !row.event) falsePositive += 1;
    if (!alert && row.event) falseNegative += 1;
    if (!alert && !row.event) trueNegative += 1;
  }
  return { truePositive, falsePositive, falseNegative, trueNegative };
}

function score(confusion, costs, eligible) {
  const predictedPositive = confusion.truePositive + confusion.falsePositive;
  const loss = confusion.falsePositive * costs.falsePositive +
    confusion.falseNegative * costs.falseNegative;
  const netUtility = loss === 0 ? 0 : -loss;
  return {
    ...confusion,
    precision: predictedPositive === 0 ? null : confusion.truePositive / predictedPositive,
    precision_reason: predictedPositive === 0
      ? "No predicted positives; precision is undefined."
      : null,
    net_utility: netUtility,
    net_utility_per_eligible_outcome: netUtility / eligible,
  };
}

export function compareDecisionPolicies(outcomes, costs) {
  validateCosts(costs);
  if (!Array.isArray(outcomes)) throw new Error("outcomes must be an array.");
  for (const [index, row] of outcomes.entries()) {
    if (typeof row?.alert !== "boolean" || ![true, false, null].includes(row.event)) {
      throw new Error(`outcomes[${index}] must contain boolean alert and boolean or null event.`);
    }
  }

  const eligible = outcomes.filter(({ event }) => event !== null);
  const censoredOutcomes = outcomes.length - eligible.length;
  if (eligible.length === 0) {
    const unevaluated = {
      truePositive: 0,
      falsePositive: 0,
      falseNegative: 0,
      trueNegative: 0,
      precision: null,
      precision_reason: "No predicted positives; precision is undefined.",
      net_utility: null,
      net_utility_per_eligible_outcome: null,
    };
    return {
      status: "insufficient_evidence",
      primary_metric: "net_decision_utility",
      eligible_outcomes: 0,
      censored_outcomes: censoredOutcomes,
      candidate: { ...unevaluated },
      no_alert: { ...unevaluated },
      preferred_policy: null,
    };
  }

  const candidate = score(evaluate(eligible, "candidate"), costs, eligible.length);
  const noAlert = score(evaluate(eligible, "no_alert"), costs, eligible.length);
  const preferredPolicy = candidate.net_utility === noAlert.net_utility
    ? "tie"
    : candidate.net_utility > noAlert.net_utility
      ? "candidate"
      : "no_alert";

  return {
    status: "evaluated",
    primary_metric: "net_decision_utility",
    eligible_outcomes: eligible.length,
    censored_outcomes: censoredOutcomes,
    candidate,
    no_alert: noAlert,
    preferred_policy: preferredPolicy,
  };
}
