import { isDeepStrictEqual } from "node:util";

const IMMUTABLE_ISSUE_FIELDS = [
  "schema_version",
  "id",
  "epistemic_class",
  "title",
  "question",
  "issued_at",
  "resolve_after",
  "resolve_by",
  "probability",
  "target",
  "baseline",
  "method",
  "data_vintages",
  "provenance",
  "assumptions",
  "counter_hypotheses",
];

const LIFECYCLE = new Set(["issued", "resolved", "void"]);
const RESOLUTION_STATUS = Object.freeze({
  issued: "pending",
  resolved: "resolved",
  void: "void",
});
const HISTORY_EVENTS = Object.freeze({
  issued: ["issued"],
  resolved: ["issued", "resolved"],
  void: ["issued", "voided"],
});
const SHA256 = /^sha256:[a-f0-9]{64}$/;

function calendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.getTime();
}

function instant(value, label) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(
    value || "",
  );
  if (!match || calendarDate(match[1]) === null) {
    throw new TypeError(`${label} must be an exact RFC 3339 instant on a real calendar date`);
  }
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  const zone = match[5];
  const zoneHour = zone === "Z" ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone === "Z" ? 0 : Number(zone.slice(4, 6));
  const parsed = Date.parse(value);
  if (
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    zoneHour > 23 ||
    zoneMinute > 59 ||
    !Number.isFinite(parsed)
  ) {
    throw new TypeError(`${label} must be an exact RFC 3339 instant on a real calendar date`);
  }
  return parsed;
}

function contentAddressedEvidence(evidence, label) {
  if (!evidence || typeof evidence !== "object") {
    throw new TypeError(`${label} must be content-addressed evidence`);
  }
  if (typeof evidence.source !== "string" || evidence.source.length === 0) {
    throw new TypeError(`${label} source must be present`);
  }
  try {
    new URL(evidence.source);
  } catch {
    throw new TypeError(`${label} source must be an absolute URI`);
  }
  if (typeof evidence.vintage !== "string" || evidence.vintage.length === 0) {
    throw new TypeError(`${label} vintage must be present`);
  }
  if (!SHA256.test(evidence.checksum || "")) {
    throw new TypeError(`${label} checksum must be a SHA-256 content address`);
  }
  return instant(evidence.retrieved_at, `${label} retrieved_at`);
}

export function assertIssuedForecastImmutable(issued, later) {
  if (issued?.status !== "issued") {
    throw new TypeError("the original record must have issued status");
  }
  if (!LIFECYCLE.has(later?.status)) {
    throw new TypeError("the later record has an invalid lifecycle status");
  }

  assertForecastSemantics(issued);
  assertForecastSemantics(later);

  const changed = IMMUTABLE_ISSUE_FIELDS.filter(
    (field) => !isDeepStrictEqual(issued[field], later[field]),
  );
  if (changed.length) {
    throw new Error(`issued forecast fields are immutable: ${changed.join(", ")}`);
  }

  const originalHistory = issued.history || [];
  const laterPrefix = (later.history || []).slice(0, originalHistory.length);
  if (!isDeepStrictEqual(originalHistory, laterPrefix)) {
    throw new Error("issued forecast history is append-only");
  }
  return true;
}

export function assertForecastSemantics(forecast) {
  if (!LIFECYCLE.has(forecast?.status)) {
    throw new TypeError("forecast has an invalid lifecycle status");
  }
  const issuedAt = instant(forecast.issued_at, "issued_at");
  const resolveAfter = instant(forecast.resolve_after, "resolve_after");
  const resolveBy = instant(forecast.resolve_by, "resolve_by");
  if (!(issuedAt < resolveAfter && resolveAfter <= resolveBy)) {
    throw new Error("forecast chronology must be issued_at < resolve_after <= resolve_by");
  }

  for (const [index, vintage] of (forecast.data_vintages || []).entries()) {
    const retrievedAt = contentAddressedEvidence(vintage, `data vintage ${index}`);
    if (retrievedAt > issuedAt) {
      throw new Error(`data vintage ${index} retrieved_at cannot follow issued_at`);
    }
  }

  const expectedResolutionStatus = RESOLUTION_STATUS[forecast.status];
  if (forecast.resolution?.status !== expectedResolutionStatus) {
    throw new Error(
      `forecast status ${forecast.status} must match resolution status ${expectedResolutionStatus}`,
    );
  }

  const history = forecast.history || [];
  if (!history.length || history[0].event !== "issued") {
    throw new Error("forecast history must begin with issued");
  }
  const historyTimes = history.map((entry, index) => instant(entry.at, `history[${index}].at`));
  if (historyTimes[0] !== issuedAt) {
    throw new Error("forecast history issued event must match issued_at");
  }
  for (let index = 1; index < historyTimes.length; index += 1) {
    if (historyTimes[index] <= historyTimes[index - 1]) {
      throw new Error("forecast history must be strictly chronological");
    }
  }
  const expectedEvents = HISTORY_EVENTS[forecast.status];
  if (history.length !== expectedEvents.length ||
      history.some((entry, index) => entry.event !== expectedEvents[index])) {
    throw new Error(`forecast history events must match status ${forecast.status}`);
  }

  if (forecast.status === "resolved") {
    const resolvedAt = instant(forecast.resolution.resolved_at, "resolution.resolved_at");
    if (resolvedAt < resolveAfter) {
      throw new Error("forecast cannot resolve before its resolution window");
    }
    if (resolvedAt > resolveBy) {
      throw new Error("forecast resolution.resolved_at cannot follow resolve_by");
    }
    const evidenceRetrievedAt = contentAddressedEvidence(
      forecast.resolution.evidence,
      "resolution evidence",
    );
    if (evidenceRetrievedAt > resolvedAt) {
      throw new Error("resolution evidence retrieved_at cannot follow resolved_at");
    }
    if (historyTimes.at(-1) !== resolvedAt) {
      throw new Error("forecast history resolved event must match resolution.resolved_at");
    }
  }
  if (forecast.status === "void") {
    const voidedAt = instant(forecast.resolution.voided_at, "resolution.voided_at");
    if (voidedAt < issuedAt) {
      throw new Error("forecast cannot be voided before it was issued");
    }
    if (historyTimes.at(-1) !== voidedAt) {
      throw new Error("forecast history voided event must match resolution.voided_at");
    }
  }
  return true;
}
