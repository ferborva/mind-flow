import { isDeepStrictEqual } from "node:util";

// One fixed, retained source-native cell. Render prose from this reviewed tuple;
// equality between two independently wrong prose strings is insufficient.
export const NERO_TARGET = Object.freeze({ occupation_code: "5311", occupation_name: "General Clerks",
  sa4_code: "102", sa4_name: "Central Coast", state_name: "NSW", date: "2026-10-15", count_baseline: 3092 });

export function neroTargetProse() {
  const t = NERO_TARGET;
  return {
    title: `October NERO ${t.occupation_name} employment stock in ${t.sa4_name} versus the frozen August count`,
    question: `Will the first retained October 2026 NERO release report at least ${t.count_baseline} employed persons for occupation ${t.occupation_code}, ${t.occupation_name}, in SA4 ${t.sa4_code}, ${t.sa4_name}?`,
    event: `The first retained October 2026 NERO value for ${t.occupation_name} in ${t.sa4_name} is at least ${t.count_baseline}.`,
    resolution_rule: `Retain the first October archive and first-presence receipt. Select exactly one CSV cell with anzsco4_code ${t.occupation_code}, sa4_code ${t.sa4_code} and date ${t.date}. Derive x/(x+${t.count_baseline}). Resolve 1 iff this is at least 0.5 (equivalently x>=${t.count_baseline}), else 0. No substitutions or later-vintage shopping; apply the prewritten resolution and void procedure.`,
  };
}

export function assertNeroTargetConsistency(forecast, protocol, resolverParameters, baselineParameters) {
  const t = NERO_TARGET;
  const prose = neroTargetProse();
  const require = (valid, message) => {
    if (!valid) {
      const error = new Error(`NERO native target/prose conflict: ${message}`);
      error.code = "NERO_NATIVE_TARGET_PROSE_CONFLICT";
      throw error;
    }
  };
  for (const field of ["title", "question"]) require(forecast?.[field] === prose[field], field);
  require(forecast?.target?.event === prose.event && protocol?.target?.event_definition === prose.event, "event");
  require(protocol?.target?.question === prose.question, "registered question");
  require(forecast?.target?.resolution_rule === prose.resolution_rule &&
    protocol?.target?.resolution_rule === prose.resolution_rule, "resolution rule must name the actual native cell and threshold");
  const scope = { geographies: [`SA4 ${t.sa4_code}: ${t.sa4_name}`],
    cohorts: [`ANZSCO4 ${t.occupation_code}: ${t.occupation_name}`],
    services: ["Modelled employment stock, exposure context only"] };
  require(isDeepStrictEqual(forecast?.target?.scope, scope) && isDeepStrictEqual(protocol?.target?.scope, scope), "scope");
  for (const [field, prefix, suffix] of [["signal_id", "signal", "bounded-stock"],
    ["metric_id", "metric", "bounded-stock"], ["condition_id", "condition", "stock"]]) {
    require(forecast?.target?.[field] === `${prefix}.nero.${t.occupation_code}.${t.sa4_code}.${suffix}`, field);
  }
  require(forecast?.target?.resolver?.operator === "gte" && forecast.target.resolver.threshold === 0.5, "binary threshold");
  for (const field of ["occupation_code", "sa4_code", "date", "count_baseline"]) {
    require(resolverParameters?.[field] === t[field], `native resolver ${field}`);
  }
  require(Array.isArray(baselineParameters) && baselineParameters.length === 2, "both baseline parameter records");
  const expectedBaseline = { occupation_code: t.occupation_code, sa4_code: t.sa4_code,
    first_month: "2024-08", last_month: "2026-08", horizon_months: 2 };
  for (const parameters of baselineParameters) require(isDeepStrictEqual(parameters, expectedBaseline), "baseline cell/window");
  require(forecast?.target?.observation_window_start === "2026-10-01T00:00:00Z" &&
    forecast.target.observation_window_end === "2026-10-31T23:59:59Z", "native observation month");
  return true;
}
