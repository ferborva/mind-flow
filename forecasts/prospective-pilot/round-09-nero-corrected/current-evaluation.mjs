import { evaluateForecastCohort as evaluateRegisteredCohort } from "../../lib/evaluation.mjs";
import { requireNeroResolutionAdmission } from "./resolution-intake.mjs";
import { rejectDisclosedNeroTargetError } from "../round-09-nero/issue-error-intake.mjs";

export function evaluateForecastCohort(plan, forecasts, options) {
  for (const forecast of forecasts) {
    rejectDisclosedNeroTargetError(forecast);
    requireNeroResolutionAdmission(forecast);
  }
  return evaluateRegisteredCohort(plan, forecasts, options);
}
