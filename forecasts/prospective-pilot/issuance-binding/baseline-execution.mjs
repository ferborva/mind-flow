// Fixed, auditable computation. Supplied implementation bytes are checked by
// the adapter, never imported or evaluated as caller-controlled code.
const algorithms = new Set(["mind-flow.nero-two-month-direction", "mind-flow.equal-probability"]);

function monthIndex(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")) throw new TypeError("exact calendar month required");
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
}

function rationalSixPlaces(numerator, denominator) {
  const scaled = BigInt(numerator) * 1_000_000n;
  const divisor = BigInt(denominator);
  let quotient = scaled / divisor;
  const twiceRemainder = 2n * (scaled % divisor);
  if (twiceRemainder > divisor || (twiceRemainder === divisor && quotient % 2n === 1n)) quotient += 1n;
  return Number(quotient) / 1_000_000;
}

export function runNeroBaseline(algorithmId, document, parameters) {
  if (!algorithms.has(algorithmId)) throw new TypeError("unsupported baseline algorithm");
  const fields = ["first_month", "horizon_months", "last_month", "occupation_code", "sa4_code"];
  if (!parameters || JSON.stringify(Object.keys(parameters).sort()) !== JSON.stringify(fields) ||
      parameters.horizon_months !== 2 || !/^\d{4}$/.test(parameters.occupation_code) ||
      !/^\d{3}$/.test(parameters.sa4_code)) throw new TypeError("invalid fixed baseline parameters");
  const first = monthIndex(parameters.first_month);
  const last = monthIndex(parameters.last_month);
  if (last - first < 2 || last - first > 120) throw new TypeError("baseline window must contain 3 to 121 months");
  const selected = document?.series?.filter((series) =>
    series.occupation_code === parameters.occupation_code && series.sa4_code === parameters.sa4_code);
  if (selected?.length !== 1) throw new TypeError("baseline requires exactly one selected NERO series");
  const observations = selected[0].recent_observations;
  if (!Array.isArray(observations)) throw new TypeError("baseline observations required");
  const values = new Map();
  for (const observation of observations) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-15$/.test(observation.date ?? "")) throw new TypeError("NERO date label must be YYYY-MM-15");
    const month = monthIndex(observation.date.slice(0, 7));
    if (month < first || month > last) continue;
    if (!Number.isSafeInteger(observation.value) || observation.value < 0 || values.has(month)) {
      throw new TypeError("baseline values must be unique nonnegative integer estimates");
    }
    values.set(month, observation.value);
  }
  if (values.size !== last - first + 1) throw new TypeError("baseline months must be consecutive and complete");
  if (algorithmId === "mind-flow.equal-probability") return 0.5;
  let successes = 0;
  const comparisons = last - first - 1;
  for (let month = first + 2; month <= last; month += 1) {
    if (values.get(month) >= values.get(month - 2)) successes += 1;
  }
  return rationalSixPlaces(successes + 1, comparisons + 2);
}
