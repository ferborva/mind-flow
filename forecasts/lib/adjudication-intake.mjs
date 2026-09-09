import { normalizedIdentity } from "./identity.mjs";

// Additional admission policy, not a change to the sealed Unicode comparator.
// Substring rejection is deliberately conservative and may reject distinct people.
// Passing it neither authenticates a person nor establishes their appointment.
function comparisonSkeleton(value) {
  return normalizedIdentity(value)?.normalize("NFD").replace(/\p{Mn}/gu, "")
    .replace(/[\p{P}\p{White_Space}]/gu, "") || "";
}

export function assertAdjudicationIntake(forecast) {
  if (forecast?.status !== "void") return null;
  const adjudicator = comparisonSkeleton(forecast.resolution?.adjudication?.claimed_adjudicator_id);
  if (!adjudicator) throw new Error("claimed void adjudicator must have a nonempty comparison identity");
  const authors = [forecast.provenance?.author, forecast.history?.[0]?.actor]
    .map(comparisonSkeleton).filter(Boolean);
  if (authors.some((author) => adjudicator.includes(author))) {
    throw new Error("claimed void adjudicator identity must not contain the forecaster or issuer identity");
  }
  return { appointment_verified: false, identity_authenticated: false };
}
