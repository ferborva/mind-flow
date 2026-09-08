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

export function assertIssuedForecastImmutable(issued, later) {
  if (issued?.status !== "issued") {
    throw new TypeError("the original record must have issued status");
  }
  if (!new Set(["issued", "resolved", "void"]).has(later?.status)) {
    throw new TypeError("the later record has an invalid lifecycle status");
  }

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
  const issuedAt = Date.parse(forecast?.issued_at);
  const resolveAfter = Date.parse(forecast?.resolve_after);
  const resolveBy = Date.parse(forecast?.resolve_by);

  if (![issuedAt, resolveAfter, resolveBy].every(Number.isFinite)) {
    throw new TypeError("forecast chronology requires valid dates");
  }
  if (!(issuedAt < resolveAfter && resolveAfter <= resolveBy)) {
    throw new Error("forecast chronology must be issued_at < resolve_after <= resolve_by");
  }

  if (forecast.status === "resolved") {
    const resolvedAt = Date.parse(forecast.resolution?.resolved_at);
    if (!Number.isFinite(resolvedAt) || resolvedAt < resolveAfter) {
      throw new Error("forecast cannot resolve before its resolution window");
    }
  }
  if (forecast.status === "void") {
    const voidedAt = Date.parse(forecast.resolution?.voided_at);
    if (!Number.isFinite(voidedAt) || voidedAt < issuedAt) {
      throw new Error("forecast cannot be voided before it was issued");
    }
  }
  return true;
}
