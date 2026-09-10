import { evaluateForecastCohort as evaluateRegisteredCohort } from "../../lib/evaluation.mjs";
import { requireNeroResolutionAdmission } from "./resolution-intake.mjs";

// Current approved entry point for this separately issued campaign. The sealed
// core evaluator remains a compatibility primitive, not archive admission.
export function evaluateForecastCohort(plan, forecasts, options) {
  for (const forecast of forecasts) requireNeroResolutionAdmission(forecast);
  return evaluateRegisteredCohort(plan, forecasts, options);
}
